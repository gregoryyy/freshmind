/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode, FreshEdge } from "../model.js";
import type { ImmutableGraphEltSet } from "../../tg/graph.js";
import type { Direction, CandidateKind, Candidate } from "./types.js";

export const directions: readonly Direction[] = ["right", "down", "left", "up"];
const tau = 2 * Math.PI;
const normalize = (angle: number) => (angle % tau + tau) % tau;
const compareId = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Assigns every nonzero screen vector to one half-open 90° sector; diagonals have no gaps. */
export function screenDirection(dx: number, dy: number): Direction | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return null;
  return directions[Math.floor(normalize(Math.atan2(dy, dx) + Math.PI / 4) / (Math.PI / 2)) % 4];
}

/**
 * Collects visible neighbors/incident relations from measured draw coordinates.
 * Both edge directions participate. Nodes are deduplicated; parallel edges retain their IDs.
 * Results are clockwise within the chosen sector; bestCandidateIndex chooses the initial item.
 */
export function collectCandidates(graph: ImmutableGraphEltSet, anchor: FreshNode, direction: Direction, kind: CandidateKind): Candidate[] {
  if (!graph.contains(anchor)) return [];
  const candidates: Candidate[] = [], seen = new Set<NavigationItemKey>();
  const axis = directions.indexOf(direction) * Math.PI / 2;
  for (const relation of anchor.getEdges()) {
    if (!(relation instanceof FreshEdge) || !graph.contains(relation)) continue;
    const node = relation.getOtherEndpt(anchor);
    if (!(node instanceof FreshNode) || node === anchor || !graph.contains(node)) continue;
    const dx = node.drawx - anchor.drawx, dy = node.drawy - anchor.drawy;
    if (screenDirection(dx, dy) !== direction) continue;
    const item = kind === "node" ? node : relation;
    if (seen.has(item)) continue;
    seen.add(item);
    const angle = normalize(Math.atan2(dy, dx) - axis + Math.PI / 4);
    // Absolute components keep symmetric directions exactly tied, avoiding modulo-rounding bias.
    const horizontal = direction === "right" || direction === "left";
    const axisDistance = Math.atan2(Math.abs(horizontal ? dy : dx), Math.abs(horizontal ? dx : dy));
    candidates.push({ item, node, id: item.getID()!, angle, distance: Math.hypot(dx, dy), axisDistance });
  }
  return candidates.sort((a, b) => a.angle - b.angle || compareId(a.id, b.id));
}
type NavigationItemKey = FreshNode | FreshEdge;

/** Chooses the closest sector-axis angle, then shortest draw distance, then lexical stable ID. */
export function bestCandidateIndex(candidates: readonly Candidate[]): number {
  let best = 0;
  for (let index = 1; index < candidates.length; index++) {
    const a = candidates[index], b = candidates[best];
    if (a.axisDistance < b.axisDistance || (a.axisDistance === b.axisDistance &&
      (a.distance < b.distance || (a.distance === b.distance && compareId(a.id, b.id) < 0)))) best = index;
  }
  return best;
}
