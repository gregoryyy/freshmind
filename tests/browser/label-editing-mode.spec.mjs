import {selectChoice} from "../../scripts/browser-controls.mjs";
import {test,expect} from '@playwright/test';
async function ready(page,url='/') {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  await page.waitForFunction(()=>window.freshmindBrowser||window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(async()=>{
    const p=window.graphBrowser??window.freshmindBrowser;p.tgLayout.stop();p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();
    const {FreshNode,FreshEdge,FreshGraph}=await import('/src/fm/index.ts');
    p.getRfc().setFocus(null);const graph=new FreshGraph();
    const a=new FreshNode('edit-a','Alpha',{type:'concept',position:{x:-140,y:-55}}),b=new FreshNode('edit-b','Beta',{type:'concept',position:{x:100,y:70}});
    graph.addNode(a);graph.addNode(b);graph.addEdge(new FreshEdge(a,b,{id:'edit-edge',label:'connects'}));
    graph.addEdge(new FreshEdge(a,b,{id:'edit-parallel',label:'parallel'}));
    graph.addEdge(new FreshEdge(b,b,{id:'edit-loop',label:'loop'}));
    graph.addEdge(new FreshEdge(a,b,{id:'edit-empty',label:''}));
    p.setGraphEltSet(graph);p.getGES().addAll();p.setZoom(1);p.setCanvasZoom(1);p.setHyperbolic(0);p.setRotation(0);p.centerView();p.setSelect(a);p.repaintAfterMove();
  });
  await selectChoice(page.locator('#label-editing-mode'),'in-place');return errors;
}
const node=page=>page.locator('[data-node-id="edit-a"] .fm-label-editor');
const edge=page=>page.locator('[data-edge-id="edit-edge"] .fm-label-editor');
const values=page=>page.evaluate(()=>{const p=window.graphBrowser??window.freshmindBrowser,n=p.findNode('edit-a'),e=[...p.getAllEdges()].find(e=>e.getID()==='edit-edge');return {node:[n.getLabel(),n.getWeight()],edge:[e.getLabel(),e.getWeight()]};});

for(const url of ['/','/freshmind.html']) {
  test(`${url} editable node and edge components keep drafts and caret while layout and lenses move`,async({page},info)=>{
    const errors=await ready(page,url);await expect(page.locator('.fm-label-editor')).toHaveCount(6);
    await node(page).fill('First line\nSecond line');
    const before=await node(page).boundingBox();
    const result=await page.evaluate(()=>{
      const p=window.graphBrowser??window.freshmindBrowser,n=p.findNode('edit-a'),field=document.querySelector('[data-node-id="edit-a"] .fm-label-editor');
      field.setSelectionRange(3,7);window.testLabelField=field;
      const position=[n.x,n.y],running=p.tgLayout.isRunning?.();p.resetDamper();p.tgLayout.tick(4);
      p.setZoom(1.25);p.setHyperbolic(35);p.setRotation(.4);p.setCanvasZoom(1.15);p.setCanvasPan(24,-12);p.repaintAfterMove();
      return {same:field===document.querySelector('[data-node-id="edit-a"] .fm-label-editor'),focused:document.activeElement===field,value:field.value,range:[field.selectionStart,field.selectionEnd],moved:position[0]!==n.x||position[1]!==n.y,drag:p.getDragNode()===null,running};
    });
    expect(result).toMatchObject({same:true,focused:true,value:'First line\nSecond line',range:[3,7],moved:true,drag:true});
    expect((await values(page)).node).toEqual(['Alpha',1]);expect(await node(page).boundingBox()).not.toEqual(before);
    await node(page).press('Control+Enter');expect((await values(page)).node).toEqual(['First line\nSecond line',1]);
    const clipping=await page.locator('textarea.fm-label-editor').evaluateAll(fields=>fields.map(field=>({text:field.value,height:field.clientHeight,needed:field.scrollHeight})));
    for(const field of clipping)expect(field.needed,field.text).toBeLessThanOrEqual(field.height);
    await edge(page).fill('Typed relation =2.5');await edge(page).press('Enter');expect((await values(page)).edge).toEqual(['Typed relation',2.5]);
    await edge(page).fill('Canceled relation');await edge(page).press('Escape');expect((await values(page)).edge).toEqual(['Typed relation',2.5]);await expect(edge(page)).toHaveValue('Typed relation');
    await page.screenshot({path:info.outputPath('moving-label-components.png')});expect(errors).toEqual([]);
  });
}

test('native label input suppresses graph gestures and saves on blur with atomic weight validation',async({page})=>{
  const errors=await ready(page);
  await node(page).fill('Draft =-1');await node(page).press('Control+Enter');await expect(node(page)).toHaveAttribute('aria-invalid','true');expect((await values(page)).node).toEqual(['Alpha',1]);
  await selectChoice(page.locator('#label-editing-mode'),'on-demand');await expect(page.locator('#label-editing-mode')).toHaveValue('in-place');await expect(page.locator('#label-editing-status')).toContainText('nonnegative');
  await node(page).fill('Accepted =0');await edge(page).focus();expect((await values(page)).node).toEqual(['Accepted',0]);
  await edge(page).fill('Plain <img src=x onerror=alert(1)>');await edge(page).press('Enter');expect((await values(page)).edge[0]).toContain('<img');expect(await page.locator('#graph img').count()).toBe(0);
  await node(page).focus();const before=await page.evaluate(()=>{const p=window.graphBrowser;return [p.getFocus()?.getID(),p.getNodeCount(),p.getZoom(),p.getCanvasZoom()];});
  await node(page).press('ArrowLeft');await node(page).press('Backspace');await node(page).press('Enter');await node(page).press(' ');
  await node(page).evaluate(field=>field.dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaY:-120,cancelable:true})));
  expect(await page.evaluate(()=>{const p=window.graphBrowser;return [p.getFocus()?.getID(),p.getNodeCount(),p.getZoom(),p.getCanvasZoom()];})).toEqual(before);
  await node(page).press('Escape');await expect(page.locator('#graph svg')).toHaveAttribute('data-interaction-mode','navigate');expect(errors).toEqual([]);
});

test('typing selects text without dragging; bodies remain draggable and empty/parallel/loop relations remain editable',async({page})=>{
  const errors=await ready(page);
  await node(page).evaluate(field=>{field.focus();field.setSelectionRange(1,4);});
  await page.evaluate(()=>{window.graphBrowser.repaint();window.graphBrowser.repaint();});
  expect(await node(page).evaluate(field=>[field.selectionStart,field.selectionEnd])).toEqual([1,4]);
  const bounds=await node(page).boundingBox();
  await page.mouse.move(bounds.x+3,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width-3,bounds.y+bounds.height/2,{steps:5});await page.mouse.up();
  expect(await page.evaluate(()=>window.graphBrowser.getDragNode())).toBeNull();
  const selected=await node(page).evaluate(field=>field.selectionEnd-field.selectionStart);expect(selected).toBeGreaterThan(0);
  const shape=page.locator('[data-node-id="edit-a"] .fm-shape'),box=await shape.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+35,box.y+27,{steps:4});
  expect(await page.evaluate(()=>window.graphBrowser.getDragNode()?.getID())).toBe('edit-a');await page.mouse.up();
  for(const id of ['edit-empty','edit-parallel','edit-loop']) {
    const input=page.locator(`[data-edge-id="${id}"] .fm-label-editor`);await input.fill(`Updated ${id}`);await input.press('Enter');
    expect(await page.evaluate(id=>[...window.graphBrowser.getAllEdges()].find(e=>e.getID()===id).getLabel(),id)).toBe(`Updated ${id}`);
  }
  expect(errors).toEqual([]);
});

test('composition, external changes, source replacement and mode changes preserve ownership and discard stale drafts',async({page})=>{
  const errors=await ready(page);await node(page).focus();
  await node(page).dispatchEvent('compositionstart');await node(page).fill('Composing');await node(page).press('Control+Enter');expect((await values(page)).node).toEqual(['Alpha',1]);
  expect(await page.evaluate(()=>{try{window.graphBrowser.setLabelEditingMode('on-demand');return false;}catch{return window.graphBrowser.getLabelEditingMode()==='in-place';}})).toBe(true);
  await node(page).dispatchEvent('compositionend');await node(page).press('Escape');await expect(node(page)).toHaveValue('Alpha');
  await node(page).fill('Local draft');await page.evaluate(()=>{window.graphBrowser.findNode('edit-a').setLabel('External label');window.graphBrowser.repaint();});
  await node(page).press('Control+Enter');await expect(node(page)).toHaveAttribute('aria-invalid','true');expect((await values(page)).node).toEqual(['External label',1]);
  await node(page).press('Escape');await expect(node(page)).toHaveValue('External label');
  await node(page).fill('Stale draft');
  await page.evaluate(async()=>{
    const {FreshNode,FreshGraph}=await import('/src/fm/index.ts'),p=window.graphBrowser,old=p.findNode('edit-a'),field=document.querySelector('[data-node-id="edit-a"] .fm-label-editor');
    const graph=new FreshGraph(),replacement=new FreshNode('edit-a','New source');graph.addNode(replacement);p.setGraphEltSet(graph);p.getGES().addAll();p.repaintAfterMove();
    field.dispatchEvent(new FocusEvent('blur'));window.staleLabel=old.getLabel();
  });
  await expect(node(page)).toHaveValue('New source');expect(await page.evaluate(()=>window.staleLabel)).toBe('External label');await expect(page.locator('#label-editing-mode')).toHaveValue('in-place');
  await node(page).fill('Committed on mode switch');await page.evaluate(()=>window.graphBrowser.setLabelEditingMode('on-demand'));
  await expect(page.locator('.fm-label-editor')).toHaveCount(0);expect((await page.evaluate(()=>window.graphBrowser.findNode('edit-a').getLabel()))).toBe('Committed on mode switch');
  await expect(page.locator('[data-node-id="edit-a"] .tg-label')).toBeVisible();await expect(page.locator('#label-editing-mode')).toHaveValue('on-demand');expect(errors).toEqual([]);
});

test('F2 and weight commands use moving labels while details remain in the overlay',async({page})=>{
  const errors=await ready(page);await page.locator('#graph svg').focus();await page.keyboard.press('F2');await expect(node(page)).toBeFocused();await expect(page.locator('.inline-editor')).toHaveCount(0);
  await node(page).press('Control+g');await expect(node(page)).toHaveValue('Alpha =1.1');await node(page).press('Escape');expect((await values(page)).node).toEqual(['Alpha',1]);
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+g');await expect(node(page)).toBeFocused();await node(page).press('Control+Enter');expect((await values(page)).node).toEqual(['Alpha',1.1]);
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+Space');await expect(page.locator('#item-editor-overlay')).toBeVisible();await expect(page.getByLabel('Annotation',{exact:true})).toBeFocused();
  await page.keyboard.press('Escape');expect(errors).toEqual([]);
  await selectChoice(page.locator('#label-editing-mode'),'on-demand');await page.locator('#graph svg').focus();await page.keyboard.press('F2');
  await page.getByLabel('Inline node label',{exact:true}).fill('Retained overlay draft');
  await selectChoice(page.locator('#label-editing-mode'),'in-place');await expect(page.locator('.inline-editor')).toHaveCount(0);
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+Space');await expect(page.getByLabel('Node label',{exact:true})).toHaveValue('Retained overlay draft');await page.keyboard.press('Escape');
});

test('wrapped, empty and Unicode labels fit their moving components at small and large importance sizes',async({page})=>{
  const errors=await ready(page);
  const labels=['Long labels should wrap into several lines without hiding any of the words or the caret.', '日本語のラベルと関係のテキストを読みながら編集します。', 'A deliberatelylongunbrokenlabelthatmustwrapcorrectly', 'First\nSecond\nThird', ''];
  for(const weight of [0,1,12]) {
    await page.evaluate(weight=>{const p=window.graphBrowser;p.findNode('edit-a').setWeight(weight);p.repaintAfterMove();},weight);
    for(const label of labels) {
      await node(page).fill(label);
      const size=await node(page).evaluate(field=>({height:field.clientHeight,needed:field.scrollHeight,width:field.clientWidth,scrollWidth:field.scrollWidth}));
      expect(size.needed,`${weight}: ${label}`).toBeLessThanOrEqual(size.height);
      expect(size.scrollWidth,`${weight}: ${label}`).toBeLessThanOrEqual(size.width);
      await node(page).press('Escape');
    }
  }
  expect(errors).toEqual([]);
});

test('independent hosts and caller-owned controls keep separate modes and dispose their listeners/components',async({page})=>{
  const errors=await ready(page);
  const result=await page.evaluate(async()=>{
    const {FreshmindPanel,FreshNode,bindLabelEditingControls}=await import('/src/fm/index.ts');
    const host=document.createElement('div');host.style.cssText='position:fixed;inset:100px auto auto 350px;width:500px;height:300px';document.body.append(host);
    const p=new FreshmindPanel(host,{autoStart:false,animateLocality:false,labelEditing:'in-place'});p.addNode(new FreshNode('other','Independent'));p.repaint();
    const mode=document.createElement('select');for(const value of ['on-demand','in-place'])mode.add(new Option(value,value));
    const dispose=bindLabelEditingControls(p,{mode});const initial=[mode.value,host.querySelectorAll('.fm-label-editor').length];
    p.setLabelEditingMode('on-demand');const sync=mode.value;dispose();mode.value='in-place';mode.dispatchEvent(new Event('change'));
    const retained=p.getLabelEditingMode(),main=window.graphBrowser.getLabelEditingMode();p.destroy();
    const cleaned=[host.querySelectorAll('svg,.fm-label-edit-status,.fm-label-editor').length];host.remove();
    return {initial,sync,retained,main,cleaned};
  });
  expect(result).toEqual({initial:['in-place',1],sync:'on-demand',retained:'on-demand',main:'in-place',cleaned:[0]});expect(errors).toEqual([]);
});

test('native line-ending normalization preserves caret and untouched imported source labels',async({page})=>{
  const errors=await ready(page);
  await page.evaluate(()=>{
    const p=window.graphBrowser;p.findNode('edit-a').setLabel('First\r\nSecond =3');[...p.getAllEdges()].find(e=>e.getID()==='edit-edge').setLabel('Edge\nlabel');p.repaint();
  });
  await expect(node(page)).toHaveValue('First\nSecond =3');await expect(edge(page)).toHaveValue('Edge label');
  await node(page).focus();await node(page).evaluate(field=>field.setSelectionRange(2,5));
  await page.evaluate(()=>{window.graphBrowser.repaint();window.graphBrowser.repaint();});
  expect(await node(page).evaluate(field=>[field.selectionStart,field.selectionEnd])).toEqual([2,5]);
  await edge(page).focus();await page.locator('#graph svg').focus();expect(await values(page)).toEqual({node:['First\r\nSecond =3',1],edge:['Edge\nlabel',10]});
  await node(page).focus();await page.evaluate(()=>{window.graphBrowser.findNode('edit-a').setLabel('Updated clean source');window.graphBrowser.repaint();});
  await node(page).fill('After external update');await node(page).press('Control+Enter');expect((await values(page)).node).toEqual(['After external update',1]);
  expect(errors).toEqual([]);
});
