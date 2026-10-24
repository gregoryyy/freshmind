import test from 'node:test';
import assert from 'node:assert/strict';
import {FreshNode,FreshEdge,FreshGraph,FreshmindDocument,TypeRegistry,freshmind2014Configuration,nodeImportanceScale} from 'fm4/fm/core';
import {FreshmindPanel,serializeDocument,parseDocument,captureDocument,installDocument} from 'fm4/fm';

const style={mode:'size',minScale:.85,maxScale:1.5};
test('importance size has exact default identity, finite bounds and monotone behavior from zero to the largest finite weight',()=>{
  assert.equal(nodeImportanceScale(0,style),.85);assert.equal(nodeImportanceScale(1,style),1);
  assert.equal(nodeImportanceScale(9,style),1.4);assert.equal(nodeImportanceScale(Number.MAX_VALUE,style),1.5);
  let previous=0;
  for(const weight of [0,Number.MIN_VALUE,1e-12,.01,.1,.25,.5,1,2,9,100,1e8,Number.MAX_VALUE]) {
    const scale=nodeImportanceScale(weight,style);assert.ok(Number.isFinite(scale)&&scale>=.85&&scale<=1.5&&scale>=previous);previous=scale;
  }
  assert.equal(nodeImportanceScale(9,{...style,minScale:1,maxScale:1}),1);
  for(const mode of ['none','legacy'])assert.equal(nodeImportanceScale(9,{...style,mode}),1);
  for(const weight of [-1,NaN,Infinity])assert.throws(()=>nodeImportanceScale(weight,style));
  for(const changes of [{mode:'bad'},{minScale:.4},{minScale:1.1},{maxScale:.9},{maxScale:3.1},{maxScale:NaN}])
    assert.throws(()=>nodeImportanceScale(1,{...style,...changes}));
});

test('importance styles inherit through type and item/state overrides without altering font configuration or metadata',()=>{
  const config=structuredClone(freshmind2014Configuration);config.nodeVisuals.person.importance={minScale:.9,maxScale:2};
  config.nodeVisuals.person.states={selected:{importance:{maxScale:2.5}}};
  const registry=new TypeRegistry(config),node=new FreshNode('a','A',{type:'person',weight:9,visual:{style:{importance:{mode:'none'}}}});
  const resolved=registry.resolveNode(node,['selected']);assert.deepEqual(resolved.importance,{mode:'none',minScale:.9,maxScale:2.5});
  node.setVisual({});const normal=registry.resolveNode(node);assert.deepEqual(normal.importance,{mode:'size',minScale:.9,maxScale:2});
  assert.equal(normal.text.font,registry.resolveNode(new FreshNode('b','A',{type:'person',weight:1})).text.font);
  normal.importance.minScale=1;assert.equal(registry.resolveNode(node).importance.minScale,.9);
  assert.equal(node.getWeight(),9);assert.equal(node.getID(),'a');
});

test('old profiles resolve importance defaults and invalid YAML/item bounds are rejected before mutation',()=>{
  const old=structuredClone(freshmind2014Configuration);delete old.nodeVisuals.default.importance;
  const node=new FreshNode('a');assert.deepEqual(new TypeRegistry(old).resolveNode(node).importance,style);
  for(const importance of [{mode:'configured'},{mode:true},{minScale:0},{minScale:1.1},{maxScale:4},{maxScale:Infinity},{unknown:1}]) {
    const config=structuredClone(old);config.nodeVisuals.default.importance=importance;assert.throws(()=>new TypeRegistry(config));
    assert.throws(()=>node.setVisual({style:{importance}}));assert.deepEqual(node.getVisual(),{});
  }
});

test('display preferences are detached and atomic, retain configured styles and do not wake layout or alter RFC forces',()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false,nodeImportance:{showValues:true}}),a=p.addNode('a'),b=p.addNode('b');p.addEdge(a,b);
  a.setLocation({x:0,y:0});b.setLocation({x:160,y:50});b.setWeight(9);p.getRfc().setFocus(a);p.repaint();
  const force=()=>{for(const n of p.getAllNodes())n.dx=n.dy=0;p.getRfc().apply(p.getGES(),.1);return [...p.getAllNodes()].map(n=>[n.dx,n.dy]);};
  const before=force(),positions=[a.x,a.y,b.x,b.y],rfc=p.getRfc().getState(),config=p.getTypeRegistry().getConfiguration();let wakes=0;
  const original=p.resetDamper.bind(p);p.resetDamper=()=>{wakes++;original();};
  for(const mode of ['none','legacy','size','configured']) {
    p.configureNodeImportance({mode,showValues:false});assert.deepEqual(force(),before);assert.deepEqual([a.x,a.y,b.x,b.y],positions);
    assert.equal(p.getNodeStyle(b).importance.mode,mode==='configured'?'size':mode);assert.deepEqual(p.getRfc().getState(),rfc);
  }
  assert.equal(wakes,0);assert.deepEqual(p.getTypeRegistry().getConfiguration(),config);
  const detached=p.getNodeImportance();detached.mode='none';assert.equal(p.getNodeImportance().mode,'configured');
  const stable=p.getNodeImportance();for(const bad of [{mode:'bad'},{showValues:1}]){assert.throws(()=>p.configureNodeImportance(bad));assert.deepEqual(p.getNodeImportance(),stable);}
  assert.throws(()=>new FreshmindPanel(undefined,{nodeImportance:{showValues:'yes'}}));p.destroy();
});

test('type/item importance styles round trip while transient display preferences remain outside saved graph/view data',async()=>{
  const types=new TypeRegistry(freshmind2014Configuration),graph=new FreshGraph(),a=new FreshNode('a','A',{weight:0,position:{x:0,y:0},visual:{style:{importance:{mode:'legacy'}}}}),b=new FreshNode('b','B',{weight:9,position:{x:100,y:0}});
  graph.addNode(a);graph.addNode(b);graph.addEdge(new FreshEdge(a,b,{id:'ab',weight:30}));
  const doc=new FreshmindDocument(types,graph),p=new FreshmindPanel(undefined,{autoStart:false});await installDocument(p,doc);
  const before=serializeDocument(captureDocument(p));p.configureNodeImportance({mode:'none',showValues:true});assert.equal(serializeDocument(captureDocument(p)),before);
  const read=parseDocument(before);assert.equal(read.graph.findNode('a').getWeight(),0);assert.equal(read.graph.findNode('b').getWeight(),9);
  assert.equal(read.types.resolveNode(read.graph.findNode('a')).importance.mode,'legacy');assert.equal(read.types.resolveNode(read.graph.findNode('b')).importance.mode,'size');
  await installDocument(p,read);assert.deepEqual(p.getNodeImportance(),{mode:'none',showValues:true});p.destroy();
});
