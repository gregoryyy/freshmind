/* SPDX-License-Identifier: GPL-3.0-or-later; Copyright (c) 2026 Gregor Heinrich. */
import {FreshEdge,FreshNode,getMutationLocality} from "../model/index.js";
import type {FreshGraph} from "../model/index.js";
import {graphSearchCorpus,isSearchQueryNode,createGraphQuery,applyGraphSearchResults,rejectGraphSearchResult,validateSearchRequest} from "../search/index.js";
import type {SearchRequest,SearchEngine} from "../search/index.js";
import {LdaSearchIndex,validateLdaOptions} from "../topics/index.js";
import type {LdaModel,LdaOptions} from "../topics/index.js";
import type {FreshmindPanel} from "./panel.js";
import type {SearchWorkerJob,SearchWorkerMessage} from "./search-protocol.js";
export interface GraphSearchState {busy:boolean;trained:boolean;message:string;topicWords:string[][]}
export type SearchWorkerFactory=()=>Pick<Worker,"postMessage"|"terminate"|"onmessage"|"onerror">;
export class SearchCancelledError extends Error {constructor(){super("Search cancelled");this.name="SearchCancelledError";}}
type Answer=Extract<SearchWorkerMessage,{kind:"trained"|"results"}>;
/** Owns worker/model lifecycle; graph, selection, locality, RFC and layout keep their existing owners. */
export class GraphSearchController {
  private model:LdaModel|undefined;
  private graph:FreshGraph;
  private disposed=false;
  private generation=0;
  private active:{worker:ReturnType<SearchWorkerFactory>;reject:(error:Error)=>void}|undefined;
  private readonly listeners=new Set<(state:GraphSearchState)=>void>();
  private readonly removeGraphChange:()=>void;
  private state:GraphSearchState={busy:false,trained:false,message:"Choose terms or tags to search the graph.",topicWords:[]};
  private readonly graphListener={graphMoved:()=>this.checkGraph(),graphReset:()=>this.resetGraph()};
  constructor(private readonly panel:FreshmindPanel,private readonly workerFactory:SearchWorkerFactory=()=>new Worker(new URL("./search-worker.js",import.meta.url),{type:"module"})){
    this.graph=panel.getCompleteEltSet();panel.addGraphListener(this.graphListener);this.removeGraphChange=panel.addGraphChangeListener(()=>this.resetGraph());
  }
  getState():GraphSearchState{return structuredClone(this.state);}
  addListener(listener:(state:GraphSearchState)=>void):()=>void {this.listeners.add(listener);listener(this.getState());return ()=>this.listeners.delete(listener);}
  private publish(changes:Partial<GraphSearchState>):void {this.state={...this.state,...changes};for(const listener of this.listeners)listener(this.getState());}
  private resetGraph():void {this.cancel();this.graph=this.panel.getCompleteEltSet();this.model=undefined;this.publish({trained:false,topicWords:[],message:"Graph changed. Search or train a topic model."});}
  private checkGraph():void {if(this.graph!==this.panel.getCompleteEltSet())this.resetGraph();}
  cancel():void {
    this.generation++;const job=this.active;if(!job)return;this.active=undefined;job.worker.onmessage=null;job.worker.onerror=null;job.worker.terminate();job.reject(new SearchCancelledError());this.publish({busy:false,message:"Search cancelled."});
  }
  private run(job:SearchWorkerJob):Promise<Answer>{
    if(this.disposed)return Promise.reject(new Error("Search controller disposed"));this.checkGraph();this.cancel();
    const graph=this.graph;this.publish({busy:true,message:job.kind==="train"?"Training topic model…":"Searching…"});
    return new Promise((resolve,reject)=>{
      let worker:ReturnType<SearchWorkerFactory>;
      try{worker=this.workerFactory();}catch(error){this.publish({busy:false});reject(error);return;}
      const active={worker,reject};this.active=active;
      const finish=(answer?:Answer,error?:Error)=>{
        if(this.active!==active)return;this.active=undefined;worker.onmessage=null;worker.onerror=null;worker.terminate();
        this.publish({busy:false,...(error?{message:error.message}:{})});if(error)reject(error);else resolve(answer!);
      };
      worker.onmessage=({data}:MessageEvent<SearchWorkerMessage>)=>{
        if(this.active!==active)return;
        if(graph!==this.panel.getCompleteEltSet()){finish(undefined,new Error("Graph changed"));return;}
        if(data.kind==="progress"){this.publish({message:`Training topic model: ${data.progress.iteration}/${data.progress.iterations} passes.`});return;}
        if(data.kind==="error"){finish(undefined,new Error(data.message));return;}
        if(graphSearchCorpus(graph).key!==job.corpus.key){this.model=undefined;this.publish({trained:false,topicWords:[]});finish(undefined,new Error("Graph text changed; run the query or training again"));return;}
        finish(data);
      };
      worker.onerror=event=>finish(undefined,new Error(event.message||"Search worker failed"));
      try{worker.postMessage(job);}catch(error){finish(undefined,error instanceof Error?error:new Error(String(error)));}
    });
  }
  async train(options:Partial<LdaOptions>={}):Promise<void>{
    const o=validateLdaOptions(options),graph=this.panel.getCompleteEltSet(),corpus=graphSearchCorpus(graph),pending=this.run({kind:"train",corpus,options:o}),generation=this.generation,answer=await pending;
    if(this.disposed||generation!==this.generation)throw new SearchCancelledError();
    if(graph!==this.panel.getCompleteEltSet()||graphSearchCorpus(graph).key!==corpus.key)throw new Error("Training graph changed");
    if(answer.kind!=="trained")throw new Error("Unexpected search worker response");
    this.model=new LdaSearchIndex(answer.model).getModel();this.publish({trained:true,message:`Topic model ready: ${o.topics} topics.`,topicWords:new LdaSearchIndex(this.model).topicWords(6).map(row=>row.map(w=>w.term))});
  }
  async query(request:SearchRequest,limit=5,source?:FreshNode|null):Promise<FreshEdge[]>{
    const r=validateSearchRequest(request);if(!Number.isInteger(limit)||limit<1||limit>100)throw new RangeError("Choose 1–100 results");
    this.checkGraph();const graph=this.panel.getCompleteEltSet(),corpus=graphSearchCorpus(graph);
    const sourceLabel=source?.getLabel(),sourceQuery=source&&isSearchQueryNode(source)?JSON.stringify(source.getData().search):null;
    if(r.kind==="similarity"&&(!source||!graph.contains(source)||source.getID()!==r.query||isSearchQueryNode(source)))throw new Error("Select a content node for similarity search");
    if(source&&!graph.contains(source))throw new Error("Search source is outside the graph");
    if(r.engine==="lda"&&r.kind!=="tags"&&(!this.model||this.model.corpus.key!==corpus.key)){
      this.model=undefined;this.publish({trained:false,topicWords:[]});throw new Error("Train a topic model for the current graph text first");
    }
    const pending=this.run({kind:"search",corpus,request:r,limit,model:r.engine==="lda"&&r.kind!=="tags"?this.model:undefined}),generation=this.generation,answer=await pending;
    if(answer.kind!=="results")throw new Error("Unexpected search worker response");
    // No asynchronous boundary between validation and mutation. A deleted source is never recreated.
    if(this.disposed||generation!==this.generation)throw new SearchCancelledError();
    if(graph!==this.panel.getCompleteEltSet()||source&&!graph.contains(source)||graphSearchCorpus(graph).key!==corpus.key)throw new Error("Search source or graph changed");
    if(sourceQuery!==null&&source&&(source.getLabel()!==sourceLabel||JSON.stringify(source.getData().search)!==sourceQuery))throw new Error("Query node changed; run the query again");
    let owner=source;
    if(r.kind!=="similarity"){
      if(!owner||!isSearchQueryNode(owner))owner=createGraphQuery(graph,r,source);
      else {const data=owner.getData(),search=data.search as Record<string,unknown>;owner.setData({...data,search:{...search,version:1,role:"query",request:{...r}}} as Parameters<FreshNode["setData"]>[0]);owner.setLabel(`[${r.query}]`);}
    }
    const edges=applyGraphSearchResults(graph,owner!,r,answer.results,corpus);
    this.reveal(owner!,edges);this.publish({message:`${edges.length} result${edges.length===1?"":"s"} linked. Select a result relation to reject it.`});return edges;
  }
  similar(engine:SearchEngine,limit=5):Promise<FreshEdge[]>{const source=this.panel.getSelect();if(!(source instanceof FreshNode))return Promise.reject(new Error("Select a content node"));return this.query({engine,kind:"similarity",query:source.getID()!},limit,source);}
  reject(edge=this.panel.getSelectEdge()):void {
    if(!(edge instanceof FreshEdge))throw new Error("Select a search result relation");
    rejectGraphSearchResult(this.panel.getCompleteEltSet(),edge);getMutationLocality(this.panel.getGES())!.updateLocalityFromVisibility();this.panel.localityChanged();this.panel.repaint();this.publish({message:"Result rejected. Future runs of this query omit it; judgment saved with the graph."});
  }
  private reveal(owner:FreshNode,edges:FreshEdge[]):void {
    const locality=getMutationLocality(this.panel.getGES())!;
    locality.updateLocalityFromVisibility();locality.addNodeWithEdges(owner);
    for(const edge of edges)locality.addNodeWithEdges(edge.to);
    this.panel.localityChanged();this.panel.setSelect(owner);this.panel.resetDamper();this.panel.repaintAfterMove();
  }
  dispose():void {if(this.disposed)return;this.disposed=true;this.cancel();this.removeGraphChange();this.panel.removeGraphListener(this.graphListener);this.listeners.clear();this.model=undefined;}
}
