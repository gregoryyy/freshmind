/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode, FreshEdge, FreshGraph, FreshmindPanel } from "../src/fm/index.js";
import type { FreshmindSelection, CurveMode } from "../src/fm/index.js";
import { SelectionEditor } from "./selection-editor.js";
import { bindGraphAspectControls, bindChoiceRadios, bindPanelToggle, bindNumericSliders, bindZoomControls, bindKeymap, bindRfcControls, bindSubstructureControls, bindNodeDetails,bindStructuralViewControls,bindNodeImportanceControls,bindGraphSearchControls,bindReadabilityControls,bindLabelEditingControls,bindMotionControls } from "../src/fm/ui/index.js";
import "../src/fm/ui/style.css";
import { bindFileControls } from "./file-controls.js";
import {bindRfcShowcase} from "./rfc-showcase.js";
import { bindStructuralEditing, resourceURL } from "../src/fm/browser/index.js";
import "./style.css";

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const graph = new FreshGraph();
/** Creates demo data through Freshmind types; body shapes/styles follow the shared type registry. */
function makeNode(id: string, label: string, description: string, x: number, y: number, type = "idea"): FreshNode {
  const node = new FreshNode(id, label, { type, position: { x, y }, annotation: { format: "text", text: description } });
  graph.addNode(node);
  return node;
}
const root = makeNode("root", "Graph browsers", "Graph model, spring layout, rendering and navigation.", 0, 0, "project");
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
  const hub = makeNode(`topic-${i}`, topic.name, "", x, y, "topic");
  graph.addEdge(new FreshEdge(root, hub, { length: 70, label: "includes" }));
  topic.items.forEach((label, j) => {
    const leafAngle = angle + (j - 2.5) * .5;
    const leaf = makeNode(`node-${i}-${j}`, label, "",
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
  const child = makeNode(`detail-${i}`, label, "", node.x + Math.cos(angle) * 65, node.y + Math.sin(angle) * 65, "concept");
  graph.addEdge(new FreshEdge(node, child, { length: 45, label: "detail" }));
});
for (const [from, to] of [["Focus + context", "Lens pipeline"], ["Dragging", "Coordinates"], ["Neighborhoods", "Visible locality"], ["Mental map", "Momentum"], ["Selection", "Nodes"]]) {
  const edge = new FreshEdge(leaves.get(from)!, leaves.get(to)!, { length: 95, label: "relates to" }); graph.addEdge(edge);
}

let allVisible = false;
let paused = false;
const panel = new FreshmindPanel(get("graph"), { hyperbolic: 60, navigationStatus: get("navigation-status"),relationLabelPlacement:"avoid-overlap",adaptiveDamping:{enabled:true} });
const controlsPanel=bindPanelToggle(get("controls-panel"),get<HTMLButtonElement>("controls-toggle"),document.querySelector("main")!);
const disposeAspect=bindGraphAspectControls(panel,{mode:get<HTMLSelectElement>("graph-aspect"),value:get<HTMLOutputElement>("graph-aspect-value")});
const disposeMotion=bindMotionControls(panel,{adaptiveDamping:get<HTMLInputElement>("adaptive-damping"),response:get<HTMLSelectElement>("damping-response"),status:get("adaptive-damping-status")});
const disposeReadability=bindReadabilityControls(panel,{separate:get<HTMLButtonElement>("separate-labels"),gap:get<HTMLInputElement>("label-gap"),status:get("readability-status"),relationLabels:get<HTMLInputElement>("avoid-relation-labels")},result=>{
  if(result.moved){paused=true;get("motion").textContent="Resume motion";}
});
const disposeImportance=bindNodeImportanceControls(panel,{mode:get<HTMLSelectElement>("node-importance-mode"),showValues:get<HTMLInputElement>("show-node-weights")});
const disposeSearch=bindGraphSearchControls(panel,{
  showControls:()=>controlsPanel.show(),
  engine:get<HTMLSelectElement>("search-engine"),kind:get<HTMLSelectElement>("search-kind"),query:get<HTMLInputElement>("search-query"),limit:get<HTMLInputElement>("search-limit"),
  run:get<HTMLButtonElement>("search-run"),similar:get<HTMLButtonElement>("search-similar"),reject:get<HTMLButtonElement>("search-reject"),train:get<HTMLButtonElement>("search-train"),cancel:get<HTMLButtonElement>("search-cancel"),
  topics:get<HTMLInputElement>("search-topics"),iterations:get<HTMLInputElement>("search-iterations"),seed:get<HTMLInputElement>("search-seed"),alpha:get<HTMLInputElement>("search-alpha"),beta:get<HTMLInputElement>("search-beta"),
  status:get("search-status"),topicWords:get("search-topic-words"),
  metric:get<HTMLSelectElement>("search-metric"),maxDistance:get<HTMLInputElement>("search-distance"),
  saveModel:get<HTMLButtonElement>("search-save-model"),loadModel:get<HTMLInputElement>("search-load-model"),
  minDocumentFrequency:get<HTMLInputElement>("search-min-df")
});
const disposeZoom = bindZoomControls(panel, {
  spacing: get<HTMLInputElement>("graph-zoom"), spacingValue: get("graph-zoom-value"),
  canvasIn: get("zoom-in"), canvasOut: get("zoom-out"), canvasReset: get("zoom-reset")
});
const disposeKeymap = bindKeymap(panel, {button: get("keymap-help"), includeBrowserCommands: true});
const disposeRfc = bindRfcControls(panel, {
  activate: get<HTMLButtonElement>("rfc-activate"), clear: get<HTMLButtonElement>("rfc-clear"),
  springMultiplier: get<HTMLInputElement>("rfc-springs"), angularStiffness: get<HTMLInputElement>("rfc-angular"), status: get("rfc-status"),
  radialStiffness: get<HTMLInputElement>("rfc-radial"), radialLength: get<HTMLInputElement>("rfc-length"), indicator: get("rfc-indicator"),
  clusterRigidity:get<HTMLInputElement>("rfc-cluster-rigidity"),
  treePreset: get<HTMLButtonElement>("rfc-tree"), attractionPreset: get<HTMLButtonElement>("rfc-attraction"),
  excludeContext:get<HTMLInputElement>("rfc-exclusion"),excludeOverlap:get<HTMLInputElement>("rfc-overlap-exclusion"),
  exclusionStrength:get<HTMLInputElement>("rfc-exclusion-strength"),exclusionPadding:get<HTMLInputElement>("rfc-exclusion-padding"),
  neighborhoodDepth:get<HTMLSelectElement>("rfc-neighborhood-depth"),
  addCenter:get<HTMLButtonElement>("rfc-add-center"),centers:get<HTMLSelectElement>("rfc-centers"),removeCenter:get<HTMLButtonElement>("rfc-remove-center"),
  xWeight: get<HTMLInputElement>("rfc-x-weight"), yWeight: get<HTMLInputElement>("rfc-y-weight")
});
const disposeStructures=bindSubstructureControls(panel,{
  structure:get<HTMLSelectElement>("rfc-structure"),name:get<HTMLInputElement>("rfc-structure-name"),kind:get<HTMLSelectElement>("rfc-structure-kind"),
  create:get<HTMLButtonElement>("rfc-structure-create"),save:get<HTMLButtonElement>("rfc-structure-save"),addMember:get<HTMLButtonElement>("rfc-structure-add"),removeMember:get<HTMLButtonElement>("rfc-structure-remove-member"),
  reroot:get<HTMLButtonElement>("rfc-structure-root"),activate:get<HTMLButtonElement>("rfc-structure-render"),remove:get<HTMLButtonElement>("rfc-structure-delete"),
  memberships:get("rfc-memberships"),status:get("rfc-structure-status"),algorithm:get<HTMLSelectElement>("cluster-algorithm"),resolution:get<HTMLInputElement>("cluster-resolution"),
  weighted:get<HTMLInputElement>("cluster-weighted"),scope:get<HTMLSelectElement>("cluster-scope"),detect:get<HTMLButtonElement>("cluster-detect"),
  cluster:get<HTMLSelectElement>("cluster-select"),members:get("cluster-members"),renderCluster:get<HTMLButtonElement>("cluster-render")
});
const showcase=bindRfcShowcase(panel,{container:get("rfc-showcase"),mode:get<HTMLSelectElement>("rfc-showcase-view"),
  fit:get<HTMLButtonElement>("rfc-showcase-fit"),caption:get("rfc-showcase-caption")});
const fileControls = bindFileControls(panel,showcase.loaded);
const disposeStructuralView=bindStructuralViewControls(panel,{
  enabled:get<HTMLInputElement>("structural-enabled"),hiddenNodeTypes:get<HTMLSelectElement>("structural-node-types"),
  hiddenRelationTypes:get<HTMLSelectElement>("structural-relation-types"),aggregateTypes:get<HTMLSelectElement>("structural-aggregate-types"),
  detailRadius:get<HTMLInputElement>("structural-detail-radius"),reveal:get<HTMLButtonElement>("structural-reveal"),
  reset:get<HTMLButtonElement>("structural-reset"),status:get("structural-status"),groups:get("structural-groups")
});
panel.setGraphEltSet(graph);
panel.addGraphListener({ graphMoved: () => { updateCounts(); updateViewControls(); } });
const editor = new SelectionEditor(panel, () => { updateInspector(panel.getSelection()); updateCounts(); });
const disposeLabelEditing=bindLabelEditingControls(panel,{mode:get<HTMLSelectElement>("label-editing-mode"),status:get("label-editing-status")});
const navigation = panel.getNavigation();
const disposeDetails = bindNodeDetails(panel, {graph: get("graph"), onNodeLink: focusOn, onEdit: () => editor.focusDetails()});
navigation.setActions({edit: () => editor.openInline(), editDetails: () => editor.focusDetails(),adjustWeight:(_item,direction)=>editor.adjustWeight(direction), openResource, reverseRelation: () => editor.reverseRelation()});
navigation.addListener(state => {
  allVisible = state.wholeGraph;
  get("view-status").textContent = allVisible ? "WHOLE GRAPH" : "LOCAL NEIGHBORHOOD";
  const settings = state.settings;
  get<HTMLInputElement>("depth").value = String(Math.min(6, settings.radius));
  get("depth-value").textContent = `${settings.radius} ${settings.radius === 1 ? "hop" : "hops"}`;
  get<HTMLInputElement>("backlinks").checked = settings.backlinks;
  get<HTMLInputElement>("move-to-center").checked = settings.moveToCenter;
  for (const [id, value] of [["max-add-degree", settings.maxAddEdgeCount], ["max-expand-degree", settings.maxExpandEdgeCount], ["candidate-timeout", settings.preselectionTimeoutMs]] as const)
    if (document.activeElement !== get(id)) get<HTMLInputElement>(id).value = String(value);
  updateDetails(); updateCounts();
});
const disposeStructuralEditing = bindStructuralEditing(panel, {editLabel: () => editor.openInline(), changed: updateCounts,
  initialFocus: fileControls.initialFocus, newDocument: fileControls.newDocument});
for (const command of ["add", "parent", "sibling", "sibling-parent", "link-center", "copy", "paste", "link-copy", "initial-focus"] as const)
  get("command-" + command).addEventListener("click", () => navigation.structural(command));
panel.addSelectionListener(selection => { updateInspector(selection); editor.show(selection); });

/** Reflects lens and default edge-form changes from keyboard, controls or configuration reloads. */
function updateViewControls(): void {
  const strength = Math.round(panel.getHyperbolic());
  get<HTMLInputElement>("hyper").value = String(strength); get("hyper-value").textContent = `${strength}%`;
  const mode = panel.getEdgeCurve();
  get<HTMLSelectElement>("curve").value = mode;
  get("curve-help").textContent = mode === "lens"
    ? "Lens midpoint follows focus + context. Increase the slider and look at edges away from the center."
    : mode === "straight" ? "Straight connects endpoints directly."
    : "Spider bends relations into branching curves. Drag nodes diagonally to see the bend.";
}
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
  const hint = node?.getAnnotation();
  const preview = document.createElement("template"); if (hint?.format === "html") preview.innerHTML = hint.text;
  get("selected-detail").textContent = hint ? (hint.format === "html" ? preview.content.textContent ?? "" : hint.text).slice(0, 240) : edge ? `${edge.from.getLabel()} → ${edge.to.getLabel()}` : "Select a node or relation to edit its label and appearance.";
  get("node-meta").textContent = node ? `${node.edgeCount()} connections · ${node.visibleEdgeCount()} in view` : edge ? edge.getSemanticType() : "";
  for (const id of ["focus", "expand", "collapse", "hide"]) get<HTMLButtonElement>(id).disabled = !panel.getSelect();
  get<HTMLInputElement>("pin").disabled = !node;
  get<HTMLInputElement>("pin").checked = node?.isFixed() ?? false;
  get<HTMLButtonElement>("open-resource").disabled = !node?.getURL();
  updateDetails();
  get("connections").replaceChildren();
  if (node) for (const edge of node.getEdges()) {
    const neighbor = edge.getOtherEndpt(node);
    const button = document.createElement("button");
    button.textContent = neighbor.getLabel();
    button.addEventListener("click", () => { void focusOn(neighbor as FreshNode); });
    get("connections").append(button);
  }
}
function updateDetails(): void {
  const item = panel.getSelection(), visible = navigation.getState().detailsVisible;
  get<HTMLButtonElement>("toggle-details").disabled = !item;
  get("toggle-details").textContent = visible ? "Hide details (Space)" : "Show details (Space)";
  get("selection-details").hidden = !visible || !(item instanceof FreshEdge);
  get("item-detail").textContent = item instanceof FreshNode
    ? `ID: ${item.getID()} · Type: ${item.getSemanticType()} · Weight: ${item.getWeight()}${item.getURL() ? ` · URL: ${item.getURL()}` : ""}`
    : item instanceof FreshEdge ? `${item.from.getLabel()} → ${item.to.getLabel()} · Type: ${item.getSemanticType()} · Length: ${item.getLength()} · Weight: ${item.getWeight()}` : "";
}
async function focusOn(node: FreshNode): Promise<void> {
  // A connection link can explicitly open a hidden neighborhood; keyboard centering only pans when N is off.
  if (!panel.getGES().contains(node) && !navigation.getState().settings.moveToCenter) {
    const s = navigation.getState().settings;
    await panel.setLocale(node, s.radius, s.maxAddEdgeCount, s.maxExpandEdgeCount, !s.backlinks);
  }
  if (panel.getSelect() !== node || panel.getSelectEdge()) panel.setSelect(node);
  await navigation.centerSelection(); updateCounts();
}
for (const [id, action] of [["focus", () => navigation.centerSelection()], ["expand", () => navigation.expand()],
  ["collapse", () => navigation.collapse()], ["hide", () => navigation.hide()]] as const) {
  get(id).addEventListener("click", async () => {
    await action();
    if (document.activeElement === get(id)) panel.focusGraph();
  });
}
get("toggle-details").addEventListener("click", () => navigation.toggleDetails());
/** Opens resources only on an explicit button/key action; unsupported legacy paths stay editable data. */
function openResource(): void {
  const item = panel.getSelection(); if (!(item instanceof FreshNode)) return;
  const url = resourceURL(item.getURL());
  if (url) window.open(url, "_blank", "noopener,noreferrer");
  else get("file-status").textContent = "This stored path cannot be opened by the browser. Edit the linked resource to a web URL if needed.";
}
get("open-resource").addEventListener("click", openResource);
get<HTMLInputElement>("pin").addEventListener("change", event => {
  panel.getSelect()?.setFixed((event.target as HTMLInputElement).checked); panel.resetDamper(); panel.repaint();
});
get<HTMLInputElement>("depth").addEventListener("input", event => {
  void navigation.configure({ radius: Number((event.target as HTMLInputElement).value) });
});
get<HTMLInputElement>("backlinks").addEventListener("change", event => {
  void navigation.configure({ backlinks: (event.target as HTMLInputElement).checked });
});
get<HTMLInputElement>("move-to-center").addEventListener("change", event => {
  void navigation.configure({ moveToCenter: (event.target as HTMLInputElement).checked });
});
for (const [id, key] of [["max-add-degree", "maxAddEdgeCount"], ["max-expand-degree", "maxExpandEdgeCount"], ["candidate-timeout", "preselectionTimeoutMs"]] as const) {
  get<HTMLInputElement>(id).addEventListener("change", event => {
    const input = event.target as HTMLInputElement;
    if (input.reportValidity()) void navigation.configure({ [key]: input.valueAsNumber });
  });
}
get<HTMLInputElement>("hyper").addEventListener("input", event => {
  const strength = Number((event.target as HTMLInputElement).value);
  panel.setHyperbolic(strength);
});
get("show-all").addEventListener("click", async () => {
  allVisible = true; get("view-status").textContent = "WHOLE GRAPH";
  await panel.setLocaleAll(); updateCounts();
  if (document.activeElement === get("show-all")) panel.focusGraph();
});
get("edit-mode").addEventListener("click", () => {
  const editing = panel.getInteractionMode() !== "edit";
  panel.setInteractionMode(editing ? "edit" : "navigate");
  get("edit-mode").textContent = editing ? "Finish editing" : "Edit graph";
  get("edit-mode").setAttribute("aria-pressed", String(editing));
  get("edit-help").hidden = !editing;
  get("add-node").hidden = !editing;
  get("structural-commands").hidden = !editing;
  get("delete-item").hidden = !editing;
  panel.focusGraph();
});
get("add-node").addEventListener("click", () => {
  const node = new FreshNode(null, "New node", { position: panel.getCenter() });
  panel.addNode(node); panel.setSelect(node); editor.focusLabel(); updateCounts();
});
get<HTMLSelectElement>("curve").addEventListener("change", event => {
  const mode = (event.target as HTMLSelectElement).value as CurveMode;
  panel.setEdgeCurve(mode);
});
get("center").addEventListener("click", () => { panel.centerView(); panel.focusGraph(); });
get("motion").addEventListener("click", () => {
  paused = !paused;
  if (paused) panel.tgLayout.stop(); else panel.tgLayout.start();
  get("motion").textContent = paused ? "Resume motion" : "Pause motion";
  panel.focusGraph();
});
const disposeSliders=bindNumericSliders(panel,document.querySelector<HTMLElement>(".sidebar")!);
const disposeChoices=bindChoiceRadios(panel,document.querySelector<HTMLElement>(".sidebar")!);
// Useful for experimenting with the library from the browser console.
Object.assign(window, { graphBrowser: panel });
void focusOn(root).then(() => {
  if(panel.getCompleteEltSet()===graph&&panel.getGES().contains(root))panel.getRfc().setFocus(root);
});
window.addEventListener("pagehide", () => { disposeChoices(); disposeSliders(); controlsPanel.dispose(); disposeStructuralEditing(); disposeAspect(); disposeMotion(); disposeLabelEditing(); disposeReadability(); disposeSearch(); showcase.dispose(); disposeImportance(); disposeStructuralView(); disposeDetails(); disposeStructures(); disposeRfc(); disposeKeymap(); disposeZoom(); panel.destroy(); }, { once: true });
document.fonts.ready.then(() => { if (allVisible) updateCounts(); panel.repaint(); });
