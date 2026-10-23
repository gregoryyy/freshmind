import test from "node:test";
import assert from "node:assert/strict";
import {TGLayout, GraphEltSet, Node} from "fm4/core";
import {FreshGraph, FreshNode, FreshEdge, RfcController, collectFocalStar, applyRfcForces, angularGapRms, weightedDistance} from "fm4/fm/core";
import {FreshmindPanel, captureDocument} from "fm4/fm";
import {documentToRecord} from "fm4/fm/io";
import {rfcFixture, runRfcScenario} from "./fixtures/rfc.mjs";

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
const positions = graph => [...graph.getNodes()].map(node => [node.x, node.y, node.dx, node.dy]);
const settings = {springMultiplier: 1, angularStiffness: 10};

function star(degrees = [0, 45, 200]) {
  const graph = new FreshGraph();
  const addNode = node => { graph.addNode(node); return node; };
  const center = addNode(new FreshNode("center", "Center", {position: {x: 0, y: 0}}));
  for (const [index, degree] of degrees.entries()) {
    const angle = degree * Math.PI / 180;
    const node = addNode(new FreshNode(`b${index}`, `B${index}`, {position: {x: 100 * Math.cos(angle), y: 100 * Math.sin(angle)}}));
    graph.addEdge(new FreshEdge(center, node, {id: `e${index}`, length: 40}));
  }
  return {graph, center};
}

test("layout force hooks run before original integration and dispose independently", () => {
  const graph = new GraphEltSet(), node = new Node("n"); graph.addNode(node); node.x = node.y = 0;
  const layout = new TGLayout({getGES: () => graph, repaintAfterMove() {}});
  let calls = 0;
  const force = (visible, rigidity) => { assert.equal(visible, graph); assert.equal(rigidity, 1); node.dx += 1; calls++; };
  const removeA = layout.addForce(force), removeB = layout.addForce(force);
  layout.stopDamper(); layout.tick(); assert.equal(calls, 20); assert.ok(node.x > 0);
  removeA(); removeA(); layout.tick(); assert.equal(calls, 30);
  removeB(); layout.tick(); assert.equal(calls, 30);
});

test("focal stars deduplicate parallel/reciprocal edges, ignore loops/hidden relations and sort physical angles", () => {
  const panel = new FreshmindPanel(undefined, {autoStart: false}), {graph, center} = star();
  panel.setGraphEltSet(graph); panel.getGES().addAll();
  const b0 = graph.findNode("b0");
  const reverse = graph.addEdge(new FreshEdge(b0, center, {id: "a-canonical", length: 70}));
  graph.addEdge(new FreshEdge(center, center, {id: "loop"}));
  panel.getGES().addAll();
  let focal = collectFocalStar(panel.getGES(), center);
  assert.equal(focal.branches.length, 3); assert.equal(focal.branches.find(b => b.node === b0).edge, reverse);
  const order = focal.branches.map(b => b.node.getID());
  panel.setZoom(2); panel.setCanvasZoom(3); panel.setHyperbolic(80); panel.setRotation(1);
  assert.deepEqual(collectFocalStar(panel.getGES(), center).branches.map(b => b.node.getID()), order);
  panel.getGES().removeEdge(graph.findEdge(center, graph.findNode("b1")));
  focal = collectFocalStar(panel.getGES(), center); assert.equal(focal.branches.length, 2);
  assert.equal(graph.edgeCount(), 5); panel.destroy();
});

test("equation (1) produces the analytical gap-gradient torque and equal opposite reaction", () => {
  const {graph, center} = star(), focal = collectFocalStar(graph, center), target = 2 * Math.PI / 3;
  applyRfcForces(focal, settings, 1);
  for (let i = 0; i < focal.branches.length; i++) {
    const branch = focal.branches[i], previous = focal.branches[(i + 2) % 3], next = focal.branches[(i + 1) % 3];
    const gapNext = next.angle + (i === 2 ? 2 * Math.PI : 0) - branch.angle;
    const gapPrevious = branch.angle + (i === 0 ? 2 * Math.PI : 0) - previous.angle;
    close(branch.node.x * branch.node.dy - branch.node.y * branch.node.dx, settings.angularStiffness * ((gapNext - target) - (gapPrevious - target)));
    close(branch.node.x * branch.node.dx + branch.node.y * branch.node.dy, 0);
  }
  close([...graph.getNodes()].reduce((sum, node) => sum + node.dx, 0), 0);
  close([...graph.getNodes()].reduce((sum, node) => sum + node.dy, 0), 0);
  const initialError = angularGapRms(focal);
  for (const node of graph.getNodes()) { node.x += .01 * node.dx; node.y += .01 * node.dy; }
  assert.ok(angularGapRms(collectFocalStar(graph, center)) < initialError);
});

test("regular angular gaps exert no angular force, including unequal branch radii", () => {
  const {graph, center} = star([0, 120, 240]); graph.findNode("b1").x *= 2; graph.findNode("b1").y *= 2;
  applyRfcForces(collectFocalStar(graph, center), settings, 1);
  for (const node of graph.getNodes()) { close(node.dx, 0); close(node.dy, 0); }
  close(angularGapRms(collectFocalStar(graph, center)), 0);
});

test("weighted angles recognize an elliptical focal star and unit weights preserve the original forces exactly", () => {
  const weights={x:.25,y:1},{graph,center}=star([0,120,240]);
  for(const node of graph.getNodes())node.x*=2;
  close(weightedDistance({x:0,y:0},{x:6,y:4},weights),5);
  const focal=collectFocalStar(graph,center,weights);close(angularGapRms(focal),0);
  assert.ok(angularGapRms(collectFocalStar(graph,center))>.1);
  applyRfcForces(focal,settings,1);for(const node of graph.getNodes()){close(node.dx,0);close(node.dy,0);}
  weights.x=1;assert.equal(focal.coordinateWeights.x,.25);
  const a=star(),b=star();
  applyRfcForces(collectFocalStar(a.graph,a.center),settings,1);
  applyRfcForces(collectFocalStar(b.graph,b.center,{x:1,y:1}),settings,1);
  assert.deepEqual(positions(a.graph),positions(b.graph));
});

test("weighted physical impulses match the negative energy gradient and retain equal opposite reactions", () => {
  const {graph,center}=star(),weights={x:.25,y:1.5},forceSettings={springMultiplier:3,angularStiffness:10},rigidity=.7;
  const energy=()=>{
    const focal=collectFocalStar(graph,center,weights),target=2*Math.PI/focal.branches.length;
    let value=0;
    for(const [i,branch] of focal.branches.entries()){
      const next=focal.branches[(i+1)%focal.branches.length];
      const gap=next.angle+(i===focal.branches.length-1?2*Math.PI:0)-branch.angle;
      value+=forceSettings.angularStiffness/2*(gap-target)**2;
      value+=(forceSettings.springMultiplier-1)*weightedDistance(branch.node,center,weights)**3/(3*branch.edge.getLength()*100);
    }
    return value*rigidity;
  };
  applyRfcForces(collectFocalStar(graph,center,weights),forceSettings,rigidity);
  for(const node of graph.getNodes())for(const axis of ['x','y']){
    const initial=node[axis],h=1e-4;node[axis]=initial+h;const plus=energy();node[axis]=initial-h;const minus=energy();node[axis]=initial;
    close(node[axis==='x'?'dx':'dy'],-(plus-minus)/(2*h),1e-6);
  }
  close([...graph.getNodes()].reduce((sum,node)=>sum+node.dx,0),0);
  close([...graph.getNodes()].reduce((sum,node)=>sum+node.dy,0),0);
});

test("coordinate weights validate atomically, remain detached and apply independently of the viewing transforms", () => {
  const panel=new FreshmindPanel(undefined,{autoStart:false}),{graph,center}=star();
  panel.setGraphEltSet(graph);panel.getGES().addAll();const rfc=panel.getRfc();rfc.setFocus(center);
  const weights={x:.25,y:1};rfc.configure({coordinateWeights:weights});weights.x=10;
  const snapshot=rfc.getState();snapshot.settings.coordinateWeights.y=10;
  assert.deepEqual(rfc.getState().settings.coordinateWeights,{x:.25,y:1});
  for(const value of [0,-1,NaN,Infinity,101])assert.throws(()=>rfc.configure({springMultiplier:4,coordinateWeights:{x:value,y:1}}),RangeError);
  assert.throws(()=>rfc.configure({coordinateWeights:null}),RangeError);
  assert.equal(rfc.getState().settings.springMultiplier,3);
  const original=rfc.getState();panel.setZoom(2);panel.setCanvasZoom(3);panel.setRotation(1);panel.setHyperbolic(80);
  assert.deepEqual(rfc.getState(),original);
  const before=positions(graph);rfc.apply(panel.getGES(),1);const first=positions(graph);
  [...graph.getNodes()].forEach((node,i)=>{[node.x,node.y,node.dx,node.dy]=before[i];});
  panel.setRotation(-1);panel.setZoom(.5);rfc.apply(panel.getGES(),1);assert.deepEqual(positions(graph),first);
  const semantic=documentToRecord(captureDocument(panel),{includeLayout:false,includeView:false});
  rfc.configure({coordinateWeights:{x:1,y:1}});assert.deepEqual(documentToRecord(captureDocument(panel),{includeLayout:false,includeView:false}),semantic);
  for(const value of [0,Infinity,-1])assert.throws(()=>collectFocalStar(graph,center,{x:1,y:value}),RangeError);
  panel.destroy();
});

test("radial reinforcement adds the original attraction multiplier and respects locality weighting", () => {
  const {graph, center} = star([0]), branch = graph.findNode("b0");
  applyRfcForces(collectFocalStar(graph, center), {springMultiplier: 3, angularStiffness: 0}, 2);
  close(branch.dx, -10); close(center.dx, 10); close(branch.dy, 0);
  branch.dx = center.dx = 0; branch.justMadeLocal = true;
  applyRfcForces(collectFocalStar(graph, center), {springMultiplier: 3, angularStiffness: 0}, 2);
  close(branch.dx, -10); close(center.dx, 1);
});

test("isolated, one/two-branch and coincident focal structures remain finite", () => {
  for (const weights of [{x:1,y:1},{x:.01,y:100},{x:100,y:.01}]) for (const angles of [[], [0], [0, 30], [0, 0, 0]]) {
    const {graph, center} = star(angles);
    if (angles.length === 3) for (const node of graph.getNodes()) node.x = node.y = 0;
    // Isolate the two-branch angular correction from anisotropic radial attraction.
    applyRfcForces(collectFocalStar(graph, center, weights), {springMultiplier: angles.length === 2 ? 1 : 3, angularStiffness: 300}, 1);
    for (const row of positions(graph)) assert.ok(row.every(Number.isFinite));
    if (angles.length < 2) assert.equal(angularGapRms(collectFocalStar(graph, center)), 0);
    if (angles.length === 2) assert.ok(graph.findNode("b0").dy < 0 && graph.findNode("b1").dy > 0);
  }
});

test("activation/configuration are atomic and idempotent, snapshots detached and removal restores baseline force behavior", () => {
  const {graph, center, rfc, layout} = rfcFixture();
  const untouched = runRfcScenario("crowded-star", false, 1);
  const before = positions(graph); rfc.setFocus(center); rfc.setFocus(center);
  assert.deepEqual(positions(graph), before);
  const state = rfc.getState(); state.settings.springMultiplier = 100; state.branchIds.length = 0;
  assert.equal(rfc.getState().settings.springMultiplier, 3); assert.equal(rfc.getState().branchIds.length, 6);
  for (const update of [{springMultiplier: 0}, {springMultiplier: Infinity}, {angularStiffness: NaN}, {angularStiffness: -1}, {springMultiplier: 4, angularStiffness: 100001}])
    assert.throws(() => rfc.configure(update), RangeError);
  assert.equal(rfc.getState().settings.springMultiplier, 3);
  assert.throws(() => rfc.setFocus(new FreshNode("foreign")), /visible/); assert.equal(rfc.getState().focusId, center.getID());
  rfc.setFocus(null); layout.tick();
  assert.deepEqual([...graph.getNodes()].map(node => ({id: node.getID(), label: node.getLabel(), x: node.x, y: node.y, fixed: node.fixed})), untouched.nodes);
  rfc.destroy(); assert.throws(() => rfc.setFocus(center), /destroyed/); layout.stop();
});

test("panel suspension, deletion, graph replacement and layout replacement retain one force owner", () => {
  const panel = new FreshmindPanel(undefined, {autoStart: false}), {graph, center} = star();
  panel.setGraphEltSet(graph); panel.getGES().addAll(); const rfc = panel.getRfc();
  rfc.setFocus(center); const old = panel.tgLayout;
  const newLayout = new TGLayout(panel, () => .5); panel.setTGLayout(newLayout);
  old.stopDamper();
  const control = new TGLayout({getGES: () => graph, repaintAfterMove() {}}, () => .5);
  const snapshot = positions(graph); old.tick(); const moved = positions(graph);
  [...graph.getNodes()].forEach((node, i) => { [node.x,node.y,node.dx,node.dy] = snapshot[i]; });
  control.stopDamper(); control.tick(); assert.deepEqual(positions(graph), moved);
  const beforeNew = positions(graph);
  newLayout.stopDamper(); newLayout.tick(); const reinforced = positions(graph);
  [...graph.getNodes()].forEach((node, i) => { [node.x,node.y,node.dx,node.dy] = beforeNew[i]; });
  control.tick(); assert.notDeepEqual(reinforced, positions(graph));
  panel.getGES().removeNode(center); panel.repaint(); assert.equal(rfc.getState().active, false); assert.equal(rfc.getState().enabled, true);
  panel.getGES().addNodeWithEdges(center); panel.repaint(); assert.equal(rfc.getState().active, true);
  panel.deleteNode(center); assert.equal(rfc.getState().enabled, false);
  const replacement = panel.addNode(new FreshNode("center")); assert.equal(rfc.getState().enabled, false);
  rfc.setFocus(replacement); panel.setGraphEltSet(new FreshGraph()); assert.equal(rfc.getState().enabled, false);
  const node = panel.addNode("after"); rfc.setFocus(node); panel.clearAll(); assert.equal(rfc.getState().enabled, false);
  panel.destroy(); assert.throws(() => rfc.configure({angularStiffness: 10}), /destroyed/);
});

test("RFC never changes semantic graph/export records and respects fixed/dragged positions", () => {
  const panel = new FreshmindPanel(undefined, {autoStart: false}), {graph, center} = star();
  panel.setGraphEltSet(graph); panel.getGES().addAll();
  const original = documentToRecord(captureDocument(panel), {includeLayout: false, includeView: false});
  const adjacency = [...graph.getNodes()].map(node => [...node.getEdges()]);
  center.fixed = true; const branch = graph.findNode("b0"); panel.setDragNode(branch);
  // Capture after pinning, because fixed positions are persistent by design.
  const pinned = documentToRecord(captureDocument(panel), {includeLayout: false, includeView: false});
  const frozen = [center.x, center.y, branch.x, branch.y];
  panel.getRfc().setFocus(center); panel.tgLayout.resetDamper(); panel.tgLayout.tick(20);
  assert.deepEqual([center.x, center.y, branch.x, branch.y], frozen);
  assert.deepEqual(documentToRecord(captureDocument(panel), {includeLayout: false, includeView: false}), pinned);
  panel.getRfc().setFocus(null);
  assert.deepEqual([...graph.getNodes()].map(node => [...node.getEdges()]), adjacency);
  assert.equal(graph.edgeCount(), original.edges.length); panel.destroy();
});

test("single-focus experiments repeat exactly and reduce configured angular error in all three fixtures", () => {
  for(const name of ["crowded-star","unequal-radii","wide-labels"]){
    const baseline = runRfcScenario(name, false), reinforced = runRfcScenario(name, true);
    assert.deepEqual(runRfcScenario(name, true), reinforced);
    assert.ok(reinforced.final.angularGapRms < baseline.final.angularGapRms, JSON.stringify({name,baseline: baseline.final, reinforced: reinforced.final}));
    assert.deepEqual(reinforced.edges, baseline.edges);
    assert.ok(reinforced.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
  }
});
