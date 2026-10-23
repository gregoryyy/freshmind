/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../LICENSE and ../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

export class TGPoint2D {
  x: number;
  y: number;
  constructor(x?: number | { x: number; y: number }, y = 0) {
    this.x = typeof x === "object" ? x.x : x ?? 0;
    this.y = typeof x === "object" ? x.y : y;
  }
  setLocation(x: number, y: number): void { this.x = x; this.y = y; }
  setX(x: number): void { this.x = x; }
  setY(y: number): void { this.y = y; }
}

/** In-place forward/inverse transform; subclasses should implement both directions. */
export class TGAbstractLens {
  applyLens(_point: TGPoint2D): void {}
  undoLens(_point: TGPoint2D): void {}
}

/** Ordered transform composition: apply in insertion order and undo in reverse order. */
export class TGLensSet extends TGAbstractLens {
  private lenses: TGAbstractLens[] = [];
  addLens(lens: TGAbstractLens): void { this.lenses.push(lens); }
  override applyLens(point: TGPoint2D): void { for (const lens of this.lenses) lens.applyLens(point); }
  override undoLens(point: TGPoint2D): void { for (const lens of [...this.lenses].reverse()) lens.undoLens(point); }
  /** Returns transformed draw coordinates in a new point, leaving the input untouched. */
  convRealToDraw(x: number | TGPoint2D, y = 0): TGPoint2D {
    const point = new TGPoint2D(x, y); this.applyLens(point); return point;
  }
  /** Returns physical coordinates through the inverse chain; accuracy depends on each lens. */
  convDrawToReal(x: number | TGPoint2D, y = 0): TGPoint2D {
    const point = new TGPoint2D(x, y); this.undoLens(point); return point;
  }
}

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

/** Adds an offset in the coordinate space at this lens's position in the chain. */
export class TranslateLens extends TGAbstractLens {
  constructor(public x = 0, public y = 0) { super(); }
  override applyLens(point: TGPoint2D): void { point.x += this.x; point.y += this.y; }
  override undoLens(point: TGPoint2D): void { point.x -= this.x; point.y -= this.y; }
}

/** Uniform scale; callers must keep scale nonzero for inverse transforms. */
export class ZoomLens extends TGAbstractLens {
  constructor(public scale = 1) { super(); }
  override applyLens(point: TGPoint2D): void { point.x *= this.scale; point.y *= this.scale; }
  override undoLens(point: TGPoint2D): void { point.x /= this.scale; point.y /= this.scale; }
}

/** Rotation about the current origin, with angle expressed in radians. */
export class RotateLens extends TGAbstractLens {
  constructor(public angle = 0) { super(); }
  private rotate(point: TGPoint2D, angle: number): void {
    const x = point.x;
    const y = point.y;
    point.x = x * Math.cos(angle) - y * Math.sin(angle);
    point.y = x * Math.sin(angle) + y * Math.cos(angle);
  }
  override applyLens(point: TGPoint2D): void { this.rotate(point, this.angle); }
  override undoLens(point: TGPoint2D): void { this.rotate(point, -this.angle); }
}
