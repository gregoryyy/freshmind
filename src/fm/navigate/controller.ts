/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode, FreshEdge } from "../model/index.js";
import { directions, collectCandidates, bestCandidateIndex } from "./candidates.js";
import type { Candidate, CandidateKind, Direction, NavigationActions, NavigationClock, NavigationHost,
  NavigationItem, NavigationKey, NavigationOptions, NavigationSettings, NavigationState } from "./types.js";

const defaults: NavigationSettings = { radius: 2, backlinks: true, maxAddEdgeCount: 1000,
  maxExpandEdgeCount: 1000, moveToCenter: true, preselectionTimeoutMs: 2500 };
const systemClock: NavigationClock = {
  setTimeout(callback, milliseconds) {
    const timer = setTimeout(callback, milliseconds);
    if (typeof timer === "object" && "unref" in timer) timer.unref();
    return timer;
  },
  clearTimeout(handle) { clearTimeout(handle as ReturnType<typeof setTimeout>); }
};
interface Pending { kind: CandidateKind; direction: Direction; anchor: FreshNode; candidates: Candidate[]; active: number; }

/** Freshmind keyboard/preselection state; the host remains authoritative for graph, selection and focus. */
export class FreshmindNavigation {
  private settings: NavigationSettings;
  private readonly clock: NavigationClock;
  private pending: Pending | null = null;
  private timer: unknown;
  private disposed = false;
  private detailsVisible = false;
  private wholeGraph = false;
  private message = "Arrow keys navigate nodes; Shift+arrows navigate relations.";
  private actions: NavigationActions = {};
  private readonly actionOwners = new Map<keyof NavigationActions, object>();
  private readonly listeners = new Set<(state: NavigationState) => void>();
  private readonly highlights = new Map<NavigationItem, { preselected: boolean; active: boolean }>();

  constructor(private readonly host: NavigationHost, options: NavigationOptions = {}) {
    const { clock = systemClock, ...settings } = options;
    this.settings = this.validate({ ...defaults, ...settings }); this.clock = clock;
  }
  /** Returns copied settings/candidate IDs; the frozen internal order cannot be mutated by a UI. */
  getState(): NavigationState {
    const p = this.pending;
    return { settings: { ...this.settings }, detailsVisible: this.detailsVisible, wholeGraph: this.wholeGraph, message: this.message,
      preselection: p ? { kind: p.kind, direction: p.direction, anchorId: p.anchor.getID()!,
        candidateIds: p.candidates.map(c => c.id), activeIndex: p.active } : null };
  }
  addListener(listener: (state: NavigationState) => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
  /** Replaces supplied actions; the disposer removes only handlers still owned by this registration. */
  setActions(actions: NavigationActions): () => void {
    const owned = {...actions};
    this.actions = {...this.actions, ...owned};
    const keys = Object.keys(owned) as (keyof NavigationActions)[];
    for (const key of keys) this.actionOwners.set(key, owned);
    return () => {
      for (const key of keys) if (this.actionOwners.get(key) === owned) {
        delete this.actions[key];
        this.actionOwners.delete(key);
      }
    };
  }
  private publish(repaint = false): void {
    if (repaint) this.host.repaint();
    const state = this.getState(); for (const listener of this.listeners) listener(state);
  }
  private validate(settings: NavigationSettings): NavigationSettings {
    for (const field of ["radius", "maxAddEdgeCount", "maxExpandEdgeCount", "preselectionTimeoutMs"] as const) {
      if (!Number.isSafeInteger(settings[field]) || settings[field] < 0) throw new RangeError(`${field} must be a nonnegative integer`);
    }
    for (const field of ["backlinks", "moveToCenter"] as const) if (typeof settings[field] !== "boolean") throw new TypeError(`${field} must be boolean`);
    return settings;
  }
  /** Updates filters atomically and reapplies them around the existing neighborhood focus. Zero disables timeout. */
  async configure(changes: Partial<NavigationSettings>): Promise<void> {
    if (this.disposed) return;
    const next = this.validate({ ...this.settings, ...changes });
    const filtering = ["radius", "backlinks", "maxAddEdgeCount", "maxExpandEdgeCount"] as const;
    const changed = filtering.some(key => next[key] !== this.settings[key]);
    this.settings = next;
    if (changed) this.cancel("Neighborhood options changed.", false);
    else if (this.pending) this.armTimer();
    this.publish();
    const focus = this.host.getNeighborhoodFocus();
    if (changed && focus) await this.applyNeighborhood(focus);
  }
  /** Called by panel APIs so mouse controls and direct locality calls share keyboard filter state. */
  neighborhoodChanged(radius: number, maxAdd: number, maxExpand: number, outgoingOnly: boolean): void {
    this.cancel("Neighborhood changed.", false);
    this.wholeGraph = radius === 2147483647;
    // Showing the whole graph must not replace the configured radius for the next centered selection.
    if (radius !== 2147483647) this.settings = { ...this.settings, radius, maxAddEdgeCount: maxAdd,
      maxExpandEdgeCount: maxExpand, backlinks: !outgoingOnly };
    this.publish();
  }
  graphChanged(): void {
    this.cancel("Graph replaced.", false); this.wholeGraph = false; this.detailsVisible = false; this.publish();
  }
  localityChanged(): void { this.reconcile(false); this.publish(); }
  selectionChanged(): void {
    if (this.disposed) return;
    this.cancel(undefined, false);
    const item = this.host.getSelection();
    if (!item) this.detailsVisible = false;
    this.message = item ? `Selected ${item instanceof FreshNode ? "node" : "relation"}: ${item.getLabel() || item.getSemanticType()}.` : "Selection cleared. Use an arrow key to choose a starting node.";
    this.publish();
  }
  /** Restores only flags owned by this controller, preserving any pre-existing external highlights. */
  cancel(message?: string, repaint = true): void {
    if (this.timer !== undefined) this.clock.clearTimeout(this.timer);
    this.timer = undefined;
    const hadPending = this.pending !== null;
    this.pending = null;
    for (const [item, flags] of this.highlights) { item.setPreselected(flags.preselected); item.setKeyselected(flags.active); }
    this.highlights.clear();
    if (message !== undefined) this.message = message;
    if (hadPending) this.publish(repaint);
  }
  private armTimer(): void {
    if (this.timer !== undefined) this.clock.clearTimeout(this.timer);
    this.timer = undefined;
    const pending = this.pending;
    if (pending && this.settings.preselectionTimeoutMs > 0) this.timer = this.clock.setTimeout(() => {
      if (this.pending === pending && !this.disposed) this.cancel("Preselection canceled after inactivity.");
    }, this.settings.preselectionTimeoutMs);
  }
  private highlight(): void {
    const p = this.pending;
    if (!p) return;
    for (const [index, candidate] of p.candidates.entries()) {
      const item = candidate.item;
      if (!this.highlights.has(item)) this.highlights.set(item, { preselected: item.isPreselected(), active: item.isKeyselected() });
      item.setPreselected(true); item.setKeyselected(index === p.active);
    }
    this.message = `${p.kind === "node" ? "Node" : "Relation"} candidates ${p.direction}: ${p.active + 1} of ${p.candidates.length}, ${p.candidates[p.active].item.getLabel() || p.candidates[p.active].id}. Enter confirms; perpendicular arrows cycle; Escape cancels.`;
    this.armTimer(); this.publish(true);
  }
  /** Removes invalid candidates without re-sorting moving nodes or committing a surviving candidate. */
  reconcile(repaint = true): void {
    const p = this.pending;
    if (!p || this.disposed) return;
    const graph = this.host.getGES();
    if (this.host.getSelect() !== p.anchor || !graph.contains(p.anchor)) { this.cancel("Navigation anchor is no longer visible.", repaint); return; }
    const active = p.candidates[p.active].item;
    const valid = p.candidates.filter(c => graph.contains(c.item) && graph.contains(c.node) &&
      [...p.anchor.getEdges()].some(e => graph.contains(e) && e.getOtherEndpt(p.anchor) === c.node && (p.kind === "node" || e === c.item)));
    if (valid.length === p.candidates.length) return;
    for (const c of p.candidates) if (!valid.includes(c)) {
      const flags = this.highlights.get(c.item)!;
      c.item.setPreselected(flags.preselected); c.item.setKeyselected(flags.active); this.highlights.delete(c.item);
    }
    if (!valid.length) { this.cancel("No navigation candidates remain visible.", repaint); return; }
    p.candidates = valid; const retained = valid.findIndex(c => c.item === active);
    p.active = retained >= 0 ? retained : Math.min(p.active, valid.length - 1);
    for (const [index, c] of valid.entries()) c.item.setKeyselected(index === p.active);
    this.message = `${p.kind === "node" ? "Node" : "Relation"} candidate ${p.active + 1} of ${valid.length}: ${valid[p.active].item.getLabel() || valid[p.active].id}.`;
    this.publish(repaint);
  }
  /** Starts/cycles/confirms directional navigation using frozen clockwise candidate order. */
  navigate(direction: Direction, kind: CandidateKind = "node", repeat = false): void {
    if (this.disposed) return;
    this.reconcile(false);
    let anchor = this.host.getSelect();
    if (!(anchor instanceof FreshNode) || !this.host.getGES().contains(anchor)) {
      const focus = this.host.getFocus();
      anchor = focus && this.host.getGES().contains(focus) ? focus : this.host.getGES().getFirstNode();
      if (anchor) this.host.setSelect(anchor);
      return;
    }
    if (this.pending && this.pending.kind !== kind) this.cancel(undefined, false);
    const p = this.pending;
    if (p) {
      const relative = (directions.indexOf(direction) - directions.indexOf(p.direction) + 4) % 4;
      if (relative === 0) { if (!repeat) this.confirm(); else this.armTimer(); }
      else if (relative === 2) this.cancel("Preselection canceled.");
      else { p.active = (p.active + (relative === 1 ? 1 : -1) + p.candidates.length) % p.candidates.length; this.highlight(); }
      return;
    }
    this.host.updateDrawPositions();
    const candidates = collectCandidates(this.host.getGES(), anchor, direction, kind);
    if (!candidates.length) { this.message = `No visible ${kind === "node" ? "neighbors" : "relations"} ${direction}.`; this.publish(); return; }
    if (candidates.length === 1) { this.commit(candidates[0].item); return; }
    this.pending = { anchor, kind, direction, candidates, active: bestCandidateIndex(candidates) }; this.highlight();
  }
  confirm(): void {
    this.reconcile(false);
    if (!this.pending) return;
    const item = this.pending.candidates[this.pending.active].item;
    this.cancel(undefined, false); this.commit(item);
  }
  private commit(item: NavigationItem): void {
    if (item instanceof FreshNode) this.host.setSelect(item); else this.host.setSelectEdge(item);
  }
  /** Centers the existing anchor without selecting it; relation selection survives while its edge remains visible. */
  async centerSelection(): Promise<void> {
    if (this.disposed) return;
    const anchor = this.host.getSelect();
    if (!(anchor instanceof FreshNode) || !this.host.getCompleteEltSet().contains(anchor)) return;
    if (!this.settings.moveToCenter && !this.host.getGES().contains(anchor)) return;
    const alreadyCentered = this.host.getFocus() === anchor;
    this.cancel(undefined, false); this.host.centerOn(anchor, this.settings.moveToCenter);
    if (this.settings.moveToCenter) await this.applyNeighborhood(anchor);
    if (!this.disposed && alreadyCentered && this.host.getFocus() === anchor && this.host.getGES().contains(anchor))
      this.host.reinforceCenteredNode?.(anchor);
  }
  /** Adds the selected node as another RFC center; pending candidates are confirmed first. */
  addRfcCenter():void {
    if(this.disposed)return;
    if(this.pending)this.confirm();
    const selected=this.host.getSelection();
    if(!(selected instanceof FreshNode)||!this.host.addRfcCenter)return;
    this.cancel(undefined,false);this.host.addRfcCenter(selected);
    this.message=`Added RFC center: ${selected.getLabel()}.`;this.publish();
  }
  /** Toggles the selected RFC center, confirming a pending node candidate before applying the change. */
  toggleRfcCenter():void {
    if(this.disposed)return;
    if(this.pending)this.confirm();
    const selected=this.host.getSelection();
    if(!(selected instanceof FreshNode)||!this.host.toggleRfcCenter)return;
    this.cancel(undefined,false);const enabled=this.host.toggleRfcCenter(selected);
    this.message=`${enabled?"Added":"Removed"} RFC center: ${selected.getLabel()}.`;this.publish();
  }
  private applyNeighborhood(focus: FreshNode): Promise<void> {
    const s = this.settings; return this.host.setLocale(focus, s.radius, s.maxAddEdgeCount, s.maxExpandEdgeCount, !s.backlinks);
  }
  async expand(): Promise<void> { await this.localityAction("expandNode"); }
  async collapse(): Promise<void> { await this.localityAction("collapseNode"); }
  async hide(): Promise<void> { await this.localityAction("hideNode"); }
  private async localityAction(method: "expandNode" | "collapseNode" | "hideNode"): Promise<void> {
    if (this.disposed) return;
    this.cancel(undefined, false); const anchor = this.host.getSelect();
    if (anchor) await this.host[method](anchor);
  }
  toggleDetails(): void {
    this.setDetailsVisible(!this.detailsVisible);
  }
  /** Sets detail visibility explicitly so popup dismissal cannot accidentally reopen it. */
  setDetailsVisible(visible: boolean): void {
    if (this.disposed || (visible && !this.host.getSelection()) || visible === this.detailsVisible) return;
    this.detailsVisible = visible;
    this.message = `Details ${this.detailsVisible ? "shown" : "hidden"}.`; this.publish();
  }
  /** Changes graph spacing through the panel's limits, retaining selection/locality and frozen candidates. */
  zoomBy(factor: number): void {
    if (this.disposed) return;
    this.host.zoomBy(factor); this.armTimer();
    this.message = `Graph spacing ${Math.round(this.host.getZoom() * 100)}%.`; this.publish();
  }
  /** Scales the whole canvas independently of graph spacing, retaining frozen candidates. */
  canvasZoomBy(factor: number): void {
    if (this.disposed) return;
    this.setCanvasZoom(this.host.getCanvasZoom() * factor);
  }
  /** Sets an absolute canvas scale, including an exact reset to 1, through the panel's limits. */
  setCanvasZoom(scale: number): void {
    if (this.disposed) return;
    this.host.setCanvasZoom(scale); this.armTimer();
    this.message = `Canvas zoom ${Math.round(this.host.getCanvasZoom() * 100)}%.`; this.publish();
  }
  /** Adjusts viewing rotation in radians, retaining physical positions and frozen candidates. */
  rotateBy(radians: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(radians)) throw new RangeError("Rotation adjustment must be finite");
    this.host.setRotation(this.host.getRotation() + radians); this.armTimer();
    this.message = `Rotation ${Math.round(this.host.getRotation() * 180 / Math.PI)}°.`; this.publish();
  }
  /** Adjusts the existing focus/context lens in percentage points, clamped to 0–100. */
  adjustFocusContext(delta: number): void {
    if (this.disposed) return;
    if (!Number.isFinite(delta)) throw new RangeError("Focus/context adjustment must be finite");
    this.host.setHyperbolic(Math.max(0, Math.min(100, this.host.getHyperbolic() + delta))); this.armTimer();
    this.message = `Focus + context ${Math.round(this.host.getHyperbolic())}%.`; this.publish();
  }
  private run(operation: Promise<void>): void {
    void operation.catch(error => { if (!this.disposed) { this.message = error instanceof Error ? error.message : String(error); this.publish(); } });
  }
  /** Handles graph-scoped keys, including Ctrl and Shift+Alt view shortcuts; other chords pass through. */
  handleKey(event: NavigationKey): boolean {
    if (this.disposed || event.metaKey || event.isComposing) return false;
    if (event.altKey) {
      if (event.ctrlKey || !event.shiftKey) return false;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") this.rotateBy((event.key === "ArrowRight" ? 1 : -1) * Math.PI / 36);
      else if (event.key === "ArrowUp" || event.key === "ArrowDown") this.canvasZoomBy(1.2 ** (event.key === "ArrowUp" ? 1 : -1));
      else return false;
      return true;
    }
    if (event.ctrlKey) {
      const key=event.key.toLowerCase(),action=key==="f"?this.actions.search:key==="r"?this.actions.similar:key==="i"?this.actions.index:undefined;
      if(action){if(!event.repeat)action(Boolean(event.shiftKey));return true;}
      if(!event.shiftKey&&(key==="g"||key==="h")&&this.actions.adjustWeight){
        const item=this.host.getSelection();if(!item)return false;this.actions.adjustWeight(item,key==="g"?1:-1);return true;
      }
      if (!event.shiftKey && (event.key === "Enter" || event.key === " ")) {
        const item = this.host.getSelection(), action = event.key === "Enter" ? this.actions.edit : this.actions.editDetails;
        if (item && action) { action(item); return true; } return false;
      }
      if (event.shiftKey) {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") this.adjustFocusContext(event.key === "ArrowRight" ? 5 : -5);
        else if (event.key === "ArrowUp" || event.key === "ArrowDown") this.zoomBy(1.2 ** (event.key === "ArrowUp" ? 1 : -1));
        else if (event.code === "Digit1" || event.key === "1" || event.key === "!") this.setCanvasZoom(1);
        else return false;
        return true;
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return false;
      this.zoomBy(1.2 ** (event.key === "ArrowUp" ? 1 : -1));
      return true;
    }
    if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "−") {
      this.canvasZoomBy(event.key === "-" || event.key === "−" ? 1 / 1.2 : 1.2);
      return true;
    }
    const arrows: Record<string, Direction> = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left" };
    if (Object.hasOwn(arrows, event.key)) { this.navigate(arrows[event.key], event.shiftKey ? "edge" : "node", event.repeat); return true; }
    if (event.key === "Enter" || event.key === " ") {
      if(event.key==="Enter"&&event.shiftKey){if(!event.repeat)this.toggleRfcCenter();return true;}
      if (this.pending) this.confirm();
      else if (event.key === "Enter") this.run(this.centerSelection()); else this.toggleDetails();
      return true;
    }
    if (event.key === "Escape") {
      if (this.pending) this.cancel("Preselection canceled.");
      else if (this.host.getSelection() instanceof FreshEdge) this.host.setSelectEdge(null);
      else this.host.setSelect(null);
      return true;
    }
    if (event.key === "F2") { const item = this.host.getSelection(),action=event.shiftKey?this.actions.editDetails:this.actions.edit; if (item && action) { action(item); return true; } return false; }
    if(event.key==="/"&&this.actions.quickSearch){if(!event.repeat)this.actions.quickSearch();return true;}
    if ((event.key === "?" || event.key === "F1") && this.actions.help) { this.actions.help(); return true; }
    if (event.shiftKey || event.repeat) return false;
    const key = event.key.toLowerCase();
    if (/^[0-6]$/.test(key)) this.run(this.configure({ radius: Number(key) }));
    else if (key === "b") this.run(this.configure({ backlinks: !this.settings.backlinks }));
    else if (key === "n") this.run(this.configure({ moveToCenter: !this.settings.moveToCenter }));
    else if (key === "e") this.run(this.expand());
    else if (key === "k") this.run(this.collapse());
    else if (key === "h") this.run(this.hide());
    else if ((key === "c" || key === "w") && this.host.cycleEdgeCurve) {
      const curve = this.host.cycleEdgeCurve();
      this.armTimer(); this.message = `Edge curves: ${curve}.`; this.publish();
    }
    else if (key === "l" && this.actions.openResource) this.actions.openResource();
    else if (key === "r" && this.host.getSelection() instanceof FreshEdge && this.actions.reverseRelation) this.actions.reverseRelation();
    else return false;
    return true;
  }
  /** Clears timers, owned highlights and callbacks; later keyboard commands become no-ops. */
  destroy(): void { this.cancel(undefined, false); this.disposed = true; this.listeners.clear(); this.actions = {}; this.actionOwners.clear(); }
}
