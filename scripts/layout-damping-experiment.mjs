/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {TGLayout,GraphEltSet,Node,Edge,MotionStabilizer} from "fm4/core";
import {RfcStabilizer as V2} from "../tests/fixtures/rfc-stabilization-v2.mjs";
import {rfcFixture} from "../tests/fixtures/rfc.mjs";

const output=resolve(process.argv[2]??"docs/experiments/layout-damping");
const modes=["off","v2-general","v3-general","v3-early-cooling"],batches=400;

function probe(name,Detector) {
  const period=name==="slow-swing"?80:320,n=new Node("probe");let time=0,first=null;
  const detector=new Detector({enabled:true,now:()=>time});
  for(let i=0;i<=period*4;i++) {
    const phase=i*2*Math.PI/period;
    n.x=name==="translation"?i*.5:(name==="jitter"?.05:.5)*(name==="decay"?.6**(i/(period/2)):1)*Math.cos(phase);
    n.y=name==="slow-orbit"?.5*Math.sin(phase):0;n.dx=10;n.dy=0;time=i*2;detector.apply([n]);
    if(first===null&&detector.getState().detections)first=i;
  }
  return {name,detector:Detector===V2?"v2":"v3",period,amplitude:name==="jitter"?.05:.5,
    firstDetectionStep:first,firstDetectionCycles:first===null?null:first/period,...detector.getState()};
}

function measure(name,mode) {
  const source=name==="rfc-stiff-star"?rfcFixture("crowded-star",true):null;
  const graph=source?.graph??new GraphEltSet();let calls=0,steps=0,inBatch=0,probing=false,forceRms=null;
  const legacy=mode==="v2-general"?new V2({enabled:true,now:()=>calls*2}):null;
  let sample=()=>{};
  const layout=new TGLayout({getGES:()=>graph,repaintAfterMove(){if(!probing)sample();inBatch=0;}},()=>.5,
    {enabled:mode.startsWith("v3"),response:mode==="v3-early-cooling"?"cooling":"impulse",now:()=>calls*2});
  if(source) {
    source.center.fixed=false;source.rfc.configure({radialStiffness:2});layout.addForce(source.rfc.apply);
  } else {
    const root=new Node("root");root.x=root.y=0;root.fixed=name==="plain-pinned-star";graph.addNode(root);
    for(let i=0;i<6;i++) {
      const n=new Node(`branch-${i}`);n.x=100*Math.cos(i);n.y=100*Math.sin(i);graph.addNode(n);
      graph.addEdge(new Edge(root,n,name==="plain-ordinary-star"?40:1));
    }
  }
  const nodes=[...graph.getNodes()],movable=nodes.filter(n=>!n.fixed);
  const positions=()=>nodes.map(n=>({id:n.getID(),x:n.x,y:n.y,fixed:n.fixed}));
  const initialNodes=positions(),edges=[...graph.getEdges()].map(e=>({from:e.from.getID(),to:e.to.getID(),length:e.getLength()}));
  const state=()=>legacy?.getState()??layout.getAdaptiveDampingState();
  let previous=movable.map(n=>[n.x,n.y]),largeSteps=0,lastMovingMs=0,firstDetectionMs=null,firstRestoredMs=null,fastCoolingMs=null;
  let maxDisplacement=0,squares=0,priorDetections=0,priorPhase="steady";
  const events=[],trace=[];
  sample=()=>{
    const distances=movable.map((n,i)=>Math.hypot(n.x-previous[i][0],n.y-previous[i][1]));previous=movable.map(n=>[n.x,n.y]);
    const maximum=Math.max(...distances),s=state();steps++;
    if(fastCoolingMs===null&&layout.getState().damper<.9)fastCoolingMs=steps*2;
    if(maximum>29.9)largeSteps++;if(maximum>.1)lastMovingMs=steps*2;
    if(firstDetectionMs===null&&s.detections)firstDetectionMs=steps*2;
    if(mode!=="v3-early-cooling"&&firstDetectionMs!==null&&firstRestoredMs===null&&s.gain===1&&s.phase==="steady")firstRestoredMs=steps*2;
    if(s.detections!==priorDetections||s.phase!==priorPhase) {
      events.push({step:steps,timeMs:steps*2,...s});priorDetections=s.detections;priorPhase=s.phase;
    }
    maxDisplacement=Math.max(maxDisplacement,maximum);squares+=distances.reduce((sum,d)=>sum+d*d,0);
  };
  layout.addForce(()=>{
    if(probing){forceRms??=Math.sqrt(movable.reduce((sum,n)=>sum+n.dx*n.dx+n.dy*n.dy,0)/movable.length);return;}
    if(inBatch)sample();inBatch++;calls++;
  });
  if(legacy)layout.addForce(()=>{if(!probing)legacy.apply(nodes);});
  layout.resetDamper();
  for(let batch=1;batch<=batches;batch++) {
    layout.tick();trace.push({batch,timeMs:batch*20,maxDisplacement,rmsDisplacement:Math.sqrt(squares/(10*movable.length)),
      gain:mode==="v3-early-cooling"?1:state().gain,damper:layout.getState().damper});maxDisplacement=squares=0;
  }
  const finalState=state(),finalNodes=positions();
  probing=true;layout.setAdaptiveDampingEnabled(false);layout.stopMotion();layout.stopMotion();
  for(const n of nodes)n.dx=n.dy=0;layout.tick();
  if(JSON.stringify(positions())!==JSON.stringify(finalNodes))throw new Error("Force probe moved the graph");
  const result={name,mode,rfc:Boolean(source),settings:source?.rfc.getState().settings??null,steps,initialNodes,edges,
    largeSteps,lastMovingMs,firstDetectionMs,fastCoolingMs,firstRestoredMs,forceRms,finalState,finalNodes,trace,events};
  source?.rfc.destroy();source?.layout.stop();layout.stop();return result;
}
const result={experiment:"K: general adaptive damping",version:1,
  description:"Matched 400-batch runs at virtual 2 ms per integration. Native TouchGraph forces; optional RFC explicitly identified. No force retuning.",
  reference:{detector:"tests/fixtures/rfc-stabilization-v2.mjs",commit:"43fea7a"},
  thresholds:{largeStep:29.9,visibleMovement:.1},
  caveats:"Synthetic stress cases, not user latency measurements. Last movement refers only to this 8-second horizon. Low motion does not prove force balance, feasibility or readability.",
  probes:["slow-swing","very-slow-swing","slow-orbit","translation","jitter","decay"].flatMap(name=>[probe(name,V2),probe(name,MotionStabilizer)]),
  layouts:["plain-stiff-star","plain-pinned-star","plain-ordinary-star","rfc-stiff-star"].flatMap(name=>modes.map(mode=>measure(name,mode)))};
await mkdir(output,{recursive:true});await writeFile(resolve(output,"results.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({probes:result.probes.map(({name,detector,firstDetectionCycles})=>({name,detector,firstDetectionCycles})),
  layouts:result.layouts.map(({name,mode,largeSteps,lastMovingMs,firstDetectionMs,fastCoolingMs,firstRestoredMs,forceRms})=>({name,mode,largeSteps,lastMovingMs,firstDetectionMs,fastCoolingMs,firstRestoredMs,forceRms}))},null,2));
