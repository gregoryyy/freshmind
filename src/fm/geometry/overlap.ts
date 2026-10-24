/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */

/** Axis-aligned body bounds, including the label, in one shared coordinate system. */
export interface OverlapBox {id:string;x:number;y:number;width:number;height:number;fixed?:boolean}
export interface OverlapOptions {gap?:number;maxPasses?:number}
export interface OverlapResult {boxes:OverlapBox[];before:number;after:number;moved:number;passes:number}

function settings(options:OverlapOptions):{gap:number;maxPasses:number} {
  const {gap=8,maxPasses=100}=options;
  if(!Number.isFinite(gap)||gap<0||gap>100)throw new RangeError("Label gap must be 0–100 pixels");
  if(!Number.isInteger(maxPasses)||maxPasses<1||maxPasses>500)throw new RangeError("Overlap passes must be 1–500");
  return {gap,maxPasses};
}
function snapshot(input:readonly OverlapBox[]):OverlapBox[] {
  const ids=new Set<string>();
  return input.map(box=>{
    if(!box||typeof box.id!=="string"||!box.id||ids.has(box.id))throw new TypeError("Overlap boxes need unique nonempty IDs");
    ids.add(box.id);
    if(![box.x,box.y,box.width,box.height].every(Number.isFinite)||box.width<=0||box.height<=0||box.fixed!==undefined&&typeof box.fixed!=="boolean")throw new TypeError("Invalid overlap bounds");
    return {...box};
  }).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
/** Sweep on horizontal bounds avoids comparing distant pairs. Mutation callers repeat the sweep. */
function pairs(boxes:OverlapBox[],gap:number,visit:(a:OverlapBox,b:OverlapBox,x:number,y:number)=>void,budget?:{remaining:number}):boolean {
  const ordered=[...boxes].sort((a,b)=>(a.x-a.width/2)-(b.x-b.width/2)||(a.id<b.id?-1:1));
  for(let i=0;i<ordered.length;i++){
    const a=ordered[i]!;
    for(let j=i+1;j<ordered.length;j++){
      const b=ordered[j]!;
      if(b.x-b.width/2>=a.x+a.width/2+gap)break;
      if(budget&&budget.remaining--<=0)return false;
      const x=a.width/2+b.width/2+gap-Math.abs(a.x-b.x),y=a.height/2+b.height/2+gap-Math.abs(a.y-b.y);
      if(x>0&&y>0)visit(a,b,x,y);
    }
  }
  return true;
}
/** Counts intersecting body rectangles; touching boundaries are not overlaps. */
export function countNodeOverlaps(input:readonly OverlapBox[]):number {
  let count=0;pairs(snapshot(input),0,()=>count++);return count;
}
/**
 * Bounded deterministic minimum-axis separation, preserving pinned boxes and input values.
 * This is a one-shot arrangement, not a force or an optimal packing guarantee.
 */
export function separateNodeOverlaps(input:readonly OverlapBox[],options:OverlapOptions={}):OverlapResult {
  const {gap,maxPasses}=settings(options),boxes=snapshot(input),start=new Map(boxes.map(b=>[b.id,{x:b.x,y:b.y}]));
  const before=countNodeOverlaps(boxes),budget={remaining:1000000};let passes=0;
  for(;passes<maxPasses;passes++){
    let changed=false;
    const completed=pairs(boxes,gap,(a,b,x,y)=>{
      if(a.fixed&&b.fixed)return;
      const axis=x<y?"x":"y",amount=(axis==="x"?x:y)+.05;
      const direction=a[axis]===b[axis]?(a.id<b.id?-1:1):Math.sign(a[axis]-b[axis]);
      const first=a.fixed?0:b.fixed?1:.5,second=b.fixed?0:a.fixed?1:.5;
      a[axis]+=direction*amount*first;b[axis]-=direction*amount*second;changed=true;
    },budget);
    if(!completed){passes++;break;}
    if(!changed)break;
  }
  if(boxes.some(b=>!Number.isFinite(b.x)||!Number.isFinite(b.y)))throw new RangeError("Overlap arrangement exceeds finite coordinates");
  let after=countNodeOverlaps(boxes);
  // A capped or constrained attempt must not leave more body intersections than it started with.
  if(after>before){for(const b of boxes)Object.assign(b,start.get(b.id));after=before;}
  return {boxes,before,after,moved:boxes.filter(b=>b.x!==start.get(b.id)!.x||b.y!==start.get(b.id)!.y).length,passes};
}
