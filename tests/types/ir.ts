import {createSearchCorpus,LexicalSearchIndex} from 'fm4/ir';
import {validateSearchRequest} from 'fm4/ir/corpus';
import {parseSearchQuery} from 'fm4/ir/lexical';
import {trainLda,LdaSearchIndex} from 'fm4/ir/topics';
import type {SearchCorpus,SearchResult} from 'fm4/ir/core';

// A standalone document consumer: no graph, DOM or Freshmind types are needed.
const corpus:SearchCorpus=createSearchCorpus([{id:'article',type:'note',label:'Graph layout',hint:'Spring forces',tags:['visual']}]);
const results:SearchResult[]=new LexicalSearchIndex(corpus).search('graph AND layout');
validateSearchRequest({engine:'lexical',kind:'terms',query:'graph'});parseSearchQuery('hint:spring');
const model=trainLda(corpus,{topics:2,iterations:2,seed:7});new LdaSearchIndex(model).search('spring');
void results;
