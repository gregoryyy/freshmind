/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {FreshEdge,FreshNode} from "../model/index.js";
import type {FreshGraph,JsonValue} from "../model/index.js";
import {validateSearchRequest} from "../../ir/corpus/index.js";
import {graphSearchCorpus,isSearchQueryNode} from "./corpus.js";
import type {SearchCorpus,SearchRequest,SearchResult,SearchEngine} from "../../ir/corpus/index.js";
function record(value:JsonValue|undefined):Record<string,JsonValue>|null{return value&&typeof value==="object"&&!Array.isArray(value)?value:null;}
function requestKey(request:SearchRequest):string{return JSON.stringify(validateSearchRequest(request));}
function unusedNodeId(graph:FreshGraph):string{let n=1;while(graph.findNode(`query-${n}`))n++;return `query-${n}`;}
/** Creates a query and optional context relation without changing source node importance. */
export function createGraphQuery(graph:FreshGraph,request:SearchRequest,context?:FreshNode|null):FreshNode {
  const validated=validateSearchRequest(request);if(validated.kind==="similarity")throw new TypeError("Similarity uses an existing node");
  return insertQuery(graph,validated,context);
}
/** An explicit empty draft is graph data, excluded from the retrieval corpus; it is never sent to an engine. */
export function createGraphQueryDraft(graph:FreshGraph,engine:SearchEngine,context?:FreshNode|null,options:Pick<SearchRequest,"metric"|"maxDistance">={}):FreshNode {
  if(!["lexical","lda"].includes(engine))throw new TypeError("Choose a search engine");
  const validated=validateSearchRequest({engine,kind:"terms",query:"draft",...options});
  return insertQuery(graph,{...validated,query:""},context,true);
}
function insertQuery(graph:FreshGraph,validated:SearchRequest,context?:FreshNode|null,draft=false):FreshNode {
  if(context&&!graph.contains(context))throw new Error("Query context is outside the graph");
  const node=new FreshNode(unusedNodeId(graph),draft?"[query]":`[${validated.query}]`,{type:validated.engine==="lda"?"ldaquery":"lucenequery",
    position:context?{x:context.x+80,y:context.y+40}:{x:0,y:0},
    data:{search:{version:1,role:"query",...(draft?{draft:true}:{}),request:{...validated}}}});
  graph.addNode(node);
  if(context)graph.addEdge(new FreshEdge(context,node,{label:"query context",data:{search:{version:1,role:"context",owner:node.getID()!}}}));
  return node;
}
/** Only structured relations with matching endpoints are search-owned. Labels never confer ownership. */
export function searchResultMetadata(edge:FreshEdge):Record<string,JsonValue>|null {
  const s=record(edge.getData().search);
  return s?.version===1&&s.role==="result"&&s.owner===edge.from.getID()&&s.target===edge.to.getID()?s:null;
}
export function rejectedSearchIds(source:FreshNode,request:SearchRequest):Set<string>{
  const feedback=record(source.getData().search)?.feedback,key=requestKey(request);
  return new Set(Array.isArray(feedback)?feedback.flatMap(f=>{const r=record(f);return r?.requestKey===key&&typeof r.target==="string"?[r.target]:[];}):[]);
}
/** Validates before replacing owned query links, or this engine's existing-content similarity links. */
export function applyGraphSearchResults(graph:FreshGraph,source:FreshNode,request:SearchRequest,results:readonly SearchResult[],corpus:SearchCorpus):FreshEdge[]{
  const validated=validateSearchRequest(request);
  if(!graph.contains(source))throw new Error("Search source is outside the graph");
  if(graphSearchCorpus(graph).key!==corpus.key)throw new Error("Search corpus changed; run the query again");
  if(results.length>1000)throw new RangeError("At most 1000 search results may be applied");
  const seen=new Set<string>(),rejected=rejectedSearchIds(source,validated);
  const edges:FreshEdge[]=[];
  for(const r of results){
    const target=graph.findNode(r.id);
    if(!target||seen.has(r.id)||!Number.isFinite(r.score)||r.score<0||!Number.isFinite(r.relevance)||r.relevance<0||r.relevance>1||!Number.isInteger(r.rank)||r.rank<1)throw new TypeError("Invalid search result batch");
    if(r.backend!==undefined&&(typeof r.backend!=="string"||r.backend.length>200)||
      r.metric!==undefined&&(!["symmetric-kl","predictive","jensen-shannon"].includes(r.metric)||validated.engine!=="lda"||!Number.isFinite(r.value)||r.value!<0)||
      r.value!==undefined&&r.metric===undefined||validated.metric!==undefined&&r.metric!==validated.metric)throw new TypeError("Invalid search score provenance");
    seen.add(r.id);if(target===source||rejected.has(r.id))continue;
    const details={...(r.backend===undefined?{}:{backend:r.backend}),...(r.metric===undefined?{}:{metric:r.metric,value:r.value!})};
    edges.push(new FreshEdge(source,target,{label:r.metric?`${validated.engine} ${r.metric} ${r.value!.toPrecision(3)}`:`${validated.engine} ${r.score.toPrecision(3)}`,visual:{style:{stroke:{color:"#28845d",width:1+3*r.relevance}}},
      data:{search:{version:1,role:"result",owner:source.getID()!,target:r.id,request:{...validated},requestKey:requestKey(validated),score:r.score,relevance:r.relevance,rank:r.rank,corpus:corpus.fingerprint,...details}}}));
  }
  for(const edge of [...graph.getEdges()]){const s=searchResultMetadata(edge);if(s&&edge.from===source&&(isSearchQueryNode(source)||record(s.request)?.engine===validated.engine))graph.deleteEdge(edge);}
  for(const edge of edges)graph.addEdge(edge);
  return edges;
}
/** Records a negative judgment before removing an owned result; no model training is implied. */
export function rejectGraphSearchResult(graph:FreshGraph,edge:FreshEdge):void {
  const result=searchResultMetadata(edge);if(!graph.contains(edge)||!result)throw new TypeError("Select a search result relation");
  const data=edge.from.getData(),search=record(data.search)??{},feedback=Array.isArray(search.feedback)?search.feedback:[];
  const entry={target:edge.to.getID()!,requestKey:result.requestKey!,request:result.request!,corpus:result.corpus!,judgment:"irrelevant"};
  edge.from.setData({...data,search:{...search,feedback:[...feedback.filter(f=>{const r=record(f);return r?.target!==entry.target||r.requestKey!==entry.requestKey;}),entry]}});
  graph.deleteEdge(edge);
}
