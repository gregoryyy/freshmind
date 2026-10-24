/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {SearchCorpus,SearchRequest,SearchResult} from "../corpus/index.js";
import type {LdaModel,LdaOptions,LdaProgress} from "../topics/index.js";
export type SearchWorkerJob={kind:"index";corpus:SearchCorpus}|{kind:"train";corpus:SearchCorpus;options:Partial<LdaOptions>}|
  {kind:"search";corpus:SearchCorpus;request:SearchRequest;limit:number;model?:LdaModel};
export type SearchWorkerMessage={kind:"indexed";key:string;documents:number}|{kind:"progress";progress:LdaProgress}|{kind:"trained";model:LdaModel}|
  {kind:"results";results:SearchResult[]}|{kind:"error";message:string};
