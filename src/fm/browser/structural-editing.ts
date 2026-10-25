/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import {FreshNode, FreshEdge} from "../model/index.js";
import {createLinkedNode, linkNodes, GraphClipboard} from "../edit/index.js";
import {isSearchQueryNode} from "../ir/index.js";
import type {FreshmindPanel} from "./panel.js";

export interface StructuralEditingOptions {
  editLabel(): void; changed(): void;
  initialFocus(node: FreshNode): void; newDocument(): void;
}
/** Application composition only: complete graph, locality, selection and documents retain their owners. */
export function bindStructuralEditing(panel: FreshmindPanel, options: StructuralEditingOptions): () => void {
  const clipboard = new GraphClipboard();
  const dispose = panel.getNavigation().setActions({structural(command) {
    if (command === "new-document") {options.newDocument(); return;}
    const graph = panel.getCompleteEltSet(), selected = panel.getSelection();
    if (!(selected instanceof FreshNode) || !graph.contains(selected)) throw new Error("Select a node for this command");
    if (command === "copy") {
      if (isSearchQueryNode(selected)) throw new Error("Copy content nodes; use Ctrl+F to create a query");
      clipboard.copy(graph, selected); return "Node copied locally. Paste clones its data; link reuses the live source.";
    }
    if (panel.getInteractionMode() !== "edit") throw new Error("Enable Edit graph for structural commands");
    if (command === "initial-focus") {options.initialFocus(selected); return;}
    const defaults = panel.getTypeRegistry().getConfiguration().defaults;
    let node: FreshNode | undefined, edge: FreshEdge;
    if (["add", "parent", "sibling", "sibling-parent"].includes(command)) {
      ({node, edge} = createLinkedNode(graph, selected, defaults, command === "parent" || command === "sibling-parent", command.startsWith("sibling")));
    } else if (command === "paste") {
      ({node, edge} = clipboard.paste(graph, selected, defaults.relationType));
    } else if (command === "link-copy") edge = clipboard.link(graph, selected, defaults.relationType);
    else {
      const center = panel.getFocus();
      if (!(center instanceof FreshNode)) throw new Error("Center a different node before linking");
      edge = linkNodes(graph, selected, center, defaults.relationType);
    }
    // Reveal endpoints only after complete validation/commit. Hidden data is never removed.
    panel.addNode(edge.from); panel.addNode(edge.to); panel.addEdge(edge);
    if (node) panel.setSelect(node); else panel.setSelectEdge(edge);
    options.changed();
    if (node) options.editLabel();
  }});
  return () => {dispose(); clipboard.clear();};
}
