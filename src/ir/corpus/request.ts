/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {SearchRequest} from "./types.js";
export function validateSearchRequest(request:SearchRequest):SearchRequest {
  if(!request||!["lexical","lda"].includes(request.engine)||!["terms","tags","similarity"].includes(request.kind)||typeof request.query!=="string"||!request.query.trim()||request.query.length>4096)throw new TypeError("Invalid search request");
  return {engine:request.engine,kind:request.kind,query:request.query};
}
