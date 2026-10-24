/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import type {Node,Edge} from "../model/index.js";
import type {GraphEltSet} from "./graph.js";

export type TGForEachNode = ((node: Node) => void) | { forEachNode(node: Node): void };
export type TGForEachEdge = ((edge: Edge) => void) | { forEachEdge(edge: Edge): void };
export type TGForEachNodePair = ((first: Node, second: Node) => void) | {
  forEachNodePair(first: Node, second: Node): void;
  beforeInnerLoop?(node: Node): void;
  afterInnerLoop?(node: Node): void;
};

/** Read-only membership/traversal contract; node coordinates remain mutable, as in Java. */
export type ImmutableGraphEltSet = Pick<GraphEltSet,
  "nodeCount" | "nodeNum" | "edgeCount" | "edgeNum" | "nodeAt" | "edgeAt" | "getNodes" | "getEdges"
  | "getFirstNode" | "getRandomNode" | "contains" | "findNode" | "findNodesByLabel" | "findNodeLabelContaining"
  | "findEdge" | "forAllNodes" | "forAllEdges" | "forAllNodePairs">;
