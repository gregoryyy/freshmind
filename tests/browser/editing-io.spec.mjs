import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parseDocument } from "fm4/fm/io";

const source=`format: freshmind
version: 1
title: Browser fixture
nodes:
  - id: a
    label: Alpha
    position: {x: 0, y: 0}
    data: {query: {score: 0.7}}
    extensions: {app: {keep: true}}
  - id: b
    label: Beta
    position: {x: 160, y: -50}
  - id: isolated
    label: Isolated
    position: {x: -160, y: 80}
edges:
  - {id: e, from: a, to: b, label: related}
  - {id: parallel, from: a, to: b, label: parallel}
  - {id: loop, from: b, to: b, label: loop}
view:
  focus: a
  radius: 1
  lenses: {zoom: 1.2, hyperbolic: 40, rotation: 0.2}
  canvas: {zoom: 1.3, pan: {x: 10, y: 5}}
`;
async function ready(page) {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));await page.goto("/");await page.waitForFunction(()=>Boolean(window.graphBrowser));
  await page.evaluate(async()=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();});
  await page.locator("#open-graph-files").setInputFiles({name:"fixture.fm.yaml",mimeType:"application/yaml",buffer:Buffer.from(source)});
  await expect(page.locator("#file-status")).toContainText("3 nodes, 3 relations");
  await page.evaluate(()=>window.graphBrowser.tgLayout.stop());return errors;
}
test("key-map button, question mark and F1 show the implemented user map with scoped focus",async({page})=>{
  const errors=await ready(page);await page.getByRole("button",{name:"Key map",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Freshmind key map"});await expect(dialog).toBeVisible();await expect(dialog).toContainText("Ctrl + Shift + 1");
  await expect(dialog).toContainText("Ctrl/Cmd + O");await expect(dialog).toContainText("F2 / Ctrl + Enter");await page.keyboard.press("Escape");await expect(dialog).not.toBeVisible();
  await page.locator("#graph svg").focus();await page.keyboard.press("?");await expect(dialog).toBeVisible();await page.keyboard.press("Escape");
  await page.locator("#edit-item").click();await page.getByLabel("Node label",{exact:true}).focus();await page.keyboard.type("?");await expect(dialog).not.toBeVisible();await page.keyboard.press("F1");await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");expect(errors).toEqual([]);
});
test("inline node and relation labels share drafts, commit/cancel and follow both view transforms",async({page})=>{
  const errors=await ready(page),node=page.locator('[data-node-id="a"]');await node.focus();await page.keyboard.press("F2");
  const inline=page.getByLabel("Inline node label",{exact:true});await expect(inline).toBeFocused();await inline.fill("Alpha\nupdated");
  await page.evaluate(()=>{const p=window.graphBrowser;p.setZoom(1.5);p.setCanvasZoom(1.6);p.setHyperbolic(55);p.setRotation(.5);p.setCanvasPan(20,-15);});
  const distance=await page.evaluate(()=>{
    const p=window.graphBrowser,n=p.findNode("a"),s=p.drawToScreen({x:n.drawx,y:n.drawy}),editor=document.querySelector(".inline-editor").getBoundingClientRect(),svg=document.querySelector("#graph svg").getBoundingClientRect();
    return Math.hypot(editor.x+editor.width/2-svg.x-s.x,editor.y+editor.height/2-svg.y-s.y);
  });expect(distance).toBeLessThan(1);
  await inline.press("Control+Enter");await expect(inline).toHaveCount(0);await expect(node).toBeFocused();
  expect(await page.evaluate(()=>window.graphBrowser.findNode("a").getLabel())).toBe("Alpha\nupdated");
  await page.keyboard.press("Control+Enter");await expect(inline).toBeFocused();await inline.fill("discard");await inline.press("Escape");
  expect(await page.evaluate(()=>window.graphBrowser.findNode("a").getLabel())).toBe("Alpha\nupdated");
  await page.keyboard.press("F2");await inline.fill("Retained draft");await page.locator('[data-node-id="b"]').click();await expect(inline).toHaveCount(0);
  await node.click();await page.keyboard.press("F2");await expect(inline).toHaveValue("Retained draft");await page.keyboard.press("F1");
  await expect(page.getByRole("dialog",{name:"Freshmind key map"})).toBeVisible();await page.keyboard.press("Escape");await inline.press("Escape");
  await page.evaluate(()=>window.graphBrowser.setSelectEdge([...window.graphBrowser.getAllEdges()].find(e=>e.getID()==="e")));
  await page.locator('[data-edge-id="e"]').focus();await page.keyboard.press("F2");const edge=page.getByLabel("Inline relation label",{exact:true});
  const edgeDistance=await page.evaluate(()=>{
    const p=window.graphBrowser,e=[...p.getAllEdges()].find(e=>e.getID()==="e"),anchor=p.drawToScreen(p.getEdgeGeometry(e).labelAnchor),box=document.querySelector(".inline-editor").getBoundingClientRect(),svg=document.querySelector("#graph svg").getBoundingClientRect();
    return Math.hypot(box.x+box.width/2-svg.x-anchor.x,box.y+box.height/2-svg.y-anchor.y);
  });expect(edgeDistance).toBeLessThan(1);
  await edge.fill("changed relation");await edge.press("Enter");await expect(page.locator('[data-edge-id="e"] .fm-edge-label')).toHaveText("changed relation");
  expect(errors).toEqual([]);
});
test("metadata and visual edits are atomic, annotation HTML is sanitized, and resource opening stays explicit",async({page})=>{
  const errors=await ready(page);await page.locator('[data-node-id="a"]').focus();await page.keyboard.press("Control+Space");
  await expect(page.getByLabel("Annotation",{exact:true})).toBeFocused();
  const html='<p onclick="window.annotationExecuted=1">Kept <strong>bold</strong><script>window.annotationExecuted=2</script><img src="https://example.invalid/track" onerror="window.annotationExecuted=3"><a href="javascript:alert(1)">bad</a><a href="https://example.org/">web</a><a href="#node=b">Beta</a></p>';
  const requests=[];page.on("request",request=>{if(request.url().includes("example.invalid"))requests.push(request.url());});
  await page.getByLabel("Annotation format",{exact:true}).selectOption("html");await page.getByLabel("Annotation",{exact:true}).fill(html);
  await page.getByLabel("Linked resource URL or path",{exact:true}).fill("C:/legacy/resource.pdf");await page.getByLabel("Weight",{exact:true}).fill("30");
  await page.locator("#advanced-fields summary").click();await page.getByLabel("Visual overrides (YAML)").fill('style: {fill: "#123456", text: {color: "#ffffff"}}');
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  const saved=await page.evaluate(()=>{const n=window.graphBrowser.findNode("a");return {annotation:n.getAnnotation(),url:n.getURL(),weight:n.getWeight(),data:n.getData(),extensions:n.getExtensions(),visual:n.getVisual()};});
  expect(saved.annotation).toEqual({format:"html",text:html});expect(saved.weight).toBe(30);expect(saved.visual.style.fill).toBe("#123456");expect(saved.data).toEqual({query:{score:.7}});expect(saved.extensions).toEqual({app:{keep:true}});
  await page.keyboard.press("Space");await expect(page.locator(".fm-node-content strong")).toHaveText("bold");await expect(page.locator(".fm-node-content script, .fm-node-content img, .fm-node-content [onclick]")).toHaveCount(0);
  await expect(page.locator('.fm-node-content a').filter({hasText:"bad"})).not.toHaveAttribute("href",/./);expect(requests).toEqual([]);expect(await page.evaluate(()=>window.annotationExecuted)).toBeUndefined();
  await page.getByRole("button",{name:"Open linked resource (L)",exact:true}).click();await expect(page.locator("#file-status")).toContainText("stored path cannot be opened");
  await page.locator("#edit-item").click();await page.getByLabel("Node label",{exact:true}).fill("Must not apply");await page.getByLabel("Application data (YAML)").fill("not: [valid");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();await expect(page.locator("#editor-status")).toHaveAttribute("data-error","true");
  expect(await page.evaluate(()=>window.graphBrowser.findNode("a").getLabel())).toBe("Alpha");await page.getByRole("button",{name:"Cancel",exact:true}).click();
  await page.keyboard.press("Space");await page.locator('.fm-node-content a').filter({hasText:"Beta"}).click();expect(await page.evaluate(()=>window.graphBrowser.getSelect().getID())).toBe("b");expect(errors).toEqual([]);
});
test("relation endpoint edits/reversal retain IDs and adjacency, including loops and hidden endpoints",async({page})=>{
  const errors=await ready(page);
  await page.evaluate(()=>window.graphBrowser.setSelectEdge([...window.graphBrowser.getAllEdges()].find(e=>e.getID()==="e")));
  await page.locator("#edit-item").click();await page.getByLabel("From node ID",{exact:true}).fill("missing");await page.getByLabel("Relation label",{exact:true}).fill("rejected");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();await expect(page.locator("#editor-status")).toContainText("Choose endpoints");
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllEdges()].find(e=>e.getID()==="e").getLabel())).toBe("related");
  await page.getByLabel("From node ID",{exact:true}).fill("b");await page.getByLabel("To node ID",{exact:true}).fill("a");await page.getByLabel("Spring length",{exact:true}).fill("88");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  const endpoints=()=>page.evaluate(()=>{const e=[...window.graphBrowser.getAllEdges()].find(e=>e.getID()==="e");return [e.from.getID(),e.to.getID(),e.getLength()];});
  expect(await endpoints()).toEqual(["b","a",88]);await page.keyboard.press("r");expect(await endpoints()).toEqual(["a","b",88]);
  await page.locator("#edit-item").click();await page.getByLabel("To node ID",{exact:true}).fill("isolated");await page.getByRole("button",{name:"Save changes",exact:true}).click();
  expect(await endpoints()).toEqual(["a","isolated",88]);await expect(page.locator('[data-edge-id="e"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("YAML file open/save uses complete membership and rejects invalid loads without changing the graph",async({page})=>{
  const errors=await ready(page);expect(await page.evaluate(()=>window.graphBrowser.visibleNodeCount())).toBe(2);
  const downloadPromise=page.waitForEvent("download");await page.locator("#graph svg").focus();await page.keyboard.press("Control+s");const download=await downloadPromise;
  const loaded=parseDocument(await readFile(await download.path(),"utf8"));expect(loaded.graph.nodeCount()).toBe(3);expect(loaded.graph.edgeCount()).toBe(3);expect(loaded.graph.findNode("isolated")).not.toBeNull();
  expect(loaded.view.lenses.zoom).toBe(1.2);expect(loaded.view.canvas.zoom).toBe(1.3);expect(loaded.view.canvas.pan).toEqual({x:10,y:5});
  await page.locator("#open-graph-files").setInputFiles({name:"invalid.fm.yaml",mimeType:"application/yaml",buffer:Buffer.from(source.replace("to: b","to: missing"))});
  await expect(page.locator("#file-status")).toContainText("unknown endpoint");expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(3);
  await page.keyboard.press("Control+Shift+s");const dialog=page.getByRole("dialog",{name:"Save graph as"});await expect(dialog).toBeVisible();await page.getByLabel("Save filename").fill("renamed");
  const renamedPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Download YAML",exact:true}).click();expect((await renamedPromise).suggestedFilename()).toBe("renamed.fm.yaml");expect(errors).toEqual([]);
});
test("legacy examples stay restricted to approved datasets and the large graph opens a bounded locality",async({page})=>{
  const errors=await ready(page);expect(await page.locator('#example-graph optgroup[label="Freshmind 2014"] option').allTextContents()).toEqual(["berry","nips-fm"]);
  await page.locator("#example-graph").selectOption("berry");await expect(page.locator("#file-status")).toContainText("21 nodes, 22 relations");
  await page.locator("#example-graph").selectOption("nips-fm");await expect(page.locator("#file-status")).toContainText("3777 nodes, 5257 relations",{timeout:20000});
  const counts=await page.evaluate(()=>{const p=window.graphBrowser;p.tgLayout.stop();return [p.getNodeCount(),p.getEdgeCount(),p.visibleNodeCount()];});
  expect(counts[0]).toBe(3777);expect(counts[1]).toBe(5257);expect(counts[2]).toBeLessThan(3777);expect(counts[2]).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test("finishing an example load preserves an editor focused while the request was pending",async({page})=>{
  const errors=await ready(page);let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route("**/examples/public/florentine.fm.yaml",async route=>{await gate;await route.continue();});
  const requested=page.waitForRequest(request=>request.url().endsWith("/examples/public/florentine.fm.yaml"));
  await page.locator("#example-graph").focus();await page.locator("#example-graph").selectOption("florentine");await requested;
  await page.locator("#edit-details").click();const annotation=page.getByLabel("Annotation",{exact:true});await annotation.focus();release();
  await expect(page.locator("#file-status")).toContainText("15 nodes, 20 relations");await expect(annotation).toBeFocused();
  await page.keyboard.press("Shift+Alt+ArrowRight");expect(await page.evaluate(()=>window.graphBrowser.getRotation())).toBe(0);
  expect(errors).toEqual([]);
});
test("local companions are required before replacement and companion exports contain the effective configuration",async({page})=>{
  const errors=await ready(page),graph={name:"companion.fm.yaml",mimeType:"application/yaml",buffer:Buffer.from(source.replace("title: Browser fixture","typesFile: custom.types.yaml\ntitle: Companion fixture"))};
  await page.locator("#open-graph-files").setInputFiles(graph);await expect(page.locator("#file-status")).toContainText("Select the companion file too");
  expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(3);
  const types=(await readFile(new URL("../../config/fm2014.types.yaml",import.meta.url),"utf8")).replace("id: freshmind-2014","id: custom-profile");
  await page.locator("#open-graph-files").setInputFiles([graph,{name:"custom.types.yaml",mimeType:"application/yaml",buffer:Buffer.from(types)}]);
  await expect(page.locator("#file-status")).toContainText("companion.fm.yaml: 3 nodes");expect(await page.evaluate(()=>window.graphBrowser.getTypeRegistry().getConfiguration().id)).toBe("custom-profile");
  await page.getByRole("button",{name:"Options",exact:true}).click();await page.getByLabel("Save types as a companion file",{exact:true}).check();
  await page.getByLabel("Include layout positions",{exact:true}).uncheck();await page.getByLabel("Include view settings",{exact:true}).uncheck();
  const downloads=[];page.on("download",download=>downloads.push(download));await page.getByRole("button",{name:"Save YAML",exact:true}).click();await expect.poll(()=>downloads.length).toBe(2);
  const savedGraph=downloads.find(d=>d.suggestedFilename()==="companion.fm.yaml"),savedTypes=downloads.find(d=>d.suggestedFilename()==="fm2014.types.yaml");
  const graphSource=await readFile(await savedGraph.path(),"utf8"),typeSource=await readFile(await savedTypes.path(),"utf8");
  expect(graphSource).toContain("typesFile: fm2014.types.yaml");expect(graphSource).not.toContain("position:");expect(graphSource).not.toContain("view:");
  const document=parseDocument(graphSource,{resolveTypes:path=>{expect(path).toBe("fm2014.types.yaml");return typeSource;}});
  expect(document.types.getConfiguration().id).toBe("custom-profile");expect(document.graph.nodeCount()).toBe(3);expect(errors).toEqual([]);
});
