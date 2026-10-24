/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {Point} from "./shapes.js";
import type {OverlapBox} from "./overlap.js";

export type RelationLabelPlacement="original"|"avoid-overlap";
export interface RelationLabelBox extends OverlapBox {candidates:readonly Point[]}
export interface RelationLabelOptions {maxLabels?:number;maxChecks?:number;passes?:number}
export interface RelationLabelResult {positions:{id:string;x:number;y:number}[];moved:number;limited:boolean}
type Entry={box:OverlapBox;cells:string[]|null};
type Budget={left:number};
const cellSize=128;
function keys(box:OverlapBox):string[]|null {
  const left=Math.floor((box.x-box.width/2)/cellSize),top=Math.floor((box.y-box.height/2)/cellSize);
  const cols=Math.floor((box.x+box.width/2)/cellSize)-left+1,rows=Math.floor((box.y+box.height/2)/cellSize)-top+1;
  if(cols*rows>64)return null;
  return Array.from({length:cols*rows},(_,i)=>`${left+i%cols},${top+Math.floor(i/cols)}`);
}
/** Oversized rectangles use the shared overflow set; no unbounded cell iteration. */
class RectIndex {
  private readonly cells=new Map<string,Set<Entry>>();
  private readonly large=new Set<Entry>();
  private readonly all=new Set<Entry>();
  add(box:OverlapBox):Entry {const entry={box,cells:keys(box)};this.insert(entry);return entry;}
  private insert(entry:Entry):void {
    this.all.add(entry);
    if(!entry.cells){this.large.add(entry);return;}
    for(const key of entry.cells){const set=this.cells.get(key)??new Set<Entry>();set.add(entry);this.cells.set(key,set);}
  }
  move(entry:Entry,x:number,y:number):void {
    if(entry.cells)for(const key of entry.cells){const set=this.cells.get(key)!;set.delete(entry);if(!set.size)this.cells.delete(key);}
    else this.large.delete(entry);
    entry.box.x=x;entry.box.y=y;entry.cells=keys(entry.box);this.insert(entry);
  }
  query(box:OverlapBox,budget:Budget):Set<Entry>|null {
    const result=new Set<Entry>(),cells=keys(box),sets=cells?[this.large,...cells.map(key=>this.cells.get(key)??[])]:[this.all];
    for(const set of sets)for(const entry of set){if(budget.left--<=0)return null;result.add(entry);}
    return result;
  }
}
function valid(box:OverlapBox):void {
  if(!box||typeof box.id!=="string"||!box.id||![box.x,box.y,box.width,box.height,
    box.x-box.width/2,box.x+box.width/2,box.y-box.height/2,box.y+box.height/2].every(Number.isFinite)||box.width<=0||box.height<=0||box.fixed!==undefined&&typeof box.fixed!=="boolean")throw new TypeError("Invalid relation-label bounds");
}
/**
 * Chooses nearby candidate centers without moving obstacles or mutating inputs.
 * Each committed move reduces local intersections/area, or brings an equally clear label nearer its original anchor.
 * Candidate checks and arranged-label count are bounded; remaining labels keep their original positions.
 */
export function placeRelationLabels(labels:readonly RelationLabelBox[],obstacles:readonly OverlapBox[],options:RelationLabelOptions={}):RelationLabelResult {
  const {maxLabels=200,maxChecks=200000,passes=2}=options;
  if(!Number.isInteger(maxLabels)||maxLabels<1||maxLabels>2000||!Number.isInteger(maxChecks)||maxChecks<1||maxChecks>10000000||!Number.isInteger(passes)||passes<1||passes>10)throw new RangeError("Invalid relation-label work limits");
  const index=new RectIndex(),ids=new Set<string>();
  for(const box of obstacles){valid(box);index.add({...box});}
  const sorted=[...labels].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),entries=new Map<string,Entry>();
  for(const label of sorted){
    valid(label);if(ids.has(label.id)||!Array.isArray(label.candidates)||label.candidates.length>32)throw new TypeError("Invalid relation-label identities or candidates");ids.add(label.id);
    for(const p of label.candidates)valid({...label,x:p.x,y:p.y});
    entries.set(label.id,index.add({...label}));
  }
  const budget={left:maxChecks};let limited=labels.length>maxLabels;
  type Score={count:number;area:number;distance:number};
  const score=(entry:Entry,x:number,y:number,original:Point):Score|null=>{
    const box={...entry.box,x,y},near=index.query(box,budget);if(!near)return null;
    let count=0,area=0;
    for(const other of near){
      if(other===entry)continue;
      const a=other.box,dx=Math.min(box.x+box.width/2,a.x+a.width/2)-Math.max(box.x-box.width/2,a.x-a.width/2),
        dy=Math.min(box.y+box.height/2,a.y+a.height/2)-Math.max(box.y-box.height/2,a.y-a.height/2);
      if(dx>0&&dy>0){count++;area+=dx*dy;}
    }
    return {count,area,distance:Math.hypot(x-original.x,y-original.y)};
  };
  const better=(a:Score,b:Score)=>a.count<b.count||a.count===b.count&&(a.area<b.area-1e-6||Math.abs(a.area-b.area)<1e-6&&a.distance<b.distance-1e-6);
  work:for(let pass=0;pass<passes;pass++){
    let moved=false;
    for(const label of sorted.slice(0,maxLabels)){
      if(label.fixed)continue;
      const entry=entries.get(label.id)!,current=score(entry,entry.box.x,entry.box.y,label);
      if(!current){limited=true;break work;}
      let best=current,point={x:entry.box.x,y:entry.box.y};
      for(const candidate of [{x:label.x,y:label.y},...label.candidates]){
        const value=score(entry,candidate.x,candidate.y,label);if(!value){limited=true;break work;}
        if(better(value,best)){best=value;point=candidate;}
      }
      if(point.x!==entry.box.x||point.y!==entry.box.y){index.move(entry,point.x,point.y);moved=true;}
    }
    if(!moved)break;
  }
  const positions=sorted.map(label=>{const b=entries.get(label.id)!.box;return {id:label.id,x:b.x,y:b.y};});
  return {positions,moved:sorted.filter((label,i)=>positions[i]!.x!==label.x||positions[i]!.y!==label.y).length,limited};
}
