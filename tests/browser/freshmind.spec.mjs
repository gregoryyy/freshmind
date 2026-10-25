import {selectChoice} from "../../scripts/browser-controls.mjs";
import { test, expect } from "@playwright/test";

async function ready(page) {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/freshmind.html");await page.waitForFunction(()=>Boolean(window.freshmindBrowser));
  return errors;
}
test("Freshmind palette, labeled quadratic paths, midpoint arrows and self loops render",async({page},testInfo)=>{
  const errors=await ready(page);
  await expect(page.locator(".fm-node")).toHaveCount(21);await expect(page.locator(".fm-edge")).toHaveCount(5);
  await expect(page.locator('[data-edge-id="authored"] .fm-edge-label')).toHaveText("authored");
  await expect(page.locator('[data-edge-id="loop"] .fm-edge-path')).toHaveAttribute("d",/ C /);
  await expect(page.locator('[data-edge-id="authored"] .fm-edge-path')).toHaveAttribute("d",/ Q /);
  const paths=await page.locator(".fm-edge-path").evaluateAll(elements=>elements.map(e=>e.getAttribute("d")));
  expect(paths.every(path=>!/NaN|Infinity/.test(path))).toBe(true);
  const geometry=await page.evaluate(()=>{
    const panel=window.freshmindBrowser,edge=[...panel.getAllEdges()].find(e=>e.getID()==="authored"),g=panel.getEdgeGeometry(edge);
    return {point:g.arrowPoint,mid:g.midpoint,hit:edge.containsPoint(g.midpoint.x,g.midpoint.y),a:{x:edge.from.drawx,y:edge.from.drawy},z:{x:edge.to.drawx,y:edge.to.drawy}};
  });
  expect(geometry.point).toEqual(geometry.mid);expect(geometry.hit).toBe(true);
  expect(Math.abs(geometry.mid.y-(geometry.a.y+geometry.z.y)/2)).toBeGreaterThan(5);
  const ids=await page.locator(".fm-node").evaluateAll(elements=>elements.map(e=>e.getAttribute("data-semantic-type")));
  expect(ids).toContain("ldaquery");expect(ids).toContain("decision");expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath("freshmind-types.png")});
});
test("YAML configuration reload applies styles atomically and preserves graph coordinates",async({page})=>{
  const errors=await ready(page);
  const before=await page.evaluate(()=>[...window.freshmindBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]));
  const source=await page.locator("#types").inputValue();
  await page.locator("#types").fill(source.replace('fill: "#30a000"','fill: "#123456"'));
  await page.getByRole("button",{name:"Apply configuration"}).click();
  await expect(page.locator("#config-status")).toHaveText("Configuration applied");
  await expect(page.locator('[data-node-id="person"] .fm-shape')).toHaveAttribute("fill","#123456");
  await page.locator("#types").fill("format: broken");await page.getByRole("button",{name:"Apply configuration"}).click();
  await expect(page.locator("#config-status")).toContainText("version 1");
  await expect(page.locator('[data-node-id="person"] .fm-shape')).toHaveAttribute("fill","#123456");
  expect(await page.evaluate(()=>[...window.freshmindBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]))).toEqual(before);
  expect(errors).toEqual([]);
});
test("curves, hit paths and label anchors follow lens changes and relation edits",async({page})=>{
  const errors=await ready(page),path=page.locator('[data-edge-id="authored"] .fm-edge-path');
  const before=await path.getAttribute("d");await page.locator("#hyper").fill("80");expect(await path.getAttribute("d")).not.toBe(before);
  await selectChoice(page.locator("#curve"),"lens");
  const agreement=await page.evaluate(()=>{
    const p=window.freshmindBrowser,e=[...p.getAllEdges()].find(e=>e.getID()==="authored"),g=p.getEdgeGeometry(e);
    const middle=p.getLensSet().convRealToDraw((e.from.x+e.to.x)/2,(e.from.y+e.to.y)/2);
    e.setLabel("new label");e.setSemanticType("cites");p.repaint();
    return Math.hypot(g.midpoint.x-middle.x,g.midpoint.y-middle.y);
  });
  expect(agreement).toBeLessThan(1e-8);await expect(page.locator('[data-edge-id="authored"] .fm-edge-label')).toHaveText("new label");
  await expect(page.locator('[data-edge-id="authored"]')).toHaveAttribute("data-semantic-type","cites");
  const result=await page.evaluate(()=>{
    const p=window.freshmindBrowser,e=[...p.getAllEdges()].find(e=>e.getID()==="authored"),g=p.getEdgeGeometry(e);
    const element=document.querySelector('[data-edge-id="authored"] .fm-edge-label');return {x:+element.getAttribute("x"),y:+element.getAttribute("y"),expected:g.labelAnchor};
  });
  expect(result.x).toBeCloseTo(result.expected.x,8);expect(result.y).toBeCloseTo(result.expected.y,8);expect(errors).toEqual([]);
});
test("render hooks retain dragging, Freshmind edit factories and bounded node focus",async({page})=>{
  const errors=await ready(page);
  await page.evaluate(async()=>{
    const p=window.freshmindBrowser,person=p.findNode("person"),paper=p.findNode("paper");
    p.getGES().removeNode(paper);p.repaint();person.setWeight(50);p.repaint();
  });
  const person=page.locator('[data-node-id="person"]');await person.focus();
  const bounds=await person.evaluate(element=>({group:element.getBBox().width,body:element.querySelector(".fm-shape").getBBox().width}));
  expect(bounds.group).toBeCloseTo(bounds.body,4);await expect(page.locator('[data-for-node="person"]')).toHaveText("+2");
  const box=await person.boundingBox(),old=await page.evaluate(()=>{const n=window.freshmindBrowser.findNode("person");return[n.x,n.y];});
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+35,box.y+box.height/2+20,{steps:4});await page.mouse.up();
  expect(await page.evaluate(()=>{const n=window.freshmindBrowser.findNode("person");return[n.x,n.y];})).not.toEqual(old);
  await page.evaluate(()=>window.freshmindBrowser.setInteractionMode("edit"));
  await page.locator("#graph svg").dblclick({position:{x:50,y:50}});
  const node=page.locator('[data-node-id="New node"]');await expect(node.locator(".fm-shape")).toBeVisible();
  expect(await page.evaluate(()=>window.freshmindBrowser.findNode("New node").constructor.name)).toBe("FreshNode");
  await node.press("Delete");await expect(node).toHaveCount(0);expect(errors).toEqual([]);
});
test("edge pointer selection uses the rendered curve and clears after hiding an endpoint",async({page})=>{
  const errors=await ready(page),svg=await page.locator("#graph svg").boundingBox();
  const point=await page.evaluate(()=>{const p=window.freshmindBrowser,e=[...p.getAllEdges()].find(e=>e.getID()==="cites");return p.getEdgeGeometry(e).pointAt(.5);});
  await page.mouse.click(svg.x+point.x,svg.y+point.y);
  expect(await page.evaluate(()=>window.freshmindBrowser.getSelectEdge()?.getID())).toBe("cites");
  await page.evaluate(async()=>{const p=window.freshmindBrowser;await p.hideNode(p.findNode("paper"));});
  expect(await page.evaluate(()=>window.freshmindBrowser.getSelectEdge())).toBe(null);expect(errors).toEqual([]);
});
