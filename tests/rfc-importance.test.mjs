import test from "node:test";
import assert from "node:assert/strict";
import {Node,Edge} from "fm4/core";
import {FreshGraph,FreshNode,FreshEdge,collectFocalStar,applyRfcForces,rfcNodeImportance,rfcEdgeImportance,rfcRelationStrength} from "fm4/fm/core";
import {FreshmindPanel} from "fm4/fm";
import {multiFocusFixture} from "./fixtures/rfc-multifocus.mjs";

const clear=graph=>{for(const n of graph.getNodes())n.dx=n.dy=0;};
const impulses=graph=>[...graph.getNodes()].map(n=>[n.dx,n.dy]);
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function fixture() {
  const graph=new FreshGraph(),root=new FreshNode("root","root",{position:{x:10,y:-20}});graph.addNode(root);
  for(const [i,x,y] of [[0,85,40],[1,-50,110],[2,-80,-65]]) {
    const n=new FreshNode(`n${i}`,`n${i}`,{position:{x,y}});graph.addNode(n);
    graph.addEdge(new FreshEdge(root,n,{id:`e${i}`,length:65+i*15}));
  }
  return {graph,root,edges:[...graph.getEdges()]};
}

test("importance is bounded, symmetric, normalized to existing defaults and neutral on plain TouchGraph objects",()=>{
  const a=new FreshNode("a"),b=new FreshNode("b"),edge=new FreshEdge(a,b);
  assert.equal(rfcNodeImportance(a),1);assert.equal(rfcEdgeImportance(edge),1);assert.equal(rfcRelationStrength(edge),1);
  a.setWeight(9);b.setWeight(.25);edge.setWeight(30);
  near(rfcRelationStrength(edge),Math.sqrt(1.8)*Math.sqrt(.4)*1.5);
  near(rfcRelationStrength(new FreshEdge(b,a,{weight:30})),rfcRelationStrength(edge));
  for(const weight of [0,Number.MIN_VALUE,.1,1,10,Number.MAX_VALUE]) {
    a.setWeight(weight);b.setWeight(weight);edge.setWeight(weight);
    assert.ok(Number.isFinite(rfcRelationStrength(edge)));assert.ok(rfcRelationStrength(edge)>=0&&rfcRelationStrength(edge)<=4);
  }
  const x=new Node("x"),y=new Node("y");assert.equal(rfcRelationStrength(new Edge(x,y)),1);
});

test("node and relation importance scale radial stiffness without changing rest length, mass or ordinary repulsion",()=>{
  const {graph,root,edges}=fixture(),settings={springMultiplier:3,radialStiffness:1,radialLength:120,angularStiffness:0};
  const branch=graph.findNode("n0"),star={...collectFocalStar(graph,root),branches:collectFocalStar(graph,root).branches.filter(b=>b.node===branch)};
  applyRfcForces(star,settings,1);const before=[root.dx,root.dy,branch.dx,branch.dy],repulsion=root.repulsion;
  clear(graph);root.setWeight(9);branch.setWeight(4);edges[0].setWeight(30);
  applyRfcForces(star,settings,1);const scale=Math.sqrt(1.8)*Math.sqrt(1.6)*1.5;
  for(const [i,value] of [root.dx,root.dy,branch.dx,branch.dy].entries())near(value,before[i]*scale);
  near(root.dx,-branch.dx);near(root.dy,-branch.dy);assert.equal(root.repulsion,repulsion);assert.equal(edges[0].getLength(),65);
});

test("weighted radial and angular forces match physical energy gradients, including anisotropy and shared ownership",()=>{
  const {graph,root,edges}=fixture(),nodes=[...graph.getNodes()],metric={x:.25,y:2},rigidity=.6;
  [4,9,.25,.5].forEach((w,i)=>nodes[i].setWeight(w));[20,5,40].forEach((w,i)=>edges[i].setWeight(w));
  const settings={springMultiplier:2,radialStiffness:.4,radialLength:120,angularStiffness:700};
  const ownership=new Map([[nodes[1],2],[nodes[2],3],[nodes[3],1]]);
  const factor=e=>Math.sqrt(2*e.from.getWeight()/(e.from.getWeight()+1))*Math.sqrt(2*e.to.getWeight()/(e.to.getWeight()+1))*(2*e.getWeight()/(e.getWeight()+10));
  const energy=()=>{
    const branches=edges.map(e=>({e,n:e.getOtherEndpt(root),a:Math.atan2(Math.sqrt(metric.y)*(e.to.y-root.y),Math.sqrt(metric.x)*(e.to.x-root.x))})).sort((a,b)=>a.a-b.a);
    let sum=0;
    for(const {e,n} of branches) {
      const distance=Math.sqrt(metric.x*(n.x-root.x)**2+metric.y*(n.y-root.y)**2);
      sum+=factor(e)*rigidity*(settings.radialStiffness/2*(Math.hypot(distance,1)-120)**2+(settings.springMultiplier-1)*distance**3/(3*e.getLength()*100));
    }
    branches.forEach((b,i)=>{
      const next=branches[(i+1)%branches.length],gap=next.a+(i===branches.length-1?2*Math.PI:0)-b.a;
      sum+=settings.angularStiffness*rigidity/2*Math.sqrt(factor(b.e)*factor(next.e))*(gap-2*Math.PI/branches.length)**2/Math.max(ownership.get(b.n),ownership.get(next.n));
    });return sum;
  };
  applyRfcForces(collectFocalStar(graph,root,metric),settings,rigidity,ownership);
  for(const node of nodes)for(const [coordinate,impulse] of [["x","dx"],["y","dy"]]) {
    const h=1e-4,original=node[coordinate];node[coordinate]=original+h;const plus=energy();node[coordinate]=original-h;const minus=energy();node[coordinate]=original;
    near(node[impulse],-(plus-minus)/(2*h),2e-7);
  }
  near(nodes.reduce((s,n)=>s+n.dx,0),0);near(nodes.reduce((s,n)=>s+n.dy,0),0);
});

test("zero nodes and links leave no added impulse, angular ghost branch, or semantic deletion",()=>{
  const {graph,root,edges}=fixture(),settings={springMultiplier:3,radialStiffness:1,radialLength:120,angularStiffness:1000};
  const captured=collectFocalStar(graph,root);edges[1].setWeight(0);
  applyRfcForces(captured,settings,1);const zero=graph.findNode("n1");assert.deepEqual([zero.dx,zero.dy],[0,0]);
  const result=impulses(graph);clear(graph);applyRfcForces(collectFocalStar(graph,root),settings,1);assert.deepEqual(impulses(graph),result);
  edges[1].setWeight(10);zero.setWeight(0);clear(graph);applyRfcForces(collectFocalStar(graph,root),settings,1);
  assert.deepEqual([zero.dx,zero.dy],[0,0]);assert.equal(collectFocalStar(graph,root).branches.length,2);
  root.setWeight(0);clear(graph);applyRfcForces(captured,settings,1);assert.ok(impulses(graph).flat().every(n=>n===0));
  assert.equal(graph.nodeCount(),4);assert.equal(graph.edgeCount(),3);
});

test("parallel/reciprocal constraints choose the lowest eligible ID without summing importance or using loops",()=>{
  const {graph,root}=fixture(),node=graph.findNode("n0");
  graph.addEdge(new FreshEdge(root,node,{id:"a-zero",weight:0}));
  const canonical=new FreshEdge(node,root,{id:"b-positive",weight:30});graph.addEdge(canonical);
  graph.addEdge(new FreshEdge(root,root,{id:"loop",weight:Number.MAX_VALUE}));
  const star=collectFocalStar(graph,root);assert.equal(star.branches.length,3);assert.equal(star.branches.find(b=>b.node===node).edge,canonical);
  canonical.setWeight(0);assert.equal(collectFocalStar(graph,root).branches.find(b=>b.node===node).edge.getID(),"e0");
  assert.equal(graph.edgeCount(),6);
});

test("shared weighted tree edges apply once, and zero weights remove constraints while retaining saved definitions",()=>{
  const {graph,layout,rfc}=multiFocusFixture("shared-subtree",{mode:"left"});
  try {
    const node=graph.findNode("s1"),edge=[...graph.getEdges()].find(e=>e.to===node),definitions=graph.getSubstructures();
    node.setWeight(9);edge.setWeight(30);rfc.configure({angularStiffness:0});rfc.apply(graph,1);const single=[node.dx,node.dy];
    clear(graph);rfc.activateSubstructure("b-tree",true);rfc.apply(graph,1);assert.deepEqual([node.dx,node.dy],single);
    clear(graph);edge.setWeight(0);rfc.apply(graph,1);assert.deepEqual([node.dx,node.dy],[0,0]);
    assert.ok(!rfc.getState().radialEdgeIds.includes(edge.getID()));assert.deepEqual(graph.getSubstructures(),definitions);
    edge.setWeight(10);node.setWeight(0);clear(graph);rfc.apply(graph,1);assert.deepEqual([node.dx,node.dy],[0,0]);
    assert.ok(!rfc.getState().memberIds.includes("s1"));
  } finally {rfc.destroy();layout.stop();}
});

test("DAG targets use incoming relation strengths, preserve complete ranks through hiding and react on the root",()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false});
  try {
    const g=p.getCompleteEltSet();
    for(const [id,x,y] of [["a",0,0],["b",-40,0],["c",40,0],["d",0,-40]])p.addNode(new FreshNode(id,id,{position:{x,y}}));
    for(const [id,a,b] of [["ab","a","b"],["ac","a","c"],["bd","b","d"],["cd","c","d"]])p.addEdge(new FreshEdge(p.findNode(a),p.findNode(b),{id}));
    g.setSubstructure({id:"dag",label:"dag",kind:"dag",rootId:"a",nodeIds:["a","b","c","d"],edgeIds:["ab","ac","bd","cd"]});
    const rfc=p.getRfc(),d=p.findNode("d"),b=p.findNode("b"),c=p.findNode("c");rfc.activateSubstructure("dag");rfc.apply(p.getGES(),1);const initial=d.dy;
    clear(g);b.setWeight(0);rfc.apply(p.getGES(),1);near(d.dy,initial/2);assert.deepEqual([b.dx,b.dy],[0,0]);
    near([...g.getNodes()].reduce((s,n)=>s+n.dy,0),0);
    p.getGES().removeNode(c);clear(g);rfc.apply(p.getGES(),1);near(d.dy,initial/2);assert.deepEqual([c.dx,c.dy],[0,0]);
    [...g.getEdges()].find(e=>e.getID()==="cd").setWeight(0);clear(g);rfc.apply(p.getGES(),1);assert.deepEqual([d.dx,d.dy],[0,0]);
  } finally {p.destroy();}
});

test("weight metadata leaves ordinary TouchGraph integration exactly unchanged when RFC is off",()=>{
  const a=multiFocusFixture("leaf-connected-trees"),b=multiFocusFixture("leaf-connected-trees");
  try {
    for(const [i,node] of [...b.graph.getNodes()].entries())node.setWeight(i%2?0:1000);
    for(const [i,edge] of [...b.graph.getEdges()].entries())edge.setWeight(i%2?0:100000);
    a.layout.tick(50);b.layout.tick(50);
    assert.deepEqual([...a.graph.getNodes()].map(n=>[n.x,n.y,n.dx,n.dy]),[...b.graph.getNodes()].map(n=>[n.x,n.y,n.dx,n.dy]));
  } finally {a.rfc.destroy();b.rfc.destroy();a.layout.stop();b.layout.stop();}
});

test("zero-importance nodes are excluded from experimental impulse damping",()=>{
  let time=0;const p=new FreshmindPanel(undefined,{autoStart:false,rfcStabilization:{enabled:true,now:()=>time+=2}});
  try {
    const root=p.addNode("root"),branch=p.addNode("branch");root.fixed=true;p.addEdge(root,branch);const rfc=p.getRfc();rfc.setFocus(root);
    for(let i=0;i<10;i++){branch.x=i%2?0:4;rfc.apply(p.getGES(),1);}
    assert.ok(rfc.getState().stabilization.gain<1);branch.setWeight(0);branch.dx=7;branch.dy=-3;rfc.apply(p.getGES(),1);
    assert.deepEqual([branch.dx,branch.dy],[7,-3]);
    assert.equal(rfc.getState().stabilization.gain,1);assert.equal(rfc.getState().stabilization.phase,"steady");
  } finally {p.destroy();}
});
