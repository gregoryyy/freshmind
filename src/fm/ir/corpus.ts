/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {FreshGraph,FreshNode} from "../model/index.js";
import {createSearchCorpus,searchAnnotationText} from "../../ir/corpus/index.js";
import type {SearchCorpus} from "../../ir/corpus/index.js";

/** Freshmind annotation adapter; text analysis itself belongs to the search domain. */
export function annotationSearchText(node:FreshNode):string {return searchAnnotationText(node.getAnnotation());}
export function isSearchQueryNode(node:FreshNode):boolean {const s=node.getData().search;return !!s&&typeof s==="object"&&!Array.isArray(s)&&s.version===1&&s.role==="query";}
export function graphSearchCorpus(graph:FreshGraph):SearchCorpus {
  return createSearchCorpus([...graph.getNodes()].filter(n=>!isSearchQueryNode(n)).map(n=>({
    id:n.getID()!,type:n.getSemanticType(),label:n.getLabel(),hint:annotationSearchText(n),
    tags:Array.isArray(n.getData().tags)?(n.getData().tags as unknown[]).filter((v):v is string=>typeof v==="string"):[]
  })));
}
