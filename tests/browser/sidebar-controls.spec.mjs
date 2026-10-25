import {test,expect} from '@playwright/test';
import {fillNumeric,selectChoice} from '../../scripts/browser-controls.mjs';
async function ready(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);return errors;}
async function open(page,...ids){await page.locator('.sidebar > details').evaluateAll((items,ids)=>items.forEach(e=>e.open=ids.includes(e.id)),ids);}

test('all numeric sidebar settings use labeled sliders, including precise search parameters and default distance',async({page})=>{
  const errors=await ready(page);const models=page.locator('.sidebar input[type=number]');expect(await models.count()).toBeGreaterThan(20);
  expect(await models.evaluateAll(items=>items.every(e=>e.hidden&&e.dataset.sliderId&&document.getElementById(e.dataset.sliderId)?.type==='range'))).toBe(true);
  await expect(page.locator('.sidebar').getByRole('spinbutton')).toHaveCount(0);
  await open(page,'rfc-section');const stiffness=page.getByRole('slider',{name:'Radial stiffness',exact:true});await stiffness.focus();await stiffness.press('Home');await stiffness.press('ArrowRight');
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().settings.radialStiffness)).toBe(.1);await expect(page.locator('#rfc-radial-value')).toHaveText('0.1');
  // External configuration/presets update the readout and scalar without losing precision.
  await page.evaluate(()=>window.graphBrowser.getRfc().configure({radialLength:157.5}));await expect(page.locator('#rfc-length-value')).toHaveText('157.5');await expect(page.locator('#rfc-length-slider')).toHaveAttribute('aria-valuetext','157.5');
  await open(page,'search-section');await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);
  const seed=page.getByRole('slider',{name:'Random seed',exact:true});await seed.focus();await seed.press('ArrowRight');await expect(page.locator('#search-seed')).toHaveValue('4358');await expect(page.locator('#search-seed-value')).toHaveText('4358');
  await fillNumeric(page.getByRole('slider',{name:'Document topic prior',exact:true}),'0.0001');await expect(page.locator('#search-alpha')).toHaveValue('0.0001');
  const frequency=page.getByRole('slider',{name:'Minimum document frequency',exact:true});await fillNumeric(frequency,'1000');await frequency.press('ArrowRight');await expect(page.locator('#search-min-df')).toHaveValue('1001');
  const custom=page.locator('#search-distance-custom');await expect(custom).toBeDisabled();await expect(page.locator('#search-distance-value')).toHaveText('Default');
  await selectChoice(page.locator('#search-engine'),'lda');await expect(custom).toBeEnabled();await custom.check();await expect(page.locator('#search-distance')).toHaveValue('0.6');await custom.uncheck();await expect(page.locator('#search-distance')).toHaveValue('');
  await selectChoice(page.locator('#search-kind'),'tags');await expect(custom).toBeDisabled();await expect(page.locator('#search-distance-slider')).toBeDisabled();expect(errors).toEqual([]);
});

test('slider pointer input commits continuously through motion and teardown removes retired controls',async({page})=>{
  const errors=await ready(page);await open(page,'rfc-section');const slider=page.getByRole('slider',{name:'Radial stiffness',exact:true});await slider.scrollIntoViewIfNeeded();
  const box=await slider.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height/2,{steps:4});
  const during=await page.evaluate(()=>window.graphBrowser.getRfc().getState().settings.radialStiffness);expect(during).toBeGreaterThan(1);
  await page.evaluate(()=>{window.graphBrowser.tgLayout.tick();window.graphBrowser.repaintAfterMove();});await page.mouse.up();
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().settings.radialStiffness)).toBe(during);await expect(slider).toBeFocused();
  await slider.evaluate(e=>window.retiredSlider=e);const saved=await page.locator('#rfc-radial').inputValue();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('.numeric-slider')).toHaveCount(0);await page.evaluate(()=>{window.retiredSlider.value='0';window.retiredSlider.dispatchEvent(new Event('input',{bubbles:true}));});await expect(page.locator('#rfc-radial')).toHaveValue(saved);expect(errors).toEqual([]);
});

async function clickType(page,select,id,add=false){
  const option=select.locator(`option[value="${id}"]`);await option.evaluate(e=>e.scrollIntoView({block:'nearest'}));
  const box=await option.boundingBox();const modifier=process.platform==='darwin'?'Meta':'Control';if(add)await page.keyboard.down(modifier);
  await page.mouse.move(box.x+Math.min(box.width/2,60),box.y+box.height/2);await page.mouse.down();
  await page.evaluate(()=>{window.graphBrowser.tgLayout.tick();window.graphBrowser.repaintAfterMove();});await page.mouse.up();if(add)await page.keyboard.up(modifier);
}

test('first structural type click and modifier selection survive repaints before native change commits',async({page})=>{
  const errors=await ready(page);await open(page,'structural-section');await page.locator('#structural-enabled').check();const select=page.getByLabel('Aggregate leaf types',{exact:true});
  // Force the relevant interleaving deterministically, including platforms that emit input/change in one task.
  await select.evaluate(e=>e.addEventListener('input',()=>window.graphBrowser.repaintAfterMove(),true));
  await clickType(page,select,'person');await expect.poll(()=>page.evaluate(()=>window.graphBrowser.getStructuralView().getState().settings.aggregateTypes)).toEqual(['person']);
  await clickType(page,select,'paper',true);await expect.poll(()=>page.evaluate(()=>window.graphBrowser.getStructuralView().getState().settings.aggregateTypes.slice().sort())).toEqual(['paper','person']);
  await expect(select).toBeFocused();await page.evaluate(()=>window.graphBrowser.repaintAfterMove());
  expect(await select.evaluate(e=>[...e.selectedOptions].map(o=>o.value).sort())).toEqual(['paper','person']);
  await page.evaluate(()=>window.graphBrowser.getStructuralView().configure({aggregateTypes:['topic']}));expect(await select.evaluate(e=>[...e.selectedOptions].map(o=>o.value))).toEqual(['topic']);expect(errors).toEqual([]);
});

test('horizontal radio groups retain setting ownership and dynamic inventories without losing keyboard focus',async({page})=>{
  const errors=await ready(page);await open(page,'search-section');const method=page.getByRole('group',{name:'Search method',exact:true});
  await expect(method.getByRole('radio')).toHaveCount(2);await method.getByRole('radio',{name:'LDA topics',exact:true}).check();await expect(page.locator('#search-engine')).toHaveValue('lda');
  await expect(page.locator('#search-distance-custom')).toBeEnabled();await method.getByRole('radio',{name:'LDA topics',exact:true}).press('ArrowLeft');await expect(page.locator('#search-engine')).toHaveValue('lexical');
  await expect(method.getByRole('radio',{name:'Lexical',exact:true})).toBeFocused();await page.evaluate(()=>window.graphBrowser.repaintAfterMove());await expect(method.getByRole('radio',{name:'Lexical',exact:true})).toBeFocused();
  await open(page,'files-section');await expect(page.locator('#example-graph')).toBeVisible();
  await open(page,'rfc-section');const centers=page.getByRole('group',{name:'RFC centers',exact:true});await expect(centers.getByRole('radio')).toHaveCount(1);
  await page.evaluate(()=>{const p=window.graphBrowser;p.getRfc().addFocus(p.findNode('topic-0'));});await expect(centers.getByRole('radio')).toHaveCount(2);
  await centers.getByRole('radio',{name:'Layout (star)',exact:true}).check();await expect(page.locator('#rfc-centers')).toHaveValue('topic-0');
  const before=await page.evaluate(()=>window.graphBrowser.getRfc().getState().centers.map(c=>c.focusId));await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(page.locator('.choice-control')).toHaveCount(0);expect(before).toHaveLength(2);expect(errors).toEqual([]);
});

test('controls retract and reopen with retained settings; quick search reveals them and narrow screens stay usable',async({page})=>{
  const errors=await ready(page);await page.getByRole('button',{name:'Pause motion',exact:true}).click();await open(page,'search-section');await page.locator('#search-query').fill('retained text');
  await page.locator('.sidebar').evaluate(e=>e.scrollTop=100);const scroll=await page.locator('.sidebar').evaluate(e=>e.scrollTop);expect(scroll).toBeGreaterThan(0);
  const before=await page.evaluate(()=>({positions:[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]),width:document.querySelector('#graph').getBoundingClientRect().width}));
  await page.getByRole('button',{name:'Hide controls',exact:true}).click();await expect(page.locator('.sidebar')).not.toBeVisible();await expect(page.getByRole('button',{name:'Show controls',exact:true})).toHaveAttribute('aria-expanded','false');
  await expect.poll(()=>page.locator('#graph').evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(before.width);
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]))).toEqual(before.positions);
  await page.getByRole('button',{name:'Show controls',exact:true}).press('Enter');await expect(page.locator('#search-query')).toHaveValue('retained text');await expect(page.locator('#search-section')).toHaveAttribute('open','');expect(await page.locator('.sidebar').evaluate(e=>e.scrollTop)).toBe(scroll);
  await page.getByRole('button',{name:'Hide controls',exact:true}).click();await page.locator('#graph svg').focus();await page.keyboard.press('/');await expect(page.locator('.sidebar')).toBeVisible();await expect(page.locator('#search-query')).toBeFocused();
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Hide controls',exact:true}).click();await expect(page.getByRole('button',{name:'Show controls',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.getByRole('button',{name:'Show controls',exact:true}).click();await expect(page.getByRole('group',{name:'Search method',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
