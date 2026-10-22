/*
 * TouchGraph LLC. Apache-Style Software License
 *
 *
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
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

import { GESUtils, Locality } from "./graph.js";
import type { Node } from "./model.js";

export interface LocalityHost {
  stopDamper(): void;
  resetDamper(): void;
  repaint(): void;
  getSelect(): Node | null;
  clearSelect(): void;
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
  fastFinishAnimation(): void { this.finishGeneration++; this.fastFinish = true; this.finishWait?.(); }
  whenIdle(): Promise<void> { return this.pending; }
  dispose(): void { this.disposed = true; this.fastFinishAnimation(); this.unmarkNewAdditions(); }
  private wait(milliseconds: number): Promise<void> {
    if (!this.animate || this.fastFinish || this.disposed) return Promise.resolve();
    return new Promise(resolve => {
      const finish = () => { clearTimeout(timer); this.finishWait = undefined; resolve(); };
      const timer = setTimeout(finish, milliseconds);
      this.finishWait = finish;
    });
  }
  private enqueue(operation: () => Promise<void>): Promise<void> {
    this.fastFinishAnimation();
    const generation = this.finishGeneration;
    const next = this.pending.then(async () => {
      if (this.disposed) return;
      this.fastFinish = generation !== this.finishGeneration;
      try { await operation(); }
      finally {
        this.unmarkNewAdditions();
        if (!this.disposed) { this.host.resetDamper(); this.host.repaint(); }
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
  hideNode(node: Node | null): Promise<void> { return this.prune(node, false); }
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
