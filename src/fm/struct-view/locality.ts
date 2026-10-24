/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import {VisibleLocality} from "../../tg/graph/index.js";
import {Node,Edge} from "../../tg/model/index.js";
import type {StructuralProjection} from "./projection.js";
import type {LocalitySource} from "../model/index.js";

/**
 * Membership index for the presented view; the inherited TG locality remains the
 * authoritative neighborhood. Writes through this handle go to that neighborhood.
 * Installing a projection owns visibility flags/counts, never complete adjacency.
 */
export class StructuralLocality extends VisibleLocality implements LocalitySource {
  constructor(private readonly source:VisibleLocality,private readonly changed:()=>void){super(source.getCompleteEltSet());}
  /** Internal editing adapter: reconnect against neighborhood membership, then repaint atomically. */
  getMutationSource():VisibleLocality{return this.source;}
  install(projection:StructuralProjection):void {
    this.nodes=projection.nodes;this.edges=projection.edges;
    const nodes=new Set(this.nodes),edges=new Set(this.edges);
    for(const node of this.getCompleteEltSet().getNodes()){node.setVisible(nodes.has(node));node.visibleEdgeCnt=0;}
    for(const edge of this.getCompleteEltSet().getEdges()){
      edge.setVisible(edges.has(edge));if(edges.has(edge)){edge.from.visibleEdgeCnt++;edge.to.visibleEdgeCnt++;}
    }
  }
  override addNode(node:Node):void{this.source.addNode(node);this.changed();}
  override addEdge(edge:Edge):Edge;
  override addEdge(from:Node,to:Node,length?:number):Edge;
  override addEdge(edgeOrFrom:Edge|Node,to?:Node,length?:number):Edge {
    const edge=edgeOrFrom instanceof Edge?this.source.addEdge(edgeOrFrom):this.source.addEdge(edgeOrFrom,to!,length);this.changed();return edge;
  }
  override addNodeWithEdges(node:Node):void{this.source.addNodeWithEdges(node);this.changed();}
  override addAll():void{this.source.addAll();this.changed();}
  override removeNode(node:Node|null):boolean{const removed=this.source.removeNode(node);this.changed();return removed;}
  override removeEdge(edge:Edge|null):boolean{const removed=this.source.removeEdge(edge);this.changed();return removed;}
  override removeAll():void{this.source.removeAll();this.changed();}
  override clearAll():void{this.source.clearAll();this.changed();}
  override deleteNode(node:Node|null):boolean{const deleted=this.source.deleteNode(node);this.changed();return deleted;}
  override deleteEdge(edge:Edge|null):boolean;
  override deleteEdge(from:Node,to:Node):boolean;
  override deleteEdge(edgeOrFrom:Edge|Node|null,to?:Node):boolean {
    const deleted=edgeOrFrom instanceof Node?this.source.deleteEdge(edgeOrFrom,to!):this.source.deleteEdge(edgeOrFrom);this.changed();return deleted;
  }
  /** Explicit flag edits change only items whose flags differ from the current projection. */
  override updateLocalityFromVisibility():void {
    const complete=this.getCompleteEltSet(),nodes=[...complete.getNodes()],edges=[...complete.getEdges()];
    const addNodes=nodes.filter(n=>n.isVisible()&&!this.contains(n)),removeNodes=nodes.filter(n=>!n.isVisible()&&this.contains(n));
    const addEdges=edges.filter(e=>e.isVisible()&&!this.contains(e)),removeEdges=edges.filter(e=>!e.isVisible()&&this.contains(e));
    for(const n of removeNodes)this.source.removeNode(n);
    for(const n of addNodes)this.source.addNode(n);
    for(const e of removeEdges)this.source.removeEdge(e);
    for(const e of addEdges)if(this.source.contains(e.from)&&this.source.contains(e.to))this.source.addEdge(e);
    this.changed();
  }
}
