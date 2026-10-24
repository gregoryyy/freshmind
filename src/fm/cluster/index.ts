/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import {UndirectedGraph} from "graphology";
import louvain from "graphology-communities-louvain";
import {connectedComponents} from "graphology-components";
import type {ImmutableGraphEltSet} from "../../tg/graph/index.js";
import type {Edge} from "../../tg/model/index.js";
import {spanningTree,clusterStructure} from "../struct/index.js";
import type {GraphSubstructure} from "../struct/index.js";

export interface ClusterOptions {
  algorithm?: "louvain" | "components";
  resolution?: number;
  /** Opt-in relation weights; node/visual weights never implicitly affect clustering. */
  weighted?: boolean;
}
export interface GraphCluster {id:string; nodeIds:string[]; edgeIds:string[]; rootId:string;}
export interface ClusterResult {
  algorithm:"louvain"|"components"; resolution:number; weighted:boolean;
  signature:string; clusters:GraphCluster[]; modularity:number|null;
}
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
const edgeWeight=(edge:Edge):number=>(edge as Edge&{getWeight?:()=>number}).getWeight?.()??1;
/** Fingerprints identities/topology and optional clustering weights, excluding layout and view state. */
export function clusteringSignature(graph:ImmutableGraphEltSet,weighted=false):string {
  return JSON.stringify([[...graph.getNodes()].map(n=>n.getID()!).sort(compare),
    [...graph.getEdges()].map(e=>[e.getID(),e.from.getID(),e.to.getID(),weighted?edgeWeight(e):1]).sort((a,b)=>compare(a[0] as string,b[0] as string))]);
}
/**
 * Detects communities on a detached undirected projection. Reciprocal/parallel relations
 * sum their unit or explicit weights; loops and zero-weight links are ignored. Stable
 * insertion order and nonrandom Louvain walks make repeated runs reproducible.
 * Communities are split into connected pieces so every offered cluster can form a tree.
 */
export function clusterGraph(graph:ImmutableGraphEltSet,options:ClusterOptions={}):ClusterResult {
  const algorithm=options.algorithm??"louvain",resolution=options.resolution??1,weighted=options.weighted??false;
  if(algorithm!=="louvain"&&algorithm!=="components")throw new TypeError("Unknown clustering algorithm");
  if(!Number.isFinite(resolution)||resolution<=0)throw new RangeError("Clustering resolution must be finite and positive");
  if(typeof weighted!=="boolean")throw new TypeError("Clustering weighted must be boolean");
  const projection=new UndirectedGraph();
  for(const id of [...graph.getNodes()].map(n=>n.getID()!).sort(compare))projection.addNode(id);
  const eligible=new Map<string,{from:string;to:string}>();
  for(const edge of [...graph.getEdges()].sort((a,b)=>compare(a.getID()!,b.getID()!))) {
    const a=edge.from.getID()!,b=edge.to.getID()!,weight=weighted?edgeWeight(edge):1;
    if(!Number.isFinite(weight)||weight<0)throw new RangeError("Clustering weights must be finite and nonnegative");
    if(a===b||weight===0)continue;
    eligible.set(edge.getID()!,{from:a,to:b});
    if(projection.hasEdge(a,b))projection.updateEdgeAttribute(a,b,"weight",(old:number)=>old+weight);
    else projection.addEdge(a,b,{weight});
  }
  let groups:string[][]=[],modularity:number|null=null;
  if(algorithm==="components"||projection.size===0)groups=connectedComponents(projection);
  else {
    const output=louvain.detailed(projection,{resolution,randomWalk:false,getEdgeWeight:"weight"});modularity=output.modularity;
    const communities=new Map<number,string[]>();
    for(const id of projection.nodes()) {const key=output.communities[id];if(!communities.has(key))communities.set(key,[]);communities.get(key)!.push(id);}
    for(const members of communities.values()) {
      const unseen=new Set(members);
      while(unseen.size) {
        const queue=[unseen.values().next().value!];unseen.delete(queue[0]);
        for(let i=0;i<queue.length;i++)for(const next of projection.neighbors(queue[i]))if(unseen.delete(next))queue.push(next);
        groups.push(queue);
      }
    }
  }
  groups=groups.map(ids=>ids.sort(compare)).sort((a,b)=>b.length-a.length||compare(a[0],b[0]));
  const clusters=groups.map((nodeIds,index)=>{
    const members=new Set(nodeIds),scores=new Map(nodeIds.map(id=>[id,0]));
    for(const id of nodeIds)for(const next of projection.neighbors(id))if(members.has(next))scores.set(id,scores.get(id)!+projection.getEdgeAttribute(id,next,"weight"));
    const rootId=[...nodeIds].sort((a,b)=>scores.get(b)!-scores.get(a)!||compare(a,b))[0];
    return {id:`cluster-${index+1}`,nodeIds,rootId,edgeIds:[...eligible].filter(([,e])=>members.has(e.from)&&members.has(e.to)).map(([id])=>id)};
  });
  return {algorithm,resolution,weighted,signature:clusteringSignature(graph,weighted),clusters,modularity};
}
/** Stores a current proposal as a cluster, or explicitly as a spanning tree, without altering semantic edges. */
export function clusterToSubstructure(graph:ImmutableGraphEltSet,result:ClusterResult,clusterId:string,id:string,label=id,rootId?:string,kind:"cluster"|"tree"="cluster"):GraphSubstructure {
  if(clusteringSignature(graph,result.weighted)!==result.signature)throw new Error("Graph changed; detect clusters again");
  const cluster=result.clusters.find(c=>c.id===clusterId);if(!cluster)throw new Error("Unknown cluster");
  if(kind==="cluster")return clusterStructure(graph,cluster.nodeIds,rootId??cluster.rootId,id,label);
  if(kind!=="tree")throw new TypeError("Cluster conversion requires cluster or tree kind");
  return spanningTree(graph,cluster.nodeIds,rootId??cluster.rootId,id,label,new Set(cluster.edgeIds));
}
