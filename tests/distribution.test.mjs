import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';

const root=new URL('../',import.meta.url);

test('the assembled production demo retains original licensing and the npm retrieval engine notice',async()=>{
  const output=await mkdtemp(join(tmpdir(),'fm4-distribution-'));
  try{
    await build({root:fileURLToPath(root),configFile:fileURLToPath(new URL('vite.config.ts',root)),logLevel:'silent',
      build:{outDir:output,emptyOutDir:true,reportCompressedSize:false}});
    // Independent distribution inventory (USE-12 / ARC-12), including the npm
    // original rather than merely asserting the plugin's configured file names.
    const originals={
      LICENSE:'LICENSE',NOTICE:'NOTICE',
      'licenses/LICENSE-APACHE-2.0':'licenses/LICENSE-APACHE-2.0',
      'licenses/LICENSE-GPL-3.0':'licenses/LICENSE-GPL-3.0',
      'licenses/LICENSE-LGPL-2.0':'licenses/LICENSE-LGPL-2.0',
      'licenses/LICENSE-ELASTICLUNR.txt':'node_modules/elasticlunr/LICENSE',
      'licenses/LICENSE-YAML.txt':'node_modules/yaml/LICENSE',
      'licenses/LICENSE-NETWORKX.txt':'examples/public/sources/LICENSE-NETWORKX.txt'
    };
    for(const [asset,original] of Object.entries(originals)){
      assert.deepEqual(await readFile(join(output,asset)),await readFile(new URL(original,root)),asset);
    }
    assert.deepEqual(await readFile(new URL('licenses/LICENSE-ELASTICLUNR.txt',root)),
      await readFile(new URL('node_modules/elasticlunr/LICENSE',root)));
  }finally{await rm(output,{recursive:true,force:true});}
});
