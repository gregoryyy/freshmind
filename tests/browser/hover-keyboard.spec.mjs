import {test,expect} from '@playwright/test';
async function ready(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(async()=>{
    const p=window.graphBrowser;p.tgLayout.stop();p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();
    const {FreshGraph,FreshNode,FreshEdge}=await import('/src/fm/model/index.ts'),g=new FreshGraph();
    for(const [id,x,y] of [['center',0,0],['upper',180,-80],['middle',180,0],['lower',180,80]])g.addNode(new FreshNode(id,id,{position:{x,y}}));
    for(const id of ['upper','middle','lower'])g.addEdge(new FreshEdge(g.findNode('center'),g.findNode(id),{id}));
    p.setGraphEltSet(g);p.getGES().addAll();p.setHyperbolic(0);p.setZoom(1);p.centerOn(g.findNode('center'),true);p.getRfc().setFocus(g.findNode('center'));p.getNavigation().configure({preselectionTimeoutMs:0});p.setSelect(null);p.repaint();
    document.activeElement?.blur();
  });return errors;
}
const state=page=>page.evaluate(()=>{const p=window.graphBrowser,s=p.getNavigation().getState();return {selection:p.getSelection()?.getID(),focus:p.getFocus()?.getID(),candidates:s.preselection?.candidateIds};});
const overGraph=async page=>{const b=await page.locator('#graph svg').boundingBox();await page.mouse.move(b.x+20,b.y+20);};
test('hover activates the centered node without a click and Enter/arrows ignore the node under the pointer',async({page})=>{
  const errors=await ready(page),positions=await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]));
  await page.locator('[data-node-id="upper"]').hover();await expect(page.locator('[data-node-id="center"]')).toBeFocused();expect((await state(page)).selection).toBe('center');
  await page.keyboard.press('Enter');expect((await state(page)).focus).toBe('center');expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().focusId)).toBe('center');
  await page.keyboard.press('ArrowRight');expect((await state(page)).candidates).toEqual(['upper','middle','lower']);
  await page.keyboard.press('Enter');expect((await state(page)).selection).toBe('middle');
  await page.mouse.move(900,200);expect((await state(page)).selection).toBe('middle');await page.keyboard.press('Enter');expect((await state(page)).focus).toBe('middle');
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]))).toEqual(positions);expect(errors).toEqual([]);
});
test('explicit side-pane inputs and summary focus survive pointer movement over the graph',async({page})=>{
  const errors=await ready(page);await page.locator('#search-section').evaluate(e=>e.open=true);const input=page.locator('#search-query');await input.focus();await overGraph(page);
  await expect(input).toBeFocused();await page.keyboard.type('ordinary / text');await page.keyboard.press('ArrowLeft');await expect(input).toHaveValue('ordinary / text');expect((await state(page)).selection).toBeUndefined();
  const summary=page.locator('#selection-section > summary');await summary.focus();await page.mouse.move(10,100);await overGraph(page);await expect(summary).toBeFocused();
  const before=await page.locator('#selection-section').evaluate(e=>e.open);await page.keyboard.press('Enter');expect(await page.locator('#selection-section').evaluate(e=>e.open)).toBe(!before);expect((await state(page)).selection).toBeUndefined();
  await page.locator('#graph svg').click({position:{x:10,y:10}});await page.keyboard.press('Enter');expect((await state(page)).selection).toBe('center');expect(errors).toEqual([]);
});
test('inline and full overlay editors retain focus and typing while the pointer is over the graph',async({page})=>{
  const errors=await ready(page);await overGraph(page);await page.keyboard.press('F2');const label=page.getByLabel('Inline node label',{exact:true});await expect(label).toBeFocused();
  await page.mouse.move(10,100);await overGraph(page);await expect(label).toBeFocused();await label.fill('A draft');await label.press('ArrowRight');expect((await state(page)).candidates).toBeUndefined();await label.press('Escape');
  await page.keyboard.press('Control+Space');const annotation=page.getByLabel('Annotation',{exact:true});await expect(annotation).toBeFocused();await page.mouse.move(10,100);await overGraph(page);await expect(annotation).toBeFocused();
  await page.keyboard.type('Details draft');await expect(annotation).toHaveValue('Details draft');await page.keyboard.press('Escape');expect(errors).toEqual([]);
});
test('stationary pointer recovers Enter and navigation after body focus, cleared selection and graph replacement',async({page})=>{
  const errors=await ready(page);await overGraph(page);await page.evaluate(()=>{window.graphBrowser.setSelect(null);document.activeElement?.blur();});
  await page.keyboard.press('ArrowRight');expect((await state(page)).candidates).toEqual(['upper','middle','lower']);
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');expect((await state(page)).selection).toBeUndefined();await page.keyboard.press('Enter');expect((await state(page)).selection).toBe('center');
  await page.evaluate(async()=>{const {FreshGraph,FreshNode}=await import('/src/fm/model/index.ts'),p=window.graphBrowser,g=new FreshGraph();g.addNode(new FreshNode('replacement','Replacement',{position:{x:0,y:0}}));p.setGraphEltSet(g);p.getGES().addAll();p.repaint();document.activeElement?.blur();});
  await page.keyboard.press('Enter');expect((await state(page)).selection).toBe('replacement');expect((await state(page)).focus).toBe('replacement');
  await page.evaluate(()=>{window.graphBrowser.clearAll();document.activeElement?.blur();});await page.keyboard.press('Enter');expect((await state(page)).selection).toBeUndefined();expect(errors).toEqual([]);
});
test('independent bindings route to the hovered graph and disposal removes document key routing',async({page})=>{
  await page.route('**/hover-host.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0"></body></html>'}));await page.goto('/hover-host.html');
  await page.evaluate(async()=>{
    const {FreshmindPanel}=await import('/src/fm/browser/index.ts'),{FreshNode}=await import('/src/fm/model/index.ts'),{bindNavigation}=await import('/src/fm/browser/navigation.ts');
    window.hoverHosts=[];for(const id of ['a','b']){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id=id;svg.style.cssText='width:400px;height:300px;border:1px solid';document.body.append(svg);
      const p=new FreshmindPanel(undefined,{autoStart:false});const n=p.addNode(new FreshNode(id,id));p.centerOn(n,true);let calls=0;p.getNavigation().setActions({edit:()=>calls++});const dispose=bindNavigation(svg,p,p.getNavigation());window.hoverHosts.push({p,svg,dispose,calls:()=>calls});}
  });
  await page.locator('#a').hover();await page.keyboard.press('F2');expect(await page.evaluate(()=>window.hoverHosts.map(h=>h.calls()))).toEqual([1,0]);
  await page.evaluate(()=>document.activeElement.blur());await page.locator('#b').hover();await page.keyboard.press('F2');expect(await page.evaluate(()=>window.hoverHosts.map(h=>h.calls()))).toEqual([1,1]);
  const result=await page.evaluate(()=>{const hosts=window.hoverHosts;hosts.forEach(h=>h.dispose());document.activeElement.blur();const e=new KeyboardEvent('keydown',{key:'F2',bubbles:true,cancelable:true});document.body.dispatchEvent(e);const result={prevented:e.defaultPrevented,calls:hosts.map(h=>h.calls())};hosts.forEach(h=>h.p.destroy());return result;});expect(result).toEqual({prevented:false,calls:[1,1]});
});
