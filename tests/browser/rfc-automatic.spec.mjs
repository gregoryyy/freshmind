import {test,expect} from '@playwright/test';
async function ready(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>Boolean(window.graphBrowser));
  await page.evaluate(async()=>{
    const api=await import('/src/fm/index.ts'),{automaticRfcFixture}=await import('/tests/fixtures/automatic-rfc.mjs'),p=window.graphBrowser;
    p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();
    p.setGraphEltSet(automaticRfcFixture(api));p.getGES().addAll();p.setSelect(p.findNode('r'));p.getRfc().setFocus(p.findNode('r'));p.repaint();
  });
  await page.getByText('Reinforcement Focus + Context',{exact:true}).click();
  return errors;
}
async function depth(page,value){
  const radio=page.locator(`#rfc-neighborhood-depth-choices input[value="${value}"]`);
  if(await radio.count())await radio.check();else await page.locator('#rfc-neighborhood-depth').selectOption(value);
}
test('automatic two-level control reinforces both neighborhoods without editing data or transforms',async({page})=>{
  const errors=await ready(page);
  const snapshot=()=>page.evaluate(async()=>{const {captureDocument,documentToRecord}=await import('/src/fm/index.ts');return documentToRecord(captureDocument(window.graphBrowser),{includeView:false});});
  const before=await snapshot();await depth(page,'2');
  await expect(page.locator('#rfc-status')).toContainText('5 automatic two-level members');
  await expect(page.locator('.fm-rfc-node-halo')).toHaveCount(5);await expect(page.locator('.fm-rfc-edge-halo')).toHaveCount(4);
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode('x')));
  await page.locator('#rfc-add-center').click();
  await expect(page.locator('#rfc-status')).toContainText('2 centers · 7 reinforced nodes');
  await expect(page.locator('.fm-rfc-node-halo')).toHaveCount(7);await expect(page.locator('.fm-rfc-edge-halo')).toHaveCount(6);
  expect(await snapshot()).toEqual(before);
  const movement=await page.evaluate(()=>{
    const p=window.graphBrowser,before={zoom:p.getZoom(),canvas:p.getCanvasZoom(),hyper:p.getHyperbolic()},nodes=[...p.getCompleteEltSet().getNodes()].map(n=>[n,n.x,n.y]);
    p.tgLayout.tick(40);p.repaint();
    return {finite:nodes.every(([n])=>Number.isFinite(n.x)&&Number.isFinite(n.y)),moved:nodes.some(([n,x,y])=>n.x!==x||n.y!==y),sameView:JSON.stringify(before)===JSON.stringify({zoom:p.getZoom(),canvas:p.getCanvasZoom(),hyper:p.getHyperbolic()})};
  });expect(movement).toEqual({finite:true,moved:true,sameView:true});
  await depth(page,'1');await expect(page.locator('.fm-rfc-node-halo')).toHaveCount(5);
  // External changes synchronize the caller-owned control as well.
  await page.evaluate(()=>window.graphBrowser.getRfc().setNeighborhoodDepth(2));await expect(page.locator('#rfc-neighborhood-depth')).toHaveValue('2');
  expect(errors).toEqual([]);
});
test('automatic focus follows graph replacement and search retains an explicit result star',async({page})=>{
  const errors=await ready(page);await depth(page,'2');
  await page.evaluate(()=>{window.graphBrowser.findNode('a').setLabel('amber crystal');document.querySelector('#search-section').open=true;});
  await page.locator('#search-query').fill('amber');await page.locator('#search-run').click();
  await expect(page.locator('#search-status')).toContainText('1 result linked');
  const result=await page.evaluate(async()=>{
    const p=window.graphBrowser,search=p.getRfc().getState();
    const api=await import('/src/fm/index.ts'),{automaticRfcFixture}=await import('/tests/fixtures/automatic-rfc.mjs');
    p.setGraphEltSet(automaticRfcFixture(api));p.getGES().addAll();p.getRfc().setFocus(p.findNode('x'));p.repaint();
    return {searchKind:search.centers[0]?.kind,searchCount:search.memberIds.length,after:p.getRfc().getState()};
  });
  expect(result.searchKind).toBe('star');expect(result.searchCount).toBe(2);expect(result.after).toMatchObject({neighborhoodDepth:2,focusId:'x'});
  expect(new Set(result.after.memberIds)).toEqual(new Set(['x','t','a','f']));expect(errors).toEqual([]);
});
