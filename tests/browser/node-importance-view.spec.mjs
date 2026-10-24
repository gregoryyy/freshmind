import {test,expect} from '@playwright/test';

async function ready(page) {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(async()=>{
    const p=window.graphBrowser;p.tgLayout.stop();p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();
    const {FreshNode,FreshEdge,FreshGraph}=await import('/src/fm/index.ts'),g=new FreshGraph();
    for(const [i,weight] of [0,.25,1,9,Number.MAX_VALUE].entries())g.addNode(new FreshNode(`n${i}`,'Same label',{type:'idea',weight,position:{x:(i-2)*170,y:0}}));
    for(let i=0;i<4;i++)g.addEdge(new FreshEdge(g.findNode(`n${i}`),g.findNode(`n${i+1}`),{id:`e${i}`,label:'relates'}));
    p.setGraphEltSet(g);p.getGES().addAll();p.setSelect(g.findNode('n2'));p.getRfc().setFocus(g.findNode('n2'));p.setHyperbolic(0);p.setZoom(.85);p.centerView();p.repaintAfterMove();
  });
  await page.getByText('Node importance',{exact:true}).click();return errors;
}
const metrics=page=>page.evaluate(()=>[...document.querySelectorAll('.fm-node')].map(e=>{
  const n=window.graphBrowser.findNode(e.dataset.nodeId),m=e.querySelector('.tg-label').transform.baseVal.consolidate()?.matrix;
  return {id:n.getID(),width:n.getWidth(),height:n.getHeight(),scale:Number(e.dataset.importanceScale),textScale:m?.a,label:e.querySelector('.tg-label').textContent};
}));

test('weight scales body and glyphs within bounds, keeps zero visible and exposes exact values outside focus bounds',async({page},info)=>{
  const errors=await ready(page),scaled=await metrics(page);expect(scaled.map(n=>n.scale)).toEqual([.85,.91,1,1.4,1.5]);
  for(const n of scaled){expect(n.textScale).toBeCloseTo(n.scale,6);expect(n.label).toBe('Same label');}
  await page.getByLabel('Importance display',{exact:true}).selectOption('none');const uniform=await metrics(page);
  for(let i=0;i<scaled.length;i++){expect(scaled[i].width/uniform[i].width).toBeCloseTo(scaled[i].scale,6);expect(scaled[i].height/uniform[i].height).toBeCloseTo(scaled[i].scale,6);}
  await page.getByLabel('Importance display',{exact:true}).selectOption('size');await page.getByLabel('Show node weight values',{exact:true}).check();
  await expect(page.locator('.fm-node-weight')).toHaveCount(5);await expect(page.locator('[data-weight-node="n0"]')).toHaveText('w: 0');
  await expect(page.locator('[data-node-id="n3"]')).toHaveAccessibleName(/weight 9/);
  const result=await page.locator('[data-node-id="n3"]').evaluate(e=>({body:e.querySelector('.fm-shape').getBBox().width,group:e.getBBox().width,nested:!!e.querySelector('.fm-node-weight')}));
  expect(result.group).toBeCloseTo(result.body,5);expect(result.nested).toBe(false);
  await expect(page.locator('.fm-halo')).toHaveCount(0);await expect(page.locator('.fm-rfc-node-halo')).toHaveCount(3);
  const finite=await page.locator('svg path').evaluateAll(paths=>paths.every(p=>!/NaN|Infinity/.test(p.getAttribute('d')??'')));expect(finite).toBe(true);
  await page.screenshot({path:info.outputPath('bounded-node-importance.png')});expect(errors).toEqual([]);
});

test('importance edits update measured shapes, focus, curved-edge clipping and lenses without changing physical positions',async({page},info)=>{
  const errors=await ready(page);
  const before=await page.evaluate(()=>{const p=window.graphBrowser;p.findNode('n3').setVisual({style:{shape:'ellipse'}});p.setSelect(p.findNode('n3'));p.repaint();return {positions:[...p.getAllNodes()].map(n=>[n.x,n.y]),width:p.findNode('n3').getWidth()};});
  await page.getByLabel('Weight',{exact:true}).fill('0');await page.getByRole('button',{name:'Save changes',exact:true}).click();
  const edited=await page.evaluate(()=>{
    const p=window.graphBrowser,n=p.findNode('n3'),e=[...p.getAllEdges()].find(e=>e.getID()==='e2'),g=p.getEdgeGeometry(e);
    return {width:n.getWidth(),scale:document.querySelector('[data-node-id="n3"]').dataset.importanceScale,hit:n.containsPoint(n.drawx+n.getWidth()/2+1,n.drawy),path:g.path};
  });
  expect(edited.width/before.width).toBeCloseTo(.85/1.4,6);expect(edited.scale).toBe('0.85');expect(edited.hit).toBe(false);expect(edited.path).not.toMatch(/NaN|Infinity/);
  await page.evaluate(()=>{const p=window.graphBrowser;p.configureNodeImportance({showValues:true});p.setHyperbolic(60);p.setRotation(.4);p.setCanvasZoom(1.2);p.repaint();});
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]))).toEqual(before.positions);
  await page.locator('[data-node-id="n3"]').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-focus-node="n3"]')).toHaveAttribute('d',/ A /);
  expect(await page.locator('[data-weight-node="n3"]').evaluate(e=>getComputedStyle(e).pointerEvents)).toBe('none');
  await page.screenshot({path:info.outputPath('importance-focus-lenses.png')});expect(errors).toEqual([]);
});

test('configured type/item styles, uniform and legacy modes remain separate from RFC and reusable controls dispose cleanly',async({page})=>{
  const errors=await ready(page);
  const state=await page.evaluate(async()=>{
    const p=window.graphBrowser,n=p.findNode('n3');n.setVisual({style:{importance:{mode:'none',maxScale:2}}});p.repaintAfterMove();
    const configured=Number(document.querySelector('[data-node-id="n3"]').dataset.importanceScale);p.configureNodeImportance({mode:'size'});
    const overridden=Number(document.querySelector('[data-node-id="n3"]').dataset.importanceScale);
    const {bindNodeImportanceControls}=await import('/src/fm/ui/node-importance.ts'),mode=document.createElement('select'),values=document.createElement('input');values.type='checkbox';
    for(const value of ['configured','size','none','legacy']){const o=document.createElement('option');o.value=value;mode.append(o);}
    const dispose=bindNodeImportanceControls(p,{mode,showValues:values});p.configureNodeImportance({mode:'legacy',showValues:true});
    const sync=[mode.value,values.checked];dispose();mode.value='none';mode.dispatchEvent(new Event('change'));values.checked=false;values.dispatchEvent(new Event('change'));
    const legacy=[...document.querySelectorAll('.fm-halo')].map(e=>[Number(e.getAttribute('rx')),Number(e.getAttribute('ry'))]);
    return {configured,overridden,sync,preferences:p.getNodeImportance(),legacy,halos:document.querySelectorAll('.fm-rfc-node-halo').length};
  });
  expect(state.configured).toBe(1);expect(state.overridden).toBe(1.8);expect(state.sync).toEqual(['legacy',true]);expect(state.preferences).toEqual({mode:'legacy',showValues:true});
  expect(state.legacy).toHaveLength(5);expect(state.legacy.flat().every(Number.isFinite)).toBe(true);expect(state.halos).toBe(3);
  await expect(page.getByLabel('Importance display',{exact:true})).toHaveValue('legacy');await expect(page.getByLabel('Show node weight values',{exact:true})).toBeChecked();
  expect(errors).toEqual([]);
});
