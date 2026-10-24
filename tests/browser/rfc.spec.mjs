import {test, expect} from "@playwright/test";
import {fileURLToPath} from "node:url";
import {readFile} from "node:fs/promises";
import {parseDocument} from "fm4/fm/io";

const example = fileURLToPath(new URL("../../docs/experiments/rfc-single-focus/crowded-star.fm.yaml", import.meta.url));
async function ready(page) {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(() => Boolean(window.graphBrowser));
  await page.evaluate(async () => { const p = window.graphBrowser; p.fastFinishAnimation(); await p.getLocalityUtils().whenIdle(); p.tgLayout.stop(); });
  await page.locator("#open-graph-files").setInputFiles(example);
  await expect(page.locator("#file-status")).toContainText("9 nodes, 12 relations");
  // Force comparisons explicitly start with RFC off; the browser now opens with it enabled.
  await page.evaluate(()=>window.graphBrowser.getRfc().setFocus(null));
  await page.getByText("Reinforcement Focus + Context", {exact: true}).click();
  return errors;
}
const state = page => page.evaluate(() => window.graphBrowser.getRfc().getState());
const record = page => page.evaluate(async () => {
  const {captureDocument, documentToRecord} = await import("/src/fm/index.ts");
  return documentToRecord(captureDocument(window.graphBrowser), {includeLayout: false, includeView: false});
});

test("RFC controls activate and configure physical reinforcement without changing graph records or viewing transforms", async ({page}, testInfo) => {
  const errors = await ready(page), original = await record(page);
  await expect(page.locator("#rfc-status")).toHaveText("RFC off.");
  await page.evaluate(() => { const p = window.graphBrowser; p.setZoom(1.2); p.setCanvasZoom(1.4); p.setHyperbolic(40); });
  await page.getByRole("button", {name: "Reinforce selected node", exact: true}).click();
  expect((await state(page)).focusId).toBe("center"); expect((await state(page)).branchIds).toHaveLength(6);
  await expect(page.locator("#rfc-status")).toContainText("Focal project · 6 visible branches");
  await page.getByRole("button", {name: "Reinforce selected node", exact: true}).click();
  await page.getByLabel("Attraction multiplier",{exact:true}).fill("4"); await page.getByLabel("Attraction multiplier",{exact:true}).press("Tab");
  await page.getByLabel("Angular stiffness").fill("400"); await page.getByLabel("Angular stiffness").press("Tab");
  expect((await state(page)).settings).toEqual({springMultiplier: 4, radialStiffness:1,radialLength:120,angularStiffness: 400, coordinateWeights: {x: 1, y: 1}});
  await page.getByLabel("Attraction multiplier",{exact:true}).fill("0"); await page.getByLabel("Attraction multiplier",{exact:true}).press("Tab");
  expect((await state(page)).settings.springMultiplier).toBe(4);
  expect(await page.getByLabel("Attraction multiplier",{exact:true}).evaluate(input => input.validationMessage)).toContain("springMultiplier");
  await page.getByLabel("Attraction multiplier",{exact:true}).fill("3"); await page.getByLabel("Attraction multiplier",{exact:true}).press("Tab");
  const view = await page.evaluate(() => {
    const p = window.graphBrowser, before = p.getRfc().getState().angularGapRms;
    p.tgLayout.tick(50);
    return {graph: p.getZoom(), canvas: p.getCanvasZoom(), lens: p.getHyperbolic(), selected: p.getSelection().getID(), before, after: p.getRfc().getState().angularGapRms};
  });
  expect(view).toMatchObject({graph: 1.2, canvas: 1.4, lens: 40, selected: "center"}); expect(view.after).toBeLessThan(view.before);
  expect(await record(page)).toEqual(original);
  await page.screenshot({path: testInfo.outputPath("rfc-single-focus.png")});
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", {name: "Save YAML", exact: true}).click()]);
  const saved = parseDocument(await readFile(await download.path(), "utf8"));
  expect(saved.graph.nodeCount()).toBe(9); expect(saved.graph.edgeCount()).toBe(12);
  await page.getByRole("button", {name: "Remove RFC", exact: true}).click();
  expect((await state(page)).enabled).toBe(false); await expect(page.locator("#rfc-status")).toHaveText("RFC off.");
  expect(await record(page)).toEqual(original); expect(errors).toEqual([]);
});

test("hidden RFC centers suspend and resume; choosing another center and opening a file replace transient constraints", async ({page}) => {
  const errors = await ready(page);
  await page.getByRole("button", {name: "Reinforce selected node", exact: true}).click();
  await page.evaluate(() => { const p = window.graphBrowser; p.getGES().removeNode(p.findNode("center")); p.localityChanged(); p.repaint(); });
  expect(await state(page)).toMatchObject({focusId: "center", enabled: true, active: false, branchIds: []});
  await expect(page.locator("#rfc-status")).toContainText("outside the visible neighborhood");
  await expect(page.getByRole("button", {name: "Reinforce selected node", exact: true})).toBeDisabled();
  await page.evaluate(() => { const p = window.graphBrowser; p.getGES().addNodeWithEdges(p.findNode("center")); p.repaint(); });
  expect((await state(page)).active).toBe(true); expect((await state(page)).branchIds).toHaveLength(6);
  await page.evaluate(() => window.graphBrowser.setSelect(window.graphBrowser.findNode("context-0")));
  await page.getByRole("button", {name: "Reinforce selected node", exact: true}).click();
  expect((await state(page)).focusId).toBe("context-0"); expect((await state(page)).branchIds).toHaveLength(3);
  await page.locator("#open-graph-files").setInputFiles(example);
  expect(await state(page)).toMatchObject({enabled:true,focusId:"center"});
  expect((await state(page)).centers).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("weighted RFC controls change physical geometry without changing lenses or semantic records",async({page})=>{
  const errors=await ready(page),original=await record(page);
  await page.getByRole("button",{name:"Reinforce selected node",exact:true}).click();
  const weight=page.getByLabel("Horizontal coordinate weight",{exact:true});await weight.fill("0.25");await weight.press("Tab");
  expect((await state(page)).settings.coordinateWeights).toEqual({x:.25,y:1});
  await weight.fill("0");await weight.press("Tab");expect((await state(page)).settings.coordinateWeights.x).toBe(.25);
  expect(await weight.evaluate(input=>input.validationMessage)).toContain("coordinateWeights.x");
  await weight.fill("0.25");await weight.press("Tab");
  const change=await page.evaluate(()=>{
    const p=window.graphBrowser,before=[...p.getAllNodes()].map(n=>[n.x,n.y]);
    p.setZoom(1.5);p.setCanvasZoom(1.2);p.setRotation(.4);p.setHyperbolic(35);const settings=p.getRfc().getState().settings;
    p.tgLayout.tick(50);return {before,after:[...p.getAllNodes()].map(n=>[n.x,n.y]),settings,view:[p.getZoom(),p.getCanvasZoom(),p.getRotation(),p.getHyperbolic()]};
  });
  expect(change.after).not.toEqual(change.before);expect(change.after.flat().every(Number.isFinite)).toBe(true);
  expect(change.settings.coordinateWeights).toEqual({x:.25,y:1});expect(change.view).toEqual([1.5,1.2,.4,35]);
  expect(await record(page)).toEqual(original);expect(errors).toEqual([]);
});

test("tree and attraction presets preserve focus/metric, expose length stiffness and leave semantic lengths unchanged",async({page})=>{
  const errors=await ready(page),original=await record(page);
  await page.getByRole("button",{name:"Reinforce selected node",exact:true}).click();
  await page.getByLabel("Horizontal coordinate weight",{exact:true}).fill("0.25");await page.getByLabel("Horizontal coordinate weight",{exact:true}).press("Tab");
  const tree=page.getByRole("button",{name:"Tree structure",exact:true}),attraction=page.getByRole("button",{name:"Attraction only",exact:true});
  await attraction.click();await expect(attraction).toHaveAttribute("aria-pressed","true");
  expect((await state(page)).settings).toMatchObject({radialStiffness:0,angularStiffness:300,coordinateWeights:{x:.25,y:1}});
  await tree.click();await expect(tree).toHaveAttribute("aria-pressed","true");
  expect(await state(page)).toMatchObject({focusId:"center",settings:{radialStiffness:1,radialLength:120,angularStiffness:10000,coordinateWeights:{x:.25,y:1}}});
  const length=page.getByLabel("Target focal length",{exact:true}),stiffness=page.getByLabel("Radial stiffness",{exact:true});
  await length.fill("150");await length.press("Tab");await stiffness.fill("1.5");await stiffness.press("Tab");
  expect((await state(page)).settings).toMatchObject({radialLength:150,radialStiffness:1.5});await expect(tree).toHaveAttribute("aria-pressed","false");
  for(const [input,value,field] of [[length,"0","radialLength"],[stiffness,"3","radialStiffness"]]){
    await input.fill(value);await input.press("Tab");expect(await input.evaluate(i=>i.validationMessage)).toContain(field);
  }
  expect((await state(page)).settings).toMatchObject({radialLength:150,radialStiffness:1.5});
  await tree.click();await expect(page.locator("#graph svg")).toBeFocused();
  await expect(length).toHaveValue("120");await expect(stiffness).toHaveValue("1");
  expect(await length.evaluate(input=>input.checkValidity())).toBe(true);expect(await stiffness.evaluate(input=>input.checkValidity())).toBe(true);
  await page.evaluate(()=>window.graphBrowser.tgLayout.tick(100));expect(await record(page)).toEqual(original);expect(errors).toEqual([]);
});

test("RFC halos follow node shapes and routed edges beneath the graph, including paused activation and removal", async ({page}) => {
  const errors = await ready(page), original = await record(page);
  await expect(page.locator(".fm-rfc-halos")).toHaveCount(0);
  await page.evaluate(() => {
    const p = window.graphBrowser;
    p.tgLayout.stop(); p.findNode("branch-0").setVisual({style:{shape:"trapezoid"}});
    p.repaint(); p.getRfc().setFocus(p.findNode("center"));
  });
  await expect(page.locator(".fm-rfc-node-halo")).toHaveCount(7);
  await expect(page.locator(".fm-rfc-edge-halo")).toHaveCount(6);
  const geometry = await page.evaluate(async () => {
    const p = window.graphBrowser, {createNodeOutline} = await import("/src/fm/geometry/shapes.ts");
    p.setRotation(.6); p.setZoom(1.4); p.setCanvasZoom(1.2); p.setHyperbolic(25); p.repaint();
    const layer = document.querySelector(".fm-rfc-halos"), node = p.findNode("branch-0");
    const halo = layer.querySelector('[data-rfc-node-id="branch-0"]');
    return {
      first:layer.parentElement.firstElementChild === layer,
      inert:getComputedStyle(halo).pointerEvents,
      soft:layer.querySelector("feGaussianBlur").getAttribute("stdDeviation") === "5" && halo.getAttribute("stroke") === "none",
      shape:halo.getAttribute("d") === createNodeOutline("trapezoid",node.getWidth()+20,node.getHeight()+20).path,
      position:halo.getAttribute("transform") === `translate(${node.drawx},${node.drawy})`,
      edges:[...layer.querySelectorAll(".fm-rfc-edge-halo")].every(h => {
        const foreground = document.querySelector(`[data-edge-id="${h.dataset.rfcEdgeId}"] .fm-edge-path`);
        return foreground.getAttribute("d") === h.getAttribute("d") && +h.getAttribute("stroke-width") > +foreground.getAttribute("stroke-width");
      }),
      context:layer.querySelectorAll('[data-rfc-node-id^="context"], [data-rfc-edge-id^="context"]').length
    };
  });
  expect(geometry).toEqual({first:true,inert:"none",soft:true,shape:true,position:true,edges:true,context:0});
  await page.locator('[data-node-id="branch-0"]').click();
  expect(await page.evaluate(() => window.graphBrowser.getSelection().getID())).toBe("branch-0");
  await page.evaluate(() => window.graphBrowser.getRfc().setFocus(null));
  await expect(page.locator(".fm-rfc-halos")).toHaveCount(0);
  // Only the explicit visual edit belongs in saved semantic records.
  const edited = await record(page); original.nodes.find(node=>node.id==="branch-0").visual={style:{shape:"trapezoid"}};
  expect(edited).toEqual(original); expect(errors).toEqual([]);
});

test("adaptive damping is an opt-in experiment, reports detected motion and disables without changing force settings",async({page})=>{
  const errors=await ready(page),original=await record(page);
  const toggle=page.getByLabel("Experimental adaptive damping",{exact:true});
  await expect(toggle).not.toBeChecked();expect((await state(page)).stabilization.enabled).toBe(false);
  await expect(page.locator("#rfc-stabilization-status")).toContainText("detection is disabled");
  await page.getByRole("button",{name:"Reinforce selected node",exact:true}).click();
  const settings=(await state(page)).settings;
  await toggle.check();expect((await state(page)).stabilization.enabled).toBe(true);
  await expect(page.locator("#rfc-stabilization-status")).toContainText("watching focal motion");
  await page.evaluate(()=>{
    const p=window.graphBrowser,node=p.findNode("branch-0"),rfc=p.getRfc();p.tgLayout.stop();
    for(let i=0;i<10;i++){node.x=i%2?0:4;rfc.apply(p.getGES(),1);}
    p.repaintAfterMove();
  });
  expect((await state(page)).stabilization.gain).toBeLessThan(1);
  await expect(page.locator("#rfc-status")).toContainText("damping oscillation");
  await expect(page.locator("#rfc-stabilization-status")).toContainText("detections");
  await expect(page.locator("#rfc-stabilization-status")).toContainText("branch-0");
  await toggle.uncheck();expect((await state(page)).stabilization).toMatchObject({enabled:false,gain:1,phase:"steady",detections:0});
  await expect(page.locator("#rfc-stabilization-status")).toContainText("detection is disabled");
  expect((await state(page)).settings).toEqual(settings);expect(await record(page)).toEqual(original);expect(errors).toEqual([]);
});

for (const gesture of ["Return", "double-click"]) test(`a second ${gesture} on the center transfers enabled RFC, while disabled RFC stays off`, async ({page}) => {
  const errors = await ready(page);
  await page.evaluate(() => window.graphBrowser.getNavigation().configure({radius:2}));
  const hit = async id => {
    await page.evaluate(id => window.graphBrowser.setSelect(window.graphBrowser.findNode(id)),id);
    if (gesture === "Return") { await page.locator("#graph svg").focus(); await page.keyboard.press("Enter"); }
    else await page.locator(`[data-node-id="${id}"]`).dispatchEvent("dblclick");
    await page.evaluate(() => window.graphBrowser.getLocalityUtils().whenIdle());
  };
  await hit("center");expect((await state(page)).enabled).toBe(false);
  await page.evaluate(() => window.graphBrowser.getRfc().setFocus(window.graphBrowser.findNode("center")));
  await hit("context-0");expect((await state(page)).focusId).toBe("center");
  await hit("context-0");expect((await state(page)).focusId).toBe("context-0");
  await page.evaluate(() => window.graphBrowser.getRfc().setFocus(null));
  await hit("context-0");expect((await state(page)).enabled).toBe(false);expect(errors).toEqual([]);
});

test("reusable RFC control bindings dispose without clearing separately owned controller state", async ({page}) => {
  await page.route("**/rfc-host.html", route => route.fulfill({contentType: "text/html", body: "<!doctype html><html><body></body></html>"}));
  await page.goto("/rfc-host.html");
  const result = await page.evaluate(async () => {
    const {FreshmindPanel, bindRfcControls} = await import("/src/fm/index.ts");
    const panel = new FreshmindPanel(undefined, {autoStart: false});
    const center = panel.addNode("center"), branch = panel.addNode("branch"); panel.addEdge(center, branch); panel.setSelect(center);
    const activate = document.createElement("button"), clear = document.createElement("button"), status = document.createElement("p");
    const springMultiplier = document.createElement("input"), angularStiffness = document.createElement("input"), clusterRigidity=document.createElement("input");
    springMultiplier.type = angularStiffness.type = clusterRigidity.type = "number";
    const dispose = bindRfcControls(panel, {activate, clear, status, springMultiplier, angularStiffness,clusterRigidity});
    activate.click(); const active = panel.getRfc().getState().enabled;
    panel.getRfc().configureClusters({rigidity:.5});
    dispose(); dispose(); clear.click(); springMultiplier.value = "10"; springMultiplier.dispatchEvent(new Event("change"));
    clusterRigidity.value="2";clusterRigidity.dispatchEvent(new Event("change"));
    const retained = panel.getRfc().getState(); panel.getRfc().setFocus(null); panel.repaintAfterMove();
    const staleStatus = status.textContent;
    activate.click(); const removed = !panel.getRfc().getState().enabled;
    panel.destroy();
    return {active, retained: retained.enabled && retained.settings.springMultiplier === 1&&retained.clusterSettings.rigidity===.5, staleStatus, removed};
  });
  expect(result).toEqual({active: true, retained: true, staleStatus: "RFC: center · 1 visible branch.", removed: true});
});
