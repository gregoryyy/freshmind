/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import type {EdgeStyle,NodeStyle,VisualOverride} from "../config/core.js";

/** Retained annotation source; an HTML format flag does not itself render or sanitize HTML. */
export interface Annotation { format: "text" | "html"; text: string; }
export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
export type Metadata = Record<string, JsonValue>;
export interface FreshNodeOptions {
  type?: string; visual?: VisualOverride<NodeStyle>; annotation?: Annotation; url?: string;
  weight?: number; position?: { x: number; y: number }; fixed?: boolean; data?: Metadata; extensions?: Metadata;
}
export interface FreshEdgeOptions {
  id?: string; label?: string; type?: string; visual?: VisualOverride<EdgeStyle>;
  weight?: number; length?: number; data?: Metadata; extensions?: Metadata;
}
