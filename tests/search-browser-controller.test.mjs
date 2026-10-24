import test from 'node:test';
import assert from 'node:assert/strict';
import {FreshmindPanel,GraphSearchController} from 'fm4/fm/browser';
import {FreshNode,FreshGraph,FreshEdge} from 'fm4/fm/model';
import {graphSearchCorpus,searchResultMetadata} from 'fm4/fm/ir';
import {LexicalSearchIndex} from 'fm4/ir/lexical';
import {trainLda} from 'fm4/ir/topics';
function fixture(){
  const panel=new FreshmindPanel(),a=panel.addNode(new FreshNode('a','graph layout')),b=panel.addNode(new FreshNode('b','graph spring')),c=panel.addNode(new FreshNode('c','topic model'));
  const manual=panel.addEdge(new FreshEdge(a,c,{label:'manual'})),workers=[];
  const controller=new GraphSearchController(panel,()=>{const w={onmessage:null,onerror:null,terminated:false,postMessage(job){this.job=job;},terminate(){this.terminated=true;},answer(data){this.onmessage?.({data});}};workers.push(w);return w;});
  return {panel,a,b,c,manual,controller,workers};
}
const request={engine:'lexical',kind:'terms',query:'graph'};
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
