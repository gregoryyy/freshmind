import test from 'node:test';
import assert from 'node:assert/strict';
import {FreshGraph,FreshNode,FreshEdge,FreshmindDocument} from 'fm4/fm/model';
import {TypeRegistry,freshmind2014Configuration} from 'fm4/fm/config/core';
import {parseDocument,serializeDocument} from 'fm4/fm/io';
import {createSearchCorpus,LexicalSearchIndex,parseSearchQuery,searchTokens} from 'fm4/ir';
import {graphSearchCorpus,annotationSearchText,
  createGraphQuery,createGraphQueryDraft,applyGraphSearchResults,rejectGraphSearchResult,searchResultMetadata} from 'fm4/fm/ir';
const docs=[
  {id:'a',type:'Paper',label:'Graph layout',hint:'springs in the graph',tags:['Visual Search','layout']},
  {id:'b',type:'paper',label:'Topic models',hint:'probabilistic topic search',tags:['search']},
  {id:'c',type:'person',label:'Graph search',hint:'graph of the layout',tags:['Visual Search']},
  {id:'d',type:'empty',label:'',hint:'',tags:[]}
];
const index=()=>new LexicalSearchIndex(createSearchCorpus(docs));
const ids=r=>r.map(r=>r.id).sort();
test('empty query drafts preserve metadata/settings in YAML and never enter the retrieval corpus',()=>{
  const graph=new FreshGraph(),context=new FreshNode('context','graph');graph.addNode(context);
  const before=graphSearchCorpus(graph),q=createGraphQueryDraft(graph,'lda',context,{metric:'symmetric-kl',maxDistance:.6});
  assert.deepEqual(q.getData().search,{version:1,role:'query',draft:true,request:{engine:'lda',kind:'terms',query:'',metric:'symmetric-kl',maxDistance:.6}});
  assert.equal(graphSearchCorpus(graph).key,before.key);
  const document=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph),loaded=parseDocument(serializeDocument(document));
  assert.deepEqual(loaded.graph.findNode(q.getID()).getData(),q.getData());assert.equal(loaded.graph.edgeCount(),1);
  assert.equal(graphSearchCorpus(loaded.graph).key,before.key);
  assert.throws(()=>createGraphQueryDraft(graph,'lexical',context,{metric:'predictive'}),/metric/);assert.equal(graph.nodeCount(),2);
});
test('search parser handles Boolean precedence, adjacency, fields, phrases and bounded errors',()=>{
  const i=index();
  assert.deepEqual(ids(i.search('topic OR graph AND layout')),['a','b','c']);
  assert.deepEqual(ids(i.search('(topic OR graph) AND label:search')),['c']);
  assert.deepEqual(ids(i.search('graph NOT id:a')),['c']);
  assert.deepEqual(i.search('NOT NOT graph'),i.search('graph'));
  assert.deepEqual(ids(i.search('NOT (graph OR NOT topic)')),['b']);
  assert.deepEqual(ids(i.search('graph topic')),['a','b','c']);
  assert.deepEqual(ids(i.search('hint:"of the layout"')),['c']);
  assert.deepEqual(ids(i.search('hint:"in the layout"')),[]);
  assert.deepEqual(ids(i.search('tag:"VISUAL SEARCH" AND type:paper')),['a']);
  assert.deepEqual(ids(i.search('id:A')),[]);
  assert.deepEqual(ids(i.search('label:gra*')),['a','c']);
  for(const q of ['graph AND','(graph','graph)','foo:bar','graph~2','[a TO z]','gr?ph','*','tag:gra*','"bad','+'.repeat(2),'('.repeat(33)+'x'+')'.repeat(33)])assert.throws(()=>parseSearchQuery(q),undefined,q);
  assert.throws(()=>parseSearchQuery('a'.repeat(4097)));
  assert.deepEqual(i.search('NOT graph'),[]);assert.deepEqual(i.search('the'),[]);assert.deepEqual(i.search(''),[]);
  assert.throws(()=>i.search('graph',-1));
  const many=createSearchCorpus(Array.from({length:257},(_,n)=>({id:String(n),type:'t',label:`prefix${n}`,hint:'',tags:[]})));
  assert.throws(()=>new LexicalSearchIndex(many).search('prefix*'),/256/);
});
test('elasticlunr TF–IDF and label/content similarity agree with hand calculations; ties use stable IDs',()=>{
  const corpus=createSearchCorpus([{id:'b',type:'t',label:'alpha alpha beta',hint:'',tags:[]},{id:'a',type:'t',label:'alpha beta',hint:'',tags:[]},{id:'c',type:'t',label:'gamma',hint:'',tags:[]}]);
  const i=new LexicalSearchIndex(corpus),idf=1+Math.log(3/3),r=i.search('alpha');
  assert.equal(r[0].id,'b');assert.ok(Math.abs(r[0].score-Math.sqrt(2)*idf/Math.sqrt(3))<1e-12);
  assert.ok(Math.abs(r[1].score-idf/Math.sqrt(2))<1e-12);
  const similar=i.similar('a');assert.deepEqual(similar.map(r=>r.id),['b']);
  assert.ok(Math.abs(similar[0].score-2*(Math.sqrt(2)+1)*idf/Math.sqrt(3))<1e-12);
  assert.equal(similar[0].backend,'elasticlunr-0.9.5');
  assert.deepEqual(ids(i.tags([])),[]);assert.deepEqual(i.similar('unknown'),[]);
  const tie=new LexicalSearchIndex(createSearchCorpus(['z','a'].map(id=>({id,type:'t',label:'same',hint:'',tags:[]}))));
  assert.deepEqual(tie.search('same').map(r=>r.id),['a','z']);
  const detached=i.getCorpus();detached.documents[0].label='changed';assert.equal(i.getCorpus().documents[0].label,'alpha beta');
});
test('corpus extraction is complete, deterministic, Unicode-aware and excludes generated queries',()=>{
  const graph=new FreshGraph(),node=new FreshNode('é','ＧＲＡＰＨ',{annotation:{format:'html',text:'<p>Topic&nbsp;&#115;earch</p><script>secret</script><style>hidden</style><!--ignored-->'},data:{tags:['VISUAL','visual']}});graph.addNode(node);
  assert.equal(annotationSearchText(node).trim(),'Topic search');
  assert.deepEqual(searchTokens('Ｔhe GRÁPH naïve 2026'),['gráph','naïve','2026']);
  const before=graphSearchCorpus(graph);node.x=200;node.setWeight(20);
  createGraphQuery(graph,{engine:'lexical',kind:'terms',query:'graph'},node);
  assert.equal(graphSearchCorpus(graph).key,before.key);
  assert.deepEqual(before.documents[0].tags,['visual']);
  node.setLabel('new text');assert.notEqual(graphSearchCorpus(graph).key,before.key);
  assert.throws(()=>createSearchCorpus([docs[0],docs[0]]),/unique/);
});
test('graph result ownership, stale batches, rejection and YAML feedback preserve manual/context edges',()=>{
  const graph=new FreshGraph();for(const d of docs)graph.addNode(new FreshNode(d.id,d.label,{type:d.type,annotation:{format:'text',text:d.hint},data:{tags:d.tags}}));
  const manual=graph.addEdge(new FreshEdge(graph.findNode('a'),graph.findNode('b'),{label:'lexical result'}));
  const request={engine:'lexical',kind:'terms',query:'graph'},corpus=graphSearchCorpus(graph),i=new LexicalSearchIndex(corpus),q=createGraphQuery(graph,request,graph.findNode('b'));
  const context=[...graph.getEdges()].find(e=>e!==manual);
  const results=i.search('graph');let edges=applyGraphSearchResults(graph,q,request,results,corpus);
  assert.equal(edges.length,2);assert.equal(graphSearchCorpus(graph).key,corpus.key);
  assert.equal(context.getLabel(),'');assert.equal(context.getVisual().style.stroke.dash,'dashed');
  for(const edge of edges){
    const data=searchResultMetadata(edge),style=edge.getVisual().style;
    assert.equal(edge.getLabel(),`#${data.rank}`);assert.equal(style.label.color,style.stroke.color);
    assert.equal(data.score,results.find(r=>r.id===edge.to.getID()).score);
  }
  assert.equal(searchResultMetadata(manual),null);
  assert.throws(()=>applyGraphSearchResults(graph,q,request,[...results,{...results[0],id:'missing'}],corpus));
  assert.ok(graph.contains(edges[0]));
  rejectGraphSearchResult(graph,edges[0]);assert.equal(graph.contains(edges[0]),false);
  edges=applyGraphSearchResults(graph,q,request,results,corpus);assert.equal(edges.length,1);
  assert.ok(graph.contains(manual));assert.ok(graph.contains(context));
  const doc=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph),loaded=parseDocument(serializeDocument(doc));
  assert.deepEqual(loaded.graph.findNode(q.getID()).getData(),q.getData());
  assert.equal([...loaded.graph.getEdges()].filter(e=>searchResultMetadata(e)).length,1);
  graph.findNode('b').setHint('changed');assert.throws(()=>applyGraphSearchResults(graph,q,request,results,corpus),/changed/);
  assert.ok(graph.contains(edges[0]));
  assert.throws(()=>rejectGraphSearchResult(graph,manual),/Select/);
});
test('a query engine switch clears prior owned results while content similarity retains other engines',()=>{
  const graph=new FreshGraph();for(const d of docs)graph.addNode(new FreshNode(d.id,d.label));const corpus=graphSearchCorpus(graph),source=graph.findNode('a');
  const lexical={engine:'lexical',kind:'terms',query:'graph'},lda={engine:'lda',kind:'terms',query:'graph'},result=[{id:'b',score:.8,relevance:1,rank:1}];
  const q=createGraphQuery(graph,lexical,source);const first=applyGraphSearchResults(graph,q,lexical,result,corpus);applyGraphSearchResults(graph,q,lda,result,corpus);
  assert.ok(!graph.contains(first[0]));assert.equal([...graph.getEdges()].filter(e=>searchResultMetadata(e)).length,1);
  applyGraphSearchResults(graph,source,{...lexical,kind:'similarity',query:'a'},result,corpus);applyGraphSearchResults(graph,source,{...lda,kind:'similarity',query:'a'},result,corpus);
  assert.equal([...graph.getEdges()].filter(e=>e.from===source&&searchResultMetadata(e)).length,2);
});
