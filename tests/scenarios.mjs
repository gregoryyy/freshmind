import { GraphEltSet, Node, TGLayout, HyperLens, TGPoint2D } from "../dist/core.js";

const base = [
  { x: -85, y: 14 }, { x: 47, y: -33 }, { x: 21, y: 98 }, { x: -40, y: 135 }
];
const edges = [[0, 1, 40], [1, 2, 65], [2, 0, 30], [2, 3, 50]];
export const scenarios = [
  { name: "rubber bands and adaptive damping", nodes: base, edges, commands: [["resetDamper"], ["relax", 180]] },
  { name: "fixed nodes retain momentum but do not move", nodes: base.map((n, i) => ({ ...n, fixed: i === 0 })), edges,
    commands: [["resetDamper"], ["relax", 12]] },
  { name: "new locality weakly disturbs existing nodes", nodes: base.map((n, i) => ({ ...n, justMadeLocal: i === 1 })), edges,
    commands: [["stopDamper"], ["relax", 5], ["justMadeLocal", 1, 0], ["resetDamper"], ["relax", 10]] },
  { name: "600-unit repulsion cutoff", nodes: [{ x: 0, y: 0 }, { x: 600, y: 0 }, { x: 0, y: 599.5 }, { x: -601, y: 0 }], edges: [],
    commands: [["resetDamper"], ["relax", 10]] },
  { name: "Java integer repulsion product and division", nodes: base.map((n, i) => ({ ...n, repulsion: [113, 79, 143, 87][i] })), edges,
    commands: [["resetDamper"], ["relax", 15]] },
  { name: "Java int32 overflow", nodes: [{ x: -80, y: -50, repulsion: 65000 }, { x: 80, y: 50, repulsion: 65000 }], edges: [[0, 1, 40]],
    commands: [["resetDamper"], ["relax", 5]] },
  { name: "rigidity changes at the end of a batch", nodes: base, edges,
    commands: [["resetDamper"], ["setRigidity", .35], ["relax", 2], ["setRigidity", 1.7], ["relax", 8]] },
  { name: "dragged node excludes integration", nodes: base, edges,
    commands: [["stopDamper"], ["setDragNode", 1], ["relax", 5], ["setDragNode", -1], ["resetDamper"], ["relax", 10]] },
  { name: "damper controls and initial stopped state", nodes: base, edges,
    commands: [["relax", 1], ["resetDamper"], ["relax", 3], ["stopMotion"], ["relax", 1], ["stopMotion"], ["relax", 2], ["stopDamper"], ["relax", 2], ["startDamper"], ["relax", 5]] }
];
export const lensCases = [0, 1, 25, 60, 100].flatMap(value =>
  [[0, 0], [1, -2], [30, 40], [250, 0], [-400, 300], [1800, -300], [2500, 700]].map(([x, y]) => ({ value, x, y })));

export function runScenario(scenario) {
  const graph = new GraphEltSet();
  const nodes = scenario.nodes.map((data, i) => {
    const node = new Node(String(i)); Object.assign(node, data); graph.addNode(node); return node;
  });
  for (const [from, to, length] of scenario.edges) graph.addEdge(nodes[from], nodes[to], length);
  const layout = new TGLayout({ getGES: () => graph, repaintAfterMove() {} });
  const frames = [];
  for (const [command, ...args] of scenario.commands) {
    if (command === "relax") {
      for (let i = 0; i < args[0]; i++) {
        layout.relax();
        const state = layout.getState();
        frames.push({ nodes: nodes.map(n => [n.x, n.y, n.dx, n.dy]),
          state: [state.damper, state.maxMotion, state.lastMaxMotion, state.motionRatio, state.rigidity] });
      }
    } else if (command === "justMadeLocal") nodes[args[0]].justMadeLocal = Boolean(args[1]);
    else if (command === "setDragNode") layout.setDragNode(nodes[args[0]] ?? null);
    else layout[command](...args);
  }
  return frames;
}
export function runLens({ value, x, y }) {
  const lens = new HyperLens(value);
  const point = new TGPoint2D(x, y); lens.applyLens(point);
  const draw = [point.x, point.y]; lens.undoLens(point);
  return [...draw, point.x, point.y];
}
export function referenceInput() {
  const lines = [scenarios.length];
  for (const scenario of scenarios) {
    lines.push(`${scenario.nodes.length} ${scenario.edges.length} ${scenario.commands.length}`);
    for (const n of scenario.nodes) lines.push([n.x, n.y, n.dx ?? 0, n.dy ?? 0, n.repulsion ?? 100, +Boolean(n.fixed), +Boolean(n.justMadeLocal)].join(" "));
    for (const edge of scenario.edges) lines.push(edge.join(" "));
    for (const command of scenario.commands) lines.push(command.join(" "));
  }
  lines.push(lensCases.length);
  for (const { value, x, y } of lensCases) lines.push(`${value} ${x} ${y}`);
  return lines.join("\n");
}
