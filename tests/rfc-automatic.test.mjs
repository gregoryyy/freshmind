import test from 'node:test';
import assert from 'node:assert/strict';
import {FreshGraph,FreshNode,FreshEdge,FreshmindPanel,captureDocument} from 'fm4/fm';
import {documentToRecord} from 'fm4/fm/io';
import {automaticRfcFixture} from './fixtures/automatic-rfc.mjs';
const constructors={FreshGraph,FreshNode,FreshEdge};
function setup(reverse=false){
  const graph=automaticRfcFixture(constructors,reverse),panel=new FreshmindPanel(undefined,{autoStart:false});
  panel.setGraphEltSet(graph);panel.getGES().addAll();panel.getRfc().setFocus(graph.findNode('r'));
  return {graph,panel,rfc:panel.getRfc()};
}
const ids=p=>({nodes:p.nodes.map(n=>n.getID()),edges:p.edges.map(e=>e.getID())});
const impulses=g=>Object.fromEntries([...g.getNodes()].map(n=>[n.getID(),[n.dx,n.dy]]));
const clear=g=>{for(const n of g.getNodes()){n.dx=0;n.dy=0;}};
const expected={nodes:['r','a','b','s','t'],edges:['ra0','br','as','at']};
test('automatic two-level projection has independent shortest-hop and stable tree-edge oracles',()=>{
  for(const reverse of [false,true]) {
    const {graph,panel,rfc}=setup(reverse);
    try {
      assert.equal(rfc.getState().neighborhoodDepth,1);assert.deepEqual(new Set(rfc.getState().memberIds),new Set(['r','a','b']));
      rfc.setNeighborhoodDepth(2);const p=rfc.projectFocus(graph.findNode('r'));
      assert.deepEqual(ids(p),expected);assert.equal(p.definition.kind,'tree');assert.equal(rfc.getState().centers[0].kind,'tree');
      assert.equal(new Set(p.edges.flatMap(e=>[e.from,e.to])).size,p.nodes.length);assert.equal(p.edges.length,p.nodes.length-1);
      assert.equal(graph.getSubstructures().length,0);assert.equal(graph.edgeCount(),11);assert.equal(graph.findNode('r').edgeCount(),5);
      const state=rfc.getState();state.memberIds.length=0;assert.equal(rfc.getState().memberIds.length,5);
      assert.throws(()=>rfc.setNeighborhoodDepth(3),/1 or 2/);assert.equal(rfc.getState().neighborhoodDepth,2);
      assert.throws(()=>rfc.setNeighborhoodDepth(NaN));
    } finally {panel.destroy();}
  }
});
test('automatic forces match the independently specified stored tree and preserve the semantic document',()=>{
  const {graph,panel,rfc}=setup(),other=setup();
  try {
    const original=documentToRecord(captureDocument(panel),{includeView:false}),positions=[...graph.getNodes()].map(n=>[n.x,n.y]);
    rfc.setNeighborhoodDepth(2);
    other.graph.setSubstructure({id:'oracle',label:'Oracle',kind:'tree',rootId:'r',nodeIds:expected.nodes,edgeIds:expected.edges});
    other.rfc.activateSubstructure('oracle');
    rfc.configure({coordinateWeights:{x:.5,y:2}});other.rfc.configure({coordinateWeights:{x:.5,y:2}});
    rfc.apply(panel.getGES(),.7);other.rfc.apply(other.panel.getGES(),.7);assert.deepEqual(impulses(graph),impulses(other.graph));
    for(const id of ['z','f','x'])assert.deepEqual(impulses(graph)[id],[0,0]);
    assert.ok(impulses(graph).t.some(v=>v!==0));assert.deepEqual([...graph.getNodes()].map(n=>[n.x,n.y]),positions);
    assert.deepEqual(documentToRecord(captureDocument(panel),{includeView:false}),original);
  } finally {panel.destroy();other.panel.destroy();}
});
test('multiple automatic centers share real objects, suspend independently and deduplicate radial forces',()=>{
  const {graph,panel,rfc}=setup();
  try {
    rfc.setNeighborhoodDepth(2);rfc.addFocus(graph.findNode('x'));
    const centers=rfc.getState().centers;assert.deepEqual(centers.map(c=>c.memberIds),[expected.nodes,['x','t','a','f']]);
    const shared=rfc.projectFocus(graph.findNode('x'));assert.equal(shared.nodes.find(n=>n.getID()==='a'),graph.findNode('a'));
    rfc.configure({angularStiffness:0});rfc.apply(panel.getGES(),1);const both=impulses(graph);
    // Leaf s is owned only by r; duplicate at is reinforced once across the two trees.
    rfc.removeFocus('x');clear(graph);rfc.apply(panel.getGES(),1);const single=impulses(graph);
    assert.deepEqual(both.a,single.a);assert.deepEqual(both.s,single.s);
    rfc.addFocus(graph.findNode('x'));panel.getGES().removeNode(graph.findNode('r'));rfc.reconcile();
    assert.deepEqual(rfc.getState().centers.map(c=>c.active),[false,true]);
    rfc.removeFocus('r');assert.equal(rfc.getState().focusId,'x');rfc.setFocus(null);assert.equal(rfc.getState().centers.length,0);
  } finally {panel.destroy();}
});
test('locality, live weight/edge changes and graph replacement recompute automatic membership',()=>{
  const {graph,panel,rfc}=setup();
  try {
    rfc.setNeighborhoodDepth(2);panel.getGES().removeNode(graph.findNode('a'));rfc.reconcile();
    assert.deepEqual(new Set(rfc.getState().memberIds),new Set(['r','b','s']));
    panel.getGES().addNodeWithEdges(graph.findNode('a'));graph.findNode('s').setWeight(0);rfc.reconcile();assert.ok(!rfc.getState().memberIds.includes('s'));
    const edge=[...graph.getEdges()].find(e=>e.getID()==='at');edge.setWeight(0);rfc.reconcile();assert.ok(!rfc.getState().memberIds.includes('t'));
    edge.setWeight(10);rfc.reconcile();assert.ok(rfc.getState().memberIds.includes('t'));
    graph.deleteEdge(edge);panel.repaint();assert.ok(!rfc.getState().memberIds.includes('t'));
    panel.setGraphEltSet(automaticRfcFixture(constructors));assert.equal(rfc.getState().enabled,false);assert.equal(rfc.getState().neighborhoodDepth,2);
    panel.destroy();assert.throws(()=>rfc.setNeighborhoodDepth(1),/destroyed/);
  } finally {panel.destroy();}
});
test('aggregation retains automatic grandchildren from the unfiltered source; explicit filters still apply',()=>{
  const {graph,panel,rfc}=setup();
  try {
    const leaf=new FreshNode('leaf','Leaf',{type:'idea'});graph.addNode(leaf);
    graph.addEdge(new FreshEdge(graph.findNode('a'),leaf,{id:'a-leaf'}));panel.getGES().addNodeWithEdges(leaf);
    rfc.setNeighborhoodDepth(2);panel.setSelect(graph.findNode('r'));
    panel.getStructuralView().configure({enabled:true,aggregateTypes:['idea'],detailRadius:0});panel.repaint();
    assert.deepEqual(new Set(rfc.getState().memberIds),new Set([...expected.nodes,'leaf']));assert.ok(panel.getGES().contains(leaf));
    rfc.setNeighborhoodDepth(1);panel.repaint();assert.ok(!panel.getGES().contains(leaf));
    // Previously aggregated grandchildren reappear from source without turning rules off.
    rfc.setNeighborhoodDepth(2);panel.repaint();assert.ok(panel.getGES().contains(leaf));assert.ok(!panel.getGES().contains(graph.findNode('f')));
    panel.getStructuralView().configure({hiddenNodeTypes:['idea']});panel.repaint();assert.equal(rfc.getState().active,false);
  } finally {panel.destroy();}
});
test('stored structures and explicit result stars retain scope under automatic depth changes',()=>{
  const {graph,panel,rfc}=setup();
  try {
    graph.setSubstructure({id:'pair',label:'Pair',kind:'tree',rootId:'r',nodeIds:['r','a'],edgeIds:['ra0']});
    rfc.activateSubstructure('pair');rfc.setNeighborhoodDepth(2);assert.deepEqual(rfc.getState().memberIds,['r','a']);
    const result=[...graph.getEdges()].find(e=>e.getID()==='br');rfc.setFocusEdges(graph.findNode('r'),[result]);
    assert.deepEqual(new Set(rfc.getState().memberIds),new Set(['r','b']));assert.equal(rfc.getState().centers[0].kind,'star');
    rfc.setNeighborhoodDepth(1);rfc.setNeighborhoodDepth(2);assert.deepEqual(new Set(rfc.getState().memberIds),new Set(['r','b']));
    rfc.setFocus(graph.findNode('r'));assert.deepEqual(ids(rfc.projectFocus(graph.findNode('r'))),expected);
    rfc.setNeighborhoodDepth(1);assert.deepEqual(new Set(rfc.getState().memberIds),new Set(['r','a','b']));
    assert.throws(()=>rfc.setFocusEdges(graph.findNode('r'),[[...graph.getEdges()].find(e=>e.getID()==='at')]),/incident/);
  } finally {panel.destroy();}
});
