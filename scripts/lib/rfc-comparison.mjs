/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {TGLayout} from "fm4/core";
import {FreshGraph,FreshNode,FreshEdge,RfcController,rfcForcePresets,rfcRelationStrength,
  clusterStructure,spanningTree} from "fm4/fm/core";
import {multiFocusFixture,multiFocusMetrics,multiFocusSeeds} from "../../tests/fixtures/rfc-multifocus.mjs";

export const seeds=multiFocusSeeds;
export const weightProfiles={
  neutral:{node:1,edge:10},nodes:{node:9,edge:10},edges:{node:1,edge:30},
  coupled:{node:9,edge:30},saturated:{node:1e6,edge:1e6},extreme:{node:1e12,edge:1e12},
  epsilon:{node:1e-6,edge:1e-6},zero:{node:0,edge:0},transition:{node:1,edge:10},sham:{node:1,edge:10}
};
const rms=xs=>Math.sqrt(xs.reduce((s,x)=>s+x*x,0)/Math.max(1,xs.length));
export const stats=xs=>({mean:xs.reduce((s,x)=>s+x,0)/xs.length,min:Math.min(...xs),max:Math.max(...xs)});
export function randomSource(seed) {let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
const positions=graph=>[...graph.getNodes()].map(n=>({id:n.getID(),x:n.x,y:n.y,fixed:n.fixed,weight:n.getWeight()}));
const relations=graph=>[...graph.getEdges()].map(e=>({id:e.getID(),from:e.from.getID(),to:e.to.getID(),length:e.getLength(),weight:e.getWeight()}));

/** Analytic square/ring rest geometry; jitter changes starts, never targets or membership. */
export function clusterFixture(topology,seed,load="weak") {
  const graph=new FreshGraph(),random=randomSource(seed),reference=new Map(),groups=[];
  const node=(id,x,y,fixed=false)=>{
    if(graph.findNode(id))return;
    reference.set(id,{x,y});graph.addNode(new FreshNode(id,id,{position:{x:x+(fixed?0:(random()-.5)*40),y:y+(fixed?0:(random()-.5)*40)},fixed}));
  };
  if(topology==="overlapping-squares") {
    for(const [id,x,y] of [["a",-120,-60],["d",-120,60],["s0",0,-60],["s1",0,60],["b",120,-60],["c",120,60]])node(id,x,y);
    groups.push(["a","s0","s1","d"],["s0","b","c","s1"]);
  }else {
    const count=topology==="dense-squares"?4:topology==="sparse-rings"?6:0;
    if(!count)throw new Error(`Unknown cluster topology ${topology}`);
    for(const [side,cx] of [["a",-190],["b",190]]) {
      const ids=[];
      for(let i=0;i<count;i++) {
        const angle=-Math.PI*.75+i*2*Math.PI/count,radius=count===4?120/Math.sqrt(2):120;
        const id=`${side}${i}`;node(id,cx+radius*Math.cos(angle),radius*Math.sin(angle));ids.push(id);
      }groups.push(ids);
    }
  }
  const perimeter=new Set(),internal=new Set();
  const edge=(a,b,length,context=false)=>{
    const id=[a,b].sort().join(":");if([...graph.getEdges()].some(e=>e.getID()===id))return id;
    graph.addEdge(new FreshEdge(graph.findNode(a),graph.findNode(b),{id,length:Math.round(length),label:context?"context":"internal"}));return id;
  };
  for(const group of groups) {
    for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++) {
      const adjacent=j===i+1||(i===0&&j===group.length-1);
      if(topology==="sparse-rings"&&!adjacent&&!(i===0&&j===3))continue;
      const a=reference.get(group[i]),b=reference.get(group[j]);
      const id=edge(group[i],group[j],Math.hypot(a.x-b.x,a.y-b.y));internal.add(id);if(adjacent)perimeter.add(id);
    }
  }
  if(topology!=="overlapping-squares")edge(groups[0][1],groups[1][0],140,true);
  // Two pinned anchors per community create symmetric but competing outward loads.
  for(let g=0;g<2;g++)for(let side=0;side<2;side++) {
    const id=`anchor-${g}-${side}`;node(id,(g?1:-1)*480,(side?1:-1)*250,true);
    edge(groups[g][side===0?0:groups[g].length-1],id,load==="strong"?30:180,true);
  }
  const communities=groups.map((ids,index)=>({id:`community-${index}`,rootId:ids[0],nodeIds:ids,
    edgeIds:[...internal].filter(id=>{const e=[...graph.getEdges()].find(e=>e.getID()===id);return ids.includes(e.from.getID())&&ids.includes(e.to.getID());})}));
  return {graph,communities,reference,perimeter};
}

/** Convex physical enclosures are observables, independent of the browser's rounded displayed hull. */
export function hull(points) {
  const ordered=[...new Map(points.map(p=>[`${p.x},${p.y}`,p])).values()].sort((a,b)=>a.x-b.x||a.y-b.y);
  if(ordered.length<3)return ordered;
  const half=xs=>{const out=[];for(const p of xs){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
  return [...half(ordered).slice(0,-1),...half([...ordered].reverse()).slice(0,-1)];
}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export const area=polygon=>Math.abs(polygon.reduce((s,p,i)=>{const q=polygon[(i+1)%polygon.length];return s+p.x*q.y-p.y*q.x;},0))/2;
export function intersectionArea(first,second) {
  if(first.length<3||second.length<3)return 0;
  let polygon=first;
  for(let i=0;i<second.length&&polygon.length;i++) {
    const a=second[i],b=second[(i+1)%second.length],output=[];
    for(let j=0;j<polygon.length;j++) {
      const p=polygon[j],q=polygon[(j+1)%polygon.length],cp=cross(a,b,p),cq=cross(a,b,q);
      if(cp>=0)output.push(p);
      if((cp>=0)!==(cq>=0)) {const t=cp/(cp-cq);output.push({x:p.x+t*(q.x-p.x),y:p.y+t*(q.y-p.y)});}
    }polygon=output;
  }return polygon.length>2?area(polygon):0;
}
function drawingMetrics(graph) {
  const edges=[...graph.getEdges()],nodes=[...graph.getNodes()].filter(n=>!n.fixed);
  let crossings=0,nearPairs=0;
  for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++) {
    const a=edges[i],b=edges[j];if(a.from===b.from||a.from===b.to||a.to===b.from||a.to===b.to)continue;
    if(cross(a.from,a.to,b.from)*cross(a.from,a.to,b.to)<0&&cross(b.from,b.to,a.from)*cross(b.from,b.to,a.to)<0)crossings++;
  }
  let minDistance=Infinity;
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++) {
    const d=Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y);minDistance=Math.min(minDistance,d);if(d<30)nearPairs++;
  }
  return {straightCrossings:crossings,nearPairs,minDistance:Number.isFinite(minDistance)?minDistance:null};
}
function metrics(fixture,spec) {
  const {graph,communities,reference}=fixture,edges=new Map([...graph.getEdges()].map(e=>[e.getID(),e]));
  if(spec.family!=="clusters") {
    const base=multiFocusMetrics(graph),selected=[...new Set(graph.getSubstructures().flatMap(s=>s.edgeIds))].map(id=>edges.get(id));
    const weighted=selected.map(e=>({q:rfcRelationStrength(e),error:Math.hypot(e.from.x-e.to.x,e.from.y-e.to.y)-120}));
    const sum=weighted.reduce((s,v)=>s+v.q,0),priority=selected.filter(e=>["a0:a1","b0:b1"].includes(e.getID()));
    return {lengthRms:base.unionLengthRms,angleRms:base.unionAngularGapRms,lengthLowerBound:base.unionLengthLowerBound,
      perTree:base.trees,priorityLengthRms:rms(priority.map(e=>Math.hypot(e.from.x-e.to.x,e.from.y-e.to.y)-120)),
      weightedLengthRms:sum?Math.sqrt(weighted.reduce((s,v)=>s+v.q*v.error*v.error,0)/sum):null,
      eligibleEdges:weighted.filter(v=>v.q>0).length,...drawingMetrics(graph)};
  }
  const allIds=[...new Set(communities.flatMap(c=>c.edgeIds))],polygons=[],perCommunity=communities.map(c=>{
    const nodes=c.nodeIds.map(id=>graph.findNode(id)),cx=nodes.reduce((s,n)=>s+n.x,0)/nodes.length,cy=nodes.reduce((s,n)=>s+n.y,0)/nodes.length;
    const pairErrors=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++) {
      const a=reference.get(nodes[i].getID()),b=reference.get(nodes[j].getID());
      pairErrors.push(Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y)-Math.hypot(a.x-b.x,a.y-b.y));
    }
    const polygon=hull(nodes);polygons.push(polygon);
    return {id:c.id,pairDistanceRms:rms(pairErrors),extentRms:rms(nodes.map(n=>Math.hypot(n.x-cx,n.y-cy))),
      extentMax:Math.max(...nodes.map(n=>Math.hypot(n.x-cx,n.y-cy))),hullArea:area(polygon)};
  });
  const internal=new Set(allIds),boundary=[...edges.values()].filter(e=>!internal.has(e.getID()));
  return {lengthRms:rms(allIds.map(id=>{const e=edges.get(id);return Math.hypot(e.from.x-e.to.x,e.from.y-e.to.y)-e.getLength();})),
    deformationRms:rms(perCommunity.map(c=>c.pairDistanceRms)),perCommunity,
    boundaryLengthRms:rms(boundary.map(e=>Math.hypot(e.from.x-e.to.x,e.from.y-e.to.y)-e.getLength())),
    overlapArea:intersectionArea(polygons[0],polygons[1]),...drawingMetrics(graph)};
}
function setWeights(graph,profile) {
  for(const id of ["a1","b1"])graph.findNode(id).setWeight(profile.node);
  for(const e of graph.getEdges())if(["a0:a1","b0:b1"].includes(e.getID()))e.setWeight(profile.edge);
}

/** Matched physical starts, explicit initial rigidity, and a separate seeded coincidence RNG. */
export function comparisonFixture(spec) {
  let fixture;
  if(spec.family==="clusters")fixture=clusterFixture(spec.topology,spec.seed,spec.load);
  else {
    const old=multiFocusFixture(spec.topology,{seed:spec.seed,fixedRoots:spec.fixedRoots??false});old.rfc.destroy();old.layout.stop();
    fixture={graph:old.graph};if(spec.family==="weights")setWeights(fixture.graph,weightProfiles[spec.profile]);
  }
  const {graph}=fixture,empty=new FreshGraph();let ready=false,onBatch=()=>{},time=0;
  const host={getGES:()=>ready?graph:empty,getCompleteEltSet:()=>graph,resetDamper:()=>layout.resetDamper(),repaintAfterMove:()=>onBatch()};
  const layout=new TGLayout(host,randomSource(spec.seed^0x00c0ffee));
  // TG queues rigidity until a batch ends. Prime against an empty graph so the
  // first measured integration already has the requested rigidity, without warming the layout.
  layout.setRigidity(spec.rigidity??1);layout.tick();ready=true;
  const rfc=new RfcController(host,rfcForcePresets.tree,{enabled:spec.damping??false,now:()=>time});
  layout.addForce(()=>{time+=2;});layout.addForce(rfc.apply);
  if(spec.family==="clusters") {
    for(const c of fixture.communities)graph.setSubstructure(spec.mode==="tree"?
      spanningTree(graph,c.nodeIds,c.rootId,c.id,c.id,fixture.perimeter):clusterStructure(graph,c.nodeIds,c.rootId,c.id));
    rfc.configureClusters({rigidity:spec.clusterRigidity??1});
  }
  if(spec.mode!=="baseline")for(const [i,s] of graph.getSubstructures().entries())rfc.activateSubstructure(s.id,i>0);
  layout.resetDamper();
  return {...fixture,layout,rfc,onBatch:callback=>{onBatch=callback;},metrics:()=>metrics(fixture,spec)};
}

/** Observes every integration; post-run zero-damper probing measures force, never changes the recorded layout. */
export function runComparison(spec,{batches=400,traceEvery=10,transitionBatches=[100,200]}={}) {
  const f=comparisonFixture(spec),{graph,layout,rfc}=f,nodes=[...graph.getNodes()],movable=nodes.filter(n=>!n.fixed);
  const initialNodes=positions(graph),initialEdges=relations(graph),initial=f.metrics(),trace=[],events=[],transitions=[];
  let calls=0,steps=0,largeSteps=0,clippedSteps=0,previous=movable.map(n=>[n.x,n.y]),previousVelocity=[],probing=false;
  let batchSquares=0,batchMax=0,batchLarge=0,batchClipped=0,batchReversals=0,batchEligible=0,pending=null;
  let previousDetections=0,previousBackoffs=0,previousPhase="steady",forceRms=null;
  const tail=[],sample=()=>{
    if(probing)return;
    const velocities=movable.map((n,i)=>[n.x-previous[i][0],n.y-previous[i][1]]),distances=velocities.map(v=>Math.hypot(...v));
    const squares=distances.reduce((s,x)=>s+x*x,0),maximum=Math.max(...distances),large=maximum>29.9;
    const clipped=velocities.some(v=>v.some(x=>Math.abs(x)>=30-1e-9));
    let eligible=0,reversals=0;
    for(let i=0;i<velocities.length;i++)if(previousVelocity[i]&&distances[i]>.05&&Math.hypot(...previousVelocity[i])>.05) {
      eligible++;if(velocities[i][0]*previousVelocity[i][0]+velocities[i][1]*previousVelocity[i][1]<0)reversals++;
    }
    previous=movable.map(n=>[n.x,n.y]);previousVelocity=velocities;steps++;
    if(large)largeSteps++;if(clipped)clippedSteps++;
    batchSquares+=squares;batchMax=Math.max(batchMax,maximum);if(large)batchLarge++;if(clipped)batchClipped++;
    batchReversals+=reversals;batchEligible+=eligible;
    tail.push({squares,maximum,eligible,reversals});if(tail.length>100)tail.shift();
  };
  layout.addForce(()=>{
    if(probing) {if(forceRms===null)forceRms=rms(movable.map(n=>Math.hypot(n.dx,n.dy)))/layout.getState().rigidity;return;}
    if(calls++%10!==0)sample();
    pending={damper:layout.getState().damper};
  });f.onBatch(sample);
  try {
    for(let batch=1;batch<=batches;batch++) {
      if(spec.family==="weights"&&["transition","sham"].includes(spec.profile)&&transitionBatches.includes(batch-1)) {
        const profile=spec.profile==="sham"?weightProfiles.neutral:batch-1===transitionBatches[0]?weightProfiles.zero:weightProfiles.epsilon;
        const before={metrics:f.metrics(),centers:rfc.getState().centers};setWeights(graph,profile);layout.resetDamper();
        transitions.push({afterBatch:batch-1,step:steps,timeMs:steps*2,weights:profile,before,after:{metrics:f.metrics(),centers:rfc.getState().centers}});
      }
      layout.tick();
      if(!nodes.every(n=>[n.x,n.y,n.dx,n.dy].every(Number.isFinite)))throw new Error(`Nonfinite state at batch ${batch}`);
      const state=rfc.getState().stabilization;
      if(state.detections!==previousDetections||state.phase!==previousPhase||state.recoveryBackoffs!==previousBackoffs) {
        events.push({batch,timeMs:batch*20,...state});previousDetections=state.detections;previousPhase=state.phase;previousBackoffs=state.recoveryBackoffs;
      }
      if(batch===1||batch%traceEvery===0||batch===batches||transitionBatches.includes(batch))trace.push({batch,timeMs:batch*20,
        maxDisplacement:batchMax,rmsDisplacement:Math.sqrt(batchSquares/(10*movable.length)),largeSteps:batchLarge,clippedSteps:batchClipped,
        cumulativeLargeSteps:largeSteps,cumulativeClippedSteps:clippedSteps,reversals:batchReversals,eligibleReversals:batchEligible,
        gain:state.gain,damper:pending.damper,...f.metrics()});
      batchSquares=batchMax=batchLarge=batchClipped=batchReversals=batchEligible=0;
    }
    const finalNodes=positions(graph),final=f.metrics(),stabilization=rfc.getState().stabilization,activeCenters=rfc.getState().centers;
    // Disable local attenuation and global motion, clear retained momentum, then
    // observe one force evaluation of the existing TG+RFC callbacks at the final coordinates.
    // All configured forces scale linearly with global rigidity, so divide it out.
    probing=true;rfc.setStabilizationEnabled(false);layout.stopMotion();layout.stopMotion();
    for(const n of nodes)n.dx=n.dy=0;
    layout.tick();if(JSON.stringify(positions(graph))!==JSON.stringify(finalNodes))throw new Error("Force probe moved the layout");
    const eligible=tail.reduce((s,x)=>s+x.eligible,0);
    return {...spec,status:"ok",batches,sampledSteps:steps,initialNodes,nodes:finalNodes,initialEdges,edges:relations(graph),
      structures:graph.getSubstructures(),communities:f.communities??null,reference:f.reference?Object.fromEntries(f.reference):null,
      settings:rfc.getState().settings,clusterSettings:rfc.getState().clusterSettings,activeCenters,initial,final,
      unitRigidityForceRms:forceRms,largeSteps,clippedSteps,tailSteps:tail.length,
      tailStepRms:Math.sqrt(tail.reduce((s,x)=>s+x.squares,0)/(tail.length*movable.length)),tailStepMax:Math.max(...tail.map(x=>x.maximum)),
      tailReversalFraction:eligible?tail.reduce((s,x)=>s+x.reversals,0)/eligible:null,
      stabilization,trace,events,transitions};
  } finally {rfc.destroy();layout.stop();}
}

/** Factorial conditions are declared before outcomes, including all seeds and failures. */
export function comparisonSpecs(family,selectedSeeds=seeds) {
  const specs=[];
  if(family==="damping")for(const topology of ["joined-trees","leaf-connected-trees","shared-subtree"])
    for(const fixedRoots of [false,true])for(const seed of selectedSeeds)for(const rigidity of [1,.5,.25,.1])for(const damping of [false,true])
      specs.push({family,topology,fixedRoots,seed,rigidity,damping,mode:"both"});
  else if(family==="weights")for(const topology of ["joined-trees","leaf-connected-trees"])for(const seed of selectedSeeds)
    for(const profile of Object.keys(weightProfiles))for(const mode of ["baseline","both","damped"])
      specs.push({family,topology,seed,profile,mode,damping:mode==="damped",rigidity:1,fixedRoots:false});
  else if(family==="clusters")for(const topology of ["dense-squares","overlapping-squares","sparse-rings"])
    for(const seed of selectedSeeds)for(const load of ["weak","strong"])for(const condition of [
      {mode:"baseline"},{mode:"tree"},...[0,.25,1,2].map(clusterRigidity=>({mode:"cluster",clusterRigidity})),
      {mode:"cluster",clusterRigidity:1,damping:true},{mode:"cluster",clusterRigidity:2,damping:true}])
      specs.push({family,topology,seed,load,rigidity:1,damping:false,...condition});
  else throw new Error(`Unknown comparison ${family}`);
  return specs;
}
