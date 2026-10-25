import {test, expect} from "@playwright/test";

for (const url of ["/", "/freshmind.html"]) test(`edge selection and keyboard focus follow the stroke on ${url}`, async ({page}, testInfo) => {
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(()=>Boolean(window.graphBrowser??window.freshmindBrowser));
  await page.evaluate(async()=>{
    const p=window.graphBrowser??window.freshmindBrowser;
    p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();
    const {FreshGraph,FreshNode,FreshEdge}=await import("/src/fm/index.ts");
    const graph=new FreshGraph(),a=new FreshNode("a","From",{position:{x:-160,y:-90}}),b=new FreshNode("b","To",{position:{x:150,y:100}});
    graph.addNode(a);graph.addNode(b);
    for(const [id,from,to,weight] of [["edge",a,b,20],["parallel",b,a,10],["loop",b,b,10]])
      graph.addEdge(new FreshEdge(from,to,{id,label:id,weight}));
    p.setGraphEltSet(graph);p.getGES().addAll();p.setHyperbolic(60);p.centerView();p.repaintAfterMove();
  });
  const snapshot=locator=>locator.evaluate(group=>{
    const p=window.graphBrowser??window.freshmindBrowser,e=[...p.getAllEdges()].find(e=>e.getID()===group.dataset.edgeId);
    const path=group.querySelector(".fm-edge-path"),style=p.getEdgeStyle(e);
    return {outline:getComputedStyle(group).outlineStyle,focused:group.matches(":focus-visible"),
      stroke:path.getAttribute("stroke"),arrow:group.querySelector(".fm-edge-arrow").getAttribute("fill"),
      width:Number(path.getAttribute("stroke-width")),baseWidth:style.stroke.width*Math.max(.5,e.getWeight()/10),
      d:path.getAttribute("d"),expected:p.getEdgeGeometry(e).path,hit:group.querySelector(".fm-edge-hit").getAttribute("stroke")};
  });
  await page.keyboard.press("Tab");
  for(const mode of ["spider","lens","straight"]) {
    await page.evaluate(mode=>(window.graphBrowser??window.freshmindBrowser).setEdgeCurve(mode),mode);
    for(const id of ["edge","parallel","loop"]) {
      const edge=page.locator(`[data-edge-id="${id}"]`);
      await edge.focus();
      await expect.poll(async()=>{const s=await snapshot(edge);return s.focused&&s.width===s.baseWidth+2;}).toBe(true);
      const before=await snapshot(edge);
      expect(before.outline).toBe("none");expect(before.d).toBe(before.expected);expect(before.hit).toBe("transparent");
      await page.keyboard.press("Enter");
      await expect(edge).toHaveAttribute("aria-pressed","true");
      const selected=await snapshot(edge);
      expect(selected.stroke).toBe("#ff0000");expect(selected.arrow).toBe(selected.stroke);
      expect(selected.d).toBe(before.d);expect(selected.outline).toBe("none");
      await page.locator("#curve-choices input:checked, #curve:not([hidden])").focus();
      await expect.poll(async()=>{const s=await snapshot(edge);return s.width===s.baseWidth;}).toBe(true);
      expect((await snapshot(edge)).stroke).toBe("#ff0000");
    }
  }
  const point=await page.evaluate(()=>{
    const p=window.graphBrowser??window.freshmindBrowser,e=[...p.getAllEdges()].find(e=>e.getID()==="loop");p.setSelectEdge(null);
    const point=p.getEdgeGeometry(e).pointAt(.5),group=document.querySelector('[data-edge-id="loop"]');
    const screen=new DOMPoint(point.x,point.y).matrixTransform(group.getScreenCTM());return {x:screen.x,y:screen.y};
  });
  await page.mouse.click(point.x,point.y);
  const loop=page.locator('[data-edge-id="loop"]');
  await expect(loop).toHaveAttribute("aria-pressed","true");
  const clicked=await snapshot(loop);expect(clicked.stroke).toBe("#ff0000");expect(clicked.outline).toBe("none");
  await page.screenshot({path:testInfo.outputPath("selected-edge-stroke.png")});
  expect(errors).toEqual([]);
});
