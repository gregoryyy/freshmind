/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import type {Node} from "../model/index.js";
import type {LayoutHost,LayoutForce} from "./types.js";
import {MotionStabilizer} from "./stabilization.js";
import {NodeMotionStabilizer} from "./node-stabilization.js";
import type {MotionStabilizationOptions,MotionStabilizationState} from "./stabilization.js";

export type AdaptiveDampingResponse="impulse"|"cooling";
export interface LayoutAdaptiveDampingOptions extends MotionStabilizationOptions {
  response?:AdaptiveDampingResponse;
  /** Independent node gains by default; graph scope preserves the earlier experiment. */
  scope?:"node"|"graph";
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
  private readonly forces = new Map<symbol, LayoutForce>();
  private readonly adaptiveDamping:MotionStabilizer;
  private adaptiveDampingResponse:AdaptiveDampingResponse;

  /**
   * Creates a stopped layout with a zero damper.
   * @param panel Supplies the currently simulated graph and a repaint callback.
   * @param random Random source used only to separate coincident nodes.
   */
  constructor(private readonly panel: LayoutHost, private readonly random: () => number = Math.random, adaptiveDamping:LayoutAdaptiveDampingOptions={}) {
    this.adaptiveDampingResponse=this.validateResponse(adaptiveDamping.response??"impulse");
    if(adaptiveDamping.scope!==undefined&&adaptiveDamping.scope!=="node"&&adaptiveDamping.scope!=="graph")throw new TypeError("adaptiveDamping.scope must be node or graph");
    this.adaptiveDamping=adaptiveDamping.scope==="graph"?new MotionStabilizer(adaptiveDamping):new NodeMotionStabilizer(adaptiveDamping);
  }
  private validateResponse(response:AdaptiveDampingResponse):AdaptiveDampingResponse {
    if(response!=="impulse"&&response!=="cooling")throw new TypeError("adaptiveDamping.response must be impulse or cooling");
    return response;
  }
  getAdaptiveDampingResponse():AdaptiveDampingResponse {return this.adaptiveDampingResponse;}
  /** Chooses impulse attenuation or an earlier handoff to TouchGraph's existing fast cooling phase. */
  setAdaptiveDampingResponse(response:AdaptiveDampingResponse):void {
    this.validateResponse(response);if(response===this.adaptiveDampingResponse)return;
    this.adaptiveDampingResponse=response;this.resetAdaptiveDamping();this.resetDamper();this.panel.repaintAfterMove();
  }
  /** Detached diagnostics for optional damping of every movable visible node, independent of RFC. */
  getAdaptiveDampingState():MotionStabilizationState {return this.adaptiveDamping.getState();}
  /** Toggles extra oscillation suppression without changing legacy force strengths or cooling. */
  setAdaptiveDampingEnabled(enabled:boolean):void {
    if(enabled===this.adaptiveDamping.getState().enabled)return;
    this.adaptiveDamping.setEnabled(enabled);this.resetDamper();this.panel.repaintAfterMove();
  }
  /** Discards learned damping when a document is cleared/replaced, retaining the user's preference. */
  resetAdaptiveDamping():void {this.adaptiveDamping.reset();}
  /** Registers an optional force without replacing baseline physics. The returned disposer removes this registration. */
  addForce(force: LayoutForce): () => void {
    const registration = Symbol();
    this.forces.set(registration, force);
    return () => { this.forces.delete(registration); };
  }
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
    for (let i = 0; i < 10; i++) {
      this.relaxEdges(); this.avoidLabels();
      for (const force of this.forces.values()) force(this.panel.getGES(), this.rigidity);
      const nodes=[...this.panel.getGES().getNodes()];
      if(this.adaptiveDampingResponse==="impulse")this.adaptiveDamping.apply(nodes,this.dragNode);
      else {
        const before=this.adaptiveDamping.getState().detections;
        this.adaptiveDamping.observe(nodes,this.dragNode);
        // The original rule cools large motion by 0.0001 until d<0.9, then
        // by 0.01. A confirmed cycle can enter that existing phase sooner.
        if(this.damping&&this.adaptiveDamping.getState().detections>before)this.damper=Math.min(this.damper,.89);
      }
      this.moveNodes();
    }
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
    const needsTicks = () => this.adaptiveDampingResponse==="impulse"&&this.adaptiveDamping.getState().phase!=="steady"||[...this.forces.values()].some(force => force.needsTicks?.());
    const run = () => {
      if (!this.running || generation !== this.generation) return;
      if (first || needsTicks() || !(this.damper < 0.1 && this.damping && this.maxMotion < 0.001)) { first = false; this.relax(); }
      if (!this.running || generation !== this.generation) return;
      this.timer = setTimeout(run, !needsTicks() && this.damper < 0.1 && this.damping && this.maxMotion < 0.001 ? 100 : 20);
    };
    // Unlike a Java thread, scheduling yields to the caller before the first batch.
    this.timer = setTimeout(run, 0);
  }
  /** Cancels scheduling, including callbacks invalidated by a stop/restart during repaint. */
  stop(): void { this.running = false; this.generation++; clearTimeout(this.timer); this.timer = undefined; }
}
