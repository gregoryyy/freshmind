/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import type { Node, Edge } from "../../tg/model.js";
import type { ImmutableGraphEltSet } from "../../tg/graph.js";
import type { RfcStabilizationState } from "./stabilization.js";

/** Coefficients λx and λy in D² = λx·dx² + λy·dy²; values are weights, not axis scale factors. */
export interface CoordinateWeights { x: number; y: number; }
export interface RfcSettings {
  /** Reference attraction multiplier in 1–100; extra weighted attraction uses (multiplier − 1). */
  springMultiplier: number;
  /** Stiffness of a two-sided spring toward radialLength, in 0–2; zero disables the length constraint. */
  radialStiffness: number;
  /** Desired focal branch length in weighted physical units, in 10–1000. */
  radialLength: number;
  /** Equation (1)'s angular spring constant, in 0–100,000. */
  angularStiffness: number;
  /** Positive physical-coordinate weights, each in 0.01–100. Smaller x permits wider focal layouts. */
  coordinateWeights: CoordinateWeights;
}
export interface RfcBranch { node: Node; edge: Edge; angle: number; }
/** Ephemeral references to existing graph members, never a second graph or adjacency owner. */
export interface FocalStar { center: Node; branches: RfcBranch[]; coordinateWeights: CoordinateWeights; }
export interface RfcState {
  focusId: string | null;
  enabled: boolean;
  active: boolean;
  branchIds: string[];
  radialEdgeIds: string[];
  angularGapRms: number;
  settings: RfcSettings;
  stabilization: RfcStabilizationState;
  /** Primary-first active/stored centers; hidden centers remain suspended independently. */
  centers: RfcCenterState[];
  /** Union of visible reinforced members across all active centers. */
  memberIds: string[];
}
export interface RfcCenterState {
  focusId:string; structureId:string|null; kind:"star"|"tree"|"dag"; active:boolean;
  memberIds:string[]; edgeIds:string[]; angularGapRms:number|null;
}
export interface RfcHost {
  getGES(): ImmutableGraphEltSet;
  getCompleteEltSet(): ImmutableGraphEltSet;
  resetDamper(): void;
  getDragNode?(): Node | null;
}
