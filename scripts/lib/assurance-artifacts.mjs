import {readdir,readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function inventory(directory,prefix=''){
  const result={};
  for(const name of (await readdir(directory)).sort()){
    const path=join(directory,name),key=prefix+name,stat=await lstat(path);
    if(stat.isSymbolicLink())throw new Error(`Artifact symlink is not supported: ${key}`);
    if(stat.isDirectory())Object.assign(result,await inventory(path,key+'/'));
    else if(stat.isFile()){const bytes=await readFile(path);result[key]={bytes:bytes.length,sha256:sha256(bytes)};}
    else throw new Error(`Unsupported artifact: ${key}`);
  }
  return result;
}
export function differences(a,b){
  return [...new Set([...Object.keys(a),...Object.keys(b)])].sort().filter(key=>
    !a[key]||!b[key]||a[key].bytes!==b[key].bytes||a[key].sha256!==b[key].sha256);
}

export function requireCapabilities(capabilities){
  for(const name of ['traceability','criticalChecks','privacyScenario'])
    if(capabilities[name]!==true)throw new Error('Required assurance capability missing: '+name);
}
