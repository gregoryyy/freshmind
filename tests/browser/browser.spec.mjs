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
    const panel = window.graphBrowser, size = panel.getSize(), svg = document.querySelector("#graph svg"), box = svg.getBoundingClientRect();
    const candidates = [{x:size.width*.55,y:size.height*.6}, {x:50,y:50}, {x:50,y:size.height-50}];
    const position = candidates.find(p => document.elementFromPoint(box.x+p.x,box.y+p.y) === svg);
    if (!position) throw new Error("No empty background point available for creation gesture");
    const {x,y} = position;
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
  const edge = page.locator(".fm-edge").first();
  await expect(edge.locator(".fm-edge-path")).toHaveAttribute("d", / Q /);
  await expect(edge.locator(".fm-edge-arrow")).toHaveAttribute("transform", /rotate\(/);
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
    const shape = element.querySelector(".fm-shape").getBBox();
    return { groupHeight: group.height, shapeHeight: shape.height, keyboardFocus: element.matches(":focus-visible") };
  });
  expect(geometry.keyboardFocus).toBe(true);
  expect(geometry.groupHeight).toBeCloseTo(geometry.shapeHeight, 5);
  const badge = page.locator('.tg-hidden-count[data-for-node="node-1-1"]');
  await expect(badge).toHaveText("+1");
  const bodyBox = await node.boundingBox();
  const badgeBox = await badge.boundingBox();
  const outline = page.locator('.fm-keyboard-focus[data-focus-node="node-1-1"]');
  await expect(outline).toBeVisible();
  const outlineBox = await outline.boundingBox();
  expect(outlineBox.y).toBeLessThan(bodyBox.y);
  expect(outlineBox.height).toBeGreaterThan(bodyBox.height);
  // SVG getBoundingClientRect conservatively inflates path joins; measure the actual bottom stroke.
  const strokeBottom = await outline.evaluate(element => {
    const box = element.getBBox(), width = parseFloat(getComputedStyle(element).strokeWidth);
    return new DOMPoint(0, box.y + box.height + width / 2).matrixTransform(element.getScreenCTM()).y;
  });
  await page.screenshot({ path: test.info().outputPath("node-focus.png") });
  expect(badgeBox.y).toBeGreaterThan(strokeBottom);
  await page.evaluate(async () => {
    const panel = window.graphBrowser;
    const expanding = panel.expandNode(panel.findNode("node-1-1"));
    panel.fastFinishAnimation(); await expanding;
  });
  await expect(badge).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("main browser exposes all curve modes through the same graph and preserves world positions", async ({ page }, testInfo) => {
  const errors = await ready(page);
  await expect(page.locator(".fm-node")).toHaveCount(36);
  const positions = await page.evaluate(() => [...window.graphBrowser.getAllNodes()].map(n => [n.x,n.y]));
  const measurements = [];
  for (const mode of ["spider", "lens", "straight"]) {
    await page.getByLabel("Edge curves", {exact:true}).selectOption(mode);
    measurements.push(await page.evaluate(() => {
      const p=window.graphBrowser,e=[...p.getGES().getEdges()].find(e=>e.from.getID()==="topic-1"&&e.to.getID()==="node-1-1"),g=p.getEdgeGeometry(e);
      return {path:g.path,curve:p.getEdgeStyle(e).curve,delta:Math.hypot(g.midpoint.x-(e.from.drawx+e.to.drawx)/2,g.midpoint.y-(e.from.drawy+e.to.drawy)/2)};
    }));
  }
  expect(measurements.map(m=>m.curve)).toEqual(["spider","lens","straight"]);
  expect(new Set(measurements.map(m=>m.path)).size).toBe(3);expect(measurements[1].delta).toBeGreaterThan(.1);expect(measurements[2].delta).toBeLessThan(1e-8);
  expect(await page.evaluate(() => [...window.graphBrowser.getAllNodes()].map(n => [n.x,n.y]))).toEqual(positions);
  await page.screenshot({path:testInfo.outputPath("main-browser-controls.png")});
  expect(errors).toEqual([]);
});

test("main inspector saves node labels, types and shapes with stable identity and supports cancel", async ({ page }, testInfo) => {
  const errors = await ready(page),root=page.locator('[data-node-id="root"]');
  const before=await page.evaluate(()=>{const n=window.graphBrowser.findNode("root");return [n.x,n.y,n.getHint()];});
  await root.press("F2");await expect(page.getByLabel("Node label",{exact:true})).toBeFocused();
  await page.getByLabel("Node label",{exact:true}).fill("A new\nlabel");
  await page.getByLabel("Semantic type",{exact:true}).selectOption("person");
  await page.getByLabel("Node shape",{exact:true}).selectOption("ellipse");
  expect(await page.evaluate(()=>window.graphBrowser.findNode("root").getLabel())).toBe("Graph browsers");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  await expect(root).toBeFocused();await expect(root).toHaveAttribute("data-semantic-type","person");
  await expect(root.locator(".fm-shape")).toHaveAttribute("d",/ A /);
  await expect(page.locator("#selected-name")).toHaveText("A new\nlabel");
  expect(await page.evaluate(()=>{const n=window.graphBrowser.findNode("root");return [n.x,n.y,n.getHint()];})).toEqual(before);
  await root.press("F2");await page.getByLabel("Node label",{exact:true}).fill("Do not save");
  await page.getByLabel("Node label",{exact:true}).press("Escape");
  expect(await page.evaluate(()=>window.graphBrowser.findNode("root").getLabel())).toBe("A new\nlabel");
  await expect(root).toBeFocused();expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath("main-node-editor.png")});
});

test("node drafts survive selection changes and text-entry deletion does not delete graph nodes", async ({ page }) => {
  const errors=await ready(page),label=page.getByLabel("Node label",{exact:true});
  await label.fill("Keep this draft");await label.press("Backspace");
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(48);
  const draft=await label.inputValue();
  await page.locator('[data-node-id="topic-0"]').click();
  await page.locator('[data-node-id="root"]').click();
  await expect(label).toHaveValue(draft);await expect(page.locator("#editor-status")).toContainText("Unsaved changes");
  await label.press("Control+Enter");expect(await page.evaluate(()=>window.graphBrowser.findNode("root").getLabel())).toBe(draft);
  expect(errors).toEqual([]);
});

test("relation selection drives editing and per-relation curve overrides can be reset", async ({ page }) => {
  const errors=await ready(page),edge=page.locator('.fm-edge').first(),id=await edge.getAttribute("data-edge-id");
  await edge.press("Enter");await expect(page.locator("#selection-kind")).toHaveText("SELECTED RELATION");
  await page.getByLabel("Relation label",{exact:true}).fill("references");
  await page.getByLabel("Semantic type",{exact:true}).selectOption("cites");
  await page.getByLabel("Relation curve",{exact:true}).selectOption("straight");
  await page.getByLabel("Relation label",{exact:true}).press("Enter");
  await expect(edge.locator(".fm-edge-label")).toHaveText("references");await expect(edge).toHaveAttribute("data-semantic-type","cites");
  expect(await page.evaluate(id=>{const p=window.graphBrowser,e=[...p.getAllEdges()].find(e=>e.getID()===id);return p.getEdgeStyle(e).curve;},id)).toBe("straight");
  await page.getByLabel("Edge curves",{exact:true}).selectOption("lens");
  await page.getByLabel("Relation curve",{exact:true}).selectOption("");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  expect(await page.evaluate(id=>{const p=window.graphBrowser,e=[...p.getAllEdges()].find(e=>e.getID()===id);return p.getEdgeStyle(e).curve;},id)).toBe("lens");
  expect(errors).toEqual([]);
});

test("visible edit controls add, rename and delete a node", async ({ page }) => {
  const errors=await ready(page);
  await page.getByRole("button",{name:"Edit graph",exact:true}).click();
  await page.getByRole("button",{name:"Add node",exact:true}).click();
  const label=page.getByLabel("Node label",{exact:true});await expect(label).toBeFocused();await label.fill("My node");
  await label.press("Control+Enter");await expect(page.locator('[data-node-id="New node"] .tg-label')).toHaveText("My node");
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(49);
  await page.getByRole("button",{name:"Delete selected item",exact:true}).click();
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(48);
  await expect(page.locator('[data-node-id="New node"]')).toHaveCount(0);expect(errors).toEqual([]);
});

test("view movement reuses text measurements while label and font edits refresh node dimensions", async ({ page }) => {
  const errors=await ready(page);
  const result=await page.evaluate(()=>{
    const p=window.graphBrowser,n=p.findNode("root"),original=SVGTextElement.prototype.getComputedTextLength;
    let reads=0;SVGTextElement.prototype.getComputedTextLength=function(){reads++;return original.call(this);};
    try {
      p.setHyperbolic(80);p.setRotation(.2);p.repaint();const viewReads=reads,oldHeight=n.getHeight();
      n.setLabel("A label that wraps over several lines when its length exceeds the configured text width");p.repaint();
      const editedHeight=n.getHeight(),labelReads=reads;n.setVisual({style:{text:{font:"24px monospace"}}});p.repaint();
      return {viewReads,labelReads,allReads:reads,oldHeight,editedHeight,fontHeight:n.getHeight()};
    }finally{SVGTextElement.prototype.getComputedTextLength=original;}
  });
  expect(result.viewReads).toBe(0);expect(result.labelReads).toBeGreaterThan(0);expect(result.allReads).toBeGreaterThan(result.labelReads);
  expect(result.editedHeight).toBeGreaterThan(result.oldHeight);expect(result.fontHeight).toBeGreaterThan(result.editedHeight);
  expect(errors).toEqual([]);
});
