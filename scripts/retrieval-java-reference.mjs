// Executes the owner-authorized FM2014 binary against synthetic inputs; no legacy corpus is opened.
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {join,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const run=promisify(execFile),root=new URL('../',import.meta.url);
const jars=['knowceans-corpus.jar','knowceans-tools.jar'].map(name=>fileURLToPath(new URL(`../knowceans/knowceans-freshmind-2014/lib/${name}`,root)));
const names=['LdaQueryClient','LdaTopicSimilarities','LdaGibbsQuerySampler'];
const classes={};
for(const name of names){
  const bytes=(await run('unzip',['-p',jars[0],`org/knowceans/dirichlet/lda/${name}.class`],{encoding:'buffer'})).stdout;
  classes[name]=createHash('sha256').update(bytes).digest('hex');
}
const directory=await mkdtemp(join(tmpdir(),'fm4-retrieval-reference-'));
try{
  const source=await readFile(new URL('tests/reference/fm2014/RetrievalReference.java',root),'utf8');
  await writeFile(join(directory,'RetrievalReference.java'),source);
  await run('javac',['-cp',jars.join(delimiter),'RetrievalReference.java'],{cwd:directory});
  const result=JSON.parse((await run('java',['-cp',[directory,...jars].join(delimiter),'RetrievalReference'],{cwd:directory})).stdout);
  const record={classes,...result},target=new URL('tests/fixtures/fm2014-retrieval.json',root);
  if(process.argv.includes('--write'))await writeFile(target,JSON.stringify(record,null,2)+'\n');
  else assert.deepEqual(record,JSON.parse(await readFile(target,'utf8')));
  process.stdout.write('FM2014 binary reference: pinned classes, posteriors, query/document/term distances and predictive query rankings match.\n');
}finally{await rm(directory,{recursive:true,force:true});}
