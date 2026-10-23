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

test("graph editing adds, connects and deletes nodes through the viewing lens", async ({ page }) => {
  const errors = await ready(page);
  const initialEdges = await page.evaluate(() => window.graphBrowser.getEdgeCount());
  await page.getByRole("button", { name: "Edit graph", exact: true }).click();
  const svg = page.locator("#graph svg");
  await expect(svg).toHaveAttribute("data-interaction-mode", "edit");
  const before = await page.evaluate(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const panel = window.graphBrowser, size = panel.getSize();
    const x = size.width * .55, y = size.height * .6;
    const world = panel.getLensSet().convDrawToReal(x, y);
    return { x, y, world };
  });
  await svg.dblclick({ position: { x: before.x, y: before.y } });
  const added = page.locator('[data-node-id="New node"]');
  await expect(added).toBeVisible();
  const position = await page.evaluate(() => {
    const node = window.graphBrowser.findNode("New node"); return [node.x, node.y];
  });
  expect(Math.abs(position[0] - before.world.x)).toBeLessThan(1); expect(Math.abs(position[1] - before.world.y)).toBeLessThan(1);
  await page.locator('[data-node-id="root"]').click();
  await added.click({ modifiers: ["Shift"] });
  expect(await page.evaluate(() => window.graphBrowser.getEdgeCount())).toBe(initialEdges + 1);
  expect(await page.evaluate(() => Boolean(window.graphBrowser.findEdge(window.graphBrowser.findNode("root"), window.graphBrowser.findNode("New node"))))).toBe(true);
  await added.press("Delete");
  await expect(added).toHaveCount(0);
  expect(await page.evaluate(() => window.graphBrowser.getNodeCount())).toBe(48);
  expect(await page.evaluate(() => window.graphBrowser.getEdgeCount())).toBe(initialEdges);
  expect(errors).toEqual([]);
});

test("selection toggles, background clears, hover and directed arrows are present", async ({ page }) => {
  const errors = await ready(page);
  const root = page.locator('[data-node-id="root"]');
  await root.click(); await expect(page.locator("#selected-name")).toHaveText("Choose an idea");
  await root.click(); await expect(page.locator("#selected-name")).toHaveText("Graph browsers");
  await page.locator("#graph svg").click({ position: { x: 8, y: 8 } });
  await expect(page.locator("#selected-name")).toHaveText("Choose an idea");
  await root.hover();
  expect(await page.evaluate(() => window.graphBrowser.getMouseOverN()?.getID())).toBe("root");
  const edge = page.locator(".tg-edges line").first();
  await expect(edge).toHaveAttribute("marker-end", /url\(#tg-arrow-/);
  expect(await page.evaluate(() => window.graphBrowser.findNode("root").getWidth())).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});

test("Shift-drag rectangle selects a node in screen coordinates", async ({ page }) => {
  const errors = await ready(page);
  const root = await page.locator('[data-node-id="root"]').boundingBox();
  const x = root.x + root.width / 2, y = root.y + 14;
  await page.keyboard.down("Shift");
  await page.mouse.move(x - 65, y - 35); await page.mouse.down();
  await page.mouse.move(x + 65, y + 35, { steps: 5 }); await page.mouse.up();
  await page.keyboard.up("Shift");
  expect(await page.evaluate(() => window.graphBrowser.getSelect()?.getID())).toBe("root");
  await expect(page.locator(".tg-selection-box")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a node focus outline excludes the hidden-edge count", async ({ page }) => {
  const errors = await ready(page);
  const node = page.locator('[data-node-id="node-1-1"].tg-node');
  await page.keyboard.press("Tab");
  await node.focus();
  await expect(node).toBeFocused();
  const geometry = await node.evaluate(element => {
    const group = element.getBBox();
    const shape = element.querySelector(".tg-shape").getBBox();
    return { groupHeight: group.height, shapeHeight: shape.height, keyboardFocus: element.matches(":focus-visible") };
  });
  expect(geometry.keyboardFocus).toBe(true);
  expect(geometry.groupHeight).toBeCloseTo(geometry.shapeHeight, 5);
  const badge = page.locator('.tg-hidden-count[data-for-node="node-1-1"]');
  await expect(badge).toHaveText("+1");
  const bodyBox = await node.boundingBox();
  const badgeBox = await badge.boundingBox();
  const outlineExtent = await node.evaluate(element => {
    const style = getComputedStyle(element);
    return parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
  });
  expect(badgeBox.y).toBeGreaterThan(bodyBox.y + bodyBox.height + outlineExtent);
  await page.screenshot({ path: test.info().outputPath("node-focus.png") });
  await page.evaluate(async () => {
    const panel = window.graphBrowser;
    const expanding = panel.expandNode(panel.findNode("node-1-1"));
    panel.fastFinishAnimation(); await expanding;
  });
  await expect(badge).toHaveCount(0);
  expect(errors).toEqual([]);
});
