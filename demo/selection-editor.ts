/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode, FreshEdge, FreshmindPanel, nodeShapes, applyNodeEdit, applyRelationEdit } from "../src/fm/index.js";
import type { FreshmindSelection, CurveMode, NodeShape } from "../src/fm/index.js";

type Item = FreshNode | FreshEdge;
interface Draft { label: string; type: string; shape: string; curve: string; }
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Demo inspector: retains per-item drafts across selection changes and delegates validated model edits. */
export class SelectionEditor {
  private selection: FreshmindSelection = null;
  private readonly drafts = new WeakMap<Item, Draft>();
  private readonly form = get<HTMLFormElement>("selection-editor");
  private readonly fields = get<HTMLFieldSetElement>("editor-fields");
  private readonly nodeLabel = get<HTMLTextAreaElement>("node-label");
  private readonly edgeLabel = get<HTMLInputElement>("edge-label");
  private readonly type = get<HTMLSelectElement>("item-type");
  private readonly shape = get<HTMLSelectElement>("node-shape");
  private readonly curve = get<HTMLSelectElement>("edge-curve");

  constructor(private readonly panel: FreshmindPanel, private readonly onApplied: () => void) {
    for (const shape of nodeShapes) this.shape.add(new Option(shape.replaceAll("-", " "), shape));
    this.form.addEventListener("input", () => this.retainDraft());
    this.form.addEventListener("change", () => this.retainDraft());
    this.form.addEventListener("submit", event => { event.preventDefault(); this.save(); });
    get("cancel-edit").addEventListener("click", () => this.cancel());
    get("delete-item").addEventListener("click", () => {
      if (this.panel.getInteractionMode() !== "edit") return;
      const item = this.selection;
      if (item instanceof FreshNode) this.panel.deleteNode(item);
      else if (item instanceof FreshEdge) this.panel.deleteEdge(item);
      if (item) this.drafts.delete(item);
      this.onApplied();
    });
    this.form.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.cancel(); }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey || event.target === this.edgeLabel)) {
        event.preventDefault(); this.save();
      }
    });
  }

  /** Refreshes only when selection changes or an edit completes, so animation cannot reset a draft. */
  show(selection: FreshmindSelection): void {
    this.selection = selection;
    this.fields.disabled = !selection;
    const node = selection instanceof FreshNode;
    for (const id of ["node-label", "node-shape", "edge-label", "edge-curve"]) {
      const visible = id.startsWith("node-") ? node : Boolean(selection) && !node;
      get(id).hidden = !visible;
      this.form.querySelector<HTMLLabelElement>(`label[for="${id}"]`)!.hidden = !visible;
    }
    this.type.replaceChildren();
    if (!selection) { this.nodeLabel.value = ""; this.edgeLabel.value = ""; this.status("Select a node or relation to edit."); return; }
    const config = this.panel.getTypeRegistry().getConfiguration();
    const types = node ? config.nodeTypes : config.relationTypes;
    for (const [id, definition] of Object.entries(types)) this.type.add(new Option(definition.label, id));
    const draft = this.drafts.get(selection) ?? this.readItem(selection);
    if (!Object.hasOwn(types, draft.type)) this.type.add(new Option(draft.type, draft.type));
    this.nodeLabel.value = this.edgeLabel.value = draft.label;
    this.type.value = draft.type; this.shape.value = draft.shape; this.curve.value = draft.curve;
    this.status(this.drafts.has(selection) ? "Unsaved changes. Save or cancel this draft." : "F2 edits the label. Ctrl/Cmd+Enter saves; Escape cancels.");
  }

  focusLabel(): void {
    const control = this.selection instanceof FreshEdge ? this.edgeLabel : this.nodeLabel;
    this.form.scrollIntoView({ block: "nearest" });
    control.focus({ preventScroll: true }); control.select();
  }

  private readItem(item: Item): Draft {
    return { label: item.getLabel(), type: item.getSemanticType(),
      shape: item instanceof FreshNode ? item.getVisual().style?.shape ?? "" : "",
      curve: item instanceof FreshEdge ? item.getVisual().style?.curve ?? "" : "" };
  }
  private retainDraft(): void {
    if (!this.selection) return;
    this.drafts.set(this.selection, { label: this.selection instanceof FreshNode ? this.nodeLabel.value : this.edgeLabel.value,
      type: this.type.value, shape: this.shape.value, curve: this.curve.value });
    this.status("Unsaved changes. Save or cancel this draft.");
  }
  private save(): void {
    const item = this.selection;
    if (!item) return;
    this.retainDraft();
    const draft = this.drafts.get(item)!;
    try {
      if (!this.panel.getGES().contains(item)) throw new Error("This item is no longer visible. Select it again before saving.");
      if (item instanceof FreshNode) applyNodeEdit(item, { label: draft.label, type: draft.type, shape: draft.shape as NodeShape || null });
      else applyRelationEdit(item, { label: draft.label, type: draft.type, curve: draft.curve as CurveMode || null });
      this.drafts.delete(item); this.panel.repaint(); this.onApplied(); this.show(item);
      this.status("Changes saved."); this.focusGraphItem(item);
    } catch (error) { this.status(error instanceof Error ? error.message : String(error), true); }
  }
  private cancel(): void {
    const item = this.selection;
    if (!item) return;
    this.drafts.delete(item); this.show(item); this.status("Edit canceled."); this.focusGraphItem(item);
  }
  private focusGraphItem(item: Item): void {
    const kind = item instanceof FreshNode ? "node" : "edge";
    get("graph").querySelector<SVGElement>(`[data-${kind}-id=${CSS.escape(item.getID()!)}]`)?.focus();
  }
  private status(message: string, error = false): void {
    const status = get("editor-status"); status.textContent = message; status.dataset.error = String(error);
  }
}
