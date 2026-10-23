import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {parseDocument, serializeDocument, documentToRecord} from "fm4/fm/io";

test("public examples preserve pinned source IDs, weights, membership and native round trips", async () => {
  const result = spawnSync("python3", ["scripts/extract-public-graphs.py"], {encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr);
  const {source, graphs} = JSON.parse(result.stdout);
  const bytes = await readFile(new URL("../examples/public/sources/networkx-social.py", import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), source.sha256);
  for (const input of graphs) {
    const document = parseDocument(await readFile(new URL(`../examples/public/${input.id}.fm.yaml`, import.meta.url), "utf8"));
    const id = key => input.id === "karate" ? "member-" + (key + 1) : String(key);
    assert.equal(document.graph.nodeCount(), input.nodes.length); assert.equal(document.graph.edgeCount(), input.edges.length);
    for (const original of input.nodes) {
      const node = document.graph.findNode(id(original.key));
      assert.equal(node.getData().sourceNode, original.key);
      if (original.club) assert.equal(node.getData().club, original.club);
      assert.equal(node.getData().degree, node.edgeCount());
      for (const match of node.getAnnotation().text.matchAll(/href="#node=([^"]+)"/g)) assert.ok(document.graph.findNode(decodeURIComponent(match[1])));
    }
    const canonical = edges => edges.map(edge => [edge.from, edge.to].sort().join("\0") + "\0" + edge.weight).sort();
    assert.deepEqual(canonical([...document.graph.getEdges()].map(edge => ({from: edge.from.getID(), to: edge.to.getID(), weight: edge.getWeight()}))), canonical(input.edges.map(edge => ({from: id(edge.from), to: id(edge.to), weight: edge.weight}))));
    assert.equal(document.types.getConfiguration().edgeVisuals.default.arrow.placement, "none");
    assert.deepEqual(documentToRecord(parseDocument(serializeDocument(document))), documentToRecord(document));
  }
});

test("karate conversion retains NetworkX's later nonzero matrix entry rather than assuming symmetry", async () => {
  const document = parseDocument(await readFile(new URL("../examples/public/karate.fm.yaml", import.meta.url), "utf8"));
  const weight = (a, b) => document.graph.findEdge(document.graph.findNode("member-" + a), document.graph.findNode("member-" + b)).getWeight();
  assert.equal(weight(1, 13), 1); assert.equal(weight(3, 33), 2); assert.equal(weight(23, 34), 3);
  assert.equal(document.graph.nodeCount(), 34); assert.equal(document.graph.edgeCount(), 78);
});
