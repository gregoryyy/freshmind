/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import type {FreshGraph} from "../model/index.js";

export interface RadiusNode {id: string; label: string; type: string; weight: number;}
export interface RadiusEdge {id: string; from: string; to: string; label: string; type: string; weight: number; direction: "directed" | "undirected";}
/** A permitted snapshot only. Missing adjacency must be declared, never interpreted as an empty graph. */
export interface RadiusSnapshot {
  generation: string; nodes: readonly RadiusNode[]; edges: readonly RadiusEdge[];
  complete: boolean; completeAdjacency?: readonly string[];
}
export interface RadiusPage<T> {
  items: T[]; offset: number; limit: number; knownItems: number; total?: number;
  /** More data or a later loaded page exists; nextOffset is present only for another loaded page. */
  hasMore: boolean; nextOffset?: number; complete: boolean;
}
export type RadiusWing = "incoming" | "outgoing" | "undirected";
export interface RadiusOccurrence {
  id: string; nodeId: string; rowId: string; wing: RadiusWing;
  level: "second-hop" | "second-step-candidate"; edgeIds: string[];
}
export interface RadiusRow {
  id: string; nodeId: string; centerEdgeIds: string[]; selfEdgeIds: string[]; crossEdgeIds: string[];
  incoming: RadiusPage<RadiusOccurrence>; outgoing: RadiusPage<RadiusOccurrence>; undirected: RadiusPage<RadiusOccurrence>;
}
export interface RadiusOptions {
  direction?: "both" | "outgoing" | "incoming"; nodeTypes?: readonly string[]; relationTypes?: readonly string[];
  rowOffset?: number; rowLimit?: number; cellLimit?: number;
  cellOffsets?: Readonly<Record<string, Partial<Record<RadiusWing, number>>>>;
  otherOffset?: number; otherLimit?: number;
}
export interface RadiusProjection {
  generation: string; centerId: string; direction: "both" | "outgoing" | "incoming";
  directNodeIds: string[]; nodes: RadiusNode[]; edgeRecords: RadiusEdge[]; centerSelfEdgeIds: string[];
  rows: RadiusPage<RadiusRow>; otherRelations: RadiusPage<string>;
  counts: {directNodes: number; secondStepNodes: number; occurrences: number; edgeRecords: number; complete: boolean};
  confirmedSecondHop: boolean;
  /** Canonical witness table; occurrences do not duplicate high-degree witness arrays. */
  witnesses: Record<string, readonly string[]>;
}
const maxNodes = 50_000, maxEdges = 200_000;
function string(value: unknown, name: string, empty = false): asserts value is string {
  if (typeof value !== "string" || !empty && !value.length) throw new TypeError(`${name}: expected ${empty ? "a" : "a nonempty"} string`);
}
function integer(value: number, name: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name}: expected integer ${min}…${max}`);
  return value;
}
function types(values: readonly string[] | undefined, name: string): Set<string> | undefined {
  if (values === undefined) return;
  if (!Array.isArray(values)) throw new TypeError(`${name}: expected a sequence`);
  if(values.length>maxEdges)throw new RangeError(`${name}: too many entries`);
  for (const value of values) string(value, name);
  return new Set(values);
}
function compare(a: string, b: string): number {return a < b ? -1 : a > b ? 1 : 0;}
function nodeOrder(a: RadiusNode, b: RadiusNode): number {return compare(a.type,b.type) || compare(a.label,b.label) || compare(a.id,b.id);}
function page<T>(items: T[], offset: number, limit: number, complete: boolean): RadiusPage<T> {
  const next = offset + limit;
  return {items: items.slice(offset,next), offset, limit, knownItems: items.length, ...(complete ? {total: items.length} : {}),
    hasMore: next < items.length || !complete, ...(next < items.length ? {nextOffset: next} : {}), complete};
}
/** Captures identities and inspectable weights only; no coordinates, graph objects or metadata escape. */
export function captureRadiusSnapshot(graph: FreshGraph, generation: string): RadiusSnapshot {
  if (graph.nodeCount() > maxNodes || graph.edgeCount() > maxEdges) throw new RangeError("Radius-two snapshot exceeds the local work limit (50,000 nodes / 200,000 relations)");
  string(generation,"generation");
  return {generation, complete: true,
    nodes: [...graph.getNodes()].map(n=>({id:n.getID()!,label:n.getLabel(),type:n.getSemanticType(),weight:n.getWeight()})),
    // FM edges are directed semantic records; a missing painted arrow does not imply undirected data.
    edges: [...graph.getEdges()].map(e=>({id:e.getID()!,from:e.from.getID()!,to:e.to.getID()!,label:e.getLabel(),type:e.getSemanticType(),weight:e.getWeight(),direction:"directed"}))};
}
/** Detached, deterministic path witnesses; paging never changes shortest-hop membership. */
export function projectRadiusTwo(source: RadiusSnapshot, centerId: string, options: RadiusOptions = {}): RadiusProjection {
  string(source.generation,"generation");
  if (!Array.isArray(source.nodes) || !Array.isArray(source.edges) || source.nodes.length > maxNodes || source.edges.length > maxEdges) throw new RangeError("Radius-two source exceeds the local work limit or has invalid sequences");
  if (typeof source.complete !== "boolean") throw new TypeError("Snapshot completeness must be declared");
  const nodes = new Map<string,RadiusNode>(), edges = new Map<string,RadiusEdge>(), adjacency = new Map<string,RadiusEdge[]>(), eligibleEdges = new Set<string>();
  let textWork=source.generation.length;
  const boundText=(values:string[])=>{for(const value of values)textWork+=value.length;if(textWork>8_000_000)throw new RangeError("Radius-two text exceeds the local 8-million-character work limit");};
  for (const n of source.nodes) {
    string(n.id,"node.id");string(n.label,"node.label",true);string(n.type,"node.type");
    if (!Number.isFinite(n.weight) || n.weight < 0 || nodes.has(n.id)) throw new TypeError("Invalid node weight or duplicate identity");
    if(n.id.length>4096)throw new RangeError("Radius-two identities are limited to 4096 characters");boundText([n.id,n.label,n.type]);
    nodes.set(n.id,{id:n.id,label:n.label,type:n.type,weight:n.weight});adjacency.set(n.id,[]);
  }
  if (!nodes.has(centerId)) throw new Error("Center must belong to the snapshot");
  const nodeTypes=types(options.nodeTypes,"nodeTypes"),relationTypes=types(options.relationTypes,"relationTypes");
  for (const e of source.edges) {
    for (const value of [e.id,e.from,e.to,e.type]) string(value,"relation field");string(e.label,"edge.label",true);
    if (!nodes.has(e.from) || !nodes.has(e.to) || edges.has(e.id) || !["directed","undirected"].includes(e.direction) || !Number.isFinite(e.weight) || e.weight < 0) throw new TypeError("Invalid relation identity, endpoint, direction or weight");
    if(e.id.length>4096)throw new RangeError("Radius-two identities are limited to 4096 characters");boundText([e.id,e.from,e.to,e.label,e.type]);
    const copy: RadiusEdge={id:e.id,from:e.from,to:e.to,label:e.label,type:e.type,weight:e.weight,direction:e.direction};edges.set(e.id,copy);
    const eligibleNode=(id:string)=>id===centerId || !nodeTypes || nodeTypes.has(nodes.get(id)!.type);
    if ((!relationTypes || relationTypes.has(e.type)) && eligibleNode(e.from) && eligibleNode(e.to)) {
      eligibleEdges.add(e.id);adjacency.get(e.from)!.push(copy);if (e.from !== e.to) adjacency.get(e.to)!.push(copy);
    }
  }
  const completeIds=types(source.completeAdjacency,"completeAdjacency") ?? new Set<string>();
  for (const id of completeIds) if (!nodes.has(id)) throw new Error("Unknown complete-adjacency identity");
  const complete=(id:string)=>source.complete || completeIds.has(id),direction=options.direction??"both";
  if (!["both","outgoing","incoming"].includes(direction)) throw new TypeError("Invalid traversal direction");
  const follows=(edge:RadiusEdge,from:string)=>edge.direction==="undirected" || direction==="both" || (direction==="outgoing" ? edge.from===from : edge.to===from);
  const other=(edge:RadiusEdge,from:string)=>edge.from===from ? edge.to : edge.from;
  const sortedIds=(ids:Iterable<string>)=>[...ids].sort((a,b)=>nodeOrder(nodes.get(a)!,nodes.get(b)!));
  const first=new Set(adjacency.get(centerId)!.filter(e=>follows(e,centerId)).map(e=>other(e,centerId)).filter(id=>id!==centerId));
  const second=new Set<string>();
  for (const id of first) for (const e of adjacency.get(id)!) {
    const candidate=other(e,id);if (follows(e,id) && candidate!==centerId && !first.has(candidate) && candidate!==id) second.add(candidate);
  }
  const rowOffset=integer(options.rowOffset??0,"rowOffset",0),rowLimit=integer(options.rowLimit??12,"rowLimit",1,100);
  const cellLimit=integer(options.cellLimit??4,"cellLimit",1,100),otherOffset=integer(options.otherOffset??0,"otherOffset",0),otherLimit=integer(options.otherLimit??20,"otherLimit",1,100);
  const offsets=options.cellOffsets??{};
  for (const [id,wingOffsets] of Object.entries(offsets)) {
    if (!first.has(id) || !wingOffsets || typeof wingOffsets!=="object" || Array.isArray(wingOffsets)) throw new Error("Cell offsets must reference a current direct neighbor");
    for (const [wing,offset] of Object.entries(wingOffsets)) {
      if (!["incoming","outgoing","undirected"].includes(wing)) throw new Error("Invalid cell wing");integer(offset!,"cellOffset",0);
    }
  }
  const accounted=new Set<string>(),witnesses=new Map<string,Set<string>>(),occurrences:RadiusOccurrence[]=[];
  const centerSelf=adjacency.get(centerId)!.filter(e=>e.from===centerId && e.to===centerId).map(e=>e.id).sort(compare);centerSelf.forEach(id=>accounted.add(id));
  const rowDrafts=sortedIds(first).map(id=>{
    const centerEdges:string[]=[],selfEdges:string[]=[],crossEdges:string[]=[],bundles=new Map<string,RadiusOccurrence>();
    for (const edge of adjacency.get(id)!) {
      const target=other(edge,id);
      if (target===centerId && follows(edge,centerId)) centerEdges.push(edge.id);
      else if (target===id) selfEdges.push(edge.id);
      else if (first.has(target)) crossEdges.push(edge.id);
      else if (second.has(target) && follows(edge,id)) {
        const wing:RadiusWing=edge.direction==="undirected"?"undirected":edge.from===id?"outgoing":"incoming";
        const occurrenceId=JSON.stringify(["radius-two",id,wing,target]);
        if (!bundles.has(occurrenceId)) bundles.set(occurrenceId,{id:occurrenceId,nodeId:target,rowId:id,wing,
          level:complete(centerId)?"second-hop":"second-step-candidate",edgeIds:[]});
        bundles.get(occurrenceId)!.edgeIds.push(edge.id);
        if (!witnesses.has(target)) witnesses.set(target,new Set());witnesses.get(target)!.add(id);
      }
    }
    const cells=[...bundles.values()].sort((a,b)=>nodeOrder(nodes.get(a.nodeId)!,nodes.get(b.nodeId)!) || compare(a.wing,b.wing));
    for (const cell of cells) {cell.edgeIds.sort(compare);cell.edgeIds.forEach(edgeId=>accounted.add(edgeId));occurrences.push(cell);}
    for (const ids of [centerEdges,selfEdges,crossEdges]) {ids.sort(compare);ids.forEach(edgeId=>accounted.add(edgeId));}
    return {id:JSON.stringify(["radius-one",id]),nodeId:id,centerEdgeIds:centerEdges,selfEdgeIds:selfEdges,crossEdgeIds:crossEdges,cells};
  });
  const witnessTable=Object.fromEntries(sortedIds(witnesses.keys()).map(id=>[id,Object.freeze(sortedIds(witnesses.get(id)!))]));
  const rows:RadiusRow[]=rowDrafts.map(({cells,...row})=>({...row,...Object.fromEntries((["incoming","outgoing","undirected"] as const).map(wing=>[
    wing,page(cells.filter(c=>c.wing===wing),offsets[row.nodeId]?.[wing]??0,cellLimit,complete(centerId)&&complete(row.nodeId))])) as Pick<RadiusRow,RadiusWing>}));
  const included=new Set([centerId,...first,...second]);
  const edgeRecords=[...edges.values()].filter(e=>included.has(e.from)&&included.has(e.to)&&eligibleEdges.has(e.id)).sort((a,b)=>compare(a.id,b.id));
  const allComplete=complete(centerId)&&[...first,...second].every(complete);
  return {generation:source.generation,centerId,direction,directNodeIds:rowDrafts.map(row=>row.nodeId),nodes:sortedIds(included).map(id=>nodes.get(id)!),edgeRecords,
    centerSelfEdgeIds:centerSelf,rows:page(rows,rowOffset,rowLimit,complete(centerId)),
    otherRelations:page(edgeRecords.filter(e=>!accounted.has(e.id)).map(e=>e.id),otherOffset,otherLimit,allComplete),
    counts:{directNodes:first.size,secondStepNodes:second.size,occurrences:occurrences.length,edgeRecords:edgeRecords.length,complete:allComplete},confirmedSecondHop:complete(centerId),witnesses:witnessTable};
}
