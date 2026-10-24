/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {compareSearchIds,createSearchCorpus,normalizeSearchText,searchTokens} from "./corpus.js";
import {parseSearchQuery} from "./query.js";
import type {SearchCorpus,SearchDocument,SearchQuery,SearchResult} from "./types.js";
type TextField="content"|"label"|"hint";
type Vector=Map<string,number>;
type Row={doc:SearchDocument;tokens:Record<TextField,string[]>;vectors:Record<TextField,Vector>};
export function rankSearchResults(scores:readonly {id:string;score:number}[],limit=20):SearchResult[]{
  if(!Number.isInteger(limit)||limit<0||limit>1000)throw new RangeError("Result limit must be 0–1000");
  const sorted=scores.filter(r=>Number.isFinite(r.score)&&r.score>0).sort((a,b)=>b.score-a.score||compareSearchIds(a.id,b.id)).slice(0,limit);
  const max=sorted[0]?.score??1;return sorted.map((r,i)=>({...r,relevance:Math.min(1,r.score/max),rank:i+1}));
}
/** Immutable field/term-vector index. No graph, browser, filesystem or Lucene binary ownership. */
export class LexicalSearchIndex {
  private readonly corpus:SearchCorpus;
  private readonly rows:Row[];
  private readonly df:Record<TextField,Map<string,number>>={content:new Map(),label:new Map(),hint:new Map()};
  constructor(corpus:SearchCorpus){
    this.corpus=createSearchCorpus(corpus.documents);
    this.rows=this.corpus.documents.map(doc=>{
      const tokens={content:searchTokens(`${doc.label} ${doc.hint}`,false),label:searchTokens(doc.label,false),hint:searchTokens(doc.hint,false)};
      const vectors={} as Record<TextField,Vector>;
      for(const f of ["content","label","hint"] as const){const v=new Map<string,number>();for(const t of searchTokens(f==="content"?`${doc.label} ${doc.hint}`:doc[f]))v.set(t,(v.get(t)??0)+1);vectors[f]=v;
        for(const t of v.keys())this.df[f].set(t,(this.df[f].get(t)??0)+1);}
      return {doc,tokens,vectors};
    });
  }
  getCorpus():SearchCorpus{return createSearchCorpus(this.corpus.documents);}
  matches(corpus:SearchCorpus):boolean{return this.corpus.key===corpus.key;}
  private weight(f:TextField,term:string,tf:number):number{return Math.sqrt(tf)*(1+Math.log((this.rows.length+1)/((this.df[f].get(term)??0)+1)));}
  search(input:string,limit=20):SearchResult[]{
    const query=parseSearchQuery(input);if(!query)return rankSearchResults([],limit);
    const positives=(q:SearchQuery,negated=false):boolean=>q.kind==="term"?!negated:q.kind==="not"?positives(q.child,!negated):positives(q.left,negated)||positives(q.right,negated);
    if(!positives(query))return rankSearchResults([],limit);
    // Expand once, before visiting documents; bound work even when the corpus is empty.
    const expansions=new Map<SearchQuery,string[]>();
    const prepare=(q:SearchQuery):void=>{
      if(q.kind==="not")prepare(q.child);else if(q.kind!=="term"){prepare(q.left);prepare(q.right);}else if(q.prefix){
        const prefix=searchTokens(q.value);if(prefix.length!==1)throw new SyntaxError("Prefix must contain one searchable term");
        const terms=[...this.df[q.field as TextField].keys()].filter(t=>t.startsWith(prefix[0]!));
        if(terms.length>256)throw new RangeError("Prefix expands to more than 256 terms");expansions.set(q,terms);
      }
    };prepare(query);
    const term=(q:Extract<SearchQuery,{kind:"term"}>,row:Row):{match:boolean;score:number}=>{
      const f=q.field;
      if(["id","type","tag"].includes(f)){
        const value=f==="id"?q.value:normalizeSearchText(q.value);
        const match=f==="tag"?row.doc.tags.includes(value):f==="id"?row.doc.id===value:normalizeSearchText(row.doc.type)===value;
        return {match,score:match?1:0};
      }
      const field=f as TextField,terms=expansions.get(q)??searchTokens(q.value),positions=searchTokens(q.value,false),all=row.tokens[field];
      const phraseMatch=!q.phrase||positions.length>0&&all.some((_,i)=>positions.every((t,j)=>all[i+j]===t));
      const matched=terms.filter(t=>row.vectors[field].has(t));
      const match=phraseMatch&&(q.phrase?terms.length>0&&matched.length===terms.length:matched.length>0);
      const length=[...row.vectors[field].values()].reduce((a,b)=>a+b,0);
      return {match,score:match?matched.reduce((sum,t)=>sum+this.weight(field,t,row.vectors[field].get(t)!),0)/Math.sqrt(Math.max(1,length)):0};
    };
    const evaluate=(q:SearchQuery,row:Row,negated=false):{match:boolean;score:number}=>{
      if(q.kind==="term"){const r=term(q,row);return negated?{match:!r.match,score:0}:r;}
      if(q.kind==="not")return evaluate(q.child,row,!negated);
      const a=evaluate(q.left,row,negated),b=evaluate(q.right,row,negated),match=(q.kind==="and")!==negated?a.match&&b.match:a.match||b.match;
      return {match,score:match?a.score+b.score:0};
    };
    return rankSearchResults(this.rows.flatMap(row=>{const r=evaluate(query,row);return r.match&&r.score>0?[{id:row.doc.id,score:r.score}]:[];}),limit);
  }
  tags(tags:readonly string[],limit=20):SearchResult[]{
    if(tags.some(t=>typeof t!=="string"||!t.trim()))throw new TypeError("Tags must be nonempty strings");
    const normalized=[...new Set(tags.map(normalizeSearchText))];
    return rankSearchResults(normalized.length?this.rows.filter(r=>normalized.every(t=>r.doc.tags.includes(t))).map(r=>({id:r.doc.id,score:1})):[],limit);
  }
  similar(id:string,limit=10):SearchResult[]{
    const source=this.rows.find(r=>r.doc.id===id);if(!source)return rankSearchResults([],limit);
    const vector=(row:Row)=>new Map([...row.vectors.content].map(([t,tf])=>[t,this.weight("content",t,tf)]));
    const a=vector(source),norm=(v:Vector)=>Math.sqrt([...v.values()].reduce((s,n)=>s+n*n,0)),an=norm(a);
    return rankSearchResults(this.rows.filter(r=>r!==source).map(row=>{const b=vector(row),bn=norm(b);return {id:row.doc.id,score:an&&bn?Math.min(1,[...a].reduce((sum,[t,w])=>sum+w*(b.get(t)??0),0)/(an*bn)):0};}),limit);
  }
}
