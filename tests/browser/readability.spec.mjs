import {fillNumeric} from "../../scripts/browser-controls.mjs";
import {test,expect} from '@playwright/test';

async function overlaps(page){return page.locator('.fm-node .fm-shape').evaluateAll(elements=>{
  const boxes=elements.map(e=>e.getBoundingClientRect());let count=0;
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))count++;
  }return count;
});}
test('measured label separation reduces visible overlaps, preserves graph/view state and pauses motion',async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  if(await page.locator('#motion').textContent()==='Pause motion')await page.locator('#motion').click();
  await page.evaluate(async()=>{
    const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();
    const {FreshNode,FreshEdge,FreshGraph}=await import('/src/fm/index.ts'),g=new FreshGraph();
    const labels=['Pinned center','A long label that wraps into multiple lines','A smaller neighbor','Another long node label','Important neighboring paper'];
    for(const [i,label] of labels.entries())g.addNode(new FreshNode(`n${i}`,label,{type:'idea',position:{x:i*8,y:i*3},fixed:i===0,weight:i===4?9:1}));
    for(let i=1;i<labels.length;i++)g.addEdge(new FreshEdge(g.findNode('n0'),g.findNode(`n${i}`),{id:`e${i}`,label:'related'}));
    g.addNode(new FreshNode('hidden','Hidden node',{position:{x:8,y:4}}));
    p.setGraphEltSet(g);p.getGES().addAll();p.getGES().removeNode(g.findNode('hidden'));p.centerOn(g.findNode('n0'),true);
    p.setSelect(g.findNode('n2'));p.getRfc().setFocus(g.findNode('n0'));p.setZoom(1.2);p.setHyperbolic(55);p.setRotation(.3);p.setCanvasZoom(1.1);p.repaintAfterMove();
    window.readabilitySaved={g,selection:p.getSelection(),rfc:p.getRfc().getState().centers.map(c=>c.focusId),hidden:[g.findNode('hidden').x,g.findNode('hidden').y],pin:[g.findNode('n0').x,g.findNode('n0').y]};
  });
  const before=await overlaps(page);expect(before).toBeGreaterThan(0);
  await page.locator('#view-section').evaluate(e=>e.open=true);await page.getByText('Label spacing',{exact:true}).click();
  await page.screenshot({path:info.outputPath('labels-before.png')});
  // Resume and immediately arrange in one browser task to verify the action itself pauses motion.
  await page.evaluate(()=>{document.querySelector('#motion').click();document.querySelector('#separate-labels').click();});
  const after=await overlaps(page);expect(after).toBe(0);await expect(page.locator('#readability-status')).toContainText('→ 0 overlapping node pairs');
  await expect(page.locator('#motion')).toHaveText('Resume motion');
  expect(await page.evaluate(()=>{
    const p=window.graphBrowser,s=window.readabilitySaved,g=p.getCompleteEltSet();
    return {same:g===s.g,selection:p.getSelection()===s.selection,rfc:p.getRfc().getState().centers.map(c=>c.focusId),
      pin:[g.findNode('n0').x,g.findNode('n0').y],hidden:[g.findNode('hidden').x,g.findNode('hidden').y],
      nodes:g.nodeCount(),edges:g.edgeCount(),zoom:p.getZoom(),hyper:p.getHyperbolic(),rotation:p.getRotation(),canvas:p.getCanvasZoom()};
  })).toMatchObject({same:true,selection:true,rfc:['n0'],pin:[0,0],hidden:[8,4],nodes:6,edges:4,zoom:1.2,hyper:55,rotation:.3,canvas:1.1});
  const positions=await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]));
  await page.waitForTimeout(150);expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]))).toEqual(positions);
  await page.screenshot({path:info.outputPath('labels-after.png')});
  await page.evaluate(()=>{const p=window.graphBrowser;p.setGraphEltSet(new window.readabilitySaved.g.constructor());});
  await expect(page.locator('#readability-status')).toHaveText('');expect(errors).toEqual([]);
});

test('invalid gaps do not arrange nodes and disposed caller-owned controls stop acting',async({page})=>{
  await page.goto('/');await page.waitForFunction(()=>window.graphBrowser);
  await page.evaluate(()=>window.graphBrowser.tgLayout.stop());
  await page.locator('#view-section').evaluate(e=>e.open=true);await page.getByText('Label spacing',{exact:true}).click();
  const before=await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]));
  await fillNumeric(page.getByLabel('Gap between nodes',{exact:true}),'-1');await page.getByRole('button',{name:'Separate overlapping nodes',exact:true}).click();
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]))).toEqual(before);
  const result=await page.evaluate(async()=>{
    const {bindReadabilityControls}=await import('/src/fm/ui/index.ts');
    const separate=document.createElement('button'),gap=document.createElement('input'),status=document.createElement('p');gap.type='number';gap.value='8';
    let calls=0;const dispose=bindReadabilityControls(window.graphBrowser,{separate,gap,status},()=>calls++);dispose();separate.click();return {calls,status:status.textContent};
  });expect(result).toEqual({calls:0,status:''});
});
