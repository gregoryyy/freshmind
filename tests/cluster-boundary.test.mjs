import test from "node:test";
import assert from "node:assert/strict";
import {createClusterBoundary} from "fm4/fm/core";

test("rounded cluster hulls are closed, deterministic and do not mutate node/curve bounds",()=>{
  const boxes=[{x:0,y:0,width:120,height:28},{x:160,y:30,width:70,height:40},{x:80,y:150,width:90,height:30}],controls=[{x:180,y:160}];
  const snapshot=structuredClone({boxes,controls}),path=createClusterBoundary(boxes,controls);
  assert.match(path,/^M .* A .* L .* Z$/);assert.ok(!/NaN|Infinity/.test(path));
  assert.equal(createClusterBoundary([...boxes].reverse(),controls),path);assert.deepEqual({boxes,controls},snapshot);
  assert.notEqual(createClusterBoundary(boxes),path); // The internal route extends the enclosure.
});

test("empty, singleton, coincident, collinear and zero-size cluster hulls remain finite",()=>{
  assert.equal(createClusterBoundary([]),"");
  for(const boxes of [[{x:10,y:20,width:80,height:30}],Array(3).fill({x:10,y:20,width:80,height:30}),
    [0,100,200].map(x=>({x,y:0,width:40,height:20})),[{x:0,y:0,width:0,height:0}],
    [{x:0,y:0,width:0,height:0},{x:100,y:0,width:0,height:0}]]) {
    const path=createClusterBoundary(boxes);assert.match(path,/^M .* A .* Z$/);assert.ok(!/NaN|Infinity/.test(path));
  }
  for(const boxes of [[{x:NaN,y:0,width:10,height:10}],[{x:0,y:0,width:-1,height:10}]])assert.throws(()=>createClusterBoundary(boxes));
  assert.throws(()=>createClusterBoundary([],[],-1));
});
