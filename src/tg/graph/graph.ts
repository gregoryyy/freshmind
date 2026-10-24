/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import {Node,Edge} from "../model/index.js";
import {TGException} from "./error.js";
import type {TGForEachNode,TGForEachEdge,TGForEachNodePair} from "./types.js";

/**
 * Graph membership with insertion-ordered traversal and shared node/edge references.
 * Order preserves Java force accumulation; locality subsets leave adjacency ownership
 * to the complete graph so hiding an element cannot erase stored relationships.
 */
export class GraphEltSet {
  protected nodes: Node[] = [];
  protected edges: Edge[] = [];
  /** @param ownsAdjacency Whether insertion/deletion updates endpoint adjacency lists. */
  constructor(protected readonly ownsAdjacency = true) {}

  nodeCount(): number { return this.nodes.length; }
  edgeCount(): number { return this.edges.length; }
  nodeNum(): number { return this.nodeCount(); }
  edgeNum(): number { return this.edgeCount(); }
  nodeAt(index: number): Node {
    const node = this.nodes[index];
    if (!node) throw new RangeError(`No node at index ${index}`);
    return node;
  }
  edgeAt(index: number): Edge {
    const edge = this.edges[index];
    if (!edge) throw new RangeError(`No edge at index ${index}`);
    return edge;
  }
  /** Returns a live iterator over insertion order; snapshot it before destructive iteration. */
  getNodes(): IterableIterator<Node> { return this.nodes.values(); }
  /** Returns a live iterator over insertion order; snapshot it before destructive iteration. */
  getEdges(): IterableIterator<Edge> { return this.edges.values(); }
  getFirstNode(): Node | null { return this.nodes[0] ?? null; }
  getRandomNode(): Node | null { return this.nodes[Math.trunc(Math.random() * this.nodes.length)] ?? null; }
  contains(element: Node | Edge): boolean {
    return element instanceof Node ? this.nodes.includes(element) : this.edges.includes(element);
  }
  findNode(id: string | null): Node | null {
    return id === null ? null : this.nodes.find(node => node.getID() === id) ?? null;
  }
  findNodesByLabel(label: string): Node[] { return this.nodes.filter(node => node.getLabel() === label); }
  /** Prefers an exact case-insensitive label match, then the first substring match. */
  findNodeLabelContaining(substring: string): Node | null {
    const query = substring.toLowerCase();
    return this.nodes.find(node => node.getLabel().toLowerCase() === query)
      ?? this.nodes.find(node => node.getLabel().toLowerCase().includes(query)) ?? null;
  }
  /** Returns the first directed match; parallel edges remain separate graph members. */
  findEdge(from: Node, to: Node): Edge | null {
    return this.edges.find(edge => edge.from === from && edge.to === to) ?? null;
  }
  /**
   * Inserts a node, assigning an unused label-derived ID when its ID is null.
   * @throws {TGException} If an existing member already has the explicit ID.
   */
  addNode(node: Node): void {
    let id = node.getID();
    if (id !== null && this.findNode(id)) throw new TGException(TGException.NODE_EXISTS, `node ID '${id}' already exists.`);
    if (id === null) {
      const label = node.getLabel().trim();
      id = label;
      if (!id || this.findNode(id)) {
        let suffix = 1;
        while (this.findNode(`${label}-${suffix}`)) suffix++;
        id = `${label}-${suffix}`;
      }
      node.setID(id);
    }
    this.nodes.push(node);
  }
  /**
   * Inserts or creates an edge; inserting the same object again has no effect.
   * Parallel edges and self-loops are permitted. A loop has two adjacency entries.
   * @throws {Error} If either endpoint is absent from this graph.
   */
  addEdge(edge: Edge): Edge;
  addEdge(from: Node, to: Node, length?: number): Edge;
  addEdge(edgeOrFrom: Edge | Node, to?: Node, length?: number): Edge {
    const edge = edgeOrFrom instanceof Edge ? edgeOrFrom : new Edge(edgeOrFrom, to!, length);
    if (!this.contains(edge.from) || !this.contains(edge.to)) throw new Error("Both edge endpoints must belong to the graph");
    if (!this.contains(edge)) {
      this.edges.push(edge);
      if (this.ownsAdjacency) { edge.from.addEdge(edge); edge.to.addEdge(edge); }
    }
    return edge;
  }
  /** Removes an edge and owned adjacency; endpoint lookup deletes the first directed match. */
  deleteEdge(edge: Edge | null): boolean;
  deleteEdge(from: Node, to: Node): boolean;
  deleteEdge(edgeOrFrom: Edge | Node | null, to?: Node): boolean {
    const edge = edgeOrFrom instanceof Node ? (to ? this.findEdge(edgeOrFrom, to) : null) : edgeOrFrom;
    const index = edge ? this.edges.indexOf(edge) : -1;
    if (!edge || index < 0) return false;
    this.edges.splice(index, 1);
    if (this.ownsAdjacency) { edge.from.removeEdge(edge); edge.to.removeEdge(edge); }
    return true;
  }
  deleteEdges(edges: Iterable<Edge>): void { for (const edge of [...edges]) this.deleteEdge(edge); }
  deleteNodes(nodes: Iterable<Node>): void { for (const node of [...nodes]) this.deleteNode(node); }
  /** Removes a node and all incident graph edges; returns false if the node is absent. */
  deleteNode(node: Node | null): boolean {
    const index = node ? this.nodes.indexOf(node) : -1;
    if (!node || index < 0) return false;
    for (const edge of [...this.edges]) if (edge.from === node || edge.to === node) this.deleteEdge(edge);
    this.nodes.splice(index, 1);
    return true;
  }
  clearAll(): void {
    for (const edge of [...this.edges]) this.deleteEdge(edge);
    this.nodes.length = 0;
  }
  forAllNodes(visitor: TGForEachNode): void {
    for (const node of this.nodes) typeof visitor === "function" ? visitor(node) : visitor.forEachNode(node);
  }
  forAllEdges(visitor: TGForEachEdge): void {
    for (const edge of this.edges) typeof visitor === "function" ? visitor(edge) : visitor.forEachEdge(edge);
  }
  /** Visits each unordered pair once in insertion order, with optional Java visitor hooks. */
  forAllNodePairs(visitor: TGForEachNodePair): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (typeof visitor !== "function") visitor.beforeInnerLoop?.(node);
      for (let j = i + 1; j < this.nodes.length; j++) {
        typeof visitor === "function" ? visitor(node, this.nodes[j]) : visitor.forEachNodePair(node, this.nodes[j]);
      }
      if (typeof visitor !== "function") visitor.afterInnerLoop?.(node);
    }
  }
}
