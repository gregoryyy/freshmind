import test from 'node:test';
import assert from 'node:assert/strict';
import {FreshmindPanel} from 'fm4/fm/browser';
import {FreshNode} from 'fm4/fm/model';
test('default keyboard target follows actual viewport centering through independent lenses and canvas pan',()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false});
  try{
    Object.assign(p.getAdjustOriginLens(),p.getDrawCenter()); // Mounted panels set this viewport translation on resize.
    const a=p.addNode(new FreshNode('a','A',{position:{x:0,y:0}})),b=p.addNode(new FreshNode('b','B',{position:{x:180,y:70}})),c=p.addNode(new FreshNode('c','C',{position:{x:-140,y:-80}}));
    p.setHyperbolic(45);p.setRotation(.4);p.setZoom(1.6);p.setCanvasZoom(1.3);p.centerOn(a,true);assert.equal(p.getCenteredNode(),a);
    p.centerOn(b,false);assert.equal(p.getFocus(),a);assert.equal(p.getCenteredNode(),b);
    const center=p.getDrawCenter(),point=p.drawToScreen({x:c.drawx,y:c.drawy}),pan=p.getCanvasPan();p.setCanvasPan(pan.x+center.x-point.x,pan.y+center.y-point.y);
    const before=[...p.getAllNodes()].map(n=>[n.x,n.y,n.dx,n.dy]),view=[p.getZoom(),p.getHyperbolic(),p.getRotation(),p.getCanvasZoom(),p.getCanvasPan()];
    assert.equal(p.getCenteredNode(),c);assert.equal(p.getSelect(),null);assert.equal(p.getFocus(),a);
    assert.deepEqual([...p.getAllNodes()].map(n=>[n.x,n.y,n.dx,n.dy]),before);assert.deepEqual([p.getZoom(),p.getHyperbolic(),p.getRotation(),p.getCanvasZoom(),p.getCanvasPan()],view);
    p.getGES().removeNode(c);assert.notEqual(p.getCenteredNode(),c);p.clearAll();assert.equal(p.getCenteredNode(),null);
  }finally{p.destroy();}
});
test('center ties prefer the viewing focus, then stable IDs, without requiring selection',()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false});
  try{
    Object.assign(p.getAdjustOriginLens(),p.getDrawCenter());
    const z=p.addNode(new FreshNode('z','Z',{position:{x:0,y:0}})),a=p.addNode(new FreshNode('a','A',{position:{x:0,y:0}}));
    assert.equal(p.getCenteredNode(),a);p.centerOn(z,true);assert.equal(p.getCenteredNode(),z);
  }finally{p.destroy();}
});
