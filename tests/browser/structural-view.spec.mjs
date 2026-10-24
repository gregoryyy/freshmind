import {test,expect} from '@playwright/test';

async function ready(page) {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);await page.evaluate(()=>window.graphBrowser.tgLayout.stop());
  await page.locator('#example-graph').selectOption('structural-focus-context');await expect(page.locator('#file-status')).toContainText('13 nodes, 13 relations');
  await page.evaluate(async()=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();});
  await page.locator('#structural-section > summary').click();return errors;
}
async function enable(page) {
  await page.getByLabel('Aggregate leaf types',{exact:true}).selectOption(['person','paper']);
  await page.getByLabel('Enable structural view',{exact:true}).check();
}

test('typed aggregation preserves labels and graph data, exposes parent counts, and reveals through controls and E',async({page},info)=>{
  const errors=await ready(page),before=await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.getLabel(),n.x,n.y]));
  await enable(page);await expect(page.locator('#structural-status')).toContainText('6 of 13 neighborhood nodes shown; 7 aggregated');
  await expect(page.locator('.fm-aggregation-count')).toHaveCount(3);
  const groups=await page.evaluate(()=>window.graphBrowser.getStructuralView().getState().groups);
  expect(groups.find(g=>g.parentId==='beta'&&g.type==='person').nodeIds).toEqual(['bea','ben']);
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.getLabel(),n.x,n.y]))).toEqual(before);
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('beta')));
  await page.getByRole('button',{name:'Reveal selected parent’s leaves',exact:true}).click();await expect(page.locator('#structural-status')).toContainText('9 of 13');
  await page.getByLabel('Detail radius around centers',{exact:true}).fill('0');await page.getByLabel('Detail radius around centers',{exact:true}).blur();
  await page.evaluate(()=>{const p=window.graphBrowser;p.setSelect(p.findNode('alpha'));p.focusGraph();});await page.keyboard.press('e');
  await expect(page.locator('[data-node-id="alice"]')).toBeVisible();
  await page.getByRole('button',{name:'Reset structural view',exact:true}).click();await expect(page.locator('.tg-node')).toHaveCount(13);
  await expect(page.getByLabel('Enable structural view',{exact:true})).not.toBeChecked();await expect(page.locator('.fm-aggregation-count')).toHaveCount(0);
  expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('structural-restored.png')});
});

test('aggregation composes with multiple RFC structures and lenses, while explicit filters suspend hidden centers',async({page},info)=>{
  const errors=await ready(page);await enable(page);
  await page.evaluate(()=>window.graphBrowser.getRfc().activateSubstructure('a-detail'));
  await expect(page.locator('.tg-node')).toHaveCount(9);
  await page.evaluate(()=>window.graphBrowser.getRfc().activateSubstructure('b-detail',true));await expect(page.locator('.tg-node')).toHaveCount(13);
  await page.evaluate(()=>window.graphBrowser.getRfc().removeFocus('project-b'));await expect(page.locator('.tg-node')).toHaveCount(9);
  const positions=await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]));
  await page.evaluate(()=>{const p=window.graphBrowser;p.setZoom(1.2);p.setHyperbolic(45);p.setRotation(.3);p.setCanvasZoom(1.1);p.getRfc().configureExclusion({enabled:true});p.repaint();});
  const decorations=await page.locator('.fm-aggregation-count').evaluateAll(items=>items.map(e=>{
    const n=window.graphBrowser.findNode(e.dataset.forNode);return {x:Number(e.getAttribute('x')),y:Number(e.getAttribute('y')),expectedX:n.drawx,expectedY:n.drawy+n.getHeight()/2+32,
      nested:!!e.closest('.tg-node'),pointer:getComputedStyle(e).pointerEvents};
  }));
  for(const d of decorations){expect(d.x).toBeCloseTo(d.expectedX,5);expect(d.y).toBeCloseTo(d.expectedY,5);expect(d.nested).toBe(false);expect(d.pointer).toBe('none');}
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]))).toEqual(positions);
  await page.screenshot({path:info.outputPath('hybrid-structural-rfc-lens.png')});
  await page.locator('#structural-section details > summary').click();await page.getByLabel('Hide node types',{exact:true}).selectOption(['project']);
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().active)).toBe(false);
  await expect(page.locator('[data-node-id="project-a"]')).toHaveCount(0);
  await page.getByRole('button',{name:'Reset structural view',exact:true}).click();expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().active)).toBe(true);
  expect(errors).toEqual([]);
});

test('controls include unknown semantic IDs, validate atomically, reset on document load and release owned listeners',async({page})=>{
  const errors=await ready(page);await enable(page);
  await page.evaluate(()=>{const p=window.graphBrowser;p.findNode('alice').setSemanticType('custom actor');p.repaintAfterMove();});
  await expect(page.locator('#structural-aggregate-types option[value="custom actor"]')).toHaveCount(1);
  await page.getByLabel('Detail radius around centers',{exact:true}).fill('9');await page.getByLabel('Detail radius around centers',{exact:true}).blur();
  expect(await page.locator('#structural-detail-radius').evaluate(e=>e.validationMessage)).toContain('Detail radius');
  expect(await page.evaluate(()=>window.graphBrowser.getStructuralView().getState().settings.detailRadius)).toBe(1);
  await page.getByLabel('Detail radius around centers',{exact:true}).fill('2');await page.getByLabel('Detail radius around centers',{exact:true}).blur();
  const result=await page.evaluate(async()=>{
    const {bindStructuralViewControls}=await import('/src/fm/ui/structural-view.ts'),p=window.graphBrowser;
    const e={enabled:document.createElement('input'),hiddenNodeTypes:document.createElement('select'),hiddenRelationTypes:document.createElement('select'),aggregateTypes:document.createElement('select'),
      detailRadius:document.createElement('input'),reveal:document.createElement('button'),reset:document.createElement('button'),status:document.createElement('p')};
    e.enabled.type='checkbox';e.detailRadius.type='number';for(const field of ['hiddenNodeTypes','hiddenRelationTypes','aggregateTypes'])e[field].multiple=true;
    const dispose=bindStructuralViewControls(p,e);p.getStructuralView().configure({detailRadius:3});const synchronized=e.detailRadius.value;dispose();
    e.enabled.checked=false;e.enabled.dispatchEvent(new Event('change'));e.reset.click();
    return {synchronized,settings:p.getStructuralView().getState().settings};
  });
  expect(result.synchronized).toBe('3');expect(result.settings.enabled).toBe(true);
  await page.locator('#example-graph').selectOption('florentine');await expect(page.locator('#file-status')).toContainText('florentine.fm.yaml');
  await expect(page.getByLabel('Enable structural view',{exact:true})).not.toBeChecked();expect(await page.evaluate(()=>window.graphBrowser.getStructuralView().getState().settings.aggregateTypes)).toEqual([]);
  expect(errors).toEqual([]);
});

test('relation editing reconnects to aggregated targets without losing selection or source membership',async({page})=>{
  const errors=await ready(page);await enable(page);
  await page.evaluate(()=>{const p=window.graphBrowser;p.setSelectEdge([...p.getAllEdges()].find(e=>e.getID()==='relation-1'));});
  await page.locator('#edit-item').click();await page.locator('#edge-to').fill('bea');await page.locator('#save-item').click();
  await expect(page.locator('#editor-status')).toHaveText('Changes saved.');
  const result=await page.evaluate(()=>{
    const p=window.graphBrowser,e=[...p.getAllEdges()].find(e=>e.getID()==='relation-1');
    return {selected:p.getSelectEdge()?.getID(),to:e.to.getID(),source:p.getUnfilteredLocality().contains(e),visible:p.getGES().contains(e),count:p.getEdgeCount()};
  });
  expect(result).toEqual({selected:'relation-1',to:'bea',source:true,visible:true,count:13});
  await page.getByRole('button',{name:'Reset structural view',exact:true}).click();
  expect(await page.evaluate(()=>window.graphBrowser.getSelectEdge()?.getID())).toBe('relation-1');expect(errors).toEqual([]);
});
