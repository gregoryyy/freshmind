/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type { FreshNodeOptions, FreshEdgeOptions, Metadata } from "../model/index.js";
import type { TypeConfiguration } from "../config/core.js";
import type {GraphSubstructure} from "../structures/index.js";

/** Persistent view settings; interaction state, velocities and derived geometry are excluded. */
export interface DocumentView {
  focus?: string; radius?: number; backlinks?: boolean; moveToCenter?: boolean; wholeGraph?: boolean;
  maxAddEdgeCount?: number; maxExpandEdgeCount?: number;
  lenses?: {zoom?: number; hyperbolic?: number; rotation?: number; pan?: {x: number; y: number}};
  canvas?: {zoom?: number; pan?: {x: number; y: number}};
}
export interface NodeRecord extends FreshNodeOptions { id: string; label: string; }
export interface EdgeRecord extends FreshEdgeOptions { id: string; from: string; to: string; }
export interface DocumentRecord {
  format: "freshmind"; version: 1; title?: string; types?: TypeConfiguration; typesFile?: string;
  nodes: NodeRecord[]; edges: EdgeRecord[]; view?: DocumentView; data?: Metadata; extensions?: Metadata;
  substructures?: GraphSubstructure[];
}
/** Resolves companion contents relative to the document; no codec performs network or filesystem I/O. */
export interface LoadOptions { resolveTypes?: (path: string) => string; }
export interface SaveOptions { includeLayout?: boolean; includeView?: boolean; typesFile?: string; }
