import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { FreshmindDocument, FreshNode, FreshEdge, TypeRegistry, freshmind2014Configuration, applyNodeEdit, applyRelationEdit, keymap } from "fm4/fm/core";
import { FreshmindPanel, captureDocument, installDocument } from "fm4/fm";
import { parseDocument, readDocument, serializeDocument, documentToRecord } from "fm4/fm/io";

function fixture() {
  const document=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration));document.title="Unicode — α";
  const a=new FreshNode("001","same\nlabel",{position:{x:14,y:-2},fixed:true,annotation:{format:"html",text:'<p>Kept <a href="file:/old/resource">link</a></p>'},url:"C:\\old\\file.txt",data:{query:{score:.7},nothing:null},extensions:{app:{nested:[true,"2026-01-01"]}}});
  const b=new FreshNode("false","same\nlabel"),isolated=new FreshNode("2026-01-01","");
  for(const node of [a,b,isolated])document.graph.addNode(node);
  for(const [id,from,to] of [["e1",a,b],["e2",a,b],["loop",a,a]])document.graph.addEdge(new FreshEdge(from,to,{id,label:"independent",type:"unknown",weight:.25,length:73,data:{score:.3}}));
  document.data={owner:"test"};document.extensions={app:{unknown:"retain"}};
  document.view={focus:"001",radius:2,backlinks:false,moveToCenter:false,maxAddEdgeCount:11,maxExpandEdgeCount:13,lenses:{zoom:1.8,hyperbolic:44,rotation:.7},canvas:{zoom:1.5,pan:{x:31,y:-20}}};
  return {document,a,b,isolated};
}
test("native YAML preserves all graph records, ambiguous strings, metadata, loops, parallels and view",()=>{
  const {document,a}=fixture();a.dx=50;a.markedForRemoval=true;a.setPreselected(true);a.setVisible(true);
  const source=serializeDocument(document),loaded=parseDocument(source);
  assert.deepEqual(documentToRecord(loaded),documentToRecord(document));assert.equal(loaded.graph.nodeCount(),3);assert.equal(loaded.graph.edgeCount(),3);
  assert.equal(loaded.graph.findNode("001").dx,0);assert.equal(loaded.graph.findNode("001").markedForRemoval,false);
  assert.ok(loaded.types.getDiagnostics().some(w=>w.includes("unknown")));
  for (const node of documentToRecord(loaded).nodes) for (const key of ["drawx","dx","preselected","markedForRemoval"]) assert.equal(Object.hasOwn(node,key),false);
  const without=parseDocument(serializeDocument(document,{includeLayout:false,includeView:false}));
  assert.equal(without.view,undefined);assert.equal(without.graph.findNode("001").isFixed(),true);assert.deepEqual([without.graph.findNode("001").x,without.graph.findNode("001").y],[14,-2]);
});
test("companions are explicit caller-resolved inputs; invalid schema and references never coerce values",async()=>{
  const {document}=fixture(),types=await readFile(new URL("../config/fm2014.types.yaml",import.meta.url),"utf8");
  const source=serializeDocument(document,{typesFile:"types/palette.yaml"});
  assert.throws(()=>parseDocument(source),/companion/);let requested;
  const loaded=parseDocument(source,{resolveTypes:path=>{requested=path;return types;}});assert.equal(requested,"types/palette.yaml");
  assert.deepEqual(documentToRecord(loaded),documentToRecord(document));
  const base={format:"freshmind",version:1,nodes:[{id:"a",label:""}],edges:[]};
  const bad=[{...base,version:2},{...base,title:null},{...base,typo:1},{...base,nodes:[{id:1,label:""}]},{...base,nodes:[{id:"a",label:7}]},
    {...base,nodes:[{id:"a",label:"",type:null}]},{...base,nodes:[{id:"a",label:"",fixed:"true"}]},{...base,nodes:[{id:"a",label:"",fixed:true}]},
    {...base,nodes:[{id:"a",label:""},{id:"a",label:"duplicate"}]},{...base,edges:[{id:"e",from:"a",to:"missing"}]},
    {...base,view:{focus:"missing"}},{...base,view:{lenses:{zoom:9}}},{...base,view:{backlinks:1}},{...base,view:{canvas:{pan:{x:NaN,y:0}}}},
    {...base,types:document.types.getConfiguration(),typesFile:"also.yaml"}];
  for(const value of bad)assert.throws(()=>readDocument(value),undefined,JSON.stringify(value));
  for(const suffix of ["\nx: &x {a: 1}\ny: *x", "\nx: !custom x", "\nx: .inf", "\nformat: freshmind", "\nx: {1: value}", "\nx: {<<: {a: 1}}"])
    assert.throws(()=>parseDocument("format: freshmind\nversion: 1\nnodes: []\nedges: []"+suffix));
});
test("panel snapshots retain complete hidden membership and restore both zooms, locality and pan",async t=>{
  const p=new FreshmindPanel(undefined,{animateLocality:false}),{document}=fixture();t.after(()=>p.destroy());
  await installDocument(p,document);p.getGES().removeNode(document.graph.findNode("false"));p.setCanvasPan(27,-31);p.setLensPan(17,-21);
  const saved=captureDocument(p,document),before=[...p.getAllNodes()].map(n=>n.edgeCount());
  assert.equal(saved.graph,p.getCompleteEltSet());assert.equal(saved.graph.nodeCount(),3);
  const loaded=parseDocument(serializeDocument(saved));assert.deepEqual([...p.getAllNodes()].map(n=>n.edgeCount()),before);
  await installDocument(p,loaded);assert.equal(p.getZoom(),1.8);assert.equal(p.getCanvasZoom(),1.5);assert.equal(p.getHyperbolic(),44);
  assert.deepEqual({...p.getCanvasPan()},{x:27,y:-31});assert.equal(p.getNeighborhoodFocus().getID(),"001");
  assert.deepEqual({...p.getLensPan()},{x:17,y:-21});
  assert.equal(p.getNavigation().getState().settings.maxAddEdgeCount,11);
});
test("full edits validate atomically and reconnect endpoints without corrupting visible loop incidence",t=>{
  const p=new FreshmindPanel(undefined,{animateLocality:false});t.after(()=>p.destroy());
  const a=p.addNode("a"),b=p.addNode("b"),c=p.addNode("c"),e=p.addEdge(a,b),context={graph:p.getCompleteEltSet(),locality:p.getGES()};
  assert.throws(()=>applyNodeEdit(a,{label:"bad",type:"paper",shape:"circle",weight:-1,annotation:{format:"html",text:"x"}}));assert.equal(a.getLabel(),"a");
  applyNodeEdit(a,{label:"new\nlabel",type:"paper",shape:null,weight:30,url:"https://example.org",annotation:{format:"html",text:"<b>bold</b>"},data:{x:2},visual:{type:"paper",style:{fill:"pink"}}});
  assert.equal(a.getWeight(),30);assert.equal(a.getURL(),"https://example.org");assert.equal(a.getAnnotation().format,"html");
  assert.throws(()=>applyRelationEdit(e,{label:"bad",type:"default",curve:null,from:"missing",to:"c",weight:22},context));assert.equal(e.from,a);assert.equal(e.getLabel(),"");
  applyRelationEdit(e,{label:"loop",type:"default",curve:"lens",from:"c",to:"c",weight:22,length:90},context);
  assert.deepEqual([a.edgeCount(),b.edgeCount(),c.edgeCount()],[0,0,2]);assert.deepEqual([a.visibleEdgeCount(),b.visibleEdgeCount(),c.visibleEdgeCount()],[0,0,2]);
  p.getGES().removeNode(b);applyRelationEdit(e,{label:"hidden",type:"default",curve:null,from:"c",to:"b"},context);
  assert.equal(p.getGES().contains(e),false);assert.deepEqual([b.edgeCount(),c.edgeCount()],[1,1]);assert.equal(c.visibleEdgeCount(),0);assert.equal(e.getLength(),90);
});
test("approved migrated examples preserve all records and normalized native round trips",async()=>{
  const directory=new URL("../examples/fm2014/",import.meta.url),files=await readdir(directory);
  assert.deepEqual(files.filter(n=>n.endsWith(".fm.yaml")).sort(),["berry.fm.yaml","nips-fm.fm.yaml"]);
  const types=await readFile(new URL("fm2014.types.yaml",directory),"utf8"),options={resolveTypes:()=>types},save={includeLayout:false,typesFile:"fm2014.types.yaml"};
  for(const [name,nodes,edges] of [["berry",21,22],["nips-fm",3777,5257]]) {
    const document=parseDocument(await readFile(new URL(name+".fm.yaml",directory),"utf8"),options);
    assert.equal(document.graph.nodeCount(),nodes);assert.equal(document.graph.edgeCount(),edges);
    assert.deepEqual(documentToRecord(parseDocument(serializeDocument(document,save),options),save),documentToRecord(document,save));
  }
  const report=JSON.parse(await readFile(new URL("conversion-report.json",directory),"utf8"));assert.deepEqual(report.approvedInputs,["berry.xml","nips-fm.xml"]);assert.ok(report.files.every(f=>f.status==="converted"));
});
test("XML converter rejects unapproved datasets and diagnoses supported legacy recovery without external resources",async t=>{
  const temporary=await mkdtemp(join(tmpdir(),"fm4-convert-"));t.after(()=>rm(temporary,{recursive:true,force:true}));
  const path=join(temporary,"berry.xml");await writeFile(path,'<graph><node><id>a</id><label>A</label><type>person</type><type>25</type><hint>&lt;p&gt;H&lt;/p&gt;</hint><url>C:/old</url><unknown>keep</unknown><relation><type>label</type><destination>later</destination><direction>backward</direction><stroke>2</stroke></relation></node></graph>');
  const run=spawnSync("python3",["scripts/convert-fm2014.py",path,"--recover-type-weights"],{encoding:"utf8"});assert.equal(run.status,0,run.stderr);
  const {document,report}=JSON.parse(run.stdout);assert.equal(document.nodes[0].weight,25);assert.equal(document.nodes[0].type,"person");assert.equal(document.nodes[0].annotation.format,"html");
  assert.equal(document.edges[0].from,"later");assert.equal(document.edges[0].visual.style.stroke.dash,"dashed");assert.equal(report.placeholders[0],"later");assert.ok(document.nodes[0].extensions.fm2014.unknownElements[0].includes("unknown"));
  const denied=spawnSync("python3",["scripts/convert-fm2014.py",join(temporary,"not-approved.xml")],{encoding:"utf8"});assert.notEqual(denied.status,0);assert.match(denied.stderr,/Only berry.xml and nips-fm.xml/);
});
test("user key map documents only supported actions and shares rows with browser help",async()=>{
  const source=await readFile(new URL("../docs/KEYMAP.md",import.meta.url),"utf8");
  for(const row of keymap)assert.ok(source.includes("| "+row.keys+" | "+row.action+" |"),row.keys);
  assert.match(source,/keys.txt/);assert.match(source,/not implemented shortcuts/);
});
