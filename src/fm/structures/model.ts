/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type {ImmutableGraphEltSet} from "../../tg/graph/index.js";
import type {Node, Edge} from "../../tg/model/index.js";
import {record, keys, text} from "../config/core.js";

/** Persistent membership; references semantic identities without owning a second adjacency graph. */
export interface GraphSubstructure {
  id: string;
  label: string;
  kind: "tree" | "dag" | "cluster";
  /** Hierarchical root for trees/DAGs; activation/navigation representative for clusters. */
  rootId: string;
  nodeIds: string[];
  edgeIds: string[];
}
export interface SubstructureGraph extends ImmutableGraphEltSet {
  getSubstructure(id: string): GraphSubstructure | null;
  getSubstructures(): GraphSubstructure[];
  getSubstructureRevision?():number;
}
export interface SubstructureTopology {
  nodes: Map<string, Node>;
  edges: Map<string, Edge>;
  levels: Map<string, number>;
}
const compare = (a:string,b:string) => a < b ? -1 : a > b ? 1 : 0;
function identities(value:unknown,path:string):string[] {
  if (!Array.isArray(value)) throw new TypeError(`${path}: expected a sequence`);
  value.forEach(id=>text(id,path));
  if (new Set(value).size!==value.length) throw new TypeError(`${path}: duplicate identity`);
  return [...value] as string[];
}
/**
 * Validates a rooted connected tree (ignoring semantic direction) or a rooted directed
 * acyclic graph, or an unordered cluster. Cluster membership may contain cycles or
 * disconnected members; its representative is not a hierarchical root.
 * @throws {TypeError} For unknown references, invalid kind-specific topology or extra fields.
 */
export function validateSubstructure(graph:ImmutableGraphEltSet,value:unknown):GraphSubstructure {
  const raw=record(value,"substructure");keys(raw,["id","label","kind","rootId","nodeIds","edgeIds"],"substructure");
  text(raw.id,"substructure.id");text(raw.label,"substructure.label");text(raw.rootId,"substructure.rootId");
  if(raw.kind!=="tree"&&raw.kind!=="dag"&&raw.kind!=="cluster")throw new TypeError("substructure.kind: expected tree, dag or cluster");
  const definition:GraphSubstructure={id:raw.id,label:raw.label,kind:raw.kind,rootId:raw.rootId,
    nodeIds:identities(raw.nodeIds,"substructure.nodeIds"),edgeIds:identities(raw.edgeIds,"substructure.edgeIds")};
  const topology=analyzeSubstructure(graph,definition);
  if(topology.levels.size!==definition.nodeIds.length)throw new TypeError("Substructure members must be reachable from their root");
  return definition;
}
/** Resolves selected relations; clusters have no hierarchy and expose neutral zero ranks. */
export function analyzeSubstructure(graph:ImmutableGraphEltSet,definition:GraphSubstructure):SubstructureTopology {
  const allNodes=new Map([...graph.getNodes()].map(n=>[n.getID()!,n])),allEdges=new Map([...graph.getEdges()].map(e=>[e.getID()!,e]));
  const nodes=new Map<string,Node>(),edges=new Map<string,Edge>();
  for(const id of definition.nodeIds){const node=allNodes.get(id);if(!node)throw new TypeError(`Unknown substructure node: ${id}`);nodes.set(id,node);}
  if(!nodes.has(definition.rootId))throw new TypeError("Substructure root must be a member");
  const next=new Map([...nodes.keys()].map(id=>[id,[] as string[]])),degree=new Map([...nodes.keys()].map(id=>[id,0]));
  for(const id of definition.edgeIds) {
    const edge=allEdges.get(id);if(!edge)throw new TypeError(`Unknown substructure relation: ${id}`);
    const from=edge.from.getID()!,to=edge.to.getID()!;
    if(!nodes.has(from)||!nodes.has(to)||from===to)throw new TypeError("Structural relations require distinct member endpoints");
    edges.set(id,edge);next.get(from)!.push(to);degree.set(to,degree.get(to)!+1);
    if(definition.kind==="tree")next.get(to)!.push(from);
  }
  const levels=new Map<string,number>([[definition.rootId,0]]);
  if(definition.kind==="cluster") {
    for(const id of nodes.keys())levels.set(id,0);
  } else if(definition.kind==="tree") {
    if(edges.size!==nodes.size-1)throw new TypeError("A tree requires exactly one fewer structural relation than members");
    const queue=[definition.rootId];for(let i=0;i<queue.length;i++)for(const id of next.get(queue[i])!)if(!levels.has(id)){levels.set(id,levels.get(queue[i])!+1);queue.push(id);}
  } else {
    const queue=[...degree.keys()].filter(id=>degree.get(id)===0).sort(compare);let visited=0;
    for(let i=0;i<queue.length;i++) {
      const id=queue[i];visited++;
      for(const to of next.get(id)!) {
        if(levels.has(id))levels.set(to,Math.max(levels.get(to)??0,levels.get(id)!+1));
        degree.set(to,degree.get(to)!-1);if(degree.get(to)===0)queue.push(to);
      }
    }
    if(visited!==nodes.size)throw new TypeError("A DAG cannot contain directed cycles");
  }
  return {nodes,edges,levels};
}
/** Stores an unordered member set with all current internal non-loop semantic relations. */
export function clusterStructure(graph:ImmutableGraphEltSet,nodeIds:Iterable<string>,representativeId:string,id:string,label=id):GraphSubstructure {
  const members=new Set(nodeIds),edgeIds=[...graph.getEdges()]
    .filter(edge=>edge.from!==edge.to&&members.has(edge.from.getID()!)&&members.has(edge.to.getID()!)).map(edge=>edge.getID()!);
  return validateSubstructure(graph,{id,label,kind:"cluster",rootId:representativeId,nodeIds:[...members],edgeIds});
}
/**
 * Selects a deterministic BFS spanning tree within the supplied members. Extra semantic
 * relations are retained in the graph, but do not become tree constraints.
 */
export function spanningTree(graph:ImmutableGraphEltSet,nodeIds:Iterable<string>,rootId:string,id:string,label=id,eligibleEdgeIds?:ReadonlySet<string>):GraphSubstructure {
  const members=new Set(nodeIds),nodes=new Map([...graph.getNodes()].map(n=>[n.getID()!,n]));
  if(!members.has(rootId)||[...members].some(n=>!nodes.has(n)))throw new TypeError("Tree members and root must belong to the graph");
  const adjacency=new Map([...members].map(n=>[n,[] as {node:string;edge:string}[]]));
  for(const edge of graph.getEdges()) {
    if(eligibleEdgeIds&&!eligibleEdgeIds.has(edge.getID()!))continue;
    const a=edge.from.getID()!,b=edge.to.getID()!;
    if(a===b||!members.has(a)||!members.has(b))continue;
    adjacency.get(a)!.push({node:b,edge:edge.getID()!});adjacency.get(b)!.push({node:a,edge:edge.getID()!});
  }
  for(const neighbors of adjacency.values())neighbors.sort((a,b)=>compare(a.node,b.node)||compare(a.edge,b.edge));
  const queue=[rootId],seen=new Set(queue),edgeIds:string[]=[];
  for(let i=0;i<queue.length;i++)for(const neighbor of adjacency.get(queue[i])!)if(!seen.has(neighbor.node)){
    seen.add(neighbor.node);queue.push(neighbor.node);edgeIds.push(neighbor.edge);
  }
  return validateSubstructure(graph,{id,label,kind:"tree",rootId,nodeIds:[...members],edgeIds});
}
