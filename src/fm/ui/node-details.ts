/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import {FreshNode} from "../model.js";
import type {FreshmindPanel} from "../panel.js";
import {renderAnnotation, resourceURL} from "../editing/details.js";

export interface NodeDetailsOptions {
  /** Mounted graph host, used to place the popup and return keyboard focus. */
  graph: HTMLElement;
  container?: HTMLElement;
  /** Optional application editor; the popup closes before delegating, preserving existing draft ownership. */
  onEdit?: (node: FreshNode) => void;
  /** Resolves navigation to a stored node, including one outside the current visible neighborhood. */
  onNodeLink?: (node: FreshNode) => void | Promise<void>;
}

let nextId = 0;

/** Binds a modeless, resizable content popup to navigation detail state; returns complete UI cleanup. */
export function bindNodeDetails(panel: FreshmindPanel, options: NodeDetailsOptions): () => void {
  const owner = options.graph.ownerDocument, view = owner.defaultView!;
  const navigation = panel.getNavigation(), dialog = owner.createElement("dialog");
  dialog.className = "fm-node-details";
  dialog.setAttribute("aria-modal", "false");
  const header = owner.createElement("header"), title = owner.createElement("h2"), close = owner.createElement("button");
  title.id = `fm-node-details-${++nextId}`; dialog.setAttribute("aria-labelledby", title.id);
  close.type = "button"; close.textContent = "Close"; close.setAttribute("aria-label", "Close node content");
  header.append(title, close);
  const metadata = owner.createElement("p"); metadata.className = "fm-node-metadata";
  const content = owner.createElement("div"); content.className = "fm-node-content"; content.tabIndex = 0;
  content.setAttribute("role", "region"); content.setAttribute("aria-label", "Node content body");
  const resource = owner.createElement("p"); resource.className = "fm-node-resource";
  const footer = owner.createElement("footer"), edit = owner.createElement("button"), status = owner.createElement("p");
  edit.type = "button"; edit.textContent = "Edit content"; edit.hidden = !options.onEdit;
  status.className = "fm-node-content-status"; status.setAttribute("role", "status");
  footer.append(edit, status); dialog.append(header, metadata, content, resource, footer);
  (options.container ?? owner.body).append(dialog);
  let disposed = false, shown: FreshNode | null = null, signature = "", linkRevision = 0;

  const restoreFocus = () => {
    const selected = panel.getSelection(), svg = options.graph.querySelector<SVGSVGElement>("svg.tg-panel");
    const target = selected instanceof FreshNode
      ? svg?.querySelector<SVGElement>(`[data-node-id="${CSS.escape(selected.getID()!)}"]`) ?? svg : svg;
    target?.focus({preventScroll: true});
  };
  const dismiss = () => { navigation.setDetailsVisible(false); restoreFocus(); };
  /** Keeps user-resized dimensions and clamps the popup after viewport changes. */
  const position = (anchor?: FreshNode) => {
    if (!dialog.open) return;
    const bounds = dialog.getBoundingClientRect();
    let left = bounds.left, top = bounds.top;
    if (anchor) {
      const svg = options.graph.querySelector("svg.tg-panel"), graphBounds = svg?.getBoundingClientRect();
      const point = panel.drawToScreen({x: anchor.drawx, y: anchor.drawy});
      const x = graphBounds ? graphBounds.left + point.x : view.innerWidth / 2;
      const y = graphBounds ? graphBounds.top + point.y : view.innerHeight / 2;
      const gap = anchor.getHeight() * panel.getCanvasZoom() / 2 + 12;
      left = x - bounds.width / 2;
      top = y + gap + bounds.height <= view.innerHeight - 12 ? y + gap : y - gap - bounds.height;
    }
    dialog.style.left = `${Math.max(12, Math.min(left, view.innerWidth - bounds.width - 12))}px`;
    dialog.style.top = `${Math.max(12, Math.min(top, view.innerHeight - bounds.height - 12))}px`;
  };
  const nodeLink = async (id: string) => {
    const target = panel.findNode(id), revision = ++linkRevision;
    if (!(target instanceof FreshNode)) { status.textContent = "Unknown linked node: " + id; return; }
    try {
      if (options.onNodeLink) await options.onNodeLink(target);
      else if (panel.getGES().contains(target)) panel.setSelect(target);
      else status.textContent = "The linked node is outside the visible neighborhood.";
    } catch (error) {
      if (!disposed && revision === linkRevision) status.textContent = error instanceof Error ? error.message : String(error);
    }
  };
  /** Refreshes only changed content, preserving scrolling and text selection during graph motion. */
  const update = () => {
    if (disposed) return;
    const item = panel.getSelection();
    if (!navigation.getState().detailsVisible || !(item instanceof FreshNode) || !panel.getGES().contains(item)) {
      if (dialog.open) dialog.close();
      shown = null; signature = ""; linkRevision++; return;
    }
    const annotation = item.getAnnotation();
    const next = JSON.stringify([item.getID(), item.getLabel(), item.getSemanticType(), annotation, item.getURL()]);
    const changedNode = shown !== item, wasOpen = dialog.open, hadFocus = dialog.contains(owner.activeElement);
    if (changedNode || next !== signature) {
      shown = item; signature = next; linkRevision++;
      title.textContent = "Node content: " + (item.getLabel() || "(unlabeled node)");
      metadata.textContent = `ID: ${item.getID()} · Type: ${item.getSemanticType()}`;
      content.dataset.format = annotation.format;
      renderAnnotation(content, annotation, id => { void nodeLink(id); });
      if (!annotation.text.trim()) { const empty = owner.createElement("p"); empty.textContent = "No content is associated with this node."; content.append(empty); }
      resource.replaceChildren(); resource.hidden = !item.getURL();
      if (item.getURL()) {
        const url = resourceURL(item.getURL());
        if (url) {
          const link = owner.createElement("a"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
          link.textContent = "Open linked resource"; resource.append(link);
        } else { resource.textContent = "Stored resource path: " + item.getURL(); }
      }
      status.textContent = "";
      if (changedNode) content.scrollTop = 0;
    }
    if (!wasOpen) dialog.show();
    if (!wasOpen || changedNode) position(item);
    if (!wasOpen || (changedNode && hadFocus)) content.focus({preventScroll: true});
  };
  const editContent = () => {
    const node = shown;
    if (node && options.onEdit) { navigation.setDetailsVisible(false); options.onEdit(node); }
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.isComposing || event.altKey || event.metaKey) return;
    if (event.ctrlKey && !event.shiftKey && event.key === " " && options.onEdit) {
      event.preventDefault(); event.stopImmediatePropagation(); editContent();
    } else if (!event.ctrlKey && !event.shiftKey && (event.key === "Escape" || (event.key === " " && !(event.target as Element).closest("button,a,input,textarea,select,[contenteditable]")))) {
      event.preventDefault(); event.stopImmediatePropagation(); dismiss();
    }
  };
  const cancel = (event: Event) => { event.preventDefault(); dismiss(); };
  const resize = () => position();
  close.addEventListener("click", dismiss); edit.addEventListener("click", editContent);
  dialog.addEventListener("keydown", keydown); dialog.addEventListener("cancel", cancel); view.addEventListener("resize", resize);
  const removeNavigation = navigation.addListener(update), removeSelection = panel.addSelectionListener(update);
  const listener = {graphMoved: update, graphReset: update}; panel.addGraphListener(listener);
  update();
  return () => {
    if (disposed) return;
    disposed = true; linkRevision++;
    removeNavigation(); removeSelection(); panel.removeGraphListener(listener);
    close.removeEventListener("click", dismiss); edit.removeEventListener("click", editContent);
    dialog.removeEventListener("keydown", keydown); dialog.removeEventListener("cancel", cancel); view.removeEventListener("resize", resize);
    if (dialog.open) dialog.close(); dialog.remove();
  };
}
