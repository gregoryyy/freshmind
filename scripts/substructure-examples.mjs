/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdir,writeFile} from "node:fs/promises";
import {FreshGraph,FreshNode,FreshEdge,FreshmindDocument,TypeRegistry,freshmind2014Configuration} from "fm4/fm/core";
import {serializeDocument} from "fm4/fm/io";

const graph=new FreshGraph();
for(const [id,label,x,y,type] of [
  ["tree-root","Tree center",-230,-50,"project"],["t1","Branch A",-340,50,"idea"],["t2","Branch B",-150,70,"idea"],
  ["t11","Detail A1",-410,180,"paper"],["t12","Detail A2",-280,190,"paper"],["t21","Detail B1",-120,210,"paper"],
  ["dag-root","DAG center",240,-80,"project"],["d1","Route A",160,30,"idea"],["d2","Route B",330,30,"idea"],
  ["d3","Shared descendant",240,150,"topic"],["d4","Outcome",310,290,"paper"],["shared","Shared member",30,260,"person"]
])graph.addNode(new FreshNode(id,label,{type,position:{x,y},fixed:id.endsWith("root"),annotation:{format:"text",text:
  id==="shared"?"This node belongs to both the saved tree and DAG. Activating either definition retains both memberships.":`Synthetic RFC substructure example: ${label}.`}}));
for(const [id,from,to,label] of [
  ["t-a","tree-root","t1","branch"],["t-b","tree-root","t2","branch"],["t-a1","t1","t11","detail"],["t-a2","t1","t12","detail"],
  ["t-b1","t2","t21","detail"],["t-shared","t2","shared","member"],
  ["d-a","dag-root","d1","route"],["d-b","dag-root","d2","route"],["d-ac","d1","d3","joins"],["d-bc","d2","d3","joins"],
  ["d-end","d3","d4","result"],["d-shared","d3","shared","member"],["context","t11","d4","context"]
])graph.addEdge(new FreshEdge(graph.findNode(from),graph.findNode(to),{id,label,length:100}));
graph.setSubstructure({id:"tree-example",label:"Tree with descendants",kind:"tree",rootId:"tree-root",nodeIds:["tree-root","t1","t2","t11","t12","t21","shared"],edgeIds:["t-a","t-b","t-a1","t-a2","t-b1","t-shared"]});
graph.setSubstructure({id:"dag-example",label:"DAG with shared descendant",kind:"dag",rootId:"dag-root",nodeIds:["dag-root","d1","d2","d3","d4","shared"],edgeIds:["d-a","d-b","d-ac","d-bc","d-end","d-shared"]});
const doc=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph);doc.title="RFC substructures (synthetic)";
doc.view={focus:"tree-root",wholeGraph:true,radius:2,lenses:{zoom:1,hyperbolic:0,rotation:0},canvas:{zoom:.9}};
const out=new URL("../docs/experiments/rfc-substructures/",import.meta.url);await mkdir(out,{recursive:true});
await writeFile(new URL("trees-and-dag.fm.yaml",out),serializeDocument(doc));console.log("Wrote synthetic tree/DAG membership example (12 nodes, 13 relations).");
