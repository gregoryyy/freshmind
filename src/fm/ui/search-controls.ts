/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {FreshEdge,FreshNode} from "../model/index.js";
import {isSearchQueryNode,searchResultMetadata} from "../ir/index.js";
import type {SearchEngine,SearchRequest} from "../../ir/corpus/index.js";
import {GraphSearchController,SearchCancelledError} from "../browser/index.js";
import type {FreshmindPanel} from "../browser/index.js";
export interface GraphSearchElements {
  engine:HTMLSelectElement;kind:HTMLSelectElement;query:HTMLInputElement;limit:HTMLInputElement;
  run:HTMLButtonElement;similar:HTMLButtonElement;reject:HTMLButtonElement;train:HTMLButtonElement;cancel:HTMLButtonElement;
  topics:HTMLInputElement;iterations:HTMLInputElement;seed:HTMLInputElement;alpha:HTMLInputElement;beta:HTMLInputElement;
  status:HTMLElement;topicWords:HTMLElement;
}
/** Caller-owned elements; this binding owns/disposes its controller and listeners. */
export function bindGraphSearchControls(panel:FreshmindPanel,e:GraphSearchElements,controller=new GraphSearchController(panel)):()=>void {
  const removers:(()=>void)[]=[];
  const listen=(target:HTMLElement,event:string,handler:EventListener)=>{target.addEventListener(event,handler);removers.push(()=>target.removeEventListener(event,handler));};
  let disposed=false,errorMessage="";
  const showError=(error:unknown)=>{if(!disposed&&!(error instanceof SearchCancelledError)){errorMessage=error instanceof Error?error.message:String(error);sync();}};
  const sync=()=>{
    const state=controller.getState(),selection=panel.getSelection();e.status.textContent=errorMessage||state.message;
    e.run.disabled=state.busy;e.train.disabled=state.busy;e.cancel.disabled=!state.busy;
    for(const input of [e.engine,e.kind,e.query,e.limit,e.topics,e.iterations,e.seed,e.alpha,e.beta])input.disabled=state.busy;
    e.similar.disabled=state.busy||!(selection instanceof FreshNode)||isSearchQueryNode(selection);
    e.reject.disabled=state.busy||!(selection instanceof FreshEdge)||!searchResultMetadata(selection);
    e.topicWords.replaceChildren();
    state.topicWords.forEach((words,i)=>{const p=document.createElement("p");p.textContent=`Topic ${i+1}: ${words.join(", ")}`;e.topicWords.append(p);});
  };
  const engine=()=>{if(!["lexical","lda"].includes(e.engine.value))throw new TypeError("Choose a search engine");return e.engine.value as SearchEngine;};
  const run=()=>{
    try {
      if(!e.query.reportValidity()||!e.limit.reportValidity())return;
      const request={engine:engine(),kind:e.kind.value,query:e.query.value.trim()} as SearchRequest;
      const selected=panel.getSelection();void controller.query(request,Number(e.limit.value),selected instanceof FreshNode?selected:null).catch(showError);
    }catch(error){showError(error);}
  };
  listen(e.run,"click",run);listen(e.query,"keydown",event=>{const key=event as KeyboardEvent;if(key.key==="Enter"){key.preventDefault();run();}});
  listen(e.similar,"click",()=>{try{if(e.limit.reportValidity())void controller.similar(engine(),Number(e.limit.value)).catch(showError);}catch(error){showError(error);}});
  listen(e.train,"click",()=>{
    try{if([e.topics,e.iterations,e.seed,e.alpha,e.beta].every(input=>input.reportValidity()))void controller.train({topics:Number(e.topics.value),iterations:Number(e.iterations.value),seed:Number(e.seed.value),alpha:Number(e.alpha.value),beta:Number(e.beta.value)}).catch(showError);}catch(error){showError(error);}
  });
  listen(e.cancel,"click",()=>controller.cancel());listen(e.reject,"click",()=>{try{controller.reject();}catch(error){showError(error);}});
  const removeState=controller.addListener(()=>{errorMessage="";sync();}),removeSelection=panel.addSelectionListener(selection=>{
    if(selection instanceof FreshNode&&isSearchQueryNode(selection)){
      const search=selection.getData().search as Record<string,unknown>,r=search.request as SearchRequest;
      if(r&&["lexical","lda"].includes(r.engine)&&["terms","tags"].includes(r.kind)){e.engine.value=r.engine;e.kind.value=r.kind;e.query.value=r.query;}
    }sync();
  });
  return ()=>{disposed=true;removeState();removeSelection();removers.forEach(remove=>remove());controller.dispose();};
}
