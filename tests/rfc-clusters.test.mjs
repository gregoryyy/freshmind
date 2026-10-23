import test from "node:test";
import assert from "node:assert/strict";
import {FreshGraph,FreshNode,FreshEdge,FreshmindDocument,TypeRegistry,freshmind2014Configuration,
  clusterStructure,clusterGeometry,applyClusterLink,applyClusterCompactness,rfcNodeImportance,rfcRelationStrength} from "fm4/fm/core";
import {FreshmindPanel} from "fm4/fm";
import {serializeDocument,parseDocument,documentToRecord} from "fm4/fm/io";

const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const clear=g=>{for(const n of g.getNodes())n.dx=n.dy=0;};
const impulses=g=>[...g.getNodes()].map(n=>[n.dx,n.dy]);
const settings={radialLength:80,radialStiffness:.7,springMultiplier:1,coordinateWeights:{x:.25,y:1.4}};
function fixture() {
  const g=new FreshGraph();
  for(const [id,x,y,weight] of [["a",-230,-80,4],["b",150,40,1],["c",30,210,.25],["d",80,-190,2],["outside",-400,200,1]])
    g.addNode(new FreshNode(id,id,{weight,position:{x,y}}));
  for(const [id,from,to,weight] of [["ab","a","b",30],["bc","b","c",10],["ca","c","a",5],["cd","c","d",10],["da","d","a",10],["context","b","outside",10]])
    g.addEdge(new FreshEdge(g.findNode(from),g.findNode(to),{id,weight,length:90}));
  g.setSubstructure(clusterStructure(g,["a","b","c","d"],"a","cluster","Cluster"));return g;
}
const edges=g=>[...g.getEdges()].filter(e=>e.getID()!=="context");

test("clusters persist cycles and disconnected memberships, validate references and retain conservative invalidation",()=>{
  const g=fixture(),s=g.getSubstructure("cluster");
  assert.equal(s.kind,"cluster");assert.equal(s.edgeIds.length,5);
  g.setSubstructure({...s,id:"disconnected",nodeIds:["a","outside"],edgeIds:[]});
  const doc=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),g),record=documentToRecord(doc);
  assert.deepEqual(documentToRecord(parseDocument(serializeDocument(doc))),record);
  const copy=g.getSubstructure("cluster");copy.edgeIds.length=0;assert.equal(g.getSubstructure("cluster").edgeIds.length,5);
  g.addEdge(new FreshEdge(g.findNode("a"),g.findNode("a"),{id:"loop"}));
  for(const invalid of [{...s,rootId:"outside"},{...s,nodeIds:["a","a"]},{...s,edgeIds:["context"]},{...s,edgeIds:["missing"]},{...s,edgeIds:["loop"]}])
    assert.throws(()=>g.setSubstructure(invalid));
  assert.deepEqual(g.getSubstructure("cluster"),s);
  g.deleteEdge([...g.getEdges()].find(e=>e.getID()==="context"));assert.ok(g.getSubstructure("cluster"));
  g.deleteEdge([...g.getEdges()].find(e=>e.getID()==="ab"));assert.equal(g.getSubstructure("cluster"),null);
  assert.ok(g.getSubstructure("disconnected"));g.deleteNode(g.findNode("outside"));assert.equal(g.getSubstructure("disconnected"),null);
});

test("cluster link and centroid forces match the full weighted physical energy gradient and conserve reaction",()=>{
  const g=fixture(),nodes=[...g.getNodes()].filter(n=>n.getID()!=="outside"),selected=edges(g),ownership=new Map(nodes.map(n=>[n,2]));
  const degrees=new Map();for(const e of selected)for(const n of [e.from,e.to])degrees.set(n,(degrees.get(n)??0)+1);
  const rigidity=.6,linkStiffness=.8,forceSettings={...settings,springMultiplier:3};
  const energy=()=>{
    const importance=n=>2*n.getWeight()/(n.getWeight()+1),total=nodes.reduce((s,n)=>s+importance(n),0);
    const cx=nodes.reduce((s,n)=>s+n.x*importance(n)/total,0),cy=nodes.reduce((s,n)=>s+n.y*importance(n)/total,0);
    const radius=settings.radialLength*Math.sqrt(nodes.length)/2,w=settings.coordinateWeights;
    let value=0;
    for(const n of nodes) {
      const distance=Math.hypot(Math.sqrt(w.x)*(n.x-cx),Math.sqrt(w.y)*(n.y-cy));
      value+=settings.radialStiffness*rigidity/(8*2)*importance(n)*Math.max(0,distance-radius)**2;
    }
    for(const e of selected) {
      const distance=Math.sqrt(w.x*(e.to.x-e.from.x)**2+w.y*(e.to.y-e.from.y)**2+1);
      const q=Math.sqrt(importance(e.from)*importance(e.to))*2*e.getWeight()/(e.getWeight()+10);
      value+=settings.radialStiffness*rigidity/2*q/Math.max(degrees.get(e.from),degrees.get(e.to))*Math.max(0,distance-settings.radialLength)**2;
      value+=linkStiffness*rigidity/2*q/Math.max(degrees.get(e.from),degrees.get(e.to))*(distance-e.getLength()*settings.radialLength/120)**2;
      value+=(forceSettings.springMultiplier-1)*rigidity*q/Math.max(degrees.get(e.from),degrees.get(e.to))*Math.sqrt(distance**2-1)**3/(3*e.getLength()*100);
    }return value;
  };
  for(const e of selected)applyClusterLink(e,forceSettings,rigidity,Math.max(degrees.get(e.from),degrees.get(e.to)),linkStiffness);
  applyClusterCompactness(nodes,settings,rigidity,ownership);
  for(const n of nodes)for(const [coordinate,impulse] of [["x","dx"],["y","dy"]]) {
    const original=n[coordinate],h=1e-4;n[coordinate]=original+h;const plus=energy();n[coordinate]=original-h;const minus=energy();n[coordinate]=original;
    near(n[impulse],-(plus-minus)/(2*h),2e-7);
  }
  near(nodes.reduce((s,n)=>s+n.dx,0),0);near(nodes.reduce((s,n)=>s+n.dy,0),0);
  assert.deepEqual([g.findNode("outside").dx,g.findNode("outside").dy],[0,0]);
});

test("centroid reaction honors TouchGraph locality in linear time, and is independent of translation",()=>{
  const g=fixture(),nodes=[...g.getNodes()].slice(0,4);nodes[1].justMadeLocal=true;nodes[3].justMadeLocal=true;
  const geometry=clusterGeometry(nodes,80),total=geometry.members.reduce((s,m)=>s+m.importance,0),expected=nodes.map(()=>[0,0]);
  for(const [i,n] of nodes.entries()) {
    const x=n.x-geometry.center.x,y=n.y-geometry.center.y,w=settings.coordinateWeights,d=Math.hypot(Math.sqrt(w.x)*x,Math.sqrt(w.y)*y);
    const k=d>geometry.radius?settings.radialStiffness/4*rfcNodeImportance(n)*(1-geometry.radius/d):0,fx=-w.x*x*k,fy=-w.y*y*k;
    for(const [j,other] of nodes.entries()) {
      const fraction=rfcNodeImportance(other)/total,si=n.justMadeLocal||!other.justMadeLocal?1:10,sj=other.justMadeLocal||!n.justMadeLocal?1:10;
      expected[i][0]+=fx*fraction/si;expected[i][1]+=fy*fraction/si;
      expected[j][0]-=fx*fraction/sj;expected[j][1]-=fy*fraction/sj;
    }
  }
  applyClusterCompactness(nodes,settings,1);
  nodes.forEach((n,i)=>{near(n.dx,expected[i][0]);near(n.dy,expected[i][1]);});
  clear(g);for(const n of nodes){n.x+=123;n.y-=456;}applyClusterCompactness(nodes,settings,1);
  nodes.forEach((n,i)=>{near(n.dx,expected[i][0]);near(n.dy,expected[i][1]);});
});

test("clusters do not expand short links; importance and degree scale long-link constraints, and zeros retain compactness",()=>{
  const a=new FreshNode("a","a",{position:{x:0,y:0}}),b=new FreshNode("b","b",{position:{x:20,y:0}}),edge=new FreshEdge(a,b);
  applyClusterLink(edge,settings,1,1);assert.deepEqual([a.dx,a.dy,b.dx,b.dy],[0,0,0,0]);
  b.x=400;applyClusterLink(edge,settings,1,1);const original=b.dx;assert.ok(original<0);
  a.dx=b.dx=0;edge.setWeight(30);applyClusterLink(edge,settings,1,3);near(b.dx,original*1.5/3);
  a.dx=b.dx=0;edge.setWeight(0);applyClusterLink(edge,settings,1,1);assert.equal(b.dx,0);
  applyClusterCompactness([a,b],settings,1);assert.ok(b.dx<0); // Link disabled, members still participate.
  a.dx=b.dx=0;b.setWeight(0);applyClusterCompactness([a,b],settings,1);assert.deepEqual([a.dx,b.dx],[0,0]);
  assert.deepEqual(clusterGeometry([],80).center,{x:0,y:0});
});

test("cluster activation has no angular template and changing the representative preserves every force",()=>{
  const g=fixture(),p=new FreshmindPanel(undefined,{autoStart:false});p.setGraphEltSet(g);p.getGES().addAll();
  try {
    const rfc=p.getRfc();rfc.configure({...settings,angularStiffness:100000});rfc.activateSubstructure("cluster");rfc.apply(p.getGES(),1);
    const baseline=impulses(g);assert.ok(baseline.flat().some(n=>Math.abs(n)>1));
    assert.equal(rfc.getState().centers[0].angularGapRms,null);assert.deepEqual(rfc.getState().branchIds,[]);
    clear(g);rfc.configure({angularStiffness:0});rfc.apply(p.getGES(),1);assert.deepEqual(impulses(g),baseline);
    g.setSubstructure({...g.getSubstructure("cluster"),rootId:"c"});rfc.reconcile();clear(g);rfc.apply(p.getGES(),1);
    assert.deepEqual(impulses(g),baseline);assert.equal(rfc.getState().focusId,"c");assert.equal(g.edgeCount(),6);
  }finally{p.destroy();}
});

test("overlapping identical clusters deduplicate links and distribute compactness without doubled stiffness",()=>{
  const g=fixture(),p=new FreshmindPanel(undefined,{autoStart:false});p.setGraphEltSet(g);p.getGES().addAll();
  try {
    const rfc=p.getRfc();rfc.configure({...settings,springMultiplier:3});rfc.activateSubstructure("cluster");rfc.apply(p.getGES(),1);const baseline=impulses(g);
    g.setSubstructure({...g.getSubstructure("cluster"),id:"second",rootId:"b"});rfc.activateSubstructure("second",true);clear(g);rfc.apply(p.getGES(),1);
    impulses(g).forEach((row,i)=>row.forEach((v,j)=>near(v,baseline[i][j])));
    assert.equal(rfc.getState().memberIds.length,4);assert.equal(rfc.getState().radialEdgeIds.length,5);
    assert.equal(g.findNode("outside").dx,0);assert.equal(g.findNode("outside").dy,0);
  }finally{p.destroy();}
});

test("clusters project positive visible members independently of links, while hidden representatives suspend activation",()=>{
  const g=fixture(),p=new FreshmindPanel(undefined,{autoStart:false});g.findNode("b").setWeight(0);
  for(const e of edges(g))e.setWeight(0);
  p.setGraphEltSet(g);p.getGES().addAll();
  try {
    const rfc=p.getRfc();rfc.configure(settings);rfc.activateSubstructure("cluster");
    assert.deepEqual(rfc.getState().memberIds,["a","c","d"]);assert.deepEqual(rfc.getState().radialEdgeIds,[]);
    rfc.apply(p.getGES(),1);assert.equal(g.findNode("b").dx,0);assert.equal(g.findNode("outside").dy,0);assert.notEqual(g.findNode("c").dy,0);
    p.getGES().removeNode(g.findNode("c"));assert.deepEqual(rfc.getState().memberIds,["a","d"]);
    p.getGES().removeNode(g.findNode("a"));assert.equal(rfc.getState().active,false);clear(g);rfc.apply(p.getGES(),1);
    assert.ok(impulses(g).flat().every(v=>v===0));assert.equal(g.getSubstructure("cluster").nodeIds.length,4);
  }finally{p.destroy();}
});

test("a shared tree spring takes precedence over the cluster cap without duplicating attraction",()=>{
  const g=new FreshGraph(),a=new FreshNode("a","a",{position:{x:0,y:0}}),b=new FreshNode("b","b",{position:{x:400,y:60}});
  g.addNode(a);g.addNode(b);const edge=new FreshEdge(a,b,{id:"ab",length:90});g.addEdge(edge);
  const cluster=clusterStructure(g,["a","b"],"b","cluster");g.setSubstructure(cluster);
  g.setSubstructure({...cluster,id:"tree",kind:"tree",rootId:"a"});
  const p=new FreshmindPanel(undefined,{autoStart:false});p.setGraphEltSet(g);p.getGES().addAll();
  try {
    const rfc=p.getRfc(),config={...settings,springMultiplier:3,angularStiffness:0};rfc.configure(config);
    rfc.activateSubstructure("tree");rfc.apply(p.getGES(),1);const baseline=impulses(g);
    clear(g);applyClusterCompactness([a,b],config,1,new Map([[a,2],[b,2]]));const compactness=impulses(g);
    clear(g);rfc.activateSubstructure("cluster",true);rfc.apply(p.getGES(),1);
    impulses(g).forEach((row,i)=>row.forEach((value,j)=>near(value,baseline[i][j]+compactness[i][j])));
    assert.equal(rfcRelationStrength(edge),1);assert.equal(rfc.getState().radialEdgeIds.length,1);
  }finally{p.destroy();}
});

test("dense cyclic clusters remain finite during integration and ordinary context is preserved",()=>{
  const g=new FreshGraph();for(let i=0;i<12;i++)g.addNode(new FreshNode(`n${i}`,`n${i}`,{position:{x:300*Math.cos(i*.53),y:200*Math.sin(i*.53)}}));
  const nodes=[...g.getNodes()];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)g.addEdge(new FreshEdge(nodes[i],nodes[j],{id:`e${i}-${j}`}));
  g.setSubstructure(clusterStructure(g,nodes.map(n=>n.getID()),"n0","dense"));
  const p=new FreshmindPanel(undefined,{autoStart:false});p.setGraphEltSet(g);p.getGES().addAll();
  try {
    p.getRfc().activateSubstructure("dense");p.tgLayout.tick(250);
    assert.ok(nodes.every(n=>[n.x,n.y,n.dx,n.dy].every(Number.isFinite)));
    assert.equal(g.nodeCount(),12);assert.equal(g.edgeCount(),66);assert.equal(p.getRfc().getState().radialEdgeIds.length,66);
  }finally{p.destroy();}
});

test("cluster rigidity resists compression/stretching, scales independently and validates settings atomically",()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false}),a=p.addNode(new FreshNode("a","a",{position:{x:0,y:0}})),b=p.addNode(new FreshNode("b","b",{position:{x:30,y:0}}));
  const edge=p.addEdge(a,b,90),g=p.getCompleteEltSet(),rfc=p.getRfc();g.setSubstructure(clusterStructure(g,["a","b"],"a","cluster"));
  try {
    rfc.configure({radialStiffness:0,springMultiplier:1});rfc.activateSubstructure("cluster");
    assert.equal(rfc.getState().clusterSettings.rigidity,1);rfc.apply(p.getGES(),1);assert.ok(b.dx>0);
    const force=b.dx;clear(g);rfc.configureClusters({rigidity:.5});rfc.apply(p.getGES(),1);near(b.dx,force/2);
    clear(g);b.x=180;rfc.apply(p.getGES(),1);assert.ok(b.dx<0);near(a.dx,-b.dx);
    clear(g);b.x=Math.sqrt(90**2-1);rfc.apply(p.getGES(),1);near(b.dx,0);
    const before=rfc.getState();for(const rigidity of [-1,2.1,NaN,Infinity])assert.throws(()=>rfc.configureClusters({rigidity}));
    assert.deepEqual(rfc.getState().clusterSettings,before.clusterSettings);assert.deepEqual(rfc.getState().settings,before.settings);
    const copy=rfc.getState();copy.clusterSettings.rigidity=2;assert.equal(rfc.getState().clusterSettings.rigidity,.5);
    rfc.configureClusters({rigidity:0});clear(g);rfc.apply(p.getGES(),1);assert.deepEqual([a.dx,b.dx],[0,0]);
    assert.equal(edge.getLength(),90);assert.equal(g.edgeCount(),1);
  }finally{p.destroy();}
});

test("stronger cluster springs reduce deformation under matched external loads",()=>{
  const distance=(rigidity,load)=>{
    const p=new FreshmindPanel(undefined,{autoStart:false}),a=p.addNode(new FreshNode("a","a",{position:{x:-45,y:0}})),b=p.addNode(new FreshNode("b","b",{position:{x:45,y:0}}));
    p.addEdge(a,b,90);const g=p.getCompleteEltSet();g.setSubstructure(clusterStructure(g,["a","b"],"a","cluster"));
    p.getRfc().configure({radialStiffness:0,springMultiplier:1});p.getRfc().configureClusters({rigidity});p.getRfc().activateSubstructure("cluster");
    p.tgLayout.addForce((_graph,r)=>{a.dx-=load*r;b.dx+=load*r;});p.tgLayout.stopDamper();p.tgLayout.tick(300);
    const result=b.x-a.x;assert.ok(Number.isFinite(result));near(a.x+b.x,0);p.destroy();return result;
  };
  const flexible=distance(0,1)-distance(0,0),reinforced=distance(1,1)-distance(1,0);
  assert.ok(reinforced>0&&reinforced<flexible/2,`${reinforced} vs ${flexible}`);
});
