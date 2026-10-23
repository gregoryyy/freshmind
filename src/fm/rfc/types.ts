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
/** Cluster-only controls, independent of the original star/tree settings and recorded experiments. */
export interface RfcClusterSettings {
  /** Two-sided internal spring stiffness in 0–2; zero retains soft compactness/link caps alone. */
  rigidity:number;
}
export interface RfcSettings {
  /** Reference attraction multiplier in 1–100; extra weighted attraction uses (multiplier − 1). */
  springMultiplier: number;
  /** Length/template stiffness in 0–2; clusters use one-sided link limits and centroid compactness. */
  radialStiffness: number;
  /** Focal length in 10–1000 weighted units; clusters also derive their soft extent from this length. */
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
  clusterSettings:RfcClusterSettings;
  stabilization: RfcStabilizationState;
  /** Primary-first active/stored centers; hidden centers remain suspended independently. */
  centers: RfcCenterState[];
  /** Union of visible reinforced members across all active centers. */
  memberIds: string[];
}
export interface RfcCenterState {
  focusId:string; structureId:string|null; kind:"star"|"tree"|"dag"|"cluster"; active:boolean;
  memberIds:string[]; edgeIds:string[]; angularGapRms:number|null;
}
export interface RfcHost {
  getGES(): ImmutableGraphEltSet;
  getCompleteEltSet(): ImmutableGraphEltSet;
  resetDamper(): void;
  getDragNode?(): Node | null;
}
