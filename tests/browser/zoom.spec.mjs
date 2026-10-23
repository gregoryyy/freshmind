import { test, expect } from "@playwright/test";

async function ready(page, path = "/") {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(path);
  await page.waitForFunction(() => Boolean(window.graphBrowser || window.freshmindBrowser));
  await page.evaluate(async () => {
    const p = window.graphBrowser || window.freshmindBrowser;
    p.fastFinishAnimation(); await p.getLocalityUtils().whenIdle(); p.tgLayout.stop();
    const { FreshGraph, FreshNode, FreshEdge } = await import("/src/fm/index.ts");
    const graph = new FreshGraph();
    for (const [id, x, y] of [["anchor", 0, 0], ["left", -100, 20], ["right", 140, -40], ["hidden", 0, 100]])
      graph.addNode(new FreshNode(id, id, { position: { x, y } }));
    for (const [id, target] of [["left-edge", "left"], ["right-edge", "right"], ["hidden-edge", "hidden"]])
      graph.addEdge(new FreshEdge(graph.findNode("anchor"), graph.findNode(target), { id, label: id }));
    p.setGraphEltSet(graph); p.getGES().addAll(); p.getGES().removeNode(graph.findNode("hidden"));
    p.setHyperbolic(0); p.setRotation(0); p.setZoom(1); p.setCanvasZoom(1);
    p.setSelect(graph.findNode("anchor")); p.centerOn(graph.findNode("anchor"), true);
    await p.getNavigation().configure({ preselectionTimeoutMs: 0, moveToCenter: false }); p.repaint();
  });
  return errors;
}

async function measure(page) {
  return page.evaluate(() => {
    const p = window.graphBrowser || window.freshmindBrowser;
    const a = document.querySelector('[data-node-id="anchor"] .fm-shape').getBoundingClientRect();
    const b = document.querySelector('[data-node-id="right"] .fm-shape').getBoundingClientRect();
    const label = document.querySelector('[data-node-id="anchor"] .tg-label'), matrix = label.getScreenCTM();
    // Glyph bounds can change with font hinting. Measure the effective screen font size instead.
    const fontSize = parseFloat(getComputedStyle(label).fontSize) * Math.hypot(matrix.a, matrix.b);
    return { width: a.width, height: a.height, label: fontSize, distance: Math.hypot(b.x + b.width / 2 - a.x - a.width / 2, b.y + b.height / 2 - a.y - a.height / 2),
      graph: p.getZoom(), canvas: p.getCanvasZoom(), positions: [...p.getAllNodes()].map(n => [n.getID(), n.x, n.y]) };
  });
}

for (const path of ["/", "/freshmind.html"]) {
  test(`graph spacing and canvas scale remain independent on ${path}`, async ({ page }, testInfo) => {
    const errors = await ready(page, path), before = await measure(page);
    await page.getByLabel("Graph spacing").fill("150");
    const spaced = await measure(page);
    expect(spaced.distance / before.distance).toBeCloseTo(1.5, 5);
    expect(spaced.width).toBeCloseTo(before.width, 5); expect(spaced.label).toBeCloseTo(before.label, 5);
    expect(spaced.canvas).toBe(1); await expect(page.locator("#graph-zoom-value")).toHaveText("150%");
    await page.getByRole("button", { name: "Canvas zoom in", exact: true }).click();
    const scaled = await measure(page);
    expect(scaled.graph).toBe(1.5); expect(scaled.canvas).toBeCloseTo(1.2, 8);
    for (const key of ["distance", "width", "height", "label"]) expect(scaled[key] / spaced[key], key).toBeCloseTo(1.2, 5);
    expect(scaled.positions).toEqual(before.positions);
    await expect(page.locator("#zoom-reset")).toHaveText("120%");
    await page.locator('[data-node-id="anchor"]').focus();
    await page.keyboard.press("Control+ArrowUp"); await page.keyboard.press("+");
    expect((await measure(page)).graph).toBeCloseTo(1.8, 8); expect((await measure(page)).canvas).toBeCloseTo(1.44, 8);
    await expect(page.locator("#graph-zoom-value")).toHaveText("180%"); await expect(page.locator("#zoom-reset")).toHaveText("144%");
    await page.screenshot({ path: testInfo.outputPath("dual-zoom.png") });
    await page.keyboard.press("Control+Shift+ArrowUp");
    expect((await measure(page)).canvas).toBeCloseTo(1.728, 8); expect((await measure(page)).graph).toBeCloseTo(1.8, 8);
    await expect(page.locator("#zoom-reset")).toHaveText("173%"); await expect(page.locator("#hyper")).toHaveValue("0");
    await page.keyboard.press("Control+Shift+ArrowDown"); expect((await measure(page)).canvas).toBeCloseTo(1.44, 8);
    await page.keyboard.press("Control+Shift+Digit1"); expect((await measure(page)).canvas).toBe(1);
    await page.keyboard.press("Control+Shift+ArrowUp");
    await page.getByRole("button", { name: "Reset canvas zoom", exact: true }).click();
    expect((await measure(page)).canvas).toBe(1); expect((await measure(page)).graph).toBeCloseTo(1.8, 8);
    expect(errors).toEqual([]);
  });
  test(`horizontal two-finger scroll adjusts focus/context and vertical scroll zooms canvas on ${path}`, async ({ page }) => {
    const errors = await ready(page, path), before = await measure(page), svg = page.locator("#graph svg"), box = await svg.boundingBox();
    await page.evaluate(() => (window.graphBrowser || window.freshmindBrowser).setHyperbolic(40));
    const view = () => page.evaluate(() => {
      const p = window.graphBrowser || window.freshmindBrowser;
      return { hyper: p.getHyperbolic(), canvas: p.getCanvasZoom(), graph: p.getZoom(), selection: p.getSelection()?.getID() };
    });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(100, 20); await expect.poll(async () => (await view()).hyper).toBeCloseTo(45, 8);
    expect(await view()).toEqual({ hyper: 45, canvas: 1, graph: 1, selection: "anchor" });
    await expect(page.locator("#hyper")).toHaveValue("45");
    await page.mouse.wheel(-40, -5); await expect.poll(async () => (await view()).hyper).toBeCloseTo(43, 8);
    await page.mouse.wheel(10, -100); await expect.poll(async () => (await view()).canvas).toBeGreaterThan(1);
    expect((await view()).hyper).toBe(43); expect((await view()).graph).toBe(1);
    expect((await measure(page)).positions).toEqual(before.positions);
    // Trackpad pinch is sent as Ctrl+wheel and must reach canvas zoom even with horizontal jitter.
    const pinch = await svg.evaluate(svg => {
      const p = window.graphBrowser || window.freshmindBrowser, before = p.getCanvasZoom(), box = svg.getBoundingClientRect();
      const event = new WheelEvent("wheel", { deltaX: 80, deltaY: -10, ctrlKey: true, clientX: box.x + 80, clientY: box.y + 80, bubbles: true, cancelable: true });
      svg.dispatchEvent(event); return { before, after: p.getCanvasZoom(), hyper: p.getHyperbolic() };
    });
    expect(pinch.after).toBeGreaterThan(pinch.before); expect(pinch.hyper).toBe(43);
    // Pixel, line and page deltas normalize to the same percentage scale, with clamping at the bounds.
    const normalized = await svg.evaluate(svg => {
      const p = window.graphBrowser || window.freshmindBrowser, values = [];
      for (const [deltaX, deltaMode] of [[5, 1], [.1, 2], [10000, 0], [-10000, 0]]) {
        const event = new WheelEvent("wheel", { deltaX, deltaMode, bubbles: true, cancelable: true });
        svg.dispatchEvent(event); values.push({ hyper: p.getHyperbolic(), prevented: event.defaultPrevented });
      }
      return { values, width: svg.clientWidth };
    });
    expect(normalized.values[0]).toEqual({ hyper: 47, prevented: true });
    expect(normalized.values[1].hyper).toBeCloseTo(47 + .1 * normalized.width / 20, 6);
    expect(normalized.values[2]).toEqual({ hyper: 100, prevented: true }); expect(normalized.values[3]).toEqual({ hyper: 0, prevented: true });
    const editor = await page.locator('[data-node-id="anchor"]').evaluate(node => {
      const p = window.graphBrowser || window.freshmindBrowser;
      const foreign = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject"), input = document.createElement("textarea");
      foreign.append(input); node.append(foreign); input.focus();
      const before = [p.getZoom(), p.getCanvasZoom(), p.getHyperbolic()];
      const wheel = new WheelEvent("wheel", { deltaX: 100, deltaY: 20, bubbles: true, cancelable: true }); input.dispatchEvent(wheel);
      for (const key of ["ArrowRight", "ArrowUp", "!"]) input.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
      const after = [p.getZoom(), p.getCanvasZoom(), p.getHyperbolic()]; foreign.remove();
      return { before, after, prevented: wheel.defaultPrevented };
    });
    expect(editor.after).toEqual(editor.before); expect(editor.prevented).toBe(false); expect(errors).toEqual([]);
  });
}

test("wheel zoom anchors the pointer; canvas pan and center retain both scales through resize", async ({ page }) => {
  const errors = await ready(page);
  const svg = page.locator("#graph svg"), box = await svg.boundingBox();
  const point = { x: box.width / 2 + 75, y: box.height / 2 + 65 };
  const worldAt = point => page.evaluate(point => {
    const p = window.graphBrowser; return p.getLensSet().convDrawToReal(p.screenToDraw(point));
  }, point);
  const before = await worldAt(point), initial = await measure(page);
  await page.mouse.move(box.x + point.x, box.y + point.y); await page.mouse.wheel(0, -200);
  await expect.poll(async () => (await measure(page)).canvas).toBeGreaterThan(1);
  const after = await worldAt(point);
  expect(after.x).toBeCloseTo(before.x, 5); expect(after.y).toBeCloseTo(before.y, 5);
  expect((await measure(page)).graph).toBe(1);
  // Start a pan on empty background. Moving it should translate every graphic by exactly the pointer delta.
  const anchor = page.locator('[data-node-id="anchor"]'), old = await anchor.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 55, { steps: 5 }); await page.mouse.up();
  const moved = await anchor.boundingBox();
  expect(moved.x - old.x).toBeCloseTo(60, 4); expect(moved.y - old.y).toBeCloseTo(35, 4);
  const centerBefore = await page.evaluate(() => window.graphBrowser.getCenter());
  await page.evaluate(() => window.graphBrowser.canvasZoomBy(1.3));
  const centerAfter = await page.evaluate(() => window.graphBrowser.getCenter());
  expect(centerAfter.x).toBeCloseTo(centerBefore.x, 5); expect(centerAfter.y).toBeCloseTo(centerBefore.y, 5);
  const scales = await measure(page);
  await page.getByRole("button", { name: "Center view", exact: true }).click();
  await page.setViewportSize({ width: 1200, height: 850 });
  await expect.poll(async () => {
    const a = await anchor.boundingBox(), s = await svg.boundingBox();
    return Math.hypot(a.x + a.width / 2 - s.x - s.width / 2, a.y + a.height / 2 - s.y - s.height / 2);
  }).toBeLessThan(.01);
  expect((await measure(page)).canvas).toBeCloseTo(scales.canvas, 8);
  expect((await measure(page)).positions).toEqual(initial.positions); expect(errors).toEqual([]);
});

test("combined zoom preserves inverse node dragging, focus release, curve picking and double-click centering", async ({ page }) => {
  const errors = await ready(page);
  await page.evaluate(() => { const p = window.graphBrowser; p.setZoom(1.4); p.setCanvasZoom(1.7); p.setHyperbolic(65); p.setRotation(.35); });
  for (const id of ["right", "anchor"]) {
    const node = page.locator(`[data-node-id="${id}"]`), box = await node.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 45, y + 25, { steps: 6 }); await page.mouse.up();
    const moved = await node.boundingBox();
    expect(moved.x - box.x).toBeCloseTo(45, 0); expect(moved.y - box.y).toBeCloseTo(25, 0);
  }
  const svg = await page.locator("#graph svg").boundingBox();
  const hit = await page.evaluate(() => {
    const p = window.graphBrowser, e = [...p.getAllEdges()].find(e => e.getID() === "right-edge");
    return p.drawToScreen(p.getEdgeGeometry(e).pointAt(.5));
  });
  await page.mouse.move(svg.x + hit.x, svg.y + hit.y);
  const target = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.outerHTML, { x: svg.x + hit.x, y: svg.y + hit.y });
  await page.mouse.click(svg.x + hit.x, svg.y + hit.y);
  expect(await page.evaluate(() => window.graphBrowser.getSelectEdge()?.getID()), target).toBe("right-edge");
  await page.locator('[data-node-id="right"]').dblclick();
  const centered = await page.evaluate(() => {
    const p = window.graphBrowser, n = p.findNode("right"), point = p.drawToScreen({ x: n.drawx, y: n.drawy }), c = p.getDrawCenter();
    return { distance: Math.hypot(point.x - c.x, point.y - c.y), graph: p.getZoom(), canvas: p.getCanvasZoom() };
  });
  expect(centered.distance).toBeLessThan(1e-5); expect(centered.graph).toBe(1.4); expect(centered.canvas).toBe(1.7);
  expect(errors).toEqual([]);
});

test("editing and Shift rectangle selection invert canvas scale and pan", async ({ page }) => {
  const errors = await ready(page);
  await page.evaluate(() => { const p = window.graphBrowser; p.setZoom(1.3); p.setCanvasZoom(1.8); p.setHyperbolic(50); p.setRotation(.4); p.setInteractionMode("edit"); });
  const svg = page.locator("#graph svg"), box = await svg.boundingBox();
  const point = { x: 180, y: 100 };
  const expected = await page.evaluate(point => { const p = window.graphBrowser; return p.getLensSet().convDrawToReal(p.screenToDraw(point)); }, point);
  await svg.dblclick({ position: point });
  const added = page.locator('[data-node-id="New node"]'); await expect(added).toBeVisible();
  const actual = await page.evaluate(() => { const n = window.graphBrowser.findNode("New node"); return { x: n.x, y: n.y }; });
  expect(actual.x).toBeCloseTo(expected.x, 4); expect(actual.y).toBeCloseTo(expected.y, 4);
  await page.evaluate(() => window.graphBrowser.setSelect(null));
  const body = await added.boundingBox(), x = body.x + body.width / 2, y = body.y + body.height / 2;
  await page.keyboard.down("Shift"); await page.mouse.move(x - body.width / 2 - 10, y - body.height / 2 - 10); await page.mouse.down();
  await page.mouse.move(x + body.width / 2 + 10, y + body.height / 2 + 10, { steps: 5 }); await page.mouse.up(); await page.keyboard.up("Shift");
  expect(await page.evaluate(() => window.graphBrowser.getSelect()?.getID())).toBe("New node");
  await expect(page.locator(".tg-selection-box")).toHaveCount(0);
  // Pointer position is exposed in renderer coordinates, matching hit-test APIs.
  await page.mouse.move(box.x + point.x, box.y + point.y);
  const mouse = await page.evaluate(() => { const p = window.graphBrowser; return p.drawToScreen(p.getMousePos()); });
  expect(mouse.x).toBeCloseTo(point.x, 4); expect(mouse.y).toBeCloseTo(point.y, 4);
  expect(errors).toEqual([]);
});
