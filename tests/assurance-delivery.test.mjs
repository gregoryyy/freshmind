import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inventory,differences} from '../scripts/lib/assurance-artifacts.mjs';
test('artifact comparison detects same-length changed bytes, missing and added files',async t=>{
  const root=await mkdtemp(join(tmpdir(),'fm4-artifacts-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'nested'));await writeFile(join(root,'nested/a'),'first');
  const original=await inventory(root);assert.equal(original['nested/a'].bytes,5);
  await writeFile(join(root,'nested/a'),'other');const changed=await inventory(root);
  assert.deepEqual(differences(original,changed),['nested/a']);assert.deepEqual(differences(original,original),[]);
  assert.deepEqual(differences(original,{}),['nested/a']);assert.deepEqual(differences({},original),['nested/a']);
});
test('artifact inventory refuses symlinks rather than hashing data outside the deliverable',async t=>{
  const root=await mkdtemp(join(tmpdir(),'fm4-artifact-link-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await symlink('/does-not-exist',join(root,'link'));await assert.rejects(inventory(root),/symlink/);
});

test('delivery workflow keeps untrusted PR execution read-only with immutable action references',async()=>{
  const {readFile}=await import('node:fs/promises'),{parse}=await import('yaml');
  const workflow=parse(await readFile(new URL('../.github/workflows/assurance.yml',import.meta.url),'utf8'));
  assert.deepEqual(workflow.permissions,{contents:'read'});assert.equal(Object.hasOwn(workflow.on,'pull_request_target'),false);
  assert.ok(Object.hasOwn(workflow.on,'pull_request'));
  const steps=workflow.jobs.delivery.steps;
  for(const step of steps.filter(s=>s.uses))assert.match(step.uses,/^[^@]+@[a-f0-9]{40}$/);
  assert.equal(steps.find(s=>s.uses?.startsWith('actions/checkout@'))?.with['persist-credentials'],false);
});
