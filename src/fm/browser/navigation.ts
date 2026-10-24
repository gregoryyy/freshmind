/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode } from "../model/index.js";
import type { FreshmindNavigation } from "../navigate/index.js";
import type { NavigationHost, NavigationItem } from "../navigate/index.js";

let nextId = 0;
/** Attaches graph-scoped keyboard/scroll input and live status; returns complete cleanup. */
export function bindNavigation(svg: SVGSVGElement, host: NavigationHost, navigation: FreshmindNavigation, externalStatus?: HTMLElement): () => void {
  const owner=svg.ownerDocument;
  let pointerInside=svg.matches(":hover");
  const status = externalStatus ?? document.createElement("div");
  if (!externalStatus) {
    status.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);";
    svg.parentElement!.append(status);
  }
  if (!status.id) status.id = `fm-navigation-status-${nextId++}`;
  status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); status.setAttribute("aria-atomic", "true");
  svg.setAttribute("tabindex", "0"); svg.setAttribute("aria-describedby", status.id);
  const publish = () => { status.textContent = navigation.getState().message; };
  const unsubscribe = navigation.addListener(publish); publish();
  const editable = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest("input,textarea,select,[contenteditable]:not([contenteditable=false])"));
  const passiveFocus=()=>!owner.activeElement||owner.activeElement===owner.body||owner.activeElement===owner.documentElement;
  const selectCenter=()=>{
    const graph=host.getGES(),center=host.getCenteredNode?.()??host.getFocus()??host.getNeighborhoodFocus();
    const node=center&&graph.contains(center)?center:graph.getFirstNode();
    if(node&&host.getSelection()!==node)host.setSelect(node);
  };
  /** Pointer ownership resumes from the center; explicit controls/editors keep their DOM focus. */
  const activate=()=>{
    if(!svg.isConnected||!passiveFocus())return;
    selectCenter();focusSelection();
  };
  const pointerenter=(event:PointerEvent)=>{if(event.pointerType==="touch")return;pointerInside=true;activate();};
  const pointermove=(event:PointerEvent)=>{if(event.pointerType!=="touch")activate();};
  const pointerleave=()=>{pointerInside=false;};
  const itemAt = (target: EventTarget | null): NavigationItem | null => {
    if (!(target instanceof Element)) return null;
    const node = target.closest<SVGGElement>(".tg-node"), edge = target.closest<SVGGElement>(".fm-edge");
    if (node) return [...host.getGES().getNodes()].find(n => n.getID() === node.dataset.nodeId) as FreshNode | undefined ?? null;
    return edge ? [...host.getGES().getEdges()].find(e => e.getID() === edge.dataset.edgeId) as NavigationItem | undefined ?? null : null;
  };
  const focusSelection = () => {
    const item = host.getSelection();
    const selector = item ? `[data-${item instanceof FreshNode ? "node" : "edge"}-id=${CSS.escape(item.getID()!)}]` : null;
    const target = (selector ? svg.querySelector<SVGElement>(selector) : null)??svg;
    target?.focus({ preventScroll: true });
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    // Embedded editors must also bypass inherited node handlers, without suppressing native text input.
    if (editable(event.target) || event.isComposing) { event.stopPropagation(); return; }
    // Clearing/replacing a selection must not consume the next Enter/arrow just to choose an anchor.
    const targetKey=["Enter"," ","F2","ArrowUp","ArrowRight","ArrowDown","ArrowLeft"].includes(event.key);
    const itemKey=!event.metaKey&&!event.altKey&&targetKey&&(!event.ctrlKey||event.key==="Enter"||event.key===" ");
    if(!host.getSelection()&&itemKey)selectCenter();
    if(itemKey&&event.target===svg&&host.getSelection())focusSelection();
    const modified = event.ctrlKey || event.metaKey || event.altKey;
    const before = host.getSelection(), focused = itemAt(event.target);
    let handled: boolean;
    // Tab changes DOM focus alone. Enter activates a different focused item before centering it.
    if (!modified && !event.shiftKey && event.key === "Enter" && focused && focused !== before && !navigation.getState().preselection) {
      if (focused instanceof FreshNode) host.setSelect(focused); else host.setSelectEdge(focused);
      handled = true;
    } else {
      if(!modified&&event.shiftKey&&event.key==="Enter"&&focused instanceof FreshNode&&focused!==before&&!navigation.getState().preselection)host.setSelect(focused);
      handled = navigation.handleKey(event);
    }
    if (!handled) {
      // Leave native chords intact while bypassing inherited activation/deletion handlers.
      if (modified && ["Enter", " ", "Escape", "Delete", "Backspace"].includes(event.key)) event.stopPropagation();
      return;
    }
    event.preventDefault(); event.stopImmediatePropagation();
    if (before !== host.getSelection() && svg.contains(document.activeElement)) focusSelection();
  };
  // DOM replacement can leave body focused while the pointer is stationary over the graph.
  const passiveKeydown=(event:KeyboardEvent)=>{
    if(!pointerInside||!passiveFocus()||!svg.isConnected||!svg.getClientRects().length||event.defaultPrevented||event.isComposing)return;
    activate();keydown(event);
  };
  const click = (event: MouseEvent) => {
    if (editable(event.target)) return;
    navigation.cancel("Preselection canceled by pointer input.");
    const item = (event.target as Element).closest<SVGElement>(".tg-node,.fm-edge");
    if (item) item.focus({ preventScroll: true }); else if (event.target === svg) svg.focus({ preventScroll: true });
  };
  const wheel = (event: WheelEvent) => {
    // Embedded editors keep native scrolling, bypassing inherited canvas zoom as well.
    if (editable(event.target)) { event.stopPropagation(); return; }
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || !Number.isFinite(event.deltaX) || !Number.isFinite(event.deltaY) || (!event.deltaX && !event.deltaY)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      // Sensitivity is one percentage point per 20 pixels. Wheels may emit lines/pages.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientWidth || 800 : 1;
      navigation.adjustFocusContext(event.deltaX * unit / 20);
    } else {
      // Retain D3's normal wheel sensitivity, applying it to graph distances instead of the canvas.
      // Ctrl+wheel (trackpad pinch) bypasses this handler and reaches D3's canvas transform.
      const sensitivity = event.deltaMode === 1 ? .05 : event.deltaMode ? 1 : .002;
      navigation.zoomBy(2 ** Math.max(-10, Math.min(10, -event.deltaY * sensitivity)));
    }
  };
  let disposed = false, focusPaintQueued = false;
  // Removing a focused SVG item fires blur during D3's DOM join. Paint after that join has finished.
  const refreshFocus = () => {
    if (focusPaintQueued) return;
    focusPaintQueued = true;
    queueMicrotask(() => { focusPaintQueued = false; if (!disposed) host.repaint(); });
  };
  const focusout = (event: FocusEvent) => {
    if (!(event.relatedTarget instanceof Node) || !svg.contains(event.relatedTarget)) navigation.cancel("Preselection canceled when graph focus left.", false);
    refreshFocus();
  };
  svg.addEventListener("keydown", keydown, true); svg.addEventListener("click", click, true);
  svg.addEventListener("pointerenter",pointerenter);svg.addEventListener("pointermove",pointermove);svg.addEventListener("pointerleave",pointerleave);
  owner.addEventListener("keydown",passiveKeydown,true);
  svg.addEventListener("wheel", wheel, { capture: true, passive: false });
  svg.addEventListener("focusout", focusout); svg.addEventListener("focusin", refreshFocus);
  return () => {
    disposed = true;
    unsubscribe(); svg.removeEventListener("keydown", keydown, true); svg.removeEventListener("click", click, true); svg.removeEventListener("focusout", focusout);
    svg.removeEventListener("wheel", wheel, true);
    svg.removeEventListener("focusin", refreshFocus);
    svg.removeEventListener("pointerenter",pointerenter);svg.removeEventListener("pointermove",pointermove);svg.removeEventListener("pointerleave",pointerleave);
    owner.removeEventListener("keydown",passiveKeydown,true);
    if (!externalStatus) status.remove();
  };
}
