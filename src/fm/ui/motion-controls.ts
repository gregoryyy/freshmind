/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import type {TGPanel} from "../../tg/browser/index.js";

export interface MotionControlElements {adaptiveDamping:HTMLInputElement;response?:HTMLSelectElement;status:HTMLElement;}

/** General layout controls: all visible nodes are observed independently of reinforcement. */
export function bindMotionControls(panel:TGPanel,elements:MotionControlElements):()=>void {
  const update=()=>{
    const s=panel.tgLayout.getAdaptiveDampingState();elements.adaptiveDamping.checked=s.enabled;
    const response=panel.tgLayout.getAdaptiveDampingResponse();if(elements.response)elements.response.value=response;
    const gain=s.gain>=.001?s.gain.toFixed(3):s.gain.toExponential(1);
    const text=!s.enabled?"Adaptive damping off; detection is disabled.":response==="cooling"?
      `Earlier TouchGraph cooling · ${s.detections} detections · damper ${panel.tgLayout.getState().damper.toFixed(3)}.`:!s.detections?"Adaptive damping on · watching graph motion.":
      `${s.phase==="recovering"?"Restoring motion":s.phase==="damping"?"Damping oscillation":"Adaptive damping on"} · ${s.detections} detections · minimum gain ${gain} · last ${s.lastTrigger}: ${s.detectedNodeIds.slice(0,4).join(", ")}${s.detectedNodeIds.length>4?", …":""}.`;
    if(elements.status.textContent!==text)elements.status.textContent=text;
  };
  const change=()=>{panel.tgLayout.setAdaptiveDampingEnabled(elements.adaptiveDamping.checked);update();};
  const responseChange=()=>{panel.tgLayout.setAdaptiveDampingResponse(elements.response!.value as "impulse"|"cooling");update();};
  const listener={graphMoved:update,graphReset:update};panel.addGraphListener(listener);
  elements.adaptiveDamping.addEventListener("change",change);update();
  elements.response?.addEventListener("change",responseChange);
  return ()=>{panel.removeGraphListener(listener);elements.adaptiveDamping.removeEventListener("change",change);elements.response?.removeEventListener("change",responseChange);};
}
