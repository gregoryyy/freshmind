import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {comparisonFixture,comparisonSpecs,runComparison,hull,area,intersectionArea} from "../scripts/lib/rfc-comparison.mjs";

const spec={family:"weights",topology:"joined-trees",seed:0xdecafbad,profile:"neutral",mode:"both",rigidity:1,damping:false};
const coordinates=run=>run.nodes.map(({id,x,y,fixed})=>({id,x,y,fixed}));

test("comparison rigidity is active from the first measured integration without changing physical starts",()=>{
  const a=comparisonFixture(spec),b=comparisonFixture({...spec,rigidity:.25});
  try {
    const coords=f=>[...f.graph.getNodes()].map(n=>[n.getID(),n.x,n.y,n.dx,n.dy]);
    assert.deepEqual(coords(a),coords(b));
    const values=[];b.layout.addForce((_graph,rigidity)=>values.push(rigidity));b.layout.tick();
    assert.deepEqual(values,Array(10).fill(.25));
  } finally {for(const f of [a,b]){f.rfc.destroy();f.layout.stop();}}
});

test("comparison observer samples actual integrations, excludes its force probe and repeats exactly",()=>{
  const run=runComparison({...spec,damping:true},{batches:30,traceEvery:1});
  assert.deepEqual(runComparison({...spec,damping:true},{batches:30,traceEvery:1}),run);
  assert.equal(run.sampledSteps,300);assert.equal(run.tailSteps,100);assert.equal(run.trace.length,30);
  assert.equal(run.trace.reduce((sum,t)=>sum+t.largeSteps,0),run.largeSteps);
  assert.equal(run.trace.reduce((sum,t)=>sum+t.clippedSteps,0),run.clippedSteps);
  assert.equal(run.trace.at(-1).lengthRms,run.final.lengthRms);
  assert.ok(Number.isFinite(run.unitRigidityForceRms));
  assert.ok(run.trace.every(t=>t.maxDisplacement+1e-12>=t.rmsDisplacement));
});

test("model importance leaves baseline coordinates unchanged and zero/epsilon transitions retain common observables",()=>{
  const neutral=runComparison({...spec,mode:"baseline"},{batches:12}),zero=runComparison({...spec,mode:"baseline",profile:"zero"},{batches:12});
  assert.deepEqual(coordinates(neutral),coordinates(zero));assert.equal(neutral.final.lengthRms,zero.final.lengthRms);
  const run=runComparison({...spec,profile:"transition",damping:true},{batches:12,traceEvery:1,transitionBatches:[4,8]});
  assert.equal(run.transitions.length,2);
  const [off,on]=run.transitions;
  assert.equal(off.before.metrics.eligibleEdges,12);assert.equal(off.after.metrics.eligibleEdges,6);
  assert.equal(on.before.metrics.eligibleEdges,6);assert.equal(on.after.metrics.eligibleEdges,12);
  assert.equal(off.before.metrics.lengthRms,off.after.metrics.lengthRms);
  assert.equal(on.before.metrics.lengthRms,on.after.metrics.lengthRms);
  assert.notEqual(off.before.centers[0].edgeIds.length,off.after.centers[0].edgeIds.length);
});

test("cluster and perimeter-tree comparisons share all semantic edges, starts and common geometry targets",()=>{
  for(const topology of ["dense-squares","overlapping-squares","sparse-rings"]) {
    const common={family:"clusters",topology,seed:1234,load:"strong",rigidity:1,damping:false};
    const cluster=runComparison({...common,mode:"cluster",clusterRigidity:1},{batches:3});
    const tree=runComparison({...common,mode:"tree"},{batches:3});
    assert.deepEqual(cluster.initialNodes,tree.initialNodes);assert.deepEqual(cluster.initialEdges,tree.initialEdges);
    assert.deepEqual(cluster.initial,tree.initial);assert.ok(cluster.final.deformationRms>=0);
    const edges=new Map(tree.edges.map(e=>[e.id,e]));
    for(const s of tree.structures){assert.equal(s.edgeIds.length,s.nodeIds.length-1);for(const id of s.edgeIds)assert.ok(Math.abs(edges.get(id).length-120)<1e-10);}
    assert.ok(cluster.activeCenters.reduce((n,c)=>n+c.edgeIds.length,0)>tree.activeCenters.reduce((n,c)=>n+c.edgeIds.length,0));
  }
});

test("physical hull intersection handles shared regions and disjoint, contained and degenerate hulls",()=>{
  const square=(x,y,size)=>hull([{x,y},{x:x+size,y},{x:x+size,y:y+size},{x,y:y+size}]);
  assert.equal(area(square(0,0,2)),4);assert.equal(intersectionArea(square(0,0,2),square(1,1,2)),1);
  assert.equal(intersectionArea(square(0,0,2),square(3,3,2)),0);
  assert.equal(intersectionArea(square(0,0,4),square(1,1,2)),4);
  assert.equal(intersectionArea([{x:0,y:0}],square(0,0,2)),0);
});

test("declared comparison matrices retain all seeds, root/load conditions and weighting profiles",()=>{
  assert.equal(comparisonSpecs("damping").length,240);assert.equal(comparisonSpecs("weights").length,300);
  assert.equal(comparisonSpecs("clusters").length,240);
  assert.equal(comparisonSpecs("damping",[123]).length,48);
});

test("full-budget hard cases replay deterministically, matching archived records in their recorded runtime",context=>{
  const cases={damping:s=>s.seed===0x9e3779b9&&s.topology==="shared-subtree"&&s.fixedRoots&&s.rigidity===.25&&!s.damping,
    weights:s=>s.seed===0xdecafbad&&s.topology==="leaf-connected-trees"&&["transition","sham"].includes(s.profile)&&s.mode==="damped",
    clusters:s=>s.seed===0x1234abcd&&s.topology==="sparse-rings"&&s.load==="strong"&&s.clusterRigidity===2&&s.damping};
  for(const [family,predicate] of Object.entries(cases)) {
    const report=JSON.parse(readFileSync(new URL(`../docs/experiments/rfc-followup/${family}/results.json`,import.meta.url),"utf8"));
    const specs=comparisonSpecs(family);assert.equal(report.results.length,specs.length);
    const matchingRuntime=report.runtime.node===process.version&&report.runtime.platform===process.platform&&report.runtime.arch===process.arch;
    if(!matchingRuntime)context.diagnostic(`${family}: different Node/platform/architecture; checking repeated local runs instead of byte-identical archived floating-point trajectories`);
    let replayed=0;
    for(const [index,s] of specs.entries())if(predicate(s)) {
      const replay=runComparison(s);replayed++;
      assert.deepEqual(replay,matchingRuntime?report.results[index]:runComparison(s));
      if(family==="damping") {
        assert.ok(replay.final.lengthRms>50);assert.ok(replay.unitRigidityForceRms<1e-8);
      }
    }
    assert.ok(replayed>0);
  }
});
