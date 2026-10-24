/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
// Make the pinned npm engine usable as a strict ES module, without global aliases
// or runtime evaluation. Preserve the upstream source and notices; the only engine
// engine change declares the legacy lunr-languages alias inside its existing closure.
// The wrapper fixes CommonJS selection and restores the expected global `this`
// for its console utility; neither operation creates a global alias.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),source=new URL('node_modules/elasticlunr/elasticlunr.js',root);
const target=new URL('src/ir/lexical/elasticlunr-runtime.js',root);
const upstream=await readFile(source,'utf8');
const expected='21e30d153bf208a2705b5c3135aac59218951a6ff5c5c22d88a7d26f4bd4df40';
if(createHash('sha256').update(upstream).digest('hex')!==expected)throw new Error('Unexpected elasticlunr source: review the ESM adapter before upgrading');
const alias='lunr = elasticlunr;';
if(upstream.split(alias).length!==2)throw new Error('Unexpected elasticlunr alias');
if(!upstream.trimEnd().endsWith('})();'))throw new Error('Unexpected elasticlunr wrapper');
const generated='// Generated from elasticlunr@0.9.5 by scripts/elasticlunr-runtime.mjs; do not edit.\n'+
  'const module={exports:{}}; const exports=module.exports; const define=undefined;\n'+
  upstream.replace(alias,'var lunr = elasticlunr;').replace(/\}\)\(\);\s*$/,'}).call(globalThis);')+
  '\nexport default module.exports;\n';
await writeFile(target,generated);
if(process.argv.includes('--dist')){
  await mkdir(new URL('dist/ir/lexical/',root),{recursive:true});
  await copyFile(target,new URL('dist/ir/lexical/elasticlunr-runtime.js',root));
}
