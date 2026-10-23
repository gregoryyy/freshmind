/* Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
 * TypeScript port by Gregor Heinrich using Codex GPT-6.1. */
import {TGLayout} from "fm4/core";
import {FreshGraph, FreshNode, FreshEdge, RfcController, collectFocalStar, angularGapRms} from "fm4/fm/core";

export const rfcScenarios = ["crowded-star", "unequal-radii", "wide-labels"];

/** Synthetic examples only; fixed context anchors create competing ordinary spring forces. */
export function rfcFixture(name = "crowded-star", reinforced = false) {
  if (!rfcScenarios.includes(name)) throw new Error("Unknown RFC scenario " + name);
  const graph = new FreshGraph();
  const wide = name === "wide-labels", coordinateWeights = {x: wide ? .25 : 1, y: 1};
  const addNode = node => { graph.addNode(node); return node; };
  const center = addNode(new FreshNode("center", "Focal project", {type: "project", position: {x: 0, y: 0}, fixed: true}));
  if (wide) center.setAnnotation({format: "text", text: "Weighted RFC example: use horizontal coordinate weight 0.25 and vertical weight 1, then reinforce this node. RFC settings are transient and must be set after opening the graph."});
  const angles = [-2.9, -2.3, -1, -.8, -.4, .6];
  const radii = name === "unequal-radii" ? [75, 125, 90, 180, 100, 210] : [90, 100, 110, 90, 100, 110];
  const lengths = name === "unequal-radii" ? [20, 35, 55, 70, 95, 120] : [60, 60, 60, 60, 60, 60];
  for (let i = 0; i < angles.length; i++) {
    const node = addNode(new FreshNode(`branch-${i}`, `Branch ${i + 1}${wide ? " — a horizontally extended label" : ""}`, {type: "idea", position: {x: (wide ? 2 : 1) * radii[i] * Math.cos(angles[i]), y: radii[i] * Math.sin(angles[i])}}));
    graph.addEdge(new FreshEdge(center, node, {id: `focal-${i}`, length: lengths[i], label: "aspect"}));
  }
  for (const [i, x, y] of [[0, 230, -70], [1, 230, 140]]) {
    const anchor = addNode(new FreshNode(`context-${i}`, `Context ${i + 1}`, {type: "topic", position: {x: x * (wide ? 2 : 1), y}, fixed: true}));
    for (let branch = i; branch < angles.length; branch += 2)
      graph.addEdge(new FreshEdge(graph.findNode(`branch-${branch}`), anchor, {id: `context-link-${branch}`, length: 120, label: "context"}));
  }
  let seed = 0x1234abcd;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  const host = {getGES: () => graph, getCompleteEltSet: () => graph, repaintAfterMove() {}, resetDamper: () => layout.resetDamper()};
  const layout = new TGLayout(host, random), rfc = new RfcController(host, {coordinateWeights});
  layout.addForce(rfc.apply);
  if (reinforced) rfc.setFocus(center);
  layout.resetDamper();
  return {graph, center, layout, rfc};
}

/** Fixed batch count, initial coordinates and RNG allow exact repeated comparisons in one runtime. */
export function runRfcScenario(name, reinforced, batches = 250) {
  const {graph, center, layout, rfc} = rfcFixture(name, reinforced);
  const sample = () => {
    const star = collectFocalStar(graph, center, rfc.getState().settings.coordinateWeights);
    return {angularGapRms: angularGapRms(star), physicalAngularGapRms: angularGapRms(collectFocalStar(graph, center)),
      meanRadius: star.branches.reduce((sum, branch) => sum + Math.hypot(branch.node.x - center.x, branch.node.y - center.y), 0) / star.branches.length};
  };
  const initial = sample();
  const trace = [{batch: 0, ...initial}];
  for (let batch = 1; batch <= batches; batch++) {
    layout.tick();
    if (batch % 10 === 0 || batch === batches) trace.push({batch, ...sample()});
  }
  const result = {name, reinforced, batches, settings: rfc.getState().settings, initial, final: sample(), trace,
    nodes: [...graph.getNodes()].map(node => ({id: node.getID(), label: node.getLabel(), x: node.x, y: node.y, fixed: node.fixed})),
    edges: [...graph.getEdges()].map(edge => ({id: edge.getID(), from: edge.from.getID(), to: edge.to.getID(), length: edge.getLength()}))};
  rfc.destroy(); layout.stop();
  return result;
}
