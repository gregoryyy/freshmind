/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type {Node,Edge} from "../../tg/model.js";
import type {CoordinateWeights,RfcSettings} from "./types.js";
import {rfcNodeImportance,rfcRelationStrength} from "./importance.js";
import {branchImpulse} from "./forces.js";

export interface ClusterGeometry {
  center:{x:number;y:number}; radius:number;
  members:{node:Node;importance:number}[];
}
/** Derives an unanchored, importance-weighted center and soft radius in weighted coordinates. */
export function clusterGeometry(nodes:readonly Node[],length:number):ClusterGeometry {
  const members=nodes.map(node=>({node,importance:rfcNodeImportance(node)})).filter(m=>m.importance>0);
  const total=members.reduce((sum,m)=>sum+m.importance,0);
  return {center:total?{
    x:members.reduce((sum,m)=>sum+m.node.x*(m.importance/total),0),
    y:members.reduce((sum,m)=>sum+m.node.y*(m.importance/total),0)
  }:{x:0,y:0},radius:length*Math.sqrt(members.length)/2,members};
}

/**
 * Adds a soft length cap, optional extra attraction and a two-sided rigidity spring.
 * Rigidity targets the semantic spring length scaled by focalLength/120. Degree
 * normalization limits dense/parallel-link stiffness without pinning the subgraph.
 */
export function applyClusterLink(edge:Edge,settings:Pick<RfcSettings,"radialStiffness"|"radialLength"|"springMultiplier"|"coordinateWeights">,rigidity:number,degree:number,linkStiffness=0):void {
  if(edge.from===edge.to)return;
  const weights=settings.coordinateWeights,x=edge.to.x-edge.from.x,y=edge.to.y-edge.from.y;
  const distance=Math.hypot(Math.sqrt(weights.x)*x,Math.sqrt(weights.y)*y),radius=Math.hypot(distance,1);
  const factor=rigidity*rfcRelationStrength(edge)/Math.max(1,degree);
  const target=edge.getLength()*settings.radialLength/120;
  const pull=factor*(linkStiffness*(1-target/radius)+settings.radialStiffness*Math.max(0,1-settings.radialLength/radius)
    +(settings.springMultiplier-1)*distance/(edge.getLength()*100));
  branchImpulse(edge.from,edge.to,-weights.x*x*pull,-weights.y*y*pull);
}

/**
 * Differentiates Σ sᵢ·max(0,Dᵢ−R)² about the moving weighted centroid. The
 * centroid reaction is distributed to every member, never to the representative.
 * A quarter-strength soft boundary leaves ordinary TouchGraph repulsion in control
 * inside the region. Shared structures reduce this term by their maximum ownership.
 */
export function applyClusterCompactness(nodes:readonly Node[],settings:Pick<RfcSettings,"radialStiffness"|"radialLength"|"coordinateWeights">,rigidity:number,ownership?:ReadonlyMap<Node,number>):void {
  if(!settings.radialStiffness)return;
  const geometry=clusterGeometry(nodes,settings.radialLength),members=geometry.members;
  if(members.length<2)return;
  const total=members.reduce((sum,m)=>sum+m.importance,0),weights:CoordinateWeights=settings.coordinateWeights;
  let sharing=1;for(const {node} of members)sharing=Math.max(sharing,ownership?.get(node)??1);
  const coefficient=settings.radialStiffness*rigidity/(4*sharing);
  const impulses=members.map(({node,importance})=>{
    const x=node.x-geometry.center.x,y=node.y-geometry.center.y;
    const distance=Math.hypot(Math.sqrt(weights.x)*x,Math.sqrt(weights.y)*y);
    const pull=distance>geometry.radius?coefficient*importance*(1-geometry.radius/distance):0;
    return {node,fraction:importance/total,x:-weights.x*x*pull,y:-weights.y*y*pull};
  });
  // Equivalent to distributing each impulse's reaction to all members with
  // branchImpulse's locality rule, evaluated in O(n) instead of O(n²).
  const groups=[{fraction:0,x:0,y:0},{fraction:0,x:0,y:0}];
  for(const impulse of impulses) {
    const group=groups[impulse.node.justMadeLocal?1:0];group.fraction+=impulse.fraction;group.x+=impulse.x;group.y+=impulse.y;
  }
  for(const {node,fraction,x,y} of impulses) {
    const localScale=node.justMadeLocal?1:.1;
    const mass=groups[0].fraction+localScale*groups[1].fraction;
    node.dx+=x*mass-fraction*(groups[0].x+localScale*groups[1].x);
    node.dy+=y*mass-fraction*(groups[0].y+localScale*groups[1].y);
  }
}
