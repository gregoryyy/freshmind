import test from 'node:test';
import assert from 'node:assert/strict';
import {HorizontalStretchLens,TGPoint2D,TGLayout,GraphEltSet} from 'fm4/core';
import {TGPanel} from 'fm4';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('configurable lens reproduces FM2014 horizontal stretch and its inverse',()=>{
  const lens=new HorizontalStretchLens(1.5),point=new TGPoint2D(20,-12);lens.applyLens(point);assert.deepEqual([point.x,point.y],[30,-12]);lens.undoLens(point);assert.deepEqual([point.x,point.y],[20,-12]);
  for(const ratio of [.6,16/9,4/3,.01,100]){lens.setRatio(ratio);const point=new TGPoint2D(-31,17);lens.applyLens(point);near(point.x,-31*ratio);assert.equal(point.y,17);lens.undoLens(point);near(point.x,-31);assert.equal(point.y,17);}
  lens.setRatio(1.5);for(const invalid of [0,-1,NaN,Infinity,.001,101])assert.throws(()=>lens.setRatio(invalid),/aspect/);assert.equal(lens.getRatio(),1.5);
});
test('aspect is applied after viewing lenses and before viewport origin, preserving physics and other view state',()=>{
  const p=new TGPanel(undefined,{autoStart:false});
  try {
    p.addNode('a','A');p.findNode('a').x=23;p.findNode('a').y=-17;p.setHyperbolic(60);p.setRotation(.3);p.setZoom(1.4);p.setLensPan(25,7);p.setCanvasZoom(.8);p.setCanvasPan(22,-3);
    const point={x:160,y:-70},origin=p.getAdjustOriginLens(),before=p.getLensSet().convRealToDraw(point.x,point.y),physics=p.tgLayout.getState(),position=[p.findNode('a').x,p.findNode('a').y],pan=p.getLensPan();
    p.setGraphAspectMode('3:5');const after=p.getLensSet().convRealToDraw(point.x,point.y);
    near(after.x-origin.x,(before.x-origin.x)*.6);near(after.y,before.y);assert.deepEqual(p.tgLayout.getState(),physics);assert.deepEqual([p.findNode('a').x,p.findNode('a').y],position);assert.deepEqual(p.getLensPan(),pan);
    p.setGraphAspectMode('original');assert.deepEqual(p.getLensSet().convRealToDraw(point.x,point.y),before);
  } finally {p.destroy();}
});
test('panel policy validates atomically, retains independent layout/document ownership and returns detached state',()=>{
  const p=new TGPanel(undefined,{autoStart:false});
  try {
    assert.deepEqual(p.getGraphAspectState(),{mode:'original',ratio:1});p.setGraphAspectMode('3:5');
    for(const invalid of ['square','',null])assert.throws(()=>p.setGraphAspectMode(invalid),/Invalid/);assert.deepEqual(p.getGraphAspectState(),{mode:'3:5',ratio:.6});
    p.setTGLayout(new TGLayout(p));p.setGraphEltSet(new GraphEltSet());assert.deepEqual(p.getGraphAspectState(),{mode:'3:5',ratio:.6});
    p.setGraphAspectMode('canvas');assert.deepEqual(p.getGraphAspectState(),{mode:'canvas',ratio:4/3});const state=p.getGraphAspectState();state.mode='original';assert.equal(p.getGraphAspectState().mode,'canvas');
  } finally {p.destroy();}
  assert.throws(()=>p.setGraphAspectMode('canvas'),/destroyed/);assert.throws(()=>new TGPanel(undefined,{graphAspect:'invalid'}),/Invalid/);
});
