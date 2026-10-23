/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode } from "../model.js";
import type { FreshmindNavigation } from "./controller.js";
import type { NavigationHost, NavigationItem } from "./types.js";

let nextId = 0;
/** Attaches graph-scoped keyboard/horizontal-wheel input and live status; returns complete cleanup. */
export function bindNavigation(svg: SVGSVGElement, host: NavigationHost, navigation: FreshmindNavigation, externalStatus?: HTMLElement): () => void {
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
  const itemAt = (target: EventTarget | null): NavigationItem | null => {
    if (!(target instanceof Element)) return null;
    const node = target.closest<SVGGElement>(".tg-node"), edge = target.closest<SVGGElement>(".fm-edge");
    if (node) return [...host.getGES().getNodes()].find(n => n.getID() === node.dataset.nodeId) as FreshNode | undefined ?? null;
    return edge ? [...host.getGES().getEdges()].find(e => e.getID() === edge.dataset.edgeId) as NavigationItem | undefined ?? null : null;
  };
  const focusSelection = () => {
    const item = host.getSelection();
    const selector = item ? `[data-${item instanceof FreshNode ? "node" : "edge"}-id=${CSS.escape(item.getID()!)}]` : null;
    const target = selector ? svg.querySelector<SVGElement>(selector) : svg;
    target?.focus({ preventScroll: true });
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    // Embedded editors must also bypass inherited node handlers, without suppressing native text input.
    if (editable(event.target) || event.isComposing) { event.stopPropagation(); return; }
    const modified = event.ctrlKey || event.metaKey || event.altKey;
    const before = host.getSelection(), focused = itemAt(event.target);
    let handled: boolean;
    // Tab changes DOM focus alone. Enter activates a different focused item before centering it.
    if (!modified && event.key === "Enter" && focused && focused !== before && !navigation.getState().preselection) {
      if (focused instanceof FreshNode) host.setSelect(focused); else host.setSelectEdge(focused);
      handled = true;
    } else handled = navigation.handleKey(event);
    if (!handled) {
      // Leave native chords intact while bypassing inherited activation/deletion handlers.
      if (modified && ["Enter", " ", "Escape", "Delete", "Backspace"].includes(event.key)) event.stopPropagation();
      return;
    }
    event.preventDefault(); event.stopImmediatePropagation();
    if (before !== host.getSelection() && svg.contains(document.activeElement)) focusSelection();
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
      || !Number.isFinite(event.deltaX) || !Number.isFinite(event.deltaY) || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    // Sensitivity is one percentage point per 20 pixels. Wheels may emit lines/pages.
    // Each event adjusts the lens or canvas, following its dominant scroll axis.
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientWidth || 800 : 1;
    event.preventDefault(); event.stopImmediatePropagation();
    navigation.adjustFocusContext(event.deltaX * unit / 20);
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
  svg.addEventListener("wheel", wheel, { capture: true, passive: false });
  svg.addEventListener("focusout", focusout); svg.addEventListener("focusin", refreshFocus);
  return () => {
    disposed = true;
    unsubscribe(); svg.removeEventListener("keydown", keydown, true); svg.removeEventListener("click", click, true); svg.removeEventListener("focusout", focusout);
    svg.removeEventListener("wheel", wheel, true);
    svg.removeEventListener("focusin", refreshFocus);
    if (!externalStatus) status.remove();
  };
}
