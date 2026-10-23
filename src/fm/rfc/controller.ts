/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import type { Node } from "../../tg/model.js";
import type { LayoutForce } from "../../tg/layout.js";
import { angularGapRms, applyRfcForces, collectFocalStar } from "./forces.js";
import type { RfcHost, RfcSettings, RfcState } from "./types.js";
import {validateCoordinateWeights} from "./metric.js";
import {rfcForcePresets} from "./presets.js";

const defaults: RfcSettings = {...rfcForcePresets.tree, coordinateWeights: {x: 1, y: 1}};

/** Owns transient single-focus constraints; the host remains authoritative for graph membership. */
export class RfcController {
  private focus: Node | null = null;
  private settings: RfcSettings;
  private disposed = false;
  private signature = "";
  private readonly listeners = new Set<(state: RfcState) => void>();

  constructor(private readonly host: RfcHost, options: Partial<RfcSettings> = {}) {
    this.settings = this.validate({...defaults, ...options});
  }
  private validate(settings: RfcSettings): RfcSettings {
    for (const [key, min, max] of [["springMultiplier", 1, 100], ["radialStiffness", 0, 2], ["radialLength", 10, 1000], ["angularStiffness", 0, 100000]] as const)
      if (!Number.isFinite(settings[key]) || settings[key] < min || settings[key] > max)
        throw new RangeError(`${key} must be finite and in ${min}–${max}`);
    return {...settings, coordinateWeights: validateCoordinateWeights(settings.coordinateWeights)};
  }
  /** Returns copied IDs/settings and current physical angular error, with no mutable internal state. */
  getState(): RfcState {
    const focus = this.focus && this.host.getCompleteEltSet().contains(this.focus) ? this.focus : null;
    const active = Boolean(focus && this.host.getGES().contains(focus));
    const star = focus && active ? collectFocalStar(this.host.getGES(), focus, this.settings.coordinateWeights) : null;
    return {focusId: focus?.getID() ?? null, enabled: Boolean(focus), active,
      branchIds: star?.branches.map(branch => branch.node.getID()!) ?? [],
      radialEdgeIds: star?.branches.map(branch => branch.edge.getID()!) ?? [],
      angularGapRms: star ? angularGapRms(star) : 0, settings: {...this.settings, coordinateWeights: {...this.settings.coordinateWeights}}};
  }
  /** Subscribes to activation/settings/topology changes; layout metrics can be polled after a batch. */
  addListener(listener: (state: RfcState) => void): () => void {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  }
  private publish(): void {
    const state = this.getState();
    this.signature = JSON.stringify([state.focusId, state.active, [...state.branchIds].sort(), [...state.radialEdgeIds].sort()]);
    for (const listener of this.listeners) listener(state);
  }
  /** Activates one visible center, replaces an existing focus, or removes RFC with null. Repeats are idempotent. */
  setFocus(node: Node | null): void {
    if (this.disposed) throw new Error("RFC controller has been destroyed");
    if (node && (!this.host.getCompleteEltSet().contains(node) || !this.host.getGES().contains(node)))
      throw new Error("RFC focus must belong to the visible graph");
    if (this.focus === node) return;
    this.focus = node; this.host.resetDamper(); this.publish();
  }
  /** Validates an entire settings update before mutation and wakes the current layout. */
  configure(changes: Partial<RfcSettings>): void {
    if (this.disposed) throw new Error("RFC controller has been destroyed");
    const next = this.validate({...this.settings, ...changes});
    if (next.springMultiplier === this.settings.springMultiplier && next.angularStiffness === this.settings.angularStiffness
      && next.radialStiffness === this.settings.radialStiffness && next.radialLength === this.settings.radialLength
      && next.coordinateWeights.x === this.settings.coordinateWeights.x && next.coordinateWeights.y === this.settings.coordinateWeights.y) return;
    this.settings = next; this.host.resetDamper(); this.publish();
  }
  /** Clears deleted centers and announces visible-topology changes; hidden stored centers remain suspended. */
  reconcile(): void {
    if (this.disposed || !this.focus) return;
    if (!this.host.getCompleteEltSet().contains(this.focus)) this.focus = null;
    const state = this.getState();
    const signature = JSON.stringify([state.focusId, state.active, [...state.branchIds].sort(), [...state.radialEdgeIds].sort()]);
    if (signature !== this.signature) this.publish();
  }
  /** Stable callback for TGLayout.addForce; disabled or suspended RFC performs no force arithmetic. */
  readonly apply: LayoutForce = (graph, rigidity) => {
    if (this.disposed || !this.focus) return;
    if (!this.host.getCompleteEltSet().contains(this.focus)) { this.reconcile(); return; }
    if (graph.contains(this.focus)) applyRfcForces(collectFocalStar(graph, this.focus, this.settings.coordinateWeights), this.settings, rigidity);
  };
  /** Drops listeners/constraints without changing positions, momentum or persistent graph records. */
  destroy(): void { this.disposed = true; this.focus = null; this.listeners.clear(); }
}
