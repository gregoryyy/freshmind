/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {Node} from "fm4/core";
import {FreshmindPanel,FreshNode,FreshEdge,clusterStructure} from "fm4/fm";
import {RfcStabilizer} from "fm4/fm/rfc";
import {multiFocusFixture} from "../tests/fixtures/rfc-multifocus.mjs";
import {RfcStabilizer as HistoricalStabilizer} from "../tests/fixtures/rfc-stabilization-v1.mjs";

const output=resolve(process.argv[2]??"docs/experiments/rfc-stability"),batches=400;
const historical=process.argv.includes("--historical"),Stabilizer=historical?HistoricalStabilizer:RfcStabilizer;
/** Prescribed motion separates detector blind spots from the numerical force response. */
function prescribed(kind) {
  let time=0;const a=new Node("oscillating"),b=new Node("translating"),nodes=kind==="masked-reversal"?[a,b]:[a];
  const stabilizer=new Stabilizer({enabled:true,now:()=>time}),trace=[];
  for(let step=0;step<80;step++) {
    time+=2;a.x=kind==="masked-reversal"?(step%2?4:0):10*Math.cos(step*Math.PI/3);
    a.y=kind==="masked-reversal"?0:10*Math.sin(step*Math.PI/3);b.x=step*12;b.y=0;
    for(const n of nodes){n.dx=10;n.dy=0;}stabilizer.apply(nodes);
    trace.push({step,timeMs:time,nodes:nodes.map(n=>({id:n.getID(),x:n.x,y:n.y})),...stabilizer.getState()});
  }
  return {name:kind,...stabilizer.getState(),trace};
}
function small(enabled,cluster=false) {
  let time=0;const p=new FreshmindPanel(undefined,{autoStart:false,rfcStabilization:{enabled,now:()=>time+=2}});
  for(const [id,x,y] of [["a",0,0],["b",8,2],["c",-3,9],["d",10,12]])p.addNode(new FreshNode(id,id,{weight:cluster?9:1,position:{x,y}}));
  const links=[["a","b"],["a","c"],["d","b"],["d","c"]];if(cluster)links.push(["b","c"]);
  for(const [a,b] of links)p.addEdge(new FreshEdge(p.findNode(a),p.findNode(b),{id:`${a}-${b}`,length:90,weight:cluster?30:10}));
  if(cluster) {
    const g=p.getCompleteEltSet();g.setSubstructure(clusterStructure(g,["a","b","c"],"a","cluster-a"));g.setSubstructure(clusterStructure(g,["b","c","d"],"d","cluster-d"));
    p.getRfc().configureClusters({rigidity:2});p.getRfc().activateSubstructure("cluster-a");p.getRfc().activateSubstructure("cluster-d",true);
  }else {p.getRfc().setFocus(p.findNode("a"));p.getRfc().addFocus(p.findNode("d"));}
  return {graph:p.getCompleteEltSet(),layout:p.tgLayout,rfc:p.getRfc(),onBatch:callback=>p.addGraphListener({graphMoved:callback}),destroy:()=>p.destroy()};
}
function measure(name,enabled) {
  let time=0;const fixture=name.startsWith("small-")?small(historical?false:enabled,name==="small-cluster-pair"):multiFocusFixture(name,{mode:"both",seed:name==="leaf-connected-trees"?0xdecafbad:0x9e3779b9,
    fixedRoots:name==="shared-subtree",stabilization:{enabled:historical?false:enabled,now:()=>time+=2}});
  const {graph,layout,rfc}=fixture,nodes=[...graph.getNodes()].filter(n=>!n.fixed),tail=[],trace=[];
  const legacy=historical?new HistoricalStabilizer({enabled,now:()=>time+=2}):null;
  if(legacy)layout.addForce(()=>legacy.apply(rfc.getState().memberIds.map(id=>graph.findNode(id))));
  const positions=()=>[...graph.getNodes()].map(n=>({id:n.getID(),label:n.getLabel(),x:n.x,y:n.y,fixed:n.fixed,weight:n.getWeight()}));
  const initialNodes=positions(),activeCenters=rfc.getState().centers;
  const edges=[...graph.getEdges()].map(e=>({id:e.getID(),from:e.from.getID(),to:e.to.getID(),length:e.getLength(),weight:e.getWeight()}));
  const selectedIds=new Set(activeCenters.flatMap(c=>c.edgeIds)),weights=rfc.getState().settings.coordinateWeights;
  const targets=edges.filter(e=>selectedIds.has(e.id)).map(e=>({...e,target:name==="small-cluster-pair"?e.length*rfc.getState().settings.radialLength/120:rfc.getState().settings.radialLength}));
  const lengthRms=(coordinates=null)=>{
    const byId=coordinates?new Map(coordinates.map(n=>[n.id,n])):null;
    return Math.sqrt(targets.reduce((sum,e)=>{
      const a=byId?.get(e.from)??graph.findNode(e.from),b=byId?.get(e.to)??graph.findNode(e.to);
      return sum+(Math.sqrt(weights.x*(a.x-b.x)**2+weights.y*(a.y-b.y)**2+1)-e.target)**2;
    },0)/Math.max(1,targets.length));
  };
  const motion=[],startupMotion=[],events=[];
  const snapshots=[{batch:0,nodes:initialNodes}];
  let previous=nodes.map(n=>[n.x,n.y]),calls=0,largeSteps=0,steps=0,pending=null;
  let batchSquares=0,batchMax=0,batchLarge=0,previousDetections=0,previousBackoffs=0,previousPhase="steady";
  const sample=()=>{
    const distances=nodes.map((n,i)=>Math.hypot(n.x-previous[i][0],n.y-previous[i][1]));previous=nodes.map(n=>[n.x,n.y]);
    const squares=distances.reduce((s,d)=>s+d*d,0),maximum=Math.max(...distances),large=maximum>29.9;
    tail.push(squares);if(tail.length>100)tail.shift();
    if(large)largeSteps++;steps++;
    batchSquares+=squares;batchMax=Math.max(batchMax,maximum);if(large)batchLarge++;
    // pending describes the force/damper actually used by this integration, rather
    // than the newly computed gain for the next step seen by the passive callback.
    const state=pending.stabilization;
    if(steps<=100)startupMotion.push({step:steps,timeMs:steps*2,maxDisplacement:maximum,rmsDisplacement:Math.sqrt(squares/nodes.length),gain:state.gain,damper:pending.damper});
    if(state.detections!==previousDetections||state.phase!==previousPhase||(state.recoveryBackoffs??0)!==previousBackoffs) {
      events.push({step:steps,timeMs:steps*2,...state});previousDetections=state.detections;previousPhase=state.phase;previousBackoffs=state.recoveryBackoffs??0;
    }
  };
  layout.addForce(()=>{
    if(calls++%10!==0)sample();
    pending={stabilization:legacy?.getState()??rfc.getState().stabilization,damper:layout.getState().damper};
  });fixture.onBatch(sample);layout.resetDamper();
  for(let batch=1;batch<=batches;batch++) {
    layout.tick();
    motion.push({batch,timeMs:batch*20,maxDisplacement:batchMax,rmsDisplacement:Math.sqrt(batchSquares/(10*nodes.length)),largeSteps:batchLarge,
      cumulativeLargeSteps:largeSteps,gain:pending.stabilization.gain,damper:layout.getState().damper,lengthRms:lengthRms()});
    batchSquares=batchMax=batchLarge=0;
    if([1,5,25,100,400].includes(batch))snapshots.push({batch,nodes:positions()});
    if(batch%10===0)trace.push({batch,...(legacy?.getState()??rfc.getState().stabilization)});
  }
  const result={name,enabled,settings:rfc.getState().settings,clusterSettings:rfc.getState().clusterSettings,
    centers:rfc.getState().centers.length,movable:nodes.length,steps,largeStepCount:largeSteps,
    tailStepRms:Math.sqrt(tail.reduce((s,x)=>s+x,0)/(tail.length*nodes.length)),
    stabilization:legacy?.getState()??rfc.getState().stabilization,trace,motion,startupMotion,events,initialNodes,nodes:positions(),edges,
    structures:graph.getSubstructures(),activeCenters,initialLengthRms:lengthRms(initialNodes),finalLengthRms:lengthRms(),snapshots};
  fixture.destroy?.();rfc.destroy();layout.stop();return result;
}
const result={detector:historical?"v1-global-energy":"v2-per-node-windows",largeStepThreshold:29.9,description:"Detector probes and matched 400-batch layout responses; virtual 2 ms/step; damping off/on. No force retuning.",
  sampling:{motion:"Batch maxima and RMS over all ten actual integrations; gain paired with the force applied to that step.",
    startupMotion:"Every integration in the first 100 steps; no ten-step net-displacement aliasing.",
    lengthRms:"Unweighted RMS of sqrt(weighted distance squared + 1) minus selected spring target; not a total force residual."},
  prescribed:[prescribed("masked-reversal"),prescribed("circulation")],
  layouts:["small-two-centers","small-cluster-pair","leaf-connected-trees","shared-subtree"].flatMap(name=>[measure(name,false),measure(name,true)])};
await mkdir(output,{recursive:true});await writeFile(resolve(output,"results.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({detector:result.detector,prescribed:result.prescribed.map(({name,detections,gain})=>({name,detections,gain})),
  layouts:result.layouts.map(({name,enabled,largeStepCount,tailStepRms,finalLengthRms})=>({name,enabled,largeStepCount,tailStepRms,finalLengthRms}))},null,2));
