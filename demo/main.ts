/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode, FreshEdge, FreshGraph, FreshmindPanel, TypeRegistry } from "../src/fm/index.js";
import type { FreshmindSelection, CurveMode } from "../src/fm/index.js";
import { SelectionEditor } from "./selection-editor.js";
import "./style.css";

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const graph = new FreshGraph();
/** Creates demo data through Freshmind types; body shapes/styles follow the shared type registry. */
function makeNode(id: string, label: string, description: string, x: number, y: number, type = "idea"): FreshNode {
  const node = new FreshNode(id, label, { type, position: { x, y }, annotation: { format: "text", text: description } });
  graph.addNode(node);
  return node;
}
const root = makeNode("root", "Graph browsers", "The meeting point of a graph model, a living layout, and a way to explore.", 0, 0, "project");
const topics = [
  { name: "Layout", items: ["Spring embedding", "Repulsion", "Momentum", "Adaptive damping", "Rigidity", "Equilibrium"] },
  { name: "Navigation", items: ["Focus + context", "Neighborhoods", "Expand", "Collapse", "Graph distance", "Mental map"] },
  { name: "Rendering", items: ["SVG", "Node labels", "Edges", "Coordinates", "Lens pipeline", "Transforms"] },
  { name: "Data model", items: ["Nodes", "Relationships", "Visible locality", "Complete graph", "Adjacency", "Identity"] },
  { name: "Interaction", items: ["Dragging", "Panning", "Zooming", "Selection", "Pinning", "Keyboard"] }
];
const leaves = new Map<string, FreshNode>();
topics.forEach((topic, i) => {
  const angle = i / topics.length * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * 175;
  const y = Math.sin(angle) * 175;
  const hub = makeNode(`topic-${i}`, topic.name, `Explore the ideas behind ${topic.name.toLowerCase()} in an interactive graph browser.`, x, y, "topic");
  graph.addEdge(new FreshEdge(root, hub, { length: 70, label: "includes" }));
  topic.items.forEach((label, j) => {
    const leafAngle = angle + (j - 2.5) * .5;
    const leaf = makeNode(`node-${i}-${j}`, label, `An idea in ${topic.name.toLowerCase()}. Follow its connections to see how it fits into the larger picture.`,
      x + Math.cos(leafAngle) * 110, y + Math.sin(leafAngle) * 110);
    leaves.set(label, leaf);
    graph.addEdge(new FreshEdge(hub, leaf, { length: 55, label: "covers" }));
  });
});
const details = [
  ["Spring embedding", "Rubber-band tension"], ["Spring embedding", "Pairwise forces"],
  ["Focus + context", "Nonlinear lens"], ["Focus + context", "Peripheral context"],
  ["Neighborhoods", "Hop radius"], ["Adaptive damping", "Motion ratio"],
  ["Lens pipeline", "Inverse mapping"], ["Lens pipeline", "World coordinates"],
  ["Dragging", "Pointer capture"], ["Complete graph", "Persistent positions"],
  ["Mental map", "Incremental changes"], ["Visible locality", "Hidden neighbors"]
];
details.forEach(([parent, label], i) => {
  const node = leaves.get(parent)!;
  const angle = Math.atan2(node.y, node.x) + (i % 2 === 0 ? .2 : -.2);
  const child = makeNode(`detail-${i}`, label, `A closer look at ${parent.toLowerCase()}.`, node.x + Math.cos(angle) * 65, node.y + Math.sin(angle) * 65, "concept");
  graph.addEdge(new FreshEdge(node, child, { length: 45, label: "detail" }));
});
for (const [from, to] of [["Focus + context", "Lens pipeline"], ["Dragging", "Coordinates"], ["Neighborhoods", "Visible locality"], ["Mental map", "Momentum"], ["Selection", "Nodes"]]) {
  const edge = new FreshEdge(leaves.get(from)!, leaves.get(to)!, { length: 95, label: "relates to" }); graph.addEdge(edge);
}

let allVisible = false;
let paused = false;
let currentFocus = root;
const panel = new FreshmindPanel(get("graph"), { hyperbolic: 60 });
panel.setGraphEltSet(graph);
panel.addGraphListener({ graphMoved: updateCounts });
const editor = new SelectionEditor(panel, () => { updateInspector(panel.getSelection()); updateCounts(); });
panel.addSelectionListener(selection => { updateInspector(selection); editor.show(selection); });

function updateCounts(): void {
  get("graph-count").textContent = `${panel.visibleNodeCount()} of ${panel.getNodeCount()} nodes`;
  const node = panel.getSelection();
  if (node instanceof FreshNode) get("node-meta").textContent = `${node.edgeCount()} connections · ${node.visibleEdgeCount()} in view`;
}
function updateInspector(selection: FreshmindSelection): void {
  const node = selection instanceof FreshNode ? selection : null;
  const edge = selection instanceof FreshEdge ? selection : null;
  get("selection-kind").textContent = edge ? "SELECTED RELATION" : "SELECTED NODE";
  get("selected-name").textContent = selection?.getLabel() || (edge ? "Unlabeled relation" : node ? "(empty label)" : "Choose an idea");
  get("selected-detail").textContent = node ? node.getHint() : edge ? `${edge.from.getLabel()} → ${edge.to.getLabel()}` : "Select a node or relation to edit its label and appearance.";
  get("node-meta").textContent = node ? `${node.edgeCount()} connections · ${node.visibleEdgeCount()} in view` : edge ? edge.getSemanticType() : "";
  for (const id of ["focus", "expand", "collapse", "hide", "pin"]) get<HTMLButtonElement | HTMLInputElement>(id).disabled = !node;
  get<HTMLInputElement>("pin").checked = node?.isFixed() ?? false;
  get("connections").replaceChildren();
  if (node) for (const edge of node.getEdges()) {
    const neighbor = edge.getOtherEndpt(node);
    const button = document.createElement("button");
    button.textContent = neighbor.getLabel();
    button.addEventListener("click", () => { void focusOn(neighbor as FreshNode); });
    get("connections").append(button);
  }
}
async function focusOn(node: FreshNode): Promise<void> {
  currentFocus = node; allVisible = false;
  get("view-status").textContent = "LOCAL NEIGHBORHOOD";
  await panel.focusNode(node, Number(get<HTMLInputElement>("depth").value));
  updateCounts();
}
get("focus").addEventListener("click", () => { const node = panel.getSelect(); if (node) void focusOn(node as FreshNode); });
get("expand").addEventListener("click", async () => { const node = panel.getSelect(); if (node) await panel.expandNode(node); updateCounts(); });
get("collapse").addEventListener("click", async () => { const node = panel.getSelect(); if (node) await panel.collapseNode(node); updateCounts(); });
get("hide").addEventListener("click", async () => { const node = panel.getSelect(); if (node) await panel.hideNode(node); updateCounts(); });
get<HTMLInputElement>("pin").addEventListener("change", event => {
  panel.getSelect()?.setFixed((event.target as HTMLInputElement).checked); panel.resetDamper(); panel.repaint();
});
get<HTMLInputElement>("depth").addEventListener("input", event => {
  const depth = Number((event.target as HTMLInputElement).value);
  get("depth-value").textContent = `${depth} ${depth === 1 ? "hop" : "hops"}`;
  const focus = graph.contains(currentFocus) ? currentFocus : panel.getSelect() ?? graph.getFirstNode();
  if (focus) void focusOn(focus as FreshNode);
});
get<HTMLInputElement>("hyper").addEventListener("input", event => {
  const strength = Number((event.target as HTMLInputElement).value);
  get("hyper-value").textContent = `${strength}%`; panel.setHyperbolic(strength);
});
get("show-all").addEventListener("click", async () => {
  allVisible = true; get("view-status").textContent = "WHOLE GRAPH";
  await panel.setLocaleAll(); updateCounts();
});
get("edit-mode").addEventListener("click", () => {
  const editing = panel.getInteractionMode() !== "edit";
  panel.setInteractionMode(editing ? "edit" : "navigate");
  get("edit-mode").textContent = editing ? "Finish editing" : "Edit graph";
  get("edit-mode").setAttribute("aria-pressed", String(editing));
  get("edit-help").hidden = !editing;
  get("add-node").hidden = !editing;
  get("delete-item").hidden = !editing;
  if (editing && panel.getSelection()) editor.focusLabel();
});
get("add-node").addEventListener("click", () => {
  const node = new FreshNode(null, "New node", { position: panel.getCenter() });
  panel.addNode(node); panel.setSelect(node); editor.focusLabel(); updateCounts();
});
get<HTMLSelectElement>("curve").addEventListener("change", event => {
  const mode = (event.target as HTMLSelectElement).value as CurveMode;
  const config = panel.getTypeRegistry().getConfiguration(); config.edgeVisuals.default.curve = mode;
  panel.setTypeRegistry(new TypeRegistry(config));
  get("curve-help").textContent = mode === "lens"
    ? "Lens midpoint follows focus + context. Increase the slider and look at edges away from the center."
    : mode === "straight" ? "Straight connects endpoints directly."
    : "Spider bends relations into branching curves. Drag nodes diagonally to see the bend.";
});
get("zoom-in").addEventListener("click", () => panel.zoomBy(1.2));
get("zoom-out").addEventListener("click", () => panel.zoomBy(1 / 1.2));
get("center").addEventListener("click", () => panel.centerView());
get("motion").addEventListener("click", () => {
  paused = !paused;
  if (paused) panel.tgLayout.stop(); else panel.tgLayout.start();
  get("motion").textContent = paused ? "Resume motion" : "Pause motion";
});
// Useful for experimenting with the library from the browser console.
Object.assign(window, { graphBrowser: panel });
void focusOn(root);
window.addEventListener("pagehide", () => panel.destroy(), { once: true });
document.fonts.ready.then(() => { if (allVisible) updateCounts(); panel.repaint(); });
