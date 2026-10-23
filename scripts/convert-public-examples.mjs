/* Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
 * TypeScript port by Gregor Heinrich using Codex GPT-6.1. */
import {spawnSync} from "node:child_process";
import {mkdir, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import {FreshGraph, FreshNode, FreshEdge, FreshmindDocument, TypeRegistry, freshmind2014Configuration} from "fm4/fm/core";
import {parseDocument, serializeDocument, documentToRecord} from "fm4/fm/io";

const root = fileURLToPath(new URL("../", import.meta.url));
const extracted = spawnSync("python3", [fileURLToPath(new URL("extract-public-graphs.py", import.meta.url))], {cwd: root, encoding: "utf8"});
if (extracted.error || extracted.status !== 0) throw new Error(extracted.error?.message ?? extracted.stderr);
const {source, graphs} = JSON.parse(extracted.stdout);
const definitions = {
  florentine: {title: "Florentine families", focus: "Medici", type: "group", relation: "marriage", counts: [15, 20],
    description: "Recorded marriage links between Florentine families. The example is the 15-family network represented by NetworkX; it is not a complete history of Florence.",
    reference: "R. L. Breiger and P. E. Pattison, Cumulated social roles: The duality of persons and their algebras, Social Networks 8(3), 1986, pp. 215–256."},
  karate: {title: "Zachary's karate club", focus: 0, type: "person", relation: "club-tie", counts: [34, 78],
    description: "Zachary's observed karate-club network. The source includes post-split club membership and interaction-context weights. Member labels are anonymized numbers.",
    reference: "W. W. Zachary, An Information Flow Model for Conflict and Fission in Small Groups, Journal of Anthropological Research 33, 1977, pp. 452–473."},
  "les-miserables": {title: "Les Misérables", focus: "Myriel", type: "person", relation: "coappearance", counts: [77, 254],
    description: "Weighted coappearance links between characters in Victor Hugo's Les Misérables, represented by NetworkX from Knuth's Stanford GraphBase. A link records coappearance, not friendship or narrative causation.",
    reference: "D. E. Knuth, The Stanford GraphBase: A Platform for Combinatorial Computing, 1993, pp. 74–87."}
};
const html = value => String(value).replace(/[&<>"']/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[char]);
const config = structuredClone(freshmind2014Configuration);
config.id = "public-networks";
config.edgeVisuals.default.arrow = {placement: "none", size: 5};
config.edgeVisuals.default.stroke.color = "#708274";
for (const id of ["marriage", "club-tie", "coappearance"]) config.relationTypes[id] = {label: id, visual: "default"};
const report = {source, license: "BSD-3-Clause", licenseFile: "sources/LICENSE-NETWORKX.txt", graphs: []};
for (const input of graphs) {
  const definition = definitions[input.id], graph = new FreshGraph();
  const id = key => input.id === "karate" ? "member-" + (key + 1) : String(key);
  const label = key => input.id === "karate" ? "Member " + (key + 1) : String(key);
  const url = `https://networkx.org/documentation/stable/reference/generated/networkx.generators.social.${input.function}.html`;
  const byKey = new Map();
  let ordinal = 0;
  for (const item of input.nodes) {
    const links = input.edges.filter(edge => edge.from === item.key || edge.to === item.key);
    const neighbors = links.map(edge => ({key: edge.from === item.key ? edge.to : edge.from, weight: edge.weight}));
    const weightedDegree = neighbors.reduce((total, neighbor) => total + neighbor.weight, 0);
    const degree = neighbors.length;
    const club = item.club ? `<p>Source member index: ${item.key} (display number ${item.key + 1}). Post-split club: <strong>${html(item.club)}</strong>.</p>` : "";
    const annotation = `<p>${html(definition.description)}</p>${club}<p><strong>${html(label(item.key))}</strong> has ${degree} recorded ${input.id === "florentine" ? "marriage links" : "neighbors"}${input.id === "florentine" ? "" : `; the sum of incident weights is ${weightedDegree}`}.</p>`
      + "<h3>Connected nodes</h3><ul>" + neighbors.map(neighbor => `<li><a href="#node=${encodeURIComponent(id(neighbor.key))}">${html(label(neighbor.key))}</a>${input.id === "florentine" ? "" : ` — weight ${neighbor.weight}`}</li>`).join("")
      + `</ul><p><a href="${url}">NetworkX dataset reference</a></p>`;
    const isFocus = item.key === definition.focus;
    const angle = ordinal * 2 * Math.PI / (input.nodes.length - 1), radius = 160 + ordinal % 3 * 35;
    const position = isFocus ? {x: 0, y: 0} : {x: radius * Math.cos(angle), y: radius * Math.sin(angle)};
    if (!isFocus) ordinal++;
    const fill = item.club === "Officer" ? "#f6e5d3" : "#e0ebf4";
    const node = new FreshNode(id(item.key), label(item.key), {type: definition.type, position, annotation: {format: "html", text: annotation}, url,
      visual: {style: {fill, text: {color: "#23313d"}}}, data: {dataset: input.id, sourceNode: item.key, degree, weightedDegree, ...(item.club ? {club: item.club} : {})}});
    graph.addNode(node); byKey.set(item.key, node);
  }
  input.edges.forEach((edge, index) => graph.addEdge(new FreshEdge(byKey.get(edge.from), byKey.get(edge.to), {
    id: `${input.id}-e${index + 1}`, type: definition.relation, weight: edge.weight, length: 70,
    data: {directed: false, sourceWeight: edge.weight}
  })));
  assert.deepEqual([graph.nodeCount(), graph.edgeCount()], definition.counts);
  const document = new FreshmindDocument(new TypeRegistry(config), graph);
  document.title = definition.title;
  document.data = {description: definition.description, source: {...source, function: input.function, license: "BSD-3-Clause"}, reference: definition.reference,
    directed: false, annotations: "Freshmind graph-derived summaries and internal navigation links; no character biographies or historical descriptions are imported."};
  document.view = {focus: id(definition.focus), radius: input.id === "les-miserables" ? 1 : 2, wholeGraph: input.id !== "les-miserables", backlinks: true,
    lenses: {zoom: 1.5, hyperbolic: 0, rotation: 0}, canvas: {zoom: 1}};
  const output = serializeDocument(document);
  assert.deepEqual(documentToRecord(parseDocument(output)), documentToRecord(document));
  const file = new URL(`../examples/public/${input.id}.fm.yaml`, import.meta.url);
  await mkdir(new URL("../examples/public/", import.meta.url), {recursive: true}); await writeFile(file, output);
  report.graphs.push({id: input.id, file: `${input.id}.fm.yaml`, nodes: graph.nodeCount(), edges: graph.edgeCount(), function: input.function, focus: id(definition.focus), focusDegree: byKey.get(definition.focus).getData().degree});
  console.log(`${input.id}: ${graph.nodeCount()} nodes / ${graph.edgeCount()} relations; complete native round trip passed`);
}
await writeFile(new URL("../examples/public/provenance.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
