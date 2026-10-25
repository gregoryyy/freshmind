/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import type {Node, Edge} from "../../tg/model/index.js";
import type {ImmutableGraphEltSet} from "../../tg/graph/index.js";
import type {LayoutForce} from "../../tg/layout/index.js";
import {angularGapRms, applyRfcForces, branchImpulse} from "./forces.js";
import type {RfcHost, RfcSettings, RfcState, RfcCenterState, RfcClusterSettings,RfcExclusionSettings} from "./types.js";
import {validateCoordinateWeights} from "./metric.js";
import {rfcForcePresets} from "./presets.js";
import {RfcStabilizer} from "./stabilization.js";
import type {RfcStabilizationOptions} from "./stabilization.js";
import {projectRfcStructure, constrainedStar} from "./structures.js";
import type {RfcProjection} from "./structures.js";
import {applyClusterLink,applyClusterCompactness} from "./clusters.js";
import {focalRegions,applyRegionExclusion} from "./exclusion.js";
import {analyzeSubstructure} from "../struct/index.js";
import type {GraphSubstructure, SubstructureGraph, SubstructureTopology} from "../struct/index.js";

const defaults:RfcSettings={...rfcForcePresets.tree,coordinateWeights:{x:1,y:1}};

/** Owns transient RFC centers; persistent substructure membership belongs to the graph. */
export class RfcController {
  private focus:Node|null=null;
  private readonly centers=new Map<Node,string|null>();
  private readonly restrictedEdges=new Map<Node,readonly Edge[]>();
  private settings:RfcSettings;
  private neighborhoodDepth:1|2=1;
  private clusterSettings:RfcClusterSettings={rigidity:1};
  private exclusionSettings:RfcExclusionSettings={enabled:false,overlap:true,strength:.25,padding:20};
  private disposed=false;
  private signature="";
  private readonly listeners=new Set<(state:RfcState)=>void>();
  private readonly stabilizer:RfcStabilizer;
  private cachedGraph:object|null=null;
  private cachedRevision=-1;
  private readonly structures=new Map<string,{definition:GraphSubstructure;topology:SubstructureTopology}>();

  constructor(private readonly host:RfcHost,options:Partial<RfcSettings>={},stabilization:RfcStabilizationOptions={},exclusion:Partial<RfcExclusionSettings>={}) {
    this.settings=this.validate({...defaults,...options});this.stabilizer=new RfcStabilizer(stabilization);
    this.exclusionSettings=this.validateExclusion({...this.exclusionSettings,...exclusion});
    this.apply.needsTicks=()=>!this.disposed&&this.entries().some(([node])=>this.host.getGES().contains(node))
      &&this.stabilizer.getState().phase!=="steady";
  }
  private validate(settings:RfcSettings):RfcSettings {
    for(const [key,min,max] of [["springMultiplier",1,100],["radialStiffness",0,2],["radialLength",10,1000],["angularStiffness",0,100000]] as const)
      if(!Number.isFinite(settings[key])||settings[key]<min||settings[key]>max)throw new RangeError(`${key} must be finite and in ${min}–${max}`);
    return {...settings,coordinateWeights:validateCoordinateWeights(settings.coordinateWeights)};
  }
  private assertAlive():void {if(this.disposed)throw new Error("RFC controller has been destroyed");}
  private validateExclusion(settings:RfcExclusionSettings):RfcExclusionSettings {
    if(typeof settings.enabled!=="boolean"||typeof settings.overlap!=="boolean")throw new TypeError("Exclusion enabled/overlap must be boolean");
    for(const [key,min,max] of [["strength",0,2],["padding",1,200]] as const)
      if(!Number.isFinite(settings[key])||settings[key]<min||settings[key]>max)throw new RangeError(`Exclusion ${key} must be finite and in ${min}–${max}`);
    return {...settings};
  }
  private definition(id:string):GraphSubstructure|null {
    const graph=this.host.getCompleteEltSet() as Partial<SubstructureGraph>,revision=graph.getSubstructureRevision?.();
    if(this.cachedGraph!==graph||revision===undefined||revision!==this.cachedRevision){this.structures.clear();this.cachedGraph=graph;this.cachedRevision=revision??-1;}
    const cached=this.structures.get(id);if(cached)return cached.definition;
    const definition=graph.getSubstructure?.(id)??null;
    if(definition)this.structures.set(id,{definition,topology:analyzeSubstructure(this.host.getCompleteEltSet(),definition)});
    return definition;
  }
  private entries():[Node,string|null][] {
    return [...this.centers].filter(([node,id])=>this.host.getCompleteEltSet().contains(node)&&(!id||this.definition(id)?.rootId===node.getID()))
      .sort(([a],[b])=>a===this.focus?-1:b===this.focus?1:0);
  }
  private project(node:Node,id:string|null,visible:ImmutableGraphEltSet=this.host.getGES()):RfcProjection {
    const definition=id?this.definition(id):null;
    const restriction=this.restrictedEdges.get(node);
    if(!definition&&restriction) {
      const rootStar=constrainedStar(node,restriction.filter(e=>visible.contains(e)&&visible.contains(e.from)&&visible.contains(e.to)),this.settings.coordinateWeights);
      return {root:node,definition:null,nodes:[node,...rootStar.branches.map(b=>b.node)],edges:rootStar.branches.map(b=>b.edge),rootStar,stars:[rootStar],targets:new Map(),targetWeights:new Map()};
    }
    return projectRfcStructure(this.host.getCompleteEltSet(),visible,node,definition,this.settings.coordinateWeights,id?this.structures.get(id)?.topology:undefined,this.neighborhoodDepth);
  }
  /** Projects an active center into a caller-supplied locality (for structural-view protection). */
  projectFocus(node:Node,visible:ImmutableGraphEltSet=this.host.getGES()):RfcProjection|null {
    if(!this.centers.has(node)||!this.host.getCompleteEltSet().contains(node)||!visible.contains(node))return null;
    return this.project(node,this.centers.get(node)!,visible);
  }
  /** Changes implicit centers only; stored structures and explicit result stars retain their scope. */
  setNeighborhoodDepth(depth:1|2):void {
    this.assertAlive();if(depth!==1&&depth!==2)throw new RangeError("RFC neighborhood depth must be 1 or 2");
    if(depth===this.neighborhoodDepth)return;
    this.neighborhoodDepth=depth;this.stabilizer.forgetMotion();this.host.resetDamper();this.publish();
  }
  /** Detached membership/activation snapshots. The legacy focusId/branchIds describe the primary center. */
  getState():RfcState {
    const entries=this.entries(),focus=entries[0]?.[0]??null,centers:RfcCenterState[]=[],projections:RfcProjection[]=[];
    for(const [node,id] of entries) {
      const active=this.host.getGES().contains(node),projection=active?this.project(node,id):null;
      if(projection)projections.push(projection);
      centers.push({focusId:node.getID()!,structureId:id,kind:id?this.definition(id)!.kind:!this.restrictedEdges.has(node)&&this.neighborhoodDepth===2?"tree":"star",active,
        memberIds:projection?.nodes.map(n=>n.getID()!)??[],edgeIds:projection?.edges.map(e=>e.getID()!)??[],
        angularGapRms:projection&&projection.definition?.kind!=="dag"&&projection.definition?.kind!=="cluster"?angularGapRms(projection.rootStar):null});
    }
    const primary=focus&&this.host.getGES().contains(focus)?this.project(focus,entries[0][1]):null;
    return {neighborhoodDepth:this.neighborhoodDepth,focusId:focus?.getID()??null,enabled:entries.length>0,active:centers.some(c=>c.active),centers,
      branchIds:primary?.rootStar.branches.map(b=>b.node.getID()!)??[],
      memberIds:[...new Set(projections.flatMap(p=>p.nodes.map(n=>n.getID()!)))],
      radialEdgeIds:[...new Set(projections.flatMap(p=>p.edges.map(e=>e.getID()!)))],
      angularGapRms:primary&&primary.definition?.kind!=="dag"&&primary.definition?.kind!=="cluster"?angularGapRms(primary.rootStar):0,
      settings:{...this.settings,coordinateWeights:{...this.settings.coordinateWeights}},clusterSettings:{...this.clusterSettings},
      exclusionSettings:{...this.exclusionSettings},regions:this.exclusionSettings.enabled?
        focalRegions(projections,this.settings.coordinateWeights,this.exclusionSettings.padding).map(({anchors:_,members:__,...region})=>region):[],
      stabilization:this.stabilizer.getState()};
  }
  /** Activation/settings/topology subscriptions; motion diagnostics remain polled after each batch. */
  addListener(listener:(state:RfcState)=>void):()=>void {this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
  setStabilizationEnabled(enabled:boolean):void {
    this.assertAlive();if(enabled===this.stabilizer.getState().enabled)return;
    this.stabilizer.setEnabled(enabled);this.host.resetDamper();this.publish();
  }
  private stateSignature(state:RfcState):string {
    return JSON.stringify(state.centers.map(c=>[c.focusId,c.structureId,c.kind,c.active,[...c.memberIds].sort(),[...c.edgeIds].sort()]));
  }
  private publish():void {const state=this.getState();this.signature=this.stateSignature(state);for(const listener of this.listeners)listener(state);}
  private visible(node:Node):void {
    if(!this.host.getCompleteEltSet().contains(node)||!this.host.getGES().contains(node))throw new Error("RFC focus must belong to the visible graph");
  }
  /** Replaces all centers with this node, preserving its stored definition if already active; null clears all. */
  setFocus(node:Node|null):void {
    this.assertAlive();if(node)this.visible(node);
    const previous=node?this.centers.get(node)??null:null;
    const definition=previous&&this.definition(previous)?.rootId===node?.getID()?previous:null;
    if(node===this.focus&&this.centers.size===(node?1:0)&&previous===definition&&!this.restrictedEdges.size)return;
    this.restrictedEdges.clear();
    this.centers.clear();this.focus=node;if(node)this.centers.set(node,definition);
    this.stabilizer.reset();this.host.resetDamper();this.publish();
  }
  /** Exclusive transient star over explicit incident relations (for example accepted search results). */
  setFocusEdges(node:Node,edges:readonly Edge[]):void {
    this.assertAlive();this.visible(node);
    if(edges.some(e=>!this.host.getCompleteEltSet().contains(e)||(e.from!==node&&e.to!==node)))throw new TypeError("Focus relations must be current and incident to the center");
    this.centers.clear();this.restrictedEdges.clear();this.focus=node;this.centers.set(node,null);this.restrictedEdges.set(node,[...edges]);
    this.stabilizer.reset();this.host.resetDamper();this.publish();
  }
  /** Adds another center without changing locality/view or replacing existing centers. Repeats are idempotent. */
  addFocus(node:Node):void {
    this.assertAlive();this.visible(node);if(this.entries().some(([center])=>center===node))return;
    this.centers.set(node,null);this.focus??=node;this.stabilizer.forgetMotion();this.host.resetDamper();this.publish();
  }
  /** Toggles one center without changing other activations; returns whether the node is now reinforced. */
  toggleFocus(node:Node):boolean {
    this.assertAlive();
    if(this.centers.has(node)){this.removeFocus(node);return false;}
    this.addFocus(node);return true;
  }
  /** Activates a stored structure exclusively by default; additive activation retains the other centers. */
  activateSubstructure(id:string,additive=false):void {
    this.assertAlive();const definition=this.definition(id);if(!definition)throw new Error(`Unknown substructure: ${id}`);
    const root=[...this.host.getCompleteEltSet().getNodes()].find(n=>n.getID()===definition.rootId)!;this.visible(root);
    if(this.centers.get(root)===id&&(additive||(root===this.focus&&this.centers.size===1)))return;
    if(!additive){this.centers.clear();this.restrictedEdges.clear();}else this.restrictedEdges.delete(root);
    this.centers.set(root,id);if(!additive||!this.focus)this.focus=root;
    if(additive)this.stabilizer.forgetMotion();else this.stabilizer.reset();this.host.resetDamper();this.publish();
  }
  /** Removes one stored center; remaining centers, including independently hidden ones, are retained. */
  removeFocus(node:Node|string):void {
    this.assertAlive();const target=typeof node==="string"?[...this.centers.keys()].find(n=>n.getID()===node):node;
    if(!target||!this.centers.delete(target))return;this.restrictedEdges.delete(target);if(this.focus===target)this.focus=this.centers.keys().next().value??null;
    this.stabilizer.forgetMotion();this.host.resetDamper();this.publish();
  }
  configure(changes:Partial<RfcSettings>):void {
    this.assertAlive();const next=this.validate({...this.settings,...changes});
    if(JSON.stringify(next)===JSON.stringify(this.settings))return;
    this.settings=next;this.stabilizer.forgetMotion();this.host.resetDamper();this.publish();
  }
  /** Changes cluster rigidity without altering star/tree forces or pinning any member. */
  configureClusters(changes:Partial<RfcClusterSettings>):void {
    this.assertAlive();const next={...this.clusterSettings,...changes};
    if(!Number.isFinite(next.rigidity)||next.rigidity<0||next.rigidity>2)throw new RangeError("Cluster rigidity must be finite and in 0–2");
    if(next.rigidity===this.clusterSettings.rigidity)return;
    this.clusterSettings=next;this.stabilizer.forgetMotion();this.host.resetDamper();this.publish();
  }
  /** Configures optional context/intersection exclusion independently of historical tree/cluster presets. */
  configureExclusion(changes:Partial<RfcExclusionSettings>):void {
    this.assertAlive();const next=this.validateExclusion({...this.exclusionSettings,...changes});
    if(JSON.stringify(next)===JSON.stringify(this.exclusionSettings))return;
    this.exclusionSettings=next;this.stabilizer.forgetMotion();this.host.resetDamper();this.publish();
  }
  /** Drops deleted roots/invalidated definitions, suspending hidden roots independently. */
  reconcile():void {
    if(this.disposed)return;
    if(this.cachedGraph!==this.host.getCompleteEltSet()){this.structures.clear();this.cachedGraph=null;this.cachedRevision=-1;}
    for(const [node,id] of [...this.centers]) {
      const definition=id?this.definition(id):null;
      if(!this.host.getCompleteEltSet().contains(node)||(id&&!definition)){this.centers.delete(node);this.restrictedEdges.delete(node);}
      else if(definition&&definition.rootId!==node.getID()) {
        const root=[...this.host.getCompleteEltSet().getNodes()].find(n=>n.getID()===definition.rootId)!;
        this.centers.delete(node);this.centers.set(root,id);if(this.focus===node)this.focus=root;
      }
    }
    if(this.focus&&!this.centers.has(this.focus))this.focus=this.centers.keys().next().value??null;
    const state=this.getState();
    if(this.stateSignature(state)!==this.signature) {
      // Membership/root edits can happen on a cooled layout without a locality event.
      if(state.active||(this.signature!==""&&this.signature!=="[]"))this.host.resetDamper();
      if(!state.active)this.stabilizer.reset();else this.stabilizer.forgetMotion();this.publish();
    }
  }
  /** Adds deduplicated structure constraints, then applies experimental damping once to their member union. */
  readonly apply:LayoutForce=(graph,rigidity)=>{
    if(this.disposed||!this.centers.size)return;
    let entries=this.entries();if(entries.length!==this.centers.size){this.reconcile();entries=this.entries();}
    const projections=entries.filter(([n])=>graph.contains(n)).map(([n,id])=>this.project(n,id));
    if(!projections.length){this.stabilizer.reset();return;}
    const contributors=projections.map(p=>{
      const nodes=new Set<Node>();
      const tree=!p.definition||p.definition.kind==="tree",cluster=p.definition?.kind==="cluster";
      if(this.settings.springMultiplier>1||((tree||cluster)&&this.settings.radialStiffness>0)||(cluster&&this.clusterSettings.rigidity>0))
        for(const edge of p.edges){nodes.add(edge.from);nodes.add(edge.to);}
      if(cluster&&this.settings.radialStiffness>0&&p.nodes.length>1)for(const node of p.nodes)nodes.add(node);
      if(tree&&this.settings.angularStiffness>0)for(const star of p.stars)if(star.branches.length>1)
        for(const branch of star.branches){nodes.add(star.center);nodes.add(branch.node);}
      if(this.settings.radialStiffness>0)for(const [node] of p.targets)if(node!==p.root&&(p.targetWeights.get(node)??0)>0){nodes.add(p.root);nodes.add(node);}
      return nodes;
    });
    const members=new Set(contributors.flatMap(nodes=>[...nodes]));
    if(projections.length===1&&!projections[0].definition) {
      // Preserve the original single-star numerical path exactly.
      applyRfcForces(projections[0].rootStar,this.settings,rigidity);
    } else {
      const ownership=new Map<Node,number>();for(const nodes of contributors)for(const n of nodes)ownership.set(n,(ownership.get(n)??0)+1);
      const radial=new Map<Edge,{center:Node;branch:Node;tree:boolean}>(),angular=new Map<Node,Set<Edge>>();
      const clusterEdges=new Map<Edge,number>();
      for(const p of projections) {
        const tree=!p.definition||p.definition.kind==="tree";
        if(p.definition?.kind==="cluster") {
          const degrees=new Map<Node,number>();for(const edge of p.edges)for(const node of [edge.from,edge.to])degrees.set(node,(degrees.get(node)??0)+1);
          for(const edge of p.edges)clusterEdges.set(edge,Math.max(clusterEdges.get(edge)??1,degrees.get(edge.from)!,degrees.get(edge.to)!));
          continue;
        }
        for(const star of p.stars)for(const branch of star.branches) {
          const prior=radial.get(branch.edge);if(!prior)radial.set(branch.edge,{center:star.center,branch:branch.node,tree});else if(tree)prior.tree=true;
          if(!angular.has(star.center))angular.set(star.center,new Set());angular.get(star.center)!.add(branch.edge);
        }
        if(!tree)for(const edge of p.edges)if(!radial.has(edge))radial.set(edge,{center:edge.from,branch:edge.to,tree:false});
      }
      for(const [edge,pair] of radial)applyRfcForces({center:pair.center,branches:[{node:pair.branch,edge,angle:0}],coordinateWeights:this.settings.coordinateWeights},
        {...this.settings,angularStiffness:0,radialStiffness:pair.tree?this.settings.radialStiffness:0},rigidity);
      for(const [center,edges] of angular)applyRfcForces(constrainedStar(center,edges,this.settings.coordinateWeights),
        {...this.settings,springMultiplier:1,radialStiffness:0},rigidity,ownership);
      for(const [edge,degree] of clusterEdges)applyClusterLink(edge,{...this.settings,
        springMultiplier:radial.has(edge)?1:this.settings.springMultiplier,
        radialStiffness:radial.get(edge)?.tree?0:this.settings.radialStiffness},rigidity,degree,radial.get(edge)?.tree?0:this.clusterSettings.rigidity);
      for(const p of projections)if(p.definition?.kind==="cluster")applyClusterCompactness(p.nodes,this.settings,rigidity,ownership);
      for(const p of projections)for(const [node,target] of p.targets)if(node!==p.root) {
        const scale=this.settings.radialStiffness*rigidity/Math.max(ownership.get(node)??1,ownership.get(p.root)??1)*(p.targetWeights.get(node)??0),weights=this.settings.coordinateWeights;
        branchImpulse(p.root,node,-scale*weights.x*(node.x-p.root.x-target.x*this.settings.radialLength),
          -scale*weights.y*(node.y-p.root.y-target.y*this.settings.radialLength));
      }
    }
    if(this.exclusionSettings.enabled)for(const node of applyRegionExclusion(graph.getNodes(),
      focalRegions(projections,this.settings.coordinateWeights,this.exclusionSettings.padding),this.exclusionSettings,rigidity,this.settings.radialLength))members.add(node);
    if(members.size)
      this.stabilizer.apply([...members],this.host.getDragNode?.()??null);
    else this.stabilizer.reset();
  };
  destroy():void {this.disposed=true;this.focus=null;this.centers.clear();this.restrictedEdges.clear();this.structures.clear();this.cachedGraph=null;this.stabilizer.reset();this.listeners.clear();}
}
