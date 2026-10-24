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
