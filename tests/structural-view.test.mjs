import test from "node:test";
import assert from "node:assert/strict";
import {FreshGraph,FreshNode,FreshEdge,projectStructuralView,validateStructuralView,structuralViewDefaults,spanningTree,applyRelationEdit} from "fm4/fm/core";
import {FreshmindPanel,captureDocument,serializeDocument,parseDocument,installDocument} from "fm4/fm";
import {readFileSync} from "node:fs";
import {structuralExample} from "../scripts/structural-view-example.mjs";

function fixture(options={}) {
  const graph=new FreshGraph(),n={},e={};
  for(const [i,[id,type]] of [['focus','project'],['group','group'],['alice','person'],['bob','person'],['paper','paper'],['bridge','person'],['other','project']].entries()) {
    n[id]=new FreshNode(id,id,{type,position:{x:Math.cos(i)*100,y:Math.sin(i)*100}});graph.addNode(n[id]);
  }
  for(const [id,from,to,type] of [['fg','focus','group','default'],['ga','group','alice','default'],['ag','alice','group','default'],['gb','group','bob','default'],
    ['gp','group','paper','authored'],['gc','group','bridge','default'],['co','bridge','other','default']]) {
    e[id]=new FreshEdge(n[from],n[to],{id,type});graph.addEdge(e[id]);
  }
  const p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false,...options});p.setGraphEltSet(graph);p.getGES().addAll();p.repaint();
  return {p,graph,n,e,view:p.getStructuralView()};
}
const rules=()=>validateStructuralView({...structuralViewDefaults,enabled:true,aggregateTypes:['person','paper'],detailRadius:0});
const ids=graph=>[...graph.getNodes()].map(n=>n.getID());
const coords=graph=>[...graph.getNodes()].map(n=>[n.getID(),n.x,n.y]);
function incidence(p) {
  const visible=p.getGES();
  for(const n of p.getAllNodes()) {
    assert.equal(n.isVisible(),visible.contains(n),n.getID());
    assert.equal(n.visibleEdgeCount(),[...visible.getEdges()].reduce((s,e)=>s+(e.from===n)+(e.to===n),0),n.getID());
  }
  for(const e of p.getAllEdges())assert.equal(e.isVisible(),visible.contains(e),e.getID());
}

test('structural projection aggregates semantic leaves once, counts nodes rather than relations and preserves bridges',()=>{
  const {p,graph}=fixture(),before=serializeDocument(captureDocument(p));
  const projected=projectStructuralView(graph,p.getGES(),rules());
  assert.deepEqual(projected.aggregatedNodeIds,['alice','bob','paper']);
  assert.deepEqual(projected.groups,[{parentId:'group',type:'paper',nodeIds:['paper']},{parentId:'group',type:'person',nodeIds:['alice','bob']}]);
  assert.deepEqual(projected.nodes.map(n=>n.getID()),['focus','group','bridge','other']);
  assert.equal(serializeDocument(captureDocument(p)),before);p.destroy();
});

test('aggregation is conservative under locality truncation, relation filters, cycles, loops and ambiguous two-node components',()=>{
  const {p,graph,n,e}=fixture();p.getGES().removeNode(n.other);
  assert.ok(!projectStructuralView(graph,p.getGES(),rules()).aggregatedNodeIds.includes('bridge'));
  p.getGES().removeEdge(e.ga);p.getGES().removeEdge(e.ag);
  assert.ok(!projectStructuralView(graph,p.getGES(),rules()).aggregatedNodeIds.includes('alice'));
  p.getGES().addAll();graph.addEdge(new FreshEdge(n.bob,n.bob,{id:'loop'}));p.getGES().addAll();
  assert.ok(!projectStructuralView(graph,p.getGES(),rules()).aggregatedNodeIds.includes('bob'));
  graph.addEdge(new FreshEdge(n.alice,n.paper,{id:'cycle'}));p.getGES().addAll();
  assert.equal(projectStructuralView(graph,p.getGES(),rules()).aggregatedNodeIds.length,0);
  const tiny=new FreshGraph(),a=new FreshNode('a','a',{type:'person'}),b=new FreshNode('b','b',{type:'person'});
  tiny.addNode(a);tiny.addNode(b);tiny.addEdge(new FreshEdge(a,b));assert.equal(projectStructuralView(tiny,tiny,rules()).groups.length,0);p.destroy();
});

test('detail radius traverses protected members and explicit type filters override focal protection',()=>{
  const {p,graph}=fixture(),source=p.getGES();
  const projected=projectStructuralView(graph,source,{...rules(),detailRadius:2},['focus'],new Set(['group']));
  assert.deepEqual(projected.aggregatedNodeIds,[]);
  const filtered=projectStructuralView(graph,source,{...rules(),hiddenNodeTypes:['person'],hiddenRelationTypes:['authored']},['focus'],new Set(['alice','bob']));
  assert.deepEqual(filtered.filteredNodeIds,['alice','bob','bridge']);assert.ok(filtered.nodes.some(n=>n.getID()==='paper'));
  assert.deepEqual(filtered.aggregatedNodeIds,[]);assert.deepEqual(filtered.edges.map(e=>e.getID()),['fg']);p.destroy();
});

test('controller validates atomically, copies state, restores exact neighborhood order and leaves hidden edges hidden',()=>{
  const {p,graph,n,e,view}=fixture(),before=coords(graph);p.hideEdge(e.gp);p.getGES().removeNode(n.other);p.repaint();
  const sourceIds=ids(p.getGES()),sourceEdges=[...p.getGES().getEdges()].map(e=>e.getID());
  view.configure(rules());incidence(p);assert.deepEqual(view.getState().aggregatedNodeIds,['alice','bob']);
  const state=view.getState();state.settings.aggregateTypes.push('group');state.groups[0].nodeIds.length=0;
  assert.deepEqual(view.getState().settings.aggregateTypes,['paper','person']);
  const stable=view.getState();for(const update of [{detailRadius:7},{enabled:1},{aggregateTypes:['']},{hiddenRelationTypes:null}])
    {assert.throws(()=>view.configure(update));assert.deepEqual(view.getState(),stable);}
  view.configure({enabled:false});assert.deepEqual(ids(p.getGES()),sourceIds);assert.deepEqual([...p.getGES().getEdges()].map(e=>e.getID()),sourceEdges);
  assert.deepEqual(coords(graph),before);incidence(p);p.destroy();
});

test('raw neighborhood operations remain reversible through depth, direct writes, hiding, expansion and empty views',async()=>{
  const {p,n,e,view}=fixture();view.configure(rules());
  await p.setLocale(n.focus,1);assert.deepEqual(ids(p.getUnfilteredLocality()),['focus','group']);
  view.configure({enabled:false});assert.deepEqual(ids(p.getGES()),['focus','group']);
  view.configure({enabled:true});await p.expandNode(n.group);assert.ok(p.getUnfilteredLocality().contains(n.alice));
  assert.equal(p.getGES().contains(n.alice),true);
  p.getGES().removeEdge(e.ga);p.getGES().removeEdge(e.ag);view.configure({aggregateTypes:['person']});
  assert.ok(p.getGES().contains(n.alice)); // attachment was explicitly hidden
  p.getGES().removeNode(n.bob);view.configure({enabled:false});assert.equal(p.getGES().contains(n.bob),false);incidence(p);
  await p.setLocaleAll();view.configure({enabled:true,hiddenNodeTypes:['project','group','person','paper']});assert.equal(p.visibleNodeCount(),0);
  view.configure({enabled:false});assert.equal(p.visibleNodeCount(),7);incidence(p);p.destroy();
});

test('explicit filters clear stale selection, edge geometry, focus, dragging and RFC participation without deleting memberships',()=>{
  const {p,graph,n,e,view}=fixture();graph.setSubstructure(spanningTree(graph,['group','alice','bob'],'group','stored'));
  p.getRfc().activateSubstructure('stored');p.setSelectEdge(e.ga);p.centerOn(n.group,true);p.setDragNode(n.alice);p.getEdgeGeometry(e.ga);
  view.configure({...rules(),hiddenNodeTypes:['person']});
  assert.equal(p.getSelectEdge(),null);assert.equal(e.ga.getGeometry(),null);assert.equal(p.getDragNode(),null);
  assert.deepEqual(p.getRfc().getState().memberIds,['group']);assert.equal(graph.getSubstructure('stored').nodeIds.length,3);
  view.configure({hiddenNodeTypes:['group']});assert.equal(p.getFocus(),null);assert.equal(p.getSelect(),null);assert.equal(p.getRfc().getState().active,false);
  view.configure({enabled:false});assert.equal(p.getRfc().getState().active,true);assert.equal(graph.nodeCount(),7);incidence(p);p.destroy();
});

test('RFC activation restores eligible members from the source, supports multiple foci and explicit filters still win',()=>{
  const {p,graph,n,view}=fixture();p.getRfc().setFocus(n.focus);view.configure(rules());assert.equal(p.getGES().contains(n.alice),false);
  p.getRfc().addFocus(n.group);assert.equal(p.getGES().contains(n.alice),true);assert.equal(p.getGES().contains(n.paper),true);
  p.getRfc().removeFocus(n.group);assert.equal(p.getGES().contains(n.alice),false);
  graph.setSubstructure(spanningTree(graph,['focus','group','alice','bob'],'focus','deep'));p.getRfc().activateSubstructure('deep');
  assert.ok(p.getGES().contains(n.alice));view.configure({hiddenRelationTypes:['default']});assert.equal(p.getRfc().getState().radialEdgeIds.length,0);
  view.configure({enabled:false});assert.ok(p.getRfc().getState().radialEdgeIds.length>0);incidence(p);p.destroy();
});

test('view changes preserve physical coordinates, fixed nodes, lenses, live semantics and complete YAML data',async()=>{
  const {p,graph,n,view}=fixture();n.bob.setFixed(true);p.setZoom(1.4);p.setHyperbolic(40);p.setRotation(.6);p.setCanvasZoom(1.3);
  graph.setSubstructure(spanningTree(graph,['group','alice','bob'],'group','stored'));
  const before=serializeDocument(captureDocument(p)),positions=coords(graph);view.configure(rules());
  assert.equal(serializeDocument(captureDocument(p)),before);assert.deepEqual(coords(graph),positions);
  n.bridge.setSemanticType('task');p.repaint();assert.equal(view.getState().aggregatedNodeIds.includes('bridge'),false);
  n.paper.setSemanticType('concept');p.repaint();assert.ok(p.getGES().contains(n.paper));
  const read=parseDocument(serializeDocument(captureDocument(p)));assert.equal(read.graph.nodeCount(),7);assert.equal(read.graph.edgeCount(),7);
  const oldView=p.getStructuralView();await installDocument(p,read);assert.equal(p.getStructuralView(),oldView);assert.equal(view.getState().settings.enabled,false);
  assert.equal(read.graph.findNode('bob').fixed,true);assert.equal(p.getZoom(),1.4);assert.equal(p.getCanvasZoom(),1.3);p.destroy();
});

test('only presented nodes participate in ordinary and RFC integration; deleting hidden nodes cannot resurrect them',()=>{
  const {p,graph,n,view}=fixture();view.configure(rules());const hidden=[n.alice,n.bob,n.paper].map(n=>[n,n.x,n.y,n.dx,n.dy]);
  p.getRfc().setFocus(n.focus);p.resetDamper();p.tgLayout.tick(5);
  for(const [n,x,y,dx,dy] of hidden)assert.deepEqual([n.x,n.y,n.dx,n.dy],[x,y,dx,dy]);
  assert.equal(p.deleteNode(n.bob),true);view.configure({enabled:false});assert.equal(p.getGES().contains(n.bob),false);assert.equal(graph.findNode('bob'),null);incidence(p);
  view.configure({enabled:true});p.clearAll();assert.equal(view.getState().settings.enabled,false);assert.equal(p.visibleNodeCount(),0);p.destroy();
});

test('explicit visibility flags update candidate membership without forgetting rule-hidden members, and loop incidence stays exact',()=>{
  const {p,graph,n,view}=fixture();graph.addEdge(new FreshEdge(n.group,n.group,{id:'loop'}));p.getGES().addAll();view.configure(rules());incidence(p);
  n.bridge.setVisible(false);p.updateLocalityFromVisibility();assert.equal(p.getUnfilteredLocality().contains(n.bridge),false);
  assert.equal(p.getUnfilteredLocality().contains(n.alice),true);view.configure({enabled:false});assert.ok(p.getGES().contains(n.alice));incidence(p);p.destroy();
});

test('queued animated neighborhoods and replacement cannot restore suppressed members from earlier requests',async()=>{
  const {p,n,view}=fixture({animateLocality:true});view.configure(rules());
  const first=p.setLocale(n.focus,1),second=p.setLocale(n.other,1);p.fastFinishAnimation();await Promise.all([first,second]);
  assert.deepEqual(new Set(ids(p.getUnfilteredLocality())),new Set(['other','bridge']));
  view.configure({enabled:false});assert.deepEqual(new Set(ids(p.getGES())),new Set(['other','bridge']));incidence(p);
  view.configure({enabled:true});const stale=p.setLocale(n.group,2),replacement=new FreshGraph();
  const fresh=new FreshNode('fresh','Fresh',{position:{x:0,y:0}});replacement.addNode(fresh);p.setGraphEltSet(replacement);
  p.getGES().addAll();await stale;p.repaint();assert.deepEqual(ids(p.getGES()),['fresh']);assert.equal(view.getState().settings.enabled,false);incidence(p);p.destroy();
});

test('native hybrid example regenerates exactly and keeps shared collaborators while restoring stored focal detail',async()=>{
  const source=readFileSync(new URL('../examples/rfc/structural-focus-context.fm.yaml',import.meta.url),'utf8');
  assert.equal(serializeDocument(structuralExample()),source);
  const doc=parseDocument(source),p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false});await installDocument(p,doc,{reinforceFocus:true});
  const view=p.getStructuralView();view.configure({...rules(),detailRadius:1});
  assert.equal(p.visibleNodeCount(),6);assert.ok(p.getGES().contains(p.findNode('shared')));assert.equal(view.getState().aggregatedNodeIds.length,7);
  p.getRfc().activateSubstructure('a-detail');assert.equal(p.visibleNodeCount(),9);
  p.getRfc().activateSubstructure('b-detail',true);assert.equal(p.visibleNodeCount(),13);assert.equal(view.getState().groups.length,0);
  assert.equal(doc.graph.nodeCount(),13);assert.equal(doc.graph.edgeCount(),13);incidence(p);p.destroy();
});

test('relation reconnection edits source membership atomically, retaining selection and attachments to aggregated targets',()=>{
  const {p,graph,n,e,view}=fixture();view.configure(rules());p.setSelectEdge(e.fg);
  assert.equal(p.getGES().contains(n.paper),false);let selections=0;const remove=p.addSelectionListener(()=>selections++);
  applyRelationEdit(e.fg,{label:'changed',type:'default',curve:null,to:'paper'},{graph,locality:p.getGES()});
  assert.equal(selections,0);assert.equal(p.getSelectEdge(),e.fg);assert.ok(p.getUnfilteredLocality().contains(e.fg));
  p.repaint();assert.equal(p.getSelectEdge(),e.fg);assert.ok(p.getGES().contains(n.paper));assert.ok(p.getGES().contains(e.fg));
  assert.equal(e.fg.from,n.focus);assert.equal(e.fg.to,n.paper);assert.equal(e.fg.getLabel(),'changed');incidence(p);
  view.configure({enabled:false});assert.ok(p.getGES().contains(e.fg));assert.equal(graph.edgeCount(),7);remove();p.destroy();
});
