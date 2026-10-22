import { Edge, GraphEltSet, Node, TGPanel } from "../src/index.js";
import "./style.css";

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const graph = new GraphEltSet();
const descriptions = new Map<Node, string>();
function makeNode(id: string, label: string, description: string, color: string, x: number, y: number): Node {
  const node = new Node(id, Node.TYPE_ROUNDRECT, color, label);
  node.setFont("12px 'DM Sans', sans-serif");
  node.x = x; node.y = y;
  graph.addNode(node); descriptions.set(node, description);
  return node;
}
const root = makeNode("root", "Graph browsers", "The meeting point of a graph model, a living layout, and a way to explore.", "#406647", 0, 0);
const topics = [
  { name: "Layout", color: "#729064", items: ["Spring embedding", "Repulsion", "Momentum", "Adaptive damping", "Rigidity", "Equilibrium"] },
  { name: "Navigation", color: "#929367", items: ["Focus + context", "Neighborhoods", "Expand", "Collapse", "Graph distance", "Mental map"] },
  { name: "Rendering", color: "#6f9686", items: ["SVG", "Node labels", "Edges", "Coordinates", "Lens pipeline", "Transforms"] },
  { name: "Data model", color: "#af9270", items: ["Nodes", "Relationships", "Visible locality", "Complete graph", "Adjacency", "Identity"] },
  { name: "Interaction", color: "#8198a4", items: ["Dragging", "Panning", "Zooming", "Selection", "Pinning", "Keyboard"] }
];
const leaves = new Map<string, Node>();
topics.forEach((topic, i) => {
  const angle = i / topics.length * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * 175;
  const y = Math.sin(angle) * 175;
  const hub = makeNode(`topic-${i}`, topic.name, `Explore the ideas behind ${topic.name.toLowerCase()} in an interactive graph browser.`, topic.color, x, y);
  hub.setFont("600 13px 'DM Sans', sans-serif");
  graph.addEdge(new Edge(root, hub, 70));
  topic.items.forEach((label, j) => {
    const leafAngle = angle + (j - 2.5) * .5;
    const leaf = makeNode(`node-${i}-${j}`, label, `An idea in ${topic.name.toLowerCase()}. Follow its connections to see how it fits into the larger picture.`, topic.color,
      x + Math.cos(leafAngle) * 110, y + Math.sin(leafAngle) * 110);
    leaves.set(label, leaf);
    graph.addEdge(new Edge(hub, leaf, 55));
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
  const child = makeNode(`detail-${i}`, label, `A closer look at ${parent.toLowerCase()}.`, node.getBackColor(), node.x + Math.cos(angle) * 65, node.y + Math.sin(angle) * 65);
  graph.addEdge(new Edge(node, child, 45));
});
for (const [from, to] of [["Focus + context", "Lens pipeline"], ["Dragging", "Coordinates"], ["Neighborhoods", "Visible locality"], ["Mental map", "Momentum"], ["Selection", "Nodes"]]) {
  const edge = new Edge(leaves.get(from)!, leaves.get(to)!, 95); edge.setColor("#b5bfa9"); graph.addEdge(edge);
}

let allVisible = false;
let paused = false;
let currentFocus = root;
const panel = new TGPanel(get("graph"), { hyperbolic: 60, onSelect: updateInspector });
panel.setGraphEltSet(graph);
panel.addGraphListener({ graphMoved: updateCounts });

function updateCounts(): void {
  get("graph-count").textContent = `${panel.visibleNodeCount()} of ${panel.getNodeCount()} nodes`;
  const node = panel.getSelect();
  if (node) get("node-meta").textContent = `${node.edgeCount()} connections · ${node.visibleEdgeCount()} in view`;
}
function updateInspector(node: Node | null): void {
  get("selected-name").textContent = node?.getLabel() ?? "Choose an idea";
  get("selected-detail").textContent = node ? descriptions.get(node) ?? "" : "Select a node to explore its connections.";
  get("node-meta").textContent = node ? `${node.edgeCount()} connections · ${node.visibleEdgeCount()} in view` : "";
  for (const id of ["focus", "expand", "collapse", "hide", "pin"]) get<HTMLButtonElement | HTMLInputElement>(id).disabled = !node;
  get<HTMLInputElement>("pin").checked = node?.isFixed() ?? false;
  get("connections").replaceChildren();
  if (node) for (const edge of node.getEdges()) {
    const neighbor = edge.getOtherEndpt(node);
    const button = document.createElement("button");
    button.textContent = neighbor.getLabel();
    button.addEventListener("click", () => { void focusOn(neighbor); });
    get("connections").append(button);
  }
}
async function focusOn(node: Node): Promise<void> {
  currentFocus = node; allVisible = false;
  get("view-status").textContent = "LOCAL NEIGHBORHOOD";
  await panel.focusNode(node, Number(get<HTMLInputElement>("depth").value));
  updateCounts();
}
get("focus").addEventListener("click", () => { const node = panel.getSelect(); if (node) void focusOn(node); });
get("expand").addEventListener("click", async () => { const node = panel.getSelect(); if (node) await panel.expandNode(node); updateCounts(); });
get("collapse").addEventListener("click", async () => { const node = panel.getSelect(); if (node) await panel.collapseNode(node); updateCounts(); });
get("hide").addEventListener("click", async () => { const node = panel.getSelect(); if (node) await panel.hideNode(node); updateCounts(); });
get<HTMLInputElement>("pin").addEventListener("change", event => {
  panel.getSelect()?.setFixed((event.target as HTMLInputElement).checked); panel.resetDamper(); panel.repaint();
});
get<HTMLInputElement>("depth").addEventListener("input", event => {
  const depth = Number((event.target as HTMLInputElement).value);
  get("depth-value").textContent = `${depth} ${depth === 1 ? "hop" : "hops"}`;
  void focusOn(currentFocus);
});
get<HTMLInputElement>("hyper").addEventListener("input", event => {
  const strength = Number((event.target as HTMLInputElement).value);
  get("hyper-value").textContent = `${strength}%`; panel.setHyperbolic(strength);
});
get("show-all").addEventListener("click", async () => {
  allVisible = true; get("view-status").textContent = "WHOLE GRAPH";
  await panel.setLocaleAll(); updateCounts();
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
