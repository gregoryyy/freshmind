/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

/** Force-only presets preserve the caller's coordinate metric and active focal center. */
export const rfcForcePresets = Object.freeze({
  attraction: Object.freeze({springMultiplier: 3, radialStiffness: 0, radialLength: 120, angularStiffness: 300}),
  tree: Object.freeze({springMultiplier: 1, radialStiffness: 1, radialLength: 120, angularStiffness: 10000})
});
