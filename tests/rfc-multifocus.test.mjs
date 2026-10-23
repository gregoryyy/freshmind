import test from "node:test";
import assert from "node:assert/strict";
import {analyzeSubstructure} from "fm4/fm/core";
import {multiFocusFixture, multiFocusScenarios, multiFocusMetrics, runMultiFocus} from "./fixtures/rfc-multifocus.mjs";

test("multi-focus topologies retain valid deep trees and exclude all extra leaf/context links", () => {
  for (const name of multiFocusScenarios) {
    const {graph, layout, rfc} = multiFocusFixture(name, {mode: "both"});
    try {
      assert.equal(graph.nodeCount(), name === "shared-subtree" ? 11 : 14);
      assert.equal(graph.edgeCount(), name === "shared-subtree" ? 10 : name === "joined-trees" ? 13 : 17);
      for (const structure of graph.getSubstructures()) {
        assert.equal(structure.kind, "tree"); assert.equal(structure.nodeIds.length, 7); assert.equal(structure.edgeIds.length, 6);
        assert.equal(Math.max(...analyzeSubstructure(graph, structure).levels.values()), 2);
        assert.ok(structure.edgeIds.every(id => !id.startsWith("context") && !id.startsWith("leaf-link")));
      }
      const centers = rfc.getState().centers;
      assert.equal(centers.length, 2);
      const selected = new Set(centers.flatMap(c => c.edgeIds));
      assert.equal(selected.size, name === "shared-subtree" ? 10 : 12);
      assert.equal(graph.getNodeSubstructures("s").length, name === "shared-subtree" ? 2 : 0);
    } finally {rfc.destroy(); layout.stop();}
  }
});

test("paired modes and pinned/free controls have identical initial coordinates and unchanged semantic graph", () => {
  const baseline = runMultiFocus("leaf-connected-trees", {batches: 2});
  for (const mode of ["left", "right", "both"]) {
    const result = runMultiFocus("leaf-connected-trees", {batches: 2, mode, fixedRoots: true});
    assert.deepEqual(result.initialNodes.map(({fixed, ...n}) => n), baseline.initialNodes.map(({fixed, ...n}) => n));
    assert.deepEqual(result.initial, baseline.initial);
    assert.deepEqual(result.edges, baseline.edges); assert.deepEqual(result.structures, baseline.structures);
    assert.equal(result.stabilizationEnabled, false);
    assert.equal(result.activeCenters.length, mode === "both" ? 2 : 1);
    for (const id of ["a0", "b0"]) assert.deepEqual(result.nodes.find(n => n.id === id), result.initialNodes.find(n => n.id === id));
  }
});

test("shared-root distance gives a feasible length-error lower bound, distinct from angular error", () => {
  const fixture = multiFocusFixture("shared-subtree", {fixedRoots: true});
  try {
    const {graph} = fixture, metric = multiFocusMetrics(graph);
    assert.equal(metric.rootPathEdges, 2);
    assert.ok(metric.rootSeparation > 240);
    assert.ok(Math.abs(metric.unionLengthLowerBound - (metric.rootSeparation - 240) / Math.sqrt(20)) < 1e-12);
    assert.ok(metric.unionLengthRms >= metric.unionLengthLowerBound);
    fixture.rfc.activateSubstructure("a-tree"); fixture.rfc.activateSubstructure("b-tree", true);
    fixture.layout.tick(10);
    assert.ok(multiFocusMetrics(graph).unionLengthRms >= metric.unionLengthLowerBound - 1e-9);
  } finally {fixture.rfc.destroy(); fixture.layout.stop();}
});

test("multi-focus records repeat exactly and sample every integration step without adding constraints", () => {
  const options = {mode: "both", batches: 12, seed: 0xdecafbad};
  const a = runMultiFocus("joined-trees", options), b = runMultiFocus("joined-trees", options);
  assert.deepEqual(a, b); assert.equal(a.sampledSteps, 120); assert.equal(a.tailSteps, 100);
  assert.ok(Number.isFinite(a.tailStepRms)); assert.ok(a.tailStepMax >= a.tailStepRms);
  assert.equal(a.final.unionLengthLowerBound, null);
  assert.equal(a.edges.length, 13); assert.equal(a.activeCenters.flatMap(c => c.edgeIds).length, 12);
});
