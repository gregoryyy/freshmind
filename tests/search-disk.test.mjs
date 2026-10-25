import test from 'node:test';
import assert from 'node:assert/strict';
import {searchDiskGeometry,searchDiskEscape,diskBodyClearance,solveDiskPosition} from '../dist/fm/geometry/index.js';
import {GraphEltSet,Node,TGLayout} from 'fm4/core';

const body=(id,x=0,y=0,width=160,height=40)=>({id,x,y,width,height});
test('search disk clears whole label rectangles, spaces rim bodies and deterministically resolves coincidences',()=>{
  const source=body('query'),results=Array.from({length:8},(_,i)=>body(String(i),0,0,100+i*20,50));
  const disk=searchDiskGeometry(source,results),input=body('context');
  const escaped=searchDiskEscape(disk,input);assert.ok(escaped);assert.deepEqual(escaped,searchDiskEscape(disk,input));
  assert.ok(diskBodyClearance(disk,{...input,...escaped})>=8);assert.equal(input.x,0);
  for(let i=0;i<results.length;i++)for(let j=i+1;j<results.length;j++){
    const distance=2*disk.ringRadius*Math.abs(Math.sin(Math.PI*(j-i)/results.length));
    assert.ok(distance>Math.hypot(results[i].width,50)/2+Math.hypot(results[j].width,50)/2);
  }
  assert.equal(searchDiskEscape(disk,body('far',10000,0)),null);
});
test('disk inverse refinement checks actual forward placement and rejects singular/nonfinite transforms',()=>{
  const project=p=>({x:2*p.x+.3*p.y+30,y:-.2*p.x+3*p.y+40}),target={x:230,y:-50};
  const p=solveDiskPosition(target,project,p=>({...p}));assert.ok(p);assert.ok(Math.hypot(project(p).x-target.x,project(p).y-target.y)<.01);
  assert.equal(solveDiskPosition(target,()=>({x:0,y:0}),p=>p),null);
  assert.equal(solveDiskPosition(target,p=>p,()=>({x:NaN,y:0})),null);
});
test('layout constraints bypass a cooled damper, protect fixed and dragged nodes, validate batches and dispose',()=>{
  const graph=new GraphEltSet(),nodes=['move','pin','drag'].map(id=>{const n=new Node(id);n.repulsion=0;n.x=0;n.y=0;graph.addNode(n);return n;});
  nodes[1].fixed=true;const layout=new TGLayout({getGES:()=>graph,repaintAfterMove(){}},()=>.5);layout.setDragNode(nodes[2]);
  const remove=layout.addConstraint(()=>new Map(nodes.map(n=>[n,{x:150,y:20}])));layout.tick();
  assert.deepEqual(nodes.map(n=>[n.x,n.y]),[[150,20],[0,0],[0,0]]);assert.equal(nodes[0].dx,0);
  remove();nodes[0].x=0;layout.tick();assert.equal(nodes[0].x,0);
  const stale=new Node('move');const bad=layout.addConstraint(()=>new Map([[nodes[0],{x:99,y:0}],[stale,{x:1,y:1}]]));
  assert.throws(()=>layout.tick(),/Invalid layout constraint/);assert.equal(nodes[0].x,0);bad();
  const nonfinite=layout.addConstraint(()=>new Map([[nodes[0],{x:Infinity,y:0}]]));assert.throws(()=>layout.tick(),/Invalid layout constraint/);nonfinite();
});
