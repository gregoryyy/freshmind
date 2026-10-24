/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2005-2011 Gregor Heinrich (gregor :: arbylon : net).
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich.
 * Derived from org.knowceans.topics.simple.LdaGibbs, knowceans-ilda.
 * This program is free software: you can redistribute it and/or modify it under
 * the GNU General Public License, version 3 or (at your option) any later version.
 * It is distributed WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See licenses/LICENSE-GPL-3.0.
 */
import {CokusRandom} from "./cokus.js";
import {sampleCategorical} from "./numeric.js";
export interface LdaOptions {topics:number;alpha:number;beta:number;iterations:number;seed:number;minDocumentFrequency?:number}
export const defaultLdaOptions:Readonly<LdaOptions>=Object.freeze({topics:6,alpha:.1,beta:.01,iterations:100,seed:4357});
export function validateLdaOptions(options:Partial<LdaOptions>={}):LdaOptions {
  const o={...defaultLdaOptions,...options};
  if(!Number.isInteger(o.topics)||o.topics<1||o.topics>256||!Number.isInteger(o.iterations)||o.iterations<0||o.iterations>10000||!Number.isInteger(o.seed)||o.seed<0||o.seed>0xffffffff)throw new RangeError("Invalid topic count, iteration budget or seed");
  if([o.alpha,o.beta].some(p=>!Number.isFinite(p)||p<1e-9||p>1e6))throw new RangeError("LDA priors must be between 1e-9 and 1e6");
  if(o.minDocumentFrequency!==undefined&&(!Number.isInteger(o.minDocumentFrequency)||o.minDocumentFrequency<1||o.minDocumentFrequency>100000))throw new RangeError("Minimum document frequency must be 1–100000");
  return o;
}
const matrix=(rows:number,cols:number)=>Array.from({length:rows},()=>new Array<number>(cols).fill(0));
export interface GibbsSnapshot {iteration:number;theta:number[][];phi:number[][];documentTopicCounts:number[][];topicTermCounts:number[][];topicTotals:number[];assignments:number[][]}
/** Serial collapsed Gibbs port; stepping and snapshots make ownership and worker cancellation explicit. */
export class LdaGibbs {
  readonly options:LdaOptions;
  private readonly words:number[][];
  private readonly nmk:number[][];
  private readonly nkt:number[][];
  private readonly nk:number[];
  private readonly z:number[][];
  private readonly random:CokusRandom;
  private iteration=0;
  constructor(words:readonly (readonly number[])[],readonly vocabularySize:number,options:Partial<LdaOptions>={}){
    this.options=Object.freeze(validateLdaOptions(options));const K=this.options.topics;
    if(!Number.isInteger(vocabularySize)||vocabularySize<1||vocabularySize>100000||K*vocabularySize>2000000||words.length*K>2000000)throw new RangeError("LDA dimensions exceed limits");
    let total=0;
    for(const doc of words){if(!Array.isArray(doc)||doc.some(t=>!Number.isInteger(t)||t<0||t>=vocabularySize))throw new TypeError("Invalid LDA token ID");total+=doc.length;}
    if(total>2000000)throw new RangeError("LDA corpus exceeds two million tokens");
    this.words=words.map(d=>[...d]);this.random=new CokusRandom(this.options.seed);
    this.nmk=matrix(words.length,K);this.nkt=matrix(K,vocabularySize);this.nk=new Array(K).fill(0);
    this.z=this.words.map((doc,m)=>doc.map(t=>{const k=this.random.nextInt(K);this.nmk[m]![k]!++;this.nkt[k]![t]!++;this.nk[k]!++;return k;}));
  }
  step(iterations=1):void {
    if(!Number.isInteger(iterations)||iterations<0||this.iteration+iterations>10000)throw new RangeError("Invalid sampling iteration budget");
    const {topics:K,alpha,beta}=this.options,weights=new Array<number>(K);
    for(let it=0;it<iterations;it++){
      for(let m=0;m<this.words.length;m++)for(let n=0;n<this.words[m]!.length;n++){
        const t=this.words[m]![n]!,old=this.z[m]![n]!;this.nmk[m]![old]!--;this.nkt[old]![t]!--;this.nk[old]!--;
        for(let k=0;k<K;k++)weights[k]=(this.nmk[m]![k]!+alpha)*(this.nkt[k]![t]!+beta)/(this.nk[k]!+this.vocabularySize*beta);
        const k=sampleCategorical(weights,this.random.nextDouble());this.z[m]![n]=k;this.nmk[m]![k]!++;this.nkt[k]![t]!++;this.nk[k]!++;
      }this.iteration++;
    }
  }
  snapshot():GibbsSnapshot {
    const {topics:K,alpha,beta}=this.options;
    return {iteration:this.iteration,theta:this.nmk.map((row,m)=>row.map(c=>(c+alpha)/(this.words[m]!.length+K*alpha))),
      phi:this.nkt.map((row,k)=>row.map(c=>(c+beta)/(this.nk[k]!+this.vocabularySize*beta))),
      documentTopicCounts:this.nmk.map(r=>[...r]),topicTermCounts:this.nkt.map(r=>[...r]),topicTotals:[...this.nk],assignments:this.z.map(r=>[...r])};
  }
}
/** Fixed-phi query chain. Training matrices are read only; OOV filtering happens before this boundary. */
export function foldInLda(phi:readonly (readonly number[])[],words:readonly number[],alpha:number,iterations=50,seed=4357):{theta:number[];perplexity:number|null}{
  const K=phi.length,V=phi[0]?.length??0;
  validateLdaOptions({topics:K,alpha,iterations,seed});
  if(!V||K*V>2000000||phi.some(row=>row.length!==V||row.some(p=>!Number.isFinite(p)||p<0)||Math.abs(row.reduce((s,p)=>s+p,0)-1)>1e-8))throw new TypeError("Invalid topic-term matrix");
  if(words.length>2000000||words.some(t=>!Number.isInteger(t)||t<0||t>=V))throw new TypeError("Invalid query tokens");
  const rand=new CokusRandom(seed),counts=new Array<number>(K).fill(0),z=words.map(()=>{const k=rand.nextInt(K);counts[k]!++;return k;}),weights=new Array<number>(K);
  for(let it=0;it<iterations;it++)for(let n=0;n<words.length;n++){
    counts[z[n]!]!--;for(let k=0;k<K;k++)weights[k]=(counts[k]!+alpha)*phi[k]![words[n]!]!;
    const k=sampleCategorical(weights,rand.nextDouble());z[n]=k;counts[k]!++;
  }
  const theta=counts.map(c=>(c+alpha)/(words.length+K*alpha));let loglik=0;
  for(const t of words){const probability=theta.reduce((s,p,k)=>s+p*phi[k]![t]!,0);if(probability<=0)throw new RangeError("Query word has no topic probability");loglik+=Math.log(probability);}
  const perplexity=words.length?Math.exp(-loglik/words.length):null;
  if(perplexity!==null&&!Number.isFinite(perplexity))throw new RangeError("Nonfinite query perplexity");
  return {theta,perplexity};
}
