import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWeightedLabel,applyLabelEdit} from 'fm4/fm/edit';
import {FreshNode,FreshEdge,FreshGraph} from 'fm4/fm/core';
import {FreshmindPanel} from 'fm4/fm/browser';
test('numeric label commands separate absolute weight from multiline node and relation labels',()=>{
  for(const [input,label,weight] of [['Topic =3','Topic',3],['First\nSecond = 0.25','First\nSecond',.25],['related =0','related',0],['Topic =1e2','Topic',100]])assert.deepEqual(parseWeightedLabel(input),{label,weight});
  for(const input of ['a=b','x = y','literal \\=3','trailing text =3 units'])assert.deepEqual(parseWeightedLabel(input),{label:input});
});
test('negative or overflowing numeric weight commands fail without changing their input',()=>{
  for(const input of ['Topic =-1','related =1e999'])assert.throws(()=>parseWeightedLabel(input),/finite nonnegative/);
});
test('label-only commits preserve graph identity, metadata, positions, styles and unrelated item fields',()=>{
  const graph=new FreshGraph(),a=new FreshNode('a','Alpha',{position:{x:10,y:20},annotation:{format:'text',text:'keep'},url:'https://example.org/',visual:{style:{shape:'circle',fill:'#abcdef'}},data:{source:'original'}}),b=new FreshNode('b','Beta');
  graph.addNode(a);graph.addNode(b);
  const edge=new FreshEdge(a,b,{id:'e',label:'related',type:'cites',length:77,visual:{style:{curve:'straight'}},data:{provenance:3}});graph.addEdge(edge);
  const nodeVisual=a.getVisual(),edgeVisual=edge.getVisual();
  assert.throws(()=>applyLabelEdit(a,'Invalid =-1'),/finite nonnegative/);assert.equal(a.getLabel(),'Alpha');assert.equal(a.getWeight(),1);
  applyLabelEdit(a,'First\nSecond =2.5');applyLabelEdit(edge,'Relation =0');
  assert.equal(graph.findNode('a'),a);assert.equal([...graph.getEdges()].find(e=>e.getID()==='e'),edge);
  assert.equal(a.getLabel(),'First\nSecond');assert.equal(a.getWeight(),2.5);assert.equal(a.x,10);assert.equal(a.y,20);
  assert.deepEqual(a.getAnnotation(),{format:'text',text:'keep'});assert.equal(a.getURL(),'https://example.org/');assert.deepEqual(a.getData(),{source:'original'});assert.deepEqual(a.getVisual(),nodeVisual);
  assert.equal(edge.getLabel(),'Relation');assert.equal(edge.getWeight(),0);assert.equal(edge.from,a);assert.equal(edge.to,b);assert.equal(edge.getLength(),77);assert.equal(edge.getSemanticType(),'cites');assert.deepEqual(edge.getData(),{provenance:3});assert.deepEqual(edge.getVisual(),edgeVisual);
  a.setLabel('Imported =3');applyLabelEdit(a,a.getLabel());assert.equal(a.getLabel(),'Imported =3');assert.equal(a.getWeight(),2.5);
  const defaultVisual=b.getVisual();applyLabelEdit(b,'Edited default');assert.deepEqual(b.getVisual(),defaultVisual);
});
test('label editing is an explicit transient panel option with validated mode changes',()=>{
  const panel=new FreshmindPanel(undefined,{autoStart:false});
  try {
    assert.equal(panel.getLabelEditingMode(),'on-demand');panel.setLabelEditingMode('in-place');
    assert.equal(panel.getLabelEditingMode(),'in-place');assert.equal(panel.focusLabelEditor(),false);
    assert.throws(()=>panel.setLabelEditingMode('unknown'),/Invalid label editing mode/);assert.equal(panel.getLabelEditingMode(),'in-place');
    panel.setGraphEltSet(new FreshGraph());assert.equal(panel.getLabelEditingMode(),'in-place');panel.clearAll();assert.equal(panel.getLabelEditingMode(),'in-place');
    panel.setLabelEditingMode('on-demand');assert.equal(panel.getLabelEditingMode(),'on-demand');
  }finally{panel.destroy();}
  assert.throws(()=>new FreshmindPanel(undefined,{autoStart:false,labelEditing:'bad'}),/Invalid label editing mode/);
});
