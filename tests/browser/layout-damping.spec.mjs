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

test("page teardown releases the main browser's motion controls",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  const result=await page.evaluate(()=>{
    const panel=window.graphBrowser;panel.tgLayout.stop();
    const enabled=document.querySelector("#adaptive-damping"),response=document.querySelector("#damping-response");
    const before={enabled:panel.tgLayout.getAdaptiveDampingState().enabled,response:panel.tgLayout.getAdaptiveDampingResponse()};
    window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}));
    enabled.checked=!before.enabled;enabled.dispatchEvent(new Event("change"));
    response.value=before.response==="impulse"?"cooling":"impulse";response.dispatchEvent(new Event("change"));
    return {before,after:{enabled:panel.tgLayout.getAdaptiveDampingState().enabled,response:panel.tgLayout.getAdaptiveDampingResponse()},
      mounted:!!document.querySelector("#graph svg")};
  });
  expect(result.after).toEqual(result.before);expect(result.mounted).toBe(false);expect(errors).toEqual([]);
});

test("oscillating focal nodes leave context labels free to clear the focus",async({page},info)=>{
  await page.route("**/damping-host.html",route=>route.fulfill({contentType:"text/html",body:
    '<!doctype html><html><head><title>RFC context clearing</title><style>body{font:16px system-ui;margin:20px}main{display:flex;gap:20px}.graph{width:650px;height:420px;border:1px solid #bbb}</style></head><body><h1>RFC context clearing under a persistent focal swing</h1><main></main></body></html>'}));
  const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.goto("/damping-host.html");
  const results=await page.evaluate(async()=>{
    const {FreshmindPanel}=await import("/src/fm/index.ts");
    const {installContextClearingProbe}=await import("/tests/fixtures/context-clearing.mjs");
    const results=[];window.dampingTestPanels=[];
    for(const mode of ["graph","node"]){
      const section=document.createElement("section"),heading=document.createElement("h2"),host=document.createElement("div");
      heading.textContent=mode==="graph"?"Earlier shared gain":"Independent node gains (default)";
      host.className="graph";section.append(heading,host);document.querySelector("main").append(section);
      let time=0;const panel=new FreshmindPanel(host,{autoStart:false,hyperbolic:0,adaptiveDamping:{enabled:true,now:()=>time,...(mode==="graph"?{scope:"graph"}:{})}});
      window.dampingTestPanels.push(panel);
      const probe=installContextClearingProbe(panel,{onStep:()=>{time+=2;}});probe.tick();panel.repaintAfterMove();
      const bounds=id=>host.querySelector(`[data-node-id="${id}"] .tg-label`).getBoundingClientRect();
      const a=bounds("root"),b=bounds("context"),overlap=a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
      const {contextX,clearance,lateOscillatorStepMax,damping}=probe.result();
      results.push({mode,contextX,clearance,lateOscillatorStepMax,damping,overlap});probe.dispose();
    }return results;
  });
  expect(results[0].clearance).toBeLessThan(-90);expect(results[0].overlap).toBe(true);
  expect(results[1].clearance).toBeGreaterThan(-.001);expect(results[1].overlap).toBe(false);
  expect(results[1].lateOscillatorStepMax).toBeLessThan(1e-5);expect(results[1].damping.detectedNodeIds).toContain("oscillator");
  await page.screenshot({path:info.outputPath("rfc-context-clearing.png")});
  await page.evaluate(()=>window.dampingTestPanels.forEach(p=>p.destroy()));expect(errors).toEqual([]);
});
