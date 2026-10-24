/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import elasticlunr from "./elasticlunr-runtime.js";
import {compareSearchIds,createSearchCorpus,normalizeSearchText,searchTokens} from "../corpus/index.js";
import {parseSearchQuery} from "./query.js";
import type {SearchCorpus,SearchDocument,SearchQuery,SearchResult} from "../corpus/index.js";

export const LITERAL_SEARCH_BACKEND="elasticlunr-0.9.5";
type TextField="content"|"label"|"hint";
type Row={doc:SearchDocument;ref:string;tokens:Record<TextField,string[]>};
type Match={match:boolean;score:number};
const fields=["content","label","hint"] as const;

export function rankSearchResults(scores:readonly {id:string;score:number}[],limit=20):SearchResult[]{
  if(!Number.isInteger(limit)||limit<0||limit>1000)throw new RangeError("Result limit must be 0–1000");
  const sorted=scores.filter(r=>Number.isFinite(r.score)&&r.score>0)
    .sort((a,b)=>b.score-a.score||compareSearchIds(a.id,b.id)).slice(0,limit);
  const max=sorted[0]?.score??1;
  return sorted.map((r,i)=>({...r,relevance:Math.min(1,r.score/max),rank:i+1}));
}

/** Elasticlunr postings/ranking with the bounded FM query grammar and exact metadata filters. */
export class LexicalSearchIndex {
  private readonly corpus:SearchCorpus;
  private readonly rows:Row[];
  private readonly engine=elasticlunr();
  private readonly vocabulary:Record<TextField,Set<string>>={content:new Set(),label:new Set(),hint:new Set()};

  constructor(corpus:SearchCorpus){
    this.corpus=createSearchCorpus(corpus.documents);
    this.engine.setRef("ref");this.engine.saveDocument(false);
    // FM's StopAnalyzer does not stem. Analyze explicitly for shared Unicode/stop-word
    // semantics with LDA; never change elasticlunr's process-global tokenizer/pipeline.
    this.engine.pipeline.reset();
    for(const field of fields)this.engine.addField(field);
    this.rows=this.corpus.documents.map((doc,i)=>{
      // External IDs such as __proto__ never become keys in the engine's plain objects.
      const ref=`document-${i}`;
      const tokens={content:searchTokens(`${doc.label} ${doc.hint}`,false),label:searchTokens(doc.label,false),hint:searchTokens(doc.hint,false)};
      const analyzed={content:searchTokens(`${doc.label} ${doc.hint}`),label:searchTokens(doc.label),hint:searchTokens(doc.hint)};
      for(const field of fields)for(const term of analyzed[field])this.vocabulary[field].add(term);
      this.engine.addDoc({ref,...analyzed});
      return {doc,ref,tokens};
    });
  }

  getCorpus():SearchCorpus{return createSearchCorpus(this.corpus.documents);}
  matches(corpus:SearchCorpus):boolean{return this.corpus.key===corpus.key;}
  private rank(scores:readonly {id:string;score:number}[],limit:number,backend=LITERAL_SEARCH_BACKEND):SearchResult[]{return rankSearchResults(scores,limit).map(result=>({...result,backend}));}

  private fieldScores(terms:string[],field:TextField,boost=1):Map<string,number>{
    if(!terms.length)return new Map();
    return new Map(this.engine.search(terms.join(" "),{fields:{[field]:{boost,bool:"OR",expand:false}}})
      .map(result=>[result.ref,result.score]));
  }

  search(input:string,limit=20):SearchResult[]{
    const query=parseSearchQuery(input);if(!query)return rankSearchResults([],limit);
    const positives=(q:SearchQuery,negated=false):boolean=>q.kind==="term"?!negated:
      q.kind==="not"?positives(q.child,!negated):positives(q.left,negated)||positives(q.right,negated);
    if(!positives(query))return rankSearchResults([],limit);
    const scores=new Map<SearchQuery,Map<string,number>>();
    const prepare=(q:SearchQuery):void=>{
      if(q.kind==="not")prepare(q.child);
      else if(q.kind!=="term"){prepare(q.left);prepare(q.right);}
      else if(fields.includes(q.field as TextField)){
        const field=q.field as TextField;let terms=searchTokens(q.value);
        if(q.prefix){
          if(terms.length!==1)throw new SyntaxError("Prefix must contain one searchable term");
          const prefix=terms[0]!;
          terms=[...this.vocabulary[field]].filter(term=>term.startsWith(prefix));
          if(terms.length>256)throw new RangeError("Prefix expands to more than 256 terms");
        }
        scores.set(q,this.fieldScores(terms,field));
      }
    };
    prepare(query);
    const term=(q:Extract<SearchQuery,{kind:"term"}>,row:Row):Match=>{
      if(["id","type","tag"].includes(q.field)){
        const value=q.field==="id"?q.value:normalizeSearchText(q.value);
        const match=q.field==="tag"?row.doc.tags.includes(value):q.field==="id"?row.doc.id===value:normalizeSearchText(row.doc.type)===value;
        return {match,score:match?1:0};
      }
      const score=scores.get(q)?.get(row.ref);
      const positions=searchTokens(q.value,false),all=row.tokens[q.field as TextField];
      const phraseMatch=!q.phrase||positions.length>0&&all.some((_,i)=>positions.every((token,j)=>all[i+j]===token));
      const match=score!==undefined&&phraseMatch;
      return {match,score:match?score!:0};
    };
    const evaluate=(q:SearchQuery,row:Row,negated=false):Match=>{
      if(q.kind==="term"){const result=term(q,row);return negated?{match:!result.match,score:0}:result;}
      if(q.kind==="not")return evaluate(q.child,row,!negated);
      const a=evaluate(q.left,row,negated),b=evaluate(q.right,row,negated);
      const match=(q.kind==="and")!==negated?a.match&&b.match:a.match||b.match;
      return {match,score:match?a.score+b.score:0};
    };
    return this.rank(this.rows.flatMap(row=>{const result=evaluate(query,row);return result.match?[{id:row.doc.id,score:result.score}]:[];}),limit);
  }

  tags(tags:readonly string[],limit=20):SearchResult[]{
    if(tags.some(tag=>typeof tag!=="string"||!tag.trim()))throw new TypeError("Tags must be nonempty strings");
    const normalized=[...new Set(tags.map(normalizeSearchText))];
    return this.rank(normalized.length?this.rows.filter(row=>normalized.every(tag=>row.doc.tags.includes(tag))).map(row=>({id:row.doc.id,score:1})):[],limit,"exact-tags-1");
  }

  /** FM2014 more-like-this: label and content term queries, with the source excluded. */
  similar(id:string,limit=10):SearchResult[]{
    const source=this.rows.find(row=>row.doc.id===id);if(!source)return rankSearchResults([],limit);
    const terms=[...new Set(searchTokens(`${source.doc.label} ${source.doc.hint}`))].slice(0,1024);
    const labels=this.fieldScores(searchTokens(source.doc.label).slice(0,1024),"label");
    const content=this.fieldScores(terms,"content");
    return this.rank(this.rows.filter(row=>row!==source).map(row=>({id:row.doc.id,score:(labels.get(row.ref)??0)+(content.get(row.ref)??0)})),limit);
  }
}
