/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import { stringify } from "yaml";
import { FreshNode, FreshEdge, FreshmindDocument } from "../model/index.js";
import { TypeRegistry } from "../config/core.js";
import { freshmind2014Configuration } from "../config/core.js";
import { clone, jsonData, keys, number, record, text } from "../config/core.js";
import { parseYamlValue } from "./yaml-value.js";
import type { DocumentRecord, DocumentView, LoadOptions, SaveOptions } from "./types.js";
import type { FreshNodeOptions, FreshEdgeOptions, Metadata } from "../model/index.js";
import {validateSubstructure} from "../struct/index.js";

function string(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(path + ": expected a string");
}
function boolean(value: unknown, path: string): void { if (typeof value !== "boolean") throw new TypeError(path + ": expected a boolean"); }
function nonNullFields(value: Record<string, unknown>): void {
  for (const [key, item] of Object.entries(value)) if (item === null) throw new TypeError(key + ": null is not supported here");
}
function point(value: unknown, path: string): void {
  const p = record(value, path); keys(p, ["x", "y"], path); number(p.x, path + ".x", -Infinity); number(p.y, path + ".y", -Infinity);
}
function annotation(value: unknown): void {
  const a = record(value, "annotation"); keys(a, ["format", "text"], "annotation");
  if (a.format !== "text" && a.format !== "html") throw new TypeError("annotation.format: expected text or html");
  string(a.text, "annotation.text");
}
/** Validates view references and every setting before a document can replace a live graph. */
function view(value: unknown, document: FreshmindDocument): DocumentView {
  const v = record(value, "view"); keys(v, ["focus", "radius", "backlinks", "moveToCenter", "wholeGraph", "maxAddEdgeCount", "maxExpandEdgeCount", "lenses", "canvas"], "view");
  if (v.focus !== undefined) { text(v.focus, "view.focus"); if (!document.graph.findNode(v.focus)) throw new TypeError("view.focus: unknown node " + v.focus); }
  for (const key of ["radius", "maxAddEdgeCount", "maxExpandEdgeCount"]) if (v[key] !== undefined) {
    number(v[key], "view." + key, 0, Number.MAX_SAFE_INTEGER); if (!Number.isSafeInteger(v[key])) throw new TypeError("view." + key + ": expected an integer");
  }
  for (const key of ["backlinks", "moveToCenter", "wholeGraph"]) if (v[key] !== undefined) boolean(v[key], "view." + key);
  if (v.lenses !== undefined) {
    const l = record(v.lenses, "view.lenses"); keys(l, ["zoom", "hyperbolic", "rotation", "pan"], "view.lenses");
    if (l.zoom !== undefined) number(l.zoom, "view.lenses.zoom", .15, 5);
    if (l.hyperbolic !== undefined) number(l.hyperbolic, "view.lenses.hyperbolic", 0, 100);
    if (l.rotation !== undefined) number(l.rotation, "view.lenses.rotation", -Infinity);
    if (l.pan !== undefined) point(l.pan, "view.lenses.pan");
  }
  if (v.canvas !== undefined) {
    const c = record(v.canvas, "view.canvas"); keys(c, ["zoom", "pan"], "view.canvas");
    if (c.zoom !== undefined) number(c.zoom, "view.canvas.zoom", .15, 5);
    if (c.pan !== undefined) point(c.pan, "view.canvas.pan");
  }
  return clone(v) as DocumentView;
}

/** Constructs a detached document from validated transfer data; no live panel or external I/O is involved. */
export function readDocument(value: unknown, options: LoadOptions = {}): FreshmindDocument {
  jsonData(value); const root = record(value, "document");
  nonNullFields(root);
  keys(root, ["format", "version", "title", "types", "typesFile", "nodes", "edges", "substructures", "view", "data", "extensions"], "document");
  if (root.format !== "freshmind" || root.version !== 1) throw new TypeError("Expected format: freshmind and version: 1");
  if (root.types !== undefined && root.typesFile !== undefined) throw new TypeError("types and typesFile are mutually exclusive");
  let configuration: unknown = root.types ?? freshmind2014Configuration;
  if (root.typesFile !== undefined) {
    text(root.typesFile, "typesFile");
    if (!options.resolveTypes) throw new TypeError("Missing companion type file: " + root.typesFile);
    configuration = parseYamlValue(options.resolveTypes(root.typesFile));
  }
  const document = new FreshmindDocument(new TypeRegistry(configuration));
  if (root.title !== undefined) { string(root.title, "title"); document.title = root.title; }
  for (const key of ["data", "extensions"] as const) if (root[key] !== undefined) document[key] = clone(record(root[key], key)) as Metadata;
  if (!Array.isArray(root.nodes) || !Array.isArray(root.edges)) throw new TypeError("nodes and edges must be sequences");
  for (const [index, value] of root.nodes.entries()) {
    const path = "nodes[" + index + "]", n = record(value, path);
    nonNullFields(n);
    keys(n, ["id", "label", "type", "visual", "annotation", "url", "weight", "position", "fixed", "data", "extensions"], path);
    text(n.id, path + ".id"); string(n.label, path + ".label");
    if (n.position !== undefined) point(n.position, path + ".position");
    if (n.fixed !== undefined) boolean(n.fixed, path + ".fixed");
    if (n.annotation !== undefined) annotation(n.annotation);
    const {id, label, ...fields} = n;
    document.graph.addNode(new FreshNode(id, label, fields as FreshNodeOptions));
  }
  for (const [index, value] of root.edges.entries()) {
    const path = "edges[" + index + "]", e = record(value, path);
    nonNullFields(e);
    keys(e, ["id", "from", "to", "label", "type", "visual", "weight", "length", "data", "extensions"], path);
    text(e.id, path + ".id"); text(e.from, path + ".from"); text(e.to, path + ".to");
    const from = document.graph.findNode(e.from), to = document.graph.findNode(e.to);
    if (!from || !to) throw new TypeError(path + ": unknown endpoint");
    const {from: _from, to: _to, ...fields} = e;
    document.graph.addEdge(new FreshEdge(from, to, fields as FreshEdgeOptions));
  }
  if(root.substructures!==undefined) {
    if(!Array.isArray(root.substructures))throw new TypeError("substructures: expected a sequence");
    for(const value of root.substructures) {
      const definition=validateSubstructure(document.graph,value);
      if(document.graph.getSubstructure(definition.id))throw new TypeError(`Duplicate substructure ID: ${definition.id}`);
      document.graph.setSubstructure(definition);
    }
  }
  if (root.view !== undefined) document.view = view(root.view, document);
  const config = document.types.getConfiguration();
  for (const node of document.graph.getNodes()) if (!Object.hasOwn(config.nodeTypes, node.getSemanticType())
    || (node.getVisual().type && !Object.hasOwn(config.nodeVisuals, node.getVisual().type!))) document.types.resolveNode(node);
  for (const edge of document.graph.getEdges()) if (!Object.hasOwn(config.relationTypes, edge.getSemanticType())
    || (edge.getVisual().type && !Object.hasOwn(config.edgeVisuals, edge.getVisual().type!))) document.types.resolveEdge(edge);
  return document;
}

/** Parses native .fm.yaml atomically; required companion contents are supplied by a caller resolver. */
export function parseDocument(source: string, options: LoadOptions = {}): FreshmindDocument {
  return readDocument(parseYamlValue(source), options);
}

/** Snapshots all stored elements in insertion order, independently of the currently visible locality. */
export function documentToRecord(document: FreshmindDocument, options: SaveOptions = {}): DocumentRecord {
  if (options.typesFile !== undefined) text(options.typesFile, "typesFile");
  const result: DocumentRecord = {format: "freshmind", version: 1, title: document.title,
    ...(options.typesFile ? {typesFile: options.typesFile} : {types: document.types.getConfiguration()}),
    nodes: [...document.graph.getNodes()].map(n => ({id: n.getID()!, label: n.getLabel(), type: n.getSemanticType(),
      visual: n.getVisual(), annotation: n.getAnnotation(), url: n.getURL(), weight: n.getWeight(), fixed: n.isFixed(),
      ...((options.includeLayout !== false || n.isFixed()) ? {position: {x: n.x, y: n.y}} : {}), data: n.getData(), extensions: n.getExtensions()})),
    edges: [...document.graph.getEdges()].map(e => ({id: e.getID()!, from: e.from.getID()!, to: e.to.getID()!, label: e.getLabel(),
      type: e.getSemanticType(), visual: e.getVisual(), weight: e.getWeight(), length: e.getLength(), data: e.getData(), extensions: e.getExtensions()})),
    data: clone(document.data), extensions: clone(document.extensions)};
  if(document.graph.getSubstructures().length)result.substructures=document.graph.getSubstructures();
  if (options.includeView !== false && document.view) result.view = clone(document.view);
  return result;
}

/** Writes stable UTF-8 YAML. Layout and view are optional; fixed-node positions are always retained. */
export function serializeDocument(document: FreshmindDocument, options: SaveOptions = {}): string {
  const snapshot = documentToRecord(document, options);
  // Validate the snapshot too: callers can have changed document metadata or view directly.
  const {typesFile: _typesFile, ...embedded} = snapshot;
  readDocument({...embedded, types: document.types.getConfiguration()});
  return stringify(snapshot, {lineWidth: 0, aliasDuplicateObjects: false, compat: "yaml-1.1"});
}
