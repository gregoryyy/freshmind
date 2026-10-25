import {fillNumeric,selectChoice} from "../../scripts/browser-controls.mjs";
import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";
import {parseDocument} from "fm4/fm/io";

async function ready(page) {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));await page.goto("/");
  await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(()=>window.graphBrowser.tgLayout.stop());
  await page.locator("#example-graph").selectOption("clusters");await expect(page.locator("#file-status")).toContainText("9 nodes, 15 relations");
  await page.evaluate(async()=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.getRfc().setFocus(null);});
  await page.getByText("Reinforcement Focus + Context",{exact:true}).click();await page.getByText("Substructures",{exact:true}).click();
  return errors;
}

test("overlapping clusters retain cycles, share halos, and use a representative rather than a force anchor",async({page},info)=>{
  const errors=await ready(page);
  for(const id of ["research-cluster","applications-cluster"]) {
    await selectChoice(page.getByLabel("Substructure",{exact:true}),id);
    await page.getByRole("button",{name:"Reinforce substructure",exact:true}).click();
  }
  const snapshot=()=>page.evaluate(()=>{
    const p=window.graphBrowser;for(const n of p.getAllNodes())n.dx=n.dy=0;p.getRfc().apply(p.getGES(),1);
    return {state:p.getRfc().getState(),impulses:[...p.getAllNodes()].map(n=>[n.dx,n.dy])};
  });
  const initial=await snapshot();
  expect(initial.state.centers.map(c=>c.kind)).toEqual(["cluster","cluster"]);
  expect(initial.state.centers.map(c=>c.angularGapRms)).toEqual([null,null]);
  expect(initial.state.memberIds).toHaveLength(7);expect(initial.state.radialEdgeIds).toHaveLength(12);
  await expect(page.locator(".fm-rfc-node-halo")).toHaveCount(7);await expect(page.locator(".fm-rfc-edge-halo")).toHaveCount(12);
  await expect(page.locator(".fm-node")).toHaveCount(9);await expect(page.locator(".fm-edge")).toHaveCount(15);
  await selectChoice(page.getByLabel("Substructure",{exact:true}),"research-cluster");
  await expect(page.getByLabel("Structure kind",{exact:true})).toHaveValue("cluster");
  await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("c")));
  await page.getByRole("button",{name:"Use selected node as representative",exact:true}).click();
  await page.getByRole("button",{name:"Remove selected node from structure",exact:true}).click();
  await expect(page.locator("#rfc-structure-status")).toContainText("Choose another representative");
  const moved=await snapshot();expect(moved.state.centers.map(c=>c.focusId)).toContain("c");expect(moved.impulses).toEqual(initial.impulses);
  await expect(page.locator("#rfc-memberships")).toContainText("Research cluster");
  await page.evaluate(()=>{const p=window.graphBrowser;p.resetDamper();p.tgLayout.tick(150);p.repaint();});
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)))).toBe(true);
  await page.screenshot({path:info.outputPath("overlapping-clusters.png")});
  await page.evaluate(()=>{const p=window.graphBrowser;p.getGES().removeNode(p.findNode("c"));p.localityChanged();p.repaint();});
  expect(await page.evaluate(()=>window.graphBrowser.getRfc().getState().centers.filter(c=>c.active).length)).toBe(1);
  expect(errors).toEqual([]);
});

test("manual clusters accept disconnected members and survive editing and YAML reload",async({page})=>{
  const errors=await ready(page);
  await selectChoice(page.getByLabel("Structure kind",{exact:true}),"cluster");
  await page.getByLabel("Substructure name",{exact:true}).fill("Manual group");
  await page.getByRole("button",{name:"Create from visible graph",exact:true}).click();
  await expect(page.getByLabel("Substructure",{exact:true})).toHaveValue("s1");
  await page.getByRole("button",{name:"Reinforce substructure",exact:true}).click();
  const original=await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1"));
  expect(original.kind).toBe("cluster");expect(original.edgeIds).toHaveLength(15);
  await page.evaluate(()=>{const p=window.graphBrowser,n=p.addNode("disconnected");p.setSelect(n);p.repaintAfterMove();});
  await page.getByRole("button",{name:"Add selected node to structure",exact:true}).click();
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1").nodeIds)).toContain("disconnected");
  await page.getByRole("button",{name:"Use selected node as representative",exact:true}).click();
  await page.getByLabel("Substructure name",{exact:true}).fill("Renamed group");
  await page.getByRole("button",{name:"Save structure settings",exact:true}).click();
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1").edgeIds)).toEqual(original.edgeIds);
  const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Save YAML",exact:true}).click()]);
  const yaml=await readFile(await download.path(),"utf8"),document=parseDocument(yaml),stored=document.graph.getSubstructure("s1");
  expect(stored).toMatchObject({kind:"cluster",label:"Renamed group",rootId:"disconnected"});expect(stored.nodeIds).toHaveLength(10);
  await page.locator("#open-graph-files").setInputFiles({name:"clusters.fm.yaml",mimeType:"application/yaml",buffer:Buffer.from(yaml)});
  await expect(page.locator("#file-status")).toContainText("10 nodes, 15 relations");
  expect(await page.evaluate(()=>window.graphBrowser.getCompleteEltSet().getSubstructure("s1"))).toEqual(stored);
  expect(errors).toEqual([]);
});

test("cluster enclosures contain bodies and curves, follow lenses and movement, and expose independent rigidity",async({page},info)=>{
  const errors=await ready(page);
  for(const id of ["research-cluster","applications-cluster"]) {
    await selectChoice(page.getByLabel("Substructure",{exact:true}),id);
    await page.getByRole("button",{name:"Reinforce substructure",exact:true}).click();
  }
  const boundaries=page.locator(".fm-cluster-boundary");await expect(boundaries).toHaveCount(2);
  const inspect=()=>page.evaluate(()=>{
    const p=window.graphBrowser,centers=p.getRfc().getState().centers;
    return [...document.querySelectorAll(".fm-cluster-boundary")].map(path=>{
      const center=centers.find(c=>c.structureId===path.dataset.structureId),points=[];
      for(const id of center.memberIds) {
        const n=p.findNode(id);for(const x of [n.drawx-n.getWidth()/2,n.drawx+n.getWidth()/2])for(const y of [n.drawy-n.getHeight()/2,n.drawy+n.getHeight()/2])points.push({x,y});
      }
      for(const id of center.edgeIds) {
        const edge=[...p.getGES().getEdges()].find(e=>e.getID()===id),geometry=p.getEdgeGeometry(edge);
        for(let i=0;i<=20;i++)points.push(geometry.pointAt(i/20));
      }
      const style=getComputedStyle(path);
      return {id:center.structureId,contains:points.every(point=>path.isPointInFill(new DOMPoint(point.x,point.y))),
        fill:style.fill,opacity:Number(style.fillOpacity),pointer:style.pointerEvents,path:path.getAttribute("d")};
    });
  });
  let records=await inspect();expect(records.every(r=>r.contains&&r.opacity>0&&r.opacity<.2&&r.pointer==="none"&&r.path.includes(" A "))).toBe(true);
  await expect(page.locator(".tg-edges > g").first()).toHaveClass("fm-cluster-regions");
  const before=records.map(r=>r.path),positions=await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]));
  await page.evaluate(()=>{const p=window.graphBrowser;p.setZoom(1.3);p.setHyperbolic(70);p.setRotation(.5);});
  records=await inspect();expect(records.every(r=>r.contains)).toBe(true);expect(records.map(r=>r.path)).not.toEqual(before);
  expect(await page.evaluate(()=>[...window.graphBrowser.getAllNodes()].map(n=>[n.x,n.y]))).toEqual(positions);
  const lensPaths=records.map(r=>r.path);await page.evaluate(()=>window.graphBrowser.setCanvasZoom(1.2));
  expect((await inspect()).map(r=>r.path)).toEqual(lensPaths);
  await page.evaluate(()=>{const p=window.graphBrowser,n=p.findNode("b");n.x-=120;n.y+=100;p.repaintAfterMove();});
  records=await inspect();expect(records.every(r=>r.contains)).toBe(true);expect(records.map(r=>r.path)).not.toEqual(lensPaths);
  const input=page.getByLabel("Cluster rigidity",{exact:true});await expect(input).toHaveValue("1");
  const force=()=>page.evaluate(()=>{const p=window.graphBrowser;for(const n of p.getAllNodes())n.dx=n.dy=0;p.getRfc().apply(p.getGES(),1);return [...p.getAllNodes()].map(n=>[n.dx,n.dy]);});
  const rigid=await force();await fillNumeric(input,"0");await input.press("Tab");expect(await force()).not.toEqual(rigid);
  await page.evaluate(()=>window.graphBrowser.getRfc().configureClusters({rigidity:.7}));await expect(input).toHaveValue("0.7");
  await page.evaluate(()=>{const p=window.graphBrowser;p.setZoom(1);p.setHyperbolic(0);p.setRotation(0);p.setCanvasZoom(.85);p.centerView();});
  await page.screenshot({path:info.outputPath("cluster-boundaries.png")});
  await page.evaluate(()=>{const p=window.graphBrowser;p.getRfc().removeFocus("a");p.repaint();});await expect(boundaries).toHaveCount(1);
  await page.evaluate(()=>{const p=window.graphBrowser;p.getRfc().setFocus(null);p.repaint();});await expect(boundaries).toHaveCount(0);
  expect(errors).toEqual([]);
});
