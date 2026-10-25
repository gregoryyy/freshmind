/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */
import type {FreshmindPanel} from "../browser/index.js";

export interface StructuralViewElements {
  enabled:HTMLInputElement;hiddenNodeTypes:HTMLSelectElement;hiddenRelationTypes:HTMLSelectElement;aggregateTypes:HTMLSelectElement;
  detailRadius:HTMLInputElement;reveal:HTMLButtonElement;reset:HTMLButtonElement;status:HTMLElement;groups?:HTMLElement;
}
/**
 * Binds application-owned controls to reusable structural rules. Type choices include
 * unknown IDs present in the graph and configured rules; labels are inserted as text.
 * Dispose before removing controls; only this registration's listeners are removed.
 */
export function bindStructuralViewControls(panel:FreshmindPanel,e:StructuralViewElements):()=>void {
  const view=panel.getStructuralView(),removers:(()=>void)[]=[];
  const update=()=>{
    const state=view.getState(),s=state.settings,config=panel.getTypeRegistry().getConfiguration(),graph=panel.getCompleteEltSet();
    e.enabled.checked=s.enabled;e.detailRadius.value=String(s.detailRadius);
    const nodeTypes=[...new Set([...Object.keys(config.nodeTypes),...[...graph.getNodes()].map(n=>n.getSemanticType()),...s.aggregateTypes,...s.hiddenNodeTypes])].sort();
    const relationTypes=[...new Set([...Object.keys(config.relationTypes),...[...graph.getEdges()].map(r=>r.getSemanticType()),...s.hiddenRelationTypes])].sort();
    for(const [select,types,selected,definitions] of [[e.hiddenNodeTypes,nodeTypes,s.hiddenNodeTypes,config.nodeTypes],
      [e.aggregateTypes,nodeTypes,s.aggregateTypes,config.nodeTypes],[e.hiddenRelationTypes,relationTypes,s.hiddenRelationTypes,config.relationTypes]] as const) {
      const options=types.map(type=>({type,label:`${definitions[type]?.label??type} (${type})`})),key=JSON.stringify(options);
      if(select.dataset.types!==key){select.replaceChildren(...options.map(({type,label})=>{const o=document.createElement("option");o.value=type;o.textContent=label;return o;}));select.dataset.types=key;}
      // Native multi-select commits after the pointer gesture. Motion must not overwrite
      // its tentative selection between pointer-down and change.
      const selectionKey=JSON.stringify(selected.slice().sort());
      if(select.dataset.selection!==selectionKey||select.dataset.selectionTypes!==key){
        for(const option of select.options)if(option.selected!==selected.includes(option.value))option.selected=selected.includes(option.value);
        select.dataset.selection=selectionKey;select.dataset.selectionTypes=key;
      }
    }
    const selected=panel.getSelect()?.getID();
    e.reveal.disabled=!state.groups.some(g=>g.parentId===selected);
    e.status.textContent=s.enabled?`${state.nodeIds.length} of ${state.sourceNodeCount} neighborhood nodes shown; ${state.aggregatedNodeIds.length} aggregated, ${state.filteredNodeIds.length} filtered.`:"Structural view off.";
    if(e.groups) {
      e.groups.replaceChildren(...state.groups.map(group=>{
        const row=document.createElement("div"),parent=graph.findNode(group.parentId);
        row.textContent=`${parent?.getLabel()??group.parentId}: +${group.type} ${group.nodeIds.length}`;return row;
      }));
    }
  };
  const on=(element:HTMLElement,type:string,action:()=>void)=>{
    const listener=()=>{try{action();if(element instanceof HTMLInputElement)element.setCustomValidity("");}
      catch(error){if(element instanceof HTMLInputElement){element.setCustomValidity((error as Error).message);element.reportValidity();}e.status.textContent=(error as Error).message;}};
    element.addEventListener(type,listener);removers.push(()=>element.removeEventListener(type,listener));
  };
  on(e.enabled,"change",()=>view.configure({enabled:e.enabled.checked}));
  for(const key of ["hiddenNodeTypes","hiddenRelationTypes","aggregateTypes"] as const)
    on(e[key],"change",()=>view.configure({[key]:[...e[key].selectedOptions].map(o=>o.value)}));
  on(e.detailRadius,"change",()=>view.configure({detailRadius:e.detailRadius.valueAsNumber}));
  on(e.reveal,"click",()=>{const id=panel.getSelect()?.getID();if(id)view.reveal(id);});
  on(e.reset,"click",()=>view.configure({enabled:false,hiddenNodeTypes:[],hiddenRelationTypes:[],aggregateTypes:[],detailRadius:1}));
  const listener={graphMoved:update,graphReset:update};panel.addGraphListener(listener);
  const remove=view.addListener(update),removeSelection=panel.addSelectionListener(update);update();
  return()=>{removers.forEach(remove=>remove());remove();removeSelection();panel.removeGraphListener(listener);};
}
