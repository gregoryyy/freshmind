/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import type {TypeRegistry} from "../config/core.js";
import type {Metadata} from "./types.js";
import {FreshGraph} from "./graph.js";

/** Document metadata aggregates the existing graph; it never duplicates live adjacency. */
export class FreshmindDocument {
  title = "";
  /** Explicit reopening focus, independent of the last captured view focus. */
  initialFocus?: string;
  data: Metadata = {};
  extensions: Metadata = {};
  view?: import("../io/index.js").DocumentView;
  constructor(public types: TypeRegistry, readonly graph = new FreshGraph()) {}
}
