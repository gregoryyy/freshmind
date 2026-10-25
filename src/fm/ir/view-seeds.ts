/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {FreshGraph,JsonValue} from "../model/index.js";
import {searchResultMetadata} from "./graph.js";
import {graphSearchCorpus,isSearchQueryNode} from "./corpus.js";
import {validateSearchRequest} from "../../ir/corpus/index.js";
import type {SearchRequest} from "../../ir/corpus/index.js";
export interface GraphSearchSeed {
  nodeId:string; sourceId:string; edgeId:string; request:SearchRequest;
  rank:number; score:number; corpus:string; metric?:string; value?:number;
}
function object(value:JsonValue|undefined):Record<string,JsonValue>|null {return value&&typeof value==="object"&&!Array.isArray(value)?value:null;}
/** Reuses accepted lexical/LDA result records. No retrieval, model training or new graph mutation occurs. */
export function graphSearchViewSeeds(graph:FreshGraph,offset=0,limit=50):{items:GraphSearchSeed[];total:number;nextOffset?:number} {
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new RangeError("Choose a bounded search-seed page");
  const results=[...graph.getEdges()].filter(edge=>searchResultMetadata(edge));
  if(!results.length)return {items:[],total:0};
  const corpus=graphSearchCorpus(graph),items:GraphSearchSeed[]=[];
  for(const edge of results) {
    const s=searchResultMetadata(edge);
    if(!s || s.corpus!==corpus.fingerprint || !Number.isSafeInteger(s.rank) || (s.rank as number)<1 || typeof s.score!=="number" || !Number.isFinite(s.score) || s.score<0)continue;
    try {
      const request=validateSearchRequest(s.request as unknown as SearchRequest);
      if(isSearchQueryNode(edge.from)) {
        const current=object(edge.from.getData().search);
        if(current?.draft || JSON.stringify(validateSearchRequest(current?.request as unknown as SearchRequest))!==JSON.stringify(request))continue;
      }
      if(request.kind==="similarity"&&request.query!==edge.from.getID())continue;
      if(s.value!==undefined&&s.metric===undefined || request.metric!==undefined&&s.metric!==request.metric || s.requestKey!==JSON.stringify(request))continue;
      if(s.metric!==undefined && (request.engine!=="lda" || !["symmetric-kl","predictive","jensen-shannon"].includes(s.metric as string) || typeof s.value!=="number" || !Number.isFinite(s.value) || s.value<0))continue;
      items.push({nodeId:edge.to.getID()!,sourceId:edge.from.getID()!,edgeId:edge.getID()!,request,
        rank:s.rank as number,score:s.score,corpus:s.corpus as string,...(s.metric===undefined?{}:{metric:s.metric as string,value:s.value as number})});
    } catch { /* Imported stale/malformed records remain graph data, never trusted retrieval seeds. */ }
  }
  items.sort((a,b)=>(a.sourceId<b.sourceId?-1:a.sourceId>b.sourceId?1:0)||a.rank-b.rank||(a.nodeId<b.nodeId?-1:a.nodeId>b.nodeId?1:0));
  return {items:items.slice(offset,offset+limit),total:items.length,...(offset+limit<items.length?{nextOffset:offset+limit}:{})};
}
