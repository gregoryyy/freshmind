/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import type {Node} from "../model/index.js";
import type {ImmutableGraphEltSet} from "./types.js";

export class GESUtils {
  /**
   * Computes hop distances by breadth-first traversal, always including focus at distance zero.
   * The graph limits traversable edges; degree limits use complete endpoint adjacency.
   * @param radius Maximum included hop distance.
   * @param maxAddEdgeCount Maximum degree of a newly discovered node to include it.
   * @param maxExpandEdgeCount Maximum degree of a discovered node to traverse onward from it.
   * @param unidirectional Follow outgoing edges only when true.
   * @returns Distances in stable discovery order, used by locality animation.
   */
  static calculateDistances(graph: ImmutableGraphEltSet, focus: Node, radius: number, maxAddEdgeCount = 1000,
    maxExpandEdgeCount = 1000, unidirectional = false): Map<Node, number> {
    const distances = new Map<Node, number>([[focus, 0]]);
    const queue = [focus];
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      const distance = distances.get(node)!;
      if (distance >= radius) break;
      for (const edge of node.getEdges()) {
        if (unidirectional && edge.from !== node) continue;
        const adjacent = edge.getOtherEndpt(node);
        if (graph.contains(edge) && !distances.has(adjacent) && adjacent.edgeCount() <= maxAddEdgeCount) {
          distances.set(adjacent, distance + 1);
          if (adjacent.edgeCount() <= maxExpandEdgeCount) queue.push(adjacent);
        }
      }
    }
    return distances;
  }
  /** Returns the largest undirected component; equal sizes retain the first discovered one. */
  static getLargestConnectedSubgraph(graph: ImmutableGraphEltSet): Set<Node> {
    const visited = new Set<Node>();
    let largest = new Set<Node>();
    for (const node of graph.getNodes()) {
      if (visited.has(node)) continue;
      const component = new Set(this.calculateDistances(graph, node, Number.MAX_SAFE_INTEGER).keys());
      for (const member of component) visited.add(member);
      if (component.size > largest.size) largest = component;
    }
    return largest;
  }
}
