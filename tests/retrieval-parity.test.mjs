import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createSearchCorpus,validateSearchRequest} from 'fm4/ir/corpus';
import {LexicalSearchIndex,LITERAL_SEARCH_BACKEND} from 'fm4/ir/lexical';
import {LdaSimilarities,LdaQueryClient,LdaSearchIndex,symmetricKlDistance,posterior,LDA_MODEL_VERSION,trainLda} from 'fm4/ir/topics';
import {FreshGraph,FreshNode,FreshmindDocument} from 'fm4/fm/core';
import {graphSearchCorpus,createGraphQuery,applyGraphSearchResults,rejectGraphSearchResult,searchResultMetadata} from 'fm4/fm/ir';
import {parseDocument,serializeDocument} from 'fm4/fm/io';
import {TypeRegistry,freshmind2014Configuration} from 'fm4/fm/config/core';

const reference=JSON.parse(readFileSync(new URL('fixtures/fm2014-retrieval.json',import.meta.url),'utf8'));
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);
const corpus=createSearchCorpus(['alpha beta','beta gamma','gamma delta','alpha delta'].map((label,n)=>({id:`d${n}`,type:'paper',label,hint:'',tags:[]})));
const model=()=>({version:LDA_MODEL_VERSION,corpus,options:{topics:3,alpha:.1,beta:.01,iterations:0,seed:4357},vocabulary:['alpha','beta','gamma','delta'],documentIds:corpus.documents.map(d=>d.id),lengths:[2,2,2,2],theta:structuredClone(reference.theta),phi:structuredClone(reference.phi)});

test('FM minimum document frequency filters semantic vocabulary without changing the literal corpus or IDs',()=>{
  const input=createSearchCorpus([{id:'a',type:'p',label:'alpha rare',hint:'',tags:[]},{id:'b',type:'p',label:'alpha beta',hint:'',tags:[]}]);
  const trained=trainLda(input,{topics:2,iterations:3,minDocumentFrequency:2});
  assert.deepEqual(trained.vocabulary,['alpha']);assert.deepEqual(trained.lengths,[1,1]);assert.deepEqual(trained.documentIds,['a','b']);
  assert.equal(new LexicalSearchIndex(input).search('rare')[0].id,'a');assert.equal(trained.options.minDocumentFrequency,2);
  assert.throws(()=>trainLda(input,{minDocumentFrequency:0}));assert.throws(()=>trainLda(input,{minDocumentFrequency:3}),/No searchable words/);
});

test('all six LDA retrieval relationships agree with the owner-authorized Dirichlet binary on synthetic matrices',()=>{
  const s=new LdaSimilarities(reference.phi,reference.theta);
  const cases={queryDocsDistance:s.queryDocs(reference.query),queryDocsPredictive:s.queryDocs(reference.query,'predictive'),
    queryTermsDistance:s.queryTerms(reference.query),queryTermsPredictive:s.queryTerms(reference.query,'predictive'),
    docDocsDistance:s.docDocs(0),docTermsDistance:s.docTerms(0),termDocsDistance:s.termDocs(0),termTermsDistance:s.termTerms(0)};
  for(const [name,actual] of Object.entries(cases)){
    assert.deepEqual(actual.map(r=>r.index),reference[name].map(r=>r.index),name);
    actual.forEach((result,n)=>close(result.value,reference[name][n].value));
  }
  posterior(reference.theta).forEach((row,k)=>row.forEach((p,m)=>close(p,reference.posteriorTheta[k][m])));
});

test('symmetric KL is explicitly a distance in bits; predictive values follow Bayes with the correct query direction',()=>{
  close(symmetricKlDistance([.75,.25],[.25,.75]),.5*Math.log2(3));
  close(symmetricKlDistance([.4,.6],[.4,.6]),0);
  assert.equal(symmetricKlDistance([1,0],[0,1]),Infinity);
  const phi=[[.8,.2],[.1,.9]],theta=[[.9,.1],[.2,.8],[.4,.6]],query=[.7,.3];
  const s=new LdaSimilarities(phi,theta),total=[1.5,1.5];
  for(const row of s.queryDocs(query,'predictive'))close(row.value,query[0]*theta[row.index][0]/total[0]+query[1]*theta[row.index][1]/total[1]);
  const docs=s.docDocs(0,'predictive');assert.ok(!docs.some(r=>r.index===0));
  for(const row of docs)close(row.value,theta[0][0]*theta[row.index][0]/total[0]+theta[0][1]*theta[row.index][1]/total[1]);
  for(const row of s.termTerms(0,'predictive'))assert.notEqual(row.index,0);
  const exact=s.queryDocs(theta[0])[0];assert.equal(exact.value,0);
  assert.deepEqual(s.queryDocs(theta[0],'symmetric-kl',20,0),[]);
  assert.ok(!s.queryDocs(query,'symmetric-kl',20,s.queryDocs(query)[0].value).length);
});

test('FM2014 client maps rows to stable IDs, preserves fixed training state and retains the prototype API for historical replay',()=>{
  const input=model(),before=structuredClone(input),client=new LdaQueryClient(input,{maxDistance:100});
  assert.deepEqual(client.getWords('ALPHA alpha outofvocabulary'),[0,0]);
  const topics=client.getTopics('alpha'),expected=client.getSimilarities().queryDocs(topics,'symmetric-kl',5,100);
  const result=client.getDocResults('alpha');assert.deepEqual(result.map(r=>r.id),expected.map(r=>`d${r.index}`));
  result.forEach((r,n)=>{close(r.value,expected[n].value);assert.equal(r.metric,'symmetric-kl');assert.equal(r.backend,'fm2014-lda-1');assert.ok(!('index' in r));});
  assert.deepEqual(client.getDocResults('alpha'),result);assert.deepEqual(input,before);assert.deepEqual(client.getModel(),before);
  assert.deepEqual(client.getDocResults('unknownword'),[]);assert.ok(!client.getDocSimilarities('d0').some(r=>r.id==='d0'));
  assert.ok(client.getTermResults('alpha').every(r=>input.vocabulary.includes(r.term)));
  assert.ok(new LdaSearchIndex(input).search('alpha').every(r=>r.metric===undefined));
  const predictive=new LdaQueryClient(input,{metric:'predictive'});assert.ok(predictive.search('alpha').every(r=>r.value===r.score));
  assert.throws(()=>new LdaQueryClient(input,{metric:'unknown'}));assert.throws(()=>new LdaQueryClient(input,{maxDistance:NaN}));
  assert.throws(()=>client.getTopics('a'.repeat(4097)));assert.throws(()=>client.getDocResults('alpha',-1));
});

test('empty document exclusion happens before semantic result limiting, including corpora over 1000 rows',()=>{
  const input=model(),documents=Array.from({length:1002},(_,n)=>({id:String(n).padStart(5,'0'),type:'paper',label:n===1001?'alpha':'',hint:'',tags:[]}));
  input.corpus=createSearchCorpus(documents);input.documentIds=input.corpus.documents.map(d=>d.id);
  input.lengths=documents.map(d=>d.label?1:0);input.theta=documents.map(()=>[.7,.2,.1]);
  const client=new LdaQueryClient(input,{maxDistance:100});assert.deepEqual(client.search('alpha',1).map(r=>r.id),['01001']);
});

test('elasticlunr keeps Unicode and opaque graph IDs independent of engine object keys',()=>{
  const ids=['__proto__','constructor','toString','42','é'];
  const c=createSearchCorpus(ids.map(id=>({id,type:'paper',label:'ＧＲＡＰＨ naïve αλφα running',hint:'private-canary',tags:['Visual Search']})));
  const before=structuredClone(c),i=new LexicalSearchIndex(c);
  assert.deepEqual(i.search('graph').map(r=>r.id),[...ids].sort());
  assert.equal(i.search('label:αλφα').length,ids.length);assert.equal(i.search('run').length,0);assert.equal(i.search('running').length,ids.length);
  assert.equal(i.search('id:constructor')[0].id,'constructor');assert.ok(i.search('graph').every(r=>r.backend===LITERAL_SEARCH_BACKEND));
  assert.ok(!i.similar('__proto__').some(r=>r.id==='__proto__'));assert.deepEqual(c,before);
});

test('semantic settings/raw values persist with graph results and scope rejection feedback; bad diagnostics fail atomically',()=>{
  const graph=new FreshGraph();for(const doc of corpus.documents)graph.addNode(new FreshNode(doc.id,doc.label));
  const snapshot=graphSearchCorpus(graph),request={engine:'lda',kind:'terms',query:'alpha',metric:'predictive'},query=createGraphQuery(graph,request);
  const results=[{id:'d0',score:.4,relevance:1,rank:1,metric:'predictive',value:.4,backend:'fm2014-lda-1'}];
  const edge=applyGraphSearchResults(graph,query,request,results,snapshot)[0];assert.equal(searchResultMetadata(edge).value,.4);
  const before=[...graph.getEdges()];assert.throws(()=>applyGraphSearchResults(graph,query,request,[{...results[0],value:NaN}],snapshot));assert.deepEqual([...graph.getEdges()],before);
  const loaded=parseDocument(serializeDocument(new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph)));
  assert.deepEqual([...loaded.graph.getEdges()].map(searchResultMetadata),[...graph.getEdges()].map(searchResultMetadata));
  rejectGraphSearchResult(graph,edge);assert.equal(applyGraphSearchResults(graph,query,request,results,snapshot).length,0);
  const other={...request,metric:'symmetric-kl'};assert.equal(applyGraphSearchResults(graph,query,other,[{...results[0],metric:'symmetric-kl',value:.1}],snapshot).length,1);
  for(const invalid of [{...request,metric:'bad'},{...request,maxDistance:-1},{...request,maxDistance:Infinity},{...request,engine:'lexical'}])assert.throws(()=>validateSearchRequest(invalid));
});


test('the npm engine adapter runs as strict ESM without creating or replacing a global lunr alias',()=>{
  const runtime=new URL('../dist/ir/lexical/elasticlunr-runtime.js',import.meta.url).href;
  for(const sentinel of [false,true]){
    const script=`import assert from 'node:assert/strict';
      ${sentinel?'globalThis.lunr={sentinel:true};':''}
      globalThis.define=()=>{throw new Error('Unexpected ambient AMD registration');};globalThis.define.amd={};
      const before=globalThis.lunr;
      const {default:engine}=await import(${JSON.stringify(runtime)});
      assert.equal(globalThis.lunr,before);
      const index=engine();index.addField('text');index.addDoc({id:'a',text:'graph'});
      assert.equal(index.search('graph')[0].ref,'a');`;
    execFileSync(process.execPath,['--input-type=module','-e',script]);
  }
});
