import {test, expect} from "@playwright/test";

async function ready(page) {
  const errors=[]; page.on("pageerror", error=>errors.push(error.message));
  await page.goto("/"); await page.waitForFunction(()=>Boolean(window.graphBrowser));
  await page.evaluate(async()=>{
    const p=window.graphBrowser; p.fastFinishAnimation(); await p.getLocalityUtils().whenIdle(); p.tgLayout.stop();
    const {FreshGraph,FreshNode,FreshEdge}=await import("/src/fm/index.ts");
    const g=new FreshGraph();
    g.addNode(new FreshNode("a","Alpha",{position:{x:0,y:0},annotation:{format:"text",text:"Literal <strong>text</strong>\n"+"More content\n".repeat(100)},url:"https://example.org/resource"}));
    g.addNode(new FreshNode("b","Beta",{position:{x:170,y:0},annotation:{format:"html",text:'<p onclick="window.contentExecuted=1"><strong>Formatted</strong><script>window.contentExecuted=2</script><img src="https://example.invalid/content"><a href="#node=hidden">Hidden node</a> <a href="#node=missing">Missing node</a> <a href="https://example.org/">Web</a></p>'}}));
    g.addNode(new FreshNode("hidden","Hidden",{position:{x:340,y:0}}));
    g.addEdge(new FreshEdge(g.findNode("a"),g.findNode("b"),{id:"ab",label:"related"}));
    g.addEdge(new FreshEdge(g.findNode("b"),g.findNode("hidden"),{id:"bh"}));
    p.setGraphEltSet(g); p.setHyperbolic(0); p.setZoom(1); p.setCanvasZoom(1);
    await p.getNavigation().configure({radius:1}); p.setSelect(g.findNode("a")); await p.getNavigation().centerSelection();
    p.fastFinishAnimation(); await p.getLocalityUtils().whenIdle(); p.tgLayout.stop(); p.repaint();
  });
  await page.locator('[data-node-id="a"]').focus(); return errors;
}
const popup=page=>page.getByRole("dialog",{name:/^Node content:/});

test("node content is modeless, scrollable and stable during graph movement; closing restores graph focus",async({page})=>{
  const errors=await ready(page); await page.keyboard.press("Space");
  const dialog=popup(page),body=dialog.getByRole("region");
  await expect(dialog).toHaveAccessibleName("Node content: Alpha"); await expect(body).toBeFocused();
  await expect(body).toContainText("Literal <strong>text</strong>"); await expect(body.locator("strong")).toHaveCount(0);
  await expect(dialog.getByRole("link",{name:"Open linked resource",exact:true})).toHaveAttribute("href","https://example.org/resource");
  expect(await dialog.evaluate(d=>({modal:d.matches(":modal"),resize:getComputedStyle(d).resize}))).toEqual({modal:false,resize:"both"});
  await body.evaluate(e=>{e.scrollTop=300;}); const before=await dialog.boundingBox();
  await page.evaluate(()=>{const p=window.graphBrowser;p.setZoom(1.2);p.findNode("a").x+=30;p.repaint();});
  expect(await body.evaluate(e=>e.scrollTop)).toBe(300); expect(await dialog.boundingBox()).toEqual(before);
  await page.keyboard.press("Space"); await expect(dialog).not.toBeVisible(); await expect(page.locator('[data-node-id="a"]')).toBeFocused();
  await page.keyboard.press("Space"); await page.keyboard.press("F1");
  await expect(page.getByRole("dialog",{name:"Freshmind key map"})).toBeVisible(); await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible(); await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(()=>window.graphBrowser.getNavigation().getState().detailsVisible)).toBe(false);
  await page.setViewportSize({width:390,height:844}); await page.locator('[data-node-id="a"]').focus(); await page.keyboard.press("Space");
  const box=await dialog.boundingBox(); expect(box.x).toBeGreaterThanOrEqual(11); expect(box.x+box.width).toBeLessThanOrEqual(379);
  expect(box.y).toBeGreaterThanOrEqual(11); expect(box.y+box.height).toBeLessThanOrEqual(833); expect(errors).toEqual([]);
});

for(const structural of [false,true])test(`content follows selection, sanitizes HTML and navigates hidden node links without changing relations${structural?" with structural view":""}`,async({page})=>{
  const requests=[];page.on("request",r=>{if(r.url().includes("example.invalid")) requests.push(r.url());});
  const errors=await ready(page);
  if(structural)await page.evaluate(()=>window.graphBrowser.getStructuralView().configure({enabled:true,aggregateTypes:['person','paper']}));
  await page.keyboard.press("Space");
  // The modeless popup permits graph selection while it remains open.
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("b")));
  await expect(popup(page)).toHaveAccessibleName("Node content: Beta"); await expect(popup(page).locator("strong")).toHaveText("Formatted");
  await expect(popup(page).locator("script,img,[onclick]")).toHaveCount(0);expect(requests).toEqual([]);
  expect(await page.evaluate(()=>window.contentExecuted)).toBeUndefined();
  await expect(popup(page).getByRole("link",{name:"Web",exact:true})).toHaveAttribute("target","_blank");
  await popup(page).getByRole("link",{name:"Missing node",exact:true}).click(); await expect(popup(page).getByRole("status")).toHaveText("Unknown linked node: missing");
  await popup(page).getByRole("link",{name:"Hidden node",exact:true}).click();
  await expect(popup(page)).toHaveAccessibleName("Node content: Hidden");await expect(popup(page)).toContainText("No content is associated with this node.");
  expect(await page.evaluate(()=>[window.graphBrowser.getSelect().getID(),window.graphBrowser.getEdgeCount()])).toEqual(["hidden",2]);
  await page.evaluate(()=>window.graphBrowser.setSelectEdge([...window.graphBrowser.getAllEdges()].find(e=>e.getID()==="bh")));
  await expect(popup(page)).not.toBeVisible(); await expect(page.locator("#selection-details")).toBeVisible();
  await page.evaluate(()=>window.graphBrowser.setSelect(null));expect(await page.evaluate(()=>window.graphBrowser.getNavigation().getState().detailsVisible)).toBe(false);
  expect(errors).toEqual([]);
});

test("content editing uses the existing draft and commits through the shared inspector",async({page})=>{
  const errors=await ready(page);await page.keyboard.press("Space"); await popup(page).getByRole("button",{name:"Edit content",exact:true}).click();
  const annotation=page.getByLabel("Annotation",{exact:true}); await expect(annotation).toBeFocused();await annotation.fill("Uncommitted content");
  await page.locator('[data-node-id="a"]').focus();await page.keyboard.press("Space");await expect(popup(page)).toContainText("Literal <strong>text</strong>");
  await page.keyboard.press("Control+Space");await expect(popup(page)).not.toBeVisible();await expect(annotation).toBeFocused();await expect(annotation).toHaveValue("Uncommitted content");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();await page.keyboard.press("Space");
  await expect(popup(page).getByRole("region")).toHaveText("Uncommitted content");
  await page.evaluate(()=>window.graphBrowser.deleteNode(window.graphBrowser.findNode("a")));
  await expect(popup(page)).not.toBeVisible();expect(await page.evaluate(()=>window.graphBrowser.getNavigation().getState().detailsVisible)).toBe(false);
  expect(errors).toEqual([]);
});

test("public examples load their full graphs and expose linked content; Les Misérables starts with a neighborhood",async({page})=>{
  const errors=await ready(page);
  for(const [id,nodes,edges,title] of [["florentine",15,20,"Medici"],["karate",34,78,"Member 1"],["les-miserables",77,254,"Myriel"]]) {
    await page.locator("#example-graph").focus();
    await page.locator("#example-graph").selectOption(id);await expect(page.locator("#file-status")).toContainText(`${nodes} nodes, ${edges} relations`);
    await expect(page.locator("#graph svg")).toBeFocused();await page.keyboard.press("Control+Shift+Alt+ArrowRight");
    expect(await page.evaluate(()=>window.graphBrowser.getRotation())).toBeCloseTo(Math.PI/36,10);
    const data=await page.evaluate(()=>{const p=window.graphBrowser;p.tgLayout.stop();return [p.getNodeCount(),p.getEdgeCount(),p.visibleNodeCount()];});
    expect(data.slice(0,2)).toEqual([nodes,edges]);if(id==="les-miserables")expect(data[2]).toBeLessThan(nodes);
    await page.locator("#graph svg").focus();await page.keyboard.press("Space");await expect(popup(page)).toHaveAccessibleName(`Node content: ${title}`);
    await expect(popup(page).getByRole("link").first()).toBeVisible();await popup(page).getByRole("button",{name:"Close node content",exact:true}).click();
  }
  expect(errors).toEqual([]);
});
