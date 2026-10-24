/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdirSync,writeFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {FreshGraph,FreshNode,FreshEdge,FreshmindDocument,TypeRegistry,freshmind2014Configuration,spanningTree} from "fm4/fm/core";
import {serializeDocument} from "fm4/fm/io";

/** Synthetic hybrid-view fixture; this is not a reconstruction of the 2005 figures. */
export function structuralExample() {
  const graph=new FreshGraph();
  const records=[['project-a','Project A','project',-160,0],['project-b','Project B','project',160,0],
    ['alpha','Group Alpha','group',-160,140],['beta','Group Beta','group',160,140],
    ['alice','Alice','person',-260,200],['amir','Amir','person',-100,250],['bea','Bea','person',100,250],['ben','Ben','person',260,200],
    ['shared','Shared collaborator','person',0,130],['a-paper','A: Research notes','paper',-240,-100],['b-paper','B: Research notes','paper',240,-100],
    ['alpha-paper','Alpha: Working notes','paper',-280,100],['beta-paper','Beta: Working notes','paper',280,100]];
  for(const [id,label,type,x,y] of records)graph.addNode(new FreshNode(id,label,{type,position:{x,y},annotation:{format:'text',text:`Synthetic ${type} for the structural focus + context example.`}}));
  for(const [i,[from,to,label]] of [['project-a','project-b','collaborates'],['project-a','alpha','involves'],['project-b','beta','involves'],
    ['alpha','alice','member'],['alpha','amir','member'],['beta','bea','member'],['beta','ben','member'],
    ['alpha','shared','member'],['beta','shared','member'],['project-a','a-paper','authored'],['project-b','b-paper','authored'],
    ['alpha','alpha-paper','authored'],['beta','beta-paper','authored']].entries())
    graph.addEdge(new FreshEdge(graph.findNode(from),graph.findNode(to),{id:`relation-${i}`,label,type:label==='authored'?'authored':'default',length:90}));
  graph.setSubstructure(spanningTree(graph,['project-a','alpha','alice','amir','a-paper','alpha-paper'],'project-a','a-detail','A: stored detail'));
  graph.setSubstructure(spanningTree(graph,['project-b','beta','bea','ben','b-paper','beta-paper'],'project-b','b-detail','B: stored detail'));
  const doc=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph);doc.title='Structural focus + context';
  doc.view={wholeGraph:true,focus:'project-a',radius:2,backlinks:true,moveToCenter:true,
    lenses:{zoom:1,hyperbolic:35,rotation:0,pan:{x:0,y:0}},canvas:{zoom:1,pan:{x:0,y:0}}};return doc;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  mkdirSync('examples/rfc',{recursive:true});writeFileSync('examples/rfc/structural-focus-context.fm.yaml',serializeDocument(structuralExample()));
  console.log('Wrote examples/rfc/structural-focus-context.fm.yaml (synthetic, 13 nodes / 13 relations).');
}
