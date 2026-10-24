/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import {MotionStabilizer} from "../../tg/layout/index.js";
import type {MotionStabilizationOptions,MotionStabilizationState} from "../../tg/layout/index.js";
export type RfcStabilizationOptions=Pick<MotionStabilizationOptions,"enabled"|"now">;
export type RfcStabilizationState=MotionStabilizationState;

/** Preserves the RFC-local experiment's sampling and numerical records.
 * General layout damping uses completed-swing detection through TGLayout instead. */
export class RfcStabilizer extends MotionStabilizer {
  constructor(options:RfcStabilizationOptions={}) {super({...options,detectSlowSwings:false});}
}
