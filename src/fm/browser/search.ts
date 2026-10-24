/* SPDX-License-Identifier: GPL-3.0-or-later; Copyright (c) 2026 Gregor Heinrich. */
import {FreshEdge,FreshNode,getMutationLocality} from "../model/index.js";
import type {FreshGraph} from "../model/index.js";
import {graphSearchCorpus,isSearchQueryNode,createGraphQuery,createGraphQueryDraft,applyGraphSearchResults,rejectGraphSearchResult} from "../ir/index.js";
import {validateSearchRequest} from "../../ir/corpus/index.js";
import type {SearchCorpus,SearchRequest,SearchEngine,SearchResult} from "../../ir/corpus/index.js";
import {SearchSession,SearchCancelledError} from "../../ir/browser/index.js";
import type {SearchWorkerFactory} from "../../ir/browser/index.js";
import type {LdaOptions,LdaProgress,LdaModel} from "../../ir/topics/index.js";
import type {FreshmindPanel} from "./panel.js";
export {SearchCancelledError} from "../../ir/browser/index.js";
export type {SearchWorkerFactory} from "../../ir/browser/index.js";
export interface GraphSearchState {busy:boolean;trained:boolean;message:string;topicWords:string[][]}
/** Freshmind adapter: owns graph snapshots/results and view status; search owns workers and models. */
export class GraphSearchController {
  private readonly session:SearchSession;
  private graph:FreshGraph;
  private disposed=false;
  private generation=0;
  private pendingSource:FreshNode|null=null;
  private readonly listeners=new Set<(state:GraphSearchState)=>void>();
  private readonly removeGraphChange:()=>void;
  private state:GraphSearchState={busy:false,trained:false,message:"Choose terms or tags to search the graph.",topicWords:[]};
  private readonly graphListener={graphMoved:()=>this.checkGraph(),graphReset:()=>this.resetGraph()};
  constructor(private readonly panel:FreshmindPanel,workerFactory?:SearchWorkerFactory){
    this.session=new SearchSession(workerFactory);
    this.graph=panel.getCompleteEltSet();panel.addGraphListener(this.graphListener);this.removeGraphChange=panel.addGraphChangeListener(()=>this.resetGraph());
  }
  getState():GraphSearchState{return structuredClone(this.state);}
  addListener(listener:(state:GraphSearchState)=>void):()=>void {this.listeners.add(listener);listener(this.getState());return ()=>this.listeners.delete(listener);}
  private publish(changes:Partial<GraphSearchState>):void {this.state={...this.state,...changes};for(const listener of this.listeners)listener(this.getState());}
  private resetGraph():void {this.cancel();this.graph=this.panel.getCompleteEltSet();this.session.reset();this.publish({trained:false,topicWords:[],message:"Graph changed. Search or train a topic model."});}
  private checkGraph():void {
    if(this.graph!==this.panel.getCompleteEltSet())this.resetGraph();
    else if(this.pendingSource&&!this.graph.contains(this.pendingSource))this.cancel();
  }
  cancel():void {
    this.generation++;this.pendingSource=null;const busy=this.state.busy;this.session.cancel();
    if(busy)this.publish({busy:false,message:"Search cancelled."});
  }
  private async run<T>(corpus:SearchCorpus,execute:(progress:(p:LdaProgress)=>void)=>Promise<T>,operation:"search"|"train"|"index"|"load"="search"):Promise<T>{
    if(this.disposed)throw new Error("Search controller disposed");this.checkGraph();this.cancel();
    const graph=this.graph,generation=this.generation;
    this.publish({busy:true,message:operation==="train"?"Training topic model…":operation==="index"?"Checking literal search index…":operation==="load"?"Loading topic model…":"Searching…"});
    try {
      const answer=await execute(progress=>{
        if(generation===this.generation&&!this.disposed)this.publish({message:`Training topic model: ${progress.iteration}/${progress.iterations} passes.`});
      });
      if(this.disposed||generation!==this.generation)throw new SearchCancelledError();
      if(graph!==this.panel.getCompleteEltSet())throw new Error("Graph changed");
      if(graphSearchCorpus(graph).key!==corpus.key){this.session.reset();throw new Error("Graph text changed; run the query or training again");}
      const state=this.session.getState();this.publish({busy:false,trained:state.trained,topicWords:state.topicWords});return answer;
    }catch(error){
      if(generation===this.generation&&!this.disposed){const state=this.session.getState();this.publish({busy:false,trained:state.trained,topicWords:state.topicWords,message:error instanceof Error?error.message:String(error)});}
      throw error;
    }
  }
  async index():Promise<void>{
    const graph=this.panel.getCompleteEltSet(),corpus=graphSearchCorpus(graph),pending=this.run(corpus,()=>this.session.index(corpus),"index"),generation=this.generation;
    const count=await pending;
    if(this.disposed||generation!==this.generation)throw new SearchCancelledError();
    if(graph!==this.panel.getCompleteEltSet()||graphSearchCorpus(graph).key!==corpus.key)throw new Error("Indexing graph changed");
    this.publish({message:`Literal index checked: ${count} documents. Queries automatically index the current graph.`});
  }
  async train(options:Partial<LdaOptions>={}):Promise<void>{
    const graph=this.panel.getCompleteEltSet(),corpus=graphSearchCorpus(graph),pending=this.run(corpus,p=>this.session.train(corpus,options,p),"train"),generation=this.generation;
    await pending;
    if(this.disposed||generation!==this.generation)throw new SearchCancelledError();
    if(graph!==this.panel.getCompleteEltSet()||graphSearchCorpus(graph).key!==corpus.key)throw new Error("Training graph changed");
    const state=this.session.getState();this.publish({trained:state.trained,message:`Topic model ready: ${state.topics} topics.`,topicWords:state.topicWords});
  }
  async query(request:SearchRequest,limit=5,source?:FreshNode|null):Promise<FreshEdge[]>{
    const r=validateSearchRequest(request);if(!Number.isInteger(limit)||limit<1||limit>100)throw new RangeError("Choose 1–100 results");
    this.checkGraph();const graph=this.panel.getCompleteEltSet(),corpus=graphSearchCorpus(graph);
    const sourceLabel=source?.getLabel(),sourceQuery=source&&isSearchQueryNode(source)?JSON.stringify(source.getData().search):null;
    if(r.kind==="similarity"&&(!source||!graph.contains(source)||source.getID()!==r.query||isSearchQueryNode(source)))throw new Error("Select a content node for similarity search");
    if(source&&!graph.contains(source))throw new Error("Search source is outside the graph");
    const pending=this.run(corpus,()=>this.session.search(corpus,r,limit)),generation=this.generation;
    this.pendingSource=source??null;
    let results:SearchResult[];
    try{results=await pending;}finally{if(generation===this.generation)this.pendingSource=null;}
    // No asynchronous boundary between validation and mutation. A deleted source is never recreated.
    if(this.disposed||generation!==this.generation)throw new SearchCancelledError();
    if(graph!==this.panel.getCompleteEltSet()||source&&!graph.contains(source)||graphSearchCorpus(graph).key!==corpus.key)throw new Error("Search source or graph changed");
    if(sourceQuery!==null&&source&&(source.getLabel()!==sourceLabel||JSON.stringify(source.getData().search)!==sourceQuery))throw new Error("Query node changed; run the query again");
    let owner=source;
    if(r.kind!=="similarity"){
      if(!owner||!isSearchQueryNode(owner))owner=createGraphQuery(graph,r,source);
      else this.commitQuery(owner,r);
    }
    const edges=applyGraphSearchResults(graph,owner!,r,results,corpus);
    this.reveal(owner!,edges);this.publish({message:`${edges.length} result${edges.length===1?"":"s"} linked. Select a result relation to reject it.`});return edges;
  }
  /** Creates/selects the query before retrieval, so graph entry and deletion work even without a trained model. */
  createQuery(engine:SearchEngine,context:FreshNode|null=this.panel.getSelect() as FreshNode|null,options:Pick<SearchRequest,"metric"|"maxDistance">={}):FreshNode {
    if(this.disposed)throw new Error("Search controller disposed");
    this.checkGraph();this.cancel();
    const node=createGraphQueryDraft(this.graph,engine,context,options);this.reveal(node,[]);
    this.publish({message:"Type the query on its node; Enter searches, Escape cancels editing. Ctrl+Backspace/Delete removes the selected query."});
    return node;
  }
  /** Accept query text before launching a job. Failure retains the accepted text for correction/retry. */
  submitQuery(source:FreshNode,request:SearchRequest,limit=5):Promise<FreshEdge[]> {
    if(this.disposed)throw new Error("Search controller disposed");
    const r=validateSearchRequest(request);
    if(r.kind==="similarity"||!Number.isInteger(limit)||limit<1||limit>100)throw new TypeError("Choose a term/tag query and 1–100 results");
    if(!this.panel.getCompleteEltSet().contains(source)||!isSearchQueryNode(source))throw new Error("Select a current query node");
    this.commitQuery(source,r);this.panel.repaintAfterMove();
    return this.query(r,limit,source);
  }
  private commitQuery(owner:FreshNode,r:SearchRequest):void {
    const data=owner.getData(),search=data.search as Record<string,unknown>;
    owner.setData({...data,search:{...search,version:1,role:"query",draft:false,request:{...r}}} as Parameters<FreshNode["setData"]>[0]);
    owner.setLabel(`[${r.query}]`);owner.setSemanticType(r.engine==="lda"?"ldaquery":"lucenequery");
  }
  exportModel():LdaModel {this.checkGraph();return this.session.exportModel(graphSearchCorpus(this.panel.getCompleteEltSet()));}
  async loadModel(read:()=>Promise<unknown>):Promise<void>{
    const corpus=graphSearchCorpus(this.panel.getCompleteEltSet()),pending=this.run(corpus,()=>this.session.loadModel(corpus,read),"load"),generation=this.generation;
    await pending;if(this.disposed||generation!==this.generation)throw new SearchCancelledError();
    const state=this.session.getState();this.publish({trained:state.trained,topicWords:state.topicWords,message:`Topic model loaded: ${state.topics} topics.`});
  }
  similar(engine:SearchEngine,limit=5,options:Pick<SearchRequest,"metric"|"maxDistance">={}):Promise<FreshEdge[]>{const source=this.panel.getSelect();if(!(source instanceof FreshNode))return Promise.reject(new Error("Select a content node"));return this.query({engine,kind:"similarity",query:source.getID()!,...options},limit,source);}
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
  dispose():void {if(this.disposed)return;this.disposed=true;this.cancel();this.removeGraphChange();this.panel.removeGraphListener(this.graphListener);this.listeners.clear();this.session.dispose();}
}
