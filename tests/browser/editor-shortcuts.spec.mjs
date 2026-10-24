import {test,expect} from '@playwright/test';
async function ready(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(async()=>{const p=window.graphBrowser;p.tgLayout.stop();p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.repaint();});
  await page.locator('#graph svg').focus();return errors;
}
test('inline node and relation weight commands commit atomically and cancel without changing model weights',async({page},info)=>{
  const errors=await ready(page),label=page.getByLabel('Inline node label',{exact:true}),weight=page.getByLabel('Node weight',{exact:true});
  await page.keyboard.press('F2');await label.fill('Weighted root =3.5');await label.press('Control+Enter');
  const node=()=>page.evaluate(()=>{const n=window.graphBrowser.findNode('root');return [n.getLabel(),n.getWeight()];});expect(await node()).toEqual(['Weighted root',3.5]);
  await page.keyboard.press('Control+g');await expect(weight).toHaveValue('3.6');expect(await node()).toEqual(['Weighted root',3.5]);
  await page.getByRole('button',{name:'Increase weight',exact:true}).press('Enter');await expect(weight).toHaveValue('3.7');await weight.press('Escape');expect(await node()).toEqual(['Weighted root',3.5]);
  await page.keyboard.press('F2');await label.fill('Invalid =-1');await label.press('Control+Enter');await expect(page.locator('.inline-status')).toHaveAttribute('data-error','true');expect(await node()).toEqual(['Weighted root',3.5]);
  await label.fill('Kept label');await weight.fill('0');await weight.press('Control+Enter');expect(await node()).toEqual(['Kept label',0]);
  await page.evaluate(()=>{const p=window.graphBrowser;p.setSelectEdge([...p.getAllEdges()][0]);});await page.locator('#graph svg').focus();await page.keyboard.press('Control+g');
  const relation=page.getByLabel('Inline relation label',{exact:true}),edgeWeight=page.getByLabel('Relation weight',{exact:true});await expect(edgeWeight).toHaveValue('11');
  await page.getByRole('button',{name:'Increase weight',exact:true}).press('Enter');await expect(edgeWeight).toHaveValue('12');expect(await page.evaluate(()=>window.graphBrowser.getSelectEdge().getWeight())).toBe(10);
  await relation.fill('Explicit relation =2.25');await relation.press('Enter');
  expect(await page.evaluate(()=>{const e=window.graphBrowser.getSelectEdge();return [e.getLabel(),e.getWeight()];})).toEqual(['Explicit relation',2.25]);
  await page.keyboard.press('F2');await edgeWeight.fill('');await relation.press('Enter');await expect(relation).toBeVisible();
  expect(await page.evaluate(()=>window.graphBrowser.getSelectEdge().getWeight())).toBe(2.25);await relation.press('Escape');
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('root')));await page.locator('#graph svg').focus();await page.keyboard.press('F2');
  await page.screenshot({path:info.outputPath('label-weight-overlay.png')});expect(errors).toEqual([]);
});
test('direct details shortcuts open the modeless overlay, retain closed drafts and fit narrow screens',async({page},info)=>{
  const errors=await ready(page),dialog=page.getByRole('dialog',{name:'Edit selected item',exact:true}),annotation=page.getByLabel('Annotation',{exact:true});
  expect(await page.locator('.sidebar #selection-editor').count()).toBe(0);await page.locator('#selection-section').evaluate(e=>e.open=false);
  await page.keyboard.press('Control+Space');await expect(dialog).toBeVisible();await expect(annotation).toBeFocused();expect(await dialog.evaluate(e=>e.matches(':modal'))).toBe(false);
  await annotation.fill('A retained details draft');await page.getByRole('button',{name:'Close item editor',exact:true}).click();await expect(dialog).not.toBeVisible();
  await page.keyboard.press('Shift+F2');await expect(annotation).toBeFocused();await expect(annotation).toHaveValue('A retained details draft');
  await annotation.press('Control+Enter');expect(await page.evaluate(()=>window.graphBrowser.findNode('root').getAnnotation().text)).toBe('A retained details draft');
  await page.setViewportSize({width:390,height:844});await page.locator('#graph svg').focus();await page.keyboard.press('Control+Space');
  const b=await dialog.boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(390);expect(b.y+b.height).toBeLessThanOrEqual(844);
  await annotation.fill('Canceled');await page.screenshot({path:info.outputPath('details-overlay-mobile.png')});await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(()=>window.graphBrowser.findNode('root').getAnnotation().text)).toBe('A retained details draft');expect(errors).toEqual([]);
});

test('details edits preserve imported literal numeric suffixes and an empty graph leaves a closable disabled overlay',async({page})=>{
  const errors=await ready(page);await page.evaluate(()=>{const p=window.graphBrowser,n=p.findNode('root');n.setLabel('Equation =3');p.setSelect(null);p.setSelect(n);});
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+Space');
  await page.getByLabel('Annotation',{exact:true}).fill('Only details changed');await page.keyboard.press('Control+Enter');
  expect(await page.evaluate(()=>{const n=window.graphBrowser.findNode('root');return [n.getLabel(),n.getWeight()];})).toEqual(['Equation =3',1]);
  await page.keyboard.press('Control+Space');await page.evaluate(()=>window.graphBrowser.clearAll());
  await expect(page.getByLabel('Node label',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Close item editor',exact:true}).click();
  await expect(page.locator('#item-editor-overlay')).not.toBeVisible();await expect(page.locator('#graph svg')).toBeFocused();expect(errors).toEqual([]);
});
