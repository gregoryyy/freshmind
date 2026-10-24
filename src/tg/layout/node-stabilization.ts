/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 Gregor Heinrich.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import type {Node} from "../model/index.js";
import {MotionStabilizer} from "./stabilization.js";
import type {MotionStabilizationOptions,MotionStabilizationState} from "./stabilization.js";

interface Entry {detector:MotionStabilizer;state:MotionStabilizationState;}

/** Independent gains/recovery: an oscillating node cannot throttle a drifting neighbor. */
export class NodeMotionStabilizer extends MotionStabilizer {
  private readonly nodes=new Map<Node,Entry>();
  private readonly clock:()=>number;
  private readonly options:MotionStabilizationOptions;
  private time=0;
  private summary:MotionStabilizationState;
  constructor(options:MotionStabilizationOptions={}){
    super(options);this.options={...options};this.clock=options.now??(()=>performance.now());this.summary=super.getState();
  }
  override getState():MotionStabilizationState{return {...this.summary,detectedNodeIds:[...this.summary.detectedNodeIds]};}
  override reset():void {super.reset();this.nodes.clear();this.summary=super.getState();}
  override forgetMotion():void {
    super.forgetMotion();
    for(const entry of this.nodes.values()){entry.detector.forgetMotion();entry.state=entry.detector.getState();}
    if(this.summary.gain<1)this.summary.phase="damping";
  }
  override apply(nodes:readonly Node[],dragged:Node|null=null):void {
    this.observe(nodes,dragged);
    if(!this.summary.enabled)return;
    for(const [node,entry] of this.nodes){node.dx*=entry.state.gain;node.dy*=entry.state.gain;}
  }
  override observe(nodes:readonly Node[],dragged:Node|null=null):void {
    if(!this.summary.enabled)return;
    this.time=this.clock();
    const movable=new Set(nodes.filter(node=>!node.fixed&&node!==dragged));
    for(const node of this.nodes.keys())if(!movable.has(node))this.nodes.delete(node);
    let gain=1,maximum=0,backoffs=0,damping=false,recovering=false;
    const detected:string[]=[];let trigger:MotionStabilizationState["lastTrigger"]=null;
    for(const node of movable){
      let entry=this.nodes.get(node);
      if(!entry){
        const detector=new MotionStabilizer({...this.options,enabled:true,now:()=>this.time});
        entry={detector,state:detector.getState()};this.nodes.set(node,entry);
      }
      entry.detector.observe([node]);const state=entry.detector.getState();
      if(state.detections>entry.state.detections){
        detected.push(...state.detectedNodeIds);
        if(trigger===null||state.lastTrigger==="reversal")trigger=state.lastTrigger;
      }
      backoffs+=state.recoveryBackoffs-entry.state.recoveryBackoffs;entry.state=state;
      gain=Math.min(gain,state.gain);maximum=Math.max(maximum,state.maxStepDisplacement);
      damping||=state.phase==="damping";recovering||=state.phase==="recovering";
    }
    this.summary={...this.summary,gain,maxStepDisplacement:maximum,
      phase:damping?"damping":recovering?"recovering":"steady",recoveryBackoffs:this.summary.recoveryBackoffs+backoffs,
      ...(detected.length?{detections:this.summary.detections+1,lastTrigger:trigger,detectedNodeIds:detected.sort()}:{})};
  }
}
