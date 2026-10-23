/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import type { Node } from "../../tg/model.js";

export interface RfcStabilizationOptions {
  /** Experimental and disabled by default; opt in for oscillation/damping comparisons. */
  enabled?: boolean;
  /** Monotonic milliseconds; injectable for repeatable headless simulations. */
  now?: () => number;
}
export interface RfcStabilizationState {
  enabled: boolean;
  phase: "steady" | "damping" | "recovering";
  /** Local multiplier on accumulated focal-node impulses, not on configured force constants. */
  gain: number;
  detections: number;
  maxStepDisplacement: number;
}
interface Sample { x: number; y: number; dx: number; dy: number; }

/**
 * Detects repeated, persistent reversals of actual per-step focal-node movement.
 * A local impulse damper preserves the force balance, unlike weakening only RFC springs.
 * No timers run: recovery advances only while integration steps are being observed.
 */
export class RfcStabilizer {
  private enabled: boolean;
  private readonly now: () => number;
  private readonly samples = new Map<Node, Sample>();
  private reversals: boolean[] = [];
  private lastTime: number | null = null;
  private quietMs = 0;
  private recoveryMs = 0;
  private recoveryStart = 1;
  private state: RfcStabilizationState;

  constructor(options: RfcStabilizationOptions = {}) {
    if (options.enabled !== undefined && typeof options.enabled !== "boolean") throw new TypeError("stabilization.enabled must be boolean");
    if (options.now !== undefined && typeof options.now !== "function") throw new TypeError("stabilization.now must be a function");
    this.enabled = options.enabled ?? false;
    this.now = options.now ?? (() => performance.now());
    this.state = this.initialState();
  }
  private initialState(): RfcStabilizationState {
    return {enabled:this.enabled, phase:"steady", gain:1, detections:0, maxStepDisplacement:0};
  }
  /** Detached diagnostic snapshot; configured RFC strengths are never changed by stabilization. */
  getState(): RfcStabilizationState { return {...this.state}; }
  /** Toggles the experiment and discards its learned motion history and damping. */
  setEnabled(enabled: boolean): void {
    if (typeof enabled !== "boolean") throw new TypeError("stabilization.enabled must be boolean");
    if (enabled === this.enabled) return;
    this.enabled = enabled; this.reset();
  }
  /** Clears history on focus removal/replacement, suspension or destruction. */
  reset(): void {
    this.state = this.initialState(); this.forgetMotion();
  }
  /** Starts a fresh observation window without abruptly removing an existing local damper. */
  forgetMotion(): void {
    this.samples.clear(); this.reversals = []; this.lastTime = null;
    this.quietMs = this.recoveryMs = 0;
    if (this.state.gain < 1) this.state.phase = "damping";
  }
  /**
   * Called after RFC force accumulation, before TG integrates. Measures positions from
   * the previous step, then attenuates dx/dy only for movable focal members.
   * Dragging and long gaps discard observation history, so neither gestures nor pauses
   * count as oscillation or quiet simulation time.
   */
  apply(nodes: readonly Node[], dragged: Node | null = null): void {
    if (!this.enabled) return;
    if (dragged && nodes.includes(dragged)) { this.forgetMotion(); return; }
    const movable = nodes.filter(node => !node.fixed && node !== dragged);
    const time = this.now(), elapsed = this.lastTime === null ? 0 : time - this.lastTime;
    const discontinuity = !Number.isFinite(time) || elapsed < 0 || elapsed > 250;
    const changed = movable.length !== this.samples.size || movable.some(node => !this.samples.has(node));
    if (discontinuity || changed) this.forgetMotion();
    const dt = this.lastTime === null ? 0 : Math.min(50, elapsed);
    this.lastTime = Number.isFinite(time) ? time : null;
    let energy = 0, reversingEnergy = 0, maximum = 0;
    for (const node of movable) {
      const previous = this.samples.get(node);
      const dx = previous ? node.x - previous.x : 0, dy = previous ? node.y - previous.y : 0;
      const distance = Math.hypot(dx, dy), priorDistance = previous ? Math.hypot(previous.dx, previous.dy) : 0;
      energy += distance * distance; maximum = Math.max(maximum, distance);
      if (previous && distance > .5 && priorDistance > .5 && distance >= priorDistance * .8
        && dx * previous.dx + dy * previous.dy < -.5 * distance * priorDistance)
        reversingEnergy += distance * distance;
      this.samples.set(node, {x:node.x, y:node.y, dx, dy});
    }
    this.state.maxStepDisplacement = maximum;
    this.reversals.push(energy > 0 && reversingEnergy > energy * .5);
    if (this.reversals.length > 8) this.reversals.shift();
    if (this.reversals.filter(Boolean).length >= 3) {
      this.state.gain = Math.max(1 / 256, this.state.gain * .5);
      this.state.phase = "damping"; this.state.detections++;
      this.quietMs = this.recoveryMs = 0; this.reversals = [];
    } else if (this.state.gain < 1) {
      if (maximum > .1) {
        this.quietMs = this.recoveryMs = 0; this.state.phase = "damping";
      } else if (this.state.phase === "damping") {
        this.quietMs += dt;
        if (this.quietMs >= 500) {
          this.state.phase = "recovering"; this.recoveryStart = this.state.gain; this.recoveryMs = 0;
        }
      } else {
        this.recoveryMs = Math.min(3000, this.recoveryMs + dt);
        const t = this.recoveryMs / 3000, smooth = t * t * (3 - 2 * t);
        this.state.gain = this.recoveryStart + (1 - this.recoveryStart) * smooth;
        if (t === 1) this.state.phase = "steady";
      }
    }
    if (this.state.gain < 1) for (const node of movable) {
      node.dx *= this.state.gain; node.dy *= this.state.gain;
    }
  }
}
