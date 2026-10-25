/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
export interface DiskPoint {x:number;y:number}
export interface DiskBody extends DiskPoint {id:string;width:number;height:number}
export interface SearchDisk {x:number;y:number;radius:number;ringRadius:number}
/** Screen-space (before canvas scaling) clearance, accounting for the complete rectangular label body. */
export function diskBodyClearance(disk:SearchDisk,body:DiskBody):number {
  return Math.hypot(Math.max(0,Math.abs(body.x-disk.x)-body.width/2),Math.max(0,Math.abs(body.y-disk.y)-body.height/2))-disk.radius;
}
/** Conservative rim spacing bounds result bodies by circles; no graph data or input is changed. */
export function searchDiskGeometry(center:DiskBody,results:readonly DiskBody[]):SearchDisk {
  const extent=Math.max(0,...results.map(b=>Math.hypot(b.width,b.height)/2));
  const interior=Math.max(80,Math.hypot(center.width,center.height)/2+24);
  const ringRadius=Math.max(interior+extent+16,results.length>1?(2*extent+20)/(2*Math.sin(Math.PI/results.length)):0);
  return {x:center.x,y:center.y,radius:ringRadius-extent-16,ringRadius};
}
export function searchDiskEscape(disk:SearchDisk,body:DiskBody):DiskPoint|null {
  if(diskBodyClearance(disk,body)>=8)return null;
  let dx=body.x-disk.x,dy=body.y-disk.y,d=Math.hypot(dx,dy);
  if(d<1e-8){let hash=0;for(const char of body.id)hash=(Math.imul(hash,31)+char.charCodeAt(0))|0;const angle=(hash>>>0)/4294967296*2*Math.PI;dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
  const radius=disk.radius+Math.hypot(body.width,body.height)/2+10;
  return {x:disk.x+dx/d*radius,y:disk.y+dy/d*radius};
}
/** Refines approximate historical inverse lenses without changing their compatibility implementation. */
export function solveDiskPosition(target:DiskPoint,project:(p:DiskPoint)=>DiskPoint,inverse:(p:DiskPoint)=>DiskPoint):DiskPoint|null {
  let p=inverse(target);
  for(let i=0;i<20;i++){
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.max(Math.abs(p.x),Math.abs(p.y))>1e9)return null;
    const q=project(p),ex=target.x-q.x,ey=target.y-q.y;if(Math.hypot(ex,ey)<.01)return p;
    const step=Math.max(.01,Math.hypot(p.x,p.y)*1e-6),a=project({x:p.x+step,y:p.y}),b=project({x:p.x,y:p.y+step});
    const ax=(a.x-q.x)/step,ay=(a.y-q.y)/step,bx=(b.x-q.x)/step,by=(b.y-q.y)/step,det=ax*by-ay*bx;
    if(!Number.isFinite(det)||Math.abs(det)<1e-12)return null;
    p={x:p.x+(ex*by-ey*bx)/det,y:p.y+(ey*ax-ex*ay)/det};
  }
  return null;
}
