/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich.
 * Mathematical reimplementation of the FM2014/Dirichlet similarity contracts.
 * See docs/fm2014-retrieval-parity.md for source and bytecode provenance. */
import type {SearchMetric} from "../corpus/index.js";
import {topicSimilarity} from "./numeric.js";

function distribution(row:readonly number[]):void {
  if(!row.length||row.some(p=>!Number.isFinite(p)||p<0)||Math.abs(row.reduce((a,b)=>a+b,0)-1)>1e-8)throw new TypeError("Expected a normalized probability distribution");
}

/** The legacy helper calls this JS, but computes symmetric KL in bits. */
export function symmetricKlDistance(p:readonly number[],q:readonly number[]):number {
  distribution(p);distribution(q);if(p.length!==q.length)throw new TypeError("Topic dimensions differ");
  let distance=0;
  for(let k=0;k<p.length;k++){
    const a=p[k]!,b=q[k]!;
    if(a===b)continue;
    if(a===0||b===0)return Infinity;
    distance+=.5*(a-b)*(Math.log(a)-Math.log(b))/Math.LN2;
  }
  return Math.max(0,distance);
}

/** Bayes inversion with a uniform prior: rows p(column|row) -> rows p(row|column). */
export function posterior(likelihood:readonly (readonly number[])[]):number[][] {
  if(!likelihood.length)throw new TypeError("Empty probability matrix");
  likelihood.forEach(distribution);const columns=likelihood[0]!.length;
  if(likelihood.some(row=>row.length!==columns))throw new TypeError("Probability dimensions differ");
  return Array.from({length:columns},(_,column)=>{
    const total=likelihood.reduce((sum,row)=>sum+row[column]!,0);
    if(total===0)throw new RangeError("Posterior has zero evidence");
    return likelihood.map(row=>row[column]!/total);
  });
}

export interface LdaMatch {index:number;value:number;score:number}

/** Query/document/term relationships, with explicit score direction and immutable matrices. */
export class LdaSimilarities {
  private readonly phi:number[][];
  private readonly theta:number[][];
  private readonly termTopics:number[][];
  private readonly topicDocuments:number[][];
  constructor(phi:readonly (readonly number[])[],theta:readonly (readonly number[])[]){
    const topics=phi.length,terms=phi[0]?.length??0;
    if(!topics||topics>256||!terms||terms>100000||topics*terms>2000000||!theta.length||theta.length*topics>2000000)throw new RangeError("Semantic matrix dimensions exceed limits");
    if(phi.some(row=>row.length!==terms)||theta.some(row=>row.length!==topics))throw new TypeError("Topic dimensions differ");
    this.phi=phi.map(row=>[...row]);this.theta=theta.map(row=>[...row]);
    this.termTopics=posterior(this.phi);this.topicDocuments=posterior(this.theta);
  }
  private rank(query:readonly number[],candidates:readonly (readonly number[])[],predictive:readonly (readonly number[])[],metric:SearchMetric,limit:number,exclude=-1,maxDistance=Infinity,excluded:ReadonlySet<number>=new Set()):LdaMatch[]{
    distribution(query);
    if(!["symmetric-kl","predictive","jensen-shannon"].includes(metric))throw new TypeError("Unknown semantic metric");
    if(!Number.isInteger(limit)||limit<0||limit>1000||typeof maxDistance!=="number"||!(maxDistance>=0))throw new RangeError("Invalid semantic ranking limit");
    if(candidates.some(row=>row.length!==query.length))throw new TypeError("Topic dimensions differ");
    const results:LdaMatch[]=[];
    candidates.forEach((candidate,index)=>{
      if(index===exclude||excluded.has(index))return;
      const value=metric==="predictive"?query.reduce((sum,p,k)=>sum+p*predictive[k]![index]!,0):
        metric==="symmetric-kl"?symmetricKlDistance(query,candidate):1-topicSimilarity(query,candidate);
      if(!Number.isFinite(value)||metric!=="predictive"&&value>=maxDistance)return;
      const score=metric==="predictive"?value:metric==="jensen-shannon"?Math.max(0,1-value):1/(1+value);
      if(score>0)results.push({index,value,score});
    });
    return results.sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,limit);
  }
  queryDocs(query:readonly number[],metric:SearchMetric="symmetric-kl",limit=20,maxDistance=Infinity,excluded:ReadonlySet<number>=new Set()):LdaMatch[]{return this.rank(query,this.theta,this.topicDocuments,metric,limit,-1,maxDistance,excluded);}
  queryTerms(query:readonly number[],metric:SearchMetric="symmetric-kl",limit=20,maxDistance=Infinity):LdaMatch[]{return this.rank(query,this.termTopics,this.phi,metric,limit,-1,maxDistance);}
  docDocs(document:number,metric:SearchMetric="symmetric-kl",limit=10,maxDistance=Infinity):LdaMatch[]{return this.rank(this.document(document),this.theta,this.topicDocuments,metric,limit,document,maxDistance);}
  docTerms(document:number,metric:SearchMetric="symmetric-kl",limit=10,maxDistance=Infinity):LdaMatch[]{return this.queryTerms(this.document(document),metric,limit,maxDistance);}
  termDocs(term:number,metric:SearchMetric="symmetric-kl",limit=10,maxDistance=Infinity):LdaMatch[]{return this.queryDocs(this.term(term),metric,limit,maxDistance);}
  termTerms(term:number,metric:SearchMetric="symmetric-kl",limit=10,maxDistance=Infinity):LdaMatch[]{return this.rank(this.term(term),this.termTopics,this.phi,metric,limit,term,maxDistance);}
  private document(index:number):number[]{if(!Number.isInteger(index)||!this.theta[index])throw new RangeError("Unknown document");return this.theta[index]!;}
  private term(index:number):number[]{if(!Number.isInteger(index)||!this.termTopics[index])throw new RangeError("Unknown term");return this.termTopics[index]!;}
}
