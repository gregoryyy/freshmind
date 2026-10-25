import {test,expect} from '@playwright/test';
async function choose(page,value){const radio=page.locator(`#graph-aspect-choices input[value="${value}"]`);if(await radio.count())await radio.check();else await page.locator('#graph-aspect').selectOption(value);}
async function ready(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>Boolean(window.graphBrowser));
  await page.evaluate(async()=>{const p=window.graphBrowser,{FreshGraph,FreshNode,FreshEdge}=await import('/src/fm/index.ts');p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();const g=new FreshGraph();
    for(const [id,x,y] of [['center',0,0],['one',100,50],['two',-60,60],['hidden',2000,2000]])g.addNode(new FreshNode(id,id,{position:{x,y},fixed:id==='center',data:{retained:id}}));
    g.addEdge(new FreshEdge(g.findNode('center'),g.findNode('one'),{id:'c1'}));g.addEdge(new FreshEdge(g.findNode('center'),g.findNode('two'),{id:'c2'}));p.setGraphEltSet(g);p.getGES().addAll();p.getGES().removeNode(g.findNode('hidden'));p.getRfc().setFocus(null);p.setSelect(g.findNode('center'));p.centerOn(g.findNode('center'),true);p.setZoom(1.3);p.setHyperbolic(50);p.setRotation(.2);p.repaint();});return errors;}
const positions=page=>page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]));
test('FM2014 display stretch preserves physical positions, label proportions, data, damping and other view controls',async({page})=>{
  const errors=await ready(page),before=await positions(page);
  const record=()=>page.evaluate(async()=>{const {captureDocument,documentToRecord}=await import('/src/fm/index.ts');return documentToRecord(captureDocument(window.graphBrowser));});const semantic=await record();
  const display=()=>page.evaluate(()=>{const p=window.graphBrowser,n=p.findNode('one');return {width:n.getWidth(),height:n.getHeight(),zoom:p.getZoom(),hyper:p.getHyperbolic(),rotation:p.getRotation(),canvas:p.getCanvasPan(),rfc:p.getRfc().getState().settings,physics:p.tgLayout.getState()};});const originalDisplay=await display();
  const point=()=>page.evaluate(()=>{const p=window.graphBrowser,n=p.findNode('one'),c=p.getAdjustOriginLens();return {x:n.drawx-c.x,y:n.drawy-c.y};});const oldPoint=await point();
  await choose(page,'3:5');await expect(page.locator('#graph-aspect-value')).toContainText('0.6:1');expect(await positions(page)).toEqual(before);expect(await display()).toEqual(originalDisplay);
  const stretched=await point();expect(stretched.x).toBeCloseTo(oldPoint.x*.6,10);expect(stretched.y).toBe(oldPoint.y);expect(await record()).toEqual(semantic);
  await choose(page,'16:9');expect(await page.evaluate(()=>window.graphBrowser.getGraphAspectState())).toEqual({mode:'16:9',ratio:16/9});
  await page.evaluate(()=>{const p=window.graphBrowser;p.setHyperbolic(0);p.setRotation(0);p.repaint();});
  const node=page.locator('[data-node-id="one"] .fm-shape'),box=await node.boundingBox(),initial=await positions(page);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+64,box.y+box.height/2+24,{steps:4});await page.mouse.up();
  const after=await positions(page),first=initial.find(n=>n[0]==='one'),moved=after.find(n=>n[0]==='one');expect(moved[1]-first[1]).toBeCloseTo(64/(1.3*16/9),1);expect(moved[2]-first[2]).toBeCloseTo(24/1.3,1);
  expect(after.find(n=>n[0]==='hidden')).toEqual(initial.find(n=>n[0]==='hidden'));expect(after.find(n=>n[0]==='center')).toEqual(initial.find(n=>n[0]==='center'));
  await choose(page,'original');expect(await page.evaluate(()=>window.graphBrowser.getGraphAspectState().ratio)).toBe(1);expect(errors).toEqual([]);
});
test('canvas aspect follows the graph viewport, survives replacement and disposed controls stop commands',async({page})=>{
  const errors=await ready(page);await choose(page,'canvas');
  const actual=()=>page.evaluate(()=>{const p=window.graphBrowser,s=p.getSize();return {state:p.getGraphAspectState(),expected:s.width/s.height};});
  let value=await actual();expect(value.state.ratio).toBe(value.expected);
  const before=await positions(page);await page.setViewportSize({width:800,height:700});await expect.poll(async()=>{const v=await actual();return v.state.ratio===v.expected&&v.state.ratio!==value.state.ratio;}).toBe(true);expect(await positions(page)).toEqual(before);
  await page.evaluate(async()=>{const {FreshGraph}=await import('/src/fm/index.ts');window.graphBrowser.setGraphEltSet(new FreshGraph());});expect((await actual()).state.mode).toBe('canvas');
  await page.evaluate(()=>window.graphBrowser.setGraphAspectMode('3:5'));await expect(page.locator('#graph-aspect')).toHaveValue('3:5');
  await page.evaluate(()=>{window.retiredAspect=document.querySelector('#graph-aspect');window.dispatchEvent(new Event('pagehide'));window.retiredAspect.value='16:9';window.retiredAspect.dispatchEvent(new Event('change'));});expect((await actual()).state).toEqual({mode:'3:5',ratio:.6});expect(errors).toEqual([]);
});
