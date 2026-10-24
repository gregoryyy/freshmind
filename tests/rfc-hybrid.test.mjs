import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TGLayout} from "fm4/core";
import {FreshmindPanel} from "fm4/fm";
import {serializeDocument,parseDocument} from "fm4/fm/io";
import {randomSource} from "../scripts/lib/rfc-comparison.mjs";
import {hybridDocument,hybridFixture,hybridSpecs,runHybrid,matchHybrid,pointMetrics} from "../scripts/lib/rfc-hybrid-fixture.mjs";

const base={focus:"stored-tree",view:"aggregate",seed:0x1234abcd,reinforcement:true,lens:0,rigidity:.1};
const coords=graph=>[...graph.getNodes()].map(n=>[n.getID(),n.x,n.y]);

test("hybrid factorial matches starts, focal protection, retained constraints and lens-only physical twins",()=>{
  assert.equal(hybridSpecs().length,160);assert.equal(hybridSpecs([123]).length,32);
  const specs=hybridSpecs([base.seed]),runs=specs.map(s=>runHybrid(s,{batches:3,traceEvery:1}));
  for(const r of runs) {
    assert.deepEqual(r.initialNodes,runs[0].initialNodes);assert.deepEqual(r.edges,runs[0].edges);
    const twin=runs.find(t=>t.focus===r.focus&&t.view===r.view&&t.reinforcement===r.reinforcement&&t.lens!==r.lens);
    assert.deepEqual(r.nodes,twin.nodes);assert.deepEqual(r.trace,twin.trace);assert.equal(r.unitRigidityForceRms,twin.unitRigidityForceRms);
    const control=runs.find(t=>t.focus===r.focus&&t.view===r.view&&t.reinforcement!==r.reinforcement&&t.lens===r.lens);
    assert.deepEqual(r.inventory,control.inventory);assert.ok(r.frozenHidden);
  }
  matchHybrid(runs);
  for(const r of runs) {
    assert.equal(r.matched.full.radialCount,r.final.radialCount);
    assert.equal(r.matched.full.angularGapCount,r.final.angularGapCount);
    assert.equal(r.matched.full.displayed.pairCount,r.final.displayed.pairCount);
    assert.equal(r.matched.full.displayed.crossingCandidates,r.final.displayed.crossingCandidates);
    if(r.view==="full")assert.deepEqual(r.matched.full,r.final);
  }
  const stored=runs.filter(r=>r.focus==="stored-tree"&&r.reinforcement&&r.lens===0);
  assert.deepEqual(stored.map(r=>[r.view,r.inventory.nodeIds.length,r.inventory.retainedRadialIds.length]),
    [["full",13,5],["aggregate",9,5],["filter-person",8,3],["filter-authored",13,3]]);
  assert.ok(stored.find(r=>r.view==="filter-person").inventory.filteredNodeIds.includes("alice"));
  assert.ok(stored.find(r=>r.view==="aggregate").inventory.nodeIds.includes("shared"));
  const failed={...runs[0],status:"failed",error:"injected failure"},unpaired={...runs.find(r=>r.focus===failed.focus&&r.view==="aggregate"&&r.reinforcement===failed.reinforcement&&r.lens===failed.lens)};
  assert.deepEqual(matchHybrid([failed,unpaired])[0],failed);assert.equal(unpaired.matched,null);
});

test("hybrid headless protocol agrees with the browser panel's production composition",()=>{
  for(const view of ["aggregate","filter-person","filter-authored"])for(const reinforcement of [false,true]) {
    const spec={...base,view,reinforcement},f=hybridFixture(spec),p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false});
    try {
      const layout=new TGLayout(p,randomSource(spec.seed^0x00c0ffee));p.setTGLayout(layout);layout.setRigidity(.1);layout.tick();
      const doc=hybridDocument(spec.seed);p.setGraphEltSet(doc.graph);p.getGES().addAll();p.centerOn(doc.graph.findNode("project-a"),true);
      p.getRfc().activateSubstructure("a-detail");
      // Retain the same nominated focal detail in the matched TG control, with zero extra force.
      if(!reinforcement)p.getRfc().configure({springMultiplier:1,radialStiffness:0,angularStiffness:0});
      p.getStructuralView().configure(f.inventory.settings);p.resetDamper();
      assert.deepEqual(p.getStructuralView().getState(),f.view.getState());
      layout.tick(5);f.layout.tick(5);assert.deepEqual(coords(doc.graph),coords(f.graph));
    }finally{p.destroy();f.destroy();}
  }
});

test("hybrid observer counts all steps, primes rigidity and never integrates hidden nodes or its force probe",()=>{
  const f=hybridFixture(base);
  try{const seen=[];f.layout.addForce((_g,q)=>seen.push(q));f.layout.tick();assert.deepEqual(seen,Array(10).fill(.1));}finally{f.destroy();}
  const r=runHybrid(base,{batches:12,traceEvery:1});
  assert.equal(r.sampledSteps,120);assert.equal(r.trace.length,12);assert.equal(r.tailSteps,100);assert.ok(r.frozenHidden);
  assert.deepEqual(runHybrid(base,{batches:12,traceEvery:1}),r);
  assert.equal(r.trace.at(-1).radialRms,r.final.radialRms);
  assert.ok(r.trace.every(t=>t.maxDisplacement+1e-12>=t.rmsDisplacement));
  for(const n of r.nodes.filter(n=>!r.inventory.nodeIds.includes(n.id)))assert.deepEqual(n,r.initialNodes.find(p=>p.id===n.id));
});

test("point proxies retain explicit denominators and exclude intersections with shared endpoints",()=>{
  const points=new Map([["a",{x:0,y:0}],["b",{x:20,y:20}],["c",{x:0,y:20}],["d",{x:20,y:0}]]);
  const metrics=pointMetrics(points,[{from:"a",to:"b"},{from:"c",to:"d"},{from:"a",to:"d"}]);
  assert.equal(metrics.pairCount,6);assert.equal(metrics.closePairs,6);assert.equal(metrics.closePairFraction,1);
  assert.equal(metrics.crossingCandidates,1);assert.equal(metrics.straightCrossings,1);
  assert.equal(pointMetrics(new Map(),[]).minDistance,null);
});

test("hybrid native input and recorded full-budget controls replay with explicit runtime checks",context=>{
  const root=new URL("../docs/experiments/rfc-hybrid/",import.meta.url);
  const doc=readFileSync(new URL("matched-start.fm.yaml",root),"utf8");
  assert.equal(doc,serializeDocument(hybridDocument()));
  const parsed=parseDocument(doc);assert.equal(parsed.graph.nodeCount(),13);assert.equal(parsed.graph.edgeCount(),13);assert.equal(parsed.graph.getSubstructures().length,2);
  const report=JSON.parse(readFileSync(new URL("results.json",root),"utf8"));
  assert.equal(report.failed,0);assert.equal(report.results.length,160);assert.equal(report.lensPairs,80);
  const same=report.runtime.node===process.version&&report.runtime.platform===process.platform&&report.runtime.arch===process.arch;
  if(!same)context.diagnostic("Different runtime: comparing repeated local trajectories instead of archived floating-point coordinates");
  for(const view of ["full","aggregate","filter-person"]) {
    const spec={...base,view},run=runHybrid(spec),record=report.results.find(r=>r.focus===spec.focus&&r.view===view&&r.seed===spec.seed&&r.reinforcement&&r.lens===0);
    const {matched,...original}=record;
    assert.deepEqual(run,same?original:runHybrid(spec));
  }
});
