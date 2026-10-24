/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich. */
/** A prescribed focal swing isolates damping cross-talk from the force generator.
 * Real RFC exclusion drives the context node toward the known radius-120 boundary.
 * No production force or graph data is changed by this synthetic test fixture. */
export function installContextClearingProbe(panel,{rfc=true,legacyCooling=true,onStep=()=>{}}={}){
  panel.tgLayout.stop();panel.clearAll();
  const root=panel.addNode('root'),anchor=panel.addNode('anchor'),oscillator=panel.addNode('oscillator'),context=panel.addNode('context');
  for(const node of [root,anchor,oscillator,context]){node.x=node.y=0;node.repulsion=0;}
  root.setLabel('Focus');anchor.setLabel('Fixed branch');oscillator.setLabel('Swinging branch');context.setLabel('Context label');
  anchor.y=100;oscillator.y=-50;context.x=20;root.fixed=anchor.fixed=true;
  if(rfc){
    panel.addEdge(root,anchor,100);panel.addEdge(root,oscillator,40);
    panel.getRfc().setFocus(root);panel.getRfc().configure({radialStiffness:0,angularStiffness:0,springMultiplier:1});
    panel.getRfc().configureExclusion({enabled:true,strength:.01,padding:20});
  }else panel.getRfc().setFocus(null);
  let steps=0,pending=false,imposedY=0,lastContextX=context.x,minimumContextStep=Infinity,lateOscillatorStepMax=0;
  const trace=[];
  const sample=()=>{
    if(!pending)return;pending=false;
    minimumContextStep=Math.min(minimumContextStep,context.x-lastContextX);lastContextX=context.x;
    const response=Math.abs(oscillator.y-imposedY);
    if(steps>900)lateOscillatorStepMax=Math.max(lateOscillatorStepMax,response);
    if(steps%10===0)trace.push({step:steps,contextX:context.x,oscillatorStep:response,gain:panel.tgLayout.getAdaptiveDampingState().gain,damper:panel.tgLayout.getState().damper});
  };
  const remove=panel.tgLayout.addForce(()=>{
    sample();onStep();imposedY=-50+(steps++%2?4:0);oscillator.x=0;oscillator.y=imposedY;oscillator.dx=0;oscillator.dy=4;
    if(!rfc){context.dx=1;context.dy=0;}pending=true;
  });
  if(legacyCooling)panel.tgLayout.resetDamper();else panel.tgLayout.stopDamper();
  return {root,anchor,oscillator,context,
    tick(batches=100){for(let i=0;i<batches;i++){panel.tgLayout.tick();sample();}},
    result:()=>({steps,contextX:context.x,clearance:rfc?context.x-120:null,minimumContextStep,lateOscillatorStepMax,
      damping:panel.tgLayout.getAdaptiveDampingState(),layout:panel.tgLayout.getState(),trace}),
    dispose:remove};
}
