/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdirSync,writeFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {FreshGraph,FreshNode,FreshEdge,FreshmindDocument,TypeRegistry,freshmind2014Configuration,spanningTree} from "fm4/fm/core";
import {serializeDocument} from "fm4/fm/io";

/** A new synthetic research community demonstrating the original RFC/hybrid browsing tasks. */
export function rfcShowcaseExample() {
  const graph=new FreshGraph(),config=structuredClone(freshmind2014Configuration);
  config.relationTypes.includes={label:"Project content",visual:"content"};
  config.relationTypes.team={label:"Project team",visual:"team"};
  config.relationTypes.member={label:"Group membership",visual:"member"};
  config.relationTypes.collaborates={label:"Project collaboration",visual:"team"};
  config.edgeVisuals.content={extends:"default",stroke:{color:"#9a6950"},label:{color:"#805740"}};
  config.edgeVisuals.team={extends:"default",stroke:{color:"#4c639d",width:1.5},label:{color:"#405887"}};
  config.edgeVisuals.member={extends:"default",stroke:{color:"#58815c"},label:{color:"#456c49"}};
  const node=(id,label,type,x,y,description)=>{
    const n=new FreshNode(id,label,{type,position:{x,y},annotation:{format:"text",text:description}});graph.addNode(n);return n;
  };
  const projects=[
    ["atlas","Graph Atlas",260,150,"A focal project about exploring graph communities.", ["Community\nMaps","Readable\nNeighborhoods","Local\nStructure"]],
    ["topics","Topic Lens",260,-210,"A second focal project sharing Semantic Methods with Graph Atlas.",["Topic\nLandscapes","Query\nContexts","Semantic\nTrails"]],
    ["archive","Archive Bridge",-510,-140,"A context project connecting two teams.",["Archive\nConnections","Digital\nCollections","Shared\nCatalogues"]],
    ["signal","Signal Studio",-450,260,"A context project in the Visual Systems group.",["Signal\nPatterns","Robust\nEstimates","Visual\nSignals"]],
    ["review","Review Desk",-190,-510,"A context project in the Open Data group.",["Review\nMethods","Evidence\nNotes","Study\nDesigns"]],
    ["corpus","Corpus Hub",-80,480,"A context project in the Semantic Methods group.",["Corpus\nLinks","Document\nModels","Reusable\nCorpora"]]
  ];
  for(const [id,label,x,y,description] of projects)node(id,label,"project",x,y,description);
  for(const [id,label,x,y] of [["visual","Visual Systems",-80,170],["semantic","Semantic Methods",-30,-35],["data","Open Data",-200,-280]])
    node(id,label,"group",x,y,id==="semantic"?"A shared group belonging to both focal neighborhoods. Its own leaf members can aggregate while the shared group stays visible.":"A team whose low-detail leaf members can aggregate into a typed count.");
  for(const [id,label,x,y] of [["ada","Ada",-150,280],["eli","Eli",-20,300],["noor","Noor",-120,-80],["liam","Liam",60,-90],
    ["zoe","Zoe",-320,-360],["sam","Sam",-150,-410],["maya","Maya",-55,60]])
    node(id,label,"person",x,y,id==="maya"?"A collaborator connecting Visual Systems and Semantic Methods. Two semantic neighbors make Maya a bridge, so conservative leaf aggregation keeps this person visible.":"A fictional group member. In the hybrid view, this single-neighbor person aggregates into the group's typed count.");
  const edge=(from,to,type,label="",length=130)=>graph.addEdge(new FreshEdge(graph.findNode(from),graph.findNode(to),{id:`${from}:${to}`,type,label,length}));
  for(const [project,group] of [["atlas","visual"],["atlas","semantic"],["topics","semantic"],["topics","data"],
    ["archive","visual"],["archive","data"],["signal","visual"],["review","data"],["corpus","semantic"]])edge(project,group,"team","team");
  for(const [group,person] of [["visual","ada"],["visual","eli"],["semantic","noor"],["semantic","liam"],
    ["data","zoe"],["data","sam"],["visual","maya"],["semantic","maya"]])edge(group,person,"member","member",90);
  for(const [index,[id,,x,y,,titles]] of projects.entries())for(const [i,title] of titles.entries()) {
    const outward=Math.atan2(y,x),angle=outward+(i-1)*.7,radius=190+(index%2)*15,paper=`${id}-paper-${i+1}`;
    node(paper,title,"paper",x+Math.cos(angle)*radius,y+Math.sin(angle)*radius,
      `Synthetic research note for ${graph.findNode(id).getLabel()}. Content in a focal neighborhood remains visible; remote single-neighbor papers can aggregate.`);
    edge(id,paper,"includes");
  }
  // Citation-bearing context papers remain semantic bridges even in the hybrid view.
  edge("archive-paper-1","corpus-paper-2","cites","cites",160);
  edge("archive","corpus","collaborates","collaborates",180);
  for(const id of ["atlas","topics"]) {
    const root=graph.findNode(id),members=[id,...[...root.getEdges()].map(e=>e.getOtherEndpt(root).getID())];
    graph.setSubstructure(spanningTree(graph,members,id,`${id}-focus`,`${root.getLabel()}: focal neighborhood`));
  }
  const doc=new FreshmindDocument(new TypeRegistry(config),graph);
  doc.title="Research community: RFC showcase";
  doc.data={example:"rfc-showcase",provenance:"All projects, people, notes and relations are synthetic. This is a new capability demonstration inspired by the 2005 RFC/hybrid examples, not reconstructed source data."};
  doc.view={wholeGraph:true,focus:"atlas",radius:2,backlinks:true,moveToCenter:true,
    lenses:{zoom:1,hyperbolic:0,rotation:0,pan:{x:0,y:0}},canvas:{zoom:.65,pan:{x:0,y:0}}};
  return doc;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  mkdirSync("examples/rfc",{recursive:true});
  writeFileSync("examples/rfc/research-community.fm.yaml",serializeDocument(rfcShowcaseExample()));
}
