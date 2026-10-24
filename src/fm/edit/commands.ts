/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode, FreshEdge, FreshGraph,getMutationLocality } from "../model/index.js";
import type { Annotation, Metadata } from "../model/index.js";
import type { VisibleLocality } from "../../tg/graph/index.js";
import type { NodeShape, CurveMode, NodeStyle, EdgeStyle } from "../config/core.js";
import type { VisualOverride } from "../config/core.js";
import { text, validateVisualOverride } from "../config/core.js";
import {parseWeightedLabel} from "./label.js";

export interface NodeEdit {
  label: string; type: string; shape: NodeShape | null;
  visual?: VisualOverride<NodeStyle>; annotation?: Annotation; url?: string; weight?: number; data?: Metadata; extensions?: Metadata;
}
export interface RelationEdit {
  label: string; type: string; curve: CurveMode | null;
  visual?: VisualOverride<EdgeStyle>; weight?: number; length?: number; from?: string; to?: string; data?: Metadata; extensions?: Metadata;
}
export interface RelationEditContext { graph: FreshGraph; locality?: VisibleLocality; }

/** Commits only a label and an optional numeric weight suffix, preserving every other item field. */
export function applyLabelEdit(item:FreshNode|FreshEdge,input:string):void {
  if(typeof input!=="string")throw new TypeError("Expected a label string");
  // Imported literal suffixes remain literal when the text was not changed.
  if(input===item.getLabel())return;
  const parsed=parseWeightedLabel(input);
  // Parsing validates the complete optional weight before either live field changes.
  if(parsed.weight!==undefined)item.setWeight(parsed.weight);
  item.setLabel(parsed.label);
}

/** Validates a label/type/shape draft before mutation; identity, coordinates and metadata stay intact. */
export function applyNodeEdit(node: FreshNode, edit: NodeEdit): void {
  if (typeof edit.label !== "string") throw new TypeError("Expected a label string");
  text(edit.type, "node.type");
  const visual = structuredClone(edit.visual ?? node.getVisual());
  visual.style ??= {};
  if (edit.shape === null) delete visual.style.shape;
  else visual.style.shape = edit.shape;
  const validated = validateVisualOverride<NodeStyle>(visual, "node");
  // Construct a detached candidate so every field is validated before any live mutation.
  const candidate = new FreshNode(node.getID(), edit.label, {type: edit.type, visual: validated,
    annotation: edit.annotation ?? node.getAnnotation(), url: edit.url ?? node.getURL(), weight: edit.weight ?? node.getWeight(),
    data: edit.data ?? node.getData(), extensions: edit.extensions ?? node.getExtensions()});
  node.setAnnotation(candidate.getAnnotation()); node.setURL(candidate.getURL()); node.setWeight(candidate.getWeight());
  node.setData(candidate.getData()); node.setExtensions(candidate.getExtensions());
  node.setVisual(validated); node.setSemanticType(edit.type); node.setLabel(edit.label);
}

/** Applies a validated relation draft independently of its endpoints, spring length and metadata. */
export function applyRelationEdit(edge: FreshEdge, edit: RelationEdit, context?: RelationEditContext): void {
  if (typeof edit.label !== "string") throw new TypeError("Expected a label string");
  text(edit.type, "edge.type");
  const visual = structuredClone(edit.visual ?? edge.getVisual());
  visual.style ??= {};
  if (edit.curve === null) delete visual.style.curve;
  else visual.style.curve = edit.curve;
  const validated = validateVisualOverride<EdgeStyle>(visual, "edge");
  const from = edit.from === undefined ? edge.from : context?.graph.findNode(edit.from);
  const to = edit.to === undefined ? edge.to : context?.graph.findNode(edit.to);
  if (!from || !to) throw new Error("Choose endpoints from the complete graph");
  if (context && !context.graph.contains(edge)) throw new Error("Relation must belong to the graph");
  const candidate = new FreshEdge(from, to, {id: edge.getID() ?? undefined, label: edit.label, type: edit.type, visual: validated,
    weight: edit.weight ?? edge.getWeight(), length: edit.length ?? edge.getLength(), data: edit.data ?? edge.getData(), extensions: edit.extensions ?? edge.getExtensions()});
  if (from !== edge.from || to !== edge.to) {
    if (!context) throw new Error("Endpoint changes require a graph context");
    // Preserve source membership even when a structural rule currently hides a target.
    // The enclosing edit repaints after all validated mutations, avoiding partial UI updates.
    const locality=getMutationLocality(context.locality);
    const visible = locality?.contains(edge);
    if (visible) locality!.removeEdge(edge);
    context.graph.reconnectEdge(edge, from, to);
    if (visible && locality!.contains(from) && locality!.contains(to)) locality!.addEdge(edge);
  }
  edge.setWeight(candidate.getWeight()); edge.setLength(candidate.getLength()); edge.setData(candidate.getData()); edge.setExtensions(candidate.getExtensions());
  edge.setVisual(validated); edge.setSemanticType(edit.type); edge.setLabel(edit.label);
}
