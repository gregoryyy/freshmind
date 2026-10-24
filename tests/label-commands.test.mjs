import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWeightedLabel} from 'fm4/fm/edit';
test('numeric label commands separate absolute weight from multiline node and relation labels',()=>{
  for(const [input,label,weight] of [['Topic =3','Topic',3],['First\nSecond = 0.25','First\nSecond',.25],['related =0','related',0],['Topic =1e2','Topic',100]])assert.deepEqual(parseWeightedLabel(input),{label,weight});
  for(const input of ['a=b','x = y','literal \\=3','trailing text =3 units'])assert.deepEqual(parseWeightedLabel(input),{label:input});
});
test('negative or overflowing numeric weight commands fail without changing their input',()=>{
  for(const input of ['Topic =-1','related =1e999'])assert.throws(()=>parseWeightedLabel(input),/finite nonnegative/);
});
