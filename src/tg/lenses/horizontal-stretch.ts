/*!
 * Adapted from FM2014 FreshmindBrowser.HorizontalStretchLens.
 * Original source carries the TouchGraph license:
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript adaptation by Gregor Heinrich.
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 */
import {TGAbstractLens} from "./lens-set.js";
import type {TGPoint2D} from "./point.js";
/** FM2014 HorizontalStretchLens, with a validated configurable factor instead of fixed 1.5. */
export class HorizontalStretchLens extends TGAbstractLens {
  private ratio=1;
  constructor(ratio=1){super();this.setRatio(ratio);}
  getRatio():number{return this.ratio;}
  setRatio(ratio:number):void {
    if(!Number.isFinite(ratio)||ratio<.01||ratio>100)throw new RangeError("Graph aspect ratio must be finite and in 0.01–100");
    this.ratio=ratio;
  }
  override applyLens(point:TGPoint2D):void{point.x*=this.ratio;}
  override undoLens(point:TGPoint2D):void{point.x/=this.ratio;}
}
