/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type {VisibleLocality,ImmutableGraphEltSet} from "../../tg/graph/index.js";
import {StructuralLocality} from "./locality.js";
import {projectStructuralView,structuralViewDefaults,validateStructuralView} from "./projection.js";
import type {StructuralProjection,StructuralViewSettings} from "./projection.js";

export interface StructuralViewState extends Omit<StructuralProjection,"nodes"|"edges"> {
  settings:StructuralViewSettings;sourceNodeCount:number;sourceEdgeCount:number;nodeIds:string[];edgeIds:string[];
}
export interface StructuralViewHost {
  getSource():VisibleLocality;
  getComplete():ImmutableGraphEltSet;
  getContext():{centers:string[];protectedIds:Set<string>};
  changed():void;
}
/** Owns transient view rules and a membership index, never duplicate model objects or semantic edges. */
export class StructuralViewController {
  private settings=validateStructuralView(structuralViewDefaults);
  private source?:VisibleLocality;
  private locality?:StructuralLocality;
  private projection:StructuralProjection={nodes:[],edges:[],groups:[],filteredNodeIds:[],filteredEdgeIds:[],aggregatedNodeIds:[]};
  private listeners=new Set<(state:StructuralViewState)=>void>();
  private signature="";
  private disposed=false;
  private refreshing=false;
  private installed=false;
  private pendingCleanup=false;
  private expanded=new Set<string>();
  constructor(private readonly host:StructuralViewHost){}
  /** Defaults off. Copies, deduplicates and validates rules atomically; wakes and redraws through the host. */
  configure(changes:Partial<StructuralViewSettings>):void {
    if(this.disposed)throw new Error("Structural view has been destroyed");
    const next=validateStructuralView({...this.settings,...changes});
    if(JSON.stringify(next)===JSON.stringify(this.settings))return;
    this.settings=next;this.expanded.clear();this.host.changed();
  }
  /** Restores aggregated leaves under this visible parent until rules or the document change. */
  reveal(parentId:string):void {
    if(this.disposed)throw new Error("Structural view has been destroyed");
    if(!this.host.getSource().findNode(parentId)||this.expanded.has(parentId))return;
    this.expanded.add(parentId);this.host.changed();
  }
  /** Clears document-specific type rules and expansion exceptions on graph replacement. */
  reset():void{this.settings=validateStructuralView(structuralViewDefaults);this.expanded.clear();this.refresh();}
  getLocality():VisibleLocality{return this.settings.enabled&&this.locality?this.locality:this.host.getSource();}
  /** Detached snapshots include only IDs/counts; labels, metadata and memberships stay in the graph. */
  getState():StructuralViewState {
    const {nodes,edges,...rest}=this.projection,source=this.host.getSource();
    return structuredClone({...rest,settings:this.settings,sourceNodeCount:source.nodeCount(),sourceEdgeCount:source.edgeCount(),
      nodeIds:nodes.map(n=>n.getID()!),edgeIds:edges.map(e=>e.getID()!)});
  }
  addListener(listener:(state:StructuralViewState)=>void):()=>void{this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  /**
   * Refreshes after source mutations and before rendering. The untouched source drives
   * neighborhood traversal; the projection drives physics, drawing, picking and selection.
   * Recounts visible incidence (including loops twice) without touching complete adjacency.
   */
  refresh():boolean {
    if(this.disposed||this.refreshing)return false;
    this.refreshing=true;
    try {
      const source=this.host.getSource();
      if(source!==this.source){
        this.source=source;this.locality=new StructuralLocality(source,()=>{this.refresh();this.pendingCleanup=true;});this.installed=false;
      }
      const controlsVisibility=this.settings.enabled||this.installed;
      const pendingCleanup=this.pendingCleanup;this.pendingCleanup=false;
      if(this.settings.enabled||this.installed) {
        for(const edge of [...source.getEdges()])if(!this.host.getComplete().contains(edge))source.removeEdge(edge);
        for(const node of [...source.getNodes()])if(!this.host.getComplete().contains(node))source.removeNode(node);
      }
      const context=this.settings.enabled?this.host.getContext():{centers:[],protectedIds:new Set<string>()};
      for(const group of this.projection.groups)if(this.expanded.has(group.parentId))for(const id of group.nodeIds)context.protectedIds.add(id);
      // Expansion exceptions derive from adjacency, so revealed members remain revealed after the first refresh.
      for(const node of source.getNodes())for(const edge of node.getEdges())if(this.expanded.has(edge.getOtherEndpt(node).getID()!))context.protectedIds.add(node.getID()!);
      this.projection=projectStructuralView(this.host.getComplete(),source,this.settings,context.centers,context.protectedIds);
      if(this.settings.enabled||this.installed)this.locality!.install(this.projection);
      this.installed=this.settings.enabled;
      const state=this.getState(),signature=JSON.stringify(state),changed=signature!==this.signature;this.signature=signature;
      if(changed)for(const listener of this.listeners)listener(state);
      // Ordinary unfiltered locality animations retain their original reference-cleanup timing.
      return (changed||pendingCleanup)&&controlsVisibility;
    } finally {this.refreshing=false;}
  }
  destroy():void{this.disposed=true;this.listeners.clear();this.expanded.clear();}
}
