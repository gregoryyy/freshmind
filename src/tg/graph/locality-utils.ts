/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import {GESUtils} from "./traversal.js";
import type {Locality} from "./locality.js";
import type { Node } from "../model/index.js";

export interface LocalityHost {
  stopDamper(): void;
  resetDamper(): void;
  repaint(): void;
  getSelect(): Node | null;
  clearSelect(): void;
  localityChanged?(): void;
}

/** Java's locality animation threads become serialized, awaitable browser operations. */
export class LocalityUtils {
  static readonly INFINITE_LOCALITY_RADIUS = 2147483647;
  private pending: Promise<void> = Promise.resolve();
  private finishWait: (() => void) | undefined;
  private fastFinish = false;
  private finishGeneration = 0;
  private disposed = false;

  constructor(private readonly locality: Locality, private readonly host: LocalityHost, private readonly animate = true) {}
  /** Skips remaining animation delays for current/already queued work without canceling mutations. */
  fastFinishAnimation(): void { this.finishGeneration++; this.fastFinish = true; this.finishWait?.(); }
  /** Resolves when operations queued so far have settled; individual calls retain their errors. */
  whenIdle(): Promise<void> { return this.pending; }
  /** Prevents further queued mutations, releases a pending delay and clears animation flags. */
  dispose(): void { this.disposed = true; this.fastFinishAnimation(); this.unmarkNewAdditions(); }
  private wait(milliseconds: number): Promise<void> {
    if (!this.animate || this.fastFinish || this.disposed) return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => { clearTimeout(timer); this.finishWait = undefined; resolve(); };
      const timer = setTimeout(finish, milliseconds);
      this.finishWait = finish;
    });
  }
  /**
   * Serializes locality changes and accelerates earlier animation before starting new work.
   * Cleanup restores flags/damping; a rejected operation does not poison the queue.
   */
  private enqueue(operation: () => Promise<void>): Promise<void> {
    this.fastFinishAnimation();
    const generation = this.finishGeneration;
    const next = this.pending.then(async () => {
      if (this.disposed) return;
      this.fastFinish = generation !== this.finishGeneration;
      try { await operation(); }
      finally {
        this.unmarkNewAdditions();
        if (!this.disposed) { this.host.localityChanged?.(); this.host.resetDamper(); this.host.repaint(); }
      }
    });
    this.pending = next.catch(() => {});
    return next;
  }
  private unmarkNewAdditions(): void {
    this.locality.forAllNodes(node => { node.justMadeLocal = false; node.markedForRemoval = false; });
  }
  private markDistantNodes(keep: ReadonlySet<Node>): boolean {
    let marked = false;
    this.locality.forAllNodes(node => {
      if (!keep.has(node)) { node.markedForRemoval = true; marked = true; }
    });
    this.host.repaint();
    return marked;
  }
  private removeMarkedNodes(): void {
    for (const node of [...this.locality.getNodes()]) {
      if (node.markedForRemoval) { this.locality.removeNode(node); node.markedForRemoval = false; }
    }
    this.host.repaint();
  }
  addAllGraphElts(): void { this.locality.addAll(); this.host.repaint(); }
  /**
   * Replaces the visible neighborhood while retaining the complete graph and positions.
   * Negative radius, null focus or a focus absent from the complete graph is a no-op.
   * @param radius Inclusive hop radius; INFINITE_LOCALITY_RADIUS reveals the entire graph.
   * @param maxAddEdgeCount Maximum neighbor degree allowed into the neighborhood.
   * @param maxExpandEdgeCount Maximum discovered-node degree allowed to expand the BFS.
   * @param unidirectional Whether traversal follows outgoing edges only.
   * @returns Completion of the queued visibility update and any enabled animation.
   */
  setLocale(node: Node | null, radius: number, maxAddEdgeCount = 1000, maxExpandEdgeCount = 1000,
    unidirectional = false): Promise<void> {
    if (!node || radius < 0) return Promise.resolve();
    return this.enqueue(async () => {
      if (!this.locality.getCompleteEltSet().contains(node)) return;
      if (radius === LocalityUtils.INFINITE_LOCALITY_RADIUS) { this.addAllGraphElts(); return; }
      this.host.stopDamper();
      const distances = GESUtils.calculateDistances(this.locality.getCompleteEltSet(), node, radius,
        maxAddEdgeCount, maxExpandEdgeCount, unidirectional);
      if (this.markDistantNodes(new Set(distances.keys()))) await this.wait(500);
      if (this.disposed) return;
      this.removeMarkedNodes();
      await this.wait(100);
      // Map iteration is BFS order; the original Hashtable did not specify tie ordering.
      for (const member of distances.keys()) {
        if (this.disposed) return;
        if (!this.locality.getCompleteEltSet().contains(member)) continue;
        if (!this.locality.contains(member)) {
          member.justMadeLocal = true;
          this.locality.addNodeWithEdges(member);
          this.host.repaint();
          await this.wait(50);
        }
      }
      await this.wait(400);
    });
  }
  /** Reveals a visible node's immediate neighbors and edges, without changing physical positions. */
  expandNode(node: Node): Promise<void> {
    return this.enqueue(async () => {
      if (!this.locality.contains(node)) return;
      this.host.stopDamper();
      for (const edge of node.getEdges()) {
        if (this.disposed) return;
        const neighbor = edge.getOtherEndpt(node);
        if (!this.locality.contains(neighbor)) {
          neighbor.justMadeLocal = true;
          this.locality.addNodeWithEdges(neighbor);
          this.host.repaint();
          await this.wait(50);
        } else if (!this.locality.contains(edge)) { this.locality.addEdge(edge); }
      }
      await this.wait(200);
    });
  }
  /** Hides the node and prunes the remaining view to its largest connected component. */
  hideNode(node: Node | null): Promise<void> { return this.prune(node, false); }
  /** Keeps the node but prunes branches outside the largest component formed without it. */
  collapseNode(node: Node | null): Promise<void> { return this.prune(node, true); }
  private prune(node: Node | null, keepNode: boolean): Promise<void> {
    if (!node) return Promise.resolve();
    return this.enqueue(async () => {
      if (!this.locality.contains(node)) return;
      this.locality.removeNode(node);
      if (!keepNode && this.host.getSelect() === node) this.host.clearSelect();
      this.markDistantNodes(GESUtils.getLargestConnectedSubgraph(this.locality));
      if (keepNode) this.locality.addNodeWithEdges(node);
      this.host.repaint();
      await this.wait(200);
      if (!this.disposed) this.removeMarkedNodes();
    });
  }
}
