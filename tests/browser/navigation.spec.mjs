import { test, expect } from "@playwright/test";

async function ready(page) {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");await page.waitForFunction(()=>Boolean(window.graphBrowser));
  await page.evaluate(async()=>{
    const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();
    const {FreshGraph,FreshNode,FreshEdge}=await import("/src/fm/index.ts");
    const g=new FreshGraph();
    for(const [id,x,y] of [["anchor",-120,0],["upper",100,-80],["middle",100,0],["lower",100,80]])
      g.addNode(new FreshNode(id,id,{position:{x,y},annotation:{format:"text",text:`Details for ${id}`}}));
    for(const [id,from,to] of [["incoming","upper","anchor"],["middle-edge","anchor","middle"],["lower-edge","anchor","lower"],["parallel","middle","anchor"]])
      g.addEdge(new FreshEdge(g.findNode(from),g.findNode(to),{id,label:id}));
    p.setGraphEltSet(g);p.setHyperbolic(0);p.setRotation(0);p.setZoom(1);
    await p.getNavigation().configure({preselectionTimeoutMs:0});
    p.setSelect(g.findNode("anchor"));await p.getNavigation().centerSelection();
    p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();p.repaint();
  });
  await page.locator('[data-node-id="anchor"]').focus();
  return errors;
}
const state=page=>page.evaluate(()=>{
  const p=window.graphBrowser,n=p.getNavigation(),s=n.getState();
  return {selected:p.getSelection()?.getID(),anchor:p.getSelect()?.getID(),focus:p.getNeighborhoodFocus()?.getID(),
    candidates:s.preselection?.candidateIds,active:s.preselection?.candidateIds[s.preselection.activeIndex],kind:s.preselection?.kind};
});
test("keyboard and lens focus frames follow every node shape without enlarging its focus bounds",async({page},testInfo)=>{
  const errors=await ready(page);
  await page.keyboard.press("Tab");
  const results=await page.evaluate(async()=>{
    const {nodeShapes,createNodeOutline}=await import("/src/fm/core.ts"),p=window.graphBrowser,n=p.findNode("anchor"),results=[];
    for(const shape of nodeShapes) {
      document.querySelector("#depth").focus();n.setVisual({style:{shape}});p.repaint();
      const node=document.querySelector('[data-node-id="anchor"]');node.focus();
      await Promise.resolve();
      const ring=document.querySelector('.fm-keyboard-focus[data-focus-node="anchor"]'),lens=document.querySelector(".fm-focus");
      results.push({shape,keyboard:ring?.getAttribute("d"),lens:lens.getAttribute("d"),
        expectedKeyboard:createNodeOutline(shape,n.getWidth()+8,n.getHeight()+8).path,
        expectedLens:createNodeOutline(shape,n.getWidth()+6,n.getHeight()+6).path,
        nativeOutline:getComputedStyle(node).outlineStyle,body:node.querySelector(".fm-shape").getBBox().height,group:node.getBBox().height});
    }
    return results;
  });
  for(const result of results) {
    expect(result.keyboard,result.shape).toBe(result.expectedKeyboard);expect(result.lens,result.shape).toBe(result.expectedLens);
    expect(result.nativeOutline).toBe("none");expect(result.group).toBeCloseTo(result.body,5);
  }
  await page.screenshot({path:testInfo.outputPath("shaped-keyboard-focus.png")});
  await page.locator("#depth").focus();await expect(page.locator(".fm-keyboard-focus")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("double-click centers through shared settings, retains pan-only neighborhoods and respects edit mode",async({page})=>{
  const errors=await ready(page);
  const before=await page.evaluate(async()=>{
    const p=window.graphBrowser;await p.getNavigation().configure({radius:1,moveToCenter:false});
    return [...p.getAllNodes()].map(n=>[n.getID(),n.x,n.y]);
  });
  await page.locator('[data-node-id="middle"]').dblclick();
  expect(await state(page)).toMatchObject({selected:"middle",focus:"anchor"});
  await expect(page.locator(".fm-node")).toHaveCount(4);
  const centered=()=>page.evaluate(()=>{const p=window.graphBrowser,n=p.getSelect(),c=p.getDrawCenter();return Math.hypot(n.drawx-c.x,n.drawy-c.y);});
  expect(await centered()).toBeLessThan(1e-6);
  await page.evaluate(()=>window.graphBrowser.getNavigation().configure({moveToCenter:true}));
  await page.locator('[data-node-id="upper"]').dblclick();
  await expect(page.locator(".fm-node")).toHaveCount(2);
  expect(await state(page)).toMatchObject({selected:"upper",focus:"upper"});expect(await centered()).toBeLessThan(1e-6);
  await page.evaluate(()=>window.graphBrowser.setInteractionMode("edit"));
  await page.locator('[data-node-id="anchor"]').dblclick();expect((await state(page)).focus).toBe("upper");
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]))).toEqual(before);
  expect(errors).toEqual([]);
});
test("directional candidates cycle, keep selection until confirmation and center only on a second Enter",async({page})=>{
  const errors=await ready(page);
  await page.keyboard.press("ArrowRight");expect(await state(page)).toMatchObject({selected:"anchor",active:"middle",candidates:["upper","middle","lower"]});
  await expect(page.locator("#navigation-status")).toContainText("2 of 3, middle");
  const flags=await page.evaluate(()=>[...window.graphBrowser.getGES().getNodes()].filter(n=>n.isPreselected()).map(n=>n.getID()));
  expect(flags.sort()).toEqual(["lower","middle","upper"]);
  await page.locator("#graph svg").evaluate(svg=>svg.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",repeat:true,bubbles:true,cancelable:true})));
  expect((await state(page)).selected).toBe("anchor");
  await page.keyboard.press("ArrowDown");expect((await state(page)).active).toBe("lower");
  await page.keyboard.press("ArrowUp");expect((await state(page)).active).toBe("middle");
  await page.keyboard.press("Enter");expect(await state(page)).toMatchObject({selected:"middle",focus:"anchor"});
  await expect(page.locator('[data-node-id="middle"]')).toBeFocused();
  await page.keyboard.press("Enter");expect((await state(page)).focus).toBe("middle");
  const centered=await page.evaluate(()=>{const p=window.graphBrowser,n=p.getSelect(),c=p.getDrawCenter();return Math.hypot(n.drawx-c.x,n.drawy-c.y);});
  expect(centered).toBeLessThan(1e-6);expect(errors).toEqual([]);
});
test("edge candidates retain parallel relations and Escape restores the anchor, then clears selection",async({page})=>{
  const errors=await ready(page);
  await page.keyboard.press("ArrowRight");await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator('[data-edge-id="middle-edge"]')).toHaveAccessibleName("anchor → middle, middle-edge, default");
  expect(await state(page)).toMatchObject({kind:"edge",candidates:["incoming","middle-edge","parallel","lower-edge"],active:"middle-edge"});
  await page.keyboard.press("Space");expect(await state(page)).toMatchObject({selected:"middle-edge",anchor:"anchor"});
  await expect(page.locator("#focus")).toBeEnabled();await page.keyboard.press("Escape");expect((await state(page)).selected).toBe("anchor");
  await page.keyboard.press("Escape");expect((await state(page)).selected).toBeUndefined();
  await page.keyboard.press("ArrowRight");expect((await state(page)).selected).toBe("anchor");expect(errors).toEqual([]);
});
test("mouse and focus changes cancel candidates; text entry, Tab and browser chords keep their normal behavior",async({page})=>{
  const errors=await ready(page);await page.keyboard.press("ArrowRight");
  await page.locator('[data-node-id="upper"]').click();expect(await state(page)).toMatchObject({selected:"upper",candidates:undefined});
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("anchor")));
  await page.locator('[data-node-id="anchor"]').focus();await page.keyboard.press("ArrowRight");
  await page.locator("#depth").focus();expect((await state(page)).candidates).toBeUndefined();
  await page.locator('[data-node-id="anchor"]').focus();await page.keyboard.press("ArrowRight");await page.keyboard.press("Tab");
  expect((await state(page)).selected).toBe("anchor");
  // Focus a graph item, then F2 hands input to the existing sidebar editor.
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("anchor")));
  await page.locator('[data-node-id="anchor"]').focus();await page.keyboard.press("F2");
  const label=page.getByLabel("Node label",{exact:true});await expect(label).toBeFocused();
  await label.fill("Draft");await label.press("ArrowLeft");await label.press("Space");expect((await state(page)).selected).toBe("anchor");
  await page.locator('[data-node-id="upper"]').focus();
  const native=await page.locator('[data-node-id="upper"]').evaluate(node=>{
    window.graphBrowser.setInteractionMode("edit");
    return ["Enter","Backspace","Delete"].map(key=>{
      const e=new KeyboardEvent("keydown",{key,ctrlKey:true,bubbles:true,cancelable:true});node.dispatchEvent(e);return e.defaultPrevented;
    });
  });
  expect(native).toEqual([false,false,false]);expect((await state(page)).selected).toBe("anchor");
  await expect(page.locator('[data-node-id="upper"]')).toHaveCount(1);
  const embedded=await page.locator('[data-node-id="upper"]').evaluate(node=>{
    const box=document.createElementNS("http://www.w3.org/2000/svg","foreignObject"),input=document.createElement("textarea");
    box.append(input);node.append(box);input.focus();
    const result=["Enter"," ","Backspace","ArrowRight"].map(key=>{
      const e=new KeyboardEvent("keydown",{key,bubbles:true,cancelable:true});input.dispatchEvent(e);return e.defaultPrevented;
    });box.remove();return result;
  });
  expect(embedded).toEqual([false,false,false,false]);expect((await state(page)).selected).toBe("anchor");expect(errors).toEqual([]);
});
test("details, pan-only centering and radius/backlink/timeout controls share keyboard state",async({page})=>{
  const errors=await ready(page);await page.keyboard.press("Space");await expect(page.locator("#annotation-detail")).toHaveText("Details for anchor");
  await page.keyboard.press("n");await expect(page.locator("#move-to-center")).not.toBeChecked();
  await page.keyboard.press("ArrowRight");await page.keyboard.press("Enter");await page.keyboard.press("Enter");
  expect(await state(page)).toMatchObject({selected:"middle",focus:"anchor"});
  await page.keyboard.press("1");await expect(page.locator("#depth")).toHaveValue("1");
  await page.keyboard.press("b");await expect(page.locator("#backlinks")).not.toBeChecked();
  await expect(page.locator('[data-node-id="upper"]')).toHaveCount(0);
  await page.locator("summary").filter({hasText:"Navigation options"}).click();
  await page.locator("#candidate-timeout").fill("100");await page.locator("#candidate-timeout").press("Tab");
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("anchor")));
  await page.locator('[data-node-id="anchor"]').focus();await page.keyboard.press("ArrowRight");
  await expect(page.locator("#navigation-status")).toContainText("candidates");
  await expect.poll(async()=> (await state(page)).candidates).toBeUndefined();expect((await state(page)).selected).toBe("anchor");
  expect(errors).toEqual([]);
});

test("Ctrl view shortcuts change zoom/lens geometry, sync controls and preserve candidates while excluding editors",async({page})=>{
  const errors=await ready(page);await page.keyboard.press("ArrowRight");
  const before=await page.evaluate(()=>{
    const p=window.graphBrowser,a=p.findNode("anchor"),b=p.findNode("middle");
    return {candidates:p.getNavigation().getState().preselection,positions:[...p.getAllNodes()].map(n=>[n.getID(),n.x,n.y]),distance:b.drawx-a.drawx};
  });
  await page.keyboard.press("Control+ArrowUp");
  let view=await page.evaluate(()=>{const p=window.graphBrowser;return {zoom:p.getZoom(),hyper:p.getHyperbolic(),distance:p.findNode("middle").drawx-p.findNode("anchor").drawx};});
  expect(view.zoom).toBeCloseTo(1.2,8);expect(view.hyper).toBe(0);expect(view.distance).toBeCloseTo(before.distance*1.2,6);
  await page.keyboard.press("Control+Shift+ArrowUp");await expect(page.locator("#hyper")).toHaveValue("5");await expect(page.locator("#hyper-value")).toHaveText("5%");
  await page.keyboard.press("Control+Shift+ArrowDown");await expect(page.locator("#hyper")).toHaveValue("0");
  await page.keyboard.press("Control+ArrowDown");expect(await page.evaluate(()=>window.graphBrowser.getZoom())).toBeCloseTo(1,8);
  const after=await page.evaluate(()=>{const p=window.graphBrowser;return {candidates:p.getNavigation().getState().preselection,positions:[...p.getAllNodes()].map(n=>[n.getID(),n.x,n.y])};});
  expect(after.candidates).toEqual(before.candidates);expect(after.positions).toEqual(before.positions);expect((await state(page)).selected).toBe("anchor");
  await page.keyboard.press("Escape");await page.evaluate(()=>{const p=window.graphBrowser;p.setZoom(5);p.setHyperbolic(99);});
  await page.keyboard.press("Control+ArrowUp");await page.keyboard.press("Control+Shift+ArrowUp");
  expect(await page.evaluate(()=>window.graphBrowser.getZoom())).toBe(5);await expect(page.locator("#hyper")).toHaveValue("100");
  await page.evaluate(()=>window.graphBrowser.setZoom(1));await page.keyboard.press("F2");
  const label=page.getByLabel("Node label",{exact:true});await expect(label).toBeFocused();
  await label.press("Control+ArrowUp");await label.press("Control+Shift+ArrowDown");
  expect(await page.evaluate(()=>window.graphBrowser.getZoom())).toBe(1);expect(await page.evaluate(()=>window.graphBrowser.getHyperbolic())).toBe(100);
  await page.locator("#graph svg").focus();await page.keyboard.press("Control+ArrowUp");
  expect(await page.evaluate(()=>window.graphBrowser.getZoom())).toBeCloseTo(1.2,8);expect(errors).toEqual([]);
});
test("palette focus/context slider follows Ctrl Shift keyboard changes",async({page})=>{
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/freshmind.html");await page.waitForFunction(()=>Boolean(window.freshmindBrowser));
  await page.locator('[data-node-id="person"]').click();await page.keyboard.press("Control+Shift+ArrowUp");
  await expect(page.locator("#hyper")).toHaveValue("5");await page.keyboard.press("Control+ArrowUp");
  expect(await page.evaluate(()=>window.freshmindBrowser.getZoom())).toBeCloseTo(.85*1.2,8);
  await page.keyboard.press("Control+Shift+ArrowDown");await expect(page.locator("#hyper")).toHaveValue("0");expect(errors).toEqual([]);
});
