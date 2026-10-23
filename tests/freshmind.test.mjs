import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Node, Edge, TGLayout, HyperLens, RotateLens, TGLensSet } from "fm4/core";
import { Node as TGNode } from "fm4/tg/core";
import { FreshNode, FreshEdge, FreshGraph, TypeRegistry, freshmind2014Configuration,
  createEdgeGeometry, routeEdges, createNodeOutline, nodeShapes, applyNodeEdit, applyRelationEdit } from "fm4/fm/core";
import { FreshmindPanel, parseTypeConfiguration } from "fm4/fm";

const registry=()=>new TypeRegistry(freshmind2014Configuration);
test("node edit commands validate before mutation and preserve identity, metadata and coordinates",()=>{
  const node=new FreshNode("stable","Before",{type:"idea",position:{x:12.5,y:-8},annotation:{format:"text",text:"Keep"},data:{query:42},visual:{style:{fill:"pink"}}});
  assert.throws(()=>applyNodeEdit(node,{label:"Rejected",type:"person",shape:"invalid"}),/expected/);
  assert.equal(node.getLabel(),"Before");assert.equal(node.getSemanticType(),"idea");
  applyNodeEdit(node,{label:"After\nMultiline",type:"person",shape:"ellipse"});
  assert.equal(node.getID(),"stable");assert.deepEqual([node.x,node.y],[12.5,-8]);assert.deepEqual(node.getData(),{query:42});
  assert.equal(node.getHint(),"Keep");assert.equal(node.getLabel(),"After\nMultiline");
  assert.equal(registry().resolveNode(node).shape,"ellipse");assert.equal(node.getVisual().style.fill,"pink");
  applyNodeEdit(node,{label:"",type:"person",shape:null});assert.equal(registry().resolveNode(node).shape,"rounded-rectangle");
});
test("relation edits preserve endpoints and physical settings while allowing inherited curve styles",()=>{
  const a=new FreshNode("a"),b=new FreshNode("b"),edge=new FreshEdge(a,b,{id:"stable",label:"Before",length:70,data:{score:.7}});
  assert.throws(()=>applyRelationEdit(edge,{label:"Rejected",type:"cites",curve:"invalid"}),/expected/);
  assert.equal(edge.getLabel(),"Before");assert.equal(edge.getSemanticType(),"default");
  applyRelationEdit(edge,{label:"references",type:"cites",curve:"straight"});
  assert.equal(edge.from,a);assert.equal(edge.to,b);assert.equal(edge.getID(),"stable");assert.equal(edge.getLength(),70);
  assert.deepEqual(edge.getData(),{score:.7});assert.equal(registry().resolveEdge(edge).curve,"straight");
  applyRelationEdit(edge,{label:"references",type:"cites",curve:null});assert.equal(registry().resolveEdge(edge).curve,"spider");
});
test("Freshmind selection listeners observe edges, anchors and visibility cleanup",()=>{
  const panel=new FreshmindPanel(undefined,{animateLocality:false}),a=panel.addNode("a"),b=panel.addNode("b"),edge=panel.addEdge(a,b),seen=[];
  const dispose=panel.addSelectionListener(selection=>seen.push(selection));
  panel.setSelect(a);panel.setSelectEdge(edge);assert.equal(panel.getSelect(),a);assert.equal(panel.getSelection(),edge);
  panel.setSelectEdge(null);panel.setSelectEdge(edge);panel.hideEdge(edge);panel.deleteNode(a);
  assert.deepEqual(seen,[a,edge,a,edge,a,null]);dispose();panel.setSelect(b);assert.equal(seen.length,6);panel.destroy();
});
const identity=(x,y)=>({x,y});
function fixture(){
  const graph=new FreshGraph(),a=new FreshNode("a","Author",{type:"person",position:{x:-100,y:30}}),b=new FreshNode("b","Paper",{type:"paper",position:{x:100,y:-70}});
  a.setDimensions(60,28);b.setDimensions(60,28);graph.addNode(a);graph.addNode(b);
  const edge=new FreshEdge(a,b,{id:"authored",type:"authored",label:"wrote"});graph.addEdge(edge);
  const r=registry();return {graph,a,b,edge,r};
}
test("Freshmind extends the same TouchGraph classes across public entry points",()=>{
  const {graph,a,edge}=fixture();assert.equal(Node,TGNode);assert.ok(a instanceof Node);assert.ok(edge instanceof Edge);
  a.setType(Node.TYPE_ELLIPSE);a.setSemanticType("idea");assert.equal(a.getType(),Node.TYPE_ELLIPSE);
  a.setLabel("Changed");edge.setLabel("authored");edge.setSemanticType("cites");assert.equal(a.getID(),"a");assert.equal(edge.getID(),"authored");
  assert.equal(edge.getLabel(),"authored");assert.equal(edge.getSemanticType(),"cites");assert.equal(graph.findNode("a"),a);
  assert.throws(()=>a.setID("different"),/stable/);assert.throws(()=>edge.setID("different"),/stable/);
});
test("public package exports retain class identity and separate Freshmind from TouchGraph",async()=>{
  const [legacy,tg,fm,headless,config]=await Promise.all([import("fm4"),import("fm4/tg"),import("fm4/fm"),import("fm4/fm/core"),import("fm4/fm/config")]);
  assert.equal(legacy.TGPanel,tg.TGPanel);assert.equal(legacy.Node,Node);assert.equal(fm.FreshNode,headless.FreshNode);
  assert.equal(fm.parseTypeConfiguration,config.parseTypeConfiguration);assert.equal(tg.FreshNode,undefined);
});
test("FreshGraph preserves duplicate labels, isolated nodes, parallel edges and loops with unique IDs",()=>{
  const graph=new FreshGraph(),a=new FreshNode(null,"same"),b=new FreshNode(null,"same"),isolated=new FreshNode("isolated");
  for(const n of [a,b,isolated])graph.addNode(n);
  const e1=graph.addEdge(a,b),e2=graph.addEdge(a,b),loop=graph.addEdge(a,a);
  assert.equal(graph.nodeCount(),3);assert.equal(graph.edgeCount(),3);assert.notEqual(a.getID(),b.getID());
  assert.notEqual(e1.getID(),e2.getID());assert.equal(a.edgeCount(),4);assert.equal(loop.from,loop.to);
  assert.throws(()=>graph.addEdge(new FreshEdge(a,b,{id:e1.getID()})),/Duplicate edge/);
  assert.throws(()=>graph.addNode(new Node("plain")),/FreshNode/);
  assert.throws(()=>graph.addEdge(new Edge(a,b)),/FreshEdge/);
  graph.deleteEdge(loop);assert.equal(a.edgeCount(),2);
});
test("Freshmind metadata is copied, validated, and remains separate from physics",()=>{
  const data={nested:{value:1}},node=new FreshNode("n","",{data,annotation:{format:"html",text:"<p>Original</p>"}});
  data.nested.value=2;const copy=node.getData();copy.nested.value=3;assert.equal(node.getData().nested.value,1);
  assert.equal(node.getAnnotation().text,"<p>Original</p>");assert.throws(()=>node.setWeight(NaN),/finite/);
  assert.throws(()=>node.setData({value:undefined}),/mapping/);assert.throws(()=>new FreshNode("n","n",{fixed:true}),/position/);
  const {graph,a,edge}=fixture();a.setWeight(100);edge.setWeight(1);
  const positions=[a.x,a.y];registry().resolveNode(a);assert.deepEqual([a.x,a.y],positions);
  assert.equal(edge.getLength(),40);assert.equal(a.getRepulsion(),100);
  const layout=new TGLayout({getGES:()=>graph,repaintAfterMove(){}});layout.tick();assert.ok(Number.isFinite(a.x));
});
test("authoritative YAML, generated preset and documented 21-type example agree",async()=>{
  const source=await readFile(new URL("../config/fm2014.types.yaml",import.meta.url),"utf8");
  const example=await readFile(new URL("../docs/design/examples/fm2014.types.yaml",import.meta.url),"utf8");
  assert.equal(source,example);assert.deepEqual(parseTypeConfiguration(source).getConfiguration(),freshmind2014Configuration);
  assert.equal(Object.keys(freshmind2014Configuration.nodeTypes).length,21);
});
test("visual inheritance, item overrides and interaction precedence compose field by field",()=>{
  const r=registry(),n=new FreshNode("n","",{type:"person",visual:{style:{fill:"pink",stroke:{width:2}}}});
  const normal=r.resolveNode(n);assert.equal(normal.shape,"rounded-rectangle");assert.equal(normal.fill,"pink");assert.equal(normal.stroke.width,2);
  const active=r.resolveNode(n,["activeCandidate","selected","preselected","fixed"]);
  assert.equal(active.fill,"#ff9000");assert.equal(active.text.color,"#ff0000");assert.equal(active.stroke.width,3);
  assert.equal(r.resolveNode(new FreshNode("q","",{type:"ldaquery"})).stroke.dash,"dash-dotted");
  normal.text.color="bad";assert.notEqual(r.resolveNode(n).text.color,"bad");
  const config=r.getConfiguration();config.nodeVisuals.person.extends="person";
  assert.throws(()=>new TypeRegistry(config),/cycle/);assert.equal(r.resolveNode(n).fill,"pink");
});
test("unknown type IDs survive fallback and invalid definitions fail before registry replacement",()=>{
  const r=registry(),node=new FreshNode("n","",{type:"future",visual:{type:"future-visual"}});
  assert.equal(r.resolveNode(node).shape,"rectangle");assert.equal(node.getSemanticType(),"future");assert.equal(r.getDiagnostics().length,2);
  const invalid=r.getConfiguration();invalid.nodeTypes.person.visual="absent";assert.throws(()=>new TypeRegistry(invalid),/unknown visual/);
  const parent=r.getConfiguration();parent.nodeVisuals.person.extends="absent";assert.throws(()=>new TypeRegistry(parent),/Unknown visual/);
  assert.throws(()=>node.setVisual({style:{stroke:{width:-1}}}),/finite/);
});
test("YAML type loader rejects ambiguity and unsupported YAML features",()=>{
  for(const source of ["format: freshmind-types\nformat: duplicate", "x: &a {}\ny: *a", "x: {<<: {a: 1}}", "x: !unknown abc", "%YAML 1.1\n---\nx: yes", "x: 1\n---\nx: 2"])
    assert.throws(()=>parseTypeConfiguration(source),undefined,source);
  const invalid=structuredClone(freshmind2014Configuration);invalid.nodeVisuals.person.typo=true;
  assert.throws(()=>new TypeRegistry(invalid),/unknown field/);
});
test("headless FreshmindPanel factories and type reload preserve graph identity and coordinates",async()=>{
  const panel=new FreshmindPanel(undefined,{animateLocality:false}),a=panel.addNode("a","A"),b=panel.addNode("b","B"),edge=panel.addEdge(a,b);
  assert.ok(a instanceof FreshNode);assert.ok(edge instanceof FreshEdge);assert.ok(panel.getCompleteEltSet() instanceof FreshGraph);
  a.setLocation({x:-100,y:50});b.setLocation({x:100,y:-50});edge.setLabel("related");
  const before=[a.x,a.y,b.x,b.y],old=panel.getTypeRegistry();assert.throws(()=>panel.loadTypeConfiguration("bad: true"));assert.equal(panel.getTypeRegistry(),old);
  const config=old.getConfiguration();config.nodeVisuals.default.fill="purple";panel.setTypeRegistry(new TypeRegistry(config));
  assert.equal(panel.getNodeStyle(a).fill,"purple");assert.deepEqual([a.x,a.y,b.x,b.y],before);
  assert.equal(panel.getCompleteEltSet().findNode("a"),a);assert.equal(edge.getLabel(),"related");
  panel.setSelectEdge(edge);assert.equal(panel.getSelect(),a);await panel.hideNode(b);assert.equal(panel.getSelectEdge(),null);panel.destroy();
});
test("spider/lens control points and midpoints follow the Java equations through lenses",()=>{
  for(const mode of ["spider","lens","straight"]){
    const {a,b,edge,r}=fixture();const lenses=new TGLensSet();const hyper=new HyperLens(80),rotation=new RotateLens();rotation.angle=.45;lenses.addLens(hyper);lenses.addLens(rotation);
    const transform=(x,y)=>lenses.convRealToDraw(x,y),style=r.resolveEdge(edge);style.curve=mode;
    const geometry=createEdgeGeometry(edge,transform,style,r.resolveNode(a),r.resolveNode(b));
    const A=transform(a.x,a.y),Z=transform(b.x,b.y),M={x:(A.x+Z.x)/2,y:(A.y+Z.y)/2};
    const Q=mode==="spider"?transform((a.x+b.x)/2,a.y):mode==="lens"?(()=>{const B=transform((a.x+b.x)/2,(a.y+b.y)/2);return {x:2*B.x-M.x,y:2*B.y-M.y};})():M;
    assert.ok(Math.abs(geometry.control.x-Q.x)<1e-10);assert.ok(Math.abs(geometry.control.y-Q.y)<1e-10);
    assert.ok(Math.abs(geometry.midpoint.x-(M.x+Q.x)/2)<1e-10);assert.ok(Math.abs(geometry.midpoint.y-(M.y+Q.y)/2)<1e-10);
    assert.deepEqual(geometry.labelAnchor,{x:geometry.midpoint.x+2,y:geometry.midpoint.y+12});
    assert.ok(geometry.distanceFrom(geometry.midpoint)<.01);assert.ok(!/NaN|Infinity/.test(geometry.path));
  }
});
test("clipping and picking use node shapes and visible curves rather than endpoint chords",()=>{
  const {a,b,edge,r}=fixture(),style=r.resolveEdge(edge);
  const geometry=createEdgeGeometry(edge,identity,style,r.resolveNode(a),r.resolveNode(b));
  assert.notDeepEqual(geometry.start,{x:a.x,y:a.y});assert.notDeepEqual(geometry.end,{x:b.x,y:b.y});
  edge.setGeometry(geometry);const mid=geometry.midpoint;assert.ok(edge.containsPoint(mid.x,mid.y));
  assert.ok(geometry.distanceFrom({x:0,y:-20})>10);assert.deepEqual(edge.getMiddle(),geometry.midpoint);
  assert.deepEqual(edge.getLabelAnchor(),geometry.labelAnchor);edge.reverse();assert.equal(edge.getGeometry(),null);
});
test("parallel/reciprocal edges and self loops have deterministic finite, distinct paths",()=>{
  const {a,b,edge,r}=fixture();const edges=[edge,new FreshEdge(a,b,{id:"other"}),new FreshEdge(b,a,{id:"reverse"}),new FreshEdge(a,a,{id:"loop"})];
  const routed=routeEdges(edges,identity,e=>r.resolveEdge(e),n=>r.resolveNode(n));
  assert.equal(new Set([...routed.values()].map(g=>g.path)).size,4);
  for(const geometry of routed.values()){assert.ok(!/NaN|Infinity/.test(geometry.path));assert.ok(Number.isFinite(geometry.arrowAngle));}
  const reversed=routeEdges([...edges].reverse(),identity,e=>r.resolveEdge(e),n=>r.resolveNode(n));
  for(const e of edges)assert.equal(routed.get(e).path,reversed.get(e).path);
  b.setLocation(a.getLocation());const coincident=createEdgeGeometry(edge,identity,r.resolveEdge(edge),r.resolveNode(a),r.resolveNode(b));assert.equal(coincident.kind,"loop");assert.ok(!/NaN/.test(coincident.path));
});
test("all named shapes have usable outlines and contain their centers",()=>{
  for(const shape of nodeShapes){const outline=createNodeOutline(shape,100,40);assert.ok(outline.contains({x:0,y:0}),shape);assert.ok(!outline.contains({x:200,y:0}),shape);assert.ok(!/NaN/.test(outline.path));}
});
test("core dependency closures contain neither DOM rendering dependencies nor YAML",async()=>{
  const visited=new Set();
  async function walk(url,headless=true){
    if(visited.has(url.href))return;visited.add(url.href);const source=await readFile(url,"utf8");
    for(const [,spec] of source.matchAll(/(?:from\s*|import\s*)["']([^"']+)["']/g)){
      if(headless)assert.ok(!spec.startsWith("d3-")&&spec!=="yaml",`${url}: ${spec}`);
      if(spec.startsWith(".")){
        const dependency=new URL(spec,url);
        assert.ok(!url.pathname.includes("/tg/")||!dependency.pathname.includes("/fm/"),`${url} imports Freshmind`);
        await walk(dependency,headless);
      }
    }
  }
  await walk(new URL(import.meta.resolve("fm4/core")));await walk(new URL(import.meta.resolve("fm4/fm/core")));
  await walk(new URL(import.meta.resolve("fm4/tg")),false);
});
