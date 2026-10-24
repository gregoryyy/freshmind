import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {searchExample,searchCases,searchThemes} from '../scripts/search-example.mjs';
import {retrievalMetrics} from '../scripts/search-experiment.mjs';
import {graphSearchCorpus} from 'fm4/fm/ir';
import {LexicalSearchIndex} from './fixtures/lexical-v1.mjs';
import {LdaSearchIndex} from 'fm4/ir/topics';
import {parseDocument,serializeDocument} from 'fm4/fm/io';
test('fictional search fixture preserves native data, theme judgments, exact tags and semantic context',()=>{
  const doc=searchExample(),native=readFileSync(new URL('../examples/search/topic-library.fm.yaml',import.meta.url),'utf8');
  assert.equal(serializeDocument(doc),native);const loaded=parseDocument(native),corpus=graphSearchCorpus(loaded.graph),lexical=new LexicalSearchIndex(corpus);
  assert.equal(loaded.graph.nodeCount(),24);assert.equal(loaded.graph.edgeCount(),28);assert.equal(loaded.types.getDiagnostics().length,0);
  assert.match(loaded.data.provenance,/fictional/);assert.equal(searchCases.length,9);
  for(const theme of searchThemes){const results=lexical.tags([theme.tag],100);assert.equal(results.length,theme.id==='ecology'?7:9);assert.ok(results.some(r=>r.id===theme.author));}
  for(const q of searchCases){assert.ok(q.relevant.every(id=>loaded.graph.findNode(id)));if(q.kind==='similarity')assert.ok(!q.relevant.includes(q.query));}
  assert.ok(![...loaded.graph.getNodes()].some(n=>n.getURL()));
});
test('recorded retrieval metrics reproduce from saved models and explicit relevance judgments',()=>{
  const record=JSON.parse(readFileSync(new URL('../docs/experiments/search/results.json',import.meta.url),'utf8'));
  assert.equal(record.runs.length,54);assert.equal(record.models.length,5);assert.equal(record.tags.length,3);
  assert.equal(createHash('sha256').update(record.corpus.key).digest('hex'),record.corpusSha256);
  assert.equal(record.corpus.key,graphSearchCorpus(searchExample().graph).key);
  assert.deepEqual(retrievalMetrics([{id:'a'},{id:'x'}],['a','b'],5),{precision:.2,recall:.5,reciprocalRank:1,hits:1,returned:2,relevant:2});
  assert.deepEqual(retrievalMetrics([],[],5),{precision:0,recall:0,reciprocalRank:0,hits:0,returned:0,relevant:0});
  const indexes=new Map(record.models.map(model=>[model.options.seed,new LdaSearchIndex({...model,corpus:record.corpus})])),lexical=new LexicalSearchIndex(record.corpus);
  for(const run of record.runs){const query=record.cases.find(q=>q.id===run.case),index=run.engine==='lexical'?lexical:indexes.get(run.seed);
    const results=query.kind==='terms'?index.search(query.query,5):index.similar(query.query,5);assert.deepEqual(results,run.results);assert.deepEqual(retrievalMetrics(results,query.relevant,5),run.metrics);
    assert.ok(run.results.every(r=>Number.isFinite(r.score)&&r.relevance>=0&&r.relevance<=1));
  }
});
