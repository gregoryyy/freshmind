/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import type {Node, Edge} from "../../tg/model/index.js";

/** Reads live Freshmind importance; ordinary TouchGraph objects retain unit reinforcement strength. */
function importance(item:object,defaultWeight:number):number {
  const weighted=item as {getWeight?:()=>number};
  const weight=typeof weighted.getWeight==="function"?weighted.getWeight():defaultWeight;
  if(!Number.isFinite(weight)||weight<0)throw new RangeError("RFC importance must be finite and nonnegative");
  // Multiplying after division avoids overflow at Number.MAX_VALUE.
  return 2*(weight/(weight+defaultWeight));
}
/** Bounded node importance in [0,2]: default weight 1 gives exactly one; zero disables incident constraints. */
export function rfcNodeImportance(node:Node):number {return importance(node,1);}
/** Bounded relation importance in [0,2]: default weight 10 gives exactly one. */
export function rfcEdgeImportance(edge:Edge):number {return importance(edge,10);}
/** Symmetric stiffness factor √s(u)√s(v)s(edge); no mass, spring target or base TouchGraph force changes. */
export function rfcRelationStrength(edge:Edge):number {
  return Math.min(4,Math.sqrt(rfcNodeImportance(edge.from))*Math.sqrt(rfcNodeImportance(edge.to))*rfcEdgeImportance(edge));
}
/** DAG templates use √s(root) times each member's mean incoming relation strength, retaining zero terms. */
export function rfcTargetStrengths(root:Node,edges:readonly Edge[]):Map<Node,number> {
  const incoming=new Map<Node,{sum:number;count:number}>();
  for(const edge of edges) {
    const record=incoming.get(edge.to)??{sum:0,count:0};
    record.sum+=rfcRelationStrength(edge);record.count++;incoming.set(edge.to,record);
  }
  const rootScale=Math.sqrt(rfcNodeImportance(root));
  return new Map([...incoming].map(([node,{sum,count}])=>[node,rootScale*(sum/count)]));
}
