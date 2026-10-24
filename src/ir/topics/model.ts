/* SPDX-License-Identifier: GPL-3.0-or-later; Copyright (c) 2026 Gregor Heinrich.
 * Part of the LDA port; see gibbs.ts and licenses/LICENSE-GPL-3.0. No warranty. */
import {compareSearchIds,createSearchCorpus,searchTokens} from "../corpus/index.js";
import {rankSearchResults} from "../lexical/index.js";
import type {SearchCorpus,SearchResult,SearchMetric} from "../corpus/index.js";
import {LdaGibbs,foldInLda,validateLdaOptions} from "./gibbs.js";
import type {LdaOptions} from "./gibbs.js";
import {topicSimilarity} from "./numeric.js";
import {LdaSimilarities} from "./similarities.js";
export const LDA_MODEL_VERSION="fm4-lda-gibbs-1";
export interface LdaModel {version:typeof LDA_MODEL_VERSION;corpus:SearchCorpus;options:LdaOptions;vocabulary:string[];documentIds:string[];lengths:number[];theta:number[][];phi:number[][]}
export interface LdaProgress {iteration:number;iterations:number;tokens:number;vocabulary:number}
export interface LdaRetrievalOptions {metric?:SearchMetric;maxDistance?:number;similarityMaxDistance?:number;queryIterations?:number}
/** Iterate one sweep at a time; browser adapters can post progress or terminate between jobs. */
export function* trainLdaSteps(input:SearchCorpus,options:Partial<LdaOptions>={}):Generator<LdaProgress,LdaModel>{
  const corpus=createSearchCorpus(input.documents),o=validateLdaOptions(options),tokens=corpus.documents.map(d=>searchTokens(`${d.label} ${d.hint}`));
  const frequency=new Map<string,number>();for(const document of tokens)for(const term of new Set(document))frequency.set(term,(frequency.get(term)??0)+1);
  const vocabulary=[...frequency.keys()].filter(term=>frequency.get(term)!>=(o.minDocumentFrequency??1)).sort(compareSearchIds);
  if(!vocabulary.length)throw new Error("No searchable words at the selected minimum document frequency");
  const lookup=new Map(vocabulary.map((w,i)=>[w,i])),words=tokens.map(doc=>doc.flatMap(t=>lookup.has(t)?[lookup.get(t)!]:[])),gibbs=new LdaGibbs(words,vocabulary.length,o);
  const total=words.reduce((s,w)=>s+w.length,0);
  yield {iteration:0,iterations:o.iterations,tokens:total,vocabulary:vocabulary.length};
  for(let i=0;i<o.iterations;i++){gibbs.step();yield {iteration:i+1,iterations:o.iterations,tokens:total,vocabulary:vocabulary.length};}
  const {theta,phi}=gibbs.snapshot();
  return {version:LDA_MODEL_VERSION,corpus,options:o,vocabulary,documentIds:corpus.documents.map(d=>d.id),lengths:words.map(d=>d.length),theta,phi};
}
export function trainLda(corpus:SearchCorpus,options:Partial<LdaOptions>={}):LdaModel {const steps=trainLdaSteps(corpus,options);let next=steps.next();while(!next.done)next=steps.next();return next.value;}
/** Owns a detached, validated model and maps rows to stable document IDs. */
export class LdaSearchIndex {
  protected readonly model:LdaModel;
  protected readonly retrieval:LdaRetrievalOptions|undefined;
  private similarities:LdaSimilarities|undefined;
  constructor(model:LdaModel,retrieval?:LdaRetrievalOptions){
    const o=validateLdaOptions(model.options),corpus=createSearchCorpus(model.corpus.documents),K=o.topics,V=model.vocabulary.length,M=corpus.documents.length;
    if(model.version!==LDA_MODEL_VERSION||!V||V>100000||K*V>2000000||M*K>2000000||new Set(model.vocabulary).size!==V||model.vocabulary.some(t=>typeof t!=="string"||!t)||model.documentIds.length!==M||model.theta.length!==M||model.lengths.length!==M||model.phi.length!==K||model.documentIds.some((id,m)=>id!==corpus.documents[m]!.id)||model.lengths.some(n=>!Number.isInteger(n)||n<0))throw new TypeError("Invalid LDA model dimensions/identities");
    const valid=(matrix:number[][],cols:number)=>matrix.every(row=>row.length===cols&&row.every(p=>Number.isFinite(p)&&p>=0)&&Math.abs(row.reduce((s,p)=>s+p,0)-1)<1e-8);
    if(!valid(model.theta,K)||!valid(model.phi,V))throw new TypeError("LDA probability rows must be normalized");
    this.model={version:LDA_MODEL_VERSION,corpus,options:o,vocabulary:[...model.vocabulary],documentIds:[...model.documentIds],lengths:[...model.lengths],theta:model.theta.map(r=>[...r]),phi:model.phi.map(r=>[...r])};
    if(retrieval){
      if(retrieval.metric!==undefined&&!["symmetric-kl","predictive","jensen-shannon"].includes(retrieval.metric))throw new TypeError("Unknown semantic metric");
      for(const value of [retrieval.maxDistance,retrieval.similarityMaxDistance])if(value!==undefined&&(typeof value!=="number"||!(value>=0)))throw new RangeError("Invalid semantic distance limit");
      if(retrieval.queryIterations!==undefined&&(!Number.isInteger(retrieval.queryIterations)||retrieval.queryIterations<0||retrieval.queryIterations>10000))throw new RangeError("Invalid query iteration budget");
      this.retrieval={...retrieval};
    }
  }
  getModel():LdaModel{return structuredClone(this.model);}
  getWords(query:string):number[]{
    if(typeof query!=="string"||query.length>4096)throw new TypeError("Query must be at most 4096 characters");
    const lookup=new Map(this.model.vocabulary.map((w,i)=>[w,i]));return searchTokens(query).flatMap(t=>lookup.has(t)?[lookup.get(t)!]:[]);
  }
  getTopics(query:string,iterations=this.retrieval?.queryIterations??50,seed=this.model.options.seed):number[]{return foldInLda(this.model.phi,this.getWords(query),this.model.options.alpha,iterations,seed).theta;}
  search(query:string,limit=20,iterations=this.retrieval?.queryIterations??50,seed=this.model.options.seed):SearchResult[]{
    const words=this.getWords(query);
    if(!words.length)return rankSearchResults([],limit);
    const {theta}=foldInLda(this.model.phi,words,this.model.options.alpha,iterations,seed);return this.rank(theta,limit,undefined,this.retrieval?.maxDistance);
  }
  similar(id:string,limit=10):SearchResult[]{const m=this.model.documentIds.indexOf(id);return m<0||!this.model.lengths[m]?rankSearchResults([],limit):this.rank(this.model.theta[m]!,limit,id,this.retrieval?.similarityMaxDistance??this.retrieval?.maxDistance);}
  getSimilarities():LdaSimilarities{return this.similarities??=new LdaSimilarities(this.model.phi,this.model.theta);}
  protected rank(theta:number[],limit:number,exclude?:string,maxDistance=Infinity):SearchResult[]{
    if(!this.retrieval)return rankSearchResults(this.model.documentIds.flatMap((id,m)=>id!==exclude&&this.model.lengths[m]?[{id,score:topicSimilarity(theta,this.model.theta[m]!)}]:[]),limit);
    const metric=this.retrieval.metric??"symmetric-kl",excluded=new Set<number>();
    this.model.documentIds.forEach((id,m)=>{if(id===exclude||!this.model.lengths[m])excluded.add(m);});
    const matches=this.getSimilarities().queryDocs(theta,metric,limit,maxDistance,excluded);
    const rows=matches.map(match=>({id:this.model.documentIds[match.index]!,score:match.score,value:match.value}));
    const details=new Map(rows.map(row=>[row.id,row.value]));
    return rankSearchResults(rows,limit).map(result=>({...result,metric,value:details.get(result.id)!,backend:"fm2014-lda-1"}));
  }
  topicWords(limit=10):{term:string;probability:number}[][] {
    if(!Number.isInteger(limit)||limit<0||limit>1000)throw new RangeError("Invalid topic-word limit");
    return this.model.phi.map(row=>row.map((probability,t)=>({term:this.model.vocabulary[t]!,probability})).sort((a,b)=>b.probability-a.probability||compareSearchIds(a.term,b.term)).slice(0,limit));
  }
}

/** FM2014 query defaults; the older LdaSearchIndex default remains available for archived experiments. */
export class LdaQueryClient extends LdaSearchIndex {
  constructor(model:LdaModel,options:LdaRetrievalOptions={}){
    super(model,{metric:"symmetric-kl",maxDistance:.6,similarityMaxDistance:options.maxDistance??.2,queryIterations:100,...options});
  }
  getDocResults(query:string|readonly number[],limit=5):SearchResult[]{return typeof query==="string"?this.search(query,limit):this.rank([...query],limit,undefined,this.retrieval?.maxDistance);}
  getDocSimilarities(id:string,limit=10):SearchResult[]{return this.similar(id,limit);}
  getTermResults(query:string|readonly number[],limit=5,metric:SearchMetric=this.retrieval?.metric??"symmetric-kl"): {term:string;value:number;score:number}[]{
    rankSearchResults([],limit);if(typeof query==="string"&&!this.getWords(query).length)return [];
    const topics=typeof query==="string"?this.getTopics(query):query;
    return this.getSimilarities().queryTerms(topics,metric,limit,this.retrieval?.maxDistance??.6).map(result=>({term:this.model.vocabulary[result.index]!,value:result.value,score:result.score}));
  }
  getTermSimilarities(term:string,limit=5):{term:string;value:number;score:number}[]{
    rankSearchResults([],limit);const words=this.getWords(term);if(!words.length)return [];
    if(words.length!==1)throw new TypeError("Choose one vocabulary term");
    return this.getSimilarities().termTerms(words[0]!,this.retrieval?.metric,limit,this.retrieval?.maxDistance)
      .map(result=>({term:this.model.vocabulary[result.index]!,value:result.value,score:result.score}));
  }
  getDocTermSimilarities(id:string,limit=5):{term:string;value:number;score:number}[]{
    rankSearchResults([],limit);const index=this.model.documentIds.indexOf(id);if(index<0||!this.model.lengths[index])return [];
    return this.getTermResults(this.model.theta[index]!,limit);
  }
  getTermDocSimilarities(term:string,limit=5):SearchResult[]{
    rankSearchResults([],limit);const words=this.getWords(term);if(!words.length)return [];
    if(words.length!==1)throw new TypeError("Choose one vocabulary term");
    // Bayes inversion of p(term|topic), with a uniform topic prior.
    const masses=this.model.phi.map(row=>row[words[0]!]!),total=masses.reduce((a,b)=>a+b,0);
    if(total<=0)return [];
    return this.getDocResults(masses.map(p=>p/total),limit);
  }
}
