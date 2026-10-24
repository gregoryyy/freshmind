import test from 'node:test';
import assert from 'node:assert/strict';
import {countNodeOverlaps,separateNodeOverlaps} from 'fm4/fm/geometry';
import {FreshmindPanel,separateNodeLabels} from 'fm4/fm/browser';
import {FreshNode,FreshEdge} from 'fm4/fm/model';
import {graphSearchCorpus} from 'fm4/fm/ir';

const box=(id,x,y,width=120,height=30,fixed=false)=>({id,x,y,width,height,fixed});
test('rectangle separation handles wide and multiline labels deterministically without changing inputs',()=>{
  const input=[box('a',0,0,200,60),box('b',30,10,180,28),box('c',-10,20,140,45),box('d',100,5,50,80)],copy=structuredClone(input);
  const result=separateNodeOverlaps(input,{gap:8});
  assert.ok(result.before>0);assert.equal(result.after,0);assert.ok(result.moved>0);
  assert.deepEqual(input,copy);assert.deepEqual(separateNodeOverlaps([...input].reverse()),result);
  for(let i=0;i<result.boxes.length;i++)for(let j=i+1;j<result.boxes.length;j++){
    const a=result.boxes[i],b=result.boxes[j];
    assert.ok(Math.abs(a.x-b.x)>=a.width/2+b.width/2+8-.001||Math.abs(a.y-b.y)>=a.height/2+b.height/2+8-.001);
  }
  assert.equal(countNodeOverlaps([box('a',0,0),box('b',120,0)]),0);
});
test('fixed conflicts remain explicit while movable and coincident nodes are separated within the pass budget',()=>{
  const input=[box('fixed-a',0,0,100,30,true),box('fixed-b',0,0,100,30,true),box('free',0,0,100,30)];
  const result=separateNodeOverlaps(input,{gap:10});
  assert.equal(result.before,3);assert.equal(result.after,1);assert.equal(result.moved,1);
  for(const old of input.filter(b=>b.fixed))assert.deepEqual(result.boxes.find(b=>b.id===old.id),old);
  const limited=separateNodeOverlaps(Array.from({length:30},(_,i)=>box(String(i),0,0)),{maxPasses:1});
  assert.equal(limited.passes,1);assert.ok(limited.after>0);assert.ok(limited.after<limited.before);
  assert.deepEqual(separateNodeOverlaps([]),{boxes:[],before:0,after:0,moved:0,passes:0});
  for(const options of [{gap:-1},{gap:NaN},{maxPasses:0},{maxPasses:501}])assert.throws(()=>separateNodeOverlaps(input,options));
  for(const invalid of [[box('a',0,0),box('a',1,2)],[box('a',Infinity,0)],[box('a',0,0,0)]])assert.throws(()=>separateNodeOverlaps(invalid));
});
test('sweep counts and bounded arrangements agree with independent intersections across varied pinned fixtures',()=>{
  let seed=71;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
  const intersections=boxes=>{
    let count=0;
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i],b=boxes[j];
      if(Math.max(a.x-a.width/2,b.x-b.width/2)<Math.min(a.x+a.width/2,b.x+b.width/2)&&
        Math.max(a.y-a.height/2,b.y-b.height/2)<Math.min(a.y+a.height/2,b.y+b.height/2))count++;
    }return count;
  };
  for(let trial=0;trial<100;trial++){
    const input=Array.from({length:12},(_,i)=>box(String(i),random()*300,random()*200,20+random()*160,20+random()*60,random()<.25));
    const result=separateNodeOverlaps(input,{maxPasses:5,gap:random()*15});
    assert.equal(result.before,intersections(input));assert.equal(result.after,intersections(result.boxes));assert.ok(result.after<=result.before);
    for(const pinned of input.filter(b=>b.fixed))assert.deepEqual(result.boxes.find(b=>b.id===pinned.id),pinned);
  }
});
test('label arrangement preserves graph identity, hidden/fixed/dragged/focus nodes, RFC, search corpus and view transforms',async()=>{
  const panel=new FreshmindPanel();
  try{
    const focus=panel.addNode(new FreshNode('focus','Viewing center',{position:{x:0,y:0}}));
    const pinned=panel.addNode(new FreshNode('pinned','Pinned',{position:{x:10,y:0},fixed:true}));
    const dragged=panel.addNode(new FreshNode('dragged','Dragging',{position:{x:20,y:0}}));
    const free=panel.addNode(new FreshNode('free','A long multiline\nnode label',{position:{x:15,y:5},weight:9}));
    const hidden=panel.addNode(new FreshNode('hidden','Hidden',{position:{x:30,y:0}}));
    const edges=[pinned,dragged,free].map(node=>panel.addEdge(new FreshEdge(focus,node,{label:'related'})));
    await panel.setLocale(focus,1);panel.centerOn(focus,true);panel.setSelect(free);panel.setDragNode(dragged);
    panel.setHyperbolic(65);panel.setZoom(1.4);panel.setRotation(.3);panel.setCanvasZoom(1.2);panel.setCanvasPan(24,-13);
    panel.getRfc().setFocus(focus);
    for(const node of [focus,pinned,dragged,free])node.setDimensions(150,32);
    const saved=[focus,pinned,dragged,hidden].map(n=>({node:n,x:n.x,y:n.y}));
    const corpus=graphSearchCorpus(panel.getCompleteEltSet()).key,rfc=panel.getRfc().getState().centers.map(c=>c.focusId);
    panel.tgLayout.stopMotion();panel.tgLayout.stopMotion();assert.equal(panel.tgLayout.getState().damper,0);
    const result=separateNodeLabels(panel);
    assert.ok(result.before>result.after);assert.equal(result.moved,1);
    assert.equal(panel.tgLayout.getState().damper,1); // Ready to move when the stopped runner is resumed.
    for(const {node,x,y} of saved)assert.deepEqual({x:node.x,y:node.y},{x,y});
    assert.equal(panel.getSelect(),free);assert.equal(panel.getFocus(),focus);assert.equal(panel.getDragNode(),dragged);
    assert.deepEqual([...panel.getCompleteEltSet().getEdges()],edges);assert.equal(panel.getCompleteEltSet().nodeCount(),5);
    assert.deepEqual(panel.getRfc().getState().centers.map(c=>c.focusId),rfc);assert.equal(graphSearchCorpus(panel.getCompleteEltSet()).key,corpus);
    assert.equal(panel.getHyperbolic(),65);assert.equal(panel.getZoom(),1.4);assert.equal(panel.getRotation(),.3);assert.equal(panel.getCanvasZoom(),1.2);
    const before={x:free.x,y:free.y};assert.throws(()=>separateNodeLabels(panel,{gap:-1}));assert.deepEqual({x:free.x,y:free.y},before);
  }finally{panel.destroy();}
});
