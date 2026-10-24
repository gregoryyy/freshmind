/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import type {VisibleLocality} from "../../tg/graph/index.js";

/** Optional capability implemented by a view whose mutations belong to an underlying neighborhood. */
export interface LocalitySource {getMutationSource():VisibleLocality;}

/** Resolves the graph mutation owner without coupling edit commands to a particular view implementation. */
export function getMutationLocality(locality:VisibleLocality|undefined):VisibleLocality|undefined {
  return (locality as (VisibleLocality&Partial<LocalitySource>)|undefined)?.getMutationSource?.()??locality;
}
