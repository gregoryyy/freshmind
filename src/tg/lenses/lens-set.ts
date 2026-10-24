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

import {TGPoint2D} from "./point.js";

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
