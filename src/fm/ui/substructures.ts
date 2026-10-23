/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import {FreshNode} from "../model.js";
import type {FreshmindPanel} from "../panel.js";
import {spanningTree,validateSubstructure,clusterStructure} from "../structures/model.js";
import type {GraphSubstructure} from "../structures/model.js";
import {clusterGraph,clusterToSubstructure} from "../clustering/index.js";
import type {ClusterResult} from "../clustering/index.js";

export interface SubstructureControlElements {
  structure:HTMLSelectElement; name:HTMLInputElement; kind:HTMLSelectElement;
  create:HTMLButtonElement; save:HTMLButtonElement; addMember:HTMLButtonElement; removeMember:HTMLButtonElement;
  reroot:HTMLButtonElement; activate:HTMLButtonElement; remove:HTMLButtonElement;
  memberships:HTMLElement; status:HTMLElement;
  algorithm:HTMLSelectElement; resolution:HTMLInputElement; weighted:HTMLInputElement; scope:HTMLSelectElement;
  detect:HTMLButtonElement; cluster:HTMLSelectElement; members:HTMLElement; renderCluster:HTMLButtonElement;
}
/** Reusable controls for persistent membership and detached cluster proposals; returns complete cleanup. */
export function bindSubstructureControls(panel:FreshmindPanel,e:SubstructureControlElements):()=>void {
  let clusters:ClusterResult|null=null,source=panel.getCompleteEltSet(),clusterScope="",revision=-1;
  const removers:(()=>void)[]=[];
  const on=(element:HTMLElement,event:string,callback:()=>void)=>{element.addEventListener(event,callback);removers.push(()=>element.removeEventListener(event,callback));};
  const message=(text:string,error=false)=>{e.status.textContent=text;e.status.dataset.error=String(error);};
  const selected=()=>{const node=panel.getSelection();if(!(node instanceof FreshNode))throw new Error("Select a node first");return node;};
  const definition=()=>{const s=panel.getCompleteEltSet().getSubstructure(e.structure.value);if(!s)throw new Error("Select a substructure first");return s;};
  const nextId=()=>{const g=panel.getCompleteEltSet();let i=1;while(g.getSubstructure(`s${i}`))i++;return `s${i}`;};
  const resetClusters=()=>{clusters=null;e.cluster.replaceChildren();e.members.textContent="";e.renderCluster.disabled=true;};
  const update=()=>{
    const graph=panel.getCompleteEltSet();
    if(source!==graph){source=graph;revision=-1;resetClusters();message("");}
    if(revision!==graph.getSubstructureRevision()) {
      revision=graph.getSubstructureRevision();const previous=e.structure.value;e.structure.replaceChildren();
      const empty=e.structure.ownerDocument.createElement("option");empty.value="";empty.textContent="Choose a substructure";e.structure.append(empty);
      for(const s of graph.getSubstructures()){const option=e.structure.ownerDocument.createElement("option");option.value=s.id;option.textContent=`${s.label} (${s.kind}, ${s.nodeIds.length})`;e.structure.append(option);}
      if(graph.getSubstructure(previous))e.structure.value=previous;
    }
    const node=panel.getSelection(),valid=node instanceof FreshNode,structure=graph.getSubstructure(e.structure.value);
    e.create.disabled=!valid;e.activate.disabled=e.remove.disabled=e.save.disabled=!structure;
    e.addMember.disabled=e.removeMember.disabled=e.reroot.disabled=!valid||!structure;
    e.reroot.textContent=structure?.kind==="cluster"?"Use selected node as representative":"Use selected node as root";
    e.memberships.textContent=valid?`Member of: ${graph.getNodeSubstructures(node).map(s=>s.label).join(", ")||"none"}.`:"";
    e.resolution.disabled=e.algorithm.value!=="louvain";
  };
  const choose=(id:string)=>{update();e.structure.value=id;const s=panel.getCompleteEltSet().getSubstructure(id);if(s){e.name.value=s.label;e.kind.value=s.kind;}update();};
  const build=(kind:GraphSubstructure["kind"],rootId:string,nodeIds:string[],id:string,label:string):GraphSubstructure=>{
    const graph=panel.getCompleteEltSet();
    if(kind==="tree")return spanningTree(graph,nodeIds,rootId,id,label);
    if(kind==="cluster")return clusterStructure(graph,nodeIds,rootId,id,label);
    const members=new Set(nodeIds),edgeIds=[...graph.getEdges()].filter(edge=>edge.from!==edge.to&&members.has(edge.from.getID()!)&&members.has(edge.to.getID()!)).map(edge=>edge.getID()!);
    return validateSubstructure(graph,{id,label,kind,rootId,nodeIds,edgeIds});
  };
  const action=(button:HTMLButtonElement,callback:()=>void)=>on(button,"click",()=>{
    try{callback();panel.getRfc().reconcile();panel.repaintAfterMove();update();}catch(error){message(error instanceof Error?error.message:String(error),true);}
  });
  const show=(s:GraphSubstructure)=>{
    const graph=panel.getCompleteEltSet(),visible=panel.getGES();
    for(const id of s.nodeIds)visible.addNode(graph.findNode(id)!);
    for(const edge of graph.getEdges())if(visible.contains(edge.from)&&visible.contains(edge.to))visible.addEdge(edge);
    panel.localityChanged();panel.setSelect(graph.findNode(s.rootId));panel.centerOn(graph.findNode(s.rootId)!,true);
    panel.getRfc().activateSubstructure(s.id,true);panel.focusGraph();
  };
  on(e.structure,"change",()=>{const s=panel.getCompleteEltSet().getSubstructure(e.structure.value);if(s){e.name.value=s.label;e.kind.value=s.kind;}update();});
  action(e.create,()=>{
    const root=selected(),id=nextId(),kind=e.kind.value;if(kind!=="tree"&&kind!=="dag"&&kind!=="cluster")throw new Error("Choose tree, DAG or cluster");
    const s=build(kind,root.getID()!,[...panel.getGES().getNodes()].map(n=>n.getID()!),id,e.name.value.trim()||`${root.getLabel()} ${kind}`);
    panel.getCompleteEltSet().setSubstructure(s);choose(s.id);message(`Saved ${s.kind}: ${s.nodeIds.length} members.`);
  });
  action(e.save,()=>{const s=definition(),kind=e.kind.value;if(kind!=="tree"&&kind!=="dag"&&kind!=="cluster")throw new Error("Choose tree, DAG or cluster");const label=e.name.value.trim()||s.label;panel.getCompleteEltSet().setSubstructure(kind===s.kind?{...s,label}:build(kind,s.rootId,s.nodeIds,s.id,label));message("Saved substructure settings.");});
  action(e.addMember,()=>{const s=definition(),id=selected().getID()!;s.nodeIds=[...new Set([...s.nodeIds,id])];panel.getCompleteEltSet().setSubstructure(build(s.kind,s.rootId,s.nodeIds,s.id,s.label));message("Added selected node to substructure.");});
  action(e.removeMember,()=>{const s=definition(),id=selected().getID()!;if(id===s.rootId)throw new Error(`Choose another ${s.kind==="cluster"?"representative":"root"} before removing this node`);s.nodeIds=s.nodeIds.filter(n=>n!==id);panel.getCompleteEltSet().setSubstructure(build(s.kind,s.rootId,s.nodeIds,s.id,s.label));message("Removed selected node from substructure.");});
  action(e.reroot,()=>{const s=definition(),id=selected().getID()!;panel.getCompleteEltSet().setSubstructure({...s,rootId:id});message(s.kind==="cluster"?"Changed cluster representative.":"Changed substructure root.");});
  action(e.activate,()=>{const s=definition();show(s);message(`Reinforcing ${s.label}.`);});
  action(e.remove,()=>{panel.getCompleteEltSet().removeSubstructure(definition().id);message("Removed substructure definition.");});
  const preview=()=>{
    const c=clusters?.clusters.find(c=>c.id===e.cluster.value);e.renderCluster.disabled=!c;
    e.members.textContent=c?`${c.nodeIds.length} nodes: ${c.nodeIds.slice(0,8).map(id=>panel.findNode(id)?.getLabel()??id).join(", ")}${c.nodeIds.length>8?", …":""}`:"";
  };
  on(e.cluster,"change",preview);
  for(const input of [e.algorithm,e.resolution,e.weighted,e.scope])on(input,"change",()=>{resetClusters();update();});
  action(e.detect,()=>{
    const algorithm=e.algorithm.value;if(algorithm!=="louvain"&&algorithm!=="components")throw new Error("Choose a clustering algorithm");
    clusterScope=e.scope.value;const graph=clusterScope==="visible"?panel.getGES():panel.getCompleteEltSet();
    clusters=clusterGraph(graph,{algorithm,resolution:algorithm==="louvain"?e.resolution.valueAsNumber:1,weighted:e.weighted.checked});e.cluster.replaceChildren();
    for(const c of clusters.clusters){const option=e.cluster.ownerDocument.createElement("option");option.value=c.id;option.textContent=`${c.id}: ${c.nodeIds.length} nodes · ${panel.findNode(c.rootId)?.getLabel()??c.rootId}`;e.cluster.append(option);}
    preview();message(`Found ${clusters.clusters.length} clusters in the ${clusterScope} graph.`);
  });
  action(e.renderCluster,()=>{
    if(!clusters)throw new Error("Detect clusters first");const graph=clusterScope==="visible"?panel.getGES():panel.getCompleteEltSet(),id=nextId();
    const c=clusters.clusters.find(c=>c.id===e.cluster.value);if(!c)throw new Error("Select a cluster first");
    const node=panel.getSelection(),root=node instanceof FreshNode&&c.nodeIds.includes(node.getID()!)?node.getID()!:undefined;
    const s=clusterToSubstructure(graph,clusters,c.id,id,e.name.value.trim()||`${clusters.algorithm} ${c.id}`,root);
    panel.getCompleteEltSet().setSubstructure(s);choose(s.id);show(s);message(`Saved and reinforced ${s.label}: ${s.nodeIds.length} members.`);
    // Showing a cluster may change the visible-scope input; proposals must be detected afresh.
    if(clusterScope==="visible")resetClusters();
  });
  const listener={graphMoved:update,graphReset:update};panel.addGraphListener(listener);
  const removeSelection=panel.addSelectionListener(update);update();
  return()=>{removers.forEach(remove=>remove());panel.removeGraphListener(listener);removeSelection();};
}
