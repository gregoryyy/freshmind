import test from 'node:test';
import assert from 'node:assert/strict';
import {FreshNode,FreshEdge,FreshGraph,GraphClipboard,createLinkedNode,linkNodes,FreshmindDocument,TypeRegistry,freshmind2014Configuration} from 'fm4/fm/core';
import {FreshmindPanel,bindStructuralEditing,captureDocument,installDocument} from 'fm4/fm';
import {serializeDocument,parseDocument,documentToRecord} from 'fm4/fm/io';
const defaults={nodeType:'default',relationType:'default'};
function graphFixture(){const graph=new FreshGraph(),a=new FreshNode('a','A',{position:{x:4,y:8}}),b=new FreshNode('b','B');graph.addNode(a);graph.addNode(b);return {graph,a,b};}
function contents(graph){return documentToRecord(new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph));}
test('linked creation has literal legacy endpoint/default-label semantics, fresh IDs and atomic validation',()=>{
  const {graph,a,b}=graphFixture();graph.addNode(new FreshNode('n1','occupied'));graph.addEdge(new FreshEdge(a,b,{id:'e1'}));
  const before=contents(graph),normal=createLinkedNode(graph,a,defaults),reverse=createLinkedNode(graph,b,defaults,true);
  assert.deepEqual([normal.node.getID(),normal.node.getLabel(),normal.edge.getID(),normal.edge.from.getID(),normal.edge.to.getID(),normal.edge.getLabel()],['n2','[new]','e2','n2','a','sub']);
  assert.deepEqual([reverse.node.getID(),reverse.node.getLabel(),reverse.edge.from.getID(),reverse.edge.to.getID(),reverse.edge.getLabel()],['n3','[new parent]','b','n3','super']);
  assert.deepEqual(contents(graph).nodes.slice(0,3),before.nodes);assert.deepEqual(contents(graph).edges[0],before.edges[0]);
  const valid=contents(graph);assert.throws(()=>createLinkedNode(graph,a,{...defaults,relationType:''}));assert.deepEqual(contents(graph),valid);
  assert.throws(()=>createLinkedNode(graph,new FreshNode('a','stale'),defaults));assert.deepEqual(contents(graph),valid);
});
test('sibling uses the sole complete incident edge, rejecting loops, reciprocal/parallel edges and isolation',()=>{
  const {graph,a,b}=graphFixture();const edge=graph.addEdge(new FreshEdge(a,b,{id:'ab'}));
  const sibling=createLinkedNode(graph,a,defaults,false,true);assert.equal(sibling.edge.to,b);assert.equal(sibling.edge.from,sibling.node);
  graph.addEdge(new FreshEdge(a,b,{id:'parallel'}));let before=contents(graph);assert.throws(()=>createLinkedNode(graph,a,defaults,false,true),/exactly one/);assert.deepEqual(contents(graph),before);
  graph.deleteEdge(edge);graph.addEdge(new FreshEdge(b,a,{id:'reciprocal'}));before=contents(graph);assert.throws(()=>createLinkedNode(graph,a,defaults,true,true));assert.deepEqual(contents(graph),before);
  const loop=new FreshNode('loop','Loop');graph.addNode(loop);graph.addEdge(new FreshEdge(loop,loop));assert.throws(()=>createLinkedNode(graph,loop,defaults,false,true));
  const isolated=new FreshNode('isolate','I');graph.addNode(isolated);assert.throws(()=>createLinkedNode(graph,isolated,defaults,false,true));
});
test('clipboard clones detached unary data with new IDs and positions, links reuse only the same live graph',()=>{
  const {graph,a,b}=graphFixture(),clipboard=new GraphClipboard();
  a.setAnnotation({format:'html',text:'<script>inert()</script>'});a.setURL('file:///private/test');a.setWeight(3);a.setFixed(true);a.setVisual({style:{fill:'#123456'}});a.setData({nested:{array:[1,'two']}});a.setExtensions({app:{retained:true}});
  clipboard.copy(graph,a);const expected=contents(graph).nodes[0];a.setLabel('Changed');a.setData({later:true});
  const clone=clipboard.paste(graph,b,'custom');const actual=contents(graph).nodes.find(n=>n.id===clone.node.getID());
  const {id,position,...fields}=actual;const {id:oldId,position:oldPosition,...sourceFields}=expected;assert.notEqual(id,oldId);assert.notDeepEqual(position,oldPosition);assert.deepEqual(fields,sourceFields);
  assert.deepEqual([clone.edge.from.getID(),clone.edge.to.getID(),clone.edge.getLabel()],['b',id,'[child of]']);
  const reused=clipboard.link(graph,b,'custom');assert.equal(reused.to,a);assert.equal(graph.nodeCount(),3);
  const before=contents(graph);assert.throws(()=>clipboard.link(graph,b,'custom'),/already/);assert.deepEqual(contents(graph),before);
  assert.throws(()=>linkNodes(graph,b,b,'default'),/different/);assert.deepEqual(contents(graph),before);
  graph.deleteNode(a);graph.addNode(new FreshNode('a','replacement'));assert.throws(()=>clipboard.link(graph,b,'custom'),/stale/);assert.equal(clipboard.paste(graph,b,'custom').node.getLabel(),'A');
  const other=graphFixture();assert.throws(()=>clipboard.link(other.graph,other.b,'default'),/another document/);assert.equal(clipboard.paste(other.graph,other.b,'default').node.getData().nested.array[1],'two');
  clipboard.clear();assert.throws(()=>clipboard.paste(graph,b,'default'),/Copy/);
});
test('creation rolls back a rejected insertion without partial graph mutation',()=>{
  class Rejecting extends FreshGraph {addEdge(){throw new Error('rejected');}}
  const graph=new Rejecting(),a=new FreshNode('a','A');graph.addNode(a);const before=contents(graph);
  assert.throws(()=>createLinkedNode(graph,a,defaults),/rejected/);assert.deepEqual(contents(graph),before);assert.equal([...a.getEdges()].length,0);
});
test('structural commands respect mode and selected-item ownership, hidden incidence, repeats and disposal',t=>{
  const p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false});t.after(()=>p.destroy());
  const a=p.addNode('a','A'),b=p.addNode('b','B'),e=p.addEdge(a,b);p.setSelect(a);p.centerOn(b,true);
  let edited=0,changed=0;const dispose=bindStructuralEditing(p,{editLabel(){edited++;},changed(){changed++;},initialFocus(){},newDocument(){}}),nav=p.getNavigation();
  nav.handleKey({key:'n',ctrlKey:true});assert.equal(p.getNodeCount(),2);p.setInteractionMode('edit');
  nav.handleKey({key:'n',ctrlKey:true,repeat:true});assert.equal(p.getNodeCount(),2);
  p.getGES().removeEdge(e);nav.handleKey({key:'n',ctrlKey:true,shiftKey:true});assert.equal(p.getNodeCount(),3);assert.equal(edited,1);assert.equal(changed,1);
  p.addEdge(e);p.setSelectEdge(e);nav.handleKey({key:'m',ctrlKey:true});assert.equal(p.getNodeCount(),3);
  p.setSelectEdge(null);p.setSelect(a);nav.handleKey({key:'l',ctrlKey:true});assert.match(nav.getState().message,/already/);
  assert.equal(nav.handleKey({key:'n',ctrlKey:true,isComposing:true}),false);dispose();assert.equal(nav.handleKey({key:'n',ctrlKey:true}),false);
});
test('explicit reopening focus persists without view, wins on install, and deleted targets are omitted on capture',async t=>{
  const p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false});t.after(()=>p.destroy());
  const {graph}=graphFixture(),doc=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph);doc.initialFocus='b';doc.view={focus:'a',radius:1,lenses:{pan:{x:120,y:90}},canvas:{zoom:1.4,pan:{x:45,y:-10}}};
  const loaded=parseDocument(serializeDocument(doc,{includeView:false}));assert.equal(loaded.initialFocus,'b');assert.equal(loaded.view,undefined);
  await installDocument(p,doc);assert.equal(p.getSelect().getID(),'b');assert.equal(Math.abs(p.getLensPan().x),0);assert.equal(Math.abs(p.getCanvasPan().x),0);assert.equal(p.getCanvasZoom(),1.4);assert.equal(captureDocument(p,doc).initialFocus,'b');
  p.deleteNode(graph.findNode('b'));assert.equal(captureDocument(p,doc).initialFocus,undefined);
  assert.throws(()=>serializeDocument(doc),/initialFocus/);
  const data=contents(graph);assert.throws(()=>parseDocument(serializeDocument(new FreshmindDocument(doc.types,graph)).replace('version: 1','version: 1\ninitialFocus: missing')),/initialFocus/);assert.deepEqual(contents(graph),data);
});
test('cancelled document installations cannot replace a newer graph',async t=>{
  const p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false});t.after(()=>p.destroy());
  const original=p.getCompleteEltSet(),doc=new FreshmindDocument(p.getTypeRegistry());let current=true;
  const pending=installDocument(p,doc,{isCurrent:()=>current});current=false;await pending;assert.equal(p.getCompleteEltSet(),original);
});
