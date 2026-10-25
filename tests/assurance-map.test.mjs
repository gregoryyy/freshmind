import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateMap,renderMap} from '../scripts/assurance-map.mjs';
const load=async()=>JSON.parse(await readFile(new URL('../docs/assurance/traceability.json',import.meta.url),'utf8'));
test('traceability references real requirements and declarations; generated report is current',async()=>{
  const data=await load();assert.deepEqual(await validateMap(data),[]);
  assert.equal(renderMap(data),await readFile(new URL('../docs/assurance/TRACEABILITY.md',import.meta.url),'utf8'));
});
test('traceability rejects invented requirements, missing declarations, changed code and unsafe paths',async()=>{
  const data=await load(),row=data.mappings[0];
  row.requirements.push('INT-999');row.implementation[0].symbol='inventedFunction';row.implementation[0].sha256='0'.repeat(64);
  row.evidence.push('../outside-repository');
  const errors=await validateMap(data);
  for(const expected of ['unknown requirement INT-999','missing declaration','changed; review','Path escapes root'])assert.ok(errors.some(s=>s.includes(expected)),expected);
});
test('traceability rejects unmapped baseline requirements and unsupported pass claims',async()=>{
  const data=await load();for(const row of data.mappings)row.requirements=row.requirements.filter(id=>id!=='USE-01');
  data.mappings[0].status='verified';const errors=await validateMap(data);
  assert.ok(errors.some(s=>s.includes('USE-01: no implementation/evidence/gap mapping')));
  assert.ok(errors.some(s=>s.includes('unsupported evidence claim')));
});
