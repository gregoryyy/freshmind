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

import type { ImmutableGraphEltSet } from "./graph.js";
import type { Node } from "./model.js";

export interface LayoutHost {
  getGES(): ImmutableGraphEltSet;
  repaintAfterMove(): void;
}

/** Direct port of TGLayout 1.21, including Java integer repulsion arithmetic. */
export class TGLayout {
  private damper = 0;
  private maxMotion = 0;
  private lastMaxMotion = 0;
  private motionRatio = 0;
  private damping = true;
  private rigidity = 1;
  private newRigidity = 1;
  private dragNode: Node | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private generation = 0;

  /**
   * Creates a stopped layout with a zero damper.
   * @param panel Supplies the currently simulated graph and a repaint callback.
   * @param random Random source used only to separate coincident nodes.
   */
  constructor(private readonly panel: LayoutHost, private readonly random: () => number = Math.random) {}
  /** Queues a rigidity change for the end of the next ten-step relax batch. */
  setRigidity(value: number): void { this.newRigidity = value; }
  /** Excludes this node from position integration while still accumulating forces. */
  setDragNode(node: Node | null): void { this.dragNode = node; }
  /** Resumes adaptive damping at its current value; use resetDamper to wake a settled graph. */
  startDamper(): void { this.damping = true; }
  /** Disables adaptive damping and restores full motion until damping is re-enabled. */
  stopDamper(): void { this.damping = false; this.damper = 1; }
  /** Wakes the graph at full motion and allows it to settle through adaptive damping. */
  resetDamper(): void { this.damping = true; this.damper = 1; }
  /** Reduces the damper to at most 0.3, or zero when it is already at or below 0.3. */
  stopMotion(): void { this.damping = true; this.damper = this.damper > 0.3 ? 0.3 : 0; }
  getState(): Readonly<{ damper: number; maxMotion: number; lastMaxMotion: number; motionRatio: number; damping: boolean; rigidity: number }> {
    return { damper: this.damper, maxMotion: this.maxMotion, lastMaxMotion: this.lastMaxMotion,
      motionRatio: this.motionRatio, damping: this.damping, rigidity: this.rigidity };
  }

  /** Accumulates Java rubber-band attraction, reducing disturbance of established nodes. */
  private relaxEdges(): void {
    this.panel.getGES().forAllEdges(edge => {
      const vx = edge.to.x - edge.from.x;
      const vy = edge.to.y - edge.from.y;
      const length = Math.sqrt(vx * vx + vy * vy);
      const dx = vx * this.rigidity / (edge.getLength() * 100);
      const dy = vy * this.rigidity / (edge.getLength() * 100);
      const toScale = edge.to.justMadeLocal || !edge.from.justMadeLocal ? 1 : 10;
      const fromScale = edge.from.justMadeLocal || !edge.to.justMadeLocal ? 1 : 10;
      edge.to.dx -= dx * length / toScale;
      edge.to.dy -= dy * length / toScale;
      edge.from.dx += dx * length / fromScale;
      edge.from.dy += dy * length / fromScale;
    });
  }

  /** Applies point repulsion below radius 600; despite its name, this is not label collision. */
  private avoidLabels(): void {
    this.panel.getGES().forAllNodePairs((first, second) => {
      let dx = 0;
      let dy = 0;
      const vx = first.x - second.x;
      const vy = first.y - second.y;
      const lengthSquared = vx * vx + vy * vy;
      if (lengthSquared === 0) { dx = this.random(); dy = this.random(); }
      else if (lengthSquared < 600 * 600) { dx = vx / lengthSquared; dy = vy / lengthSquared; }
      // Java multiplies as signed int32, then divides with truncation toward zero.
      const repulsion = Math.trunc(Math.imul(first.repulsion, second.repulsion) / 100);
      const firstScale = first.justMadeLocal || !second.justMadeLocal ? 1 : 10;
      const secondScale = second.justMadeLocal || !first.justMadeLocal ? 1 : 10;
      first.dx += dx * repulsion * this.rigidity / firstScale;
      first.dy += dy * repulsion * this.rigidity / firstScale;
      second.dx -= dx * repulsion * this.rigidity / secondScale;
      second.dy -= dy * repulsion * this.rigidity / secondScale;
    });
  }

  /** Updates adaptive damping from maximum motion and its change since the previous step. */
  damp(): void {
    if (this.damping && this.motionRatio <= 0.001) {
      if ((this.maxMotion < 0.2 || (this.maxMotion > 1 && this.damper < 0.9)) && this.damper > 0.01) this.damper -= 0.01;
      else if (this.maxMotion < 0.4 && this.damper > 0.003) this.damper -= 0.003;
      else if (this.damper > 0.0001) this.damper -= 0.0001;
    }
    if (this.maxMotion < 0.001 && this.damping) this.damper = 0;
  }

  /** Damps/halves momentum, clamps displacement per axis, and leaves fixed/dragged positions intact. */
  private moveNodes(): void {
    this.lastMaxMotion = this.maxMotion;
    let maxMotion = 0;
    this.panel.getGES().forAllNodes(node => {
      const dx = node.dx * this.damper;
      const dy = node.dy * this.damper;
      node.dx = dx / 2;
      node.dy = dy / 2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (!node.fixed && node !== this.dragNode) {
        node.x += Math.max(-30, Math.min(30, dx));
        node.y += Math.max(-30, Math.min(30, dy));
      }
      maxMotion = Math.max(distance, maxMotion);
    });
    this.maxMotion = maxMotion;
    this.motionRatio = maxMotion > 0 ? this.lastMaxMotion / maxMotion - 1 : 0;
    this.damp();
  }

  /**
   * Runs one original Java relax batch: ten force/integration steps, then rigidity update.
   * Repaints once after the batch, even when all motion is damped to zero.
   */
  relax(): void {
    for (let i = 0; i < 10; i++) { this.relaxEdges(); this.avoidLabels(); this.moveNodes(); }
    this.rigidity = this.newRigidity;
    this.panel.repaintAfterMove();
  }
  /**
   * Runs batches synchronously without starting a timer.
   * @param batches Number of ten-step batches; use a nonnegative integer.
   * @remarks Repeatability requires fixed initial coordinates and a controlled random source.
   */
  tick(batches = 1): void { for (let i = 0; i < batches; i++) this.relax(); }
  /**
   * Starts an idempotent event-loop runner, yielding before its first relax batch.
   * Settled graphs remain scheduled at a lower frequency so damper resets can wake them.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    const generation = ++this.generation;
    let first = true;
    const run = () => {
      if (!this.running || generation !== this.generation) return;
      if (first || !(this.damper < 0.1 && this.damping && this.maxMotion < 0.001)) { first = false; this.relax(); }
      if (!this.running || generation !== this.generation) return;
      this.timer = setTimeout(run, this.damper < 0.1 && this.damping && this.maxMotion < 0.001 ? 100 : 20);
    };
    // Unlike a Java thread, scheduling yields to the caller before the first batch.
    this.timer = setTimeout(run, 0);
  }
  /** Cancels scheduling, including callbacks invalidated by a stop/restart during repaint. */
  stop(): void { this.running = false; this.generation++; clearTimeout(this.timer); this.timer = undefined; }
}
