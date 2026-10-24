/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {FreshEdge,FreshNode} from "../model/index.js";
import {isSearchQueryNode,searchResultMetadata} from "../ir/index.js";
import type {SearchEngine,SearchRequest,SearchMetric} from "../../ir/corpus/index.js";
import {GraphSearchController,SearchCancelledError} from "../browser/index.js";
import type {FreshmindPanel} from "../browser/index.js";
import {GraphQueryEditor} from "../browser/index.js";
export interface GraphSearchElements {
  engine:HTMLSelectElement;kind:HTMLSelectElement;query:HTMLInputElement;limit:HTMLInputElement;
  run:HTMLButtonElement;similar:HTMLButtonElement;reject:HTMLButtonElement;train:HTMLButtonElement;cancel:HTMLButtonElement;
  topics:HTMLInputElement;iterations:HTMLInputElement;seed:HTMLInputElement;alpha:HTMLInputElement;beta:HTMLInputElement;
  status:HTMLElement;topicWords:HTMLElement;
  metric?:HTMLSelectElement;maxDistance?:HTMLInputElement;
  saveModel?:HTMLButtonElement;loadModel?:HTMLInputElement;
  minDocumentFrequency?:HTMLInputElement;
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
    if(e.saveModel)e.saveModel.disabled=state.busy||!state.trained;
    if(e.loadModel)e.loadModel.disabled=state.busy;
    if(e.minDocumentFrequency)e.minDocumentFrequency.disabled=state.busy;
    for(const input of [e.engine,e.kind,e.query,e.limit,e.topics,e.iterations,e.seed,e.alpha,e.beta])input.disabled=state.busy;
    for(const input of [e.metric,e.maxDistance])if(input)input.disabled=state.busy||e.engine.value!=="lda"||e.kind.value==="tags";
    e.similar.disabled=state.busy||!(selection instanceof FreshNode)||isSearchQueryNode(selection);
    e.reject.disabled=state.busy||!(selection instanceof FreshEdge)||!searchResultMetadata(selection);
    e.topicWords.replaceChildren();
    state.topicWords.forEach((words,i)=>{const p=document.createElement("p");p.textContent=`Topic ${i+1}: ${words.join(", ")}`;e.topicWords.append(p);});
  };
  const engine=()=>{if(!["lexical","lda"].includes(e.engine.value))throw new TypeError("Choose a search engine");return e.engine.value as SearchEngine;};
  const semanticOptions=(similarity=false):Pick<SearchRequest,"metric"|"maxDistance">=>{
    if(engine()!=="lda"||!similarity&&e.kind.value==="tags")return {};
    if(e.maxDistance&&!e.maxDistance.reportValidity())throw new TypeError("Choose a nonnegative distance limit");
    return {...(e.metric?{metric:e.metric.value as SearchMetric}:{}),...(e.maxDistance?.value?{maxDistance:Number(e.maxDistance.value)}:{})};
  };
  listen(e.engine,"change",sync);listen(e.kind,"change",sync);
  const run=()=>{
    try {
      if(!e.query.reportValidity()||!e.limit.reportValidity())return;
      const request={engine:engine(),kind:e.kind.value,query:e.query.value.trim(),...semanticOptions()} as SearchRequest;
      const selected=panel.getSelection();void controller.query(request,Number(e.limit.value),selected instanceof FreshNode?selected:null).catch(showError);
    }catch(error){showError(error);}
  };
  listen(e.run,"click",run);listen(e.query,"keydown",event=>{const key=event as KeyboardEvent;if(key.key==="Enter"){key.preventDefault();run();}});
  const similar=()=>{try{const selected=panel.getSelection();if(!(selected instanceof FreshNode)||isSearchQueryNode(selected))throw new Error("Select a content node for similarity search");if(e.limit.reportValidity())void controller.similar(engine(),Number(e.limit.value),semanticOptions(true)).catch(showError);}catch(error){showError(error);}};
  const train=()=>{
    try{const invalid=[e.topics,e.iterations,e.seed,e.alpha,e.beta,...(e.minDocumentFrequency?[e.minDocumentFrequency]:[])].find(input=>!input.checkValidity());if(invalid){reveal(invalid);invalid.reportValidity();return;}void controller.train({topics:Number(e.topics.value),iterations:Number(e.iterations.value),seed:Number(e.seed.value),alpha:Number(e.alpha.value),beta:Number(e.beta.value),...(e.minDocumentFrequency?{minDocumentFrequency:Number(e.minDocumentFrequency.value)}:{})}).catch(showError);}catch(error){showError(error);}
  };
  listen(e.similar,"click",similar);listen(e.train,"click",train);
  const maxModelBytes=64*1024*1024;
  if(e.saveModel)listen(e.saveModel,"click",()=>{
    try{
      const blob=new Blob([JSON.stringify(controller.exportModel())],{type:"application/json"});
      if(blob.size>maxModelBytes)throw new RangeError("Topic model exceeds the 64 MiB file limit");
      const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="freshmind-topic-model.json";
      document.body.append(link);try{link.click();}finally{link.remove();URL.revokeObjectURL(url);}
    }catch(error){showError(error);}
  });
  if(e.loadModel)listen(e.loadModel,"change",()=>{
    const file=e.loadModel!.files?.[0];e.loadModel!.value="";if(!file)return;
    if(file.size>maxModelBytes){showError(new RangeError("Topic model exceeds the 64 MiB file limit"));return;}
    void controller.loadModel(async()=>JSON.parse(await file.text()) as unknown).catch(showError);
  });
  const reveal=(target:HTMLElement=e.query)=>{
    for(let ancestor=target.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;
    target.scrollIntoView({block:"nearest"});
  };
  const choose=(semantic:boolean)=>{e.engine.value=semantic?"lda":"lexical";e.kind.value="terms";sync();};
  const queryEditor=new GraphQueryEditor(panel,(node,text)=>{
    const search=node.getData().search as Record<string,unknown>;
    const request={...search.request as SearchRequest,query:text.trim()};
    // submitQuery validates synchronously before the input closes, then retains accepted text on engine failure.
    void controller.submitQuery(node,request,Number(e.limit.value)).catch(showError);
  });
  const editQuery=(item:FreshNode|FreshEdge)=>{
    if(!(item instanceof FreshNode)||!isSearchQueryNode(item))return false;
    const request=(item.getData().search as Record<string,unknown>).request as SearchRequest;
    return queryEditor.open(item,request?.query??"");
  };
  const removeKeys=panel.getNavigation().setActions({
    quickSearch:()=>{if(controller.getState().busy)return;choose(false);e.query.value="";reveal();e.query.focus();},
    search:semantic=>{try{choose(semantic);const context=panel.getSelect(),options=semanticOptions();editQuery(controller.createQuery(semantic?"lda":"lexical",context instanceof FreshNode?context:null,options));}catch(error){showError(error);}},
    editQuery,
    similar:semantic=>{if(controller.getState().busy)return;choose(semantic);reveal();similar();},
    index:semantic=>{if(controller.getState().busy)return;choose(semantic);reveal();if(semantic)train();else void controller.index().catch(showError);}
  });
  listen(e.cancel,"click",()=>controller.cancel());listen(e.reject,"click",()=>{try{controller.reject();}catch(error){showError(error);}});
  const removeState=controller.addListener(()=>{errorMessage="";sync();}),removeSelection=panel.addSelectionListener(selection=>{
    if(selection instanceof FreshNode&&isSearchQueryNode(selection)){
      const search=selection.getData().search as Record<string,unknown>,r=search.request as SearchRequest;
      if(r&&["lexical","lda"].includes(r.engine)&&["terms","tags"].includes(r.kind)){e.engine.value=r.engine;e.kind.value=r.kind;e.query.value=r.query;}
      if(r?.engine==="lda"&&r.kind!=="tags"){
        if(e.metric)e.metric.value=r.metric??"jensen-shannon";
        if(e.maxDistance)e.maxDistance.value=r.maxDistance===undefined?"":String(r.maxDistance);
      }
    }sync();
  });
  return ()=>{disposed=true;queryEditor.dispose();removeKeys();removeState();removeSelection();removers.forEach(remove=>remove());controller.dispose();};
}
