/* SPDX-License-Identifier: GPL-3.0-or-later; Copyright (c) 2026 Gregor Heinrich.
 * Worker lifecycle extracted from the Freshmind search prototype; see LICENSE-GPL-3.0. */
import type {SearchWorkerJob,SearchWorkerMessage} from "./protocol.js";
import type {LdaProgress} from "../topics/index.js";

export type SearchWorkerFactory=()=>Pick<Worker,"postMessage"|"terminate"|"onmessage"|"onerror">;
export type SearchWorkerAnswer=Extract<SearchWorkerMessage,{kind:"trained"|"results"}>;
export class SearchCancelledError extends Error {constructor(){super("Search cancelled");this.name="SearchCancelledError";}}

/** Worker URL belongs to search, so both source bundlers and the emitted library resolve it here. */
export function createSearchWorker():ReturnType<SearchWorkerFactory> {
  return new Worker(new URL("./worker.js",import.meta.url),{type:"module"});
}

/** Independent transport: one job owns one worker; newer work cancels the previous job. */
export class SearchWorkerClient {
  private active:{worker:ReturnType<SearchWorkerFactory>;reject:(error:Error)=>void}|undefined;
  private disposed=false;
  constructor(private readonly workerFactory:SearchWorkerFactory=createSearchWorker){}
  get busy():boolean{return this.active!==undefined;}
  run(job:SearchWorkerJob,onProgress?:(progress:LdaProgress)=>void):Promise<SearchWorkerAnswer>{
    if(this.disposed)return Promise.reject(new Error("Search worker client disposed"));
    this.cancel();
    return new Promise((resolve,reject)=>{
      let worker:ReturnType<SearchWorkerFactory>;
      try{worker=this.workerFactory();}catch(error){reject(error);return;}
      const active={worker,reject};this.active=active;
      const finish=(answer?:SearchWorkerAnswer,error?:Error)=>{
        if(this.active!==active)return;
        this.active=undefined;worker.onmessage=null;worker.onerror=null;worker.terminate();
        if(error)reject(error);else resolve(answer!);
      };
      worker.onmessage=({data}:MessageEvent<SearchWorkerMessage>)=>{
        if(this.active!==active)return;
        if(data.kind==="progress"){
          try{onProgress?.(data.progress);}catch(error){finish(undefined,error instanceof Error?error:new Error(String(error)));}
        }else if(data.kind==="error")finish(undefined,new Error(data.message));else finish(data);
      };
      worker.onerror=event=>finish(undefined,new Error(event.message||"Search worker failed"));
      try{worker.postMessage(job);}catch(error){finish(undefined,error instanceof Error?error:new Error(String(error)));}
    });
  }
  cancel():void {
    const job=this.active;if(!job)return;
    this.active=undefined;job.worker.onmessage=null;job.worker.onerror=null;job.worker.terminate();job.reject(new SearchCancelledError());
  }
  dispose():void {if(this.disposed)return;this.disposed=true;this.cancel();}
}
