import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateProvenance,checkProvenance} from '../scripts/java-provenance.mjs';
const load=async()=>JSON.parse(await readFile(new URL('../src/java-provenance.json',import.meta.url),'utf8'));
test('every tracked TypeScript file has an explicit current provenance record and generated report',async()=>{
  await checkProvenance();
});
test('file provenance rejects missing/stale files, invented references and contradictory origin claims',async()=>{
  const data=await load();delete data.files['src/tg/model/node.ts'];
  data.files['src/does-not-exist.ts']={relation:'new',origins:[],behaviors:[],note:'Invented file'};
  Object.assign(data.files['src/tg/model/edge.ts'],{relation:'new',origins:['invented'],behaviors:['MAP-999']});
  const errors=await validateProvenance(data);
  for(const text of ['Missing TypeScript provenance: src/tg/model/node.ts','Stale/untracked TypeScript provenance','unknown Java reference','unknown behavior MAP-999','contradicts relationship'])assert.ok(errors.some(e=>e.includes(text)),text);
});
test('an implementation file cannot masquerade as a re-export-only composition',async()=>{
  const data=await load();Object.assign(data.files['src/tg/model/node.ts'],{relation:'composition',origins:[]});
  assert.ok((await validateProvenance(data)).some(e=>e.includes('composition contains implementation declarations')));
});
test('optional reference verification detects changed Java bytes without a sibling checkout',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'fm4-java-provenance-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const data=await load(),source='class Origin {}\n';
  for(const entry of Object.values(data.files)){entry.origins=[];if(['adapted','related','reimplemented'].includes(entry.relation))entry.relation='new';}
  data.roots={fixture:{description:'Synthetic reference'}};
  data.origins={fixture:{root:'fixture',path:'Origin.java',kind:'java',symbol:'Origin',sha256:createHash('sha256').update(source).digest('hex')}};
  Object.assign(data.files['src/tg/model/node.ts'],{relation:'adapted',origins:['fixture']});
  await writeFile(join(directory,'Origin.java'),source);assert.deepEqual(await validateProvenance(data,{referenceRoots:{fixture:directory}}),[]);
  await writeFile(join(directory,'Origin.java'),'class Changed {}\n');
  assert.ok((await validateProvenance(data,{referenceRoots:{fixture:directory}})).some(e=>e.includes('pinned reference hash differs')));
  data.origins.fixture.path='../escape.java';assert.ok((await validateProvenance(data)).some(e=>e.includes('escapes root')));
});
