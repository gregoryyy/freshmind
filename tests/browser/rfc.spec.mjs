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
  await page.getByLabel("Focal spring multiplier").fill("4"); await page.getByLabel("Focal spring multiplier").press("Tab");
  await page.getByLabel("Angular stiffness").fill("400"); await page.getByLabel("Angular stiffness").press("Tab");
  expect((await state(page)).settings).toEqual({springMultiplier: 4, angularStiffness: 400, coordinateWeights: {x: 1, y: 1}});
  await page.getByLabel("Focal spring multiplier").fill("0"); await page.getByLabel("Focal spring multiplier").press("Tab");
  expect((await state(page)).settings.springMultiplier).toBe(4);
  expect(await page.getByLabel("Focal spring multiplier").evaluate(input => input.validationMessage)).toContain("springMultiplier");
  await page.getByLabel("Focal spring multiplier").fill("3"); await page.getByLabel("Focal spring multiplier").press("Tab");
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
  await expect(page.locator("#rfc-status")).toHaveText("RFC off."); expect((await state(page)).enabled).toBe(false);
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

test("reusable RFC control bindings dispose without clearing separately owned controller state", async ({page}) => {
  await page.route("**/rfc-host.html", route => route.fulfill({contentType: "text/html", body: "<!doctype html><html><body></body></html>"}));
  await page.goto("/rfc-host.html");
  const result = await page.evaluate(async () => {
    const {FreshmindPanel, bindRfcControls} = await import("/src/fm/index.ts");
    const panel = new FreshmindPanel(undefined, {autoStart: false});
    const center = panel.addNode("center"), branch = panel.addNode("branch"); panel.addEdge(center, branch); panel.setSelect(center);
    const activate = document.createElement("button"), clear = document.createElement("button"), status = document.createElement("p");
    const springMultiplier = document.createElement("input"), angularStiffness = document.createElement("input");
    springMultiplier.type = angularStiffness.type = "number";
    const dispose = bindRfcControls(panel, {activate, clear, status, springMultiplier, angularStiffness});
    activate.click(); const active = panel.getRfc().getState().enabled;
    dispose(); dispose(); clear.click(); springMultiplier.value = "10"; springMultiplier.dispatchEvent(new Event("change"));
    const retained = panel.getRfc().getState(); panel.getRfc().setFocus(null); panel.repaintAfterMove();
    const staleStatus = status.textContent;
    activate.click(); const removed = !panel.getRfc().getState().enabled;
    panel.destroy();
    return {active, retained: retained.enabled && retained.settings.springMultiplier === 3, staleStatus, removed};
  });
  expect(result).toEqual({active: true, retained: true, staleStatus: "RFC: center · 1 visible branch.", removed: true});
});
