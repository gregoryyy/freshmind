import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runExclusion} from "../scripts/lib/rfc-exclusion-fixture.mjs";
import {FreshNode,FreshEdge,FreshGraph,FreshmindPanel,RfcController,
  focalRegions,regionClearance,regionEscape,applyRegionExclusion,clusterStructure} from "fm4/fm";

const settings={enabled:true,overlap:true,strength:.25,padding:20};
const node=(id,x=0,y=0)=>new FreshNode(id,id,{position:{x,y}});
const circle=(id,x,y,radius,members,anchors=[{node:members[0],fraction:1}],coordinateWeights={x:1,y:1})=>
  ({id,center:{x,y},radius,coordinateWeights,memberIds:members.map(n=>n.getID()),members:new Set(members),anchors});
const clear=nodes=>{for(const n of nodes)n.dx=n.dy=0;};
const near=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

test("exclusion is opt-in, validates atomically and publishes detached settings and regions",()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false}),a=p.addNode(node("a")),b=p.addNode(node("b",80));
  p.addEdge(new FreshEdge(a,b));p.getRfc().setFocus(a);const rfc=p.getRfc();
  assert.deepEqual(rfc.getState().exclusionSettings,{enabled:false,overlap:true,strength:.25,padding:20});assert.deepEqual(rfc.getState().regions,[]);
  let changes=0;const dispose=rfc.addListener(()=>changes++);
  rfc.configureExclusion({enabled:true});assert.equal(changes,1);rfc.configureExclusion({enabled:true});assert.equal(changes,1);
  const before=rfc.getState();
  for(const invalid of [{enabled:1},{overlap:"yes"},{strength:NaN},{strength:3},{padding:0},{padding:Infinity}]) {
    assert.throws(()=>rfc.configureExclusion(invalid));assert.deepEqual(rfc.getState(),before);
  }
  const copy=rfc.getState();copy.exclusionSettings.strength=2;copy.regions[0].center.x=500;copy.regions[0].memberIds.length=0;
  assert.equal(rfc.getState().exclusionSettings.strength,.25);assert.equal(rfc.getState().regions[0].center.x,0);assert.equal(rfc.getState().regions[0].memberIds.length,2);
  assert.equal(p.tgLayout.getState().damper,1);dispose();p.destroy();assert.throws(()=>rfc.configureExclusion({enabled:false}),/destroyed/);
  assert.throws(()=>new RfcController({},{},{},{strength:-1}),/strength/);
});

test("fitted weighted ellipses contain member centers, retain singleton padding and ignore cluster representatives",()=>{
  const root=node("root"),a=node("a",100,10),b=node("b",-30,80),nodes=[root,a,b];
  const make=definition=>({root,definition,nodes});
  const weights={x:.25,y:1},star=focalRegions([make(null)],weights,20)[0];
  assert.deepEqual(star.center,{x:0,y:0});assert.ok(nodes.every(n=>regionClearance(star,n)<=-20+1e-10));
  near(star.radius,Math.hypot(15,80)+20);
  const cluster=focalRegions([make({id:"group",kind:"cluster"})],weights,20)[0];
  near(cluster.center.x,70/3);near(cluster.center.y,30);
  assert.deepEqual(focalRegions([{...make({id:"group",kind:"cluster"}),root:b}],weights,20)[0].center,cluster.center);
  const one=focalRegions([{root,definition:null,nodes:[root]}],weights,20)[0];assert.equal(one.radius,20);
  assert.throws(()=>focalRegions([],weights,0),/padding/);assert.throws(()=>focalRegions([],{x:0,y:1},20),RangeError);
});

test("union escape avoids a canceled centerline force and extends through ellipses entered later",()=>{
  const left=node("left",-5),right=node("right",5),regions=[circle("left",-5,0,10,[left]),circle("right",5,0,10,[right])];
  const escape=regionEscape(regions,{x:0,y:0},"intruder");
  near(escape.distance,Math.sqrt(75));assert.ok(Math.abs(escape.y)>8);assert.ok(regions.every(r=>regionClearance(r,escape)>-1e-8));
  const w={x:100,y:.01},chain=[circle("first",-.9,0,10,[left],undefined,w),circle("later",.45,0,4,[right],undefined,w)];
  const end=regionEscape(chain,{x:0,y:0},"chain");near(end.x,.85);near(end.y,0);assert.equal(end.owners[0].id,"later");
  assert.ok(chain.every(r=>regionClearance(r,end)>-1e-8));
});

test("coincident centers use finite deterministic directions without a singularity",()=>{
  const a=node("a"),regions=[circle("one",0,0,100,[a])];
  const first=regionEscape(regions,a,"context-1");assert.deepEqual(regionEscape(regions,a,"context-1"),first);near(first.distance,100);
  assert.notDeepEqual(regionEscape(regions,a,"different-context"),first);assert.equal(regionEscape(regions,{x:100,y:0},"boundary"),null);
  const mixed=[...regions,circle("two",0,0,50,[a],undefined,{x:2,y:1})];assert.throws(()=>regionEscape(mixed,a,"mixed"),/shared coordinate/);
});

test("soft exclusion is bounded, continuous at a boundary, balances reactions and retains far context impulses",()=>{
  const anchor=node("root"),inside=node("inside",5),boundary=node("boundary",10),outside=node("outside",1000),regions=[circle("area",0,0,10,[anchor])];
  outside.dx=7;const affected=applyRegionExclusion([inside,boundary,outside],regions,settings,1,120);
  near(inside.dx,.25*5/(1+5/120));near(inside.dy,0);near(anchor.dx,-inside.dx);assert.equal(boundary.dx,0);assert.equal(outside.dx,7);assert.ok(!affected.has(outside));
  const almost=node("almost",10-1e-5);applyRegionExclusion([almost],regions,settings,1,120);assert.ok(Math.hypot(almost.dx,almost.dy)<3e-6);
  const center=node("center");clear([anchor]);applyRegionExclusion([center],regions,{...settings,strength:2},.1,10);
  assert.ok(Math.hypot(center.dx,center.dy)<2*.1*10);near(center.dx+anchor.dx,0);near(center.dy+anchor.dy,0);
});

test("ordinary exclusion exempts focal nodes; intersection exclusion moves only non-shared members from foreign areas",()=>{
  const a=node("a",-5),b=node("b",5),shared=node("shared"),own=node("own",-2),context=node("context");
  const regions=[circle("A",-5,0,10,[a,shared,own]),circle("B",5,0,10,[b,shared])],nodes=[a,b,shared,own,context];
  applyRegionExclusion([own,shared],regions,{...settings,overlap:false},1,120);assert.ok(nodes.every(n=>n.dx===0&&n.dy===0));
  applyRegionExclusion([own,shared],regions,settings,1,120);assert.ok(own.dx<0);assert.equal(shared.dx,0);assert.equal(a.dx,0);near(own.dx+b.dx,0);
  clear(nodes);applyRegionExclusion([context],regions,settings,1,120);
  assert.ok(Math.hypot(context.dx,context.dy)>0);near(nodes.reduce((s,n)=>s+n.dx,0),0);near(nodes.reduce((s,n)=>s+n.dy,0),0);
});

test("duplicate regions do not multiply context force and weighted centroid reactions respect locality",()=>{
  const a=node("a"),b=node("b"),context=node("context",5),anchors=[{node:a,fraction:.25},{node:b,fraction:.75}];
  const r=circle("area",0,0,10,[a,b],anchors);applyRegionExclusion([context],[r],settings,1,120);
  const initial=[a.dx,b.dx,context.dx];clear([a,b,context]);applyRegionExclusion([context],[r,{...r,id:"copy"}],settings,1,120);
  [a.dx,b.dx,context.dx].forEach((v,i)=>near(v,initial[i]));near(b.dx,3*a.dx);
  clear([a,b,context]);context.justMadeLocal=true;applyRegionExclusion([context],[r],settings,1,120);
  near(context.dx,initial[2]);near(a.dx,initial[0]/10);near(b.dx,initial[1]/10);
});

test("visible membership, zero importance, graph replacement and lenses do not leak region ownership",()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false,rfcExclusion:{enabled:true}}),g=p.getCompleteEltSet();
  const a=p.addNode(node("a")),b=p.addNode(node("b",90)),zero=p.addNode(new FreshNode("zero","zero",{weight:0,position:{x:20,y:0}}));
  p.addEdge(new FreshEdge(a,b));g.setSubstructure(clusterStructure(g,["a","b","zero"],"a","group"));p.getRfc().activateSubstructure("group");
  const before=p.getRfc().getState().regions;assert.deepEqual(before[0].memberIds,["a","b"]);
  p.setZoom(2);p.setRotation(.7);assert.deepEqual(p.getRfc().getState().regions,before);
  clear([a,b,zero]);p.getRfc().apply(p.getGES(),1);assert.ok(Math.hypot(zero.dx,zero.dy)>0);
  p.getGES().removeNode(a);p.localityChanged();assert.equal(p.getRfc().getState().regions.length,0);
  p.setGraphEltSet(new FreshGraph());assert.equal(p.getRfc().getState().regions.length,0);assert.equal(p.getRfc().getState().enabled,false);p.destroy();
});

test("damping observes context reversals through repeated exclusion-boundary crossings",()=>{
  let time=0;const p=new FreshmindPanel(undefined,{autoStart:false,rfc:{radialStiffness:0,angularStiffness:0},rfcExclusion:{enabled:true},rfcStabilization:{enabled:true,now:()=>time+=2}});
  const a=p.addNode(node("a")),b=p.addNode(node("b",100)),context=p.addNode(node("context",119));a.fixed=b.fixed=true;
  p.addEdge(new FreshEdge(a,b));p.getRfc().setFocus(a);
  for(let i=0;i<20;i++){context.x=i%2?119:121;context.dx=10;context.dy=0;p.getRfc().apply(p.getGES(),1);}
  const state=p.getRfc().getState();assert.ok(state.stabilization.detections>0);assert.ok(state.stabilization.detectedNodeIds.includes("context"));
  assert.ok(state.stabilization.gain<1);assert.deepEqual(state.memberIds,["a","b"]);p.destroy();
});

test("matched exclusion fixtures preserve semantic starts, count every integration and replay recorded force/geometry observations",context=>{
  const report=JSON.parse(readFileSync(new URL("../docs/experiments/rfc-exclusion/results.json",import.meta.url),"utf8"));
  assert.equal(report.results.length,100);assert.equal(report.failed,0);assert.equal(report.matchedStarts,20);
  const seed=report.seeds[0],sameRuntime=report.runtime.node===process.version&&report.runtime.platform===process.platform&&report.runtime.arch===process.arch;
  const runs={};
  for(const mode of ["rfc","context"]) {
    const run=runExclusion("single-region",seed,mode);runs[mode]=run;
    const {status,...expected}=report.results.find(r=>r.name===run.name&&r.seed===seed&&r.mode===mode);assert.equal(status,"ok");
    assert.deepEqual(run,sameRuntime?expected:runExclusion(run.name,seed,mode));
    assert.equal(run.steps,4000);assert.equal(run.startup.length,40);assert.ok(run.startup.every(s=>s.maxDisplacement>=0));
    assert.ok(Number.isFinite(run.unitRigidityForceRms));
  }
  if(!sameRuntime)context.diagnostic("Different runtime: verified repeated local trajectories rather than archived floating-point identity.");
  assert.deepEqual(runs.context.initialNodes,runs.rfc.initialNodes);assert.deepEqual(runs.context.edges,runs.rfc.edges);
  assert.equal(runs.context.final.meanRegionRadius,runs.rfc.final.meanRegionRadius);
  assert.ok(runs.context.final.contextDepthRms<runs.rfc.final.contextDepthRms);assert.equal(runs.context.final.fixedContextIntruders,1);
});
