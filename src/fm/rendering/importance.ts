/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type {NodeImportanceStyle} from "../config/types.js";
export interface NodeImportanceViewSettings {mode:"configured"|NodeImportanceStyle["mode"];showValues:boolean;}

/** Copies validated panel preferences, without changing the document's configured visual styles. */
export function validateNodeImportanceView(settings:NodeImportanceViewSettings):NodeImportanceViewSettings {
  if(!["configured","size","legacy","none"].includes(settings.mode))throw new TypeError("Unknown node importance view mode");
  if(typeof settings.showValues!=="boolean")throw new TypeError("Show node weights must be boolean");
  return {...settings};
}

/**
 * Maps finite nonnegative model importance to a bounded linear body/text scale.
 * q=2w/(w+1), evaluated without overflowing 2w. q=1 is exactly the default
 * weight's scale of one; the lower/upper halves interpolate to independent bounds.
 * This is a presentation mapping, independent of mass, repulsion and RFC stiffness.
 */
export function nodeImportanceScale(weight:number,style:NodeImportanceStyle):number {
  if(!Number.isFinite(weight)||weight<0)throw new RangeError("Node importance must be finite and nonnegative");
  if(!["size","legacy","none"].includes(style.mode))throw new TypeError("Unknown node importance mode");
  if(!Number.isFinite(style.minScale)||style.minScale<.5||style.minScale>1||!Number.isFinite(style.maxScale)||style.maxScale<1||style.maxScale>3)
    throw new RangeError("Importance scale bounds must be in 0.5–1 and 1–3");
  if(style.mode!=="size")return 1;
  const q=2*(weight/(weight+1));
  return q<=1?style.minScale+(1-style.minScale)*q:1+(style.maxScale-1)*(q-1);
}
