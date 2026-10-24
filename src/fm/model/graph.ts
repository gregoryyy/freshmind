/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import {Node,Edge} from "../../tg/model/index.js";
import {GraphEltSet} from "../../tg/graph/index.js";
import {clone} from "../config/core.js";
import {validateSubstructure} from "../structures/index.js";
import type {GraphSubstructure} from "../structures/index.js";
import {FreshNode} from "./node.js";
import {FreshEdge} from "./edge.js";

/** Adds Freshmind identity/type invariants while retaining TouchGraph adjacency and traversal. */
export class FreshGraph extends GraphEltSet {
  private readonly substructures=new Map<string,GraphSubstructure>();
  private substructureRevision=0;
  getSubstructureRevision():number{return this.substructureRevision;}
  /** Adds/replaces validated membership atomically; nodes can belong to several structures. */
  setSubstructure(definition:GraphSubstructure):void {
    const validated=validateSubstructure(this,definition);this.substructures.set(validated.id,validated);this.substructureRevision++;
  }
  getSubstructure(id:string):GraphSubstructure|null{return clone(this.substructures.get(id)??null);}
  getSubstructures():GraphSubstructure[]{return clone([...this.substructures.values()]);}
  /** Returns memberships from their graph owner rather than maintaining duplicate lists on nodes. */
  getNodeSubstructures(node:Node|string):GraphSubstructure[]{
    const id=typeof node==="string"?node:node.getID();return this.getSubstructures().filter(s=>s.nodeIds.includes(id!));
  }
  removeSubstructure(id:string):boolean{const deleted=this.substructures.delete(id);if(deleted)this.substructureRevision++;return deleted;}
  private invalidateSubstructures(nodeId?:string,edgeId?:string):void {
    for(const [id,s] of this.substructures)if((nodeId&&s.nodeIds.includes(nodeId))||(edgeId&&s.edgeIds.includes(edgeId)))this.removeSubstructure(id);
  }
  /** Deletion invalidates affected definitions instead of leaving dangling structural references. */
  override deleteNode(node:Node|null):boolean {
    if(node&&this.contains(node))this.invalidateSubstructures(node.getID()!);
    return super.deleteNode(node);
  }
  override clearAll():void {this.substructures.clear();this.substructureRevision++;super.clearAll();}
  /** Reconnects a stored relation without changing its ID/order, retaining loop incidence twice. */
  reconnectEdge(edge: FreshEdge, from: FreshNode, to: FreshNode): void {
    if (!this.contains(edge) || !this.contains(from) || !this.contains(to)) throw new Error("Relation and endpoints must belong to the graph");
    if(edge.from!==from||edge.to!==to)this.invalidateSubstructures(undefined,edge.getID()!);
    edge.from.removeEdge(edge); edge.to.removeEdge(edge);
    edge.from = from; edge.to = to; from.addEdge(edge); to.addEdge(edge); edge.setGeometry(null);
  }
  override nodeAt(index:number):FreshNode{return super.nodeAt(index) as FreshNode;}
  override edgeAt(index:number):FreshEdge{return super.edgeAt(index) as FreshEdge;}
  override findNode(id:string|null):FreshNode|null{return super.findNode(id) as FreshNode|null;}
  override getNodes():IterableIterator<FreshNode>{return super.getNodes() as IterableIterator<FreshNode>;}
  override getEdges():IterableIterator<FreshEdge>{return super.getEdges() as IterableIterator<FreshEdge>;}
  /** Inserts only FreshNode instances, preserving base ID uniqueness and adjacency ownership. */
  override addNode(node: Node): void {
    if (!(node instanceof FreshNode)) throw new TypeError("FreshGraph requires FreshNode objects");
    super.addNode(node);
  }
  /**
   * Inserts/creates a FreshEdge without duplicating base graph membership or adjacency.
   * Assigns an unused eN ID when absent; duplicate explicit IDs are rejected.
   * @throws {TypeError} If the edge/endpoints are not Freshmind objects.
   * @throws {Error} If endpoints are absent or another edge has the same ID.
   */
  override addEdge(edge: Edge): FreshEdge;
  override addEdge(from: Node, to: Node, length?: number): FreshEdge;
  override addEdge(edgeOrFrom: Edge | Node, to?: Node, length?: number): FreshEdge {
    const edge = edgeOrFrom instanceof Edge ? edgeOrFrom : new FreshEdge(edgeOrFrom as FreshNode, to as FreshNode, { length });
    if (!(edge instanceof FreshEdge)) throw new TypeError("FreshGraph requires FreshEdge objects");
    if (!this.contains(edge.from) || !this.contains(edge.to)) throw new Error("Both endpoints must belong to the graph");
    if (this.contains(edge)) return edge;
    if (edge.getID() === null) {
      let id = 1; while ([...this.getEdges()].some(e => e.getID() === `e${id}`)) id++;
      edge.setID(`e${id}`);
    }
    if ([...this.getEdges()].some(e => e.getID() === edge.getID())) throw new Error(`Duplicate edge ID: ${edge.getID()}`);
    super.addEdge(edge); return edge;
  }
  /** Permanently removes a relation and clears its transient geometry when deletion succeeds. */
  override deleteEdge(edge:Edge|null):boolean;
  override deleteEdge(from:Node,to:Node):boolean;
  override deleteEdge(edgeOrFrom:Edge|Node|null,to?:Node):boolean {
    const edge=edgeOrFrom instanceof Node?(to?this.findEdge(edgeOrFrom,to):null):edgeOrFrom;
    const deleted=super.deleteEdge(edge);
    if(deleted&&edge instanceof FreshEdge){edge.setGeometry(null);this.invalidateSubstructures(undefined,edge.getID()!);}
    return deleted;
  }
}
