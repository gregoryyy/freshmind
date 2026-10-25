/** Bounded fault-sensitivity experiment against disposable copies of the assembled JS. */
import {mkdtemp,cp,readFile,writeFile,mkdir,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=s=>createHash('sha256').update(s).digest('hex');
const run=(cwd,coverage=false)=>spawnSync(process.execPath,[...(coverage?['--experimental-test-coverage',
  '--test-coverage-include=**/dist/fm/edit/commands.js','--test-coverage-include=**/dist/ir/browser/worker-client.js','--test-coverage-include=**/dist/ir/browser/session.js']:[]),
  '--test','--test-reporter=tap','tests/assurance-critical.test.mjs'],{cwd,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
const mutations=[
  {id:'early-node-write',file:'dist/fm/edit/commands.js',pattern:/export function applyNodeEdit\(node, edit\) \{/,replacement:'export function applyNodeEdit(node, edit) { node.setLabel(edit.label);',expected:'ASSURE-02'},
  {id:'stale-worker-callback',file:'dist/ir/browser/worker-client.js',pattern:/if \(this\.active !== active\)\s*return;/g,replacement:'/* fault: lost owner guard */',expected:'ASSURE-03'},
  {id:'late-model-read',file:'dist/ir/browser/session.js',pattern:/const candidate = await read\(\);\s*this\.check\(generation\);/,replacement:'const candidate = await read(); /* fault: lost generation guard */',expected:'ASSURE-04'}
];
const temporary=await mkdtemp(join(tmpdir(),'fm4-assurance-sensitivity-'));
try{
  await cp(resolve(root,'dist'),join(temporary,'dist'),{recursive:true});
  await mkdir(join(temporary,'tests'));
  const testSource=await readFile(resolve(root,'tests/assurance-critical.test.mjs'),'utf8');
  await writeFile(join(temporary,'tests/assurance-critical.test.mjs'),testSource);
  await cp(resolve(root,'package.json'),join(temporary,'package.json'));
  await symlink(resolve(root,'node_modules'),join(temporary,'node_modules'),'dir');
  const baseline=run(temporary,true);
  if(baseline.error||baseline.status!==0)throw new Error(`Unmutated baseline failed: ${baseline.error??''}\n${baseline.stdout}\n${baseline.stderr}`);
  const report={schemaVersion:1,node:process.version,platform:process.platform,architecture:process.arch,
    sourceCommit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),
    testSha256:sha(testSource),coverageScope:mutations.map(m=>m.file),
    coverageReport:baseline.stdout.split('\n').filter(line=>line.startsWith('#')).join('\n'),
    baseline:'passed',mutations:[],limits:'Three specified faults and four independent-oracle scenarios. Not exhaustive mutation/branch coverage, race freedom or a conformance verdict.'};
  for(const mutation of mutations){
    const path=join(temporary,mutation.file),original=await readFile(path,'utf8'),changed=original.replace(mutation.pattern,mutation.replacement);
    if(changed===original)throw new Error(`Mutation ${mutation.id} no longer matches: review the experiment`);
    await writeFile(path,changed);
    const result=run(temporary);
    await writeFile(path,original);
    const output=result.stdout??'';
    // A syntax/import/process failure is not a detected behavioral fault.
    const detected=!result.error&&result.status===1&&output.includes('ERR_ASSERTION')&&
      new RegExp(`not ok \\d+ - ${mutation.expected}`).test(output);
    report.mutations.push({id:mutation.id,file:mutation.file,originalSha256:sha(original),mutatedSha256:sha(changed),expectedCase:mutation.expected,detected});
    if(!detected)throw new Error(`Fault not detected by its assertion: ${mutation.id}\n${output}\n${result.stderr}`);
  }
  const output=process.argv[2];
  if(output){await writeFile(resolve(output),JSON.stringify(report,null,2)+'\n');console.log(`Evidence: ${resolve(output)}`);}
  console.log(report.coverageReport);
  console.log(`Detected ${report.mutations.length}/${mutations.length} specified faults. ${report.limits}`);
}finally{await rm(temporary,{recursive:true,force:true});}
