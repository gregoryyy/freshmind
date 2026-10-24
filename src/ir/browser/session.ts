/* SPDX-License-Identifier: GPL-3.0-or-later; Copyright (c) 2026 Gregor Heinrich.
 * Prototype model ownership extracted from Freshmind; see licenses/LICENSE-GPL-3.0. */
import {createSearchCorpus,validateSearchRequest} from "../corpus/index.js";
import type {SearchCorpus,SearchRequest,SearchResult} from "../corpus/index.js";
import {LdaSearchIndex,validateLdaOptions} from "../topics/index.js";
import type {LdaModel,LdaOptions,LdaProgress} from "../topics/index.js";
import {SearchWorkerClient,SearchCancelledError} from "./worker-client.js";
import type {SearchWorkerFactory} from "./worker-client.js";

export interface SearchSessionState {busy:boolean;trained:boolean;topics:number|null;topicWords:string[][]}

/** Search-owned prototype model/cache. Takes document snapshots and IDs, never graph or panel objects. */
export class SearchSession {
  private readonly jobs:SearchWorkerClient;
  private model:LdaModel|undefined;
  private topicWords:string[][]=[];
  private generation=0;
  private disposed=false;
  constructor(workerFactory?:SearchWorkerFactory){this.jobs=new SearchWorkerClient(workerFactory);}
  getState():SearchSessionState{return {busy:this.jobs.busy,trained:!!this.model,topics:this.model?.options.topics??null,topicWords:this.topicWords.map(row=>[...row])};}
  private check(generation:number):void {if(this.disposed||generation!==this.generation)throw new SearchCancelledError();}
  /** Explicit index check for the historical command; ordinary literal queries still index their own current snapshot. */
  async index(input:SearchCorpus):Promise<number>{
    if(this.disposed)throw new Error("Search session disposed");
    const corpus=createSearchCorpus(input.documents),generation=++this.generation;
    const answer=await this.jobs.run({kind:"index",corpus});this.check(generation);
    if(answer.kind!=="indexed"||answer.key!==corpus.key||answer.documents!==corpus.documents.length)throw new Error("Indexed snapshot does not match the requested corpus");
    return answer.documents;
  }
  async train(input:SearchCorpus,options:Partial<LdaOptions>={},onProgress?:(progress:LdaProgress)=>void):Promise<void>{
    if(this.disposed)throw new Error("Search session disposed");
    const o=validateLdaOptions(options),corpus=createSearchCorpus(input.documents),generation=++this.generation;
    const answer=await this.jobs.run({kind:"train",corpus,options:o},onProgress);this.check(generation);
    if(answer.kind!=="trained")throw new Error("Unexpected search worker response");
    const index=new LdaSearchIndex(answer.model),model=index.getModel();
    if(model.corpus.key!==corpus.key)throw new Error("Trained model does not match the requested corpus");
    this.model=model;this.topicWords=index.topicWords(6).map(row=>row.map(w=>w.term));
  }
  async search(input:SearchCorpus,request:SearchRequest,limit=20):Promise<SearchResult[]>{
    if(this.disposed)throw new Error("Search session disposed");
    const corpus=createSearchCorpus(input.documents),r=validateSearchRequest(request);
    if(!Number.isInteger(limit)||limit<0||limit>1000)throw new RangeError("Result limit must be 0–1000");
    if(r.engine==="lda"&&r.kind!=="tags"&&(!this.model||this.model.corpus.key!==corpus.key)){
      this.model=undefined;this.topicWords=[];throw new Error("Train a topic model for the current corpus first");
    }
    const generation=++this.generation;
    const answer=await this.jobs.run({kind:"search",corpus,request:r,limit,model:r.engine==="lda"&&r.kind!=="tags"?this.model:undefined});this.check(generation);
    if(answer.kind!=="results")throw new Error("Unexpected search worker response");return answer.results;
  }
  exportModel(input:SearchCorpus):LdaModel {
    if(this.disposed)throw new Error("Search session disposed");
    const corpus=createSearchCorpus(input.documents);
    if(!this.model||this.model.corpus.key!==corpus.key)throw new Error("Train or load a topic model for the current corpus first");
    return new LdaSearchIndex(this.model).getModel();
  }
  async loadModel(input:SearchCorpus,read:()=>Promise<unknown>):Promise<void>{
    if(this.disposed)throw new Error("Search session disposed");
    const corpus=createSearchCorpus(input.documents);this.cancel();const generation=this.generation;
    const candidate=await read();this.check(generation);
    if(!candidate||typeof candidate!=="object")throw new TypeError("Invalid topic model file");
    const index=new LdaSearchIndex(candidate as LdaModel),model=index.getModel();
    if(model.corpus.key!==corpus.key)throw new Error("Topic model belongs to a different corpus");
    this.model=model;this.topicWords=index.topicWords(6).map(row=>row.map(word=>word.term));
  }
  cancel():void {this.generation++;this.jobs.cancel();}
  reset():void {this.cancel();this.model=undefined;this.topicWords=[];}
  dispose():void {if(this.disposed)return;this.disposed=true;this.reset();this.jobs.dispose();}
}
