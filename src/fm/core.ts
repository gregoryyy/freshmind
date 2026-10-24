/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

export { FreshNode, FreshEdge, FreshGraph, FreshmindDocument } from "./model.js";
export type { Annotation, Metadata, JsonValue, FreshNodeOptions, FreshEdgeOptions } from "./model.js";
export { TypeRegistry } from "./config/registry.js";
export { freshmind2014Configuration } from "./config/fm2014.js";
export * from "./config/types.js";
export { createEdgeGeometry, routeEdges } from "./rendering/geometry.js";
export type { EdgeGeometry, Point, WorldToDraw } from "./rendering/geometry.js";
export {createClusterBoundary} from "./rendering/cluster-boundary.js";
export {nodeImportanceScale} from "./rendering/importance.js";
export type {NodeImportanceViewSettings} from "./rendering/importance.js";
export type {ClusterBoundaryBox} from "./rendering/cluster-boundary.js";
export { createNodeOutline, dashArray } from "./rendering/shapes.js";
export { applyNodeEdit, applyRelationEdit } from "./editing/commands.js";
export type { NodeEdit, RelationEdit } from "./editing/commands.js";
export type { RelationEditContext } from "./editing/commands.js";
export type { DocumentRecord, DocumentView, NodeRecord, EdgeRecord, LoadOptions, SaveOptions } from "./io/types.js";
export { FreshmindNavigation } from "./navigation/controller.js";
export { keymap } from "./navigation/keymap.js";
export * from "./rfc/index.js";
export * from "./structure-view/index.js";
export {validateSubstructure, analyzeSubstructure, spanningTree, clusterStructure} from "./structures/model.js";
export type {GraphSubstructure, SubstructureGraph, SubstructureTopology} from "./structures/model.js";
export {clusterGraph, clusterToSubstructure, clusteringSignature} from "./clustering/index.js";
export type {ClusterOptions, ClusterResult, GraphCluster} from "./clustering/index.js";
export { collectCandidates, bestCandidateIndex, screenDirection } from "./navigation/candidates.js";
export type { Direction, CandidateKind, Candidate, Preselection, NavigationItem, NavigationState, NavigationOptions,
  NavigationSettings, NavigationHost, NavigationKey, NavigationActions, NavigationClock } from "./navigation/types.js";
