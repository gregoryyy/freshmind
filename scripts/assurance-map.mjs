/** Validate reviewed traceability references; never infer semantic parity from symbol matches. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const root=fileURLToPath(new URL('../',import.meta.url));
const digest=s=>createHash('sha256').update(s).digest('hex');
const pathIn=(base,p)=>{
  if(typeof p!=='string'||!p||isAbsolute(p))throw new Error(`Invalid relative path: ${p}`);
  const full=resolve(base,p),rel=relative(base,full);
  if(rel==='..'||rel.startsWith('../'))throw new Error(`Path escapes root: ${p}`);
  return full;
};
function namedDeclarations(source,path){
  const tree=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true),names=new Set();
  // Only actual top-level declarations, not comments, arbitrary text or imported aliases.
  for(const node of tree.statements){
    if(node.name&&ts.isIdentifier(node.name))names.add(node.name.text);
    if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)
      if(ts.isIdentifier(declaration.name))names.add(declaration.name.text);
  }
  return names;
}
export async function validateMap(data,{directory=root,legacyRoot}={}){
  const errors=[],seen=new Set(),covered=new Set(),defined=new Set();
  const require=(ok,message)=>{if(!ok)errors.push(message);};
  const read=async(base,path)=>{try{return await readFile(pathIn(base,path),'utf8');}catch(error){errors.push(`${path}: ${error.message}`);return null;}};
  require(data.schemaVersion===1,'Unsupported traceability schema');
  require(/^[a-f0-9]{40}$/.test(data.implementationBaseline??''),'Missing baseline commit');
  for(const [path,hash] of Object.entries(data.baseline??{})){
    const source=await read(directory,path);if(source===null)continue;
    require(digest(source)===hash,`${path}: baseline changed; review requirements and update the map`);
    for(const match of source.matchAll(/\*\*((?:INT|USE|ARC)-\d+) — /g))defined.add(match[1]);
  }
  for(const [id,requirement] of Object.entries(data.requirements??{})){
    require(defined.has(id),`${id}: no baseline definition`);
    require(Object.hasOwn(data.baseline??{},requirement.definition),`${id}: invalid definition document`);
    require(Boolean(requirement.sourceStatus&&requirement.review),`${id}: missing source/review status`);
  }
  for(const id of defined)require(Object.hasOwn(data.requirements??{},id),`${id}: absent from requirement inventory`);
  const todos=await read(directory,'docs/TODO.md');
  for(const row of data.mappings??[]){
    require(/^MAP-\d+$/.test(row.id)&&!seen.has(row.id),`Duplicate/invalid mapping: ${row.id}`);seen.add(row.id);
    require(['ported','adapted','replaced','reimplemented','new','retired','unmapped'].includes(row.relation),`${row.id}: invalid relationship`);
    require(['high','medium','low'].includes(row.risk),`${row.id}: missing risk`);
    require(['partial-evidence','not-implemented'].includes(row.status),`${row.id}: unsupported evidence claim`);
    require(Boolean(row.oracle&&row.gaps&&row.title&&row.assumptions&&row.failureConsequence),`${row.id}: missing oracle, assumptions, consequence, gap or title`);
    require(Array.isArray(row.requirements)&&row.requirements.length>0,`${row.id}: no requirements`);
    for(const id of row.requirements??[]){require(defined.has(id),`${row.id}: unknown requirement ${id}`);covered.add(id);}
    for(const id of row.todos??[])require(todos?.includes(` ${id} `),`${row.id}: unknown TODO ${id}`);
    for(const ref of row.implementation??[]){
      const source=await read(directory,ref.path);if(source===null)continue;
      require(digest(source)===ref.sha256,`${row.id}: ${ref.path} changed; review this mapping`);
      require(namedDeclarations(source,ref.path).has(ref.symbol),`${row.id}: missing declaration ${ref.path}#${ref.symbol}`);
    }
    for(const path of row.evidence??[])await read(directory,path);
    for(const ref of row.origins??[]){
      require(ref.kind==='java'&&/^[a-f0-9]{64}$/.test(ref.sha256)&&Boolean(ref.symbol),`${row.id}: invalid Java origin`);
      // Validate paths even when the optional, private/local reference checkout is unavailable.
      try{pathIn(legacyRoot??directory,ref.path);}catch(error){errors.push(error.message);}
      if(legacyRoot){const source=await read(legacyRoot,ref.path);if(source!==null)require(digest(source)===ref.sha256,`${row.id}: Java source differs: ${ref.path}`);}
    }
  }
  for(const id of defined)require(covered.has(id),`${id}: no implementation/evidence/gap mapping`);
  require(seen.size>0,'No mappings');
  return errors;
}
const link=(path,label)=>`[${label??path}](../../${path})`;
export function renderMap(data){
  let out='# Requirement and source traceability\n\nTODO **7.4**. Generated from [traceability.json](traceability.json) by\n`just assurance-map --write`; validate with `just assurance-map`.\n\n';
  out+=`Implementation baseline: \`${data.implementationBaseline}\`. ${data.scope}\n\n`;
  out+='Original Java files are identified by fully qualified symbols and SHA-256. They\nremain in the owner’s local reference checkout; no JARs or decompiled code are\nredistributed. To verify those hashes, pass `--legacy-root /path/to/fm2014`.\nNormal validation needs no sibling checkout. A file hash pins a reviewed mapping;\nit is not proof of equivalence. A changed mapped file requires review.\n\n';
  out+='Use browser find on a requirement, symbol, source path or TODO to navigate in\neither direction. Class entries identify a responsibility, not coverage of every\nmethod. Full private-helper/function coverage and unmapped legacy features remain\noutside this first map. User intent outranks historical behavior.\n\n';
  out+='| Requirement | Meaning | Mappings |\n| --- | --- | --- |\n';
  for(const [id,r] of Object.entries(data.requirements))out+=`| ${link(r.definition,id)} | ${r.title} | ${data.mappings.filter(m=>m.requirements.includes(id)).map(m=>`[${m.id}](#${m.id.toLowerCase()})`).join(', ')} |\n`;
  for(const row of data.mappings){
    out+=`\n## ${row.id}\n\n**${row.title}** — ${row.relation}; risk: ${row.risk}; status: ${row.status}.\n\n`;
    out+=`Requirements: ${row.requirements.join(', ')}. TODO: ${row.todos.join(', ')}.\n\n`;
    out+='Current declarations:\n\n';
    out+=row.implementation.length?row.implementation.map(r=>`- ${link(r.path,`${r.path}#${r.symbol}`)}\n`).join(''):'No function-level implementation claimed.\n';
    out+='\nOrigins:\n\n';
    out+=row.origins.length?row.origins.map(r=>`- \`${r.symbol}\` — \`${r.path}\`; SHA-256 \`${r.sha256}\`.\n`).join(''):'New requirement/design or external specification; no Java function equivalence claimed.\n';
    out+=`\nAssumptions: ${row.assumptions}\n\nFailure consequence: ${row.failureConsequence}\n\nEvidence candidates: ${row.evidence.length?row.evidence.map(p=>link(p)).join(', '):'none; future or missing implementation'}.\n\nIndependent expectation: ${row.oracle}\n\n**Gaps/limits:** ${row.gaps}\n`;
  }
  return out;
}
async function main(){
  const args=process.argv.slice(2),legacy=args.indexOf('--legacy-root');
  if(args.some((a,i)=>!['--write','--legacy-root'].includes(a)&&!(legacy>=0&&i===legacy+1))||legacy>=0&&!args[legacy+1])throw new Error('Usage: assurance-map.mjs [--write] [--legacy-root DIRECTORY]');
  const data=JSON.parse(await readFile(resolve(root,'docs/assurance/traceability.json'),'utf8'));
  const errors=await validateMap(data,{legacyRoot:legacy>=0?resolve(args[legacy+1]):undefined});
  if(errors.length)throw new Error(errors.join('\n'));
  const output=resolve(root,'docs/assurance/TRACEABILITY.md'),rendered=renderMap(data);
  if(args.includes('--write'))await writeFile(output,rendered);
  else if(await readFile(output,'utf8')!==rendered)throw new Error('TRACEABILITY.md is stale; run just assurance-map --write');
  console.log(`Traceability valid: ${Object.keys(data.requirements).length} requirements, ${data.mappings.length} behavior groups. Semantic adequacy not inferred.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
