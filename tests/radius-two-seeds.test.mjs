import test from 'node:test';import assert from 'node:assert/strict';
import {FreshGraph,FreshNode,FreshEdge} from 'fm4/fm/model';
import {FreshmindPanel} from 'fm4/fm/browser';
import {graphSearchCorpus,createGraphQuery,applyGraphSearchResults,rejectGraphSearchResult,graphSearchViewSeeds} from 'fm4/fm/ir';
const request={engine:'lexical',kind:'terms',query:'graph'};
function fixture(count=2){const graph=new FreshGraph();for(let i=0;i<count;i++)graph.addNode(new FreshNode(`d${i}`,`Graph document ${i}`));const corpus=graphSearchCorpus(graph),query=createGraphQuery(graph,request);const results=Array.from({length:count},(_,i)=>({id:`d${i}`,score:2-i/(count+1),relevance:.5,rank:i+1}));const edges=applyGraphSearchResults(graph,query,request,results,corpus);return {graph,query,edges,corpus};}
test('retrieval view seeds keep exact accepted lexical/LDA provenance without running an engine or mutating the graph',()=>{
  const {graph,query,edges,corpus}=fixture();const lda={engine:'lda',kind:'similarity',query:'d0',metric:'symmetric-kl',maxDistance:100};
  const semantic=applyGraphSearchResults(graph,graph.findNode('d0'),lda,[{id:'d1',score:3.25,relevance:.8,rank:1,metric:'symmetric-kl',value:.125}],corpus)[0];
  const before=[graph.nodeCount(),graph.edgeCount(),[...graph.getNodes()].map(n=>[n.x,n.y])],seeds=graphSearchViewSeeds(graph);
  assert.equal(seeds.total,3);assert.deepEqual(seeds.items[0],{nodeId:'d1',sourceId:'d0',edgeId:semantic.getID(),request:lda,rank:1,score:3.25,corpus:corpus.fingerprint,metric:'symmetric-kl',value:.125});
  assert.deepEqual(seeds.items.slice(1).map(s=>[s.nodeId,s.sourceId,s.edgeId,s.rank]),[['d0',query.getID(),edges[0].getID(),1],['d1',query.getID(),edges[1].getID(),2]]);
  seeds.items[1].request.query='Changed copy';assert.equal(graphSearchViewSeeds(graph).items[1].request.query,'graph');assert.deepEqual([graph.nodeCount(),graph.edgeCount(),[...graph.getNodes()].map(n=>[n.x,n.y])],before);
});
test('query/corpus changes, malformed metadata and rejected links cannot become view seeds',()=>{
  for(const mutation of ['query','corpus','rank','requestKey','metric','rejected']) {
    const {graph,query,edges}=fixture(1),edge=edges[0];
    if(mutation==='query'){const data=query.getData();data.search.request.query='other';query.setData(data);}
    else if(mutation==='corpus')graph.findNode('d0').setLabel('Different content');
    else if(mutation==='rejected')rejectGraphSearchResult(graph,edge);
    else {const data=edge.getData();if(mutation==='rank')data.search.rank='1';if(mutation==='requestKey')data.search.requestKey='wrong';if(mutation==='metric'){data.search.metric='invalid';data.search.value=.1;}edge.setData(data);}
    assert.deepEqual(graphSearchViewSeeds(graph),{items:[],total:0},mutation);
  }
});
test('seed paging is bounded and preserves canonical ranks and totals',()=>{
  const {graph}=fixture(120),first=graphSearchViewSeeds(graph),last=graphSearchViewSeeds(graph,100,50);
  assert.equal(first.items.length,50);assert.equal(first.total,120);assert.equal(first.nextOffset,50);assert.equal(last.items.length,20);assert.equal(last.items[0].rank,101);assert.equal(last.nextOffset,undefined);
  for(const [offset,limit] of [[-1,50],[0,0],[0,101],[NaN,1]])assert.throws(()=>graphSearchViewSeeds(graph,offset,limit));assert.deepEqual(graphSearchViewSeeds(new FreshGraph()),{items:[],total:0});
});
test('complete-graph selection is explicit and ordinary selection cleanup retains its default',()=>{
  const p=new FreshmindPanel(undefined,{autoStart:false}),g=new FreshGraph();const a=new FreshNode('a','A'),b=new FreshNode('b','B'),edge=new FreshEdge(a,b,{id:'ab'});g.addNode(a);g.addNode(b);g.addEdge(edge);p.setGraphEltSet(g);p.getGES().addNode(a);
  try {
    assert.throws(()=>p.setSelectEdge(edge),/visible/);assert.throws(()=>p.setSelect(new FreshNode('foreign','Foreign'),{allowHidden:true}),/complete/);
    p.setSelectEdge(edge,{allowHidden:true});p.localityChanged();assert.equal(p.getSelection(),edge);assert.equal(p.getGES().contains(edge),false);
    p.setSelect(b,{allowHidden:true});p.localityChanged();assert.equal(p.getSelection(),b);
    p.setSelect(a);p.getGES().removeNode(a);p.localityChanged();assert.equal(p.getSelection(),null);assert.equal(g.nodeCount(),2);assert.equal(g.edgeCount(),1);
  } finally {p.destroy();}
});

test('a known compact-fingerprint collision does not make stale results valid seeds',()=>{
  const graph=new FreshGraph(),node=new FreshNode('d0','graph-586d7559');graph.addNode(node);const corpus=graphSearchCorpus(graph),query=createGraphQuery(graph,request);
  applyGraphSearchResults(graph,query,request,[{id:'d0',score:1,relevance:1,rank:1}],corpus);assert.equal(graphSearchViewSeeds(graph).total,1);
  node.setLabel('graph-8bc77086');const changed=graphSearchCorpus(graph);assert.equal(changed.fingerprint,corpus.fingerprint);assert.notEqual(changed.key,corpus.key);assert.equal(graphSearchViewSeeds(graph).total,0);
});

test('copied/imported records and changed accepted scores need a new verified application',()=>{
  const {graph,query,edges}=fixture(1),copy=new FreshGraph();
  for(const n of graph.getNodes())copy.addNode(new FreshNode(n.getID(),n.getLabel(),{type:n.getSemanticType(),data:n.getData()}));
  for(const e of graph.getEdges())copy.addEdge(new FreshEdge(copy.findNode(e.from.getID()),copy.findNode(e.to.getID()),{id:e.getID(),label:e.getLabel(),data:e.getData()}));
  assert.equal(graphSearchCorpus(copy).key,graphSearchCorpus(graph).key);assert.equal(graphSearchViewSeeds(copy).total,0);
  applyGraphSearchResults(copy,copy.findNode(query.getID()),request,[{id:'d0',score:1,relevance:1,rank:1}],graphSearchCorpus(copy));assert.equal(graphSearchViewSeeds(copy).total,1);
  const data=edges[0].getData();data.search.score=5;edges[0].setData(data);assert.equal(graphSearchViewSeeds(graph).total,0);
});
