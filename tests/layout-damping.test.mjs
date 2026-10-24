import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {TGLayout,GraphEltSet,Node,Edge,MotionStabilizer} from "fm4/core";
import {TGPanel} from "fm4";

function star(enabled) {
  const graph=new GraphEltSet();let time=0;
  const layout=new TGLayout({getGES:()=>graph,repaintAfterMove(){}},()=>.5,{enabled,now:()=>time+=2});
  const root=new Node("root");root.x=root.y=0;graph.addNode(root);
  for(let i=0;i<6;i++) {
    const n=new Node(String(i));n.x=100*Math.cos(i);n.y=100*Math.sin(i);graph.addNode(n);graph.addEdge(new Edge(root,n,1));
  }
  let previous=[...graph.getNodes()].map(n=>[n.x,n.y]),large=0,calls=0;
  const sample=()=>{
    const nodes=[...graph.getNodes()];if(nodes.some((n,i)=>Math.hypot(n.x-previous[i][0],n.y-previous[i][1])>29.9))large++;
    previous=nodes.map(n=>[n.x,n.y]);
  };
  layout.addForce(()=>{if(calls++%10)sample();});
  // The host's repaint callback observes the tenth integration in every batch.
  layout.resetDamper();
  for(let i=0;i<400;i++){layout.tick();sample();}
  return {large,state:layout.getAdaptiveDampingState(),nodes:[...graph.getNodes()]};
}

test("general damping suppresses a native TouchGraph oscillation without RFC or changed force constants",()=>{
  const off=star(false),on=star(true);
  assert.ok(off.large>1000);assert.ok(on.large<10);assert.ok(on.state.detections>0);
  assert.ok(on.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)));
  assert.deepEqual(star(true),on);
});

test("general damping runs after all force callbacks and excludes fixed and dragged nodes",()=>{
  const graph=new GraphEltSet(),moving=new Node("moving"),fixed=new Node("fixed"),dragged=new Node("dragged");
  for(const n of [moving,fixed,dragged]){n.x=n.y=0;graph.addNode(n);}
  fixed.fixed=true;let step=0,requestedX=0;
  const layout=new TGLayout({getGES:()=>graph,repaintAfterMove(){}},()=>.5,{enabled:true,now:()=>step*2});
  layout.setDragNode(dragged);layout.stopDamper();
  layout.addForce(()=>{moving.dx=1000;});
  layout.addForce(()=>{requestedX=step++%2?4:0;moving.x=requestedX;moving.y=0;moving.dx=4;moving.dy=0;});
  layout.tick();
  assert.ok(layout.getAdaptiveDampingState().detections>0);
  assert.equal(moving.x-requestedX,4*layout.getAdaptiveDampingState().gain);
  assert.deepEqual([fixed.x,fixed.y,dragged.x,dragged.y],[0,0,0,0]);
});

test("graph replacement clears learned general damping while preserving its enabled preference",()=>{
  let time=0;const p=new TGPanel(undefined,{autoStart:false,adaptiveDamping:{enabled:true,now:()=>time+=2}});
  const n=p.addNode("moving");let step=0;
  const remove=p.tgLayout.addForce(()=>{n.x=step++%2?4:0;n.y=0;n.dx=4;n.dy=0;});
  p.tgLayout.resetDamper();p.tgLayout.tick();assert.ok(p.tgLayout.getAdaptiveDampingState().detections>0);
  remove();p.clearAll();assert.deepEqual(p.tgLayout.getAdaptiveDampingState(),new MotionStabilizer({enabled:true}).getState());
  const next=p.addNode("next");
  const removeNext=p.tgLayout.addForce(()=>{next.x=step++%2?4:0;next.y=0;next.dx=4;next.dy=0;});
  p.tgLayout.tick();assert.ok(p.tgLayout.getAdaptiveDampingState().detections>0);removeNext();
  const replacement=new GraphEltSet();p.setGraphEltSet(replacement);
  assert.deepEqual(p.tgLayout.getAdaptiveDampingState(),new MotionStabilizer({enabled:true}).getState());
  p.tgLayout.setAdaptiveDampingEnabled(false);assert.equal(p.tgLayout.getAdaptiveDampingState().enabled,false);
  assert.throws(()=>p.tgLayout.setAdaptiveDampingEnabled("yes"),TypeError);p.destroy();
});

test("earlier cooling uses the existing damper without extra impulse attenuation and respects disabled legacy cooling",()=>{
  for(const damping of [true,false]) {
    const graph=new GraphEltSet(),n=new Node("moving");n.x=n.y=0;graph.addNode(n);
    const layout=new TGLayout({getGES:()=>graph,repaintAfterMove(){}},()=>.5,{enabled:true,response:"cooling"});
    let i=0,last=0,priorDamper=1;
    layout.addForce(()=>{last=i++%2?4:0;n.x=last;n.y=0;n.dx=4;n.dy=0;priorDamper=layout.getState().damper;});
    if(damping)layout.resetDamper();else layout.stopDamper();layout.tick();
    assert.ok(layout.getAdaptiveDampingState().detections>0);
    assert.ok(Math.abs(n.x-last-4*priorDamper)<1e-12); // No multiplication by the detector's impulse gain.
    assert.equal(layout.getAdaptiveDampingResponse(),"cooling");
    if(damping)assert.ok(layout.getState().damper<.9);else assert.equal(layout.getState().damper,1);
    layout.setAdaptiveDampingResponse("impulse");assert.equal(layout.getAdaptiveDampingState().detections,0);
    assert.throws(()=>layout.setAdaptiveDampingResponse("bad"),TypeError);
  }
});

test("general recovery keeps the runner awake after global cooling, without restarting a stopped layout",context=>{
  let time=0,next=0;const pending=new Map();
  context.mock.method(globalThis,"setTimeout",(callback,delay)=>{const id=++next;pending.set(id,{callback,delay});return id;});
  context.mock.method(globalThis,"clearTimeout",id=>pending.delete(id));
  const graph=new GraphEltSet(),n=new Node("moving");n.x=n.y=0;graph.addNode(n);
  const layout=new TGLayout({getGES:()=>graph,repaintAfterMove(){}},()=>.5,{enabled:true,now:()=>time});
  let step=0;const remove=layout.addForce(()=>{n.x=step++%2?4:0;n.dx=4;n.dy=0;});layout.resetDamper();layout.tick();remove();
  layout.stopMotion();layout.stopMotion();layout.start();
  for(let i=0;i<200;i++){const [id,{callback,delay}]=[...pending][0];pending.delete(id);time+=delay;callback();}
  assert.equal(layout.getAdaptiveDampingState().gain,1);assert.equal([...pending.values()][0].delay,100);
  layout.stop();assert.equal(pending.size,0);layout.tick();assert.equal(pending.size,0);
});

test("the general damping experiment reproduces matched layouts and separates detection from recovery",()=>{
  const dir=mkdtempSync(join(tmpdir(),"fm4-layout-damping-"));
  try {
    const run=()=>{execFileSync(process.execPath,["scripts/layout-damping-experiment.mjs",dir],{stdio:"pipe"});return readFileSync(join(dir,"results.json"),"utf8");};
    const first=run();assert.equal(run(),first);const result=JSON.parse(first);
    for(const name of new Set(result.layouts.map(r=>r.name))) {
      const off=result.layouts.find(r=>r.name===name&&r.mode==="off"),on=result.layouts.find(r=>r.name===name&&r.mode==="v3-general");
      assert.deepEqual(on.initialNodes,off.initialNodes);assert.deepEqual(on.edges,off.edges);assert.deepEqual(on.settings,off.settings);
      assert.equal(on.steps,4000);assert.equal(on.trace.length,400);
      if(name==="plain-stiff-star"||name==="rfc-stiff-star") {
        assert.ok(on.largeSteps<off.largeSteps/100);assert.ok(on.lastMovingMs<off.lastMovingMs/3);
        assert.ok(on.firstDetectionMs<on.lastMovingMs&&on.firstRestoredMs>on.lastMovingMs);
        const early=result.layouts.find(r=>r.name===name&&r.mode==="v3-early-cooling");
        assert.ok(early.fastCoolingMs<off.fastCoolingMs/10);assert.ok(early.lastMovingMs<off.lastMovingMs/3);
        assert.ok(Number.isFinite(early.forceRms));assert.equal(early.firstRestoredMs,null);
      }else {assert.equal(on.firstDetectionMs,null);assert.deepEqual(on.finalNodes,off.finalNodes);}
    }
    for(const name of ["slow-swing","very-slow-swing","slow-orbit"]) {
      assert.equal(result.probes.find(p=>p.name===name&&p.detector==="v2").firstDetectionCycles,null);
      assert.ok(result.probes.find(p=>p.name===name&&p.detector==="v3").firstDetectionCycles<=2.5);
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});
