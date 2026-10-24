import {test,expect} from "@playwright/test";

async function ready(page) {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.getByRole("button",{name:"Pause motion",exact:true}).click();
  await page.locator("#example-graph").selectOption("rfc-showcase");
  await expect(page.locator("#file-status")).toContainText("34 nodes, 37 relations");
  await expect(page.locator("#rfc-showcase")).toBeVisible();return errors;
}
async function choose(page,name,text) {
  await page.getByLabel("Apply comparison view",{exact:true}).selectOption(name);
  await expect(page.locator("#rfc-showcase-caption")).toContainText(text);
}
const coords=page=>page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]));

test("six showcase views share starts, compose focal/structural/lens controls and fit without moving physical points",async({page},info)=>{
  const errors=await ready(page),initial=await coords(page),finals=new Map();
  for(const [mode,text,foci,lens,count] of [["plain","Ordinary layout",0,0,34],["lens","viewing lens allocates",0,60,34],
    ["single","five immediate branches",1,0,34],["two","independent focal neighborhoods",2,0,34],
    ["hybrid","typed counts",2,0,18],["hybrid-lens","same hybrid rules",2,60,18]]) {
    await choose(page,mode,text);expect(await coords(page)).toEqual(initial);
    const state=await page.evaluate(()=>{const p=window.graphBrowser;return{centers:p.getRfc().getState().centers.length,lens:p.getHyperbolic(),
      shown:p.visibleNodeCount(),nodes:p.getNodeCount(),edges:p.getEdgeCount(),whole:p.getNavigation().getState().wholeGraph,rigidity:p.tgLayout.getState().rigidity,
      exclusion:p.getRfc().getState().exclusionSettings.enabled,reset:[...p.getAllNodes()].every(n=>n.dx===0&&n.dy===0&&!n.justMadeLocal)};});
    expect(state).toEqual({centers:foci,lens,shown:count,nodes:34,edges:37,whole:true,rigidity:.1,exclusion:foci>0,reset:true});
    expect(await page.getByRole("button",{name:"Resume motion",exact:true}).count()).toBe(1);
    if(["plain","two","hybrid-lens"].includes(mode))await page.evaluate(()=>window.graphBrowser.tgLayout.tick(160));
    const beforeFit=await coords(page);await page.getByRole("button",{name:"Fit visible graph",exact:true}).click();expect(await coords(page)).toEqual(beforeFit);
    finals.set(mode,beforeFit);
    const bounds=await page.locator("#graph").boundingBox();
    const bodies=await page.locator("#graph .tg-node").evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
    for(const r of bodies){expect(r.x).toBeGreaterThanOrEqual(bounds.x-1);expect(r.y).toBeGreaterThanOrEqual(bounds.y-1);
      expect(r.x+r.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);expect(r.y+r.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);}
    if(["plain","two","hybrid-lens"].includes(mode))await page.screenshot({path:info.outputPath(`${mode}.png`)});
  }
  const bridgeIds=await page.evaluate(()=>window.graphBrowser.getStructuralView().getState().nodeIds);
  for(const id of ["semantic","maya","archive-paper-1","corpus-paper-2"])expect(bridgeIds).toContain(id);
  await choose(page,"hybrid-lens","same hybrid rules");await expect.poll(()=>coords(page)).toEqual(initial);
  await page.evaluate(()=>window.graphBrowser.tgLayout.tick(160));expect(await coords(page)).toEqual(finals.get("hybrid-lens"));
  expect(errors).toEqual([]);
});

test("hybrid detail remains interactive and complete YAML reload keeps the showcase while respecting RFC off",async({page},info)=>{
  const errors=await ready(page);await choose(page,"hybrid","typed counts");
  await page.evaluate(async()=>{const p=window.graphBrowser;await p.expandNode(p.findNode("semantic"));});
  await expect(page.locator('[data-node-id="noor"]')).toBeVisible();await expect(page.locator('[data-node-id="liam"]')).toBeVisible();
  await page.locator("#rfc-section").evaluate(e=>{e.open=true;});await page.locator("#rfc-clear").click();
  await page.evaluate(()=>{const p=window.graphBrowser;p.setHyperbolic(47);p.setZoom(1.3);p.setRotation(.2);p.setCanvasZoom(.8);p.setCanvasPan(31,-17);});
  const downloadPromise=page.waitForEvent("download");await page.locator("#save-graph").click();const download=await downloadPromise;
  const path=info.outputPath("showcase-roundtrip.fm.yaml");await download.saveAs(path);
  await page.locator("#open-graph-files").setInputFiles(path);
  await expect(page.locator("#file-status")).toContainText("showcase-roundtrip.fm.yaml: 34 nodes, 37 relations");
  await expect(page.locator("#rfc-showcase")).toBeVisible();
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().enabled)).toBe(false);
  expect(await page.evaluate(()=>window.graphBrowser.getStructuralView().getState().settings.enabled)).toBe(false);
  const savedView=await page.evaluate(()=>{const p=window.graphBrowser;return {lens:p.getHyperbolic(),zoom:p.getZoom(),rotation:p.rotateLens.angle,canvas:p.getCanvasZoom(),pan:p.getCanvasPan()};});
  expect(savedView.lens).toBe(47);expect(savedView.zoom).toBe(1.3);expect(savedView.rotation).toBe(.2);expect(savedView.canvas).toBe(.8);
  expect(savedView.pan.x).toBeCloseTo(31,9);expect(savedView.pan.y).toBeCloseTo(-17,9);
  await page.locator("#example-graph").selectOption("rfc-showcase");await expect(page.locator("#rfc-showcase-caption")).toContainText("Ordinary layout");
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().enabled)).toBe(false);
  await page.locator("#example-graph").selectOption("florentine");await expect(page.locator("#file-status")).toContainText("florentine.fm.yaml");
  await expect(page.locator("#rfc-showcase")).toBeHidden();expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().enabled)).toBe(false);
  expect(errors).toEqual([]);
});

test("a pending showcase action cannot change a replacement document",async({page})=>{
  const errors=await ready(page);
  await page.evaluate(()=>{const p=window.graphBrowser,original=p.setLocaleAll.bind(p);
    p.setLocaleAll=()=>new Promise(resolve=>{window.releaseShowcase=()=>{p.setLocaleAll=original;resolve();};});});
  await page.getByLabel("Apply comparison view",{exact:true}).selectOption("two");
  await page.locator("#example-graph").selectOption("florentine");await expect(page.locator("#file-status")).toContainText("florentine.fm.yaml");
  const before=await coords(page);await page.evaluate(async()=>{window.releaseShowcase();await Promise.resolve();await Promise.resolve();});
  expect(await coords(page)).toEqual(before);await expect(page.locator("#rfc-showcase")).toBeHidden();
  expect(await page.evaluate(()=>{const p=window.graphBrowser;return p.getRfc().getState().centers.every(c=>p.findNode(c.focusId))&&p.getRfc().getState().enabled;})).toBe(true);
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(15);expect(errors).toEqual([]);
});
