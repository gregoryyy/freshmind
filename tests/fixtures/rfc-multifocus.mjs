/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {TGLayout} from "fm4/core";
import {FreshGraph, FreshNode, FreshEdge, RfcController, angularGapRms, rfcForcePresets} from "fm4/fm/core";

export const multiFocusScenarios = ["joined-trees", "leaf-connected-trees", "shared-subtree"];
export const multiFocusModes = ["baseline", "left", "right", "both"];
export const multiFocusSeeds = [0x1234abcd, 0x05eeda11, 0x00c0ffee, 0xdecafbad, 0x9e3779b9];
const rms = values => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / (values.length || 1));

/** Two depth-two trees; extra semantic links never enter either stored tree definition. */
export function multiFocusFixture(name = "joined-trees", {seed = multiFocusSeeds[0], fixedRoots = false, mode = "baseline", stabilization = {enabled:false}} = {}) {
  if (!multiFocusScenarios.includes(name) || !multiFocusModes.includes(mode)) throw new Error("Unknown multi-focus fixture or mode");
  let state = seed >>> 0;
  const random = () => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296;};
  const graph = new FreshGraph(), shared = name === "shared-subtree";
  const node = (id, x, y, root = false) => {
    if (!graph.findNode(id)) graph.addNode(new FreshNode(id, id, {type: root ? "project" : "idea",
      position: {x: x + (random() - .5) * 80, y: y + (random() - .5) * 80}, fixed: root && fixedRoots}));
    return id;
  };
  const edge = (from, to) => {
    const id = `${from}:${to}`;
    if (![...graph.getEdges()].some(e => e.getID() === id)) graph.addEdge(new FreshEdge(graph.findNode(from), graph.findNode(to), {id, length: 90, label: "branch"}));
    return id;
  };
  for (const [side, sign] of [["a", -1], ["b", 1]]) {
    const rootId = node(`${side}0`, sign * 200, 0, true), nodeIds = [rootId], edgeIds = [];
    for (let branch = 0; branch < 2; branch++) {
      const isShared = shared && ((side === "a" && branch === 1) || (side === "b" && branch === 0));
      const id = isShared ? "s" : `${side}${branch + 1}`, y = (branch ? 1 : -1) * 90;
      nodeIds.push(node(id, isShared ? 0 : sign * 320, isShared ? 25 : y)); edgeIds.push(edge(rootId, id));
      for (let leaf = 0; leaf < 2; leaf++) {
        const leafId = node(`${id}${leaf + 1}`, isShared ? (leaf ? 65 : -65) : sign * 440, isShared ? 170 : y + (leaf ? 1 : -1) * 55);
        nodeIds.push(leafId); edgeIds.push(edge(id, leafId));
      }
    }
    graph.setSubstructure({id: `${side}-tree`, label: side === "a" ? "Left tree" : "Right tree", kind: "tree", rootId, nodeIds, edgeIds});
  }
  if (!shared) {
    graph.addEdge(new FreshEdge(graph.findNode("a0"), graph.findNode("b0"), {id: "context-bridge", length: 140, label: "context"}));
    if (name === "leaf-connected-trees") for (const [i, from, to] of [[0, "a11", "a21"], [1, "b12", "b22"], [2, "a12", "b11"], [3, "a22", "b21"]])
      graph.addEdge(new FreshEdge(graph.findNode(from), graph.findNode(to), {id: `leaf-link-${i}`, length: 90, label: "leaf context"}));
  }
  let onBatch = () => {};
  const host = {getGES: () => graph, getCompleteEltSet: () => graph, repaintAfterMove: () => onBatch(), resetDamper: () => layout.resetDamper()};
  const layout = new TGLayout(host, random), rfc = new RfcController(host, rfcForcePresets.tree, stabilization);
  layout.addForce(rfc.apply);
  if (mode === "left" || mode === "both") rfc.activateSubstructure("a-tree");
  if (mode === "right" || mode === "both") rfc.activateSubstructure("b-tree", mode === "both");
  layout.resetDamper();
  return {graph, layout, rfc, onBatch: callback => {onBatch = callback;}};
}

/** Uses only stored tree edges, counting every local gap at degree-two-or-higher vertices. */
function treeAngles(graph, edgeIds, nodeIds) {
  const edges = new Map([...graph.getEdges()].map(e => [e.getID(), e])), errors = [];
  for (const id of nodeIds) {
    const center = graph.findNode(id), neighbors = new Map();
    for (const edgeId of edgeIds) {
      const edge = edges.get(edgeId);
      if (edge.from === center || edge.to === center) {const other = edge.getOtherEndpt(center); neighbors.set(other, edge);}
    }
    if (neighbors.size < 2) continue;
    const star = {center, coordinateWeights: {x: 1, y: 1}, branches: [...neighbors].map(([node, edge]) => ({node, edge,
      angle: Math.atan2(node.y - center.y, node.x - center.x)})).sort((a, b) => a.angle - b.angle)};
    // Weight by number of gaps; the RMS of per-vertex RMS values alone would over-weight degree two.
    for (let i = 0; i < neighbors.size; i++) errors.push(angularGapRms(star));
  }
  return rms(errors);
}

/** Fixed observables for both definitions, even if a tree is not activated in a particular run. */
export function multiFocusMetrics(graph, target = 120) {
  const edges = new Map([...graph.getEdges()].map(e => [e.getID(), e]));
  const trees = graph.getSubstructures().map(tree => ({id: tree.id,
    angularGapRms: treeAngles(graph, tree.edgeIds, tree.nodeIds),
    radialLengthRms: rms(tree.edgeIds.map(id => {const e = edges.get(id); return Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y) - target;}))}));
  const edgeIds = [...new Set(graph.getSubstructures().flatMap(s => s.edgeIds))], nodeIds = [...graph.getNodes()].map(n => n.getID());
  const rootSeparation = Math.hypot(graph.findNode("a0").x - graph.findNode("b0").x, graph.findNode("a0").y - graph.findNode("b0").y);
  const distances = new Map([["a0", 0]]), queue = ["a0"];
  for (const id of queue) for (const edgeId of edgeIds) {
    const e = edges.get(edgeId), neighbor = e.from.getID() === id ? e.to.getID() : e.to.getID() === id ? e.from.getID() : null;
    if (neighbor && !distances.has(neighbor)) {distances.set(neighbor, distances.get(id) + 1); queue.push(neighbor);}
  }
  const rootPathEdges = distances.get("b0") ?? null;
  return {trees, unionAngularGapRms: treeAngles(graph, edgeIds, nodeIds),
    unionLengthRms: rms(edgeIds.map(id => {const e = edges.get(id); return Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y) - target;})),
    rootSeparation, rootPathEdges,
    unionLengthLowerBound: rootPathEdges ? Math.max(0, rootSeparation - rootPathEdges * target) / Math.sqrt(rootPathEdges * edgeIds.length) : null};
}

/** Matched initial coordinates/RNG; the passive observer samples all ten integrations, not just net batch motion. */
export function runMultiFocus(name, options = {}) {
  const batches = options.batches ?? 250, fixture = multiFocusFixture(name, options), {graph, layout, rfc} = fixture;
  const nodes = [...graph.getNodes()], movable = nodes.filter(n => !n.fixed), positions = () => nodes.map(n => ({id: n.getID(), x: n.x, y: n.y, fixed: n.fixed}));
  const initialNodes = positions(), initial = multiFocusMetrics(graph), trace = [{batch: 0, ...initial}];
  let previous = new Map(movable.map(n => [n, [n.x, n.y]])), velocities = new Map(), calls = 0, step = 0;
  const tail = [], sample = () => {
    const squares = []; let max = 0, eligible = 0, reversals = 0;
    for (const n of movable) {
      const [x, y] = previous.get(n), dx = n.x - x, dy = n.y - y, length = Math.hypot(dx, dy), old = velocities.get(n);
      squares.push(length * length); max = Math.max(max, length);
      if (old && length > .05 && Math.hypot(...old) > .05) {eligible++; if (old[0] * dx + old[1] * dy < 0) reversals++;}
      velocities.set(n, [dx, dy]); previous.set(n, [n.x, n.y]);
    }
    tail.push({step: ++step, sumSquares: squares.reduce((a, b) => a + b, 0), max, eligible, reversals});
    if (tail.length > 100) tail.shift();
  };
  // First callback of each batch sees a position already sampled by the preceding repaint (or t=0).
  layout.addForce(() => {if (calls++ % 10 !== 0) sample();});
  fixture.onBatch(sample);
  try {
    for (let batch = 1; batch <= batches; batch++) {
      layout.tick();
      if (batch % 10 === 0 || batch === batches) trace.push({batch, ...multiFocusMetrics(graph), damper: layout.getState().damper,
        lastStepMax: tail.at(-1).max});
    }
    const eligible = tail.reduce((sum, s) => sum + s.eligible, 0);
    return {name, seed: options.seed ?? multiFocusSeeds[0], fixedRoots: options.fixedRoots ?? false, mode: options.mode ?? "baseline", batches,
      settings: rfc.getState().settings, stabilizationEnabled: rfc.getState().stabilization.enabled,
      initial, final: multiFocusMetrics(graph), initialNodes, nodes: positions(), structures: graph.getSubstructures(),
      edges: [...graph.getEdges()].map(e => ({id: e.getID(), from: e.from.getID(), to: e.to.getID(), length: e.getLength()})),
      activeCenters: rfc.getState().centers.map(c => ({focusId: c.focusId, structureId: c.structureId, edgeIds: c.edgeIds})),
      sampledSteps: step, tailSteps: tail.length,
      tailStepRms: Math.sqrt(tail.reduce((sum, s) => sum + s.sumSquares, 0) / (tail.length * movable.length)),
      tailStepMax: Math.max(...tail.map(s => s.max)), tailReversalFraction: eligible ? tail.reduce((sum, s) => sum + s.reversals, 0) / eligible : null,
      tailEligibleReversals: eligible, trace};
  } finally {rfc.destroy(); layout.stop();}
}
