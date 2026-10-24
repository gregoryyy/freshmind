/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import type {FreshmindPanel} from "../browser/index.js";
import type {NodeImportanceViewSettings} from "../geometry/index.js";
export interface NodeImportanceElements {mode:HTMLSelectElement;showValues:HTMLInputElement;}

/** Binds supplied display controls; programmatic preferences synchronize without taking selection/focus. */
export function bindNodeImportanceControls(panel:FreshmindPanel,e:NodeImportanceElements):()=>void {
  const update=()=>{const state=panel.getNodeImportance();e.mode.value=state.mode;e.showValues.checked=state.showValues;};
  const mode=()=>{
    try{panel.configureNodeImportance({mode:e.mode.value as NodeImportanceViewSettings["mode"]});e.mode.setCustomValidity("");}
    catch(error){e.mode.setCustomValidity((error as Error).message);e.mode.reportValidity();}
  };
  const values=()=>panel.configureNodeImportance({showValues:e.showValues.checked});
  e.mode.addEventListener("change",mode);e.showValues.addEventListener("change",values);
  const listener={graphMoved:update};panel.addGraphListener(listener);update();
  return()=>{e.mode.removeEventListener("change",mode);e.showValues.removeEventListener("change",values);panel.removeGraphListener(listener);};
}
