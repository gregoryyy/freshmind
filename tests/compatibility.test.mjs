import test from "node:test";
import assert from "node:assert/strict";
import { Edge, GraphEltSet, Node, TGException, TGLayout, TGPoint2D, VisibleLocality } from "fm4/core";
import { TGPanel } from "fm4";

test("label lookup prefers an exact case-insensitive match before a substring", () => {
  const graph = new GraphEltSet();
  const longer = new Node("a", "Alpha extended"), exact = new Node("b", "ALPHA");
  graph.addNode(longer); graph.addNode(exact);
  assert.throws(() => graph.addNode(exact), error => error.getId() === TGException.NODE_EXISTS);
  assert.equal(graph.findNodeLabelContaining("alpha"), exact);
  assert.equal(graph.findNodeLabelContaining("extend"), longer);
  assert.equal(graph.findNodeLabelContaining("missing"), null);
  assert.deepEqual(graph.findNodesByLabel("missing"), []);
  assert.throws(() => graph.nodeAt(5), RangeError);
});

test("bulk deletion handles live iterators, parallel edges and self-loop adjacency", () => {
  const graph = new GraphEltSet();
  const a = new Node("a"), b = new Node("b"); graph.addNode(a); graph.addNode(b);
  graph.addEdge(a, a); graph.addEdge(a, b); graph.addEdge(a, b);
  assert.equal(a.edgeCount(), 4);
  assert.equal(graph.deleteEdge(b, a), false);
  assert.equal(graph.deleteEdge(a, b), true);
  graph.deleteEdges(graph.getEdges());
  assert.equal(a.edgeCount(), 0); assert.equal(b.edgeCount(), 0);
  graph.deleteNodes(graph.getNodes());
  assert.equal(graph.nodeCount(), 0);
});

test("bulk removal and hidden edge deletion preserve the complete model", () => {
  const graph = new GraphEltSet();
  const a = new Node("a"), b = new Node("b"); graph.addNode(a); graph.addNode(b);
  const edge = graph.addEdge(a, b);
  const local = new VisibleLocality(graph); local.addAll();
  local.removeEdges(local.getEdges());
  assert.equal(a.visibleEdgeCount(), 0); assert.equal(a.edgeCount(), 1);
  local.removeNodes(local.getNodes());
  assert.equal(graph.nodeCount(), 2); assert.equal(local.nodeCount(), 0);
  assert.equal(local.deleteEdge(a, b), true); assert.equal(graph.contains(edge), false);
  local.deleteNodes(graph.getNodes());
  assert.equal(graph.nodeCount(), 0);
});

test("external visibility flags update membership and keep endpoint counts consistent", () => {
  const graph = new GraphEltSet();
  const a = new Node("a"), b = new Node("b"); graph.addNode(a); graph.addNode(b);
  const edge = graph.addEdge(a, b);
  const local = new VisibleLocality(graph);
  a.setVisible(true); b.setVisible(true); edge.setVisible(true); local.updateLocalityFromVisibility();
  assert.equal(local.edgeCount(), 1); assert.equal(a.visibleEdgeCount(), 1);
  local.updateLocalityFromVisibility();
  assert.equal(a.visibleEdgeCount(), 1);
  a.setVisible(false); local.updateLocalityFromVisibility();
  assert.equal(local.nodeCount(), 1); assert.equal(local.edgeCount(), 0);
  assert.equal(b.visibleEdgeCount(), 0); assert.equal(graph.edgeCount(), 1);
  edge.setVisible(true); local.updateLocalityFromVisibility();
  assert.equal(edge.isVisible(), false);
  graph.deleteNode(b); local.updateLocalityFromVisibility();
  assert.equal(local.nodeCount(), 0);
});

test("node and edge hit tests use draw coordinates, including vertical and zero-length edges", () => {
  const a = new Node("a"), b = new Node("b");
  a.drawx = 40; a.drawy = 30; a.setDimensions(80, 28); a.setFixed(true);
  assert.equal(a.getFixed(), true);
  assert.throws(() => a.edgeAt(0), RangeError);
  assert.equal(a.containsPoint(new TGPoint2D(45, 32)), true);
  assert.equal(a.containsPoint(90, 30), false);
  assert.equal(a.intersects({ width: 100, height: 100 }), true);
  b.drawx = 40; b.drawy = 130;
  const edge = new Edge(a, b);
  assert.equal(edge.distFromPoint(43, 80), 3);
  assert.equal(edge.containsPoint(40, 80), true);
  assert.equal(edge.distFromPoint(100, 80), 1000);
  b.drawy = 30;
  assert.equal(edge.distFromPoint(40, 30), 1000);
});

test("Java exception constructors retain their identifier and tunneled cause", () => {
  assert.equal(new TGException(TGException.NODE_NO_ID).getId(), 3);
  assert.equal(new TGException("message").message, "message");
  const original = new Error("underlying failure");
  const tunneled = new TGException(original);
  assert.equal(tunneled.getId(), -1); assert.equal(tunneled.exception, original); assert.equal(tunneled.cause, original);
});

test("panel lookups, counts and overloads work across hidden and visible elements", async () => {
  const panel = new TGPanel();
  const anonymous = panel.addNode(), a = panel.addNode("a", "Alpha"), b = panel.addNode("b", "Beta");
  assert.ok(anonymous.getID()); assert.notEqual(anonymous.getID(), a.getID());
  panel.addEdge(a, b); assert.equal(panel.getEdgeCount(), 1);
  assert.equal(panel.findNodeLabelContaining("ALP"), a);
  assert.deepEqual(panel.findNodesByLabel("Beta"), [b]);
  await panel.setLocale(a, 0);
  assert.equal(panel.edgeNum(), 0); assert.equal(panel.getEdgeCount(), 1);
  assert.equal(panel.getSelect(), null);
  assert.equal(panel.deleteEdge(a, b), true);
  assert.equal(a.edgeCount(), 0); assert.equal(panel.getNodeCount(), 3);
  panel.destroy();
});

test("locality operations clear stale selected, focused and hovered references", async () => {
  const panel = new TGPanel();
  const a = panel.addNode("a", "Alpha"), b = panel.addNode("b", "Beta");
  const edge = panel.addEdge(a, b);
  await panel.focusNode(a, 1); panel.setMouseOverN(a);
  await panel.setLocale(b, 0);
  assert.equal(panel.getSelect(), null); assert.equal(panel.getFocus(), null); assert.equal(panel.getMouseOverN(), null);
  await panel.setLocaleAll(); panel.setMouseOverE(edge);
  panel.deleteNode(a);
  assert.equal(panel.getMouseOverE(), null); assert.equal(panel.visibleEdgeCount(), 0);
  panel.destroy();
});

test("rectangle selection uses transformed coordinates and retains Java's one-candidate semantics", () => {
  const panel = new TGPanel();
  const a = panel.addNode("a", "Alpha"), b = panel.addNode("b", "Beta");
  a.setLocation({ x: -40, y: 0 }); b.setLocation({ x: 80, y: 0 });
  panel.setZoom(2); panel.setRotation(Math.PI / 2);
  panel.multiSelect(new TGPoint2D(a.drawx - 5, a.drawy - 5), new TGPoint2D(a.drawx + 5, a.drawy + 5));
  assert.equal(panel.getSelect(), a);
  const before = panel.getTopLeftDraw(); before.x = 1e6;
  assert.notEqual(panel.getTopLeftDraw().x, before.x);
  panel.multiSelect(new TGPoint2D(1000, 1000), new TGPoint2D(1010, 1010));
  assert.equal(panel.getSelect(), null);
  panel.clearAll(); assert.deepEqual(panel.getTopLeftDraw(), new TGPoint2D());
  panel.destroy();
});

test("timed layout runs its first batch and can stop inside the repaint callback", context => {
  let nextId = 0;
  const pending = new Map();
  context.mock.method(globalThis, "setTimeout", callback => { const id = ++nextId; pending.set(id, callback); return id; });
  context.mock.method(globalThis, "clearTimeout", id => pending.delete(id));
  let moves = 0;
  const layout = new TGLayout({ getGES: () => new GraphEltSet(), repaintAfterMove() { moves++; layout.stop(); } });
  layout.setRigidity(.4); layout.start(); layout.start();
  assert.equal(pending.size, 1);
  const [id, callback] = [...pending][0]; pending.delete(id); callback();
  assert.equal(moves, 1); assert.equal(layout.getState().rigidity, .4); assert.equal(pending.size, 0);
});

test("a stopped generation cannot reschedule itself after restarting during repaint", context => {
  let nextId = 0;
  const pending = new Map();
  context.mock.method(globalThis, "setTimeout", callback => { const id = ++nextId; pending.set(id, callback); return id; });
  context.mock.method(globalThis, "clearTimeout", id => pending.delete(id));
  let moves = 0;
  const layout = new TGLayout({ getGES: () => new GraphEltSet(), repaintAfterMove() {
    moves++; layout.stop(); if (moves === 1) layout.start();
  } });
  layout.start();
  for (let i = 0; i < 2; i++) {
    assert.equal(pending.size, 1);
    const [id, callback] = [...pending][0]; pending.delete(id); callback();
  }
  assert.equal(moves, 2); assert.equal(pending.size, 0);
});
