/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import type {Node} from "../../tg/model/index.js";
import type {RfcProjection} from "./structures.js";
import type {CoordinateWeights,RfcExclusionSettings,RfcRegionState} from "./types.js";
import {rfcNodeImportance} from "./importance.js";
import {branchImpulse} from "./forces.js";
import {validateCoordinateWeights} from "./metric.js";

/** Live reaction references are internal to a force callback, never stored as semantic relations. */
export interface RfcRegion extends RfcRegionState {
  members:ReadonlySet<Node>;
  anchors:{node:Node;fraction:number}[];
}
interface Interval {start:number;end:number;owners:RfcRegion[];}
export interface RegionEscape {x:number;y:number;distance:number;owners:RfcRegion[];}
const tau=2*Math.PI,epsilon=1e-8;

/**
 * Fits a weighted circle (a physical ellipse) around eligible visible member centers.
 * Implicit stars use their root; stored structures use an importance-weighted centroid,
 * preserving the cluster representative's lack of a physical anchoring role.
 */
export function focalRegions(projections:readonly RfcProjection[],weights:CoordinateWeights,padding:number):RfcRegion[] {
  weights=validateCoordinateWeights(weights);
  if(!Number.isFinite(padding)||padding<1||padding>200)throw new RangeError("Region padding must be finite and in 1–200");
  const result:RfcRegion[]=[];
  for(const p of projections) {
    const nodes=p.nodes.filter(n=>rfcNodeImportance(n)>0);if(!nodes.length)continue;
    const total=nodes.reduce((s,n)=>s+rfcNodeImportance(n),0);
    const anchors=p.definition?nodes.map(node=>({node,fraction:rfcNodeImportance(node)/total})):[{node:p.root,fraction:1}];
    const center={x:anchors.reduce((s,a)=>s+a.node.x*a.fraction,0),y:anchors.reduce((s,a)=>s+a.node.y*a.fraction,0)};
    const radius=padding+Math.max(...nodes.map(n=>Math.hypot(Math.sqrt(weights.x)*(n.x-center.x),Math.sqrt(weights.y)*(n.y-center.y))));
    result.push({id:p.definition?`structure:${p.definition.id}`:`star:${p.root.getID()}`,center,radius,coordinateWeights:{...weights},
      memberIds:nodes.map(n=>n.getID()!),members:new Set(nodes),anchors});
  }
  return result;
}

/** Weighted signed radial clearance; positive means outside, zero lies on the boundary. */
export function regionClearance(region:RfcRegionState,point:{x:number;y:number}):number {
  return Math.hypot(Math.sqrt(region.coordinateWeights.x)*(point.x-region.center.x),
    Math.sqrt(region.coordinateWeights.y)*(point.y-region.center.y))-region.radius;
}

/** All positive ray intervals, including ellipses entered later along the escape route. */
function intervals(regions:readonly RfcRegion[],point:{x:number;y:number},dx:number,dy:number):Interval[] {
  const result:Interval[]=[];
  for(const region of regions) {
    const w=region.coordinateWeights,x=Math.sqrt(w.x)*(point.x-region.center.x),y=Math.sqrt(w.y)*(point.y-region.center.y);
    const dot=x*dx+y*dy,discriminant=dot*dot+region.radius*region.radius-x*x-y*y;
    if(discriminant<0)continue;
    const root=Math.sqrt(discriminant),start=-dot-root,end=-dot+root;
    if(end>0)result.push({start,end,owners:[region]});
  }
  return result.sort((a,b)=>a.start-b.start||a.end-b.end);
}

/** Exits the connected union containing the point; later overlapping ellipses extend the same interval. */
function rayExit(regions:readonly RfcRegion[],point:{x:number;y:number},dx:number,dy:number):{distance:number;owners:RfcRegion[]}|null {
  let distance=0,owners:RfcRegion[]=[];
  for(const interval of intervals(regions,point,dx,dy)) {
    if(interval.start>distance+epsilon)break;
    if(interval.end>distance+epsilon){distance=interval.end;owners=interval.owners;}
    else if(Math.abs(interval.end-distance)<=epsilon)owners.push(...interval.owners);
  }
  return distance>0?{distance,owners}:null;
}

/**
 * Chooses one deterministic escape from a union, avoiding cancellation between foci.
 * All ellipses share the RFC coordinate metric. Sixteen rotated directions, four
 * coordinate axes and individual outward rays approximate the shortest physical escape; this is not an
 * exact ellipse-distance or polygon-union solver. An ID-dependent rotation resolves
 * center/tie cases without consuming TouchGraph's coincidence RNG.
 */
export function regionEscape(regions:readonly RfcRegion[],point:{x:number;y:number},id:string):RegionEscape|null {
  if(!regions.some(r=>regionClearance(r,point)<-epsilon))return null;
  const w=regions[0].coordinateWeights,sx=Math.sqrt(w.x),sy=Math.sqrt(w.y);
  if(regions.some(r=>r.coordinateWeights.x!==w.x||r.coordinateWeights.y!==w.y))throw new RangeError("Region escape requires a shared coordinate metric");
  let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
  const offset=hash/0x100000000*tau,angles=Array.from({length:16},(_,i)=>offset+i*tau/16);
  angles.push(0,Math.PI/2,Math.PI,Math.PI*1.5);
  for(const r of regions)if(regionClearance(r,point)<0) {
    const x=sx*(point.x-r.center.x),y=sy*(point.y-r.center.y);
    if(Math.hypot(x,y)>epsilon)angles.push(Math.atan2(y,x));
  }
  let best:RegionEscape|null=null;
  for(const angle of angles) {
    const dx=Math.cos(angle),dy=Math.sin(angle),exit=rayExit(regions,point,dx,dy);if(!exit)continue;
    const x=dx*exit.distance/sx,y=dy*exit.distance/sy,distance=Math.hypot(x,y);
    if(!best||distance<best.distance-epsilon)best={x,y,distance,owners:exit.owners};
  }
  return best;
}

/**
 * Applies one bounded impulse per intruder, with opposite reactions on the limiting
 * region's root/centroid anchors. Focal members are globally exempt unless overlap
 * exclusion is enabled; then only foreign regions exclude them. Since every member
 * lies inside its own fitted region, foreign containment is an intersection case.
 * Shared owners remain exempt. Regions are frozen for this force evaluation: radius
 * derivatives are not included, so refitting is not a conservative energy gradient.
 * @returns Focal members and nearby candidate intruders for the optional damping
 * union. A 90-physical-unit conservative watch margin keeps boundary crossings
 * observable rather than removing the node's history on every in/out step.
 */
export function applyRegionExclusion(nodes:Iterable<Node>,regions:readonly RfcRegion[],settings:RfcExclusionSettings,
  rigidity:number,length:number):Set<Node> {
  const affected=new Set<Node>();if(!settings.enabled||!settings.strength||!regions.length)return affected;
  const focal=new Set(regions.flatMap(r=>[...r.members]));
  for(const member of focal)affected.add(member);
  for(const node of nodes) {
    const isFocal=focal.has(node);if(isFocal&&!settings.overlap)continue;
    const foreign=isFocal?regions.filter(r=>!r.members.has(node)):regions;
    if(foreign.some(r=>regionClearance(r,node)<90*Math.sqrt(Math.max(r.coordinateWeights.x,r.coordinateWeights.y))))affected.add(node);
    const escape=regionEscape(foreign,node,node.getID()??"");if(!escape||escape.distance<=epsilon)continue;
    const magnitude=rigidity*settings.strength*escape.distance/(1+escape.distance/length);
    const fx=escape.x/escape.distance*magnitude,fy=escape.y/escape.distance*magnitude;
    const anchors=new Map<Node,number>();
    for(const owner of escape.owners)for(const a of owner.anchors)
      anchors.set(a.node,(anchors.get(a.node)??0)+a.fraction/escape.owners.length);
    for(const [anchor,fraction] of anchors) {
      branchImpulse(anchor,node,fx*fraction,fy*fraction);affected.add(anchor);
    }
    affected.add(node);
  }
  return affected;
}
