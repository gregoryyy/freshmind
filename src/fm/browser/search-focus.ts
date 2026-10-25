/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {Node} from "../../tg/model/index.js";
import type {TGLayout,LayoutConstraint} from "../../tg/layout/index.js";
import type {FreshGraph,FreshNode,FreshEdge} from "../model/index.js";
import {searchResultMetadata} from "../ir/index.js";
import {searchDiskGeometry,searchDiskEscape,solveDiskPosition} from "../geometry/index.js";
import type {DiskBody,DiskPoint,SearchDisk} from "../geometry/index.js";
import type {FreshmindPanel} from "./panel.js";

export interface SearchFocusState {sourceId:string|null;resultIds:string[];disk:SearchDisk|null;blockedNodeIds:string[]}
/** An invisible view constraint over accepted live results. Never inserts shapes, edges or semantic metadata. */
export class SearchResultFocus {
  private source?:FreshNode;
  private focusToken:symbol|null=null;
  private edges:readonly FreshEdge[]=[];
  private graph?:FreshGraph;
  private layout?:TGLayout;
  private removeConstraint?:()=>void;
  private readonly removeRfc:()=>void;
  constructor(private readonly panel:FreshmindPanel) {
    this.removeRfc=panel.getRfc().addListener(state=>{if(this.source&&(state.focusId!==this.source.getID()||panel.getRfc().getFocusEdgesToken(this.source)!==this.focusToken))this.clear();});
    // Unplaceable custom lenses must not keep an otherwise settled runner busy.
    this.constraint.needsTicks=()=>this.constraint(this.panel.getGES(),this.panel.getDragNode()).size>0;
  }
  set(source:FreshNode,edges:readonly FreshEdge[]):void {
    this.clear();
    if(!edges.length)return;
    this.panel.centerOn(source,true);
    this.panel.getRfc().setFocusEdges(source,edges);
    const token=this.panel.getRfc().getFocusEdgesToken(source);if(token===null)return;
    this.focusToken=token;this.source=source;this.edges=[...edges];this.graph=this.panel.getCompleteEltSet();this.reconcile();this.panel.resetDamper();
  }
  clear():void {this.removeConstraint?.();this.removeConstraint=undefined;this.layout=undefined;this.source=undefined;this.focusToken=null;this.graph=undefined;this.edges=[];}
  reconcile():void {
    if(!this.source)return;
    if(this.graph!==this.panel.getCompleteEltSet()||!this.graph.contains(this.source)){this.clear();return;}
    this.edges=this.edges.filter(edge=>this.graph!.contains(edge));
    if(!this.edges.length){this.clear();return;}
    if(this.layout!==this.panel.tgLayout){this.removeConstraint?.();this.layout=this.panel.tgLayout;this.removeConstraint=this.layout.addConstraint(this.constraint);}
  }
  private geometry():{source:FreshNode;results:FreshNode[];bodies:Map<Node,DiskBody>;disk:SearchDisk}|null {
    const source=this.source,visible=this.panel.getGES();
    if(!source||this.graph!==this.panel.getCompleteEltSet()||!visible.contains(source))return null;
    const rank=(edge:FreshEdge):number=>{const value=searchResultMetadata(edge)?.rank;return typeof value==="number"&&Number.isFinite(value)?value:Number.MAX_SAFE_INTEGER;};
    const results=[...new Set(this.edges.filter(edge=>visible.contains(edge)&&visible.contains(edge.to)&&searchResultMetadata(edge)?.owner===source.getID()).sort((a,b)=>rank(a)-rank(b)||(a.to.getID()!<b.to.getID()!?-1:1)).map(e=>e.to))].filter(n=>n!==source);
    if(!results.length)return null;
    const bodies=new Map<Node,DiskBody>(),lens=this.panel.getLensSet();
    for(const node of visible.getNodes())bodies.set(node,{id:node.getID()!,...lens.convRealToDraw(node.x,node.y),width:node.getWidth(),height:node.getHeight()});
    return {source,results,bodies,disk:searchDiskGeometry(bodies.get(source)!,results.map(n=>bodies.get(n)!))};
  }
  private plan(dragNode:Node|null):{targets:Map<Node,DiskPoint>;state:SearchFocusState} {
    const geometry=this.geometry(),targets=new Map<Node,DiskPoint>();
    if(!geometry)return {targets,state:{sourceId:this.source?.getID()??null,resultIds:[],disk:null,blockedNodeIds:[]}};
    const {source,results,bodies,disk}=geometry,resultSet=new Set<Node>(results),blockedNodeIds:string[]=[];
    for(const [node,body] of bodies){
      if(node===source)continue;
      let target:DiskPoint|null;
      if(resultSet.has(node)){
        const angle=-Math.PI/2+2*Math.PI*results.indexOf(node as FreshNode)/results.length;
        const point={x:disk.x+disk.ringRadius*Math.cos(angle),y:disk.y+disk.ringRadius*Math.sin(angle)};
        target=Math.hypot(point.x-body.x,point.y-body.y)>.1?point:null;
      }else target=searchDiskEscape(disk,body);
      if(!target)continue;
      if(node.fixed||node===dragNode){blockedNodeIds.push(node.getID()!);continue;}
      targets.set(node,target);
    }
    return {targets,state:{sourceId:source.getID(),resultIds:results.map(n=>n.getID()!),disk:{...disk},blockedNodeIds}};
  }
  getState():SearchFocusState {return this.plan(this.panel.getDragNode()).state;}
  readonly constraint:LayoutConstraint=(_graph,dragNode)=>{
    const {targets}=this.plan(dragNode),lens=this.panel.getLensSet(),proposals=new Map<Node,DiskPoint>();
    for(const [node,target] of targets){
      const point=solveDiskPosition(target,p=>lens.convRealToDraw(p.x,p.y),p=>lens.convDrawToReal(p.x,p.y));
      if(point)proposals.set(node,point);
    }
    return proposals;
  };
  dispose():void {this.clear();this.removeRfc();}
}
