/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import type { Node } from "../../tg/model/index.js";
import type { ImmutableGraphEltSet } from "../../tg/graph/index.js";
import type { CoordinateWeights, FocalStar, RfcBranch, RfcSettings } from "./types.js";
import {validateCoordinateWeights, weightedDistance} from "./metric.js";
import {rfcRelationStrength} from "./importance.js";

const tau = 2 * Math.PI;
const compare = (a: string | null, b: string | null) => (a ?? "") < (b ?? "") ? -1 : (a ?? "") > (b ?? "") ? 1 : 0;

/** Derives a visible one-hop tree, ordering by angle in weighted physical coordinates. */
export function collectFocalStar(graph: ImmutableGraphEltSet, center: Node, coordinateWeights: CoordinateWeights = {x: 1, y: 1}): FocalStar {
  const weights = validateCoordinateWeights(coordinateWeights), sx = Math.sqrt(weights.x), sy = Math.sqrt(weights.y);
  const byNode = new Map<Node, RfcBranch>();
  if (graph.contains(center)) for (const edge of center.getEdges()) {
    const node = edge.getOtherEndpt(center);
    if (node === center || !graph.contains(edge) || !graph.contains(node) || rfcRelationStrength(edge)===0) continue;
    const previous = byNode.get(node);
    if (!previous || compare(edge.getID(), previous.edge.getID()) < 0)
      byNode.set(node, {node, edge, angle: Math.atan2(sy * (node.y - center.y), sx * (node.x - center.x))});
  }
  return {center, branches: [...byNode.values()].sort((a, b) => a.angle - b.angle || compare(a.node.getID(), b.node.getID())), coordinateWeights: weights};
}

function gap(star: FocalStar, index: number): number {
  const branches = star.branches;
  return branches[(index + 1) % branches.length].angle + (index === branches.length - 1 ? tau : 0) - branches[index].angle;
}

/** RMS deviation from equal angular gaps, in radians; zero for degree zero/one. */
export function angularGapRms(star: FocalStar): number {
  const count = star.branches.length;
  return count < 2 ? 0 : Math.sqrt(star.branches.reduce((sum, _, i) => sum + (gap(star, i) - tau / count) ** 2, 0) / count);
}

/** Applies opposite impulses with the same established/newly-local weighting as TouchGraph. */
export function branchImpulse(center: Node, branch: Node, fx: number, fy: number): void {
  const branchScale = branch.justMadeLocal || !center.justMadeLocal ? 1 : 10;
  const centerScale = center.justMadeLocal || !branch.justMadeLocal ? 1 : 10;
  branch.dx += fx / branchScale; branch.dy += fy / branchScale;
  center.dx -= fx / centerScale; center.dy -= fy / centerScale;
}

/** Differentiates weighted atan2 back into physical force; the soft core is one weighted unit squared. */
function moment(center: Node, branch: Node, value: number, weights: CoordinateWeights): void {
  const x = branch.x - center.x, y = branch.y - center.y;
  const scale = value * Math.sqrt(weights.x * weights.y) / Math.max(1, weights.x * x * x + weights.y * y * y);
  branchImpulse(center, branch, -y * scale, x * scale);
}

/** Adds importance-scaled radial and angular reinforcement; zero-strength branches do not enter gap targets. */
export function applyRfcForces(star: FocalStar, settings: Pick<RfcSettings, "springMultiplier" | "angularStiffness"> & Partial<Pick<RfcSettings, "radialStiffness" | "radialLength">>, rigidity: number, memberships?:ReadonlyMap<Node,number>): void {
  const {center, coordinateWeights: weights} = star;
  const branches=star.branches.filter(branch=>rfcRelationStrength(branch.edge)>0);
  const activeStar=branches.length===star.branches.length?star:{...star,branches};
  if (settings.springMultiplier !== 1) for (const {node, edge} of branches) {
    const x = node.x - center.x, y = node.y - center.y;
    const pull = (settings.springMultiplier - 1) * rigidity * weightedDistance(node, center, weights) / (edge.getLength() * 100)*rfcRelationStrength(edge);
    branchImpulse(center, node, -weights.x * x * pull, -weights.y * y * pull);
  }
  if (settings.radialStiffness) for (const {node,edge} of branches) {
    const x = node.x - center.x, y = node.y - center.y;
    const distance = weightedDistance(node, center, weights);
    // Smooth D near zero using sqrt(D² + 1); this is the gradient of k/2·(sqrt(D²+1)−L)².
    const radius = Math.hypot(distance, 1);
    const pull = settings.radialStiffness * rigidity * (radius - (settings.radialLength ?? 120)) / radius*rfcRelationStrength(edge);
    branchImpulse(center, node, -weights.x * x * pull, -weights.y * y * pull);
  }
  if (branches.length < 2 || settings.angularStiffness === 0) return;
  for (const [index, branch] of branches.entries()) {
    const next=branches[(index+1)%branches.length];
    const sharing=Math.max(1,memberships?.get(branch.node)??1,memberships?.get(next.node)??1);
    const importance=Math.sqrt(rfcRelationStrength(branch.edge))*Math.sqrt(rfcRelationStrength(next.edge));
    const value = settings.angularStiffness * rigidity * (gap(activeStar, index) - tau / branches.length) / sharing*importance;
    moment(center, branch.node, value, weights);
    moment(center, branches[(index + 1) % branches.length].node, -value, weights);
  }
}
