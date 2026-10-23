/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {TGLayout} from "fm4/core";
import {FreshGraph,FreshNode,FreshEdge,RfcController,rfcForcePresets,focalRegions,regionClearance} from "fm4/fm/core";
import {projectRfcStructure} from "../../dist/fm/rfc/structures.js";
import {clusterFixture,randomSource} from "./rfc-comparison.mjs";

export const exclusionModes=["baseline","rfc","context","overlap","strong"];
export const exclusionCases=["single-region","shared-foci","overlap-pressure","cluster-regions"];
const rms=xs=>Math.sqrt(xs.reduce((s,x)=>s+x*x,0)/Math.max(1,xs.length));

/** Pinned interior pressure anchor deliberately prevents perfect clearing; all conditions retain it. */
export function exclusionGraph(name,seed) {
  const random=randomSource(seed),cluster=name==="cluster-regions"?clusterFixture("overlapping-squares",seed,"weak"):null,graph=cluster?.graph??new FreshGraph();
  if(!exclusionCases.includes(name))throw new Error("Unknown exclusion fixture");
  const add=(id,x,y,fixed=false)=>{
    const n=new FreshNode(id,id,{type:fixed?"project":"idea",fixed,position:{x:x+(fixed?0:(random()-.5)*20),y:y+(fixed?0:(random()-.5)*20)}});graph.addNode(n);return n;
  };
  const edge=(from,to,id,length=90)=>{graph.addEdge(new FreshEdge(graph.findNode(from),graph.findNode(to),{id,length}));return id;};
  if(name==="single-region") {
    add("center",0,0,true);const members=["center"],edges=[];
    for(let i=0;i<4;i++){const id=`branch-${i}`;add(id,120*Math.cos(i*Math.PI/2),120*Math.sin(i*Math.PI/2),true);members.push(id);edges.push(edge("center",id,`branch-${i}`));}
    graph.setSubstructure({id:"single-tree",label:"Single focal tree",kind:"tree",rootId:"center",nodeIds:members,edgeIds:edges});
  }else if(name==="shared-foci"||name==="overlap-pressure") {
    for(const [id,x,y,fixed] of [["a0",-70,0,true],["b0",70,0,true],["a1",-90,90,false],["a2",10,-80,false],
      ["b1",90,90,false],["b2",-10,-80,false],["shared",0,90,false]])add(id,x,y,fixed);
    for(const side of ["a","b"]) {
      const nodeIds=[`${side}0`,`${side}1`,`${side}2`,"shared"],edgeIds=nodeIds.slice(1).map(id=>edge(`${side}0`,id,`${side}0:${id}`));
      graph.setSubstructure({id:`${side}-tree`,label:`${side.toUpperCase()} tree`,kind:"tree",rootId:`${side}0`,nodeIds,edgeIds});
    }
    if(name==="overlap-pressure") {
      edge("a0","b0","root-context");edge("a1","b0","a-cross-pressure",10);edge("b1","a0","b-cross-pressure",10);
    }
  }else for(const s of cluster.communities)
    graph.setSubstructure({id:s.id,label:s.id,kind:"cluster",rootId:s.rootId,nodeIds:s.nodeIds,edgeIds:s.edgeIds});
  add("pressure-anchor",0,-10,true);
  for(let i=0;i<3;i++){add(`context-${i}`,40*Math.cos(i*2*Math.PI/3),40*Math.sin(i*2*Math.PI/3));edge(`context-${i}`,"pressure-anchor",`pressure-${i}`,30);}
  return graph;
}

/** Measures the same hypothetical focal regions in all modes, even when their exclusion forces are off. */
export function exclusionMetrics(graph,padding=20) {
  const weights={x:1,y:1},projections=graph.getSubstructures().map(s=>projectRfcStructure(graph,graph,graph.findNode(s.rootId),s,weights));
  const regions=focalRegions(projections,weights,padding),members=new Set(regions.flatMap(r=>r.memberIds));
  const context=[],focal=[],fixedContext=[],fixedFocal=[];
  for(const node of graph.getNodes()) {
    const own=members.has(node.getID()),foreign=regions.filter(r=>!r.members.has(node));
    const depth=Math.max(0,...foreign.map(r=>-regionClearance(r,node)));
    if(own)(node.fixed?fixedFocal:focal).push(depth);else(node.fixed?fixedContext:context).push(depth);
  }
  const edges=new Map([...graph.getEdges()].map(e=>[e.getID(),e])),ids=[...new Set(graph.getSubstructures().flatMap(s=>s.edgeIds))];
  const cluster=graph.getSubstructures()[0].kind==="cluster";
  return {contextDepthRms:rms(context),contextIntruders:context.filter(x=>x>1e-8).length,
    nonsharedDepthRms:rms(focal),nonsharedIntruders:focal.filter(x=>x>1e-8).length,
    fixedContextIntruders:fixedContext.filter(x=>x>1e-8).length,fixedNonsharedIntruders:fixedFocal.filter(x=>x>1e-8).length,
    lengthRms:rms(ids.map(id=>{const e=edges.get(id);return Math.hypot(e.from.x-e.to.x,e.from.y-e.to.y)-(cluster?e.getLength():120);})),
    meanRegionRadius:regions.reduce((s,r)=>s+r.radius,0)/regions.length,
    regions:regions.map(({anchors:_,members:__,...r})=>r)};
}

/** Fixed 4000-step matched comparison with actual single-step motion and a separate final force probe. */
export function runExclusion(name,seed,mode,batches=400) {
  if(!exclusionModes.includes(mode))throw new Error("Unknown exclusion mode");
  const graph=exclusionGraph(name,seed),empty=new FreshGraph();let ready=false,onBatch=()=>{};
  const layout=new TGLayout({getGES:()=>ready?graph:empty,repaintAfterMove:()=>onBatch()},randomSource(seed^0x00c0ffee));
  layout.setRigidity(.1);layout.tick();ready=true;
  const host={getGES:()=>graph,getCompleteEltSet:()=>graph,resetDamper:()=>layout.resetDamper()};
  const exclusion={enabled:["context","overlap","strong"].includes(mode),overlap:mode!=="context",strength:mode==="strong"?1:.25,padding:20};
  const rfc=new RfcController(host,rfcForcePresets.tree,{enabled:false},exclusion);layout.addForce(rfc.apply);
  if(mode!=="baseline")for(const [i,s] of graph.getSubstructures().entries())rfc.activateSubstructure(s.id,i>0);
  const positions=()=>[...graph.getNodes()].map(n=>({id:n.getID(),x:n.x,y:n.y,fixed:n.fixed}));
  const initialNodes=positions(),initial=exclusionMetrics(graph),movable=[...graph.getNodes()].filter(n=>!n.fixed),trace=[],startup=[];
  let previous=movable.map(n=>[n.x,n.y]),calls=0,steps=0,largeSteps=0,max=0,squares=0,probe=false,forceRms=null;
  let nonsharedExposure=0,contextExposure=0,nonsharedIntrusionSteps=0;
  let initialImpulses=null;
  const tail=[],sample=()=>{
    if(probe)return;
    const ds=movable.map((n,i)=>Math.hypot(n.x-previous[i][0],n.y-previous[i][1]));previous=movable.map(n=>[n.x,n.y]);
    const sum=ds.reduce((s,d)=>s+d*d,0),maximum=Math.max(...ds);steps++;if(maximum>29.9)largeSteps++;
    const current=exclusionMetrics(graph);nonsharedExposure+=current.nonsharedDepthRms;contextExposure+=current.contextDepthRms;
    if(current.nonsharedIntruders>0)nonsharedIntrusionSteps++;
    if(steps<=40)startup.push({step:steps,maxDisplacement:maximum,contextDepthRms:current.contextDepthRms,nonsharedDepthRms:current.nonsharedDepthRms,nonsharedIntruders:current.nonsharedIntruders});
    squares+=sum;max=Math.max(max,maximum);tail.push(sum);if(tail.length>100)tail.shift();
  };
  layout.addForce(()=>{
    if(probe){if(forceRms===null)forceRms=rms(movable.map(n=>Math.hypot(n.dx,n.dy)))/.1;return;}
    if(calls===0)initialImpulses=[...graph.getNodes()].map(n=>({id:n.getID(),x:n.dx,y:n.dy}));
    if(calls++%10!==0)sample();
  });onBatch=sample;layout.resetDamper();
  try {
    for(let batch=1;batch<=batches;batch++) {
      layout.tick();if(![...graph.getNodes()].every(n=>[n.x,n.y,n.dx,n.dy].every(Number.isFinite)))throw new Error(`Nonfinite state at ${batch}`);
      if(batch===1||batch%10===0||batch===batches)trace.push({batch,maxDisplacement:max,rmsDisplacement:Math.sqrt(squares/(10*movable.length)),
        largeSteps,damper:layout.getState().damper,...exclusionMetrics(graph)});
      max=squares=0;
    }
    const nodes=positions(),final=exclusionMetrics(graph);probe=true;layout.stopMotion();layout.stopMotion();for(const n of graph.getNodes())n.dx=n.dy=0;layout.tick();
    if(JSON.stringify(nodes)!==JSON.stringify(positions()))throw new Error("Probe moved the layout");
    return {name,seed,mode,batches,steps,largeSteps,meanContextDepth:contextExposure/steps,meanNonsharedDepth:nonsharedExposure/steps,nonsharedIntrusionSteps,
      tailStepRms:Math.sqrt(tail.reduce((s,x)=>s+x,0)/(tail.length*movable.length)),unitRigidityForceRms:forceRms,
      rigidity:.1,settings:rfc.getState().settings,exclusionSettings:exclusion,stabilizationEnabled:false,initialNodes,nodes,initial,final,trace,
      startup,initialImpulses,structures:graph.getSubstructures(),edges:[...graph.getEdges()].map(e=>({id:e.getID(),from:e.from.getID(),to:e.to.getID(),length:e.getLength()}))};
  }finally{rfc.destroy();layout.stop();}
}
