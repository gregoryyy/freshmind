import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
async function ready(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.graphBrowser);
  await page.getByRole('button',{name:'Pause motion',exact:true}).click();
  await page.evaluate(async()=>{
    const {FreshGraph,FreshNode,FreshEdge}=await import('/src/fm/model/index.ts'),p=window.graphBrowser,g=new FreshGraph();
    for(const [id,label,tags] of [['a','graph layout spring',['visual search']],['b','topic probability models',['topics']],['c','graph spring force layout',['visual search']],['d','orchard pear apple fruit',['fruit']]])g.addNode(new FreshNode(id,label,{type:'paper',data:{tags},position:{x:id.charCodeAt(0)*50-4900,y:0}}));
    g.addEdge(new FreshEdge(g.findNode('a'),g.findNode('b'),{id:'manual',label:'related'}));p.setGraphEltSet(g);await p.setLocale(g.findNode('b'),0);p.setSelect(g.findNode('b'));p.setHyperbolic(47);
  });await page.locator('#search-section').evaluate(e=>e.open=true);return errors;
}
test('search uses compact green associations, inspectable scores and RFC around the result source',async({page})=>{
  const errors=await ready(page);await page.locator('#search-query').fill('graph');await page.locator('#search-run').click();
  await expect(page.locator('#search-status')).toContainText('2 results linked');
  const state=await page.evaluate(()=>{
    const p=window.graphBrowser,q=p.getSelect(),edges=[...q.getEdges()].filter(e=>e.getData().search?.role==='result');
    return {query:q.getID(),focus:p.getRfc().getState().focusId,branches:p.getRfc().getState().branchIds,results:edges.map(e=>({id:e.getID(),rank:e.getData().search.rank,score:e.getData().search.score})),context:[...q.getEdges()].find(e=>e.getData().search?.role==='context').getID()};
  });
  expect(state.focus).toBe(state.query);expect(state.branches.sort()).toEqual(['a','c']); // Context b is retained, but is not a result.
  for(const result of state.results){
    const group=page.locator(`[data-edge-id="${result.id}"]`);
    await expect(group.locator('.fm-edge-label')).toHaveText(`#${result.rank}`);
    await expect(group.locator('.fm-edge-label')).toHaveAttribute('fill','#28845d');
    await expect(group.locator('.fm-edge-path')).toHaveAttribute('stroke','#28845d');
    await expect(group.locator('.fm-edge-arrow')).toHaveAttribute('fill','#28845d');
    await expect(group.locator('title')).toContainText(`score: ${result.score}`);
    await expect(group).toHaveAttribute('aria-label',new RegExp(`rank ${result.rank}`));
  }
  const context=page.locator(`[data-edge-id="${state.context}"]`);
  await expect(context.locator('.fm-edge-label')).toHaveText('');
  await expect(context.locator('.fm-edge-path')).toHaveAttribute('stroke-dasharray',/.+/);
  await expect(context.locator('title')).toHaveText('Search context');
  await expect(page.locator('[data-edge-id="manual"] .fm-edge-path')).toHaveAttribute('stroke','#0000b0');
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('a')));await page.locator('#search-similar').click();
  await expect(page.locator('#search-status')).toContainText(/results? linked/);
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().focusId)).toBe('a');
  expect(errors).toEqual([]);
});
test('malformed imported search diagnostics remain inert during rendering',async({page})=>{
  const errors=await ready(page);
  await page.evaluate(async()=>{
    const p=window.graphBrowser,edge=[...p.getAllEdges()].find(e=>e.getID()==='manual'),bad={toString:'not callable',valueOf:'not callable'};
    edge.setData({search:{version:1,role:'result',owner:'a',target:'b',rank:bad,metric:'<script>diagnostic</script>',value:bad,request:{engine:bad}}});
    await p.setLocaleAll();p.repaint();
  });
  await expect(page.locator('[data-edge-id="manual"] title')).toContainText('rank unknown');
  await expect(page.locator('[data-edge-id="manual"] title')).toContainText('unavailable');
  await expect(page.locator('[data-edge-id="manual"] script')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('real worker lexical/tag queries reveal results, preserve relations and save rejection feedback',async({page},info)=>{
  const errors=await ready(page);await page.locator('#search-query').fill('graph');await page.locator('#search-run').click();
  await expect(page.locator('#search-status')).toContainText('2 results linked');
  const check=await page.evaluate(()=>{const p=window.graphBrowser,q=p.getSelect();return{query:q.getData().search,visible:p.visibleNodeCount(),lens:p.getHyperbolic(),count:p.getNodeCount(),weights:[...p.getAllNodes()].map(n=>n.getWeight())};});
  expect(check.query.role).toBe('query');expect(check.visible).toBe(4);expect(check.lens).toBe(47);expect(check.count).toBe(5);expect(check.weights.every(n=>n===1)).toBe(true);
  await page.evaluate(()=>{const p=window.graphBrowser,e=[...p.getCompleteEltSet().getEdges()].find(e=>e.getData().search?.role==='result');window.rejectedId=e.to.getID();p.setSelectEdge(e);});
  await page.locator('#search-reject').click();await expect(page.locator('#search-status')).toContainText('Result rejected');
  await page.evaluate(()=>{const p=window.graphBrowser;p.setSelect(p.findNode('query-1'));});await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText('1 result linked');
  expect(await page.evaluate(()=>!!window.graphBrowser.getCompleteEltSet().edgeAt(0))).toBe(true);
  const downloadPromise=page.waitForEvent('download');await page.locator('#save-graph').click();const download=await downloadPromise,path=info.outputPath('search.fm.yaml');await download.saveAs(path);
  await page.locator('#open-graph-files').setInputFiles(path);await expect(page.locator('#file-status')).toContainText('search.fm.yaml');
  expect(await page.evaluate(()=>{const p=window.graphBrowser,q=p.findNode('query-1');return q.getData().search.feedback[0].target===window.rejectedId&&[...p.getCompleteEltSet().getEdges()].some(e=>e.getID()==='manual');})).toBe(true);
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('query-1')));await page.locator('#search-kind').selectOption('tags');await page.locator('#search-query').fill('VISUAL SEARCH');await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText('2 results linked');
  expect(errors).toEqual([]);
});
test('real worker trains topics, retrieves by terms and existing nodes, and requires retraining after edits',async({page})=>{
  const errors=await ready(page);await page.locator('#search-engine').selectOption('lda');await page.locator('#search-query').fill('graph');await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText('Train a topic model');
  await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);await page.locator('#search-topics').fill('2');await page.locator('#search-iterations').fill('40');await page.locator('#search-train').click();
  await expect(page.locator('#search-status')).toContainText('Topic model ready: 2 topics');await expect(page.locator('#search-topic-words p')).toHaveCount(2);
  await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText(/results? linked/);
  await page.evaluate(async()=>{const p=window.graphBrowser;await p.setLocaleAll();p.setSelect(p.findNode('a'));});await page.locator('#search-similar').click();await expect(page.locator('#search-status')).toContainText(/results? linked/);
  expect(await page.evaluate(()=>{const p=window.graphBrowser;return [...p.getCompleteEltSet().getEdges()].some(e=>e.from.getID()==='a'&&e.to.getID()!=='a'&&e.getData().search?.request?.kind==='similarity');})).toBe(true);
  await page.evaluate(()=>window.graphBrowser.findNode('a').setLabel('changed text'));await page.locator('#search-similar').click();await expect(page.locator('#search-status')).toContainText('Train a topic model');expect(errors).toEqual([]);
});
test('long worker training can be cancelled and graph replacement clears the model lifecycle',async({page})=>{
  const errors=await ready(page);
  await page.evaluate(()=>{const p=window.graphBrowser,n=p.findNode('a');n.setHint('graph spring layout force '.repeat(1000));});
  await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);await page.locator('#search-topics').fill('40');await page.locator('#search-iterations').fill('10000');await page.locator('#search-train').click();
  await expect(page.locator('#search-cancel')).toBeEnabled();await page.locator('#search-cancel').click();await expect(page.locator('#search-status')).toContainText('cancelled');await expect(page.locator('#search-run')).toBeEnabled();
  await page.locator('#search-train').click();await expect(page.locator('#search-cancel')).toBeEnabled();await page.locator('#example-graph').selectOption('florentine');await expect(page.locator('#file-status')).toContainText('florentine.fm.yaml');
  await expect(page.locator('#search-status')).toContainText('Graph changed');await expect(page.locator('#search-cancel')).toBeDisabled();expect(errors).toEqual([]);
});
test('loadable fictional library supports a query engine switch without retaining mismatched query results',async({page})=>{
  const errors=await ready(page);await page.locator('#example-graph').selectOption('graph-search');await expect(page.locator('#file-status')).toContainText('24 nodes, 28 relations');
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('mira')));await page.locator('#search-query').fill('spring layout');await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText('5 results linked');
  await expect(page.locator('#search-metric')).toHaveValue('symmetric-kl');
  await page.locator('#search-engine').selectOption('lda');await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);await page.locator('#search-topics').fill('3');await page.locator('#search-iterations').fill('200');await page.locator('#search-train').click();await expect(page.locator('#search-status')).toContainText('Topic model ready');
  await expect(page.locator('#search-metric')).toHaveValue('symmetric-kl');
  await page.locator('#search-distance').fill('100');
  await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText('5 results linked');
  const result=await page.evaluate(()=>{const p=window.graphBrowser,q=p.findNode('query-1'),edges=[...p.getCompleteEltSet().getEdges()].filter(e=>e.from===q&&e.getData().search?.role==='result');return{nodes:p.getNodeCount(),type:q.getSemanticType(),engines:edges.map(e=>e.getData().search.request.engine),context:[...q.getEdges()].some(e=>e.getData().search?.role==='context')};});
  expect(result).toEqual({nodes:25,type:'ldaquery',engines:Array(5).fill('lda'),context:true});expect(errors).toEqual([]);
});

test('FM2014 literal shortcuts create graph queries, check indexing and link term/similarity results',async({page})=>{
  const errors=await ready(page);await page.locator('#search-section').evaluate(e=>e.open=false);await page.locator('#graph svg').focus();
  await page.keyboard.press('Control+i');await expect(page.locator('#search-status')).toContainText('Literal index checked: 4 documents');
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(4);
  await page.keyboard.press('Control+f');await expect(page.getByRole('textbox',{name:'Lexical query on graph',exact:true})).toBeFocused();await expect(page.locator('#search-engine')).toHaveValue('lexical');
  await page.getByRole('textbox',{name:'Lexical query on graph',exact:true}).fill('graph');await page.keyboard.press('Enter');await expect(page.locator('#search-status')).toContainText('2 results linked');
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('a')));await page.locator('#graph svg').focus();await page.keyboard.press('Control+r');
  await expect(page.locator('#search-status')).toContainText('result');expect(await page.evaluate(()=>[...window.graphBrowser.getAllEdges()].some(e=>e.from.getID()==='a'&&e.getData().search?.request?.kind==='similarity'))).toBe(true);
  await page.locator('#graph svg').focus();await page.keyboard.press('/');await expect(page.locator('#search-query')).toBeFocused();await expect(page.locator('#search-query')).toHaveValue('');
  await page.locator('#search-query').fill('prior draft');await page.locator('#graph svg').dispatchEvent('keydown',{key:'/',shiftKey:true});await expect(page.locator('#search-query')).toBeFocused();await expect(page.locator('#search-query')).toHaveValue('');
  const before=await page.evaluate(()=>window.graphBrowser.getNodeCount());
  await page.locator('#search-query').evaluate(e=>e.dispatchEvent(new KeyboardEvent('keydown',{key:'r',ctrlKey:true,bubbles:true,cancelable:true})));
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(before);await page.locator('#search-query').fill('/ normal typing');await expect(page.locator('#search-query')).toHaveValue('/ normal typing');expect(errors).toEqual([]);
});
test('FM2014 semantic search and training shortcuts retain the current model lifecycle',async({page})=>{
  const errors=await ready(page);await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);
  await page.locator('#search-topics').fill('2');await page.locator('#search-iterations').fill('40');await page.locator('#search-section').evaluate(e=>e.open=false);
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+Shift+i');await expect(page.locator('#search-status')).toContainText('Topic model ready: 2 topics');
  await page.locator('#search-metric').selectOption('predictive');
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+Shift+f');await expect(page.getByRole('textbox',{name:'LDA query on graph',exact:true})).toBeFocused();await expect(page.locator('#search-engine')).toHaveValue('lda');
  expect(await page.evaluate(()=>window.graphBrowser.getSelect().getData().search.request.metric)).toBe('predictive');
  await page.getByRole('textbox',{name:'LDA query on graph',exact:true}).fill('graph');await page.keyboard.press('Enter');await expect(page.locator('#search-status')).toContainText(/results? linked/);
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('a')));await page.locator('#graph svg').focus();await page.keyboard.press('Control+Shift+r');await expect(page.locator('#search-status')).toContainText(/results? linked/);
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllEdges()].some(e=>e.from.getID()==='a'&&e.getData().search?.request?.engine==='lda'&&e.getData().search.request.kind==='similarity'))).toBe(true);expect(errors).toEqual([]);
});

test('query entry stays on its moving node, reruns with F2 and deletes back to context without removing results',async({page},info)=>{
  const errors=await ready(page);await page.locator('#search-section').evaluate(e=>e.open=false);await page.locator('#graph svg').focus();
  await page.keyboard.press('Control+f');const input=page.getByRole('textbox',{name:'Lexical query on graph',exact:true});await expect(input).toBeFocused();
  expect(await page.locator('#search-section').evaluate(e=>e.open)).toBe(false);
  expect(await page.evaluate(()=>{const p=window.graphBrowser,q=p.getSelect();return [p.getNodeCount(),q.getID(),q.getData().search.draft,[...q.getEdges()][0].from.getID()];})).toEqual([5,'query-1',true,'b']);
  await input.fill('graph');await page.evaluate(()=>{const p=window.graphBrowser,n=p.getSelect();n.x+=90;n.y+=45;p.setCanvasZoom(1.3);p.setHyperbolic(20);p.setRotation(.2);p.repaintAfterMove();});
  await expect(input).toBeFocused();await expect(input).toHaveValue('graph');
  const alignment=await input.evaluate(field=>{const p=window.graphBrowser,n=p.getSelect(),point=p.drawToScreen({x:n.drawx,y:n.drawy}),box=field.getBoundingClientRect(),svg=field.closest('svg').getBoundingClientRect();return Math.hypot(box.x+box.width/2-svg.x-point.x,box.y+box.height/2-svg.y-point.y);});expect(alignment).toBeLessThan(1);
  await page.screenshot({path:info.outputPath('query-on-graph.png')});await input.press('Enter');await expect(input).toHaveCount(0);await expect(page.locator('#search-status')).toContainText('2 results linked');
  await page.keyboard.press('F2');await expect(input).toHaveValue('graph');await input.fill('orchard');await input.press('Enter');await expect(page.locator('#search-status')).toContainText('1 result linked');
  expect(await page.evaluate(()=>{const p=window.graphBrowser;return [p.getNodeCount(),[...p.findNode('query-1').getEdges()].filter(e=>e.getData().search?.role==='result').map(e=>e.to.getID())];})).toEqual([5,['d']]);
  await page.keyboard.press('Control+Backspace');
  expect(await page.evaluate(()=>{const p=window.graphBrowser;return {nodes:[...p.getAllNodes()].map(n=>n.getID()),edges:[...p.getAllEdges()].map(e=>e.getID()),selected:p.getSelect()?.getID()};})).toEqual({nodes:['a','b','c','d'],edges:['manual'],selected:'b'});
  expect(errors).toEqual([]);
});

test('query deletion chords work in browse mode while text deletion, composition and side-pane focus keep input ownership',async({page})=>{
  const errors=await ready(page),input=page.getByRole('textbox',{name:'Lexical query on graph',exact:true});
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+f');await input.fill('graph extra');await input.press('Control+Backspace');
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(5);await expect(input).toBeFocused();await input.fill('graph');
  await input.evaluate(field=>{field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));});
  await expect(input).toBeFocused();expect(await page.evaluate(()=>window.graphBrowser.getSelect().getData().search.draft)).toBe(true);
  await input.evaluate(field=>field.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));await input.press('Escape');await expect(input).toHaveCount(0);
  await page.keyboard.press('Control+Delete');expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(4);
  for(const chord of ['Delete','Backspace','Control+d']){
    await page.keyboard.press('Control+f');await expect(input).toBeFocused();await input.press('Escape');await page.keyboard.press(chord);expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(4);
  }
  await page.locator('#search-query').focus();await page.locator('#search-query').fill('native text');await page.locator('#search-query').press('Control+f');
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(4);await expect(page.locator('#search-query')).toBeFocused();expect(errors).toEqual([]);
});

test('query editor supports in-place label mode, empty graphs and source replacement without stale submission',async({page})=>{
  const errors=await ready(page);await page.evaluate(()=>window.graphBrowser.setLabelEditingMode('in-place'));await page.locator('#graph svg').focus();await page.keyboard.press('Control+Shift+f');
  const input=page.getByRole('textbox',{name:'LDA query on graph',exact:true});await expect(input).toBeFocused();await input.fill('graph');await input.press('Enter');
  await expect(page.locator('#search-status')).toContainText('Train a topic model');expect(await page.evaluate(()=>window.graphBrowser.findNode('query-1').getLabel())).toBe('[graph]');
  await page.locator('#graph svg').focus();await page.keyboard.press('F2');await expect(input).toHaveValue('graph');
  await input.fill('retained draft');await page.locator('#graph svg').focus();
  await page.evaluate(()=>window.graphBrowser.findNode('query-1').setLabel('Changed elsewhere'));
  await page.keyboard.press('F2');await expect(input).toHaveValue('retained draft');await input.press('Enter');await expect(input).toHaveAttribute('aria-invalid','true');
  expect(await page.evaluate(()=>window.graphBrowser.findNode('query-1').getLabel())).toBe('Changed elsewhere');await input.press('Escape');await page.keyboard.press('F2');
  await input.evaluate(field=>window.retiredQueryField=field);
  await page.evaluate(()=>window.graphBrowser.clearAll());await expect(input).toHaveCount(0);await page.locator('#graph svg').focus();await page.keyboard.press('Control+f');
  const lexical=page.getByRole('textbox',{name:'Lexical query on graph',exact:true});await expect(lexical).toBeFocused();
  await page.evaluate(()=>window.retiredQueryField.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));
  await lexical.fill('missing');await lexical.press('Enter');await expect(page.locator('#search-status')).toContainText('0 results linked');
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+Backspace');expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(0);
  await page.keyboard.press('Control+f');await expect(lexical).toBeFocused();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(lexical).toHaveCount(0);expect(errors).toEqual([]);
});

test('selected relation deletion has precedence after Tab moves focus onto a node',async({page})=>{
  const errors=await ready(page);await page.evaluate(async()=>{const p=window.graphBrowser;await p.setLocaleAll();p.setInteractionMode('edit');p.setSelectEdge([...p.getAllEdges()].find(e=>e.getID()==='manual'));});
  await page.locator('[data-edge-id=manual]').focus();await page.keyboard.press('Tab');
  const focus=await page.evaluate(()=>[window.graphBrowser.getSelection().getID(),document.activeElement?.dataset.nodeId]);
  expect(focus[0]).toBe('manual');expect(['a','b','c','d']).toContain(focus[1]);
  await page.keyboard.press('Delete');expect(await page.evaluate(()=>[window.graphBrowser.getNodeCount(),window.graphBrowser.getEdgeCount()])).toEqual([4,0]);
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+d');expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(3);expect(errors).toEqual([]);
});

test('semantic metrics/raw values and a local model file survive save/load without document transfer',async({page},info)=>{
  const errors=await ready(page),leaks=[];
  page.on('request',request=>{if((request.url()+' '+(request.postData()??'')).includes('private-canary'))leaks.push(request.url());});
  await page.evaluate(()=>{const p=window.graphBrowser;p.findNode('a').setHint('private-canary graph spring layout');});
  await page.locator('#search-engine').selectOption('lda');
  await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);
  await page.locator('#search-topics').fill('2');await page.locator('#search-iterations').fill('40');await page.locator('#search-train').click();
  await expect(page.locator('#search-status')).toContainText('Topic model ready');
  const download=page.waitForEvent('download');await page.locator('#search-save-model').click();
  const file=await download,path=info.outputPath('topic-model.json');await file.saveAs(path);
  const saved=JSON.parse(await readFile(path,'utf8'));expect(saved.corpus.documents.some(d=>d.hint.includes('private-canary'))).toBe(true);
  await page.locator('#search-metric').selectOption('predictive');await page.locator('#search-query').fill('graph');await page.locator('#search-run').click();
  await expect(page.locator('#search-status')).toContainText(/results? linked/);
  expect(await page.evaluate(()=>{const results=[...window.graphBrowser.getAllEdges()].filter(e=>e.getData().search?.role==='result');return results.length>0&&results.every(e=>{
    const s=e.getData().search;return s.metric==='predictive'&&s.value===s.score&&s.backend==='fm2014-lda-1'&&s.request.metric==='predictive';
  });})).toBe(true);
  await page.locator('#search-load-model').setInputFiles(path);await expect(page.locator('#search-status')).toContainText('Topic model loaded: 2 topics');
  await page.locator('#search-metric').selectOption('symmetric-kl');await page.locator('#search-distance').fill('100');
  await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText(/results? linked/);
  const data=await page.evaluate(()=>[...window.graphBrowser.getAllEdges()].filter(e=>e.getData().search?.role==='result').map(e=>e.getData().search));
  expect(data.length).toBeGreaterThan(0);expect(data.every(s=>s.metric==='symmetric-kl'&&s.value>=0&&s.request.maxDistance===100)).toBe(true);
  const rendered=await page.evaluate(()=>[...window.graphBrowser.getAllEdges()].filter(e=>e.getData().search?.role==='result').map(e=>{
    const group=document.querySelector(`[data-edge-id="${e.getID()}"]`),data=e.getData().search;
    return {compact:group.querySelector('.fm-edge-label').textContent===`#${data.rank}`,details:group.querySelector('title').textContent.includes(`symmetric-kl: ${data.value}`)};
  }));expect(rendered.every(r=>r.compact&&r.details)).toBe(true);
  await page.evaluate(()=>window.graphBrowser.findNode('a').setHint('changed corpus'));
  await page.locator('#search-load-model').setInputFiles(path);await expect(page.locator('#search-status')).toContainText('different corpus');
  expect(leaks).toEqual([]);expect(errors).toEqual([]);
});
