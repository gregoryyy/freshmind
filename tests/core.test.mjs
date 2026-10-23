import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GraphEltSet, Node, VisibleLocality, GESUtils, LocalityUtils, TGLayout,
  HyperLens, TGLensSet, TranslateLens, ZoomLens, RotateLens, TGPoint2D, TGException } from "fm4/core";
import { TGPanel } from "fm4";
import { scenarios, lensCases, runScenario, runLens } from "./scenarios.mjs";
import { compare } from "./compare.mjs";

const golden = JSON.parse(await readFile(new URL("./reference/snapshots.json", import.meta.url), "utf8"));
scenarios.forEach((scenario, i) => {
  test(`Java physics: ${scenario.name}`, () => compare(runScenario(scenario), golden.scenarios[i]));
});
test("Java HyperScroll forward and sampled inverse transforms", () => compare(lensCases.map(runLens), golden.lenses));

function makeGraph() {
  const graph = new GraphEltSet();
  const nodes = ["a", "b", "c", "d", "e"].map((id, i) => {
    const node = new Node(id); node.x = i * 70; node.y = i * 20; graph.addNode(node); return node;
  });
  for (const [from, to] of [[0, 1], [1, 2], [1, 3], [3, 4]]) graph.addEdge(nodes[from], nodes[to]);
  return { graph, nodes };
}
function makeLocality() {
  const { graph, nodes } = makeGraph();
  const locality = new VisibleLocality(graph);
  const layout = new TGLayout({ getGES: () => locality, repaintAfterMove() {} });
  let selected = null;
  const host = { stopDamper: () => layout.stopDamper(), resetDamper: () => layout.resetDamper(), repaint() {},
    getSelect: () => selected, clearSelect: () => { selected = null; } };
  const utils = new LocalityUtils(locality, host, false);
  return { graph, nodes, locality, utils, layout, setSelected: value => { selected = value; }, getSelected: () => selected };
}
test("IDs are unique, anonymous IDs are assigned, and Java-style visitors work", () => {
  const graph = new GraphEltSet();
  graph.addNode(new Node("a"));
  assert.throws(() => graph.addNode(new Node("a")), TGException);
  const anonymous = new Node(null, "a"); graph.addNode(anonymous);
  assert.equal(anonymous.getID(), "a-1");
  const result = [];
  graph.forAllNodes({ forEachNode: node => result.push(node.getID()) });
  assert.deepEqual(result, ["a", "a-1"]);
});
test("removing visible elements preserves complete graph and adjacency", () => {
  const { graph, nodes, locality } = makeLocality();
  locality.addAll();
  assert.equal(nodes[1].visibleEdgeCount(), 3);
  locality.removeNode(nodes[1]);
  assert.equal(graph.nodeCount(), 5); assert.equal(graph.edgeCount(), 4);
  assert.equal(nodes[1].edgeCount(), 3); assert.equal(nodes[1].visibleEdgeCount(), 0);
  assert.equal(nodes[1].isVisible(), false);
  locality.addNodeWithEdges(nodes[1]);
  assert.equal(locality.edgeCount(), 4); assert.equal(nodes[1].visibleEdgeCount(), 3);
  assert.equal(nodes[1].edgeCount(), 3);
});
test("deletion removes complete adjacency even for hidden nodes", () => {
  const { graph, nodes, locality } = makeLocality();
  locality.addAll(); locality.removeNode(nodes[1]); locality.deleteNode(nodes[1]);
  assert.equal(graph.edgeCount(), 1); assert.equal(graph.nodeCount(), 4);
  assert.equal(nodes[1].edgeCount(), 0); assert.equal(nodes[0].edgeCount(), 0);
});
test("locality traverses hop distance, direction and degree limits", () => {
  const { graph, nodes } = makeGraph();
  const ids = map => [...map.keys()].map(n => n.getID());
  assert.deepEqual(ids(GESUtils.calculateDistances(graph, nodes[0], 2)), ["a", "b", "c", "d"]);
  assert.deepEqual(ids(GESUtils.calculateDistances(graph, nodes[2], 3, 1000, 1000, true)), ["c"]);
  assert.deepEqual(ids(GESUtils.calculateDistances(graph, nodes[0], 3, 2)), ["a"]);
  assert.deepEqual(ids(GESUtils.calculateDistances(graph, nodes[0], 3, 1000, 2)), ["a", "b"]);
});
test("changing focus preserves world positions and restores hidden branches", async () => {
  const { graph, nodes, locality, utils } = makeLocality();
  const positions = nodes.map(node => [node.x, node.y]);
  await utils.setLocale(nodes[0], 1);
  assert.equal(locality.nodeCount(), 2);
  await utils.setLocale(nodes[4], 1);
  assert.deepEqual([...locality.getNodes()].map(n => n.getID()), ["e", "d"]);
  assert.equal(graph.nodeCount(), 5);
  await utils.setLocale(nodes[0], LocalityUtils.INFINITE_LOCALITY_RADIUS);
  assert.equal(locality.nodeCount(), 5); assert.equal(locality.edgeCount(), 4);
  assert.deepEqual(nodes.map(node => [node.x, node.y]), positions);
  assert.ok(nodes.every(node => !node.justMadeLocal && !node.markedForRemoval));
});
test("expand, collapse and hide retain the largest connected neighborhood", async () => {
  const { nodes, locality, utils, setSelected, getSelected } = makeLocality();
  await utils.setLocale(nodes[0], 1); await utils.expandNode(nodes[1]);
  assert.equal(locality.nodeCount(), 4);
  await utils.collapseNode(nodes[1]);
  assert.deepEqual([...locality.getNodes()].map(n => n.getID()), ["a", "b"]);
  setSelected(nodes[1]); await utils.hideNode(nodes[1]);
  assert.equal(getSelected(), null); assert.equal(locality.nodeCount(), 1);
});
test("queued locality changes finish in order and dispose prevents later mutation", async () => {
  const { nodes, locality, utils } = makeLocality();
  const first = utils.setLocale(nodes[0], 1); const second = utils.setLocale(nodes[4], 0);
  await Promise.all([first, second]);
  assert.deepEqual([...locality.getNodes()], [nodes[4]]);
  const pending = utils.setLocale(nodes[0], 3); utils.dispose(); await pending;
  assert.deepEqual([...locality.getNodes()], [nodes[4]]);
});
test("fast finish also skips animation delays before a queued operation starts", async context => {
  const { nodes, locality, layout } = makeLocality();
  const host = { stopDamper: () => layout.stopDamper(), resetDamper: () => layout.resetDamper(), repaint() {},
    getSelect: () => null, clearSelect() {} };
  const utils = new LocalityUtils(locality, host, true);
  context.mock.method(globalThis, "setTimeout", () => { throw new Error("Fast-finished operation scheduled a delay"); });
  const pending = utils.setLocale(nodes[0], 2);
  utils.fastFinishAnimation(); await pending;
  assert.equal(locality.nodeCount(), 4);
});
test("coincident nodes separate without non-finite values", () => {
  const graph = new GraphEltSet();
  for (let i = 0; i < 3; i++) { const node = new Node(String(i)); node.x = 0; node.y = 0; graph.addNode(node); }
  const layout = new TGLayout({ getGES: () => graph, repaintAfterMove() {} }, () => .25);
  layout.resetDamper(); layout.tick(20);
  assert.ok([...graph.getNodes()].every(node => [node.x, node.y, node.dx, node.dy].every(Number.isFinite)));
  assert.notEqual(graph.nodeAt(0).x, graph.nodeAt(1).x);
});
test("lens composition reverses its operations without mutating the input", () => {
  const lenses = new TGLensSet();
  for (const lens of [new TranslateLens(-60, 10), new ZoomLens(1.8), new RotateLens(.7), new TranslateLens(400, 300)]) lenses.addLens(lens);
  const point = new TGPoint2D(34, -87);
  const screen = lenses.convRealToDraw(point);
  const real = lenses.convDrawToReal(screen);
  compare([real.x, real.y], [point.x, point.y]);
  assert.deepEqual([point.x, point.y], [34, -87]);
});
test("focus lens enlarges nearby space, compresses context, and fixes radius 250", () => {
  const lens = new HyperLens(100);
  assert.ok(lens.hyperDist(50) > 50); assert.ok(lens.hyperDist(700) < 700);
  compare(lens.hyperDist(250), 250);
  compare(lens.invHyperDist(lens.hyperDist(50)), 50);
});
test("headless panel keeps lens changes separate from the physical layout", async () => {
  const { graph, nodes } = makeGraph();
  const panel = new TGPanel(); panel.setGraphEltSet(graph);
  await panel.focusNode(nodes[1], 2);
  const positions = nodes.map(node => [node.x, node.y]);
  panel.setHyperbolic(100); panel.setRotation(.6);
  compare([nodes[1].drawx, nodes[1].drawy], [0, 0]);
  assert.deepEqual(nodes.map(node => [node.x, node.y]), positions);
  panel.destroy();
});
test("focus itself can be dragged without the lens chasing the pointer", async () => {
  const { graph, nodes } = makeGraph();
  const panel = new TGPanel(); panel.setGraphEltSet(graph); await panel.focusNode(nodes[1], 1);
  panel.setHyperbolic(60); panel.setDragNode(nodes[1]);
  nodes[1].x += 35; panel.repaint();
  const screen = [nodes[1].drawx, nodes[1].drawy];
  assert.ok(screen[0] > 0);
  panel.setDragNode(null); panel.repaint();
  compare([nodes[1].drawx, nodes[1].drawy], screen);
  panel.destroy();
});
test("graph and canvas zoom compose independently without changing physical positions", () => {
  const { graph, nodes } = makeGraph();
  const panel = new TGPanel(); panel.setGraphEltSet(graph); panel.getGES().addAll();
  Object.assign(panel.getAdjustOriginLens(), panel.getDrawCenter());
  const positions = nodes.map(node => [node.x, node.y]);
  panel.setZoom(1.7); panel.setHyperbolic(65); panel.setRotation(.8);
  const draw = nodes.map(node => [node.drawx, node.drawy]), center = panel.getCenter();
  panel.setCanvasZoom(2.3);
  assert.equal(panel.getZoom(), 1.7); assert.equal(panel.getCanvasZoom(), 2.3);
  assert.deepEqual(nodes.map(node => [node.drawx, node.drawy]), draw);
  compare([panel.getCenter().x, panel.getCenter().y], [center.x, center.y]);
  for (const node of nodes) {
    const screen = panel.drawToScreen({ x: node.drawx, y: node.drawy });
    const back = panel.screenToDraw(screen);
    compare([back.x, back.y], [node.drawx, node.drawy]);
  }
  panel.centerOn(nodes[1]);
  const centered = panel.drawToScreen({ x: nodes[1].drawx, y: nodes[1].drawy });
  compare([centered.x, centered.y], [panel.getDrawCenter().x, panel.getDrawCenter().y]);
  assert.equal(panel.getZoom(), 1.7); assert.equal(panel.getCanvasZoom(), 2.3);
  panel.setZoom(2.2);
  const stillCentered = panel.drawToScreen({ x: nodes[1].drawx, y: nodes[1].drawy });
  compare([stillCentered.x, stillCentered.y], [panel.getDrawCenter().x, panel.getDrawCenter().y]);
  assert.deepEqual(nodes.map(node => [node.x, node.y]), positions);
  panel.destroy();
});
test("both zoom APIs reject invalid scales and clamp independently", () => {
  const panel = new TGPanel();
  for (const scale of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => panel.setZoom(scale), RangeError);
    assert.throws(() => panel.setCanvasZoom(scale), RangeError);
  }
  panel.setZoom(10); panel.setCanvasZoom(.01);
  assert.equal(panel.getZoom(), 5); assert.equal(panel.getCanvasZoom(), .15);
  panel.canvasZoomBy(100); panel.zoomBy(.001);
  assert.equal(panel.getZoom(), .15); assert.equal(panel.getCanvasZoom(), 5);
  panel.destroy();
});
