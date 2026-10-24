/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {SearchRequest} from "./types.js";
export function validateSearchRequest(request:SearchRequest):SearchRequest {
  if(!request||!["lexical","lda"].includes(request.engine)||!["terms","tags","similarity"].includes(request.kind)||typeof request.query!=="string"||!request.query.trim()||request.query.length>4096)throw new TypeError("Invalid search request");
  if(request.metric!==undefined&&(!["symmetric-kl","predictive","jensen-shannon"].includes(request.metric)||request.engine!=="lda"||request.kind==="tags"))throw new TypeError("Invalid semantic metric");
  if(request.maxDistance!==undefined&&(request.engine!=="lda"||request.kind==="tags"||!Number.isFinite(request.maxDistance)||request.maxDistance<0))throw new TypeError("Invalid semantic distance limit");
  const metric=request.metric??(request.maxDistance===undefined?undefined:"symmetric-kl");
  return {engine:request.engine,kind:request.kind,query:request.query,...(metric===undefined?{}:{metric}),...(request.maxDistance===undefined?{}:{maxDistance:request.maxDistance})};
}
