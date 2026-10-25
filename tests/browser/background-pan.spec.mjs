import {test,expect} from '@playwright/test';
async function ready(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(async()=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();p.setHyperbolic(70);p.setRotation(.4);p.setZoom(1.3);p.setCanvasZoom(1.4);p.setCanvasPan(10,-12);p.repaintAfterMove();});return errors;}
async function state(page){return page.evaluate(()=>{const p=window.graphBrowser;return {positions:[...p.getAllNodes()].map(n=>[n.getID(),n.x,n.y]),lens:p.getLensPan(),canvas:p.getCanvasPan(),zoom:[p.getZoom(),p.getCanvasZoom(),p.getHyperbolic(),p.getRotation()]};});}
test('default background drag moves through the lens; Ctrl-drag preserves whole-canvas translation',async({page})=>{
  const errors=await ready(page),svg=page.locator('#graph svg'),box=await svg.boundingBox(),start={x:30,y:35},end={x:95,y:75};
  const before=await state(page),world=await page.evaluate(start=>{const p=window.graphBrowser;return p.getLensSet().convDrawToReal(p.screenToDraw(start));},start);
  await page.mouse.move(box.x+start.x,box.y+start.y);await page.mouse.down();await page.mouse.move(box.x+end.x,box.y+end.y,{steps:6});await page.mouse.up();
  const after=await state(page);expect(after.lens).not.toEqual(before.lens);expect(after.canvas).toEqual(before.canvas);expect(after.positions).toEqual(before.positions);expect(after.zoom).toEqual(before.zoom);
  const mapped=await page.evaluate(world=>{const p=window.graphBrowser;return p.drawToScreen(p.getLensSet().convRealToDraw(world.x,world.y));},world);expect(Math.abs(mapped.x-end.x)).toBeLessThan(.25);expect(Math.abs(mapped.y-end.y)).toBeLessThan(.25);
  const shape=page.locator('[data-node-id="root"] .fm-shape'),old=await shape.boundingBox();
  await page.keyboard.down('Control');await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+70,box.y+50,{steps:5});await page.mouse.up();await page.keyboard.up('Control');
  const moved=await shape.boundingBox(),canvas=await state(page);expect(moved.x-old.x).toBeCloseTo(50,4);expect(moved.y-old.y).toBeCloseTo(30,4);expect(canvas.lens).toEqual(after.lens);expect(canvas.positions).toEqual(before.positions);expect(canvas.zoom).toEqual(before.zoom);expect(errors).toEqual([]);
});
test('plain TG and explicitly configured FM hosts retain canvas-only default dragging',async({page})=>{
  const errors=await ready(page);
  await page.evaluate(async()=>{const {TGPanel}=await import('/src/tg/index.ts'),{FreshmindPanel}=await import('/src/fm/index.ts');window.panHosts=[];
    for(const [kind,Panel,options] of [['tg',TGPanel,{}],['fm',FreshmindPanel,{backgroundPan:'canvas'}]]){const host=document.createElement('div');host.id=`pan-${kind}`;host.style.cssText='position:fixed;inset:30px auto auto 350px;width:400px;height:300px;z-index:100;background:white';document.body.append(host);const p=new Panel(host,{autoStart:false,...options});p.addNode('a','A');p.setHyperbolic(65);p.centerView();window.panHosts.push(p);if(kind==='tg')host.style.left='800px';}
  });
  for(const id of ['tg','fm']){const target=page.locator(`#pan-${id} svg`),b=await target.boundingBox();await page.mouse.move(b.x+15,b.y+15);await page.mouse.down();await page.mouse.move(b.x+45,b.y+35,{steps:4});await page.mouse.up();}
  const values=await page.evaluate(()=>window.panHosts.map(p=>({canvas:p.getCanvasPan(),lens:p.getLensPan()})));for(const value of values){expect(value.canvas.x).toBeCloseTo(30,4);expect(value.canvas.y).toBeCloseTo(20,4);expect(Math.abs(value.lens.x)).toBe(0);expect(Math.abs(value.lens.y)).toBe(0);}
  await page.evaluate(()=>window.panHosts.forEach(p=>p.destroy()));expect(errors).toEqual([]);
});
test('an in-flight background gesture cannot pan a replacement graph',async({page})=>{
  const errors=await ready(page),box=await page.locator('#graph svg').boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+40,box.y+30);
  await page.evaluate(async()=>{const {FreshGraph,FreshNode}=await import('/src/fm/index.ts'),p=window.graphBrowser,g=new FreshGraph();g.addNode(new FreshNode('replacement','Replacement'));p.setGraphEltSet(g);p.getGES().addAll();p.centerView();});
  const before=await state(page);await page.mouse.move(box.x+80,box.y+60,{steps:4});await page.mouse.up();expect(await state(page)).toEqual(before);expect(errors).toEqual([]);
});
