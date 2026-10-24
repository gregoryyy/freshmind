/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
/** Linear categorical draw, with validated finite mass and a roundoff fallback. */
export function sampleCategorical(weights:readonly number[],uniform:number):number {
  const sum=weights.reduce((s,p)=>s+p,0);
  if(!weights.length||weights.some(p=>!Number.isFinite(p)||p<0)||!Number.isFinite(sum)||sum<=0||!Number.isFinite(uniform)||uniform<0||uniform>=1)throw new RangeError("Invalid categorical distribution/draw");
  let partial=0,last=0;const u=uniform*sum;
  for(let k=0;k<weights.length;k++){partial+=weights[k]!;if(weights[k]!>0)last=k;if(u<partial)return k;}return last;
}
function distribution(p:readonly number[]):void {if(!p.length||p.some(v=>!Number.isFinite(v)||v<0)||Math.abs(p.reduce((s,v)=>s+v,0)-1)>1e-8)throw new TypeError("Expected a normalized probability distribution");}
/** True midpoint Jensen–Shannon similarity, unlike the legacy symmetric-KL helper. */
export function topicSimilarity(p:readonly number[],q:readonly number[]):number {
  distribution(p);distribution(q);if(p.length!==q.length)throw new TypeError("Topic dimensions differ");
  let js=0;for(let k=0;k<p.length;k++){const a=p[k]!,b=q[k]!,m=(a+b)/2;if(a>0)js+=.5*a*Math.log(a/m);if(b>0)js+=.5*b*Math.log(b/m);}
  return Math.max(0,Math.min(1,1-js/Math.LN2));
}
