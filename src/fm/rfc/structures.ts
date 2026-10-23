/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type {Node, Edge} from "../../tg/model.js";
import type {ImmutableGraphEltSet} from "../../tg/graph.js";
import {analyzeSubstructure} from "../structures/model.js";
import type {GraphSubstructure, SubstructureTopology} from "../structures/model.js";
import {collectFocalStar} from "./forces.js";
import {rfcNodeImportance,rfcRelationStrength,rfcTargetStrengths} from "./importance.js";
import type {CoordinateWeights, FocalStar} from "./types.js";

export interface RfcProjection {
  root:Node; definition:GraphSubstructure|null; nodes:Node[]; edges:Edge[];
  targetWeights:Map<Node,number>;
  rootStar:FocalStar; stars:FocalStar[]; targets:Map<Node,{x:number;y:number}>;
}
/** Constructs a constrained star without inserting synthetic adjacency into the semantic graph. */
export function constrainedStar(center:Node,edges:Iterable<Edge>,weights:CoordinateWeights):FocalStar {
  const branches=new Map<Node,Edge>();
  for(const edge of edges)if((edge.from===center||edge.to===center)&&rfcRelationStrength(edge)>0) {
    const node=edge.getOtherEndpt(center);if(node===center)continue;
    const previous=branches.get(node);if(!previous||edge.getID()!<previous.getID()!)branches.set(node,edge);
  }
  return {center,coordinateWeights:weights,branches:[...branches].map(([node,edge])=>({node,edge,
    angle:Math.atan2(Math.sqrt(weights.y)*(node.y-center.y),Math.sqrt(weights.x)*(node.x-center.x))}))
    .sort((a,b)=>a.angle-b.angle||(a.node.getID()!<b.node.getID()!?-1:1))};
}
/** Projects persistent membership onto visible members, retaining complete-graph DAG ranks and slots. */
export function projectRfcStructure(complete:ImmutableGraphEltSet,visible:ImmutableGraphEltSet,root:Node,
  definition:GraphSubstructure|null,weights:CoordinateWeights,cachedTopology?:SubstructureTopology):RfcProjection {
  if(!definition) {
    const rootStar=collectFocalStar(visible,root,weights);
    return {root,definition,nodes:[root,...rootStar.branches.map(b=>b.node)].filter(n=>rfcNodeImportance(n)>0),edges:rootStar.branches.map(b=>b.edge),targetWeights:new Map(),rootStar,stars:[rootStar],targets:new Map()};
  }
  const topology=cachedTopology??analyzeSubstructure(complete,definition),definitionEdges=[...topology.edges.values()];
  const edges=definitionEdges.filter(e=>visible.contains(e)&&visible.contains(e.from)&&visible.contains(e.to)&&rfcRelationStrength(e)>0);
  const eligible=new Set(edges.flatMap(e=>[e.from,e.to]));
  if(rfcNodeImportance(root)>0)eligible.add(root);
  const targetWeights=definition.kind==="dag"?rfcTargetStrengths(root,definitionEdges):new Map<Node,number>();
  for(const [node,strength] of targetWeights)if(strength>0)eligible.add(node);
  const nodes=[...topology.nodes.values()].filter(n=>visible.contains(n)&&eligible.has(n));
  const rootStar=constrainedStar(root,edges,weights),targets=new Map<Node,{x:number;y:number}>();
  if(definition.kind==="dag") {
    const layers=new Map<number,string[]>();
    for(const [id,rank] of topology.levels){if(!layers.has(rank))layers.set(rank,[]);layers.get(rank)!.push(id);}
    for(const [rank,ids] of layers) {
      ids.sort();for(const [index,id] of ids.entries())if(visible.contains(topology.nodes.get(id)!)&&eligible.has(topology.nodes.get(id)!))
        targets.set(topology.nodes.get(id)!,{x:(index-(ids.length-1)/2)*1.25/Math.sqrt(weights.x),y:rank/Math.sqrt(weights.y)});
    }
  }
  return {root,definition,nodes,edges,targetWeights,rootStar,stars:definition.kind==="tree"?nodes.map(n=>constrainedStar(n,edges,weights)):[],targets};
}
