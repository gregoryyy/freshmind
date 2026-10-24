/* SPDX-License-Identifier: GPL-3.0-or-later; Copyright (c) 2026 Gregor Heinrich.
 * Part of the LDA port; see gibbs.ts and licenses/LICENSE-GPL-3.0. No warranty. */
import {compareSearchIds,createSearchCorpus,searchTokens} from "../corpus/index.js";
import {rankSearchResults} from "../lexical/index.js";
import type {SearchCorpus,SearchResult} from "../corpus/index.js";
import {LdaGibbs,foldInLda,validateLdaOptions} from "./gibbs.js";
import type {LdaOptions} from "./gibbs.js";
import {topicSimilarity} from "./numeric.js";
export const LDA_MODEL_VERSION="fm4-lda-gibbs-1";
export interface LdaModel {version:typeof LDA_MODEL_VERSION;corpus:SearchCorpus;options:LdaOptions;vocabulary:string[];documentIds:string[];lengths:number[];theta:number[][];phi:number[][]}
export interface LdaProgress {iteration:number;iterations:number;tokens:number;vocabulary:number}
/** Iterate one sweep at a time; browser adapters can post progress or terminate between jobs. */
export function* trainLdaSteps(input:SearchCorpus,options:Partial<LdaOptions>={}):Generator<LdaProgress,LdaModel>{
  const corpus=createSearchCorpus(input.documents),o=validateLdaOptions(options),tokens=corpus.documents.map(d=>searchTokens(`${d.label} ${d.hint}`));
  const vocabulary=[...new Set(tokens.flat())].sort(compareSearchIds);if(!vocabulary.length)throw new Error("No searchable words in the corpus");
  const lookup=new Map(vocabulary.map((w,i)=>[w,i])),words=tokens.map(doc=>doc.map(t=>lookup.get(t)!)),gibbs=new LdaGibbs(words,vocabulary.length,o);
  const total=words.reduce((s,w)=>s+w.length,0);
  yield {iteration:0,iterations:o.iterations,tokens:total,vocabulary:vocabulary.length};
  for(let i=0;i<o.iterations;i++){gibbs.step();yield {iteration:i+1,iterations:o.iterations,tokens:total,vocabulary:vocabulary.length};}
  const {theta,phi}=gibbs.snapshot();
  return {version:LDA_MODEL_VERSION,corpus,options:o,vocabulary,documentIds:corpus.documents.map(d=>d.id),lengths:words.map(d=>d.length),theta,phi};
}
export function trainLda(corpus:SearchCorpus,options:Partial<LdaOptions>={}):LdaModel {const steps=trainLdaSteps(corpus,options);let next=steps.next();while(!next.done)next=steps.next();return next.value;}
/** Owns a detached, validated model and maps rows to stable document IDs. */
export class LdaSearchIndex {
  private readonly model:LdaModel;
  constructor(model:LdaModel){
    const o=validateLdaOptions(model.options),corpus=createSearchCorpus(model.corpus.documents),K=o.topics,V=model.vocabulary.length,M=corpus.documents.length;
    if(model.version!==LDA_MODEL_VERSION||!V||V>100000||K*V>2000000||M*K>2000000||new Set(model.vocabulary).size!==V||model.vocabulary.some(t=>typeof t!=="string"||!t)||model.documentIds.length!==M||model.theta.length!==M||model.lengths.length!==M||model.phi.length!==K||model.documentIds.some((id,m)=>id!==corpus.documents[m]!.id)||model.lengths.some(n=>!Number.isInteger(n)||n<0))throw new TypeError("Invalid LDA model dimensions/identities");
    const valid=(matrix:number[][],cols:number)=>matrix.every(row=>row.length===cols&&row.every(p=>Number.isFinite(p)&&p>=0)&&Math.abs(row.reduce((s,p)=>s+p,0)-1)<1e-8);
    if(!valid(model.theta,K)||!valid(model.phi,V))throw new TypeError("LDA probability rows must be normalized");
    this.model={version:LDA_MODEL_VERSION,corpus,options:o,vocabulary:[...model.vocabulary],documentIds:[...model.documentIds],lengths:[...model.lengths],theta:model.theta.map(r=>[...r]),phi:model.phi.map(r=>[...r])};
  }
  getModel():LdaModel{return structuredClone(this.model);}
  search(query:string,limit=20,iterations=50,seed=this.model.options.seed):SearchResult[]{
    const lookup=new Map(this.model.vocabulary.map((w,i)=>[w,i])),words=searchTokens(query).flatMap(t=>lookup.has(t)?[lookup.get(t)!]:[]);
    if(!words.length)return rankSearchResults([],limit);
    const {theta}=foldInLda(this.model.phi,words,this.model.options.alpha,iterations,seed);return this.rank(theta,limit);
  }
  similar(id:string,limit=10):SearchResult[]{const m=this.model.documentIds.indexOf(id);return m<0||!this.model.lengths[m]?rankSearchResults([],limit):this.rank(this.model.theta[m]!,limit,id);}
  private rank(theta:number[],limit:number,exclude?:string):SearchResult[]{return rankSearchResults(this.model.documentIds.flatMap((id,m)=>id!==exclude&&this.model.lengths[m]?[{id,score:topicSimilarity(theta,this.model.theta[m]!)}]:[]),limit);}
  topicWords(limit=10):{term:string;probability:number}[][] {
    if(!Number.isInteger(limit)||limit<0||limit>1000)throw new RangeError("Invalid topic-word limit");
    return this.model.phi.map(row=>row.map((probability,t)=>({term:this.model.vocabulary[t]!,probability})).sort((a,b)=>b.probability-a.probability||compareSearchIds(a.term,b.term)).slice(0,limit));
  }
}
