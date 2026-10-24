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
