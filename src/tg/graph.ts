/*
 * TouchGraph LLC. Apache-Style Software License
 *
 *
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 Typescript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *
 * 3. The end-user documentation included with the redistribution,
 *    if any, must include the following acknowledgment:
 *       "This product includes software developed by
 *        TouchGraph LLC (http://www.touchgraph.com/)."
 *    Alternately, this acknowledgment may appear in the software itself,
 *    if and wherever such third-party acknowledgments normally appear.
 *
 * 4. The names "TouchGraph" or "TouchGraph LLC" must not be used to endorse
 *    or promote products derived from this software without prior written
 *    permission.  For written permission, please contact
 *    alex@touchgraph.com
 *
 * 5. Products derived from this software may not be called "TouchGraph",
 *    nor may "TouchGraph" appear in their name, without prior written
 *    permission of alex@touchgraph.com.
 *
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL TOUCHGRAPH OR ITS CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
 * BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * ====================================================================
 *
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import { Edge, Node } from "./model.js";

export type TGForEachNode = ((node: Node) => void) | { forEachNode(node: Node): void };
export type TGForEachEdge = ((edge: Edge) => void) | { forEachEdge(edge: Edge): void };
export type TGForEachNodePair = ((first: Node, second: Node) => void) | {
  forEachNodePair(first: Node, second: Node): void;
  beforeInnerLoop?(node: Node): void;
  afterInnerLoop?(node: Node): void;
};

export class TGException extends Error {
  static readonly NODE_EXISTS = 1;
  static readonly NODE_DOESNT_EXIST = 2;
  static readonly NODE_NO_ID = 3;
  readonly type: number;
  readonly exception: Error | null;
  constructor(typeOrMessage: number | string | Error, message = "") {
    super(typeof typeOrMessage === "string" ? typeOrMessage : message,
      typeOrMessage instanceof Error ? { cause: typeOrMessage } : undefined);
    this.name = "TGException";
    this.type = typeof typeOrMessage === "number" ? typeOrMessage : -1;
    this.exception = typeOrMessage instanceof Error ? typeOrMessage : null;
  }
  getId(): number { return this.type; }
}

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

/** Read-only membership/traversal contract; node coordinates remain mutable, as in Java. */
export type ImmutableGraphEltSet = Pick<GraphEltSet,
  "nodeCount" | "nodeNum" | "edgeCount" | "edgeNum" | "nodeAt" | "edgeAt" | "getNodes" | "getEdges"
  | "getFirstNode" | "getRandomNode" | "contains" | "findNode" | "findNodesByLabel" | "findNodeLabelContaining"
  | "findEdge" | "forAllNodes" | "forAllEdges" | "forAllNodePairs">;

/** Visibility is a subset; removing from it never deletes the stored graph. */
export class Locality extends GraphEltSet {
  constructor(private readonly completeEltSet: GraphEltSet) { super(false); }
  getCompleteEltSet(): GraphEltSet { return this.completeEltSet; }
  override addNode(node: Node): void {
    if (this.contains(node)) return;
    if (!this.completeEltSet.contains(node)) this.completeEltSet.addNode(node);
    super.addNode(node);
    node.setVisible(true);
  }
  override addEdge(edge: Edge): Edge;
  override addEdge(from: Node, to: Node, length?: number): Edge;
  override addEdge(edgeOrFrom: Edge | Node, to?: Node, length?: number): Edge {
    const edge = edgeOrFrom instanceof Edge ? edgeOrFrom : new Edge(edgeOrFrom, to!, length);
    if (!this.contains(edge.from) || !this.contains(edge.to)) throw new Error("Both endpoints must be visible");
    if (!this.completeEltSet.contains(edge)) this.completeEltSet.addEdge(edge);
    if (!this.contains(edge)) {
      super.addEdge(edge);
      edge.from.visibleEdgeCnt++;
      edge.to.visibleEdgeCnt++;
      edge.setVisible(true);
    }
    return edge;
  }
  addNodeWithEdges(node: Node): void {
    this.addNode(node);
    for (const edge of node.getEdges()) if (this.contains(edge.getOtherEndpt(node))) this.addEdge(edge);
  }
  addAll(): void {
    for (const node of this.completeEltSet.getNodes()) this.addNode(node);
    for (const edge of this.completeEltSet.getEdges()) this.addEdge(edge);
  }
  /** Hides an edge and adjusts visible incidence counts without touching complete adjacency. */
  removeEdge(edge: Edge | null): boolean {
    if (!edge || !super.deleteEdge(edge)) return false;
    edge.from.visibleEdgeCnt--;
    edge.to.visibleEdgeCnt--;
    edge.setVisible(false);
    return true;
  }
  /** Hides a node and its visible incident edges, preserving the stored graph and coordinates. */
  removeNode(node: Node | null): boolean {
    if (!node || !this.contains(node)) return false;
    for (const edge of [...this.edges]) if (edge.from === node || edge.to === node) this.removeEdge(edge);
    this.nodes.splice(this.nodes.indexOf(node), 1);
    node.setVisible(false);
    return true;
  }
  /** Hides an edge and deletes it from the complete graph, including when already hidden. */
  override deleteEdge(edge: Edge | null): boolean;
  override deleteEdge(from: Node, to: Node): boolean;
  override deleteEdge(edgeOrFrom: Edge | Node | null, to?: Node): boolean {
    const edge = edgeOrFrom instanceof Node ? (to ? this.completeEltSet.findEdge(edgeOrFrom, to) : null) : edgeOrFrom;
    this.removeEdge(edge);
    return this.completeEltSet.deleteEdge(edge);
  }
  override deleteNode(node: Node | null): boolean { this.removeNode(node); return this.completeEltSet.deleteNode(node); }
  removeEdges(edges: Iterable<Edge>): void { for (const edge of [...edges]) this.removeEdge(edge); }
  removeNodes(nodes: Iterable<Node>): void { for (const node of [...nodes]) this.removeNode(node); }
  removeAll(): void { for (const node of [...this.nodes]) this.removeNode(node); }
  override clearAll(): void { this.removeAll(); this.completeEltSet.clearAll(); }
}

/** Reconcile externally edited flags without destroying the complete graph. */
export class VisibleLocality extends Locality {
  /** Reconciles shared visibility flags with membership; edges require both endpoints visible. */
  updateLocalityFromVisibility(): void {
    const complete = this.getCompleteEltSet();
    for (const edge of [...this.edges]) if (!complete.contains(edge)) this.removeEdge(edge);
    for (const node of [...this.nodes]) if (!complete.contains(node)) this.removeNode(node);
    for (const node of complete.getNodes()) {
      if (node.isVisible()) this.addNode(node);
      else this.removeNode(node);
    }
    for (const edge of complete.getEdges()) {
      if (edge.isVisible() && this.contains(edge.from) && this.contains(edge.to)) this.addEdge(edge);
      else { this.removeEdge(edge); edge.setVisible(false); }
    }
  }
}

export class GESUtils {
  /**
   * Computes hop distances by breadth-first traversal, always including focus at distance zero.
   * The graph limits traversable edges; degree limits use complete endpoint adjacency.
   * @param radius Maximum included hop distance.
   * @param maxAddEdgeCount Maximum degree of a newly discovered node to include it.
   * @param maxExpandEdgeCount Maximum degree of a discovered node to traverse onward from it.
   * @param unidirectional Follow outgoing edges only when true.
   * @returns Distances in stable discovery order, used by locality animation.
   */
  static calculateDistances(graph: ImmutableGraphEltSet, focus: Node, radius: number, maxAddEdgeCount = 1000,
    maxExpandEdgeCount = 1000, unidirectional = false): Map<Node, number> {
    const distances = new Map<Node, number>([[focus, 0]]);
    const queue = [focus];
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      const distance = distances.get(node)!;
      if (distance >= radius) break;
      for (const edge of node.getEdges()) {
        if (unidirectional && edge.from !== node) continue;
        const adjacent = edge.getOtherEndpt(node);
        if (graph.contains(edge) && !distances.has(adjacent) && adjacent.edgeCount() <= maxAddEdgeCount) {
          distances.set(adjacent, distance + 1);
          if (adjacent.edgeCount() <= maxExpandEdgeCount) queue.push(adjacent);
        }
      }
    }
    return distances;
  }
  /** Returns the largest undirected component; equal sizes retain the first discovered one. */
  static getLargestConnectedSubgraph(graph: ImmutableGraphEltSet): Set<Node> {
    const visited = new Set<Node>();
    let largest = new Set<Node>();
    for (const node of graph.getNodes()) {
      if (visited.has(node)) continue;
      const component = new Set(this.calculateDistances(graph, node, Number.MAX_SAFE_INTEGER).keys());
      for (const member of component) visited.add(member);
      if (component.size > largest.size) largest = component;
    }
    return largest;
  }
}
