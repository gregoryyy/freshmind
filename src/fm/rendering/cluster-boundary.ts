/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type {Point} from "./geometry.js";

/** Node body bounds in drawing coordinates, before the common canvas transform. */
export interface ClusterBoundaryBox {x:number;y:number;width:number;height:number;}
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
/** Monotone-chain convex hull; removes duplicate and collinear interior points. */
function hull(points:Point[]):Point[] {
  const sorted=points.sort((a,b)=>a.x-b.x||a.y-b.y).filter((p,i,all)=>!i||p.x!==all[i-1].x||p.y!==all[i-1].y);
  if(sorted.length<3)return sorted;
  const half=(input:Point[])=>{const out:Point[]=[];for(const p of input){while(out.length>1&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p);}return out;};
  return [...half(sorted).slice(0,-1),...half([...sorted].reverse()).slice(0,-1)];
}
/**
 * Encloses node bodies and Bézier control points with a convex hull expanded by
 * a disk. Tangent lines/arcs form a smooth boundary without spline corner-cutting.
 * Singletons, coincident bodies and collinear members remain valid enclosures.
 * @returns Closed SVG path, or an empty string when no member boxes are supplied.
 */
export function createClusterBoundary(boxes:readonly ClusterBoundaryBox[],controls:readonly Point[]=[],padding=24):string {
  if(!Number.isFinite(padding)||padding<0)throw new RangeError("Cluster padding must be finite and nonnegative");
  if(!boxes.length)return "";
  const points:Point[]=[];
  for(const b of boxes) {
    if(![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<0||b.height<0)throw new RangeError("Cluster bounds must be finite with nonnegative dimensions");
    for(const x of [b.x-b.width/2,b.x+b.width/2])for(const y of [b.y-b.height/2,b.y+b.height/2])points.push({x,y});
  }
  for(const p of controls){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw new RangeError("Cluster curve controls must be finite");points.push({x:p.x,y:p.y});}
  const polygon=hull(points),r=padding;
  if(!r)return `M ${polygon.map(p=>`${p.x} ${p.y}`).join(" L ")} Z`;
  if(polygon.length===1) {const p=polygon[0];return `M ${p.x-r} ${p.y} A ${r} ${r} 0 1 1 ${p.x+r} ${p.y} A ${r} ${r} 0 1 1 ${p.x-r} ${p.y} Z`;}
  const normals=polygon.map((p,i)=>{const q=polygon[(i+1)%polygon.length],d=Math.hypot(q.x-p.x,q.y-p.y);return {x:(q.y-p.y)/d,y:-(q.x-p.x)/d};});
  const at=(p:Point,n:Point)=>`${p.x+r*n.x} ${p.y+r*n.y}`;
  let path=`M ${at(polygon[0],normals.at(-1)!)}`;
  for(const [i,p] of polygon.entries())path+=` A ${r} ${r} 0 0 1 ${at(p,normals[i])} L ${at(polygon[(i+1)%polygon.length],normals[i])}`;
  return path+" Z";
}
