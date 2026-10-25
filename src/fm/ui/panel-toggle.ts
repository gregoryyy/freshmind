/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
export interface RetractablePanel {show():void;dispose():void}
/** Caller-owned markup; collapsing preserves settings, details disclosure and scroll position. */
export function bindPanelToggle(panel:HTMLElement,button:HTMLButtonElement,layout:HTMLElement):RetractablePanel {
  const hidden=panel.hidden,expanded=button.getAttribute("aria-expanded"),label=button.getAttribute("aria-label"),collapsed=layout.classList.contains("controls-collapsed");
  let disposed=false;
  const set=(show:boolean)=>{
    if(disposed)return;
    if(!show&&panel.contains(panel.ownerDocument.activeElement))button.focus({preventScroll:true});
    panel.hidden=!show;layout.classList.toggle("controls-collapsed",!show);button.setAttribute("aria-expanded",String(show));button.setAttribute("aria-label",show?"Hide controls":"Show controls");
  };
  const toggle=()=>set(panel.hidden);button.addEventListener("click",toggle);set(!hidden);
  return {show:()=>set(true),dispose:()=>{if(disposed)return;disposed=true;button.removeEventListener("click",toggle);panel.hidden=hidden;layout.classList.toggle("controls-collapsed",collapsed);if(expanded===null)button.removeAttribute("aria-expanded");else button.setAttribute("aria-expanded",expanded);if(label===null)button.removeAttribute("aria-label");else button.setAttribute("aria-label",label);}};
}
