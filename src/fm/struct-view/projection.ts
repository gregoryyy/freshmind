/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import type {ImmutableGraphEltSet} from "../../tg/graph/index.js";
import type {FreshNode,FreshEdge} from "../model/index.js";

export interface StructuralViewSettings {
  enabled:boolean;
  hiddenNodeTypes:string[];
  hiddenRelationTypes:string[];
  aggregateTypes:string[];
  /** Hop radius around viewing/RFC centers whose detail is retained by aggregation. */
  detailRadius:number;
}
export interface AggregationGroup {parentId:string;type:string;nodeIds:string[];}
export interface StructuralProjection {
  nodes:FreshNode[];edges:FreshEdge[];groups:AggregationGroup[];
  filteredNodeIds:string[];filteredEdgeIds:string[];aggregatedNodeIds:string[];
}
export const structuralViewDefaults:StructuralViewSettings={enabled:false,hiddenNodeTypes:[],hiddenRelationTypes:[],aggregateTypes:[],detailRadius:1};

/** Validates an entire update before it can affect membership; unknown semantic types are allowed. */
export function validateStructuralView(value:StructuralViewSettings):StructuralViewSettings {
  if(typeof value.enabled!=="boolean")throw new TypeError("Structural view enabled must be boolean");
  if(!Number.isInteger(value.detailRadius)||value.detailRadius<0||value.detailRadius>6)throw new RangeError("Detail radius must be an integer in 0–6");
  const result={...value};
  for(const key of ["hiddenNodeTypes","hiddenRelationTypes","aggregateTypes"] as const) {
    if(!Array.isArray(value[key])||value[key].some(type=>typeof type!=="string"||!type.trim()))throw new TypeError(`${key} must contain nonempty type IDs`);
    result[key]=[...new Set(value[key])].sort();
  }
  return result;
}

/**
 * Derives a reversible typed view from the current neighborhood, using original objects.
 * Only single-neighbor semantic leaves can aggregate: hidden relations, locality truncation,
 * reciprocal/parallel edges and filtering must not turn a bridge or cycle into a leaf.
 * Aggregation is one pass, never a recursive collapse or a synthetic rewiring of relations.
 * Explicit type filters apply even within focal memberships; aggregation preserves protected IDs.
 */
export function projectStructuralView(complete:ImmutableGraphEltSet,source:ImmutableGraphEltSet,settings:StructuralViewSettings,
  centers:readonly string[]=[],protectedIds:ReadonlySet<string>=new Set()):StructuralProjection {
  const sourceNodes=[...source.getNodes()] as FreshNode[],sourceEdges=[...source.getEdges()] as FreshEdge[];
  const nodes=sourceNodes.filter(n=>complete.contains(n)&&(!settings.enabled||!settings.hiddenNodeTypes.includes(n.getSemanticType())));
  const kept=new Set(nodes),edges=sourceEdges.filter(e=>complete.contains(e)&&kept.has(e.from)&&kept.has(e.to)&&
    (!settings.enabled||!settings.hiddenRelationTypes.includes(e.getSemanticType())));
  const edgeSet=new Set(edges);
  const result:StructuralProjection={nodes,edges,groups:[],filteredNodeIds:sourceNodes.filter(n=>!kept.has(n)).map(n=>n.getID()!),
    filteredEdgeIds:sourceEdges.filter(e=>!edgeSet.has(e)).map(e=>e.getID()!),aggregatedNodeIds:[]};
  if(!settings.enabled||!settings.aggregateTypes.length)return result;
  const adjacency=new Map(nodes.map(n=>[n,new Set<FreshNode>()]));
  for(const e of edges)if(e.from!==e.to){adjacency.get(e.from)!.add(e.to);adjacency.get(e.to)!.add(e.from);}
  const protectedNodes=new Set(nodes.filter(n=>protectedIds.has(n.getID()!)));
  let frontier=nodes.filter(n=>centers.includes(n.getID()!));
  const visited=new Set(frontier);
  for(const n of frontier)protectedNodes.add(n);
  for(let depth=0;depth<settings.detailRadius;depth++) {
    const next:FreshNode[]=[];
    for(const n of frontier)for(const neighbor of adjacency.get(n)!)if(!visited.has(neighbor)){visited.add(neighbor);protectedNodes.add(neighbor);next.push(neighbor);}
    frontier=next;
  }
  const candidates=new Map<FreshNode,FreshNode>();
  for(const node of nodes) {
    if(protectedNodes.has(node)||!settings.aggregateTypes.includes(node.getSemanticType()))continue;
    const relations=[...node.getEdges()].filter(e=>complete.contains(e));
    if(relations.some(e=>e.from===e.to))continue;
    const neighbors=new Set(relations.map(e=>e.getOtherEndpt(node) as FreshNode));
    if(neighbors.size!==1)continue;
    const parent=[...neighbors][0];
    if(kept.has(parent)&&adjacency.get(node)!.has(parent))candidates.set(node,parent);
  }
  const groups=new Map<string,AggregationGroup>(),aggregated=new Set<FreshNode>();
  for(const [node,parent] of candidates) {
    // A two-node component of equally eligible leaves has no unambiguous parent.
    if(candidates.has(parent))continue;
    const type=node.getSemanticType(),key=JSON.stringify([parent.getID(),type]);
    if(!groups.has(key))groups.set(key,{parentId:parent.getID()!,type,nodeIds:[]});
    groups.get(key)!.nodeIds.push(node.getID()!);aggregated.add(node);
  }
  result.nodes=nodes.filter(n=>!aggregated.has(n));result.edges=edges.filter(e=>!aggregated.has(e.from)&&!aggregated.has(e.to));
  result.groups=[...groups.values()].sort((a,b)=>a.parentId.localeCompare(b.parentId)||a.type.localeCompare(b.type));
  result.aggregatedNodeIds=[...aggregated].map(n=>n.getID()!);
  return result;
}
