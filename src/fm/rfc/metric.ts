/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import type {CoordinateWeights} from "./types.js";

/** Copies finite, positive coordinate weights; bounded scaling keeps force integration well conditioned. */
export function validateCoordinateWeights(weights: CoordinateWeights): CoordinateWeights {
  for (const axis of ["x", "y"] as const)
    if (!weights || !Number.isFinite(weights[axis]) || weights[axis] < .01 || weights[axis] > 100)
      throw new RangeError(`coordinateWeights.${axis} must be finite and in 0.01–100`);
  return {x: weights.x, y: weights.y};
}

/** Paper equation (2)'s D(a,b), computed in physical coordinates, independently of the viewing lenses. */
export function weightedDistance(a: {x: number; y: number}, b: {x: number; y: number}, weights: CoordinateWeights): number {
  return Math.hypot(Math.sqrt(weights.x) * (a.x - b.x), Math.sqrt(weights.y) * (a.y - b.y));
}
