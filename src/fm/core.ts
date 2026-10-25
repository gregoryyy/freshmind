/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

export {FreshNode,FreshEdge,FreshGraph,FreshmindDocument} from "./model/index.js";
export type {Annotation,Metadata,JsonValue,FreshNodeOptions,FreshEdgeOptions} from "./model/index.js";
export {TypeRegistry,freshmind2014Configuration,nodeShapes,dashStyles,interactionStates,defaultNodeStyle,defaultEdgeStyle} from "./config/core.js";
export type {NodeShape,DashStyle,CurveMode,InteractionState,DeepPartial,StrokeStyle,NodeStyle,EdgeStyle,
  NodeImportanceMode,NodeImportanceStyle,VisualDefinition,VisualOverride,SemanticType,TypeConfiguration,VisualItem} from "./config/core.js";
export {createEdgeGeometry,routeEdges,createClusterBoundary,nodeImportanceScale,createNodeOutline,dashArray} from "./geometry/index.js";
export type {EdgeGeometry,Point,WorldToDraw,NodeImportanceViewSettings,ClusterBoundaryBox} from "./geometry/index.js";
export {countNodeOverlaps,separateNodeOverlaps} from "./geometry/index.js";
export type {OverlapBox,OverlapOptions,OverlapResult} from "./geometry/index.js";
export {placeRelationLabels} from "./geometry/index.js";
export type {RelationLabelPlacement,RelationLabelBox,RelationLabelOptions,RelationLabelResult} from "./geometry/index.js";
export {applyNodeEdit,applyRelationEdit,createLinkedNode,linkNodes,GraphClipboard} from "./edit/index.js";
export type {NodeEdit,RelationEdit,RelationEditContext,CreationDefaults,LinkedCreation} from "./edit/index.js";
export type {DocumentRecord,DocumentView,NodeRecord,EdgeRecord,LoadOptions,SaveOptions} from "./io/index.js";
export {FreshmindNavigation,keymap,collectCandidates,bestCandidateIndex,screenDirection} from "./navigate/index.js";
export type {Direction,CandidateKind,Candidate,Preselection,NavigationItem,NavigationState,NavigationOptions,
  NavigationSettings,NavigationHost,NavigationKey,NavigationActions,NavigationClock} from "./navigate/index.js";
export * from "./rfc/index.js";
export * from "./ir/index.js";
export * from "../ir/topics/index.js";
export * from "./struct-view/index.js";
export {validateSubstructure,analyzeSubstructure,spanningTree,clusterStructure} from "./struct/index.js";
export type {GraphSubstructure,SubstructureGraph,SubstructureTopology} from "./struct/index.js";
export {clusterGraph,clusterToSubstructure,clusteringSignature} from "./cluster/index.js";
export type {ClusterOptions,ClusterResult,GraphCluster} from "./cluster/index.js";
