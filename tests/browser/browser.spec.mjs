import { test, expect } from "@playwright/test";

async function ready(page) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.graphBrowser));
  await page.evaluate(async () => {
    const panel = window.graphBrowser;
    panel.fastFinishAnimation(); await panel.getLocalityUtils().whenIdle(); panel.tgLayout.stop();
    panel.tgLayout.tick(100); panel.centerView();
  });
  return errors;
}
test("browses neighborhoods, expands branches, and renders the full context", async ({ page }) => {
  const errors = await ready(page);
  await expect(page.locator(".tg-node")).toHaveCount(36);
  await page.evaluate(async () => {
    const panel = window.graphBrowser;
    await panel.focusNode(panel.findNode("topic-1"), 1);
  });
  await expect(page.locator(".tg-node")).toHaveCount(8);
  await page.evaluate(async () => {
    const panel = window.graphBrowser;
    const expanding = panel.expandNode(panel.findNode("node-1-0"));
    panel.fastFinishAnimation(); await expanding;
  });
  await expect(page.locator("[data-node-id='detail-2']")).toBeVisible();
  await expect(page.locator("[data-node-id='detail-3']")).toBeVisible();
  await page.getByRole("button", { name: "Show whole graph" }).click();
  await expect(page.locator(".tg-node")).toHaveCount(48);
  await expect(page.locator("#graph-count")).toHaveText("48 of 48 nodes");
  expect(errors).toEqual([]);
});
test("drags through the nonlinear lens, zooms, selects and pins", async ({ page }) => {
  const errors = await ready(page);
  const node = page.locator("[data-node-id='topic-0']");
  const box = await node.boundingBox();
  const before = await page.evaluate(() => {
    const node = window.graphBrowser.findNode("topic-0"); return [node.x, node.y, node.drawx, node.drawy];
  });
  const x = box.x + box.width / 2, y = box.y + 14;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 65, y + 30, { steps: 6 }); await page.mouse.up();
  const after = await page.evaluate(() => {
    const node = window.graphBrowser.findNode("topic-0"); return [node.x, node.y, node.drawx, node.drawy];
  });
  expect(after[0]).not.toBe(before[0]);
  expect(Math.abs(after[2] - before[2] - 65)).toBeLessThan(1);
  expect(Math.abs(after[3] - before[3] - 30)).toBeLessThan(1);
  await node.click(); await expect(page.locator("#selected-name")).toHaveText("Layout");
  await page.getByLabel("Pin this node in place").check();
  expect(await page.evaluate(() => window.graphBrowser.findNode("topic-0").isFixed())).toBe(true);
  await page.getByLabel("Zoom in", { exact: true }).click();
  const coordinates = await page.evaluate(() => [...window.graphBrowser.getGES().getNodes()].map(n => [n.drawx, n.drawy]));
  expect(coordinates.flat().every(Number.isFinite)).toBe(true);
  expect(errors).toEqual([]);
});
test("lens changes preserve the model, and focus can be dragged", async ({ page }) => {
  const errors = await ready(page);
  const positions = () => page.evaluate(() => [...window.graphBrowser.getAllNodes()].map(n => [n.x, n.y]));
  const before = await positions();
  await page.locator("#hyper").fill("100");
  expect(await positions()).toEqual(before);
  const root = page.locator("[data-node-id='root']");
  const box = await root.boundingBox();
  const x = box.x + box.width / 2, y = box.y + 14;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 50, y + 20, { steps: 5 }); await page.mouse.up();
  const after = await root.boundingBox();
  expect(Math.abs(after.x - box.x - 50)).toBeLessThan(1);
  expect(Math.abs(after.y - box.y - 20)).toBeLessThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#graph svg")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false); expect(errors).toEqual([]);
});
