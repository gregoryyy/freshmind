/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import type { FreshEdge, FreshNode } from "../model/index.js";
import type { EdgeStyle, NodeStyle } from "../config/core.js";
import { createNodeOutline } from "./shapes.js";
import type { Point } from "./shapes.js";
export type { Point } from "./shapes.js";

/** Shared curve result in draw pixels; path and distance picking use the clipped visible span. */
export interface EdgeGeometry {
  path: string;
  kind: "quadratic" | "loop";
  /** Original quadratic control point; unused for cubic loops. */
  control: Point;
  start: Point;
  end: Point;
  /** Point at t=0.5 on the original curve, before endpoint clipping. */
  midpoint: Point;
  /** Default midpoint plus label offset; browser placement may choose a measured nearby anchor. */
  labelAnchor: Point;
  arrowPoint: Point;
  /** Tangent angle in degrees, suitable for an SVG rotate transform. */
  arrowAngle: number;
  /** Evaluates the original unclipped curve, with t in [0, 1]. */
  pointAt(t: number): Point;
  /** Evaluates the unnormalized derivative of the original curve at t. */
  tangentAt(t: number): Point;
  /** Approximates distance to the visible curve using 128 straight segments. */
  distanceFrom(point: Point): number;
}
export type WorldToDraw = (x: number, y: number) => Point;
const add = (a: Point,b: Point): Point => ({x:a.x+b.x,y:a.y+b.y});
const scale = (p: Point,s: number): Point => ({x:p.x*s,y:p.y*s});
const lerp = (a: Point,b: Point,t: number): Point => add(scale(a,1-t),scale(b,t));
function lineDistance(p: Point,a: Point,b: Point): number {
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  const t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
/**
 * Constructs Java spider/lens/straight geometry through the supplied viewing transform.
 * Spider transforms ((x0+x1)/2, y0); lens chooses Q=2B-M so the curve midpoint
 * passes through the transformed world midpoint B. Self/coincident endpoints use
 * cubic loops. Boundary sampling/refinement clips node bodies when separable,
 * retaining exact subcurve drawing and a sampled visible span for picking.
 * @param edge Relation with physical endpoint positions and measured body dimensions.
 * @param transform Complete world-to-draw lens composition; endpoint positions are not mutated.
 * @param style Resolved curve, arrow and label presentation.
 * @param fromStyle Resolved source shape for clipping.
 * @param toStyle Resolved target shape for clipping.
 * @param routeIndex Zero for the base route; subsequent routes alternate offsets or enlarge loops.
 * @param canonicalDirection +1 or -1 to keep reciprocal route offsets in a common orientation.
 * @returns Drawing, picking, arrow and label/editor anchors in the same coordinate space.
 */
export function createEdgeGeometry(edge: FreshEdge, transform: WorldToDraw, style: EdgeStyle,
  fromStyle: NodeStyle, toStyle: NodeStyle, routeIndex = 0, canonicalDirection = 1): EdgeGeometry {
  const a=transform(edge.from.x,edge.from.y),z=transform(edge.to.x,edge.to.y),m=lerp(a,z,.5);
  const fromOutline=createNodeOutline(fromStyle.shape,edge.from.getWidth(),edge.from.getHeight());
  const toOutline=createNodeOutline(toStyle.shape,edge.to.getWidth(),edge.to.getHeight());
  const insideFrom=(p:Point)=>fromOutline.contains({x:p.x-a.x,y:p.y-a.y});
  const insideTo=(p:Point)=>toOutline.contains({x:p.x-z.x,y:p.y-z.y});
  let q: Point;
  if(style.curve === "spider") q=transform((edge.from.x+edge.to.x)/2,edge.from.y);
  else if(style.curve === "lens") {const b=transform((edge.from.x+edge.to.x)/2,(edge.from.y+edge.to.y)/2);q=add(scale(b,2),scale(m,-1));}
  else q=m;
  const length=Math.hypot(z.x-a.x,z.y-a.y);
  if(routeIndex && length>1e-8) {
    const offset=(routeIndex%2?1:-1)*Math.ceil(routeIndex/2)*24*canonicalDirection;
    q=add(q,{x:-(z.y-a.y)/length*offset,y:(z.x-a.x)/length*offset});
  }
  const loop=edge.from===edge.to||length<1e-8;
  const radius=Math.max(edge.from.getWidth(),edge.from.getHeight(),edge.to.getWidth(),edge.to.getHeight())/2+36+routeIndex*18;
  const c1={x:a.x+radius*2,y:a.y-radius*2},c2={x:z.x-radius*2,y:z.y-radius*2};
  const pointAt=(t:number):Point=>loop
    ?add(add(scale(a,(1-t)**3),scale(c1,3*(1-t)**2*t)),add(scale(c2,3*(1-t)*t*t),scale(z,t**3)))
    :add(add(scale(a,(1-t)**2),scale(q,2*(1-t)*t)),scale(z,t*t));
  const tangentAt=(t:number):Point=>loop
    ?add(add(scale({x:c1.x-a.x,y:c1.y-a.y},3*(1-t)**2),scale({x:c2.x-c1.x,y:c2.y-c1.y},6*(1-t)*t)),scale({x:z.x-c2.x,y:z.y-c2.y},3*t*t))
    :add(scale({x:q.x-a.x,y:q.y-a.y},2*(1-t)),scale({x:z.x-q.x,y:z.y-q.y},2*t));
  // Find the first/last points outside the node bodies, then refine each boundary.
  let startT=0,endT=1;
  for(let i=1;i<=128;i++) if(!insideFrom(pointAt(i/128))) {
    let low=(i-1)/128,high=i/128;
    for(let j=0;j<24;j++){const mid=(low+high)/2;if(insideFrom(pointAt(mid)))low=mid;else high=mid;}
    startT=high;break;
  }
  for(let i=127;i>=0;i--) if(!insideTo(pointAt(i/128))) {
    let low=i/128,high=(i+1)/128;
    for(let j=0;j<24;j++){const mid=(low+high)/2;if(insideTo(pointAt(mid)))high=mid;else low=mid;}
    endT=low;break;
  }
  if(startT>=endT){startT=0;endT=1;}
  const start=pointAt(startT),end=pointAt(endT),span=endT-startT;
  let path:string;
  if(loop){
    const ts=tangentAt(startT),te=tangentAt(endT),u=add(start,scale(ts,span/3)),v=add(end,scale(te,-span/3));
    path=`M ${start.x} ${start.y} C ${u.x} ${u.y} ${v.x} ${v.y} ${end.x} ${end.y}`;
  }else{
    const control=add(start,scale(tangentAt(startT),span/2));
    path=`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  }
  const midpoint=pointAt(.5),arrowT=style.arrow.placement==="end"?endT:.5,tangent=tangentAt(arrowT);
  // Shared flattened representation bounds programmatic picking to the visible stroke.
  const samples=Array.from({length:129},(_,i)=>pointAt(startT+span*i/128));
  return {path,kind:loop?"loop":"quadratic",control:q,start,end,midpoint,
    labelAnchor:add(midpoint,style.label.offset),arrowPoint:pointAt(arrowT),arrowAngle:Math.atan2(tangent.y,tangent.x)*180/Math.PI,
    pointAt,tangentAt,distanceFrom:p=>{let min=Infinity;for(let i=1;i<samples.length;i++)min=Math.min(min,lineDistance(p,samples[i-1],samples[i]));return min;}};
}

/**
 * Routes each unordered endpoint pair together, ordering its relations by stable edge IDs.
 * Offsets distinguish parallel/reciprocal edges without reordering the supplied array,
 * live graph adjacency or layout accumulation. All callbacks supply resolved presentation.
 * @returns Geometry keyed by the original edge objects.
 */
export function routeEdges(edges: FreshEdge[], transform: WorldToDraw, edgeStyle: (edge:FreshEdge)=>EdgeStyle,
  nodeStyle:(node:FreshNode)=>NodeStyle): Map<FreshEdge,EdgeGeometry> {
  const groups=new Map<string,FreshEdge[]>();
  for(const edge of edges){const key=JSON.stringify([edge.from.getID(),edge.to.getID()].sort());const group=groups.get(key)??[];group.push(edge);groups.set(key,group);}
  const result=new Map<FreshEdge,EdgeGeometry>();
  for(const group of groups.values()) {
    group.sort((a,b)=>{const left=a.getID()??"",right=b.getID()??"";return left<right?-1:left>right?1:0;});
    group.forEach((edge,index)=>result.set(edge,createEdgeGeometry(edge,transform,edgeStyle(edge),nodeStyle(edge.from),nodeStyle(edge.to),index,
      (edge.from.getID()??"")<=(edge.to.getID()??"")?1:-1)));
  }
  return result;
}
