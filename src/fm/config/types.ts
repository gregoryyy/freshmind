/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

/** Freshmind configuration and presentation contracts; no DOM or YAML dependency. */
export const nodeShapes = ["rectangle", "rounded-rectangle", "ellipse", "circle", "parallelogram-right",
  "parallelogram-left", "double-trapezoid-horizontal", "double-trapezoid-vertical", "convex-rectangle",
  "concave-rectangle", "trapezoid", "inverted-trapezoid"] as const;
export type NodeShape = typeof nodeShapes[number];
export const dashStyles = ["none", "solid", "dashed", "long-dashed", "dash-dotted", "dash-double-dotted", "dotted"] as const;
export type DashStyle = typeof dashStyles[number];
export type CurveMode = "spider" | "lens" | "straight";
/** Style precedence from lowest to highest; callers cannot change it by reordering state input. */
export const interactionStates = ["fixed", "hover", "selected", "preselected", "activeCandidate"] as const;
export type InteractionState = typeof interactionStates[number];
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
export interface StrokeStyle { color: string; width: number; dash: DashStyle; }
/** Fully resolved presentation; dimensions/offsets are draw pixels and fonts are CSS strings. */
export interface NodeStyle {
  shape: NodeShape;
  fill: string;
  text: { color: string; font: string };
  stroke: StrokeStyle;
  label: { maxWidth: number; paddingX: number; paddingY: number };
  halo: { enabled: boolean; opacity: number };
}
/** Fully resolved curve/stroke/label style, independent of physical spring length and weight. */
export interface EdgeStyle {
  curve: CurveMode;
  stroke: StrokeStyle;
  arrow: { placement: "middle" | "end" | "none"; size: number };
  label: { color: string; font: string; offset: { x: number; y: number } };
}
/** Named partial style inheriting from another visual, with optional interaction overrides. */
export type VisualDefinition<T> = DeepPartial<T> & {
  extends?: string;
  states?: Partial<Record<InteractionState, DeepPartial<T>>>;
};
export interface VisualOverride<T> { type?: string; style?: DeepPartial<T>; }
export interface SemanticType { label: string; visual: string; queryKind?: "simple" | "lucene" | "lda"; }
/** Versioned type-profile contract shared by canonical YAML and the generated headless preset. */
export interface TypeConfiguration {
  format: "freshmind-types";
  version: 1;
  id: string;
  defaults: { nodeType: string; relationType: string; nodeVisual: string; edgeVisual: string };
  nodeTypes: Record<string, SemanticType>;
  relationTypes: Record<string, SemanticType>;
  nodeVisuals: Record<string, VisualDefinition<NodeStyle>>;
  edgeVisuals: Record<string, VisualDefinition<EdgeStyle>>;
}
export interface VisualItem<T> { getSemanticType(): string; getVisual(): VisualOverride<T>; }
export const defaultNodeStyle: NodeStyle = {
  shape: "rectangle", fill: "#a03000", text: { color: "#ffffff", font: "bold 13px Arial, sans-serif" },
  stroke: { color: "#000000", width: 1, dash: "solid" },
  label: { maxWidth: 150, paddingX: 8, paddingY: 4 }, halo: { enabled: true, opacity: 0.3 }
};
export const defaultEdgeStyle: EdgeStyle = {
  curve: "spider", stroke: { color: "#0000b0", width: 1, dash: "solid" },
  arrow: { placement: "middle", size: 5 },
  label: { color: "#0000b0", font: "12px Arial, sans-serif", offset: { x: 2, y: 12 } }
};
