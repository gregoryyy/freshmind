import {test,expect} from '@playwright/test';
const metrics=page=>page.evaluate(()=>{
  const rect=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};};
  const labels=[...document.querySelectorAll('.fm-edge-label')].filter(e=>e.textContent).map(rect),nodes=[...document.querySelectorAll('.fm-node .fm-shape')].map(rect);
  let count=0;
  for(let i=0;i<labels.length;i++)for(const b of [...nodes,...labels.slice(i+1)]){
    const a=labels[i];if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))count++;
  }
  const p=window.graphBrowser;
  return {count,positions:[...p.getAllNodes()].map(n=>[n.getID(),n.x,n.y]),paths:[...document.querySelectorAll('.fm-edge-path')].map(e=>e.getAttribute('d')),
    anchors:[...document.querySelectorAll('.fm-edge-label')].map(e=>[e.getAttribute('x'),e.getAttribute('y')])};
});
async function ready(page){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  if(await page.locator('#motion').textContent()==='Pause motion')await page.locator('#motion').click();
  await page.evaluate(async()=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.tick(60);p.repaint();});
  await page.locator('#view-section').evaluate(e=>e.open=true);await page.locator('#readability-section').evaluate(e=>e.open=true);return errors;
}
test('measured relation-label placement reduces collisions without moving nodes or changing curves',async({page},info)=>{
  const errors=await ready(page),toggle=page.getByLabel('Avoid relation label overlaps',{exact:true});
  await expect(toggle).toBeChecked();await toggle.uncheck();const before=await metrics(page);expect(before.count).toBeGreaterThan(0);
  await page.screenshot({path:info.outputPath('relation-labels-before.png')});await toggle.check();const after=await metrics(page);
  expect(after.count).toBeLessThan(before.count);expect(after.positions).toEqual(before.positions);expect(after.paths).toEqual(before.paths);
  await page.evaluate(()=>window.graphBrowser.repaint());expect((await metrics(page)).anchors).toEqual(after.anchors);
  await toggle.uncheck();expect((await metrics(page)).anchors).toEqual(before.anchors);await toggle.check();
  await page.screenshot({path:info.outputPath('relation-labels-after.png')});expect(errors).toEqual([]);
});
test('displayed labels and inline editors share anchors through lenses, edits, loops and graph replacement',async({page})=>{
  const errors=await ready(page);
  await page.evaluate(async()=>{
    const {FreshEdge}=await import('/src/fm/index.ts'),p=window.graphBrowser,n=p.findNode('root');
    p.addEdge(new FreshEdge(n,n,{id:'test-loop',label:'Loop relation'}));
    p.addEdge(new FreshEdge(n,p.findNode('topic-0'),{id:'test-parallel',label:'Parallel relation'}));
    p.setHyperbolic(48);p.setZoom(1.3);p.setRotation(.4);p.setCanvasZoom(.9);p.setCanvasPan(20,-12);p.repaintAfterMove();
  });
  const check=()=>page.evaluate(()=>{
    const p=window.graphBrowser;let error=0;
    for(const group of document.querySelectorAll('.fm-edge')){
      const edge=[...p.getAllEdges()].find(e=>e.getID()===group.dataset.edgeId),g=p.getEdgeGeometry(edge),label=group.querySelector('.fm-edge-label');
      error=Math.max(error,Math.hypot(+label.getAttribute('x')-g.labelAnchor.x,+label.getAttribute('y')-g.labelAnchor.y));
      if(/NaN|Infinity/.test(g.path))throw new Error('Invalid curve');
    }return error;
  });expect(await check()).toBeLessThan(1e-7);
  await page.evaluate(()=>{const p=window.graphBrowser,e=[...p.getAllEdges()].find(e=>e.getID()==='test-parallel');p.setSelectEdge(e);});
  await page.locator('#graph svg').focus();await page.keyboard.press('F2');const editor=page.getByLabel('Inline relation label',{exact:true});await expect(editor).toBeVisible();
  const error=await page.evaluate(()=>{const p=window.graphBrowser,a=p.drawToScreen(p.getEdgeGeometry(p.getSelectEdge()).labelAnchor),b=document.querySelector('.inline-editor').getBoundingClientRect(),s=document.querySelector('#graph svg').getBoundingClientRect();return Math.hypot(b.x+b.width/2-s.x-a.x,b.y+b.height/2-s.y-a.y);});
  expect(error).toBeLessThan(2);await editor.fill('An edited relation label');await editor.press('Enter');expect(await check()).toBeLessThan(1e-7);
  await page.evaluate(()=>{const p=window.graphBrowser;const C=p.getCompleteEltSet().constructor;p.setGraphEltSet(new C());});
  await expect(page.getByLabel('Avoid relation label overlaps',{exact:true})).toBeChecked();expect(errors).toEqual([]);
});
test('relation controls synchronize programmatic preferences, dispose cleanly and retain text measurements',async({page})=>{
  const errors=await ready(page);
  const result=await page.evaluate(async()=>{
    const {bindReadabilityControls}=await import('/src/fm/ui/index.ts'),p=window.graphBrowser;
    const separate=document.createElement('button'),gap=document.createElement('input'),status=document.createElement('p'),relationLabels=document.createElement('input');
    relationLabels.type='checkbox';gap.type='number';gap.value='8';
    const dispose=bindReadabilityControls(p,{separate,gap,status,relationLabels});p.setRelationLabelPlacement('original');const sync=relationLabels.checked;
    relationLabels.checked=true;relationLabels.dispatchEvent(new Event('change'));const enabled=p.getRelationLabelPlacement();
    let reads=0;const original=SVGGraphicsElement.prototype.getBBox;
    SVGGraphicsElement.prototype.getBBox=function(...args){if(this.matches('.fm-edge-label'))reads++;return original.apply(this,args);};
    try{p.repaint();p.repaint();}finally{SVGGraphicsElement.prototype.getBBox=original;}
    dispose();relationLabels.checked=false;relationLabels.dispatchEvent(new Event('change'));const retained=p.getRelationLabelPlacement();
    const edge=[...p.getAllEdges()].find(e=>e.getLabel()),element=[...document.querySelectorAll('.fm-edge')].find(e=>e.dataset.edgeId===edge.getID()).querySelector('.fm-edge-label');
    edge.setLabel('<img src=x onerror=alert(1)>');p.repaint();
    return {sync,enabled,retained,reads,text:element.textContent,children:element.children.length};
  });expect(result).toEqual({sync:false,enabled:'avoid-overlap',retained:'avoid-overlap',reads:0,text:'<img src=x onerror=alert(1)>',children:0});
  await expect(page.getByLabel('Avoid relation label overlaps',{exact:true})).toBeChecked();expect(errors).toEqual([]);
});
