import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createSearchCorpus} from 'fm4/ir/corpus';
import {CokusRandom,sampleCategorical,topicSimilarity,LdaGibbs,foldInLda,trainLda,trainLdaSteps,LdaSearchIndex} from 'fm4/ir/topics';
const reference=JSON.parse(readFileSync(new URL('fixtures/lda-java-reference.json',import.meta.url),'utf8'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('CokusRandom reproduces 10000 Java unsigned draws across buffer reloads',()=>{
  const r=new CokusRandom(reference.seed),values=Array.from({length:10000},()=>r.nextUnsignedInt());
  assert.deepEqual(values.slice(0,12),reference.first12);
  assert.equal(createHash('sha256').update(values.join('\n')+'\n').digest('hex'),reference.random10000Sha256);
  r.setSeed(4357);assert.equal(r.nextDouble(),reference.first12[0]/2**32);
  assert.equal(new CokusRandom(4357).nextInt(10),8);
  for(const n of [-1,1.5,2**32])assert.throws(()=>new CokusRandom(n));
  assert.throws(()=>r.nextInt(0));
});
test('serial Gibbs counts and fixed-phi query inference agree with the Java source',()=>{
  const g=new LdaGibbs(reference.trainingWords,3,{topics:3,alpha:.1,beta:.01,seed:reference.seed});g.step(reference.trainingIterations);
  const snapshot=g.snapshot();
  for(const key of ['documentTopicCounts','topicTermCounts','topicTotals','assignments'])assert.deepEqual(snapshot[key],reference[key],key);
  const before=structuredClone(snapshot.phi),q=foldInLda(snapshot.phi,reference.queryWords,.1,reference.queryIterations,reference.querySeed);
  const expected=reference.queryCounts[0].map(n=>(n+.1)/(reference.queryWords.length+.3));
  q.theta.forEach((p,k)=>close(p,expected[k]));close(q.perplexity,reference.perplexity);
  assert.deepEqual(snapshot.phi,before);
});
test('Gibbs snapshots conserve assignments/counts and normalized probabilities over incremental sweeps',()=>{
  const words=[[0,1,1,2],[],[2,3,3],[0,3]],g=new LdaGibbs(words,4,{topics:4,seed:20});
  for(let i=0;i<8;i++){
    const s=g.snapshot(),nmk=words.map(()=>Array(4).fill(0)),nkt=Array.from({length:4},()=>Array(4).fill(0));
    s.assignments.forEach((doc,m)=>doc.forEach((k,n)=>{nmk[m][k]++;nkt[k][words[m][n]]++;}));
    assert.deepEqual(nmk,s.documentTopicCounts);assert.deepEqual(nkt,s.topicTermCounts);
    assert.deepEqual(s.topicTotals,nkt.map(row=>row.reduce((a,b)=>a+b,0)));
    for(const row of [...s.theta,...s.phi]){close(row.reduce((a,b)=>a+b,0),1);assert.ok(row.every(p=>p>0&&Number.isFinite(p)));}
    close(s.theta[1][0],.25);s.documentTopicCounts[0][0]=999;assert.notEqual(g.snapshot().documentTopicCounts[0][0],999);g.step();
  }
  const replay=new LdaGibbs(words,4,{topics:4,seed:20});replay.step(8);assert.deepEqual(g.snapshot(),replay.snapshot());
});
test('LDA validates dimensions/priors, handles empty queries and uses true bounded Jensen–Shannon similarity',()=>{
  close(topicSimilarity([1,0],[1,0]),1);close(topicSimilarity([1,0],[0,1]),0);
  close(topicSimilarity([.5,.5],[1,0]),1-(.5*(.5*Math.log(2/3)+.5*Math.log(2))+.5*Math.log(4/3))/Math.LN2);
  for(const p of [[0,0],[-1,2],[NaN,1]])assert.throws(()=>topicSimilarity(p,[.5,.5]));
  assert.equal(sampleCategorical([0,1,0],0),1);assert.equal(sampleCategorical([1,2],.9999),1);
  for(const weights of [[],[0,0],[-1,2],[NaN]])assert.throws(()=>sampleCategorical(weights,.5));
  assert.throws(()=>sampleCategorical([1],1));
  for(const args of [[[[3]],3,{}],[[[0]],0,{}],[[[0]],3,{alpha:0}],[[[0]],3,{beta:Infinity}],[[[0]],3,{topics:257}],[[[0]],100000,{topics:256}]])assert.throws(()=>new LdaGibbs(...args));
  assert.deepEqual(foldInLda([[.5,.5],[.4,.6]],[],.1),{theta:[.5,.5],perplexity:null});
  assert.throws(()=>foldInLda([[0,1],[0,1]],[0],.1),/distribution/);
  assert.throws(()=>foldInLda([[1]],[1],.1));
});
test('LDA corpus models replay deterministically, preserve stable IDs and exclude empty/OOV retrieval',()=>{
  const corpus=createSearchCorpus([
    {id:'z',type:'paper',label:'apple orchard fruit',hint:'apple pear fruit orchard',tags:[]},
    {id:'a',type:'paper',label:'graph spring layout',hint:'graph layout spring force',tags:[]},
    {id:'b',type:'paper',label:'spring graph forces',hint:'layout graph spring force',tags:[]},
    {id:'e',type:'empty',label:'',hint:'',tags:[]}
  ]),options={topics:2,seed:40,iterations:80};
  const model=trainLda(corpus,options);assert.deepEqual(model,trainLda(corpus,options));
  const index=new LdaSearchIndex(model);assert.deepEqual(index.search('unknownword'),[]);assert.deepEqual(index.similar('e'),[]);assert.deepEqual(index.similar('missing'),[]);
  assert.equal(index.similar('a')[0].id,'b');assert.notEqual(index.search('graph')[0].id,'z');assert.ok(!index.search('graph').some(r=>r.id==='e'));
  assert.equal(index.topicWords(3).length,2);assert.equal(index.topicWords(3)[0].length,3);
  const detached=index.getModel();detached.phi[0][0]=99;assert.notEqual(index.getModel().phi[0][0],99);
  const invalid=structuredClone(model);invalid.documentIds.reverse();assert.throws(()=>new LdaSearchIndex(invalid));
  assert.throws(()=>trainLda(createSearchCorpus([])));
  const steps=trainLdaSteps(corpus,{...options,iterations:2});assert.equal(steps.next().value.iteration,0);assert.equal(steps.next().value.iteration,1);assert.equal(steps.next().value.iteration,2);assert.equal(steps.next().done,true);
});
