/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {separateNodeLabels} from "../browser/index.js";
import type {FreshmindPanel,LabelSeparationResult} from "../browser/index.js";
export interface ReadabilityElements {separate:HTMLButtonElement;gap:HTMLInputElement;status:HTMLElement}
/** Caller-owned controls; the callback keeps the application's motion toggle synchronized. */
export function bindReadabilityControls(panel:FreshmindPanel,e:ReadabilityElements,onSeparated?:(result:LabelSeparationResult)=>void):()=>void {
  const run=()=>{
    if(!e.gap.reportValidity())return;
    try{
      const result=separateNodeLabels(panel,{gap:e.gap.valueAsNumber});
      e.status.textContent=`Last arrangement: ${result.before} → ${result.after} overlapping node pairs. ${result.moved} nodes moved.${result.moved?" Motion paused.":""}`;
      e.gap.setCustomValidity("");onSeparated?.(result);
    }catch(error){e.gap.setCustomValidity((error as Error).message);e.gap.reportValidity();}
  };
  const clear=()=>e.gap.setCustomValidity("");
  const removeGraphChange=panel.addGraphChangeListener(()=>{e.status.textContent="";});
  e.separate.addEventListener("click",run);e.gap.addEventListener("input",clear);
  return()=>{removeGraphChange();e.separate.removeEventListener("click",run);e.gap.removeEventListener("input",clear);};
}
