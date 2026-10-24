/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
export interface SearchDocument { id:string; type:string; label:string; hint:string; tags:string[] }
export interface SearchCorpus { documents:SearchDocument[]; /** Exact content key, used for stale-work checks. */ key:string; /** Compact provenance, not an identity check. */ fingerprint:string }
export type SearchMetric="symmetric-kl"|"predictive"|"jensen-shannon";
export interface SearchResult { id:string; score:number; relevance:number; rank:number; metric?:SearchMetric; value?:number; backend?:string }
export type SearchEngine = "lexical"|"lda";
export interface SearchRequest { engine:SearchEngine; kind:"terms"|"tags"|"similarity"; query:string; metric?:SearchMetric; maxDistance?:number }
export type SearchField = "content"|"label"|"hint"|"id"|"type"|"tag";
export type SearchQuery = {kind:"term";field:SearchField;value:string;phrase:boolean;prefix:boolean}|
  {kind:"and"|"or";left:SearchQuery;right:SearchQuery}|{kind:"not";child:SearchQuery};
