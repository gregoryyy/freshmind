import test from 'node:test';
import assert from 'node:assert/strict';
import {placeRelationLabels} from 'fm4/fm/geometry';
import {FreshmindPanel} from 'fm4/fm/browser';
const box=(id,x,y,width=60,height=14)=>({id,x,y,width,height});
function collisions(labels,obstacles){
  let count=0,area=0;
  for(let i=0;i<labels.length;i++)for(const other of [...obstacles,...labels.slice(i+1)]){
    const a=labels[i],x=Math.min(a.x+a.width/2,other.x+other.width/2)-Math.max(a.x-a.width/2,other.x-other.width/2),
      y=Math.min(a.y+a.height/2,other.y+other.height/2)-Math.max(a.y-a.height/2,other.y-other.height/2);
    if(x>0&&y>0){count++;area+=x*y;}
  }return {count,area};
}
test('relation labels choose clear nearby candidates while obstacles and inputs remain unchanged',()=>{
  const labels=[{...box('first',0,0),candidates:[{x:0,y:-30},{x:0,y:30}]},
    {...box('second',0,0),candidates:[{x:0,y:-30},{x:0,y:30}]}],obstacles=[box('node',0,0,100,35)],copy=structuredClone({labels,obstacles});
  const result=placeRelationLabels(labels,obstacles),placed=labels.map(label=>({...label,...result.positions.find(p=>p.id===label.id)}));
  assert.equal(collisions(placed,obstacles).count,0);assert.equal(result.moved,2);assert.equal(result.limited,false);
  assert.deepEqual({labels,obstacles},copy);assert.deepEqual(placeRelationLabels([...labels].reverse(),obstacles),result);
  const clear=[{...box('clear',200,100),candidates:[{x:200,y:200}]}];assert.equal(placeRelationLabels(clear,obstacles).moved,0);
  const pinned=[{...labels[0],fixed:true},labels[1]];assert.deepEqual(placeRelationLabels(pinned,obstacles).positions[0],{id:'first',x:0,y:0});
});
test('spatial candidate placement never increases total intersections on varied fixtures',()=>{
  let seed=13;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  for(let trial=0;trial<75;trial++){
    const labels=Array.from({length:20},(_,i)=>{
      const b=box(`label-${i}`,random()*500-250,random()*400-200,20+random()*100,12+random()*15);
      return {...b,candidates:Array.from({length:8},()=>({x:b.x+(random()-.5)*100,y:b.y+(random()-.5)*100}))};
    });
    const obstacles=Array.from({length:8},(_,i)=>box(`node-${i}`,random()*500-250,random()*400-200,100,35)),before=collisions(labels,obstacles);
    const result=placeRelationLabels(labels,obstacles),byId=new Map(result.positions.map(p=>[p.id,p]));
    const after=collisions(labels.map(label=>({...label,...byId.get(label.id)})),obstacles);
    assert.ok(after.count<=before.count);if(after.count===before.count)assert.ok(after.area<=before.area+1e-5);
  }
});
test('work limits, oversized rectangles, negative coordinates and impossible conflicts retain valid positions',()=>{
  const labels=Array.from({length:8},(_,i)=>({...box(String(i),-20,-20),candidates:[{x:100+i*70,y:100}]})),obstacles=[box('huge',0,0,10000,10000)];
  const limited=placeRelationLabels(labels,obstacles,{maxChecks:1});assert.equal(limited.limited,true);assert.equal(limited.moved,0);
  const capped=placeRelationLabels(labels,[],{maxLabels:1});assert.equal(capped.limited,true);assert.ok(capped.moved<=1);
  assert.deepEqual(placeRelationLabels([],[]),{positions:[],moved:0,limited:false});
  for(const options of [{maxChecks:0},{maxLabels:0},{passes:NaN}])assert.throws(()=>placeRelationLabels(labels,obstacles,options));
  for(const input of [[labels[0],labels[0]],[{...labels[0],width:0}],[{...labels[0],candidates:[{x:NaN,y:0}]}]])assert.throws(()=>placeRelationLabels(input,[]));
});
test('relation label preference is validated, transient and independent of layout state',()=>{
  const panel=new FreshmindPanel();
  try{
    const state=panel.tgLayout.getState();assert.equal(panel.getRelationLabelPlacement(),'original');
    panel.setRelationLabelPlacement('avoid-overlap');assert.equal(panel.getRelationLabelPlacement(),'avoid-overlap');assert.deepEqual(panel.tgLayout.getState(),state);
    assert.throws(()=>panel.setRelationLabelPlacement('hidden'));assert.equal(panel.getRelationLabelPlacement(),'avoid-overlap');
    panel.clearAll();assert.equal(panel.getRelationLabelPlacement(),'avoid-overlap');
    assert.throws(()=>new FreshmindPanel(undefined,{relationLabelPlacement:'hidden'}));
  }finally{panel.destroy();}
});
