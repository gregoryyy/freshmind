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
import {GraphEltSet} from "./graph.js";

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
