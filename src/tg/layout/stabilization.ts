/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import type { Node } from "../model/index.js";

export interface MotionStabilizationOptions {
  /** Optional local impulse damping; disabled by default for compatibility. */
  enabled?: boolean;
  /** Monotonic milliseconds; injectable for repeatable headless simulations. */
  now?: () => number;
  /** Also detect completed slow swings; false retains the earlier RFC-local sampling rule. */
  detectSlowSwings?:boolean;
}
export interface MotionStabilizationState {
  enabled: boolean;
  phase: "steady" | "damping" | "recovering";
  /** Impulse-response multiplier (minimum for node-local diagnostics); observation alone never applies it. */
  gain: number;
  detections: number;
  maxStepDisplacement: number;
  /** Last confirmed per-node trigger; unrelated centers cannot outvote these members. */
  lastTrigger:"reversal"|"circulation"|null;
  detectedNodeIds:string[];
  recoveryBackoffs:number;
}
interface Motion {dx:number;dy:number;length:number;}
interface Position {x:number;y:number;}
interface Swing {direction:number;extreme:Position;turns:Position[];}
interface Sample extends Position {dx:number;dy:number;history:Motion[];reversals:boolean[];swings:[Swing,Swing];}
const circulationWindows=[8,16,32];
const newSwing=(position:Position):Swing=>({direction:0,extreme:position,turns:[]});

/** Track completed excursions, independent of how many integration steps a swing takes. */
function completedSwing(swing:Swing,position:Position,axis:"x"|"y"):boolean {
  const delta=position[axis]-swing.extreme[axis];
  // Require a meaningful return from an extremum, rather than counting zero-speed
  // samples or subpixel direction noise near a turning point as extra reversals.
  if(swing.direction===0) {
    if(Math.abs(delta)>.2){swing.direction=Math.sign(delta);swing.extreme=position;}
    return false;
  }
  if(delta*swing.direction>=0){swing.extreme=position;return false;}
  if(delta*swing.direction>=-.2)return false;
  swing.turns.push(swing.extreme);if(swing.turns.length>4)swing.turns.shift();
  swing.direction=-swing.direction;swing.extreme=position;
  if(swing.turns.length<4)return false;
  const turns=swing.turns,amplitudes=turns.slice(1).map((p,i)=>Math.abs(p[axis]-turns[i][axis]));
  const travel=turns.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-turns[i].x,p.y-turns[i].y),0);
  const net=Math.hypot(turns[3].x-turns[0].x,turns[3].y-turns[0].y);
  return amplitudes[1]>=amplitudes[0]*.8&&amplitudes[2]>=amplitudes[1]*.8&&net<travel*.35;
}

/**
 * Detects repeated, persistent reversals of actual per-step node movement.
 * A local impulse damper preserves the force balance, unlike weakening only particular springs.
 * No timers run: recovery advances only while integration steps are being observed.
 */
export class MotionStabilizer {
  private enabled: boolean;
  private readonly now: () => number;
  private readonly detectSlowSwings:boolean;
  private readonly samples = new Map<Node, Sample>();
  private lastTime: number | null = null;
  private quietMs = 0;
  private recoveryMs = 0;
  private recoveryStart = 1;
  private state: MotionStabilizationState;

  constructor(options: MotionStabilizationOptions = {}) {
    if (options.enabled !== undefined && typeof options.enabled !== "boolean") throw new TypeError("adaptiveDamping.enabled must be boolean");
    if (options.now !== undefined && typeof options.now !== "function") throw new TypeError("adaptiveDamping.now must be a function");
    if(options.detectSlowSwings!==undefined&&typeof options.detectSlowSwings!=="boolean")throw new TypeError("adaptiveDamping.detectSlowSwings must be boolean");
    this.enabled = options.enabled ?? false;
    this.detectSlowSwings=options.detectSlowSwings??true;
    this.now = options.now ?? (() => performance.now());
    this.state = this.initialState();
  }
  private initialState(): MotionStabilizationState {
    return {enabled:this.enabled, phase:"steady", gain:1, detections:0, maxStepDisplacement:0,lastTrigger:null,detectedNodeIds:[],recoveryBackoffs:0};
  }
  /** Detached diagnostic snapshot; configured force strengths are never changed by stabilization. */
  getState(): MotionStabilizationState { return {...this.state,detectedNodeIds:[...this.state.detectedNodeIds]}; }
  /** Toggles the experiment and discards its learned motion history and damping. */
  setEnabled(enabled: boolean): void {
    if (typeof enabled !== "boolean") throw new TypeError("adaptiveDamping.enabled must be boolean");
    if (enabled === this.enabled) return;
    this.enabled = enabled; this.reset();
  }
  /** Clears history on graph replacement or destruction. */
  reset(): void {
    this.state = this.initialState(); this.forgetMotion();
  }
  /** Starts a fresh observation window without abruptly removing an existing local damper. */
  forgetMotion(): void {
    this.samples.clear(); this.lastTime = null;
    this.quietMs = this.recoveryMs = 0;
    if (this.state.gain < 1) this.state.phase = "damping";
  }
  /**
   * Called after force accumulation, before TG integrates. Measures positions from
   * the previous step, then attenuates dx/dy only for movable members.
   * The dragged member is excluded; other centers continue being monitored. Long gaps
   * discard history so pauses do not count as quiet simulation time.
   */
  apply(nodes: readonly Node[], dragged: Node | null = null): void {
    this.observe(nodes,dragged);
    if(this.enabled&&this.state.gain<1)for(const node of nodes)if(!node.fixed&&node!==dragged) {
      node.dx*=this.state.gain;node.dy*=this.state.gain;
    }
  }
  /** Updates detection/recovery diagnostics without modifying accumulated impulses. */
  observe(nodes:readonly Node[],dragged:Node|null=null):void {
    if (!this.enabled) return;
    const movable = nodes.filter(node => !node.fixed && node !== dragged);
    if(!movable.length){this.forgetMotion();this.state.maxStepDisplacement=0;return;}
    const time = this.now(), elapsed = this.lastTime === null ? 0 : time - this.lastTime;
    const discontinuity = !Number.isFinite(time) || elapsed < 0 || elapsed > 250;
    const changed = movable.length !== this.samples.size || movable.some(node => !this.samples.has(node));
    if (discontinuity || changed) this.forgetMotion();
    const dt = this.lastTime === null ? 0 : Math.min(50, elapsed);
    this.lastTime = Number.isFinite(time) ? time : null;
    let maximum = 0,triggerMaximum=0,maxImpulse=0;
    const detected:string[]=[];let trigger:MotionStabilizationState["lastTrigger"]=null;
    for (const node of movable) {
      const previous = this.samples.get(node);
      const dx = previous ? node.x - previous.x : 0, dy = previous ? node.y - previous.y : 0;
      const distance = Math.hypot(dx, dy), priorDistance = previous ? Math.hypot(previous.dx, previous.dy) : 0;
      maximum = Math.max(maximum, distance);maxImpulse=Math.max(maxImpulse,Math.hypot(node.dx,node.dy));
      const position={x:node.x,y:node.y};
      const history=previous?.history??[],reversals=previous?.reversals??[];
      const swings=previous?.swings??[newSwing(position),newSwing(position)];
      if(previous) {
        history.push({dx,dy,length:distance});if(history.length>32)history.shift();
        reversals.push(distance>.1&&priorDistance>.1&&distance>=priorDistance*.8&&dx*previous.dx+dy*previous.dy<-.1*distance*priorDistance);
        if(reversals.length>8)reversals.shift();
      }
      // Slow oscillations can have many quiet-looking steps between reversals;
      // do not require three turns to fit into the fast eight-step window.
      const xSwing=this.detectSlowSwings&&completedSwing(swings[0],position,"x"),ySwing=this.detectSlowSwings&&completedSwing(swings[1],position,"y");
      const reversing=reversals.filter(Boolean).length>=3||xSwing||ySwing;
      const circulating=circulationWindows.some(count=>{
        if(history.length<count)return false;const window=history.slice(-count),half=count/2;
        const first=window.slice(0,half).reduce((s,m)=>s+m.length,0),last=window.slice(half).reduce((s,m)=>s+m.length,0);
        const travel=first+last,net=Math.hypot(window.reduce((s,m)=>s+m.dx,0),window.reduce((s,m)=>s+m.dy,0));
        return first/half>.1&&last/half>.1&&last>=first*.8&&net<travel*.35;
      });
      if(reversing||circulating) {
        detected.push(node.getID()??"(anonymous)");triggerMaximum=Math.max(triggerMaximum,distance);
        if(reversing||trigger===null)trigger=reversing?"reversal":"circulation";
      }
      this.samples.set(node, {...position,dx,dy,history,reversals,swings});
    }
    this.state.maxStepDisplacement = maximum;
    if (detected.length) {
      // Clipped large swings can hide enormous accumulated impulses. Bound the next
      // requested step as well as halving gain; a fixed 1/256 floor can be too weak.
      this.state.gain = Math.max(1e-8,Math.min(this.state.gain*.5,triggerMaximum>=10&&maxImpulse>0?2/maxImpulse:1));
      this.state.phase = "damping"; this.state.detections++;
      this.state.lastTrigger=trigger;this.state.detectedNodeIds=detected.sort();
      this.quietMs = this.recoveryMs = 0;
      for(const sample of this.samples.values()) {
        sample.history=[];sample.reversals=[];
        const position={x:sample.x,y:sample.y};sample.swings=[newSwing(position),newSwing(position)];
      }
    } else if (this.state.gain < 1) {
      if (maximum > .1) {
        if(this.state.phase==="recovering") {
          this.state.gain=Math.min(this.state.gain,this.recoveryStart);this.state.recoveryBackoffs++;
        }
        this.quietMs = this.recoveryMs = 0; this.state.phase = "damping";
      } else if (this.state.phase === "damping") {
        this.quietMs += dt;
        if (this.quietMs >= 500) {
          this.state.phase = "recovering"; this.recoveryStart = this.state.gain; this.recoveryMs = 0;
        }
      } else {
        this.recoveryMs = Math.min(3000, this.recoveryMs + dt);
        const t = this.recoveryMs / 3000, smooth = t * t * (3 - 2 * t);
        this.state.gain = this.recoveryStart + (1 - this.recoveryStart) * smooth;
        if (t === 1) this.state.phase = "steady";
      }
    }
  }
}
