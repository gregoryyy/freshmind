/** File-level provenance inventory. Symbol/name matches never establish behavioral equivalence. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {resolve,relative,isAbsolute} from 'node:path';
import ts from 'typescript';
const run=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const anchor=id=>'ref-'+id.replace(/[^a-z0-9]+/gi,'-').toLowerCase();
function safePath(directory,path){
  if(typeof path!=='string'||!path||isAbsolute(path))throw new Error('Invalid relative reference path: '+path);
  const full=resolve(directory,path),rel=relative(directory,full);
  if(rel==='..'||rel.startsWith('../'))throw new Error('Reference escapes root: '+path);
  return full;
}
export async function trackedTypescript(directory=root){
  const {stdout}=await run('git',['ls-files','--cached','--others','--exclude-standard','-z','--','*.ts'],{cwd:directory});
  return [...new Set(stdout.split('\0').filter(Boolean))].sort();
}
export async function validateProvenance(data,{directory=root,referenceRoots={}}={}){
  const errors=[],used=new Set(),paths=await trackedTypescript(directory);
  const require=(ok,message)=>{if(!ok)errors.push(message);};
  require(data.schemaVersion===1,'Unsupported provenance schema');
  require(/^[a-f0-9]{40}$/.test(data.baselineCommit??''),'Missing provenance baseline commit');
  const behaviors=JSON.parse(await readFile(resolve(directory,'docs/assurance/traceability.json'),'utf8'));
  const ids=new Set(behaviors.mappings.map(row=>row.id));
  for(const path of paths)require(Object.hasOwn(data.files??{},path),`Missing TypeScript provenance: ${path}`);
  for(const [path,entry] of Object.entries(data.files??{})){
    require(paths.includes(path),`Stale/untracked TypeScript provenance: ${path}`);
    require(['adapted','related','new','composition','generated','reimplemented','unresolved'].includes(entry.relation),`${path}: invalid relationship`);
    require(typeof entry.note==='string'&&entry.note.trim().length>0,`${path}: missing rationale`);
    require(Array.isArray(entry.origins)&&Array.isArray(entry.behaviors),`${path}: missing reference lists`);
    for(const id of entry.behaviors??[])require(ids.has(id),`${path}: unknown behavior ${id}`);
    for(const id of entry.origins??[]){require(Object.hasOwn(data.origins??{},id),`${path}: unknown Java reference ${id}`);used.add(id);}
    if(['adapted','related','reimplemented'].includes(entry.relation))require(entry.origins?.length>0,`${path}: relationship needs a pinned reference`);
    if(['new','composition','generated'].includes(entry.relation))require(entry.origins?.length===0,`${path}: direct-origin claim contradicts relationship`);
    if(entry.relation==='composition'&&paths.includes(path)){
      const text=await readFile(safePath(directory,path),'utf8'),tree=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);
      require(tree.statements.every(n=>ts.isExportDeclaration(n)||ts.isImportDeclaration(n)||ts.isEmptyStatement(n)),`${path}: composition contains implementation declarations`);
    }
  }
  for(const [id,ref] of Object.entries(data.origins??{})){
    require(used.has(id),`Unused provenance reference: ${id}`);
    require(Object.hasOwn(data.roots??{},ref.root),`${id}: unknown reference root`);
    require(/^[a-f0-9]{64}$/.test(ref.sha256??'')&&Boolean(ref.symbol),`${id}: missing hash/symbol`);
    require(['java','java-bytecode'].includes(ref.kind),`${id}: invalid reference kind`);
    try{
      safePath(directory,ref.path);
      if(ref.kind==='java-bytecode')safePath(directory,ref.member);
      if(!referenceRoots[ref.root])continue;
      const path=safePath(resolve(referenceRoots[ref.root]),ref.path);
      const bytes=ref.kind==='java'?await readFile(path):(await run('unzip',['-p',path,ref.member],{encoding:'buffer',maxBuffer:16*1024*1024})).stdout;
      require(sha(bytes)===ref.sha256,`${id}: pinned reference hash differs`);
    }catch(error){errors.push(`${id}: ${error.message}`);}
  }
  for(const id of Object.keys(referenceRoots))require(Object.hasOwn(data.roots??{},id),'Unknown supplied reference root: '+id);
  return errors;
}
export function renderProvenance(data){
  const link=(path,label=path)=>`[${label}](../../${path})`;
  let out='# Java information by TypeScript file\n\nTODO **7.8**. Generated from '+link('src/java-provenance.json')+' by\n`just java-provenance --write`; normal `just assurance-map` checks this inventory too.\n\n';
  out+=`Baseline: \`${data.baselineCommit}\`. ${data.scope}\n\n`;
  out+='**Adapted** identifies a corresponding adapted responsibility; **related** is a\nlegacy counterpart or historical concept, not a claim that code was copied.\n**Reimplemented** identifies reconstructed contracts/formulas, including authorized\nbytecode rather than recovered Java source. **New**, **composition** and **generated**\nmake no direct Java-file claim; **unresolved** reserves explicit uncertainty.\nThe universal-looking copyright boilerplate is not evidence of a direct port.\n\n';
  out+='FM2014 TouchGraph classes below are local **counterparts**. Upstream port/reference\nidentity remains in '+link('NOTICE')+' and '+link('tests/reference/README.md')+'. In particular,\nheadless Java test hosts must not be mistaken for upstream source. Cokus attribution\nremains Shawn Cokus → David Blei’s lda-c → Java adaptation → TypeScript.\n\n';
  out+='Find a TypeScript path or a Java class in this page or the JSON. MAP links lead to\nrequirements, TODOs and scoped evidence in [TRACEABILITY.md](TRACEABILITY.md).\nJava/JAR contents are not redistributed. Optional local verification:\n\n```sh\njust java-provenance --reference-root fm2014=../knowceans/knowceans-freshmind-2014 \\\n  --reference-root lda-reference=../knowceans/knowceans-ilda\n```\n\n';
  out+='The JSON has explicit per-file decisions; validation never guesses an origin\nfrom a filename. New/moved tracked TypeScript files require an inventory update.\nHashes pin reference bytes, not TypeScript equivalence or changed licensing.\n\n| TypeScript file | Relationship | Java references | Behavior map | Rationale |\n| --- | --- | --- | --- | --- |\n';
  for(const [path,entry] of Object.entries(data.files))out+=`| ${link(path)} | ${entry.relation} | ${entry.origins.map(id=>`[${data.origins[id].symbol}](#${anchor(id)})`).join('<br>')||'—'} | ${entry.behaviors.map(id=>`[${id}](TRACEABILITY.md#${id.toLowerCase()})`).join(', ')||'—'} | ${entry.note.replaceAll('|','\\|')} |\n`;
  out+='\n## Pinned Java references\n\nRoot paths are hints, not required machine-specific locations. Override them\nwith `--reference-root NAME=DIRECTORY`; ordinary checks need no sibling checkout.\n\n';
  for(const [id,ref] of Object.entries(data.origins))out+=`<a id="${anchor(id)}"></a>\n\n**${ref.symbol}** (${ref.kind})\n\n- Root: \`${ref.root}\` — ${data.roots[ref.root].description}\n- File: \`${ref.path}\`${ref.member?`; member: \`${ref.member}\``:''}\n- SHA-256: \`${ref.sha256}\`\n\n`;
  return out;
}
export async function checkProvenance({directory=root,referenceRoots={},write=false}={}){
  const data=JSON.parse(await readFile(resolve(directory,'src/java-provenance.json'),'utf8'));
  const errors=await validateProvenance(data,{directory,referenceRoots});
  if(errors.length)throw new Error(errors.join('\n'));
  const path=resolve(directory,'docs/assurance/JAVA-SOURCES.md'),report=renderProvenance(data);
  if(write)await writeFile(path,report);
  else if(await readFile(path,'utf8')!==report)throw new Error('JAVA-SOURCES.md is stale; run just java-provenance --write');
  return {files:Object.keys(data.files).length,references:Object.keys(data.origins).length};
}
async function main(){
  const args=process.argv.slice(2),options={referenceRoots:{},write:false};
  for(let i=0;i<args.length;i++){
    if(args[i]==='--write')options.write=true;
    else if(args[i]==='--reference-root'){
      const value=args[++i],split=value?.indexOf('=')??-1;
      if(split<1||split===value.length-1)throw new Error('--reference-root requires NAME=DIRECTORY');
      options.referenceRoots[value.slice(0,split)]=value.slice(split+1);
    }else throw new Error('Unknown argument: '+args[i]);
  }
  const result=await checkProvenance(options);console.log(`File provenance valid: ${result.files} TypeScript files, ${result.references} pinned Java references. Equivalence not inferred.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
