import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";

async function ready(page) {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(()=>window.graphBrowser.tgLayout.stop());return errors;
}

test("RFC is active by default and sidebar sections collapse without losing values or keyboard editing",async({page},info)=>{
  const errors=await ready(page);
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().focusId)).toBe("root");
  await expect(page.locator("#rfc-indicator")).toHaveText("On");
  await expect(page.locator(".fm-rfc-node-halo")).toHaveCount(6);
  expect(await page.locator(".sidebar > details > summary").allTextContents()).toEqual(["Graph files","View","Reinforcement Focus + Context On","Navigation options","Selected item"]);
  const sizes=await page.locator(".sidebar > details > summary").evaluateAll(items=>items.map(x=>parseFloat(getComputedStyle(x).fontSize)));
  expect(sizes.every(n=>n>=16)).toBe(true);
  await page.locator("#graph-zoom").fill("140");
  const view=page.locator("#view-section > summary");
  await view.press("Enter");await expect(page.locator("#graph-zoom")).not.toBeVisible();
  await view.press("Enter");await expect(page.locator("#graph-zoom")).toHaveValue("140");
  await page.locator("#selection-section > summary").click();
  await expect(page.locator("#node-annotation")).not.toBeVisible();
  await page.locator("#graph svg").focus();await page.keyboard.press("Control+Space");
  await expect(page.locator("#node-annotation")).toBeFocused();
  await page.locator(".sidebar").evaluate(sidebar=>{sidebar.scrollTop=0;});
  await page.screenshot({path:info.outputPath("sidebar-sections.png")});expect(errors).toEqual([]);
});

test("loading graphs retains the user's RFC on/off choice and replaces prior centers",async({page})=>{
  const errors=await ready(page);
  await page.locator("#example-graph").selectOption("joined-trees");
  await expect(page.locator("#file-status")).toContainText("14 nodes, 13 relations");
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().centers.map(c=>c.focusId))).toEqual(["a0"]);
  await page.getByText("Reinforcement Focus + Context",{exact:true}).click();
  await page.getByRole("button",{name:"Remove RFC",exact:true}).click();
  await expect(page.locator("#rfc-indicator")).toHaveText("Off");
  await page.locator("#example-graph").selectOption("florentine");
  await expect(page.locator("#file-status")).toContainText("15 nodes, 20 relations");
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().enabled)).toBe(false);
  await page.getByRole("button",{name:"Reinforce selected node",exact:true}).click();
  await page.locator("#example-graph").selectOption("karate");
  await expect(page.locator("#file-status")).toContainText("34 nodes, 78 relations");
  expect(await page.evaluate(()=>{const p=window.graphBrowser,s=p.getRfc().getState();return s.centers.length===1&&s.focusId===p.getFocus().getID();})).toBe(true);
  expect(errors).toEqual([]);
});

test("Options owns export settings, supports keyboard dismissal and fits a narrow viewport",async({page},info)=>{
  const errors=await ready(page),options=page.getByRole("button",{name:"Options",exact:true});
  const popup=page.getByRole("dialog",{name:"Options",exact:true});
  expect(await page.locator(".sidebar #save-layout").count()).toBe(0);
  await options.click();await expect(popup).toBeVisible();
  await expect(page.getByRole("group",{name:"Export options"})).toBeVisible();
  await page.getByLabel("Include view settings",{exact:true}).uncheck();
  await page.keyboard.press("Escape");await expect(popup).not.toBeVisible();await expect(options).toBeFocused();
  const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Save YAML",exact:true}).click()]);
  expect(await readFile(await download.path(),"utf8")).not.toMatch(/^view:/m);
  await page.setViewportSize({width:390,height:844});await options.click();
  const bounds=await popup.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
  await expect(page.getByLabel("Include view settings",{exact:true})).not.toBeChecked();
  await page.screenshot({path:info.outputPath("options-menu-mobile.png")});
  await page.getByRole("button",{name:"Close options",exact:true}).click();await expect(popup).not.toBeVisible();
  expect(errors).toEqual([]);
});
