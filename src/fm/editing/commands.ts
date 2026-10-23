/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode, FreshEdge } from "../model.js";
import type { NodeShape, CurveMode, NodeStyle, EdgeStyle } from "../config/types.js";
import { text, validateVisualOverride } from "../config/validation.js";

export interface NodeEdit { label: string; type: string; shape: NodeShape | null; }
export interface RelationEdit { label: string; type: string; curve: CurveMode | null; }

/** Validates a label/type/shape draft before mutation; identity, coordinates and metadata stay intact. */
export function applyNodeEdit(node: FreshNode, edit: NodeEdit): void {
  if (typeof edit.label !== "string") throw new TypeError("Expected a label string");
  text(edit.type, "node.type");
  const visual = node.getVisual();
  visual.style ??= {};
  if (edit.shape === null) delete visual.style.shape;
  else visual.style.shape = edit.shape;
  const validated = validateVisualOverride<NodeStyle>(visual, "node");
  node.setVisual(validated); node.setSemanticType(edit.type); node.setLabel(edit.label);
}

/** Applies a validated relation draft independently of its endpoints, spring length and metadata. */
export function applyRelationEdit(edge: FreshEdge, edit: RelationEdit): void {
  if (typeof edit.label !== "string") throw new TypeError("Expected a label string");
  text(edit.type, "edge.type");
  const visual = edge.getVisual();
  visual.style ??= {};
  if (edit.curve === null) delete visual.style.curve;
  else visual.style.curve = edit.curve;
  const validated = validateVisualOverride<EdgeStyle>(visual, "edge");
  edge.setVisual(validated); edge.setSemanticType(edit.type); edge.setLabel(edit.label);
}
