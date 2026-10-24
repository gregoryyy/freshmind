import {test,expect} from "@playwright/test";

test("default general damping detects ordinary TouchGraph oscillation with RFC off and survives document replacement",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.goto("/");
  await page.waitForFunction(()=>Boolean(window.graphBrowser));
  await expect(page.getByLabel("Adaptive damping",{exact:true})).toBeChecked();
  await page.getByRole("button",{name:"Pause motion",exact:true}).click();
  const result=await page.evaluate(()=>{
    const p=window.graphBrowser;p.tgLayout.stop();p.clearAll();const root=p.addNode("root");root.x=root.y=0;
    for(let i=0;i<6;i++){const n=p.addNode(String(i));n.x=100*Math.cos(i);n.y=100*Math.sin(i);p.addEdge(root,n,1);}
    p.getRfc().setFocus(null);p.tgLayout.resetDamper();p.tgLayout.tick(30);
    return {rfc:p.getRfc().getState().enabled,damping:p.tgLayout.getAdaptiveDampingState()};
  });
  expect(result.rfc).toBe(false);expect(result.damping.detections).toBeGreaterThan(0);expect(result.damping.gain).toBeLessThan(1);
  await expect(page.locator("#adaptive-damping-status")).toContainText("detections");
  await page.getByLabel("Damping response",{exact:true}).selectOption("cooling");
  await expect(page.locator("#adaptive-damping-status")).toContainText("Earlier TouchGraph cooling");
  expect(await page.evaluate(()=>window.graphBrowser.tgLayout.getAdaptiveDampingResponse())).toBe("cooling");
  await page.locator("#example-graph").selectOption("karate");
  await expect(page.locator("#file-status")).toContainText("34 nodes");
  expect(await page.evaluate(()=>window.graphBrowser.tgLayout.getAdaptiveDampingState())).toMatchObject({enabled:true,gain:1,detections:0});
  expect(await page.evaluate(()=>window.graphBrowser.tgLayout.getAdaptiveDampingResponse())).toBe("cooling");
  await page.getByLabel("Adaptive damping",{exact:true}).uncheck();
  await page.locator("#example-graph").selectOption("florentine");
  await expect(page.locator("#file-status")).toContainText("15 nodes");
  await expect(page.getByLabel("Adaptive damping",{exact:true})).not.toBeChecked();
  expect(await page.evaluate(()=>window.graphBrowser.tgLayout.getAdaptiveDampingState().enabled)).toBe(false);expect(errors).toEqual([]);
});

test("general motion controls synchronize external changes and remove listeners on disposal",async({page})=>{
  await page.goto("/");await page.waitForFunction(()=>Boolean(window.graphBrowser));
  const result=await page.evaluate(async()=>{
    const {bindMotionControls}=await import("/src/fm/ui/index.ts"),p=window.graphBrowser;p.tgLayout.stop();
    const input=document.createElement("input"),status=document.createElement("p");input.type="checkbox";
    const dispose=bindMotionControls(p,{adaptiveDamping:input,status});
    p.tgLayout.setAdaptiveDampingEnabled(false);const synchronized=!input.checked&&status.textContent.includes("disabled");
    dispose();input.checked=true;input.dispatchEvent(new Event("change"));
    const disposed=!p.tgLayout.getAdaptiveDampingState().enabled;
    input.checked=false;p.tgLayout.setAdaptiveDampingEnabled(true);return {synchronized,disposed,untouched:!input.checked};
  });
  expect(result).toEqual({synchronized:true,disposed:true,untouched:true});
});
