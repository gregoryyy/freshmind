import {test,expect} from "@playwright/test";

async function ready(page) {
  const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.goto("/");
  await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(()=>window.graphBrowser.tgLayout.stop());await page.locator("#example-graph").selectOption("exclusion");
  await expect(page.locator("#file-status")).toContainText("11 nodes, 12 relations");
  await page.evaluate(async()=>{
    const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.getRfc().setFocus(null);
    for(const [i,s] of p.getCompleteEltSet().getSubstructures().entries())p.getRfc().activateSubstructure(s.id,i>0);
  });
  await page.getByText("Reinforcement Focus + Context",{exact:true}).click();await page.getByText("Focal regions",{exact:true}).click();
  return errors;
}

test("exclusion controls configure paused physical regions, reject invalid input and clear on removal",async({page},info)=>{
  const errors=await ready(page),regions=page.locator(".fm-exclusion-region");await expect(regions).toHaveCount(0);
  const original=await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]));
  await page.getByLabel("Keep context outside focal regions",{exact:true}).check();await expect(regions).toHaveCount(2);
  await page.getByLabel("Exclusion strength",{exact:true}).fill("0.6");await page.getByLabel("Exclusion strength",{exact:true}).blur();
  await page.getByLabel("Region padding",{exact:true}).fill("30");await page.getByLabel("Region padding",{exact:true}).blur();
  await page.getByLabel("Exclude non-shared focal nodes from overlaps",{exact:true}).uncheck();
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().exclusionSettings)).toEqual({enabled:true,overlap:false,strength:.6,padding:30});
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]))).toEqual(original);
  await page.getByLabel("Region padding",{exact:true}).fill("0");await page.getByLabel("Region padding",{exact:true}).blur();
  expect(await page.locator("#rfc-exclusion-padding").evaluate(e=>e.validationMessage)).toContain("padding");
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().exclusionSettings.padding)).toBe(30);
  await page.getByLabel("Region padding",{exact:true}).fill("20");await page.getByLabel("Region padding",{exact:true}).blur();
  await page.getByLabel("Exclude non-shared focal nodes from overlaps",{exact:true}).check();
  await page.screenshot({path:info.outputPath("exclusion-controls.png")});
  await page.getByRole("button",{name:"Remove RFC",exact:true}).click();await expect(regions).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("region boundaries follow all lenses without moving physical geometry or taking graph interaction",async({page},info)=>{
  const errors=await ready(page);await page.getByLabel("Keep context outside focal regions",{exact:true}).check();
  await expect(page.locator(".fm-exclusion-region")).toHaveCount(2);
  const before=await page.evaluate(()=>({regions:window.graphBrowser.getRfc().getState().regions,path:document.querySelector(".fm-exclusion-region").getAttribute("d")}));
  await page.evaluate(()=>{const p=window.graphBrowser;p.setZoom(1.4);p.setRotation(.7);p.setHyperbolic(45);p.setCanvasZoom(1.2);p.repaint();});
  const result=await page.evaluate(()=>{
    const p=window.graphBrowser,state=p.getRfc().getState();
    return {regions:state.regions,paths:[...document.querySelectorAll(".fm-exclusion-region")].map(path=>{
      const r=state.regions.find(r=>r.id===path.dataset.regionId),expected=p.getLensSet().convRealToDraw(r.center.x+r.radius/Math.sqrt(r.coordinateWeights.x),r.center.y);
      return {d:path.getAttribute("d"),expected,first:path.getPointAtLength(0).toJSON?.()??{x:path.getPointAtLength(0).x,y:path.getPointAtLength(0).y},pointer:getComputedStyle(path).pointerEvents};
    })};
  });
  expect(result.regions).toEqual(before.regions);expect(result.paths[0].d).not.toBe(before.path);
  for(const path of result.paths){expect(path.d).not.toMatch(/NaN|Infinity/);expect(path.first.x).toBeCloseTo(path.expected.x,3);expect(path.first.y).toBeCloseTo(path.expected.y,3);expect(path.pointer).toBe("none");}
  await page.evaluate(()=>{const p=window.graphBrowser;p.getRfc().setStabilizationEnabled(true);p.tgLayout.setRigidity(.1);p.resetDamper();p.tgLayout.tick(150);p.repaint();});
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)))).toBe(true);
  await page.screenshot({path:info.outputPath("exclusion-lenses.png")});expect(errors).toEqual([]);
});

test("reusable exclusion controls synchronize programmatic changes and dispose their own listeners",async({page})=>{
  const errors=await ready(page);
  const result=await page.evaluate(async()=>{
    const {bindRfcControls}=await import("/src/fm/ui/rfc-controls.ts"),p=window.graphBrowser;
    const input=type=>{const e=document.createElement("input");e.type=type;return e;};
    const e={activate:document.createElement("button"),clear:document.createElement("button"),springMultiplier:input("number"),angularStiffness:input("number"),
      status:document.createElement("p"),excludeContext:input("checkbox"),excludeOverlap:input("checkbox"),exclusionStrength:input("number"),exclusionPadding:input("number")};
    const dispose=bindRfcControls(p,e);p.getRfc().configureExclusion({enabled:true,strength:.75,padding:35});
    const synchronized=[e.excludeContext.checked,e.exclusionStrength.value,e.exclusionPadding.value];
    dispose();e.excludeContext.checked=false;e.excludeContext.dispatchEvent(new Event("change"));e.exclusionStrength.value="1.5";e.exclusionStrength.dispatchEvent(new Event("change"));
    return {synchronized,state:p.getRfc().getState().exclusionSettings};
  });
  expect(result.synchronized).toEqual([true,"0.75","35"]);expect(result.state).toMatchObject({enabled:true,strength:.75,padding:35});
  await expect(page.getByLabel("Exclusion strength",{exact:true})).toHaveValue("0.75");expect(errors).toEqual([]);
});
