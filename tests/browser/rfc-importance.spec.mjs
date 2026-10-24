import {test,expect} from "@playwright/test";

test("overlay node/relation weights change added RFC forces and zero importance retains ordinary graph context",async({page},info)=>{
  const errors=[];page.on("pageerror",error=>errors.push(error.message));await page.goto("/");
  await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);
  await page.evaluate(async()=>{
    const p=window.graphBrowser;p.tgLayout.stop();p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();
    const {FreshGraph,FreshNode,FreshEdge}=await import("/src/fm/index.ts");
    const g=new FreshGraph(),a=new FreshNode("a","Center",{position:{x:-100,y:-50},fixed:true}),b=new FreshNode("b","Branch",{position:{x:160,y:90}});
    g.addNode(a);g.addNode(b);g.addEdge(new FreshEdge(a,b,{id:"link",label:"weighted relation",length:90}));
    p.setGraphEltSet(g);p.getGES().addAll();p.setSelect(a);p.centerOn(a,true);p.getRfc().configure({angularStiffness:0});p.getRfc().setFocus(a);p.repaintAfterMove();
  });
  const force=()=>page.evaluate(()=>{
    const p=window.graphBrowser;for(const n of p.getAllNodes())n.dx=n.dy=0;p.getRfc().apply(p.getGES(),1);
    const n=p.findNode("b");return [n.dx,n.dy];
  });
  const baseline=await force();
  await page.locator('[data-edge-id="link"]').press("Enter");
  await page.locator("#edit-item").click();await page.getByLabel("Weight",{exact:true}).fill("30");await page.getByRole("button",{name:"Save changes",exact:true}).click();
  const relation=await force();for(let i=0;i<2;i++)expect(relation[i]).toBeCloseTo(baseline[i]*1.5,8);
  await page.locator('[data-node-id="b"]').click();
  await page.locator("#edit-item").click();await page.getByLabel("Weight",{exact:true}).fill("9");await page.getByRole("button",{name:"Save changes",exact:true}).click();
  const node=await force();for(let i=0;i<2;i++)expect(node[i]).toBeCloseTo(relation[i]*Math.sqrt(1.8),8);
  await page.locator("#edit-item").click();await page.getByLabel("Weight",{exact:true}).fill("0");await page.getByRole("button",{name:"Save changes",exact:true}).click();
  expect(await force()).toEqual([0,0]);
  await expect(page.locator(".fm-edge")).toHaveCount(1);await expect(page.locator(".fm-node")).toHaveCount(2);
  await expect(page.locator(".fm-rfc-edge-halo")).toHaveCount(0);await expect(page.locator('.fm-rfc-node-halo[data-rfc-node-id="b"]')).toHaveCount(0);
  expect(await page.evaluate(()=>{const p=window.graphBrowser,b=p.findNode("b"),before=[b.x,b.y];p.tgLayout.tick();return Math.hypot(b.x-before[0],b.y-before[1]);})).toBeGreaterThan(0);
  await page.screenshot({path:info.outputPath("zero-importance-context.png")});expect(errors).toEqual([]);
});

test("weighted tree example preserves all stored memberships while highlighting positive RFC constraints only",async({page},info)=>{
  const errors=[];page.on("pageerror",error=>errors.push(error.message));await page.goto("/");
  await page.waitForFunction(()=>window.graphBrowser?.getRfc().getState().active);await page.evaluate(()=>window.graphBrowser.tgLayout.stop());
  await page.locator("#example-graph").selectOption("weighted-tree");await expect(page.locator("#file-status")).toContainText("7 nodes, 6 relations");
  await page.getByText("Reinforcement Focus + Context",{exact:true}).click();await page.getByText("Substructures",{exact:true}).click();
  await page.getByLabel("Substructure",{exact:true}).selectOption("weighted-tree");await page.getByRole("button",{name:"Reinforce substructure",exact:true}).click();
  const state=await page.evaluate(()=>{const p=window.graphBrowser,s=p.getRfc().getState(),definition=p.getCompleteEltSet().getSubstructure("weighted-tree");return {edges:s.radialEdgeIds,nodes:s.memberIds,members:definition.nodeIds.length,relations:definition.edgeIds.length};});
  expect(state.edges.sort()).toEqual(["aa1","bb1","ra","rb"]);expect(state.nodes.sort()).toEqual(["a","a1","b","b1","root"]);
  expect(state.members).toBe(7);expect(state.relations).toBe(6);
  await expect(page.locator(".fm-rfc-edge-halo")).toHaveCount(4);await expect(page.locator(".fm-rfc-node-halo")).toHaveCount(5);
  await page.screenshot({path:info.outputPath("weighted-tree.png")});expect(errors).toEqual([]);
});
