import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FreshmindPanel,installDocument,captureDocument} from "fm4/fm";
import {parseDocument,serializeDocument} from "fm4/fm/io";
import {rfcShowcaseExample} from "../scripts/rfc-showcase-example.mjs";

test("research showcase regenerates exactly with typed content, shared focus membership and citation bridges",()=>{
  const source=readFileSync(new URL("../examples/rfc/research-community.fm.yaml",import.meta.url),"utf8");
  assert.equal(source,serializeDocument(rfcShowcaseExample()));
  const doc=parseDocument(source),g=doc.graph;
  assert.equal(g.nodeCount(),34);assert.equal(g.edgeCount(),37);assert.deepEqual(doc.types.getDiagnostics(),[]);
  const counts={};for(const n of g.getNodes()){counts[n.getSemanticType()]=(counts[n.getSemanticType()]??0)+1;assert.ok(n.getAnnotation().text);}
  assert.deepEqual(counts,{project:6,group:3,person:7,paper:18});
  const [a,b]=g.getSubstructures();assert.equal(a.nodeIds.length,6);assert.equal(b.nodeIds.length,6);
  assert.deepEqual(a.nodeIds.filter(id=>b.nodeIds.includes(id)),["semantic"]);
  assert.equal(g.findNode("maya").edgeCount(),2);assert.equal(g.findNode("archive-paper-1").edgeCount(),2);
  assert.equal(g.findNode("corpus-paper-2").edgeCount(),2);assert.equal(doc.data.example,"rfc-showcase");
  assert.deepEqual(parseDocument(serializeDocument(doc)).graph.getSubstructures(),g.getSubstructures());
});

test("two-focus hybrid keeps focal detail and semantic bridges, reveals leaf detail and exports the complete community",async()=>{
  const doc=rfcShowcaseExample(),p=new FreshmindPanel(undefined,{autoStart:false,animateLocality:false});
  try {
    await installDocument(p,doc,{reinforceFocus:true});p.getRfc().addFocus(p.findNode("topics"));
    const state=p.getRfc().getState();assert.equal(state.centers.length,2);assert.equal(state.memberIds.length,11);assert.equal(state.radialEdgeIds.length,10);
    const coords=()=>[...doc.graph.getNodes()].map(n=>[n.getID(),n.x,n.y]);const before=coords();
    p.getStructuralView().configure({enabled:true,aggregateTypes:["person","paper"],detailRadius:1});
    const view=p.getStructuralView().getState();assert.equal(view.nodeIds.length,18);assert.equal(view.edgeIds.length,21);assert.equal(view.aggregatedNodeIds.length,16);
    assert.equal(view.groups.length,7);
    for(const id of [...state.memberIds,"maya","archive-paper-1","corpus-paper-2"])assert.ok(view.nodeIds.includes(id),id);
    p.setHyperbolic(60);p.setCanvasZoom(.8);p.setRotation(.3);assert.deepEqual(coords(),before);
    await p.expandNode(p.findNode("semantic"));assert.equal(p.visibleNodeCount(),20);
    const saved=parseDocument(serializeDocument(captureDocument(p,doc)));
    assert.equal(saved.graph.nodeCount(),34);assert.equal(saved.graph.edgeCount(),37);assert.deepEqual(saved.data,doc.data);
    assert.deepEqual(saved.graph.getSubstructures(),doc.graph.getSubstructures());
    p.getStructuralView().configure({enabled:false});assert.equal(p.visibleNodeCount(),34);assert.equal(p.visibleEdgeCount(),37);
  }finally{p.destroy();}
});
