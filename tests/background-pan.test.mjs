import test from 'node:test';
import assert from 'node:assert/strict';
import {TGPanel} from 'fm4';
function fixture(t){const p=new TGPanel(undefined,{autoStart:false,animateLocality:false});t.after(()=>p.destroy());const a=p.addNode('a','A'),b=p.addNode('b','B'),hidden=p.addNode('hidden','Hidden');a.setLocation({x:8,y:-3});b.setLocation({x:100,y:120});hidden.setLocation({x:-200,y:40});p.getGES().removeNode(hidden);p.setSelect(a);p.centerOn(a,true);return {p,a,b,hidden};}
const positions=p=>[...p.getAllNodes()].map(n=>[n.getID(),n.x,n.y]);
const close=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);
test('inverse-lens scrolling has independently specified rotation/scale arithmetic and preserves the document',t=>{
  const {p,a}=fixture(t);p.setZoom(2);p.setRotation(Math.PI/2);p.setCanvasZoom(2);p.setCanvasPan(13,-9);p.setLensPan(12,18);
  const original=positions(p),canvas=p.getCanvasPan();p.panGraphBetween({x:450,y:350},{x:490,y:310});
  // Screen delta (40,-40) / canvas scale 2, then inverse quarter-turn: (-20,-20).
  close(p.getLensPan().x,-8);close(p.getLensPan().y,-2);assert.deepEqual(p.getCanvasPan(),canvas);assert.equal(p.getCanvasZoom(),2);assert.equal(p.getZoom(),2);
  assert.deepEqual(positions(p),original);assert.equal(p.getSelect(),a);assert.equal(p.getFocus(),a);assert.equal(p.getGES().nodeCount(),2);
});
test('nonlinear scrolling keeps the grabbed physical point under the pointer through repeated rotated/scaled steps',t=>{
  const {p}=fixture(t);p.setHyperbolic(70);p.setZoom(1.4);p.setRotation(.6);p.setCanvasZoom(1.7);p.setCanvasPan(22,-14);
  const steps=[{x:480,y:365},{x:500,y:340},{x:530,y:355},{x:485,y:375}],grab=p.getLensSet().convDrawToReal(p.screenToDraw(steps[0])),original=positions(p),canvas=p.getCanvasPan();
  for(let i=1;i<steps.length;i++){p.panGraphBetween(steps[i-1],steps[i]);const mapped=p.drawToScreen(p.getLensSet().convRealToDraw(grab));// Java uses a sampled inverse; retain a subpixel bound rather than asserting an exact analytic inverse.
    close(mapped.x,steps[i].x,.1);close(mapped.y,steps[i].y,.1);}
  assert.deepEqual(positions(p),original);assert.deepEqual(p.getCanvasPan(),canvas);
});
test('invalid or overflowing pan drafts reject atomically',t=>{
  const {p}=fixture(t),pan=p.getLensPan();
  for(const [a,b] of [[{x:NaN,y:0},{x:0,y:0}],[{x:0,y:0},{x:Infinity,y:0}],[{x:1e308,y:0},{x:-1e308,y:0}]]){
    assert.throws(()=>p.panGraphBetween(a,b),RangeError);assert.deepEqual(p.getLensPan(),pan);
  }
  assert.throws(()=>new TGPanel(undefined,{backgroundPan:'unknown'}),/Invalid background/);
});
