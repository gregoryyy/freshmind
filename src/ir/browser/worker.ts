/* SPDX-License-Identifier: GPL-3.0-or-later; Copyright (c) 2026 Gregor Heinrich. */
import {LexicalSearchIndex} from "../lexical/index.js";
import {LdaSearchIndex,trainLdaSteps} from "../topics/index.js";
import type {SearchWorkerJob,SearchWorkerMessage} from "./protocol.js";
// This file is an isolated worker entry, never imported through the browser barrel at runtime.
const port=globalThis as unknown as {onmessage:((event:MessageEvent<SearchWorkerJob>)=>void)|null;postMessage(message:SearchWorkerMessage):void};
port.onmessage=({data:job})=>{
  try {
    if(job.kind==="train"){
      const steps=trainLdaSteps(job.corpus,job.options);let next=steps.next();
      while(!next.done){const p=next.value;if(p.iteration%Math.max(1,Math.floor(p.iterations/20))===0||p.iteration===p.iterations)port.postMessage({kind:"progress",progress:p});next=steps.next();}
      port.postMessage({kind:"trained",model:next.value});
    }else{
      const r=job.request;
      if(r.kind==="tags")port.postMessage({kind:"results",results:new LexicalSearchIndex(job.corpus).tags(r.query.split(",").map(t=>t.trim()).filter(Boolean),job.limit)});
      else{
        const index=r.engine==="lda"?job.model?new LdaSearchIndex(job.model):null:new LexicalSearchIndex(job.corpus);
        if(!index)throw new Error("Train the topic model before searching");
        port.postMessage({kind:"results",results:r.kind==="similarity"?index.similar(r.query,job.limit):index.search(r.query,job.limit)});
      }
    }
  }catch(error){port.postMessage({kind:"error",message:error instanceof Error?error.message:String(error)});}
};
