import {selectChoice} from "../../scripts/browser-controls.mjs";
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
async function ready(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(async()=>{const p=window.graphBrowser;p.tgLayout.stop();p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.repaint();});
  await page.locator('#graph svg').focus();return errors;
}
// Reserved browser/OS accelerators cannot be reliably delivered as physical keys. Exercise
// their graph handler explicitly and exercise the advertised fallback buttons with real keys.
async function chord(page,key,shiftKey=false){return page.locator('#graph svg').evaluate((el,args)=>{
  el.focus();const event=new KeyboardEvent('keydown',{key:args.key,ctrlKey:true,shiftKey:args.shiftKey,bubbles:true,cancelable:true});el.dispatchEvent(event);return event.defaultPrevented;
},{key,shiftKey});}
test('linked creation and sibling fallbacks open immediate inline editing and preserve ambiguous graphs',async({page})=>{
  const errors=await ready(page),count=await page.evaluate(()=>window.graphBrowser.getNodeCount());
  await chord(page,'n');expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(count);
  await page.locator('#edit-mode').click();
  await page.locator('#command-add').focus();await page.keyboard.press('Enter');
  const label=page.getByLabel('Inline node label',{exact:true});await expect(label).toBeFocused();await expect(label).toHaveValue('[new]');
  expect(await page.evaluate(()=>{const p=window.graphBrowser,n=p.getSelection(),e=[...n.getEdges()][0];return [e.from.getID()===n.getID(),e.to.getID(),e.getLabel()];})).toEqual([true,'root','sub']);
  await label.fill('First child');await label.press('Control+Enter');
  await chord(page,'n',true);await expect(label).toBeFocused();
  expect(await page.evaluate(()=>[...window.graphBrowser.getSelection().getEdges()][0].to.getID())).toBe('root');await label.press('Escape');
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('root')));await chord(page,'m',true);
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(count+2);await expect(page.locator('#navigation-status')).toContainText('exactly one');
  await chord(page,'m');await expect(label).toHaveValue('[new parent]');
  expect(await page.evaluate(()=>{const n=window.graphBrowser.getSelection(),e=[...n.getEdges()][0];return [e.from.getID(),e.to===n,e.getLabel()];})).toEqual(['root',true,'super']);
  await label.press('Escape');expect(errors).toEqual([]);
});
test('local node clipboard preserves snapshots and rejects stale/cross-document reuse while native inputs keep shortcuts',async({page})=>{
  const errors=await ready(page);await page.locator('#edit-mode').click();
  await page.evaluate(()=>{const p=window.graphBrowser,n=p.findNode('root');n.setAnnotation({format:'html',text:'<p>Snapshot</p>'});n.setData({nested:[1,2]});p.setSelect(n);});
  await chord(page,'c');await expect(page.locator('#navigation-status')).toContainText('copied locally');
  await page.evaluate(()=>{const p=window.graphBrowser,n=p.findNode('root');n.setLabel('Changed later');n.setData({changed:true});p.setSelect(p.findNode('topic-0'));});
  await chord(page,'v');const label=page.getByLabel('Inline node label',{exact:true});await expect(label).toBeFocused();await expect(label).toHaveValue('Graph browsers');
  expect(await page.evaluate(()=>{const n=window.graphBrowser.getSelection();return [n.getAnnotation().text,n.getData()];})).toEqual(['<p>Snapshot</p>',{nested:[1,2]}]);
  await label.fill('Input editing');await label.press(process.platform==='darwin'?'Meta+a':'Control+a');expect(await label.evaluate(e=>e.selectionEnd-e.selectionStart)).toBe('Input editing'.length);
  await label.press('Control+Backspace');await expect(label).toBeVisible();await label.press('Escape');
  await page.evaluate(()=>{const p=window.graphBrowser,n=p.findNode('root');p.deleteNode(n);});
  await chord(page,'b');await expect(page.locator('#navigation-status')).toContainText('stale');
  await page.locator('#example-graph').selectOption('graph-search');await page.waitForFunction(()=>window.graphBrowser?.findNode('layout-1'));
  const graphCount=await page.evaluate(()=>window.graphBrowser.getNodeCount());await page.evaluate(()=>window.graphBrowser.setInteractionMode('edit'));await chord(page,'b');await expect(page.locator('#navigation-status')).toContainText('another document');
  await chord(page,'v');await expect(label).toBeFocused();expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(graphCount+1);
  expect(errors).toEqual([]);
});
test('reopening focus is independent of view and new-document replacement requires explicit discard',async({page})=>{
  const errors=await ready(page);await page.locator('#edit-mode').click();await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('topic-0')));await chord(page,'j');
  await expect(page.locator('#file-status')).toContainText('Reopening focus:');
  await page.locator('#options-toggle').click();await page.locator('#save-view').uncheck();await page.getByRole('button',{name:'Close options',exact:true}).click();const downloadEvent=page.waitForEvent('download');await page.locator('#save-graph').click();const download=await downloadEvent;
  const yaml=await readFile(await download.path(),'utf8');expect(yaml).toContain('initialFocus: topic-0');expect(yaml).not.toContain('\nview:');
  await page.locator('#open-graph-files').setInputFiles({name:'reopen.fm.yaml',mimeType:'application/yaml',buffer:Buffer.from(yaml)});
  await expect.poll(()=>page.evaluate(()=>window.graphBrowser.getSelect()?.getID())).toBe('topic-0');
  const before=await page.evaluate(()=>window.graphBrowser.getNodeCount());await chord(page,'a');const dialog=page.getByRole('dialog',{name:'Create new graph'});await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(before);
  await page.locator('#new-graph').click();const backup=page.waitForEvent('download');await dialog.getByRole('button',{name:'Download current graph',exact:true}).click();await backup;await expect(dialog).toBeVisible();
  await dialog.getByRole('button',{name:'Discard and create new graph',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(0);
  await expect(page.locator('#save-name')).toHaveValue('untitled.fm.yaml');expect(await page.evaluate(()=>window.graphBrowser.getSelection())).toBe(null);expect(errors).toEqual([]);
});
test('moving-label creation keeps editor focus and graph commands respect composition and relation selection',async({page})=>{
  const errors=await ready(page);await page.locator('#edit-mode').click();await selectChoice(page.locator('#label-editing-mode'),'in-place');
  await page.locator('#command-parent').focus();await page.keyboard.press('Enter');
  const id=await page.evaluate(()=>window.graphBrowser.getSelection().getID()),field=page.locator(`[data-node-id="${id}"] .fm-label-editor`);
  await expect(field).toBeFocused();await expect(field).toHaveValue('[new parent]');await field.fill('Moving child');await field.press('Control+Enter');
  await page.evaluate(()=>{const p=window.graphBrowser;p.setSelectEdge([...p.getSelection().getEdges()][0]);});const count=await page.evaluate(()=>window.graphBrowser.getNodeCount());
  await chord(page,'n');expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(count);await expect(page.locator('#navigation-status')).toContainText('Select a node');
  await page.locator('#graph svg').press('u');expect(await page.evaluate(()=>window.graphBrowser.getSelectEdge())).toBe(null);
  expect(await page.locator('#graph svg').evaluate(el=>{const e=new KeyboardEvent('keydown',{key:'n',ctrlKey:true,isComposing:true,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;})).toBe(false);
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(count);expect(errors).toEqual([]);
});
