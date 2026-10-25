import {test,expect} from '@playwright/test';
import {fillNumeric,selectChoice} from '../../scripts/browser-controls.mjs';
async function ready(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(async()=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();
    const {FreshGraph,FreshNode,FreshEdge}=await import('/src/fm/model/index.ts'),{captureDocument}=await import('/src/fm/browser/index.ts'),{documentToRecord}=await import('/src/fm/io/index.ts');
    const g=new FreshGraph();for(const [i,id] of ['c','a','b','d','x','y'].entries())g.addNode(new FreshNode(id,id.toUpperCase(),{type:'service',position:{x:i*40,y:i*15},data:{retained:{id}},annotation:{format:'text',text:`Content ${id}`}}));
    for(const [id,from,to] of [['ca','c','a'],['bc','b','c'],['cd','c','d'],['ad','a','d'],['ax1','a','x'],['ax2','a','x'],['xa','x','a'],['bx','b','x'],['by','b','y'],['xy','x','y'],['aa','a','a'],['cc','c','c'],['yy','y','y']])g.addEdge(new FreshEdge(g.findNode(from),g.findNode(to),{id,label:`calls ${id}`,weight:id==='ax2'?0:10}));
    p.setGraphEltSet(g);p.getGES().addAll();p.getGES().removeNode(g.findNode('x'));p.getGES().removeNode(g.findNode('y'));p.setSelect(g.findNode('c'));p.centerOn(g.findNode('c'),true);p.setZoom(1.3);p.setHyperbolic(60);p.setRotation(.2);p.setCanvasZoom(1.4);p.setCanvasPan(22,-9);p.setLensPan(4,5);p.getRfc().setFocus(g.findNode('c'));p.repaintAfterMove();
    window.radiusOriginal=()=>({record:documentToRecord(captureDocument(p)),visible:[...p.getGES().getNodes()].map(n=>n.getID()),edges:[...p.getGES().getEdges()].map(e=>e.getID()),rfc:p.getRfc().getState().centers});window.radiusBefore=window.radiusOriginal();
  });await page.getByText('Experimental studies',{exact:true}).click();return errors;
}
const root=page=>page.locator('#radius-two-view');const card=(page,id)=>root(page).locator(`.r2-card[data-radius-node-id="${id}"]`);
test('radius-two rows preserve source/lenses, share selection and edit hidden relations in the existing overlay',async({page})=>{
  const errors=await ready(page);await selectChoice(page.locator('#exploration-view'),'radius-two');await expect(root(page)).toBeVisible();await expect(root(page).locator('h2')).toContainText('Experimental neighbor table');await expect(root(page).locator('.r2-counts')).toContainText('3 direct nodes · 2 unique second-hop nodes · 4 row occurrences · 13 relation records');
  await expect(card(page,'x')).toHaveCount(3);await card(page,'x').first().click();await expect(root(page).locator('.r2-card[data-radius-node-id="x"][aria-pressed="true"]')).toHaveCount(3);
  expect(await page.evaluate(()=>window.graphBrowser.getGES().contains(window.graphBrowser.findNode('x')))).toBe(false);
  const bundle=root(page).getByText('Relations: 2',{exact:true});await bundle.click();const edge=root(page).locator('button:not(.r2-card)[aria-label$="relation ax2"]');await expect(edge).toContainText('weight 0');await edge.click();
  await edge.press('F2');await expect(page.locator('#item-editor-overlay')).toBeVisible();await expect(page.locator('#edge-label')).toBeFocused();await page.locator('#edge-label').fill('Uncommitted draft');await page.locator('#edge-label').press('Escape');
  await expect.poll(()=>page.evaluate(()=>Boolean(document.activeElement?.closest('#radius-two-view')))).toBe(true);
  expect(await page.evaluate(()=>window.graphBrowser.getSelection().getID())).toBe('ax2');expect(await page.evaluate(()=>window.graphBrowser.getGES().contains(window.graphBrowser.getSelection()))).toBe(false);
  const x=card(page,'x').first();await x.focus();await x.press('Enter');await expect(root(page).locator('h2')).toContainText('X');await page.keyboard.press('Alt+Shift+ArrowLeft');await expect(root(page).locator('h2')).toContainText('X');await root(page).getByRole('button',{name:'Back',exact:true}).click();await expect(root(page).locator('h2')).toContainText('C');expect(await page.evaluate(()=>window.graphBrowser.getSelection().getID())).toBe('ax2');
  expect(await page.evaluate(()=>window.radiusOriginal())).toEqual(await page.evaluate(()=>window.radiusBefore));
  await root(page).getByRole('button',{name:'Return to graph',exact:true}).click();await expect(root(page)).not.toBeVisible();expect(await page.evaluate(()=>window.radiusOriginal())).toEqual(await page.evaluate(()=>window.radiusBefore));expect(await page.evaluate(()=>window.graphBrowser.tgLayout.isRunning())).toBe(false);expect(errors).toEqual([]);
});
test('large adjacency and parallel bundles use bounded pages with keyboard movement and narrow-screen access',async({page})=>{
  const errors=await ready(page);await page.evaluate(async()=>{const {FreshGraph,FreshNode,FreshEdge}=await import('/src/fm/model/index.ts'),p=window.graphBrowser,g=new FreshGraph(),c=new FreshNode('hub','Hub'),shared=new FreshNode('shared','Shared');g.addNode(c);g.addNode(shared);
    for(let i=0;i<300;i++){const n=new FreshNode(`n${String(i).padStart(3,'0')}`,`Neighbor ${String(i).padStart(3,'0')}`);g.addNode(n);g.addEdge(new FreshEdge(c,n));g.addEdge(new FreshEdge(n,shared));}
    for(let i=0;i<100;i++)g.addEdge(new FreshEdge(g.findNode('n000'),shared,{label:`parallel ${i}`}));p.setGraphEltSet(g);p.getGES().addNode(c);p.setSelect(c);p.centerOn(c,true);
  });await selectChoice(page.locator('#exploration-view'),'radius-two');await expect(root(page).locator('.r2-counts')).toContainText('300 direct nodes · 1 unique second-hop nodes · 300 row occurrences');
  expect(await root(page).locator('.r2-card').count()).toBeLessThanOrEqual(109);expect(await root(page).locator('button').count()).toBeLessThan(500);
  await root(page).getByRole('button',{name:'Next direct-neighbor rows',exact:true}).click();await expect(root(page).locator('.r2-row[data-row-id="n000"]')).toHaveCount(0);
  await root(page).getByRole('button',{name:'Previous direct-neighbor rows',exact:true}).click();await expect(root(page).locator('.r2-row[data-row-id="n000"]')).toHaveCount(1);
  await card(page,'hub').focus();await page.keyboard.press('ArrowUp');expect(await page.evaluate(()=>document.activeElement?.classList.contains('r2-card'))).toBe(true);await page.keyboard.press('Home');await expect(card(page,'hub')).toBeFocused();
  await page.setViewportSize({width:390,height:844});await expect.poll(()=>root(page).locator('.r2-row[data-row-id]').count()).toBeLessThanOrEqual(2);await expect(root(page).getByRole('button',{name:'Return to graph',exact:true})).toBeVisible();
  const widths=await root(page).evaluate(el=>[el.getBoundingClientRect().width,innerWidth]);expect(widths[0]).toBeLessThanOrEqual(widths[1]);expect(errors).toEqual([]);
});
test('replacement/disposal reject retired occurrences and empty documents remain usable',async({page})=>{
  const errors=await ready(page);await selectChoice(page.locator('#exploration-view'),'radius-two');await page.evaluate(()=>window.retiredRadiusCard=document.querySelector('#radius-two-view .r2-card[data-radius-node-id="x"]'));
  await page.evaluate(async()=>{const {FreshGraph,FreshNode}=await import('/src/fm/model/index.ts'),p=window.graphBrowser,g=new FreshGraph();g.addNode(new FreshNode('c','Replacement'));p.setGraphEltSet(g);p.getGES().addAll();p.setSelect(g.findNode('c'));});await expect(root(page).locator('h2')).toContainText('Replacement');
  await expect(card(page,'c')).toBeFocused();await page.keyboard.press('F2');await expect(page.locator('#node-label')).toHaveValue('Replacement');await expect(page.locator('#node-label')).toBeFocused();await page.keyboard.press('Escape');
  await page.evaluate(()=>window.retiredRadiusCard.click());expect(await page.evaluate(()=>window.graphBrowser.getSelection().getID())).toBe('c');await expect(root(page).getByRole('button',{name:'Back',exact:true})).toBeDisabled();
  await page.evaluate(async()=>{const {FreshGraph}=await import('/src/fm/model/index.ts');window.graphBrowser.setGraphEltSet(new FreshGraph());});await expect(root(page)).toContainText('Empty document.');
  await page.evaluate(()=>window.radiusTwoView.dispose());await selectChoice(page.locator('#exploration-view'),'radius-two');expect(await page.evaluate(()=>window.radiusTwoView.isEnabled())).toBe(false);await expect(root(page)).not.toBeVisible();expect(errors).toEqual([]);
});
test('accepted lexical and LDA results seed the view with exact provenance; source edits invalidate seeds',async({page})=>{
  const errors=await ready(page);await page.evaluate(async()=>{const {FreshGraph,FreshNode}=await import('/src/fm/model/index.ts'),p=window.graphBrowser,g=new FreshGraph();for(const [id,label] of [['a','graph layout spring'],['b','topic probability models'],['c','graph spring force layout'],['d','orchard pear apple fruit']])g.addNode(new FreshNode(id,label,{type:'paper'}));p.setGraphEltSet(g);p.getGES().addAll();p.setSelect(g.findNode('a'));});
  await page.locator('#search-section').evaluate(e=>e.open=true);await page.locator('#search-query').fill('graph');await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText('2 results linked');
  await selectChoice(page.locator('#exploration-view'),'radius-two');await root(page).getByText('Search result seeds',{exact:true}).click();const seeds=root(page).getByLabel('Search result seed',{exact:true});await expect(seeds.locator('option')).toHaveCount(3);await seeds.selectOption('0');await expect(root(page).locator('.r2-card[data-center="true"]')).toHaveAttribute('aria-pressed','true');await expect(root(page)).toContainText('raw score');await expect(root(page)).toContainText('lexical · terms “graph”');await seeds.selectOption('1');const chosen=await page.evaluate(()=>window.graphBrowser.getSelect().getID());await seeds.selectOption('');expect(await page.evaluate(()=>window.graphBrowser.getSelect().getID())).toBe(chosen);
  await root(page).getByRole('button',{name:'Return to graph',exact:true}).click();await selectChoice(page.locator('#search-engine'),'lda');await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);await fillNumeric(page.locator('#search-topics'),'2');await fillNumeric(page.locator('#search-iterations'),'40');await page.locator('#search-train').click();await expect(page.locator('#search-status')).toContainText('Topic model ready');await fillNumeric(page.locator('#search-distance'),'100');await page.locator('#search-run').click();await expect(page.locator('#search-status')).toContainText(/results? linked/);
  await expect.poll(()=>page.evaluate(()=>[...window.graphBrowser.getCompleteEltSet().getEdges()].filter(e=>e.getData().search?.role==='result'&&e.getData().search.request?.engine==='lda').length)).toBeGreaterThan(0);
  await selectChoice(page.locator('#exploration-view'),'radius-two');if(!await seeds.isVisible())await root(page).getByText('Search result seeds',{exact:true}).click();const options=await seeds.locator('option').allTextContents(),lda=options.findIndex(value=>value.startsWith('lda'));expect(lda).toBeGreaterThan(0);await seeds.selectOption(String(lda-1));await expect(root(page)).toContainText('lda · terms “graph”');
  const before=await page.evaluate(()=>[window.graphBrowser.getNodeCount(),window.graphBrowser.getEdgeCount()]);await page.evaluate(()=>window.graphBrowser.findNode('a').setLabel('Edited corpus'));await root(page).getByRole('button',{name:'Refresh snapshot',exact:true}).click();await expect(seeds).toBeDisabled();expect(await page.evaluate(()=>[window.graphBrowser.getNodeCount(),window.graphBrowser.getEdgeCount()])).toEqual(before);expect(errors).toEqual([]);
});

test('focus and hover disclose shared identity without selecting, and returning restores ordinary selection cleanup',async({page})=>{
  const errors=await ready(page);await selectChoice(page.locator('#exploration-view'),'radius-two');
  await card(page,'x').first().hover();await expect(root(page).locator('.r2-card[data-radius-node-id="x"].r2-related')).toHaveCount(3);
  expect(await page.evaluate(()=>window.graphBrowser.getSelection().getID())).toBe('c');
  await card(page,'x').first().focus();await expect(root(page).locator('.r2-card[data-radius-node-id="x"].r2-related')).toHaveCount(3);
  await page.keyboard.press('Space');expect(await page.evaluate(()=>window.graphBrowser.getSelection().getID())).toBe('x');
  await expect(root(page).locator('.r2-card[data-radius-node-id="x"][aria-pressed="true"]')).toHaveCount(3);
  await expect(root(page).locator('.r2-row[data-row-id="a"] .r2-incoming button:not(.r2-card)[aria-label$="relation xa"]')).toContainText('← weight 10');
  await card(page,'a').click();await page.mouse.move(50,30);await page.evaluate(()=>window.radiusTwoView.setEnabled(false));
  expect(await page.evaluate(()=>window.graphBrowser.getSelect()?.getID())).toBe('a');
  await page.evaluate(()=>{const p=window.graphBrowser;p.getGES().removeNode(p.findNode('a'));p.localityChanged();p.repaint();});
  expect(await page.evaluate(()=>window.graphBrowser.getSelection())).toBeNull();expect(errors).toEqual([]);
});
