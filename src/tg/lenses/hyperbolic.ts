/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import {TGAbstractLens} from "./lens-set.js";
import type {TGPoint2D} from "./point.js";

/** The original HyperScroll radial transform and its 200-sample inverse table. */
export class HyperLens extends TGAbstractLens {
  private inverseArray: number[] = [];
  private value = 0;
  constructor(value = 0) { super(); this.setValue(value); }
  getValue(): number { return this.value; }
  /**
   * Sets radial focus/context strength and rebuilds the inverse lookup table.
   * @param value Strength from 0 (identity) to 100 (full distortion).
   * @throws {RangeError} If value is non-finite or outside 0–100.
   */
  setValue(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new RangeError("Hyperbolic strength must be between 0 and 100");
    this.value = value;
    this.inverseArray = Array.from({ length: 200 }, (_, i) => this.hyperDist(2000 * i / 200));
  }
  private rawHyperDist(distance: number): number {
    return this.value === 0 ? distance : Math.log(distance / (Math.pow(1.5, (70 - this.value) / 40) * 80) + 1);
  }
  /** Maps radial distance, preserving the origin and the reference radius of 250. */
  hyperDist(distance: number): number {
    const distorted = this.rawHyperDist(distance) / this.rawHyperDist(250) * 250;
    return distorted * this.value / 100 + distance * (100 - this.value) / 100;
  }
  /**
   * Approximates the inverse using Java's 200 samples at physical radii 0–1990.
   * Interpolates within the table and extrapolates from its final interval beyond it.
   */
  invHyperDist(distance: number): number {
    if (distance === 0) return 0;
    let min = 0;
    let max = 199;
    while (max - min > 1) {
      const mid = Math.trunc((min + max) / 2);
      if (this.inverseArray[mid] < distance) min = mid;
      else max = mid;
    }
    const i = max;
    const x1 = this.inverseArray[i - 1];
    const x2 = this.inverseArray[i];
    const fraction = (distance - x1) / (x2 - x1);
    return (i + fraction - 1) / 200 * 2000;
  }
  override applyLens(point: TGPoint2D): void { this.radial(point, distance => this.hyperDist(distance)); }
  override undoLens(point: TGPoint2D): void { this.radial(point, distance => this.invHyperDist(distance)); }
  private radial(point: TGPoint2D, transform: (distance: number) => number): void {
    const distance = Math.sqrt(point.x * point.x + point.y * point.y);
    if (distance > 0) {
      const result = transform(distance);
      point.x = point.x / distance * result;
      point.y = point.y / distance * result;
    } else { point.x = 0; point.y = 0; }
  }
}
