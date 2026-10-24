import test from 'node:test';
import assert from 'node:assert/strict';
import {createSearchCorpus, LexicalSearchIndex} from 'fm4/ir';
import {SearchWorkerClient, SearchSession, SearchCancelledError} from 'fm4/ir/browser';
import {trainLda} from 'fm4/ir/topics';

const corpus=createSearchCorpus([
  {id:'a',label:'graph spring layout',type:'note',hint:'',tags:['layout']},
  {id:'b',label:'topic search model',type:'note',hint:'',tags:['search']}
]);
const request={engine:'lexical',kind:'terms',query:'graph'};
const options={topics:2,iterations:3,seed:7};
function transport(){
  const workers=[];
  const factory=()=>{
    const worker={onmessage:null,onerror:null,terminated:false,
      postMessage(job){this.job=job;},terminate(){this.terminated=true;},
      answer(data){this.onmessage?.({data});}};
    workers.push(worker);return worker;
  };
  return {workers,factory};
}
function answerTraining(worker){worker.answer({kind:'trained',model:trainLda(worker.job.corpus,worker.job.options)});}

test('standalone IR transport reports progress, cleans up workers and rejects failures',async()=>{
  const {workers,factory}=transport(),client=new SearchWorkerClient(factory),progress=[];
  const pending=client.run({kind:'train',corpus,options},p=>progress.push(p)),worker=workers.at(-1);
  const step={iteration:1,iterations:3};worker.answer({kind:'progress',progress:step});
  assert.equal(client.busy,true);assert.deepEqual(progress,[step]);
  answerTraining(worker);assert.equal((await pending).kind,'trained');
  assert.equal(client.busy,false);assert.equal(worker.terminated,true);assert.equal(worker.onmessage,null);assert.equal(worker.onerror,null);
  const failed=client.run({kind:'search',corpus,request,limit:5});
  workers.at(-1).onerror({message:'worker failed'});await assert.rejects(failed,/worker failed/);
  assert.equal(client.busy,false);assert.equal(workers.at(-1).terminated,true);
  const reported=client.run({kind:'search',corpus,request,limit:5});
  workers.at(-1).answer({kind:'error',message:'invalid query'});await assert.rejects(reported,/invalid query/);
  const badFactory=new SearchWorkerClient(()=>{throw new Error('factory failed');});
  await assert.rejects(badFactory.run({kind:'search',corpus,request,limit:5}),/factory failed/);
  const badPost=new SearchWorkerClient(()=>({...factory(),postMessage(){throw new Error('post failed');}}));
  await assert.rejects(badPost.run({kind:'search',corpus,request,limit:5}),/post failed/);
  assert.equal(badPost.busy,false);
  client.dispose();badFactory.dispose();badPost.dispose();
});

test('standalone IR supersession, cancellation and disposal reject work and ignore stale callbacks',async()=>{
  const {workers,factory}=transport(),client=new SearchWorkerClient(factory);
  const job={kind:'search',corpus,request,limit:5};
  const first=client.run(job),old=workers.at(-1),late=old.onmessage;
  const rejected=assert.rejects(first,SearchCancelledError),second=client.run(job);
  await rejected;assert.equal(old.terminated,true);
  late({data:{kind:'results',results:[]}});assert.equal(client.busy,true);
  const result=new LexicalSearchIndex(corpus).search('graph');workers.at(-1).answer({kind:'results',results:result});
  assert.deepEqual((await second).results,result);
  const third=client.run(job),cancelled=assert.rejects(third,SearchCancelledError);client.cancel();await cancelled;
  const fourth=client.run(job),disposed=assert.rejects(fourth,SearchCancelledError);client.dispose();await disposed;
  await assert.rejects(client.run(job),/disposed/);
});

test('standalone IR session owns its detached prototype model and invalidates changed corpora',async()=>{
  const {workers,factory}=transport(),session=new SearchSession(factory);
  const training=session.train(corpus,options);assert.equal(session.getState().busy,true);answerTraining(workers.at(-1));await training;
  assert.equal(session.getState().trained,true);assert.equal(session.getState().topics,2);
  session.getState().topicWords[0].push('external mutation');assert.ok(!session.getState().topicWords[0].includes('external mutation'));
  const semantic={engine:'lda',kind:'terms',query:'graph'};
  const search=session.search(corpus,semantic,5),worker=workers.at(-1);
  assert.equal(worker.job.model.corpus.key,corpus.key);worker.answer({kind:'results',results:[]});assert.deepEqual(await search,[]);
  const changed=createSearchCorpus([{id:'a',label:'different text',type:'note',hint:'',tags:[]}]);
  await assert.rejects(session.search(changed,semantic),/current corpus/);assert.equal(session.getState().trained,false);
  const tags=session.search(changed,{engine:'lda',kind:'tags',query:'layout'});
  assert.equal(workers.at(-1).job.model,undefined);workers.at(-1).answer({kind:'results',results:[]});await tags;
  session.dispose();await assert.rejects(session.train(corpus,options),/disposed/);
});

test('IR reset after a worker reply prevents model installation; mismatched training replies fail',async()=>{
  const {workers,factory}=transport(),session=new SearchSession(factory);
  const pending=session.train(corpus,options),cancelled=assert.rejects(pending,SearchCancelledError);
  answerTraining(workers.at(-1));session.reset();await cancelled;assert.equal(session.getState().trained,false);
  const wrong=session.train(corpus,options);
  const other=createSearchCorpus([{id:'other',label:'unrelated text',type:'note',hint:'',tags:[]}]);
  workers.at(-1).answer({kind:'trained',model:trainLda(other,options)});
  await assert.rejects(wrong,/does not match/);assert.equal(session.getState().trained,false);session.dispose();
});
