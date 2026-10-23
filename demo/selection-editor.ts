/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import { stringify } from "yaml";
import { FreshNode, FreshEdge, FreshmindPanel, nodeShapes, applyNodeEdit, applyRelationEdit } from "../src/fm/index.js";
import type { FreshmindSelection, CurveMode, NodeShape, Metadata, VisualOverride, NodeStyle, EdgeStyle } from "../src/fm/index.js";
import { parseYamlValue } from "../src/fm/io/yaml-value.js";
import { record } from "../src/fm/config/validation.js";

type Item = FreshNode | FreshEdge;
const ids = ["item-type", "node-shape", "edge-curve", "item-weight", "node-url", "annotation-format", "node-annotation", "edge-from", "edge-to", "edge-length", "item-visual", "item-data", "item-extensions"] as const;
type Draft = Record<typeof ids[number], string> & {label: string};
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Retains drafts by item identity and shares atomic commands between inspector and inline labels. */
export class SelectionEditor {
  private selection: FreshmindSelection = null;
  private readonly drafts = new WeakMap<Item, Draft>();
  private readonly form = get<HTMLFormElement>("selection-editor");
  private readonly fields = get<HTMLFieldSetElement>("editor-fields");
  private readonly nodeLabel = get<HTMLTextAreaElement>("node-label");
  private readonly edgeLabel = get<HTMLInputElement>("edge-label");
  private inline?: HTMLDivElement;
  private inlineInput?: HTMLInputElement | HTMLTextAreaElement;

  constructor(private readonly panel: FreshmindPanel, private readonly onApplied: () => void) {
    for (const shape of nodeShapes) get<HTMLSelectElement>("node-shape").add(new Option(shape.replaceAll("-", " "), shape));
    this.form.addEventListener("input", () => this.retainDraft()); this.form.addEventListener("change", () => this.retainDraft());
    this.form.addEventListener("submit", event => {event.preventDefault(); this.save();});
    get("cancel-edit").addEventListener("click", () => this.cancel());
    get("reverse-edge").addEventListener("click", () => this.reverseRelation());
    get("delete-item").addEventListener("click", () => {
      if (this.panel.getInteractionMode() !== "edit") return;
      const item = this.selection; this.closeInline();
      if (item instanceof FreshNode) this.panel.deleteNode(item); else if (item instanceof FreshEdge) this.panel.deleteEdge(item);
      if (item) this.drafts.delete(item); this.onApplied();
    });
    this.form.addEventListener("keydown", event => {
      if (event.key === "Escape") {event.preventDefault(); event.stopPropagation(); this.cancel();}
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey || event.target === this.edgeLabel)) {event.preventDefault(); this.save();}
    });
    panel.addGraphListener({graphMoved: () => this.positionInline()});
    const observer = new ResizeObserver(() => this.positionInline()); observer.observe(get("graph"));
    window.addEventListener("pagehide", () => {observer.disconnect(); this.closeInline();}, {once: true});
  }

  /** Refreshes on selection/commit, never on animation, so unsaved fields retain their contents. */
  show(selection: FreshmindSelection): void {
    if (selection !== this.selection) this.closeInline();
    this.selection = selection; this.fields.disabled = !selection;
    const node = selection instanceof FreshNode;
    for (const id of ["node-label", "node-shape", "edge-label", "edge-curve"]) {
      const visible = id.startsWith("node-") ? node : Boolean(selection) && !node;
      get(id).hidden = !visible; this.form.querySelector<HTMLLabelElement>('label[for="' + id + '"]')!.hidden = !visible;
    }
    for (const [id, visible] of [["node-fields", node], ["relation-fields", Boolean(selection) && !node]] as const) {
      get<HTMLFieldSetElement>(id).hidden = !visible; get<HTMLFieldSetElement>(id).disabled = !visible;
    }
    const type = get<HTMLSelectElement>("item-type"); type.replaceChildren();
    if (!selection) {this.nodeLabel.value = this.edgeLabel.value = ""; this.status("Select a node or relation to edit."); return;}
    const config = this.panel.getTypeRegistry().getConfiguration(), types = node ? config.nodeTypes : config.relationTypes;
    for (const [id, definition] of Object.entries(types)) type.add(new Option(definition.label, id));
    const draft = this.drafts.get(selection) ?? this.readItem(selection);
    if (!Object.hasOwn(types, draft["item-type"])) type.add(new Option(draft["item-type"], draft["item-type"]));
    this.nodeLabel.value = this.edgeLabel.value = draft.label;
    for (const id of ids) get<Control>(id).value = draft[id];
    get("node-ids").replaceChildren(...[...this.panel.getAllNodes()].map(n => new Option(n.getLabel(), n.getID()!)));
    this.status(this.drafts.has(selection) ? "Unsaved changes. Save or cancel this draft." : "F2 edits inline. Ctrl/Cmd+Enter saves; Escape cancels.");
  }
  /** Opens the inspector's label control, used by Add node and Edit graph. */
  focusLabel(): void {
    const control = this.selection instanceof FreshEdge ? this.edgeLabel : this.nodeLabel;
    this.revealInspector();
    this.form.scrollIntoView({block: "nearest"}); control.focus({preventScroll: true}); control.select();
  }
  focusDetails(): void {
    if (!(this.selection instanceof FreshNode)) {this.focusLabel(); return;}
    this.revealInspector();
    const control = get<HTMLTextAreaElement>("node-annotation"); control.scrollIntoView({block: "nearest"}); control.focus();
  }
  /** Keyboard editing opens any collapsed inspector ancestors before moving focus into them. */
  private revealInspector(): void {
    for(let ancestor=this.form.parentElement;ancestor;ancestor=ancestor.parentElement)
      if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;
  }
  /** Opens a multiline node or single-line relation editor at the shared renderer anchor. */
  openInline(): void {
    if (!this.selection) return; this.closeInline();
    const node = this.selection instanceof FreshNode;
    this.inline = document.createElement("div"); this.inline.className = "inline-editor";
    this.inlineInput = node ? document.createElement("textarea") : document.createElement("input");
    this.inlineInput.setAttribute("aria-label", node ? "Inline node label" : "Inline relation label");
    this.inlineInput.value = (node ? this.nodeLabel : this.edgeLabel).value;
    const status = document.createElement("div"); status.className = "inline-status"; status.setAttribute("role", "status");
    status.textContent = node ? "Ctrl/Cmd+Enter saves · Esc cancels" : "Enter saves · Esc cancels";
    this.inline.append(this.inlineInput, status); get("graph").append(this.inline);
    this.inlineInput.addEventListener("input", () => {(node ? this.nodeLabel : this.edgeLabel).value = this.inlineInput!.value; this.retainDraft();});
    this.inlineInput.addEventListener("keydown", event => {
      const key = event as KeyboardEvent;
      event.stopPropagation();
      if (key.key === "Escape") {event.preventDefault(); this.cancel();}
      else if (key.key === "Enter" && (!node || key.ctrlKey || key.metaKey)) {event.preventDefault(); this.save();}
    });
    this.inlineInput.addEventListener("blur", () => {if (this.inline) this.status("Unsaved label draft. Save or cancel to finish.");});
    this.positionInline(); this.inlineInput.focus({preventScroll: true}); this.inlineInput.select();
  }
  /** Explicit reversal validates the current draft before changing endpoints or any other field. */
  reverseRelation(): void {
    if (!(this.selection instanceof FreshEdge)) return;
    const from = get<Control>("edge-from"), to = get<Control>("edge-to"), previous = from.value;
    from.value = to.value; to.value = previous; this.retainDraft(); this.save();
  }
  private positionInline(): void {
    if (!this.inline || !this.selection) return;
    const item = this.selection;
    if (!this.panel.getGES().contains(item)) {this.closeInline(); return;}
    const anchor = item instanceof FreshNode ? {x: item.drawx, y: item.drawy} : this.panel.getEdgeGeometry(item)?.labelAnchor;
    if (!anchor) return; const screen = this.panel.drawToScreen(anchor);
    this.inline.style.left = screen.x + "px"; this.inline.style.top = screen.y + "px";
    this.inline.style.width = Math.min(360, Math.max(160, item instanceof FreshNode ? item.getWidth() * this.panel.getCanvasZoom() : 220)) + "px";
  }
  private closeInline(): void {const box = this.inline; this.inline = undefined; this.inlineInput = undefined; box?.remove();}
  private readItem(item: Item): Draft {
    const node = item instanceof FreshNode, visual = item.getVisual();
    const shape = node ? (visual.style as NodeStyle | undefined)?.shape ?? "" : "";
    const curve = !node ? (visual.style as EdgeStyle | undefined)?.curve ?? "" : "";
    if (visual.style) {if (node) delete (visual.style as Partial<NodeStyle>).shape; else delete (visual.style as Partial<EdgeStyle>).curve;}
    return {label: item.getLabel(), "item-type": item.getSemanticType(), "node-shape": shape, "edge-curve": curve,
      "item-weight": String(item.getWeight()), "node-url": node ? item.getURL() : "", "annotation-format": node ? item.getAnnotation().format : "text",
      "node-annotation": node ? item.getAnnotation().text : "", "edge-from": !node ? item.from.getID()! : "", "edge-to": !node ? item.to.getID()! : "",
      "edge-length": !node ? String(item.getLength()) : "40", "item-visual": stringify(visual), "item-data": stringify(item.getData()), "item-extensions": stringify(item.getExtensions())};
  }
  private retainDraft(): void {
    if (!this.selection) return;
    const draft = {label: this.selection instanceof FreshNode ? this.nodeLabel.value : this.edgeLabel.value} as Draft;
    for (const id of ids) draft[id] = get<Control>(id).value;
    this.drafts.set(this.selection, draft); this.status("Unsaved changes. Save or cancel this draft.");
  }
  private mapping(value: string, name: string): Metadata {
    try {return record(parseYamlValue(value.trim() || "{}"), name) as Metadata;} catch (error) {throw new Error(name + ": " + (error as Error).message);}
  }
  private save(): void {
    const item = this.selection; if (!item) return; this.retainDraft(); const draft = this.drafts.get(item)!;
    try {
      if (!this.form.reportValidity()) return;
      if (!this.panel.getGES().contains(item)) throw new Error("This item is no longer visible. Select it again before saving.");
      const common = {label: draft.label, type: draft["item-type"], weight: Number(draft["item-weight"]),
        data: this.mapping(draft["item-data"], "Application data"), extensions: this.mapping(draft["item-extensions"], "Extensions")};
      const visual = this.mapping(draft["item-visual"], "Visual overrides");
      if (item instanceof FreshNode) applyNodeEdit(item, {...common, shape: draft["node-shape"] as NodeShape || null, visual: visual as VisualOverride<NodeStyle>,
        url: draft["node-url"], annotation: {format: draft["annotation-format"] as "text" | "html", text: draft["node-annotation"]}});
      else applyRelationEdit(item, {...common, curve: draft["edge-curve"] as CurveMode || null, visual: visual as VisualOverride<EdgeStyle>,
        from: draft["edge-from"], to: draft["edge-to"], length: Number(draft["edge-length"])}, {graph: this.panel.getCompleteEltSet(), locality: this.panel.getGES()});
      this.drafts.delete(item); this.closeInline(); this.panel.localityChanged(); this.panel.resetDamper(); this.panel.repaintAfterMove(); this.onApplied(); this.show(this.panel.getSelection());
      this.status("Changes saved."); this.focusGraphItem(item);
    } catch (error) {this.status(error instanceof Error ? error.message : String(error), true);}
  }
  private cancel(): void {
    const item = this.selection; if (!item) return;
    this.drafts.delete(item); this.closeInline(); this.show(item); this.status("Edit canceled."); this.focusGraphItem(item);
  }
  private focusGraphItem(item: Item): void {
    const kind = item instanceof FreshNode ? "node" : "edge";
    (get("graph").querySelector<SVGElement>('[data-' + kind + '-id=' + CSS.escape(item.getID()!) + ']') ?? get("graph").querySelector<SVGElement>("svg"))?.focus({preventScroll: true});
  }
  private status(message: string, error = false): void {
    const status = get("editor-status"); status.textContent = message; status.dataset.error = String(error);
    const inline = this.inline?.querySelector<HTMLElement>(".inline-status"); if (inline) {inline.textContent = message; inline.dataset.error = String(error);}
  }
}
