import test from "node:test";
import assert from "node:assert/strict";
import {FreshGraph,FreshNode,FreshEdge,FreshmindDocument,TypeRegistry,freshmind2014Configuration,
  spanningTree,validateSubstructure,analyzeSubstructure,clusterGraph,clusterToSubstructure,applyRfcForces,collectFocalStar} from "fm4/fm/core";
import {FreshmindPanel,captureDocument} from "fm4/fm";
import {serializeDocument,parseDocument,documentToRecord,readDocument} from "fm4/fm/io";

function diamond() {
  const graph=new FreshGraph();
  for(const [id,x,y] of [["a",0,0],["b",-40,0],["c",40,0],["d",0,-40],["outside",300,0]])graph.addNode(new FreshNode(id,id,{position:{x,y}}));
  for(const [id,from,to] of [["ab","a","b"],["ac","a","c"],["bd","b","d"],["cd","c","d"],["context","d","outside"]])graph.addEdge(new FreshEdge(graph.findNode(from),graph.findNode(to),{id}));
  return graph;
}
const dag={id:"dag",label:"Diamond",kind:"dag",rootId:"a",nodeIds:["a","b","c","d"],edgeIds:["ab","ac","bd","cd"]};
const tree={...dag,id:"tree",label:"Tree",kind:"tree",edgeIds:["ab","ac","bd"]};

test("substructures support overlapping memberships, shared DAG descendants and defensive graph-owned records",()=>{
  const graph=diamond();graph.setSubstructure(tree);graph.setSubstructure(dag);
  assert.equal(graph.getNodeSubstructures("d").length,2);assert.deepEqual([...analyzeSubstructure(graph,dag).levels],[['a',0],['b',1],['c',1],['d',2]]);
  const copy=graph.getSubstructure("tree");copy.nodeIds.length=0;assert.equal(graph.getSubstructure("tree").nodeIds.length,4);
  assert.equal(graph.nodeCount(),5);assert.equal(graph.edgeCount(),5);assert.equal(graph.findNode("d").edgeCount(),3);
});

test("tree/DAG validation rejects invalid membership atomically and accepts semantic backwards links in a tree",()=>{
  const graph=diamond();graph.setSubstructure(tree);
  const invalid=[{...dag,edgeIds:[...dag.edgeIds,"context"]},{...dag,rootId:"b"},{...tree,nodeIds:[...tree.nodeIds,"outside"]},
    {...tree,nodeIds:["a","a"]},{...tree,edgeIds:["ab","ab","bd"]},{...tree,rootId:"missing"},{...tree,extra:1},
    {...tree,nodeIds:["a","missing"]},{...tree,edgeIds:["ab","ac","missing"]}];
  for(const value of invalid)assert.throws(()=>graph.setSubstructure(value));
  assert.deepEqual(graph.getSubstructure("tree"),tree);
  graph.addEdge(new FreshEdge(graph.findNode("d"),graph.findNode("a"),{id:"cycle"}));
  assert.throws(()=>validateSubstructure(graph,{...dag,edgeIds:[...dag.edgeIds,"cycle"]}),/cycles/);
  assert.equal(spanningTree(graph,["a","d"],"a","reverse").edgeIds[0],"cycle");
});

test("YAML persists membership without activating RFC, while files without structures retain their record shape",()=>{
  const graph=diamond();graph.setSubstructure(tree);graph.setSubstructure(dag);
  const doc=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph),record=documentToRecord(doc);
  const restored=parseDocument(serializeDocument(doc));assert.deepEqual(documentToRecord(restored),record);
  for(const structures of [[tree,tree],[{...tree,unknown:1}],"bad",[{...dag,rootId:"outside"}]])assert.throws(()=>readDocument({...record,substructures:structures}));
  const panel=new FreshmindPanel(undefined,{autoStart:false});panel.setGraphEltSet(restored.graph);panel.getGES().addAll();
  assert.equal(panel.getRfc().getState().enabled,false);panel.getRfc().activateSubstructure("tree");panel.getRfc().addFocus(panel.findNode("c"));
  assert.deepEqual(documentToRecord(captureDocument(panel),{includeView:false}),{...record,title:"Freshmind graph"});
  panel.destroy();const empty=documentToRecord(new FreshmindDocument(new TypeRegistry(freshmind2014Configuration)));
  assert.equal(Object.hasOwn(empty,"substructures"),false);
});

test("structural deletion/reconnection invalidate affected definitions; ordinary context edits do not",()=>{
  const graph=diamond();graph.setSubstructure(tree);graph.setSubstructure(dag);
  graph.deleteEdge([...graph.getEdges()].find(e=>e.getID()==="context"));assert.equal(graph.getSubstructures().length,2);
  graph.deleteEdge([...graph.getEdges()].find(e=>e.getID()==="cd"));assert.equal(graph.getSubstructure("dag"),null);assert.ok(graph.getSubstructure("tree"));
  graph.reconnectEdge([...graph.getEdges()].find(e=>e.getID()==="bd"),graph.findNode("d"),graph.findNode("b"));assert.equal(graph.getSubstructure("tree"),null);
  graph.setSubstructure(spanningTree(graph,["a","b"],"a","pair"));graph.deleteNode(graph.findNode("b"));assert.equal(graph.getSubstructures().length,0);
});

test("multiple centers suspend independently, ordinary activation replaces all, and clearing preserves graph membership",()=>{
  const panel=new FreshmindPanel(undefined,{autoStart:false}),graph=diamond();panel.setGraphEltSet(graph);panel.getGES().addAll();
  const rfc=panel.getRfc();rfc.setFocus(graph.findNode("a"));rfc.addFocus(graph.findNode("d"));rfc.addFocus(graph.findNode("d"));
  assert.deepEqual(rfc.getState().centers.map(c=>c.focusId),["a","d"]);
  panel.getGES().removeNode(graph.findNode("a"));panel.repaint();assert.equal(rfc.getState().active,true);
  assert.deepEqual(rfc.getState().centers.map(c=>c.active),[false,true]);
  panel.getGES().addNodeWithEdges(graph.findNode("a"));rfc.setFocus(graph.findNode("c"));assert.deepEqual(rfc.getState().centers.map(c=>c.focusId),["c"]);
  rfc.addFocus(graph.findNode("d"));
  rfc.removeFocus("c");assert.equal(rfc.getState().focusId,"d");rfc.setFocus(null);assert.equal(rfc.getState().centers.length,0);
  assert.equal(graph.nodeCount(),5);assert.equal(graph.edgeCount(),5);panel.destroy();
});

test("exclusive focus prunes additional centers even on the current root and preserves a promoted stored tree",()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false}),g=diamond();g.setSubstructure(tree);p.setGraphEltSet(g);p.getGES().addAll();
  try {
    const rfc=p.getRfc(),a=g.findNode("a"),d=g.findNode("d");
    rfc.activateSubstructure("tree");rfc.addFocus(d);rfc.setFocus(a);
    assert.deepEqual(rfc.getState().centers.map(c=>[c.focusId,c.structureId]),[["a","tree"]]);
    rfc.setFocus(d);rfc.activateSubstructure("tree",true);rfc.setFocus(a);
    assert.deepEqual(rfc.getState().centers.map(c=>[c.focusId,c.structureId]),[["a","tree"]]);
    rfc.addFocus(d);rfc.activateSubstructure("tree");
    assert.deepEqual(rfc.getState().centers.map(c=>c.focusId),["a"]);
    rfc.addFocus(d);assert.throws(()=>rfc.setFocus(new FreshNode("foreign")),/visible/);
    assert.equal(rfc.getState().centers.length,2);
    assert.deepEqual(g.getSubstructure("tree"),tree);
  } finally {p.destroy();}
});

test("toggle removes primary, secondary and last centers without changing membership, locality or coordinates",()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false}),g=diamond();g.setSubstructure(tree);p.setGraphEltSet(g);p.getGES().addAll();
  try {
    const rfc=p.getRfc(),a=g.findNode("a"),d=g.findNode("d"),positions=[...g.getNodes()].map(n=>[n.x,n.y]);
    rfc.activateSubstructure("tree");assert.equal(rfc.toggleFocus(d),true);
    assert.equal(rfc.toggleFocus(a),false);assert.equal(rfc.getState().focusId,"d");
    assert.equal(rfc.toggleFocus(a),true);assert.equal(rfc.toggleFocus(a),false);
    assert.equal(rfc.getState().focusId,"d");
    p.tgLayout.stopMotion();p.tgLayout.stopMotion();assert.equal(p.tgLayout.getState().damper,0);
    assert.equal(rfc.toggleFocus(d),false);assert.equal(rfc.getState().enabled,false);
    assert.equal(p.tgLayout.getState().damper,1);
    assert.deepEqual(g.getSubstructure("tree"),tree);assert.equal(p.visibleNodeCount(),g.nodeCount());
    assert.deepEqual([...g.getNodes()].map(n=>[n.x,n.y]),positions);
    p.setSelect(a);const navigation=p.getNavigation();
    navigation.handleKey({key:"Enter",shiftKey:true});assert.equal(rfc.getState().enabled,true);
    navigation.handleKey({key:"Enter",shiftKey:true,repeat:true});assert.equal(rfc.getState().enabled,true);
    navigation.handleKey({key:"Enter",shiftKey:true});assert.equal(rfc.getState().enabled,false);
  } finally {p.destroy();}
});

test("a structural tree reinforces grandchildren, limits membership and deduplicates radial constraints at shared centers",()=>{
  const panel=new FreshmindPanel(undefined,{autoStart:false}),graph=diamond();graph.setSubstructure(tree);panel.setGraphEltSet(graph);panel.getGES().addAll();
  const rfc=panel.getRfc();rfc.activateSubstructure("tree");const state=rfc.getState();
  assert.deepEqual(new Set(state.memberIds),new Set(tree.nodeIds));assert.deepEqual(new Set(state.radialEdgeIds),new Set(tree.edgeIds));
  rfc.apply(panel.getGES(),1);assert.notEqual(graph.findNode("d").dy,0);assert.equal(graph.findNode("outside").dx,0);assert.equal(graph.findNode("outside").dy,0);
  panel.destroy();
  const p=new FreshmindPanel(undefined,{autoStart:false}),a=p.addNode(new FreshNode("a","a",{position:{x:0,y:0}})),b=p.addNode(new FreshNode("b","b",{position:{x:50,y:0}}));p.addEdge(a,b);
  const controller=p.getRfc();controller.configure({angularStiffness:0});controller.setFocus(a);controller.apply(p.getGES(),1);const single=[a.dx,b.dx];
  a.dx=b.dx=0;controller.addFocus(b);controller.apply(p.getGES(),1);assert.deepEqual([a.dx,b.dx],single);p.destroy();
});

test("shared-branch angular moments are attenuated rather than added at full stiffness",()=>{
  const graph=diamond(),root=graph.findNode("a");graph.findNode("b").y=30;
  const star=collectFocalStar(graph,root),settings={springMultiplier:1,angularStiffness:100};
  applyRfcForces(star,settings,1);const original=[...graph.getNodes()].map(n=>[n.dx,n.dy]);
  assert.ok(original.flat().some(n=>Math.abs(n)>1e-5));
  for(const n of graph.getNodes())n.dx=n.dy=0;
  applyRfcForces(star,settings,1,new Map(star.branches.map(b=>[b.node,2])));
  for(const [i,n] of [...graph.getNodes()].entries()){assert.equal(n.dx,original[i][0]/2);assert.equal(n.dy,original[i][1]/2);}
});

test("editing a stored root migrates active centers and invalidates cached topology before the next force step",()=>{
  const panel=new FreshmindPanel(undefined,{autoStart:false}),graph=diamond();graph.setSubstructure(tree);panel.setGraphEltSet(graph);panel.getGES().addAll();
  const rfc=panel.getRfc();rfc.activateSubstructure("tree");rfc.addFocus(graph.findNode("outside"));
  panel.stopMotion();panel.stopMotion();assert.equal(panel.tgLayout.getState().damper,0);
  graph.setSubstructure({...tree,rootId:"b"});rfc.apply(panel.getGES(),1);
  assert.equal(panel.tgLayout.getState().damper,1);
  assert.equal(rfc.getState().focusId,"b");assert.deepEqual(rfc.getState().centers.map(c=>c.focusId),["b","outside"]);
  graph.setSubstructure(spanningTree(graph,["b","d"],"b","tree","Reduced"));rfc.reconcile();
  assert.deepEqual(new Set(rfc.getState().centers[0].memberIds),new Set(["b","d"]));
  graph.removeSubstructure("tree");rfc.setFocus(graph.findNode("b"));assert.equal(rfc.getState().centers[0].kind,"star");
  panel.destroy();
});

test("DAG reinforcement respects ranks and shared descendants, with equal opposite target-spring reactions",()=>{
  const panel=new FreshmindPanel(undefined,{autoStart:false}),graph=diamond();graph.setSubstructure(dag);panel.setGraphEltSet(graph);panel.getGES().addAll();
  const rfc=panel.getRfc();rfc.activateSubstructure("dag");rfc.apply(panel.getGES(),1);
  assert.ok(graph.findNode("d").dy>graph.findNode("b").dy);
  assert.ok(Math.abs([...graph.getNodes()].reduce((s,n)=>s+n.dx,0))<1e-9);assert.ok(Math.abs([...graph.getNodes()].reduce((s,n)=>s+n.dy,0))<1e-9);
  graph.findNode("a").fixed=true;panel.resetDamper();panel.tgLayout.tick(200);
  assert.ok(graph.findNode("d").y>graph.findNode("b").y+40);assert.ok(graph.findNode("b").y>graph.findNode("a").y+40);
  assert.equal(rfc.getState().centers[0].kind,"dag");assert.equal(rfc.getState().centers[0].angularGapRms,null);panel.destroy();
});

function communities() {
  const graph=new FreshGraph();for(const id of ["a","b","c","d","e","f","g","h","i","j","isolate"])graph.addNode(new FreshNode(id));
  let index=0;for(const group of [["a","b","c","d","e"],["f","g","h","i","j"]])for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)graph.addEdge(new FreshEdge(graph.findNode(group[i]),graph.findNode(group[j]),{id:`e${index++}`}));
  graph.addEdge(new FreshEdge(graph.findNode("e"),graph.findNode("f"),{id:"bridge"}));return graph;
}
test("deterministic Louvain separates dense communities; components retain topology and isolates",()=>{
  const graph=communities(),result=clusterGraph(graph);
  assert.deepEqual(result.clusters.map(c=>c.nodeIds),[["a","b","c","d","e"],["f","g","h","i","j"],["isolate"]]);
  assert.deepEqual(clusterGraph(graph),result);assert.ok(result.modularity>0);
  assert.deepEqual(clusterGraph(graph,{algorithm:"components"}).clusters.map(c=>c.nodeIds.length),[10,1]);
  assert.equal(graph.nodeCount(),11);assert.equal(graph.edgeCount(),21);assert.equal(graph.getSubstructures().length,0);
});

test("cluster conversion preserves all semantic edges, verifies freshness and accepts chosen roots",()=>{
  const graph=communities(),result=clusterGraph(graph),cluster=result.clusters[0];
  graph.findNode("a").x+=20;const tree=clusterToSubstructure(graph,result,cluster.id,"chosen","Chosen","c");
  assert.equal(tree.rootId,"c");assert.equal(tree.edgeIds.length,tree.nodeIds.length-1);graph.setSubstructure(tree);assert.equal(graph.edgeCount(),21);
  assert.throws(()=>clusterToSubstructure(graph,result,cluster.id,"bad","Bad","isolate"));
  graph.addEdge(new FreshEdge(graph.findNode("a"),graph.findNode("isolate"),{id:"new"}));assert.throws(()=>clusterToSubstructure(graph,result,cluster.id,"stale"),/detect clusters again/);
});

test("clustering ignores loops, aggregates parallel/reciprocal links, supports zero weights and validates options",()=>{
  const graph=new FreshGraph();for(const id of ["a","b","c"])graph.addNode(new FreshNode(id));
  graph.addEdge(new FreshEdge(graph.findNode("a"),graph.findNode("a"),{id:"loop",weight:100}));
  for(const [id,a,b,weight] of [["ab","a","b",1],["ba","b","a",2],["ab2","a","b",3],["bc","b","c",0]])graph.addEdge(new FreshEdge(graph.findNode(a),graph.findNode(b),{id,weight}));
  assert.deepEqual(clusterGraph(graph,{algorithm:"components",weighted:true}).clusters.map(c=>c.nodeIds),[["a","b"],["c"]]);
  assert.deepEqual(clusterGraph(graph,{algorithm:"components"}).clusters.map(c=>c.nodeIds),[["a","b","c"]]);
  assert.deepEqual(clusterGraph(new FreshGraph()).clusters,[]);
  for(const options of [{algorithm:"unknown"},{resolution:0},{resolution:Infinity},{weighted:"yes"}])assert.throws(()=>clusterGraph(graph,options));
});
