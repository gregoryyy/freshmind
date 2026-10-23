import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {parseDocument} from "fm4/fm/io";

async function ready(page,example="substructures") {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");await page.waitForFunction(()=>Boolean(window.graphBrowser));
  await page.locator("#example-graph").selectOption(example);
  const counts={substructures:"12 nodes, 13 relations",karate:"34 nodes, 78 relations","joined-trees":"14 nodes, 13 relations",
    "leaf-connected-trees":"14 nodes, 17 relations","shared-subtree":"11 nodes, 10 relations"};
  await expect(page.locator("#file-status")).toContainText(counts[example]);
  await page.evaluate(async()=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();p.getRfc().setFocus(null);});
  await page.getByText("Reinforcement Focus + Context",{exact:true}).click();return errors;
}
const state=page=>page.evaluate(()=>window.graphBrowser.getRfc().getState());

for (const example of ["joined-trees", "leaf-connected-trees", "shared-subtree"]) test(`${example} loads both tree experiments and keeps context links outside RFC`, async ({page}, testInfo) => {
  const errors=await ready(page,example);
  await page.getByText("Substructures",{exact:true}).click();
  const selector=page.getByLabel("Substructure",{exact:true});
  for (const id of ["a-tree","b-tree"]) {
    await selector.selectOption(id);
    await page.getByRole("button",{name:"Reinforce substructure",exact:true}).click();
  }
  const s=await state(page), shared=example==="shared-subtree";
  expect(s.centers.map(c=>c.focusId)).toEqual(["a0","b0"]);
  expect(s.centers.every(c=>c.kind==="tree"&&c.memberIds.length===7&&c.edgeIds.length===6)).toBe(true);
  expect(s.stabilization.enabled).toBe(false);
  expect(s.radialEdgeIds.every(id=>!id.startsWith("context")&&!id.startsWith("leaf-link"))).toBe(true);
  await expect(page.locator(".fm-rfc-node-halo")).toHaveCount(shared?11:14);
  await expect(page.locator(".fm-rfc-edge-halo")).toHaveCount(shared?10:12);
  await expect(page.locator(".fm-edge")).toHaveCount(shared?10:example==="joined-trees"?13:17);
  await page.screenshot({path:testInfo.outputPath(`${example}.png`)});
  expect(errors).toEqual([]);
});

for(const gesture of ["Shift+Enter","Shift+double-click"])test(`${gesture} toggles independent RFC centers and retains the neighborhood`,async({page})=>{
  const errors=await ready(page);
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("tree-root")));
  await page.locator("#graph svg").focus();await page.keyboard.press("Shift+Enter");
  const before=await page.evaluate(()=>{const p=window.graphBrowser;return {focus:p.getFocus()?.getID(),nodes:[...p.getGES().getNodes()].map(n=>n.getID()).sort()};});
  if(gesture==="Shift+Enter"){
    await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("dag-root")));
    await page.locator("#graph svg").focus();await page.keyboard.press("Shift+Enter");
  }else await page.locator('[data-node-id="dag-root"]').dblclick({modifiers:["Shift"]});
  expect((await state(page)).centers.map(c=>c.focusId)).toEqual(["tree-root","dag-root"]);
  expect(await page.evaluate(()=>{const p=window.graphBrowser;return {focus:p.getFocus()?.getID(),nodes:[...p.getGES().getNodes()].map(n=>n.getID()).sort()};})).toEqual(before);
  await expect(page.locator("#rfc-status")).toContainText("2 centers");
  const toggle=async id=>{
    if(gesture==="Shift+Enter"){
      await page.evaluate(id=>window.graphBrowser.setSelect(window.graphBrowser.findNode(id)),id);
      await page.locator("#graph svg").focus();await page.keyboard.press("Shift+Enter");
    }else await page.locator(`[data-node-id="${id}"]`).dblclick({modifiers:["Shift"]});
  };
  await toggle("dag-root");expect((await state(page)).centers.map(c=>c.focusId)).toEqual(["tree-root"]);
  await expect(page.locator("#navigation-status")).toContainText("Removed RFC center");
  await toggle("dag-root");await toggle("tree-root");
  expect((await state(page)).centers.map(c=>c.focusId)).toEqual(["dag-root"]);
  await toggle("dag-root");expect((await state(page)).enabled).toBe(false);
  await expect(page.locator(".fm-rfc-node-halo")).toHaveCount(0);
  await toggle("tree-root");await toggle("dag-root");
  await page.getByLabel("RFC centers",{exact:true}).selectOption("dag-root");
  await page.getByRole("button",{name:"Remove selected RFC center",exact:true}).click();
  expect((await state(page)).centers.map(c=>c.focusId)).toEqual(["tree-root"]);
  expect(await page.evaluate(()=>[window.graphBrowser.getCompleteEltSet().nodeCount(),window.graphBrowser.getCompleteEltSet().edgeCount()])).toEqual([12,13]);
  expect(errors).toEqual([]);
});

for(const gesture of ["Enter","double-click"])test(`${gesture} RFC activation replaces shift-added centers, including on the existing primary`,async({page})=>{
  const errors=await ready(page);
  await page.evaluate(async()=>{
    const p=window.graphBrowser;await p.getNavigation().configure({moveToCenter:false});
    p.getRfc().setFocus(p.findNode("tree-root"));p.setSelect(p.findNode("dag-root"));
  });
  await page.locator("#graph svg").focus();await page.keyboard.press("Shift+Enter");
  expect((await state(page)).centers).toHaveLength(2);
  const activate=async id=>{
    await page.evaluate(id=>{const p=window.graphBrowser;p.setSelect(p.findNode(id));p.centerOn(p.findNode(id),true);},id);
    if(gesture==="Enter"){await page.locator("#graph svg").focus();await page.keyboard.press("Enter");}
    else await page.locator(`[data-node-id="${id}"]`).dblclick();
    await page.evaluate(()=>window.graphBrowser.getLocalityUtils().whenIdle());
  };
  await activate("tree-root");expect((await state(page)).centers.map(c=>c.focusId)).toEqual(["tree-root"]);
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("dag-root")));
  await page.locator("#graph svg").focus();await page.keyboard.press("Shift+Enter");
  await activate("dag-root");expect((await state(page)).centers.map(c=>c.focusId)).toEqual(["dag-root"]);
  await page.evaluate(()=>window.graphBrowser.getRfc().addFocus(window.graphBrowser.findNode("tree-root")));
  await page.getByRole("button",{name:"Reinforce selected node",exact:true}).click();
  expect((await state(page)).centers.map(c=>c.focusId)).toEqual(["dag-root"]);
  expect(errors).toEqual([]);
});

test("stored tree and DAG definitions reinforce full memberships, share halos and suspend independently",async({page},testInfo)=>{
  const errors=await ready(page);await page.getByText("Substructures",{exact:true}).click();
  const list=page.getByLabel("Substructure",{exact:true}),render=page.getByRole("button",{name:"Reinforce substructure",exact:true});
  await list.selectOption("dag-example");await render.click();await list.selectOption("tree-example");await render.click();
  const active=await state(page);expect(active.centers).toHaveLength(2);expect(new Set(active.memberIds).size).toBe(12);expect(new Set(active.radialEdgeIds).size).toBe(12);
  await expect(page.locator('.fm-rfc-node-halo[data-rfc-node-id="shared"]')).toHaveCount(1);
  await expect(page.locator(".fm-rfc-node-halo")).toHaveCount(12);await expect(page.locator(".fm-rfc-edge-halo")).toHaveCount(12);
  await page.evaluate(()=>window.graphBrowser.tgLayout.tick(100));
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)))).toBe(true);
  await page.screenshot({path:testInfo.outputPath("tree-and-dag.png")});
  await page.evaluate(()=>{const p=window.graphBrowser;p.getGES().removeNode(p.findNode("tree-root"));p.localityChanged();p.repaint();});
  expect((await state(page)).centers.filter(c=>c.active)).toHaveLength(1);expect((await state(page)).active).toBe(true);
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getNodeSubstructures("shared").length)).toBe(2);expect(errors).toEqual([]);
});

test("manual tree membership editing persists through YAML without saving active RFC centers",async({page})=>{
  const errors=await ready(page);await page.getByText("Substructures",{exact:true}).click();
  await page.getByLabel("Substructure name",{exact:true}).fill("Combined tree");
  await page.getByRole("button",{name:"Create from visible graph",exact:true}).click();
  await expect(page.getByLabel("Substructure",{exact:true})).toHaveValue("s1");
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1").nodeIds.length)).toBe(12);
  await page.getByRole("button",{name:"Reinforce substructure",exact:true}).click();
  const edges=await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1").edgeIds);
  await page.evaluate(()=>{const p=window.graphBrowser;p.setSelect(p.findNode("t1"));p.stopMotion();p.stopMotion();});
  await page.getByRole("button",{name:"Use selected node as root",exact:true}).click();
  expect((await state(page)).centers[0]).toMatchObject({focusId:"t1",structureId:"s1"});
  expect(await page.evaluate(()=>window.graphBrowser.tgLayout.getState().damper)).toBe(1);
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1").edgeIds)).toEqual(edges);
  await page.getByRole("button",{name:"Save structure settings",exact:true}).click();
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1").edgeIds)).toEqual(edges);
  await page.evaluate(()=>{const p=window.graphBrowser,n=p.addNode("extra-member");p.addEdge(p.findNode("t1"),n);p.setSelect(n);p.repaintAfterMove();});
  await page.getByRole("button",{name:"Add selected node to structure",exact:true}).click();
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1").nodeIds)).toContain("extra-member");
  await expect(page.locator("#rfc-memberships")).toContainText("Combined tree");
  await page.getByRole("button",{name:"Remove selected node from structure",exact:true}).click();
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1").nodeIds)).not.toContain("extra-member");
  const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Save YAML",exact:true}).click()]);
  const yaml=await readFile(await download.path(),"utf8"),document=parseDocument(yaml);
  expect(document.graph.getSubstructures()).toHaveLength(3);expect(document.graph.getSubstructure("s1").label).toBe("Combined tree");
  await page.locator("#open-graph-files").setInputFiles({name:"structures.fm.yaml",mimeType:"application/yaml",buffer:Buffer.from(yaml)});
  await expect(page.locator("#file-status")).toContainText("13 nodes, 14 relations");
  const reloaded=await state(page);expect(reloaded.enabled).toBe(true);expect(reloaded.centers).toHaveLength(1);
  expect(reloaded.centers[0].structureId).toBeNull(); // Fresh browser focus, not restored RFC activation from YAML.
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructures().length)).toBe(3);
  expect(errors).toEqual([]);
});

test("cluster controls identify communities and retain their internal links in a stored RFC cluster",async({page})=>{
  const errors=await ready(page,"karate");await page.getByText("Graph clusters",{exact:true}).click();
  await page.getByLabel("Clustering scope",{exact:true}).selectOption("complete");
  await page.getByLabel("Community resolution",{exact:true}).fill("0");
  await page.getByLabel("Clustering algorithm",{exact:true}).selectOption("components");
  await expect(page.getByLabel("Community resolution",{exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Detect clusters",exact:true}).click();
  await expect(page.locator("#cluster-select option")).toHaveCount(1);
  await page.getByLabel("Clustering algorithm",{exact:true}).selectOption("louvain");
  await page.getByLabel("Community resolution",{exact:true}).fill("1");
  await page.getByRole("button",{name:"Detect clusters",exact:true}).click();
  expect(await page.locator("#cluster-select option").count()).toBeGreaterThan(1);await expect(page.locator("#cluster-members")).toContainText("nodes:");
  await page.getByRole("button",{name:"Render cluster with RFC",exact:true}).click();
  const group=await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructures()[0]);
  expect(group.kind).toBe("cluster");expect(group.nodeIds.length).toBeLessThan(34);expect(group.edgeIds.length).toBeGreaterThan(group.nodeIds.length-1);
  expect((await state(page)).centers[0].structureId).toBe(group.id);
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().edgeCount())).toBe(78);expect(errors).toEqual([]);
});

test("cluster proposals reject changed graph topology and graph replacement clears their controls",async({page})=>{
  const errors=await ready(page,"karate");await page.getByText("Graph clusters",{exact:true}).click();
  await page.getByLabel("Clustering scope",{exact:true}).selectOption("complete");await page.getByRole("button",{name:"Detect clusters",exact:true}).click();
  await page.evaluate(()=>{window.graphBrowser.addNode("new");window.graphBrowser.repaintAfterMove();});
  await page.getByRole("button",{name:"Render cluster with RFC",exact:true}).click();
  await expect(page.locator("#rfc-structure-status")).toContainText("detect clusters again");expect((await state(page)).enabled).toBe(false);
  await page.locator("#example-graph").selectOption("substructures");await expect(page.locator("#file-status")).toContainText("12 nodes, 13 relations");
  await expect(page.locator("#cluster-select option")).toHaveCount(0);expect(errors).toEqual([]);
});
