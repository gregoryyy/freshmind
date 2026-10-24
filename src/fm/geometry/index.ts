/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

export {createEdgeGeometry,routeEdges} from "./geometry.js";
export type {EdgeGeometry,Point,WorldToDraw} from "./geometry.js";
export {createNodeOutline,dashArray} from "./shapes.js";
export type {NodeOutline} from "./shapes.js";
export {createClusterBoundary} from "./cluster-boundary.js";
export type {ClusterBoundaryBox} from "./cluster-boundary.js";
export {nodeImportanceScale,validateNodeImportanceView} from "./importance.js";
export type {NodeImportanceViewSettings} from "./importance.js";
export {countNodeOverlaps,separateNodeOverlaps} from "./overlap.js";
export type {OverlapBox,OverlapOptions,OverlapResult} from "./overlap.js";
