/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {TGLayout,VisibleLocality,HyperLens} from "fm4/core";
import {FreshGraph,RfcController,projectRfcStructure,rfcForcePresets} from "fm4/fm/core";
import {StructuralViewController,validateStructuralView,structuralViewDefaults} from "fm4/fm/struct-view";
import {structuralExample} from "../structural-view-example.mjs";
import {randomSource,seeds} from "./rfc-comparison.mjs";

export const hybridFoci=["star","stored-tree"];
export const hybridViews={
  full:{},
  aggregate:{aggregateTypes:["person","paper"]},
  "filter-person":{hiddenNodeTypes:["person"]},
  "filter-authored":{hiddenRelationTypes:["authored"]}
};
const focusId="project-a",rms=values=>values.length?Math.sqrt(values.reduce((s,x)=>s+x*x,0)/values.length):null;
const positions=graph=>[...graph.getNodes()].map(n=>({id:n.getID(),label:n.getLabel(),type:n.getSemanticType(),x:n.x,y:n.y,fixed:n.fixed}));
const edges=graph=>[...graph.getEdges()].map(e=>({id:e.getID(),from:e.from.getID(),to:e.to.getID(),type:e.getSemanticType(),length:e.getLength()}));

/** Reuse the documented synthetic input. Seeded jitter changes only physical starts. */
export function hybridDocument(seed=seeds[0]) {
  const doc=structuralExample(),random=randomSource(seed);
  for(const n of doc.graph.getNodes()){n.x+=(random()-.5)*40;n.y+=(random()-.5)*40;}
  doc.title="Matched hybrid comparison (synthetic)";
  doc.view.lenses.hyperbolic=0;
  return doc;
}

/** Declared factorial: 2 focal structures × 4 views × TG/RFC × lens off/on × 5 starts. */
export function hybridSpecs(selectedSeeds=seeds) {
  return hybridFoci.flatMap(focus=>Object.keys(hybridViews).flatMap(view=>selectedSeeds.flatMap(seed=>
    [false,true].flatMap(reinforcement=>[0,60].map(lens=>({focus,view,seed,reinforcement,lens,rigidity:.1}))))));
}

/** Same production structural/RFC controllers; TG controls omit only the added RFC force.
 * Both controls retain the same nominated focal detail, avoiding a protection/force confound.
 */
export function hybridFixture(spec) {
  if(!hybridFoci.includes(spec.focus)||!Object.hasOwn(hybridViews,spec.view))throw new Error("Unknown hybrid condition");
  const doc=hybridDocument(spec.seed),graph=doc.graph,source=new VisibleLocality(graph),empty=new FreshGraph();source.addAll();
  const root=graph.findNode(focusId),definition=spec.focus==="stored-tree"?graph.getSubstructure("a-detail"):null;
  const settings={...rfcForcePresets.tree,coordinateWeights:{x:1,y:1}};
  const nominal=projectRfcStructure(graph,source,root,definition,settings.coordinateWeights);
  let ready=false,onBatch=()=>{},view;
  const host={getGES:()=>ready?view.getLocality():empty,getCompleteEltSet:()=>graph,
    resetDamper:()=>layout.resetDamper(),repaintAfterMove:()=>onBatch()};
  const layout=new TGLayout(host,randomSource(spec.seed^0x00c0ffee));
  layout.setRigidity(spec.rigidity);layout.tick(); // Prime queued rigidity on an empty graph.
  view=new StructuralViewController({getSource:()=>source,getComplete:()=>graph,
    getContext:()=>({centers:[focusId],protectedIds:new Set(nominal.nodes.map(n=>n.getID()))}),
    changed:()=>{view.refresh();layout.resetDamper();}});
  view.configure(validateStructuralView({...structuralViewDefaults,enabled:spec.view!=="full",...hybridViews[spec.view]}));
  view.refresh();ready=true;
  const rfc=new RfcController(host,settings,{enabled:false});
  if(definition)rfc.activateSubstructure(definition.id);else rfc.setFocus(root);
  if(spec.reinforcement)layout.addForce(rfc.apply);
  const projection=projectRfcStructure(graph,view.getLocality(),root,definition,settings.coordinateWeights);
  const stars=p=>p.stars.filter(s=>s.branches.length>=2).map(s=>({center:s.center.getID(),branches:s.branches.map(b=>b.node.getID()).sort()}));
  const inventory={...view.getState(),nominalMemberIds:nominal.nodes.map(n=>n.getID()),nominalRadialIds:nominal.edges.map(e=>e.getID()),
    retainedMemberIds:projection.nodes.map(n=>n.getID()),retainedRadialIds:projection.edges.map(e=>e.getID()),
    nominalStars:stars(nominal),retainedStars:stars(projection)};
  layout.resetDamper();
  return {doc,graph,source,view,rfc,layout,inventory,settings,onBatch:fn=>{onBatch=fn;},
    destroy:()=>{rfc.destroy();view.destroy();layout.stop();}};
}

const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
/** Point/straight-segment proxies, explicitly separate from body or routed-label readability. */
export function pointMetrics(points,relations) {
  const nodes=[...points.values()];let closePairs=0,minDistance=Infinity,crossings=0,crossingCandidates=0;
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++) {
    const d=Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y);minDistance=Math.min(minDistance,d);if(d<30)closePairs++;
  }
  for(let i=0;i<relations.length;i++)for(let j=i+1;j<relations.length;j++) {
    const a=relations[i],b=relations[j];if([a.from,a.to].some(id=>id===b.from||id===b.to))continue;
    crossingCandidates++;
    const [p,q,r,s]=[a.from,a.to,b.from,b.to].map(id=>points.get(id));
    if(cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0)crossings++;
  }
  const pairCount=nodes.length*(nodes.length-1)/2;
  return {nodeCount:nodes.length,edgeCount:relations.length,pairCount,closePairs,closePairFraction:pairCount?closePairs/pairCount:null,
    minDistance:Number.isFinite(minDistance)?minDistance:null,crossingCandidates,straightCrossings:crossings,
    crossingFraction:crossingCandidates?crossings/crossingCandidates:null};
}

/** The same retained radial IDs and branch sets can be scored on either full or reduced coordinates. */
export function hybridMetrics(nodes,relations,inventory,lens=0) {
  const all=new Map(nodes.map(n=>[n.id,n])),selected=new Set(inventory.retainedRadialIds);
  const visible=new Set(inventory.nodeIds),visibleEdges=relations.filter(e=>inventory.edgeIds.includes(e.id));
  const radial=relations.filter(e=>selected.has(e.id)).map(e=>{
    const a=all.get(e.from),b=all.get(e.to);return Math.hypot(a.x-b.x,a.y-b.y)-120;
  });
  const angular=inventory.retainedStars.flatMap(star=>{
    const center=all.get(star.center),angles=star.branches.map(id=>{const n=all.get(id);return Math.atan2(n.y-center.y,n.x-center.x);}).sort((a,b)=>a-b);
    return angles.map((a,i)=>angles[(i+1)%angles.length]+(i===angles.length-1?2*Math.PI:0)-a-2*Math.PI/angles.length);
  });
  const physical=new Map(nodes.filter(n=>visible.has(n.id)).map(n=>[n.id,{x:n.x,y:n.y}])),hyper=new HyperLens(lens),center=all.get(focusId);
  const displayed=new Map([...physical].map(([id,n])=>{const p={x:n.x-center.x,y:n.y-center.y};hyper.applyLens(p);return [id,p];}));
  return {radialCount:radial.length,radialRms:rms(radial),angularGapCount:angular.length,angularRms:rms(angular),
    physical:pointMetrics(physical,visibleEdges),displayed:pointMetrics(displayed,visibleEdges),
    displayNodes:[...displayed].map(([id,p])=>({id,...p}))};
}

/** Every integration is observed; the zero-motion force probe cannot change the recorded coordinates. */
export function runHybrid(spec,{batches=400,traceEvery=10}={}) {
  const f=hybridFixture(spec),{graph,layout,inventory}=f,all=[...graph.getNodes()],visible=[...f.view.getLocality().getNodes()];
  const initialNodes=positions(graph),relations=edges(graph),hidden=all.filter(n=>!f.view.getLocality().contains(n));
  const initial=hybridMetrics(initialNodes,relations,inventory,spec.lens),trace=[],tail=[];
  let previous=visible.map(n=>[n.x,n.y]),calls=0,steps=0,largeSteps=0,clippedSteps=0,batchSquares=0,batchMax=0;
  let probing=false,forceRms=null;
  const sample=()=>{
    const velocities=visible.map((n,i)=>[n.x-previous[i][0],n.y-previous[i][1]]),distances=velocities.map(v=>Math.hypot(...v));
    previous=visible.map(n=>[n.x,n.y]);steps++;
    const maximum=Math.max(...distances),squares=distances.reduce((s,x)=>s+x*x,0);
    if(maximum>29.9)largeSteps++;if(velocities.some(v=>v.some(x=>Math.abs(x)>=30-1e-9)))clippedSteps++;
    batchSquares+=squares;batchMax=Math.max(batchMax,maximum);tail.push({squares,maximum});if(tail.length>100)tail.shift();
  };
  layout.addForce(()=>{
    if(probing){if(forceRms===null)forceRms=rms(visible.map(n=>Math.hypot(n.dx,n.dy)))/spec.rigidity;return;}
    if(calls++%10!==0)sample();
  });
  f.onBatch(()=>{if(!probing)sample();});
  try {
    for(let batch=1;batch<=batches;batch++) {
      layout.tick();
      if(!all.every(n=>[n.x,n.y,n.dx,n.dy].every(Number.isFinite)))throw new Error(`Nonfinite hybrid state at batch ${batch}`);
      if(batch===1||batch%traceEvery===0||batch===batches)trace.push({batch,rmsDisplacement:Math.sqrt(batchSquares/(10*visible.length)),
        maxDisplacement:batchMax,damper:layout.getState().damper,radialRms:hybridMetrics(positions(graph),relations,inventory).radialRms});
      batchSquares=batchMax=0;
    }
    const nodes=positions(graph),final=hybridMetrics(nodes,relations,inventory,spec.lens);
    const frozenHidden=hidden.every(n=>{const before=initialNodes.find(p=>p.id===n.getID());return before.x===n.x&&before.y===n.y&&n.dx===0&&n.dy===0;});
    if(!frozenHidden)throw new Error("A hidden node was integrated");
    probing=true;layout.stopMotion();layout.stopMotion();for(const n of all)n.dx=n.dy=0;layout.tick();
    if(JSON.stringify(positions(graph))!==JSON.stringify(nodes))throw new Error("Force probe moved the hybrid layout");
    return {...spec,status:"ok",batches,sampledSteps:steps,initialNodes,nodes,edges:relations,structures:graph.getSubstructures(),
      settings:f.settings,inventory,initial,final,largeSteps,clippedSteps,tailSteps:tail.length,
      tailStepRms:Math.sqrt(tail.reduce((s,t)=>s+t.squares,0)/(tail.length*visible.length)),
      tailStepMax:Math.max(...tail.map(t=>t.maximum)),unitRigidityForceRms:forceRms,frozenHidden,trace};
  }finally{f.destroy();}
}

/** Pair each reduced view with its full-graph control, using identical retained constraints and points. */
export function matchHybrid(results) {
  const key=r=>JSON.stringify([r.focus,r.seed,r.reinforcement,r.lens]);
  const full=new Map(results.filter(r=>r.status==="ok"&&r.view==="full").map(r=>[key(r),r]));
  for(const r of results)if(r.status==="ok") {
    const baseline=full.get(key(r));
    // Preserve all failure records even if a failed full control prevents pairing.
    r.matched=baseline?{full:hybridMetrics(baseline.nodes,baseline.edges,r.inventory,r.lens),view:r.final}:null;
  }
  return results;
}
