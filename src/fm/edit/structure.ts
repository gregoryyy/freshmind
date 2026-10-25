/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import {FreshNode, FreshEdge, FreshGraph} from "../model/index.js";
import type {FreshNodeOptions} from "../model/index.js";

export interface CreationDefaults {nodeType: string; relationType: string;}
export interface LinkedCreation {node: FreshNode; edge: FreshEdge;}
function unusedId(graph: FreshGraph, node: boolean): string {
  const ids = new Set([...(node ? graph.getNodes() : graph.getEdges())].map(item => item.getID()));
  const prefix = node ? "n" : "e";
  let i = 1; while (ids.has(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}
function member(graph: FreshGraph, node: FreshNode): void {
  if (!(node instanceof FreshNode) || !graph.contains(node)) throw new Error("Choose a node from the current graph");
}
function commit(graph: FreshGraph, node: FreshNode, edge: FreshEdge): LinkedCreation {
  graph.addNode(node);
  try {graph.addEdge(edge);} catch (error) {graph.deleteNode(node); throw error;}
  return {node, edge};
}
/** All drafts validate before mutation. Uses the active FM2014 source's endpoint order and labels. */
export function createLinkedNode(graph: FreshGraph, selected: FreshNode, defaults: CreationDefaults,
  reverse = false, sibling = false): LinkedCreation {
  member(graph, selected);
  let anchor = selected;
  if (sibling) {
    const edges = [...selected.getEdges()];
    if (edges.length !== 1) throw new Error("Sibling creation requires exactly one incident edge in the complete graph");
    anchor = edges[0].getOtherEndpt(selected) as FreshNode;
    member(graph, anchor);
    if (anchor === selected) throw new Error("A self-loop cannot identify a sibling anchor");
  }
  const node = new FreshNode(unusedId(graph, true), reverse ? "[new parent]" : "[new]",
    {type: defaults.nodeType, position: {x: anchor.x + 45, y: anchor.y + 30}});
  const edge = new FreshEdge(reverse ? anchor : node, reverse ? node : anchor,
    {id: unusedId(graph, false), type: defaults.relationType, label: reverse ? "super" : "sub"});
  return commit(graph, node, edge);
}
/** Explicit structural linking rejects self-links and duplicate directed relations, including hidden ones. */
export function linkNodes(graph: FreshGraph, from: FreshNode, to: FreshNode, relationType: string, label = "[child of]"): FreshEdge {
  member(graph, from); member(graph, to);
  if (from === to) throw new Error("Choose two different nodes to link");
  if ([...from.getEdges()].some(edge => edge.from === from && edge.to === to)) throw new Error("These nodes already have a relation in that direction");
  const edge = new FreshEdge(from, to, {id: unusedId(graph, false), type: relationType, label});
  graph.addEdge(edge); return edge;
}
/** A local, explicit node snapshot; never reads or writes the platform clipboard. */
export class GraphClipboard {
  private copied?: {graph: WeakRef<FreshGraph>; source: WeakRef<FreshNode>; label: string; fields: FreshNodeOptions};
  clear(): void {this.copied = undefined;}
  copy(graph: FreshGraph, source: FreshNode): void {
    member(graph, source);
    this.copied = {graph: new WeakRef(graph), source: new WeakRef(source), label: source.getLabel(), fields: {type: source.getSemanticType(), visual: source.getVisual(),
      annotation: source.getAnnotation(), url: source.getURL(), weight: source.getWeight(), fixed: source.isFixed(),
      data: source.getData(), extensions: source.getExtensions()}};
  }
  /** Clone the copied unary data, even across documents or after source deletion; positions/IDs are new. */
  paste(graph: FreshGraph, anchor: FreshNode, relationType: string): LinkedCreation {
    member(graph, anchor);
    if (!this.copied) throw new Error("Copy a content node first");
    const node = new FreshNode(unusedId(graph, true), this.copied.label,
      {...this.copied.fields, position: {x: anchor.x + 45, y: anchor.y + 30}});
    const edge = new FreshEdge(anchor, node, {id: unusedId(graph, false), type: relationType, label: "[child of]"});
    return commit(graph, node, edge);
  }
  /** Reuse identity only inside the original live graph; never import a node with a reused ID. */
  link(graph: FreshGraph, anchor: FreshNode, relationType: string): FreshEdge {
    const source = this.copied?.source.deref();
    if (!this.copied || this.copied.graph.deref() !== graph || !source || !graph.contains(source))
      throw new Error("Copied source is stale or belongs to another document; paste a clone instead");
    return linkNodes(graph, anchor, source, relationType);
  }
}
