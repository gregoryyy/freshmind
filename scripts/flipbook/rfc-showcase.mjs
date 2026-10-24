/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
const scenes=[
  ["plain","Plain community graph","Ordinary layout", "The whole synthetic research community contains 34 typed nodes and 37 relations: six projects, three groups, seven people and eighteen notes. Project collaboration, shared group membership and a citation connect the surrounding context."],
  ["lens","Viewing focus + context","viewing lens allocates", "The viewing lens enlarges the area around Graph Atlas while retaining distant context. It transforms display positions independently of physical layout. This scene starts from the same saved coordinates and runs the same number of layout batches as the plain view."],
  ["single","One reinforced neighborhood","five immediate branches", "Graph Atlas has five reinforced branches: two groups and three notes. Target-length and angular reinforcement use horizontally weighted coordinates; soft focal-region exclusion pushes context away. Complete semantic graph data remains unchanged."],
  ["two","Two independent RFC foci","independent focal neighborhoods", "Graph Atlas and Topic Lens have separate focal neighborhoods, with Semantic Methods shared between them. Halos identify their eleven distinct members, and dashed boundaries follow the current viewing transform. Soft context/non-shared exclusion complements reinforcement; surrounding semantic relations remain present."],
  ["hybrid","RFC with structural aggregation","typed counts", "The two foci retain their detail while sixteen remote leaf people and papers aggregate into typed parent counts. Eighteen of 34 nodes and 21 of 37 relations remain visible. The shared group, Maya's two-group collaboration and the citation-bearing context papers remain explicit. Reveal a parent's leaves to inspect its detail."],
  ["hybrid-lens","Hybrid focus + context with the viewing lens","same hybrid rules", "The viewing lens composes with the same two focal neighborhoods and reversible aggregation rules. All 34 nodes, 37 relations and two stored focal definitions remain available for browsing, editing and YAML export. The showcase demonstrates the original tasks with a new graph and the current implementation; it makes no general readability or convergence claim."]
];

export const tour=scenes.map(([id,title,ready,caption],index)=>({id,title,caption,
  async run({page,open,advance}) {
    if(index===0) {
      await open("/");
      // Retain the recorded fixed-force comparison; live general recovery uses wall time.
      await page.evaluate(()=>window.graphBrowser.tgLayout.setAdaptiveDampingEnabled(false));
      await page.locator(".sidebar > details").evaluateAll(sections=>{for(const section of sections)section.open=section.id==="files-section";});
      await page.locator("#example-graph").selectOption("rfc-showcase");
      await page.waitForFunction(()=>document.querySelector("#file-status").textContent.includes("34 nodes, 37 relations")&&window.graphBrowser.getRfc().getState().centers.length===2);
    }
    await page.getByLabel("Apply comparison view",{exact:true}).selectOption(id);
    await page.waitForFunction(text=>document.querySelector("#rfc-showcase-caption").textContent.includes(text),ready);
    await advance(160);await page.getByRole("button",{name:"Fit visible graph",exact:true}).click();
    await page.evaluate(()=>document.activeElement?.blur());
  }
}));
