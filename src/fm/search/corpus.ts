/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {FreshGraph,FreshNode} from "../model/index.js";
import type {SearchCorpus,SearchDocument} from "./types.js";

export const SEARCH_ANALYZER_VERSION="fm4-text-1";
// Lucene's classic English stop set. Token positions are retained before filtering.
const stop=new Set("a an and are as at be but by for if in into is it no not of on or such that the their then there these they this to was will with".split(" "));
export function normalizeSearchText(text:string):string {return text.normalize("NFKC").toLowerCase();}
export function searchTokens(text:string,removeStops=true):string[] {
  const tokens=normalizeSearchText(text).match(/[\p{L}\p{N}]+/gu)??[];
  return removeStops?tokens.filter(t=>!stop.has(t)):tokens;
}
/** Text extraction only, never HTML rendering or resource loading. */
export function annotationSearchText(node:FreshNode):string {
  const a=node.getAnnotation();if(a.format==="text")return a.text;
  return a.text.replace(/<!--[^]*?(?:-->|$)/g," ").replace(/<(script|style)\b[^>]*>[^]*?(?:<\/\1\s*>|$)/gi," ")
    .replace(/<[^>]*(?:>|$)/g," ").replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,entity:string)=>{
      if(entity[0]!=="#")return ({amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "} as Record<string,string>)[entity.toLowerCase()]!;
      const n=entity[1]?.toLowerCase()==="x"?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
      return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):" ";
    });
}
export function isSearchQueryNode(node:FreshNode):boolean {const s=node.getData().search;return !!s&&typeof s==="object"&&!Array.isArray(s)&&s.version===1&&s.role==="query";}
export function compareSearchIds(a:string,b:string):number{return a<b?-1:a>b?1:0;}
export function createSearchCorpus(documents:readonly SearchDocument[]):SearchCorpus {
  const seen=new Set<string>();
  const docs=documents.map(d=>{
    if(!d||typeof d.id!=="string"||!d.id||seen.has(d.id))throw new TypeError("Search requires unique nonempty IDs");seen.add(d.id);
    for(const field of [d.type,d.label,d.hint])if(typeof field!=="string")throw new TypeError("Invalid search text");
    if(!Array.isArray(d.tags)||d.tags.some(t=>typeof t!=="string"))throw new TypeError("Search tags must be strings");
    return {id:d.id,type:d.type,label:d.label,hint:d.hint,tags:[...new Set(d.tags.map(normalizeSearchText))].sort(compareSearchIds)};
  }).sort((a,b)=>compareSearchIds(a.id,b.id));
  const key=JSON.stringify([SEARCH_ANALYZER_VERSION,docs]);let hash=2166136261;
  for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619)>>>0;
  return {documents:docs,key,fingerprint:`${SEARCH_ANALYZER_VERSION}:${key.length}:${hash.toString(16)}`};
}
export function graphSearchCorpus(graph:FreshGraph):SearchCorpus {
  return createSearchCorpus([...graph.getNodes()].filter(n=>!isSearchQueryNode(n)).map(n=>({
    id:n.getID()!,type:n.getSemanticType(),label:n.getLabel(),hint:annotationSearchText(n),
    tags:Array.isArray(n.getData().tags)?(n.getData().tags as unknown[]).filter((v):v is string=>typeof v==="string"):[]
  })));
}
