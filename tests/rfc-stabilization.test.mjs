import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtempSync,rmSync,readFileSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {Node} from "fm4/core";
import {RfcStabilizer} from "fm4/fm/rfc";
import {FreshmindPanel} from "fm4/fm";
import {adaptiveRun} from "./fixtures/rfc.mjs";

function rig(options={}) {
  let time=0;
  const stabilizer=new RfcStabilizer({enabled:true,now:()=>time,...options}),node=new Node("moving"),fixed=new Node("fixed");
  node.x=node.y=0;fixed.x=fixed.y=0;fixed.fixed=true;
  const step=(x=node.x,dt=2)=>{time+=dt;node.x=x;node.dx=10;node.dy=-5;fixed.dx=20;stabilizer.apply([node,fixed]);return stabilizer.getState();};
  const excite=()=>{step(0);for(let i=0;i<8;i++)step(i%2?0:4);};
  return {stabilizer,node,fixed,step,excite};
}

test("persistent reversals attenuate focal impulses without changing configured forces, fixed nodes or positions",()=>{
  const {stabilizer,node,fixed,step,excite}=rig();excite();
  const state=step(0);assert.ok(state.detections>=1);assert.ok(state.gain<=.5);assert.equal(state.phase,"damping");
  assert.equal(node.dx,10*state.gain);assert.equal(node.dy,-5*state.gain);assert.equal(node.x,0);assert.equal(fixed.dx,20);
  state.gain=100;assert.ok(stabilizer.getState().gain<=.5);
});

test("steady translation, negligible jitter and quickly decaying reversals retain full motion",()=>{
  for(const mode of ["translation","jitter","decay"]) {
    const {step}=rig();let state;
    for(let i=0;i<40;i++)state=step(mode==="translation"?i*4:mode==="jitter"?.05*(i%2):4*(i%2?1:-1)*.6**i);
    assert.equal(state.gain,1,mode);assert.equal(state.detections,0,mode);
  }
});

test("recovery waits for quiet integration then smoothly anneals over three seconds, backing off on renewed oscillation",()=>{
  const {step,excite}=rig();excite();const damped=step(0).gain;
  for(let i=0;i<9;i++)assert.equal(step(0,50).gain,damped);
  let state=step(0,50);assert.equal(state.phase,"recovering");assert.equal(state.gain,damped);
  for(let i=0;i<30;i++)state=step(0,50);
  assert.ok(Math.abs(state.gain-(1+damped)/2)<1e-12);
  const recovering=state.gain;excite();assert.ok(step(0).gain<recovering);assert.equal(step(0).phase,"damping");
  for(let i=0;i<72;i++)state=step(0,50);
  assert.equal(state.gain,1);assert.equal(state.phase,"steady");
});

test("pauses, dragged nodes, topology changes and reset cannot reuse stale oscillation or recovery time",()=>{
  const {stabilizer,node,fixed,step,excite}=rig();excite();const damped=step(0).gain;
  assert.equal(step(0,10000).gain,damped);assert.equal(stabilizer.getState().phase,"damping");
  for(let i=0;i<5;i++)step(0,50);assert.equal(stabilizer.getState().phase,"damping");
  node.dx=7;stabilizer.apply([node,fixed],node);assert.equal(node.dx,7);assert.equal(stabilizer.getState().gain,damped);
  const extra=new Node("new");extra.x=extra.y=0;stabilizer.apply([node,fixed,extra]);assert.equal(stabilizer.getState().gain,damped);
  stabilizer.reset();assert.equal(stabilizer.getState().gain,1);assert.equal(stabilizer.getState().detections,0);
});

test("disabled stabilization is an exact no-op and validates its narrow configuration",()=>{
  const {step,node,stabilizer,excite}=rig({enabled:false});excite();step();assert.equal(node.dx,10);assert.equal(stabilizer.getState().gain,1);
  assert.throws(()=>new RfcStabilizer({enabled:"yes"}),TypeError);assert.throws(()=>new RfcStabilizer({now:3}),TypeError);
  assert.equal(new RfcStabilizer().getState().enabled,false);
});

test("controller damping history clears on disable, suspension and graph replacement; inactive RFC never damps",()=>{
  let time=0;
  const panel=new FreshmindPanel(undefined,{autoStart:false,rfcStabilization:{enabled:true,now:()=>time+=2}});
  const center=panel.addNode("center"),branch=panel.addNode("branch");panel.addEdge(center,branch);center.fixed=true;
  const rfc=panel.getRfc();rfc.setFocus(center);
  const excite=()=>{for(let i=0;i<10;i++){branch.x=i%2?0:4;rfc.apply(panel.getGES(),1);}};
  excite();assert.ok(rfc.getState().stabilization.gain<1);
  panel.getGES().removeNode(center);rfc.apply(panel.getGES(),1);assert.equal(rfc.getState().stabilization.gain,1);
  panel.getGES().addNodeWithEdges(center);excite();assert.ok(rfc.getState().stabilization.gain<1);
  rfc.setStabilizationEnabled(false);assert.equal(rfc.getState().stabilization.gain,1);assert.equal(rfc.getState().stabilization.detections,0);
  rfc.setStabilizationEnabled(true);excite();assert.ok(rfc.getState().stabilization.gain<1);
  rfc.setFocus(null);branch.dx=7;rfc.apply(panel.getGES(),1);assert.equal(branch.dx,7);
  rfc.setFocus(center);rfc.configure({radialStiffness:0,angularStiffness:0,springMultiplier:1});excite();assert.equal(rfc.getState().stabilization.gain,1);
  panel.clearAll();assert.equal(rfc.getState().enabled,false);assert.equal(rfc.getState().stabilization.gain,1);
  panel.destroy();assert.throws(()=>rfc.setStabilizationEnabled(true),/destroyed/);
});

test("scheduled recovery completes even when the global damper has cooled to zero, then the runner sleeps normally",context=>{
  let time=0,nextId=0;
  const pending=new Map();
  context.mock.method(globalThis,"setTimeout",(callback,delay)=>{const id=++nextId;pending.set(id,{callback,delay});return id;});
  context.mock.method(globalThis,"clearTimeout",id=>pending.delete(id));
  const panel=new FreshmindPanel(undefined,{autoStart:false,rfcStabilization:{enabled:true,now:()=>time}});
  const center=panel.addNode("center"),branch=panel.addNode("branch");center.fixed=true;panel.addEdge(center,branch);
  const rfc=panel.getRfc();rfc.setFocus(center);
  for(let i=0;i<10;i++){branch.x=i%2?0:4;time+=2;rfc.apply(panel.getGES(),1);}
  assert.ok(rfc.apply.needsTicks());
  panel.stopMotion();panel.stopMotion();assert.equal(panel.tgLayout.getState().damper,0);
  panel.tgLayout.start();
  for(let i=0;i<200;i++) {
    const [id,{callback,delay}]=[...pending][0];pending.delete(id);time+=delay;callback();
  }
  assert.equal(rfc.getState().stabilization.gain,1);assert.equal(rfc.getState().stabilization.phase,"steady");
  assert.equal(rfc.apply.needsTicks(),false);assert.equal([...pending.values()][0].delay,100);
  panel.destroy();assert.equal(pending.size,0);
});


test("adaptive local damping suppresses the stiff movable-center RFC fixture with deterministic per-step sampling",()=>{
  const plain=adaptiveRun(false),adaptive=adaptiveRun(true);
  const rms=run=>Math.hypot(...run.trace.slice(-10).map(p=>p.movement))/Math.sqrt(10);
  assert.ok(adaptive.trace.some(p=>p.detections>0));assert.ok(rms(adaptive)<rms(plain)*.1,JSON.stringify({plain:rms(plain),adaptive:rms(adaptive)}));
  assert.deepEqual(adaptiveRun(true),adaptive);assert.deepEqual(adaptive.settings,plain.settings);
  assert.ok(adaptive.positions.flat().every(Number.isFinite));assert.ok(adaptive.trace.at(-1).angularGapRms<.1);
});

test("one oscillating member cannot be outvoted by a faster translating center",()=>{
  let time=0;const stabilizer=new RfcStabilizer({enabled:true,now:()=>time+=2}),a=new Node("oscillating"),b=new Node("translating");
  for(let i=0;i<20;i++){a.x=i%2?4:0;a.y=0;b.x=i*12;b.y=0;a.dx=b.dx=10;a.dy=b.dy=0;stabilizer.apply([a,b]);}
  const state=stabilizer.getState();assert.ok(state.detections>0);assert.equal(state.lastTrigger,"reversal");assert.deepEqual(state.detectedNodeIds,["oscillating"]);
  state.detectedNodeIds.length=0;assert.deepEqual(stabilizer.getState().detectedNodeIds,["oscillating"]);
});

test("persistent circulating and smaller-amplitude motion is detected without a sharp reversal",()=>{
  for(const period of [6,12,24]) {
    let time=0;const s=new RfcStabilizer({enabled:true,now:()=>time+=2}),n=new Node("orbit");
    for(let i=0;i<40;i++){n.x=10*Math.cos(i*2*Math.PI/period);n.y=10*Math.sin(i*2*Math.PI/period);n.dx=10;n.dy=0;s.apply([n]);}
    assert.ok(s.getState().detections>0,`period ${period}`);assert.equal(s.getState().lastTrigger,"circulation");
  }
  const {step}=rig();let state;for(let i=0;i<20;i++)state=step(i%2?.2:0);assert.ok(state.detections>0);
});

test("wild swings bound the next requested displacement below the old gain floor",()=>{
  let time=0;const s=new RfcStabilizer({enabled:true,now:()=>time+=2}),n=new Node("stiff");
  for(let i=0;i<8;i++){n.x=i%2?30:0;n.y=0;n.dx=1e8;n.dy=0;s.apply([n]);if(s.getState().detections)break;}
  assert.ok(s.getState().gain<1/256);assert.ok(n.dx<=2+1e-10);assert.equal(s.getState().lastTrigger,"reversal");
});

test("annealing rolls back on early movement, and dragging one center does not blind the others",()=>{
  const {step,excite,stabilizer,node,fixed}=rig();excite();step(0);const damped=stabilizer.getState().gain;
  for(let i=0;i<40;i++)step(0,50);assert.equal(stabilizer.getState().phase,"recovering");assert.ok(stabilizer.getState().gain>damped);
  const rolled=step(.2,2);assert.equal(rolled.gain,damped);assert.equal(rolled.phase,"damping");assert.equal(rolled.recoveryBackoffs,1);
  fixed.fixed=false;fixed.x=fixed.y=0;
  for(let i=0;i<12;i++){node.x=i%2?0:4;node.dx=10;fixed.dx=7;stabilizer.apply([node,fixed],fixed);}
  assert.ok(stabilizer.getState().detections>rolled.detections);assert.equal(fixed.dx,7);
});

test("small and recorded multiple-center fixtures damp large motion without retuning their forces",()=>{
  const directory=mkdtempSync(join(tmpdir(),"fm4-rfc-stability-"));
  try {
    execFileSync(process.execPath,["scripts/rfc-stability-experiment.mjs",directory],{stdio:"pipe"});
    const result=JSON.parse(readFileSync(join(directory,"results.json"),"utf8"));
    for(const probe of result.prescribed)assert.ok(probe.detections>0,probe.name);
    for(const name of ["small-two-centers","small-cluster-pair","leaf-connected-trees","shared-subtree"]) {
      const off=result.layouts.find(r=>r.name===name&&!r.enabled),on=result.layouts.find(r=>r.name===name&&r.enabled);
      assert.deepEqual(on.settings,off.settings);assert.deepEqual(on.clusterSettings,off.clusterSettings);
      assert.equal(on.centers,2);assert.ok(on.largeStepCount<off.largeStepCount/10,name);assert.ok(on.largeStepCount<=10,name);
      assert.ok(on.stabilization.detections>0);assert.ok(Number.isFinite(on.tailStepRms));
      assert.deepEqual(on.initialNodes,off.initialNodes);assert.deepEqual(on.edges,off.edges);
      assert.equal(on.motion.length,400);assert.equal(on.startupMotion.length,100);
      assert.equal(on.motion.reduce((sum,p)=>sum+p.largeSteps,0),on.largeStepCount);
      assert.equal(on.motion.at(-1).lengthRms,on.finalLengthRms);
      assert.ok(on.events.some(e=>e.detections>0));
      assert.deepEqual(on.snapshots[0].nodes,on.initialNodes);assert.deepEqual(on.snapshots.at(-1).nodes,on.nodes);
      assert.ok(on.motion.every(p=>p.maxDisplacement>=p.rmsDisplacement&&p.rmsDisplacement>=0));
    }
  }finally{rmSync(directory,{recursive:true,force:true});}
});
