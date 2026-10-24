/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {FreshmindPanel,LabelEditingMode} from "../browser/index.js";
export interface LabelEditingElements {mode:HTMLSelectElement;status?:HTMLElement;}

/** Caller-owned mode control; label editing is a transient preference across document replacements. */
export function bindLabelEditingControls(panel:FreshmindPanel,e:LabelEditingElements):()=>void {
  const update=()=>{e.mode.value=panel.getLabelEditingMode();};
  const change=()=>{
    try {panel.setLabelEditingMode(e.mode.value as LabelEditingMode);e.mode.setCustomValidity("");if(e.status)e.status.textContent="";}
    catch(error){if(e.status)e.status.textContent=(error as Error).message;update();}
  };
  e.mode.addEventListener("change",change);const listener={graphMoved:update};panel.addGraphListener(listener);update();
  return()=>{e.mode.removeEventListener("change",change);panel.removeGraphListener(listener);};
}
