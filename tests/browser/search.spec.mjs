import {test,expect} from '@playwright/test';
async function ready(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.graphBrowser);
  await page.getByRole('button',{name:'Pause motion',exact:true}).click();
  await page.evaluate(async()=>{
    const {FreshGraph,FreshNode,FreshEdge}=await import('/src/fm/model/index.ts'),p=window.graphBrowser,g=new FreshGraph();
    for(const [id,label,tags] of [['a','graph layout spring',['visual search']],['b','topic probability models',['topics']],['c','graph spring force layout',['visual search']],['d','orchard pear apple fruit',['fruit']]])g.addNode(new FreshNode(id,label,{type:'paper',data:{tags},position:{x:id.charCodeAt(0)*50-4900,y:0}}));
    g.addEdge(new FreshEdge(g.findNode('a'),g.findNode('b'),{id:'manual',label:'related'}));p.setGraphEltSet(g);await p.setLocale(g.findNode('b'),0);p.setSelect(g.findNode('b'));p.setHyperbolic(47);
  });await page.locator('#search-section').evaluate(e=>e.open=true);return errors;
}
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
  await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText('results linked');
  await page.evaluate(async()=>{const p=window.graphBrowser;await p.setLocaleAll();p.setSelect(p.findNode('a'));});await page.locator('#search-similar').click();await expect(page.locator('#search-status')).toContainText('results linked');
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
  await page.locator('#search-engine').selectOption('lda');await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);await page.locator('#search-topics').fill('3');await page.locator('#search-iterations').fill('200');await page.locator('#search-train').click();await expect(page.locator('#search-status')).toContainText('Topic model ready');
  await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText('5 results linked');
  const result=await page.evaluate(()=>{const p=window.graphBrowser,q=p.findNode('query-1'),edges=[...p.getCompleteEltSet().getEdges()].filter(e=>e.from===q&&e.getData().search?.role==='result');return{nodes:p.getNodeCount(),type:q.getSemanticType(),engines:edges.map(e=>e.getData().search.request.engine),context:[...q.getEdges()].some(e=>e.getData().search?.role==='context')};});
  expect(result).toEqual({nodes:25,type:'ldaquery',engines:Array(5).fill('lda'),context:true});expect(errors).toEqual([]);
});

test('FM2014 literal search shortcuts open collapsed controls, check indexing and link term/similarity results',async({page})=>{
  const errors=await ready(page);await page.locator('#search-section').evaluate(e=>e.open=false);await page.locator('#graph svg').focus();
  await page.keyboard.press('Control+i');await expect(page.locator('#search-status')).toContainText('Literal index checked: 4 documents');
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(4);
  await page.keyboard.press('Control+f');await expect(page.locator('#search-query')).toBeFocused();await expect(page.locator('#search-engine')).toHaveValue('lexical');
  await page.locator('#search-query').fill('graph');await page.keyboard.press('Enter');await expect(page.locator('#search-status')).toContainText('2 results linked');
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
  await page.keyboard.press('Control+Shift+f');await expect(page.locator('#search-query')).toBeFocused();await expect(page.locator('#search-engine')).toHaveValue('lda');
  await page.locator('#search-query').fill('graph');await page.keyboard.press('Enter');await expect(page.locator('#search-status')).toContainText('results linked');
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('a')));await page.locator('#graph svg').focus();await page.keyboard.press('Control+Shift+r');await expect(page.locator('#search-status')).toContainText('results linked');
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllEdges()].some(e=>e.from.getID()==='a'&&e.getData().search?.request?.engine==='lda'&&e.getData().search.request.kind==='similarity'))).toBe(true);expect(errors).toEqual([]);
});
