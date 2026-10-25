import test from 'node:test';
import assert from 'node:assert/strict';
import {FreshmindPanel,GraphSearchController} from 'fm4/fm/browser';
import {FreshNode,FreshGraph,FreshEdge} from 'fm4/fm/model';
import {graphSearchCorpus,searchResultMetadata} from 'fm4/fm/ir';
import {LexicalSearchIndex} from 'fm4/ir/lexical';
import {trainLda} from 'fm4/ir/topics';
function fixture(options={}){
  const panel=new FreshmindPanel(),a=panel.addNode(new FreshNode('a','graph layout')),b=panel.addNode(new FreshNode('b','graph spring')),c=panel.addNode(new FreshNode('c','topic model'));
  const manual=panel.addEdge(new FreshEdge(a,c,{label:'manual'})),workers=[];
  const controller=new GraphSearchController(panel,()=>{const w={onmessage:null,onerror:null,terminated:false,postMessage(job){this.job=job;},terminate(){this.terminated=true;},answer(data){this.onmessage?.({data});}};workers.push(w);return w;},options);
  return {panel,a,b,c,manual,controller,workers};
}
const request={engine:'lexical',kind:'terms',query:'graph'};
test('opt-in search RFC follows successful queries and similarity, retaining settings and rejecting late focus changes',async()=>{
  const {panel,controller,a,workers}=fixture({reinforceResults:true});
  panel.getRfc().configure({radialLength:180,coordinateWeights:{x:.25,y:1}});panel.getRfc().setFocus(a);
  const settings=panel.getRfc().getState().settings;
  let pending=controller.query(request,5,a),worker=workers.at(-1);
  worker.answer({kind:'results',results:new LexicalSearchIndex(worker.job.corpus).search('graph')});
  const edges=await pending,q=edges[0].from;
  assert.equal(panel.getRfc().getState().focusId,q.getID());assert.deepEqual(panel.getRfc().getState().settings,settings);
  assert.ok(panel.getRfc().getState().branchIds.includes('b'));
  pending=controller.query({...request,kind:'similarity',query:'a'},5,a);worker=workers.at(-1);
  worker.answer({kind:'results',results:new LexicalSearchIndex(worker.job.corpus).similar('a')});await pending;
  assert.equal(panel.getRfc().getState().focusId,'a');
  pending=controller.query({...request,query:'missing'},5,q);worker=workers.at(-1);worker.answer({kind:'results',results:[]});await pending;
  assert.equal(panel.getRfc().getState().focusId,'a');
  pending=controller.query(request,5,q);const rejected=assert.rejects(pending,/cancelled/);worker=workers.at(-1);const late=worker.onmessage;
  controller.cancel();await rejected;late({data:{kind:'results',results:[]}});assert.equal(panel.getRfc().getState().focusId,'a');
  controller.dispose();panel.destroy();
});
test('query shortcuts can create a visible empty draft before retrieval without changing the content corpus',()=>{
  const {controller,panel,a,workers,manual}=fixture();panel.setSelect(a);
  const corpus=graphSearchCorpus(panel.getCompleteEltSet()),q=controller.createQuery('lexical');
  assert.equal(panel.getSelection(),q);assert.equal(q.getSemanticType(),'lucenequery');assert.equal(q.getData().search.draft,true);
  assert.equal(q.getData().search.request.query,'');assert.equal(panel.getGES().contains(q),true);
  assert.equal(graphSearchCorpus(panel.getCompleteEltSet()).key,corpus.key);assert.equal(workers.length,0);
  const context=[...q.getEdges()][0];assert.equal(context.from,a);assert.equal(context.to,q);assert.equal(context.getData().search.role,'context');
  const before=structuredClone(q.getData());assert.throws(()=>controller.submitQuery(q,{...request,query:''}),/Invalid/);assert.deepEqual(q.getData(),before);
  assert.throws(()=>controller.createQuery('unknown'),/engine/);assert.equal(panel.getNodeCount(),4);assert.ok(panel.getCompleteEltSet().contains(manual));
  controller.dispose();panel.destroy();
});
test('committed query text searches the same node, preserves context/manual links, and survives engine failure',async()=>{
  const {controller,panel,a,workers,manual}=fixture(),q=controller.createQuery('lexical',a);
  const pending=controller.submitQuery(q,request),w=workers.at(-1);
  assert.equal(q.getLabel(),'[graph]');assert.equal(q.getData().search.draft,false);
  w.answer({kind:'results',results:new LexicalSearchIndex(w.job.corpus).search('graph')});const edges=await pending;
  assert.equal(edges.length,2);assert.ok(edges.every(e=>e.from===q));assert.equal(panel.getNodeCount(),4);
  const again=controller.submitQuery(q,{...request,query:'topic'}),w2=workers.at(-1);w2.answer({kind:'results',results:new LexicalSearchIndex(w2.job.corpus).search('topic')});
  const replacement=await again;assert.equal(replacement.length,1);assert.equal(replacement[0].to.getID(),'c');
  assert.ok(edges.every(e=>!panel.getCompleteEltSet().contains(e)));assert.ok(panel.getCompleteEltSet().contains(manual));
  const semantic=controller.createQuery('lda',a);await assert.rejects(controller.submitQuery(semantic,{engine:'lda',kind:'terms',query:'topic'}),/Train/);
  assert.equal(semantic.getLabel(),'[topic]');assert.ok(panel.getCompleteEltSet().contains(semantic));assert.equal(semantic.getData().search.request.query,'topic');
  controller.dispose();panel.destroy();
});
test('deleting a query cancels its pending job, returns to context, and never removes content or accepts late replies',async()=>{
  const {controller,panel,a,workers,manual}=fixture(),q=controller.createQuery('lexical',a);
  const pending=controller.submitQuery(q,request),rejected=assert.rejects(pending,/cancelled/),w=workers.at(-1),late=w.onmessage;
  assert.equal(panel.getInteractionMode(),'navigate');assert.equal(panel.getNavigation().handleKey({key:'Backspace',ctrlKey:true}),true);
  await rejected;assert.ok(w.terminated);assert.equal(controller.getState().busy,false);assert.equal(panel.getSelect(),a);
  late({data:{kind:'results',results:[{id:'b',score:1,relevance:1,rank:1}]}});
  assert.equal(panel.getNodeCount(),3);assert.equal(panel.getEdgeCount(),1);assert.ok(panel.getCompleteEltSet().contains(manual));
  panel.getNavigation().handleKey({key:'Backspace',ctrlKey:true,repeat:true});assert.equal(panel.getNodeCount(),3);
  panel.getNavigation().handleKey({key:'Delete'});assert.equal(panel.getNodeCount(),3); // Navigate gate for content.
  panel.setInteractionMode('edit');panel.setSelectEdge(manual);panel.getNavigation().handleKey({key:'Delete',ctrlKey:true});
  assert.equal(panel.getNodeCount(),3);assert.equal(panel.getEdgeCount(),0);assert.equal(panel.getSelect(),a);
  controller.dispose();panel.destroy();
});
test('cancelling after a worker reply clears UI status and prevents graph mutations',async()=>{
  const {controller,panel,a,workers}=fixture();
  const pending=controller.query(request,5,a),cancelled=assert.rejects(pending,/cancelled/);
  workers.at(-1).answer({kind:'results',results:new LexicalSearchIndex(workers.at(-1).job.corpus).search('graph')});
  controller.cancel();await cancelled;
  assert.equal(controller.getState().busy,false);assert.equal(panel.getNodeCount(),3);
  assert.equal([...panel.getCompleteEltSet().getEdges()].filter(e=>searchResultMetadata(e)).length,0);
  controller.dispose();panel.destroy();
});
test('browser controller reconciles visible locality, preserves manual relations and repeated-query feedback',async()=>{
  const f=fixture(),{controller,panel,a,manual,workers}=f;panel.setSelect(a);await panel.setLocale(a,0);panel.getRfc().setFocus(a);panel.setHyperbolic(47);
  const pending=controller.query(request,5,a),w=workers.at(-1);w.answer({kind:'results',results:new LexicalSearchIndex(w.job.corpus).search('graph')});const edges=await pending;
  assert.equal(edges.length,2);assert.equal(panel.getNodeCount(),4);assert.equal(panel.visibleNodeCount(),3);assert.equal(panel.getHyperbolic(),47);assert.equal(panel.getRfc().getState().centers[0].focusId,'a');
  const q=edges[0].from;assert.ok(panel.getGES().contains(edges[0]));panel.setSelectEdge(edges[0]);controller.reject();assert.equal(panel.getGES().contains(edges[0]),false);
  const again=controller.query(request,5,q),w2=workers.at(-1);w2.answer({kind:'results',results:new LexicalSearchIndex(w2.job.corpus).search('graph')});assert.equal((await again).length,1);
  assert.equal(panel.getNodeCount(),4);assert.ok(panel.getCompleteEltSet().contains(manual));
  assert.equal([...panel.getCompleteEltSet().getEdges()].filter(e=>searchResultMetadata(e)).length,1);
  controller.dispose();panel.destroy();
});
test('worker cancellation, new jobs, graph replacement and disposal reject pending work and ignore late callbacks',async()=>{
  const {controller,panel,a,workers}=fixture();
  const first=controller.query(request,5,a),old=workers.at(-1),late=old.onmessage;const rejection=assert.rejects(first,/cancelled/);
  const second=controller.query(request,5,a),fresh=workers.at(-1);await rejection;assert.ok(old.terminated);late({data:{kind:'results',results:[]}});assert.equal(controller.getState().busy,true);
  const replace=assert.rejects(second,/cancelled/);panel.setGraphEltSet(new FreshGraph());await replace;assert.ok(fresh.terminated);assert.equal(controller.getState().trained,false);
  const training=controller.train(),last=workers.at(-1),disposed=assert.rejects(training,/cancelled/);controller.dispose();await disposed;assert.ok(last.terminated);
  await assert.rejects(controller.train(),/disposed/);panel.destroy();
});
test('edited corpus, deleted sources and worker failures cannot attach results; model edits require retraining',async()=>{
  const {controller,panel,a,workers}=fixture();
  let promise=controller.query(request,5,a),w=workers.at(-1);a.setHint('edit during query');w.answer({kind:'results',results:[]});await assert.rejects(promise,/changed/);assert.equal(panel.getNodeCount(),3);
  promise=controller.train({topics:2,iterations:2});w=workers.at(-1);w.answer({kind:'trained',model:trainLda(w.job.corpus,w.job.options)});await promise;assert.equal(controller.getState().trained,true);
  a.setLabel('edited graph');await assert.rejects(controller.query({engine:'lda',kind:'terms',query:'graph'},5,a),/Train/);assert.equal(controller.getState().trained,false);
  promise=controller.query(request,5,a);w=workers.at(-1);panel.deleteNode(a);w.answer({kind:'results',results:[]});await assert.rejects(promise,/changed/);
  promise=controller.query(request);w=workers.at(-1);w.onerror({message:'test failure'});await assert.rejects(promise,/test failure/);assert.ok(w.terminated);assert.equal(controller.getState().busy,false);
  assert.equal(graphSearchCorpus(panel.getCompleteEltSet()).documents.length,2);controller.dispose();panel.destroy();
});
test('editing a generated query during worker execution preserves the edit and existing results',async()=>{
  const {controller,panel,a,workers}=fixture();
  let pending=controller.query(request,5,a),w=workers.at(-1);w.answer({kind:'results',results:new LexicalSearchIndex(w.job.corpus).search('graph')});const edges=await pending,q=edges[0].from;
  pending=controller.query(request,5,q);w=workers.at(-1);q.setLabel('edited query');w.answer({kind:'results',results:[]});await assert.rejects(pending,/Query node changed/);
  assert.equal(q.getLabel(),'edited query');assert.ok(panel.getCompleteEltSet().contains(edges[0]));controller.dispose();panel.destroy();
});

test('literal indexing checks the current snapshot without adding graph items and rejects text changes',async()=>{
  const {controller,panel,a,workers}=fixture();panel.setSelect(a);
  let pending=controller.index(),w=workers.at(-1);w.answer({kind:'indexed',key:w.job.corpus.key,documents:3});await pending;
  assert.match(controller.getState().message,/3 documents/);assert.equal(panel.getNodeCount(),3);assert.equal(panel.getEdgeCount(),1);assert.equal(panel.getSelect(),a);
  pending=controller.index();w=workers.at(-1);a.setHint('edited during indexing');w.answer({kind:'indexed',key:w.job.corpus.key,documents:3});await assert.rejects(pending,/changed/);
  pending=controller.index();const cancelled=assert.rejects(pending,/cancelled/);panel.setGraphEltSet(new FreshGraph());await cancelled;
  controller.dispose();panel.destroy();
});
