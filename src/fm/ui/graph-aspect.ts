/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {TGPanel,GraphAspectMode} from "../../tg/browser/index.js";
export interface GraphAspectElements {mode:HTMLSelectElement;value:HTMLOutputElement;}
/** Binds a caller-owned choice to the panel's general display-aspect policy. */
export function bindGraphAspectControls(panel:TGPanel,e:GraphAspectElements):()=>void {
  let disposed=false;
  const update=()=>{if(disposed)return;const state=panel.getGraphAspectState();e.mode.value=state.mode;e.value.value=state.mode==="original"?"Original positions":`Width:height ${Number(state.ratio.toPrecision(4))}:1`;};
  const change=()=>{panel.setGraphAspectMode(e.mode.value as GraphAspectMode);update();};
  const listener={graphMoved:update,graphReset:update};panel.addGraphListener(listener);e.mode.addEventListener("change",change);update();
  return ()=>{if(disposed)return;disposed=true;panel.removeGraphListener(listener);e.mode.removeEventListener("change",change);};
}
