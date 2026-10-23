/* Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
 * TypeScript port by Gregor Heinrich using Codex GPT-6.1. */
import { readFile, mkdir, writeFile, access, rename, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { deepStrictEqual } from "node:assert";
import { readDocument, parseDocument, serializeDocument, documentToRecord } from "fm4/fm/io";

const args=process.argv.slice(2), option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const input=resolve(option("--input-dir")??"../knowceans/knowceans-freshmind-2014"), output=resolve(option("--output-dir")??"examples/fm2014");
const overwrite=args.includes("--overwrite"), recover=args.includes("--recover-type-weights");
const approved=["berry", "nips-fm"], report={format:"freshmind-migration",version:1,approvedInputs:approved.map(n=>n+".xml"),files:[]};
const types=await readFile(new URL("../config/fm2014.types.yaml",import.meta.url),"utf8"), save={includeLayout:false,typesFile:"fm2014.types.yaml"};
await mkdir(output,{recursive:true});
for(const file of [...approved.map(n=>n+".fm.yaml"),"fm2014.types.yaml","conversion-report.json"]) {
  if(!overwrite) {try{await access(join(output,file));throw new Error("Output exists; use --overwrite: "+file);}catch(error){if(error.code!=="ENOENT")throw error;}}
}
async function atomic(file,source) {
  const temporary=join(output,"."+file+"."+randomUUID());
  try{await writeFile(temporary,source);await rename(temporary,join(output,file));}finally{await rm(temporary,{force:true});}
}
await atomic("fm2014.types.yaml",types);
for(const name of approved) {
  try {
    const result=spawnSync("python3",[new URL("convert-fm2014.py",import.meta.url).pathname,join(input,name+".xml"),...(recover?["--recover-type-weights"]:[])],{encoding:"utf8",maxBuffer:64*1024*1024});
    if(result.status!==0)throw new Error(result.error?.message??result.stderr.trim());
    const {document:records,report:entry}=JSON.parse(result.stdout),document=readDocument(records);
    const yaml=serializeDocument(document,save), reloaded=parseDocument(yaml,{resolveTypes:()=>types});
    deepStrictEqual(documentToRecord(reloaded,save),documentToRecord(document,save));
    await atomic(name+".fm.yaml",yaml);report.files.push({...entry,status:"converted",output:name+".fm.yaml",roundTrip:"all normalized records match"});
    console.log(name+": "+entry.nodes+" nodes, "+entry.edges+" relations");
  }catch(error){report.files.push({input:name+".xml",status:"failed",error:error.message});process.exitCode=1;}
}
await atomic("conversion-report.json",JSON.stringify(report,null,2)+"\n");
