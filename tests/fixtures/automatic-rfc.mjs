/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
/** Deliberate weak-neighborhood diamond, parallel relations, cross-link, loop and third-hop context. */
export function automaticRfcFixture({FreshGraph,FreshNode,FreshEdge},reverse=false) {
  const graph=new FreshGraph();
  const nodes=[['r',0,0],['a',-80,-40],['b',80,-40],['s',0,-120],['t',-160,0],['z',-150,60],['f',-240,80],['x',-260,-80]];
  const edges=[['ra0','r','a'],['ra1','r','a'],['br','b','r'],['as','a','s'],['bs','b','s'],['at','t','a'],['ab','a','b'],['loop','r','r'],['az','a','z'],['tf','t','f'],['tx','t','x']];
  for(const [id,x,y] of reverse?nodes.slice().reverse():nodes)graph.addNode(new FreshNode(id,id,{type:'idea',position:{x,y},weight:id==='z'?0:1}));
  for(const [id,from,to] of reverse?edges.slice().reverse():edges)graph.addEdge(new FreshEdge(graph.findNode(from),graph.findNode(to),{id,label:id,weight:10}));
  return graph;
}
