/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode } from "../model/index.js";
import type { FreshmindPanel } from "../browser/index.js";
import type { RfcSettings,RfcExclusionSettings } from "../rfc/index.js";
import {rfcForcePresets} from "../rfc/index.js";

export interface RfcControlElements {
  activate: HTMLButtonElement;
  clear: HTMLButtonElement;
  springMultiplier: HTMLInputElement;
  angularStiffness: HTMLInputElement;
  radialStiffness?: HTMLInputElement;
  radialLength?: HTMLInputElement;
  clusterRigidity?: HTMLInputElement;
  treePreset?: HTMLButtonElement;
  attractionPreset?: HTMLButtonElement;
  adaptiveDamping?: HTMLInputElement;
  addCenter?:HTMLButtonElement;
  centers?:HTMLSelectElement;
  removeCenter?:HTMLButtonElement;
  xWeight?: HTMLInputElement;
  yWeight?: HTMLInputElement;
  status: HTMLElement;
  indicator?: HTMLElement;
  stabilizationStatus?:HTMLElement;
  excludeContext?:HTMLInputElement;
  excludeOverlap?:HTMLInputElement;
  exclusionStrength?:HTMLInputElement;
  exclusionPadding?:HTMLInputElement;
}

/** Binds application-owned controls to transient reinforcement; dispose before removing the panel. */
export function bindRfcControls(panel: FreshmindPanel, elements: RfcControlElements): () => void {
  const rfc = panel.getRfc();
  const fields = ["springMultiplier", "radialStiffness", "radialLength", "angularStiffness", "xWeight", "yWeight"] as const;
  let centerSignature="";
  const update = () => {
    const state = rfc.getState(), selected = panel.getSelection();
    const indicator=state.active?"On":state.enabled?"Paused":"Off";
    if(elements.indicator&&elements.indicator.textContent!==indicator)elements.indicator.textContent=indicator;
    elements.activate.disabled = !(selected instanceof FreshNode) || !panel.getGES().contains(selected);
    elements.clear.disabled = !state.enabled;
    if(elements.addCenter)elements.addCenter.disabled=elements.activate.disabled;
    if(elements.removeCenter)elements.removeCenter.disabled=!state.centers.length;
    const centerLabels=state.centers.map(c=>[c.focusId,panel.findNode(c.focusId)?.getLabel()??c.focusId,c.kind,c.active]);
    if(elements.centers&&JSON.stringify(centerLabels)!==centerSignature) {
      const list=elements.centers,previous=list.value;centerSignature=JSON.stringify(centerLabels);list.replaceChildren();
      for(const [id,label,kind,active] of centerLabels) {
        const option=list.ownerDocument.createElement("option");option.value=String(id);option.textContent=`${label} (${kind}${active?"":", hidden"})`;list.append(option);
      }
      list.value=state.centers.some(c=>c.focusId===previous)?previous:state.focusId??"";
    }
    if (elements.adaptiveDamping) elements.adaptiveDamping.checked = state.stabilization.enabled;
    if(elements.excludeContext)elements.excludeContext.checked=state.exclusionSettings.enabled;
    if(elements.excludeOverlap)elements.excludeOverlap.checked=state.exclusionSettings.overlap;
    for(const [input,value] of [[elements.exclusionStrength,state.exclusionSettings.strength],[elements.exclusionPadding,state.exclusionSettings.padding]] as const)
      if(input&&input.ownerDocument.activeElement!==input)input.value=String(value);
    if(elements.stabilizationStatus) {
      const s=state.stabilization,gain=s.gain>=.001?s.gain.toFixed(3):s.gain.toExponential(1);
      const text=!s.enabled?"Damping off; detection is disabled.":!s.detections?"Damping on · watching focal motion.":
        `${s.phase==="recovering"?"Restoring motion":s.phase==="damping"?"Damping":"Damping on"} · ${s.detections} detections · gain ${gain} · last ${s.lastTrigger}: ${s.detectedNodeIds.slice(0,4).join(", ")}${s.detectedNodeIds.length>4?", …":""}${s.recoveryBackoffs?` · ${s.recoveryBackoffs} recovery backoffs`:""}.`;
      if(elements.stabilizationStatus.textContent!==text)elements.stabilizationStatus.textContent=text;
    }
    if(elements.clusterRigidity&&elements.clusterRigidity.ownerDocument.activeElement!==elements.clusterRigidity)
      elements.clusterRigidity.value=String(state.clusterSettings.rigidity);
    for (const [key, button] of [["tree", elements.treePreset], ["attraction", elements.attractionPreset]] as const)
      button?.setAttribute("aria-pressed", String(Object.entries(rfcForcePresets[key]).every(([field, value]) => state.settings[field as keyof typeof rfcForcePresets.tree] === value)));
    for (const key of fields) {
      const input = elements[key];
      if (input && input.ownerDocument.activeElement !== input)
        input.value = String(key === "xWeight" ? state.settings.coordinateWeights.x : key === "yWeight" ? state.settings.coordinateWeights.y : state.settings[key]);
    }
    const label = state.focusId ? panel.findNode(state.focusId)?.getLabel() || state.focusId : "";
    let message = !state.enabled ? "RFC off." : !state.active
      ? `RFC paused: ${label} is outside the visible neighborhood.`
      : `RFC: ${label} · ${state.branchIds.length} visible ${state.branchIds.length === 1 ? "branch" : "branches"}.`;
    if(state.centers.length>1)message=state.active?`RFC: ${state.centers.length} centers · ${state.memberIds.length} reinforced nodes.`:"RFC paused: all centers are outside the visible neighborhood.";
    else if(state.active&&state.centers[0]?.structureId)message=`RFC: ${panel.getCompleteEltSet().getSubstructure(state.centers[0].structureId)?.label} · ${state.memberIds.length} ${state.centers[0].kind} members.`;
    if (state.active && state.stabilization.phase !== "steady") message = message.slice(0,-1)
      + (state.stabilization.phase === "damping" ? " · damping oscillation." : " · restoring motion.");
    if (elements.status.textContent !== message) elements.status.textContent = message;
  };
  const activate = () => { const node = panel.getSelection(); if (node instanceof FreshNode) rfc.setFocus(node); panel.focusGraph(); };
  const clear = () => { rfc.setFocus(null); panel.focusGraph(); };
  elements.activate.addEventListener("click", activate);
  elements.clear.addEventListener("click", clear);
  const removers: (() => void)[] = [];
  for(const [element,key] of [["excludeContext","enabled"],["excludeOverlap","overlap"],["exclusionStrength","strength"],["exclusionPadding","padding"]] as const) {
    const input=elements[element];if(!input)continue;
    const reset=()=>input.setCustomValidity("");
    const change=()=>{
      reset();try {
        const changes:Partial<RfcExclusionSettings>=key==="enabled"||key==="overlap"?{[key]:input.checked}:{[key]:input.valueAsNumber};
        rfc.configureExclusion(changes);
      }catch(error){input.setCustomValidity(error instanceof Error?error.message:String(error));input.reportValidity();}
    };
    input.addEventListener("input",reset);input.addEventListener("change",change);
    removers.push(()=>{input.removeEventListener("input",reset);input.removeEventListener("change",change);input.setCustomValidity("");});
  }
  if(elements.clusterRigidity) {
    const input=elements.clusterRigidity,reset=()=>input.setCustomValidity("");
    const change=()=>{reset();try{rfc.configureClusters({rigidity:input.valueAsNumber});}
      catch(error){input.setCustomValidity(error instanceof Error?error.message:String(error));input.reportValidity();}};
    input.addEventListener("input",reset);input.addEventListener("change",change);
    removers.push(()=>{input.removeEventListener("input",reset);input.removeEventListener("change",change);input.setCustomValidity("");});
  }
  const addCenter=()=>{panel.getNavigation().addRfcCenter();panel.focusGraph();};
  const removeCenter=()=>{if(elements.centers?.value)rfc.removeFocus(elements.centers.value);panel.focusGraph();};
  elements.addCenter?.addEventListener("click",addCenter);elements.removeCenter?.addEventListener("click",removeCenter);
  removers.push(()=>{elements.addCenter?.removeEventListener("click",addCenter);elements.removeCenter?.removeEventListener("click",removeCenter);});
  const toggleDamping = () => rfc.setStabilizationEnabled(elements.adaptiveDamping!.checked);
  elements.adaptiveDamping?.addEventListener("change", toggleDamping);
  removers.push(() => elements.adaptiveDamping?.removeEventListener("change", toggleDamping));
  for (const [key, button] of [["tree", elements.treePreset], ["attraction", elements.attractionPreset]] as const) {
    const choose = () => {
      for (const field of fields) elements[field]?.setCustomValidity("");
      rfc.configure(rfcForcePresets[key]); panel.focusGraph(); update();
    };
    button?.addEventListener("click", choose);
    removers.push(() => button?.removeEventListener("click", choose));
  }
  for (const key of fields) {
    const input = elements[key];
    if (!input) continue;
    const resetValidity = () => input.setCustomValidity("");
    const change = () => {
      resetValidity();
      try {
        const changes: Partial<RfcSettings> = key === "xWeight" || key === "yWeight"
          ? {coordinateWeights: {...rfc.getState().settings.coordinateWeights, [key === "xWeight" ? "x" : "y"]: input.valueAsNumber}}
          : {[key]: input.valueAsNumber};
        rfc.configure(changes);
      }
      catch (error) { input.setCustomValidity(error instanceof Error ? error.message : String(error)); input.reportValidity(); }
    };
    input.addEventListener("input", resetValidity); input.addEventListener("change", change);
    removers.push(() => { input.removeEventListener("input", resetValidity); input.removeEventListener("change", change); input.setCustomValidity(""); });
  }
  const listener = {graphMoved: update, graphReset: update};
  panel.addGraphListener(listener);
  const removeSelection = panel.addSelectionListener(update), removeRfc = rfc.addListener(update);
  update();
  return () => {
    elements.activate.removeEventListener("click", activate); elements.clear.removeEventListener("click", clear);
    for (const remove of removers) remove();
    removeSelection(); removeRfc(); panel.removeGraphListener(listener);
  };
}
