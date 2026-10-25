import test from 'node:test';import assert from 'node:assert/strict';
import {FreshGraph,FreshNode,FreshEdge,captureRadiusSnapshot,projectRadiusTwo} from 'fm4/fm/core';
function fixture(){
  const ids=['c','a','b','d','x','y','u'],nodes=ids.map(id=>({id,label:id.toUpperCase(),type:'service',weight:1}));
  const records=[['ca','c','a'],['bc','b','c'],['cd','c','d'],['ad','a','d'],['ax1','a','x'],['ax2','a','x'],['xa','x','a'],['bx','b','x'],['by','b','y'],['xy','x','y'],['aa','a','a'],['cc','c','c'],['yy','y','y'],['bu','b','u']];
  return {generation:'fixture:1',complete:true,nodes,edges:records.map(([id,from,to])=>({id,from,to,label:id,type:'calls',weight:id==='ax2'?0:10,direction:id==='bu'?'undirected':'directed'}))};
}
test('radius-two projection has literal path witnesses, shared identity and complete edge accounting',()=>{
  const source=fixture(),before=structuredClone(source),p=projectRadiusTwo(source,'c');assert.deepEqual(source,before);
  assert.deepEqual(p.rows.items.map(r=>r.nodeId),['a','b','d']);assert.deepEqual(p.counts,{directNodes:3,secondStepNodes:3,occurrences:5,edgeRecords:14,complete:true});assert.deepEqual(p.centerSelfEdgeIds,['cc']);
  const a=p.rows.items[0],b=p.rows.items[1];assert.deepEqual(a.centerEdgeIds,['ca']);assert.deepEqual(a.crossEdgeIds,['ad']);assert.deepEqual(a.selfEdgeIds,['aa']);
  assert.deepEqual(a.outgoing.items.map(o=>[o.nodeId,o.edgeIds,p.witnesses[o.nodeId]]),[['x',['ax1','ax2'],['a','b']]]);
  assert.deepEqual(a.incoming.items.map(o=>[o.nodeId,o.edgeIds]),[['x',['xa']]]);assert.equal(b.undirected.items[0].nodeId,'u');
  assert.deepEqual(p.otherRelations.items,['xy','yy']);assert.equal(p.edgeRecords.find(e=>e.id==='ax2').weight,0);
  const accounted=new Set([...p.centerSelfEdgeIds,...p.otherRelations.items]);for(const row of p.rows.items){for(const field of ['centerEdgeIds','selfEdgeIds','crossEdgeIds'])row[field].forEach(id=>accounted.add(id));for(const wing of ['incoming','outgoing','undirected'])for(const cell of row[wing].items)cell.edgeIds.forEach(id=>accounted.add(id));}
  assert.deepEqual([...accounted].sort(),source.edges.map(e=>e.id).sort());assert.equal(p.nodes.length,7);
  p.nodes[0].label='detached';p.edgeRecords[0].weight=99;assert.deepEqual(source,before);
});
test('paging and input insertion order do not change levels, identities or sharing',()=>{
  const source=fixture(),full=projectRadiusTwo(source,'c'),one=projectRadiusTwo(source,'c',{rowLimit:1,cellLimit:1});
  assert.equal(one.rows.total,3);assert.equal(one.rows.nextOffset,1);assert.equal(one.rows.items[0].outgoing.items.some(o=>o.nodeId==='d'),false);assert.deepEqual(one.counts,full.counts);
  const next=projectRadiusTwo(source,'c',{rowOffset:1,rowLimit:1,cellLimit:1});assert.equal(next.rows.items[0].nodeId,'b');assert.equal(next.rows.items[0].outgoing.nextOffset,1);
  const cell=projectRadiusTwo(source,'c',{cellLimit:1,cellOffsets:{b:{outgoing:1}}});assert.equal(cell.rows.items[1].outgoing.items[0].nodeId,'y');
  assert.deepEqual(projectRadiusTwo({...source,nodes:[...source.nodes].reverse(),edges:[...source.edges].reverse()},'c'),full);
});
test('direction and type policies determine shortest-hop levels while true edge directions remain inspectable',()=>{
  const source=fixture(),out=projectRadiusTwo(source,'c',{direction:'outgoing'}),incoming=projectRadiusTwo(source,'c',{direction:'incoming'});
  assert.deepEqual(out.rows.items.map(r=>r.nodeId),['a','d']);assert.deepEqual(out.nodes.map(n=>n.id).sort(),['a','c','d','x']);assert.deepEqual(out.rows.items[0].incoming.items,[]);assert.ok(out.otherRelations.items.includes('xa'));
  assert.deepEqual(incoming.rows.items.map(r=>r.nodeId),['b']);assert.deepEqual(incoming.nodes.map(n=>n.id).sort(),['b','c','u']);
  assert.equal(projectRadiusTwo(source,'c',{relationTypes:[]}).nodes.length,1);assert.equal(projectRadiusTwo(source,'c',{nodeTypes:[]}).rows.knownItems,0);
});
test('incomplete adjacency never claims exact second-hop levels, totals or missing relations',()=>{
  const source=fixture();source.complete=false;source.edges=source.edges.filter(e=>e.id!=='cd');const p=projectRadiusTwo(source,'c');
  assert.equal(p.confirmedSecondHop,false);assert.equal(p.counts.complete,false);assert.equal(p.rows.total,undefined);assert.equal(p.rows.hasMore,true);assert.equal(p.rows.nextOffset,undefined);
  assert.equal(p.rows.items[0].outgoing.items.find(o=>o.nodeId==='d').level,'second-step-candidate');assert.equal(p.rows.items[0].outgoing.total,undefined);assert.equal(p.otherRelations.total,undefined);
  const original=fixture();original.complete=false;original.completeAdjacency=['c','a'];const known=projectRadiusTwo(original,'c');assert.equal(known.rows.total,3);assert.equal(known.rows.items[0].outgoing.total,1);assert.equal(known.rows.items[1].outgoing.total,undefined);assert.equal(known.confirmedSecondHop,true);
});
test('projection rejects malformed identities, endpoints, weights, budgets and page policies without changing source',()=>{
  const source=fixture(),before=structuredClone(source);
  for(const options of [{rowLimit:0},{rowLimit:101},{cellLimit:101},{rowOffset:-1},{direction:'sideways'},{cellOffsets:{missing:{incoming:0}}},{cellOffsets:{a:{side:2}}}])assert.throws(()=>projectRadiusTwo(source,'c',options));
  for(const change of [{nodes:[...source.nodes,source.nodes[0]]},{edges:[...source.edges,source.edges[0]]},{edges:[{...source.edges[0],to:'missing'}]},{edges:[{...source.edges[0],weight:NaN}]},{complete:undefined},{completeAdjacency:['missing']}])assert.throws(()=>projectRadiusTwo({...source,...change},'c'));
  assert.throws(()=>projectRadiusTwo({...source,nodes:Array(50_001).fill(source.nodes[0])},'c'),/work limit/);assert.deepEqual(source,before);
});
test('graph snapshots preserve complete graph membership, coordinates and generation separation',()=>{
  const graph=new FreshGraph();const a=new FreshNode('a','A',{position:{x:12,y:4},fixed:true}),b=new FreshNode('b','B',{position:{x:-7,y:8}});graph.addNode(a);graph.addNode(b);graph.addEdge(new FreshEdge(a,b,{id:'ab',label:'depends on',weight:0}));
  const snapshot=captureRadiusSnapshot(graph,'old'),p=projectRadiusTwo(snapshot,'a');assert.deepEqual([a.x,a.y,b.x,b.y,a.isFixed(),graph.nodeCount(),graph.edgeCount()],[12,4,-7,8,true,2,1]);assert.equal('position' in snapshot.nodes[0],false);
  const replacement=new FreshGraph();replacement.addNode(new FreshNode('a','Replacement'));const newer=projectRadiusTwo(captureRadiusSnapshot(replacement,'new'),'a');assert.equal(newer.generation,'new');assert.equal(newer.nodes[0].label,'Replacement');assert.equal(p.nodes.find(n=>n.id==='a').label,'A');assert.equal(p.generation,'old');
});

test('prototype-like canonical identities remain ordinary nodes and witness records',()=>{
  const source={generation:'prototype-ids',complete:true,nodes:['center','constructor','toString','__proto__'].map(id=>({id,label:id,type:'service',weight:1})),edges:[['c1','center','constructor'],['c2','center','toString'],['a','constructor','__proto__'],['b','toString','__proto__']].map(([id,from,to])=>({id,from,to,label:id,type:'calls',weight:0,direction:'directed'}))};
  const p=projectRadiusTwo(source,'center');assert.deepEqual(p.witnesses.__proto__,['constructor','toString']);assert.equal(Object.hasOwn(p.witnesses,'__proto__'),true);assert.equal(p.counts.secondStepNodes,1);assert.equal(p.counts.occurrences,2);assert.equal(p.counts.edgeRecords,4);
});
