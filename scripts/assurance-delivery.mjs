/** Sequential delivery evidence: test, rebuild twice, compare, then consume the final artifacts. */
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {inventory,differences,sha256,requireCapabilities} from './lib/assurance-artifacts.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(process.argv[2]??join(tmpdir(),'fm4-assurance-delivery-'+Date.now()));
if(!relative(root,output).startsWith('../'))throw new Error('Evidence output must be outside the checkout');
await mkdir(output);
try{await access(join(output,'evidence.json'));throw new Error('Refusing to overwrite an existing evidence run');}catch(error){if(error.code!=='ENOENT')throw error;}
const record={schemaVersion:1,started:new Date().toISOString(),environment:{node:process.version,platform:process.platform,architecture:process.arch},commands:[],capabilities:{},review:{status:'pending',reason:'Automated execution is not independent review.'},status:'running'};
const exists=async p=>{try{await access(join(root,p));return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}};
const npm=process.platform==='win32'?'npm.cmd':'npm';
async function run(name,command,args,extraEnv={}){
  const child=spawn(command,args,{cwd:root,env:{...process.env,...extraEnv},stdio:['ignore','pipe','pipe'],timeout:600000});let stdout='',stderr='';
  child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);
  const result=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve({code,signal}));});
  const log=stdout+stderr;await writeFile(join(output,name+'.log'),log);
  record.commands.push({name,command:[command,...args],...result,logSha256:sha256(log)});
  if(result.code!==0)throw new Error(`${name} failed (${result.code??result.signal}); see ${join(output,name+'.log')}`);
  return stdout;
}
async function inputs(){
  const paths=(await run('input-list-'+record.commands.length,'git',['ls-files','--cached','--others','--exclude-standard','-z'])).split('\0').filter(Boolean).sort();
  const result={};for(const path of paths)result[path]={sha256:sha256(await readFile(join(root,path)))};return result;
}
try{
  record.commit=(await run('commit','git',['rev-parse','HEAD'])).trim();
  record.worktreeStatus=await run('worktree','git',['status','--porcelain']);record.inputs=await inputs();
  record.environment.npm=(await run('npm-version',npm,['--version'])).trim();
  await run('java-version','java',['-version']);record.environment.java=await readFile(join(output,'java-version.log'),'utf8');
  record.capabilities={traceability:await exists('scripts/assurance-map.mjs'),criticalChecks:await exists('scripts/assurance-sensitivity.mjs'),privacyScenario:await exists('playwright.assurance.config.mjs')};
  requireCapabilities(record.capabilities);
  // Mirrors just check / just test-java without requiring an extra CI bootstrap tool.
  await run('typecheck',npm,['run','typecheck']);await run('core',npm,['test']);await run('java',npm,['run','test:java']);
 await run('traceability',process.execPath,['scripts/assurance-map.mjs']);
  const builds=[];
  for(let i=1;i<=2;i++){
    await run('library-'+i,npm,['run','build']);await run('demo-'+i,npm,['run','build:demo']);
    const pack=join(output,'pack-'+i);await mkdir(pack);
    const packed=JSON.parse(await run('pack-'+i,npm,['pack','--ignore-scripts','--json','--pack-destination',pack]));
    const archive=join(pack,packed[0].filename);
    for(const notice of ['LICENSE','NOTICE','licenses/LICENSE-APACHE-2.0','licenses/LICENSE-GPL-3.0','licenses/LICENSE-LGPL-2.0']){
      const bytes=await run(`notice-${i}-${notice.replaceAll('/','-')}`,'tar',['-xOf',archive,'package/'+notice]);
      if(bytes!==await readFile(join(root,notice),'utf8'))throw new Error('Packaged notice differs: '+notice);
    }
    builds.push({library:await inventory(join(root,'dist')),demo:await inventory(join(root,'demo-dist')),package:{filename:packed[0].filename,sha256:sha256(await readFile(archive))}});
  }
  record.builds=builds;
  for(const kind of ['library','demo']){const changed=differences(builds[0][kind],builds[1][kind]);if(changed.length)throw new Error(`Repeated ${kind} build differs: ${changed.join(', ')}`);}
  if(builds[0].package.sha256!==builds[1].package.sha256)throw new Error('Repeated npm package differs');
  record.reproducibility={status:'passed',scope:'Two clean output rebuilds in the same checkout and installed environment; not cross-machine or hermetic reproducibility.'};
  // All builds finish before browser consumers start. No subsequent builds.
  await run('production',process.execPath,['scripts/assurance-production.mjs',join(output,'production.json')]);
  await run('browser',npm,['run','test:browser','--','--workers=2','--timeout=60000']);
 await run('sensitivity',process.execPath,['scripts/assurance-sensitivity.mjs',join(output,'sensitivity.json')]);
 await run('privacy',npm,['exec','--no','--','playwright','test','--config','playwright.assurance.config.mjs'],{ASSURANCE_BROWSER_REPORT:join(output,'privacy-browser.json')});
  const changed=differences(record.inputs,await inputs());if(changed.length)throw new Error('Source inputs changed during evidence run: '+changed.join(', '));
  // Browser/application consumers must not silently mutate the delivered build.
  for(const kind of ['library','demo']){const changed=differences(builds[1][kind],await inventory(join(root,kind==='library'?'dist':'demo-dist')));if(changed.length)throw new Error('Artifacts changed during checks: '+changed.join(', '));}
  record.status='passed-automated-checks';
}catch(error){record.status='failed';record.failure=error.message;process.exitCode=1;}
finally{record.finished=new Date().toISOString();await writeFile(join(output,'evidence.json'),JSON.stringify(record,null,2)+'\n');console.log(`${record.status}: ${join(output,'evidence.json')}`);if(record.failure)console.error(record.failure);}
