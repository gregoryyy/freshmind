/* Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
 * TypeScript port by Gregor Heinrich using Codex GPT-6.1. */
import {fileURLToPath} from "node:url";
import {tour as searchTour} from "./search.mjs";

const rfcExample = fileURLToPath(new URL("../../docs/experiments/rfc-single-focus/crowded-star.fm.yaml", import.meta.url));
const weightedExample = fileURLToPath(new URL("../../docs/experiments/rfc-single-focus/wide-labels.fm.yaml", import.meta.url));
let readabilityBefore=0;
let relationBefore;
const relationMetrics=page=>page.evaluate(()=>{
  const labels=[...document.querySelectorAll(".fm-edge-label")].filter(e=>e.textContent).map(e=>e.getBoundingClientRect());
  const nodes=[...document.querySelectorAll(".fm-node .fm-shape")].map(e=>e.getBoundingClientRect());let count=0;
  for(let i=0;i<labels.length;i++)for(const b of [...nodes,...labels.slice(i+1)]){
    const a=labels[i];if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))count++;
  }
  return {count,positions:[...window.graphBrowser.getAllNodes()].map(n=>[n.getID(),n.x,n.y]),
    paths:[...document.querySelectorAll(".fm-edge-path")].map(e=>e.getAttribute("d"))};
});
const overlaps=page=>page.locator(".fm-node .fm-shape").evaluateAll(elements=>{
  const boxes=elements.map(e=>e.getBoundingClientRect());let count=0;
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))count++;
  }return count;
});

/** Keeps each captured act's controls visible without scrolling the graph itself. */
async function sidebar(page, ...openIds) {
  await page.locator(".sidebar > details").evaluateAll((sections, ids) => {
    for (const section of sections) section.open = ids.includes(section.id);
  }, openIds);
  await page.locator(".sidebar").evaluate(element => { element.scrollTop = 0; });
}

async function example(page, name) {
  await page.locator("#files-section").evaluate(section => { section.open = true; });
  const previous = await page.evaluateHandle(() => window.graphBrowser.getCompleteEltSet());
  try {
    await page.locator("#example-graph").selectOption(name);
    await page.waitForFunction(graph => window.graphBrowser.getCompleteEltSet() !== graph, previous);
    await page.evaluate(async () => {
      const panel = window.graphBrowser;
      panel.fastFinishAnimation(); await panel.getLocalityUtils().whenIdle();
    });
  } finally { await previous.dispose(); }
}

async function reinforceStored(page) {
  return page.evaluate(() => {
    const panel = window.graphBrowser, structures = panel.getCompleteEltSet().getSubstructures();
    panel.getRfc().setFocus(null);
    structures.forEach((structure, index) => panel.getRfc().activateSubstructure(structure.id, index > 0));
    panel.tgLayout.setRigidity(0.1);
    return structures[0]?.id;
  });
}

/** Frames visible bodies using only graph spacing and canvas transforms. */
async function frame(page, spacing = 1) {
  await page.evaluate(scale => {
    const panel = window.graphBrowser;
    panel.setZoom(scale); panel.setCanvasZoom(1); panel.repaint();
    const nodes = [...panel.getGES().getNodes()], center = panel.getDrawCenter(), size = panel.getSize();
    const left = Math.min(...nodes.map(node => node.drawx - node.getWidth() / 2));
    const right = Math.max(...nodes.map(node => node.drawx + node.getWidth() / 2));
    const top = Math.min(...nodes.map(node => node.drawy - node.getHeight() / 2));
    const bottom = Math.max(...nodes.map(node => node.drawy + node.getHeight() / 2));
    const zoom = Math.min(1, (size.width - 120) / (right - left), (size.height - 120) / (bottom - top));
    panel.setCanvasZoom(zoom);
    panel.setCanvasPan((center.x - (left + right) / 2) * zoom, (center.y - (top + bottom) / 2) * zoom);
  }, spacing);
}

/** Use the shipped readability command; fail the walkthrough instead of publishing cluttered overview bodies. */
async function readableOverview(page, spacing=1) {
  await frame(page,spacing);
  const previous=await page.locator("#view-section, #readability-section").evaluateAll(items=>items.map(e=>({id:e.id,open:e.open})));
  await page.locator("#view-section, #readability-section").evaluateAll(items=>items.forEach(e=>e.open=true));
  await page.getByRole("button",{name:"Separate overlapping nodes",exact:true}).click();
  await frame(page,spacing);
  await page.locator("#view-section, #readability-section").evaluateAll((items,states)=>items.forEach(e=>e.open=states.find(s=>s.id===e.id).open),previous);
  const remaining=await overlaps(page);if(remaining)throw new Error(`Overview still has ${remaining} overlapping node bodies`);
}

/** Waits for the actual replacement, including when reopening a file with the same name and focus ID. */
async function openRfc(page, example = rfcExample) {
  const previous = await page.evaluateHandle(() => window.graphBrowser.getCompleteEltSet());
  try {
    await page.locator("#open-graph-files").setInputFiles(example);
    await page.waitForFunction(graph => window.graphBrowser.getCompleteEltSet() !== graph && window.graphBrowser.getSelection()?.getID() === "center", previous);
    await page.evaluate(() => {window.graphBrowser.setZoom(2);window.graphBrowser.tgLayout.setAdaptiveDampingEnabled(false);});
  } finally { await previous.dispose(); }
}

/** Ordered acts and captions are the source of the generated walkthrough. */
const browserSteps = [
  {
    id: "browser", title: "Graph browser with RFC on the center node",
    caption: "The graph-browser example opens with Reinforcement Focus+Context active on its central Graph browsers node. Yellow halos identify the reinforced center and its five immediate branches; the surrounding graph retains its ordinary connections. The shipped label-separation command clears body overlaps and pauses motion for this overview.",
    async run({page, open, advance}) {
      await open("/");
      await page.waitForFunction(() => window.graphBrowser.getRfc().getState().focusId === "root");
      await advance(60);
      await page.evaluate(() => {
        const panel = window.graphBrowser;
        panel.setSelect(panel.findNode("root")); panel.centerOn(panel.findNode("root"), true);
      });
      await readableOverview(page);
      await sidebar(page, "rfc-section");
      await page.waitForFunction(() => document.querySelectorAll(".fm-rfc-node-halo").length === 6);
      await page.evaluate(() => document.activeElement?.blur());
    }
  },
  {
    id: "neighborhood", title: "Reveal the complete graph",
    caption: "Show whole graph reveals stored nodes beyond the current neighborhood. Expansion, collapse and hiding change the visible graph while retaining the complete graph for editing and export.",
    async run({page, advance}) {
      await sidebar(page, "files-section", "view-section");
      await page.getByRole("button", {name: "Show whole graph"}).click(); await advance(60); await readableOverview(page);
    }
  },
  {
    id: "view-controls", title: "Graph spacing, canvas zoom and viewing lens",
    caption: "Graph spacing changes node distances. Canvas zoom scales shapes, labels and strokes together. The focus + context slider applies the independent nonlinear viewing lens.",
    async run({page}) {
      await page.getByLabel("Graph spacing").fill("120");
      await page.getByRole("button", {name: "Canvas zoom in", exact: true}).click();
      await page.locator("#hyper").fill("40"); await readableOverview(page,1.2);
    }
  },
  {
    id: "key-map", title: "User key map",
    caption: "The help dialog and docs/KEYMAP.md share the same implemented command definitions, including graph spacing, canvas zoom, navigation, editing and file shortcuts.",
    async run({page}) { await page.getByRole("button", {name: "Key map", exact: true}).click(); }
  },
  {
    id: "types", title: "Node types and curved relations",
    caption: "The palette page shows all 21 configured Freshmind node types, labeled curved relations, parallel edges and a self-loop. Its YAML editor applies semantic and visual configuration to the existing graph.",
    async run({open}) { await open("/freshmind.html"); }
  },
  {
    id: "berry", title: "Open the approved Berry example",
    caption: "Berry is one of the two approved migrated datasets. The native YAML graph retains 21 nodes and 22 relations, annotations and original linked-resource paths.",
    async run({page, open, advance}) {
      await open("/");
      await page.locator("#example-graph").selectOption("berry");
      await page.waitForFunction(() => document.querySelector("#file-status").textContent.includes("21 nodes, 22 relations"));
      await advance(80); await readableOverview(page);
    }
  },
  {
    id: "public-network", title: "Florentine families",
    caption: "This public example has 15 families and 20 undirected marriage links. Node content contains graph-derived summaries and links to the connected families, with source attribution retained in the document.",
    async run({page, advance}) {
      await sidebar(page, "files-section", "selection-section");
      await page.locator("#example-graph").selectOption("florentine");
      await page.waitForFunction(() => document.querySelector("#file-status").textContent.includes("15 nodes, 20 relations"));
      await advance(80); await readableOverview(page);
    }
  },
  {
    id: "inline-edit", title: "Edit a multiline node label",
    caption: "F2 opens an inline label editor on the selected node. A draft stays separate from the model until committed; node identity, relations and annotations are retained.",
    async run({page}) {
      await page.locator("#graph svg").focus(); await page.keyboard.press("F2");
      await page.getByLabel("Inline node label", {exact: true}).fill("Medici\nEdited label");
    }
  },
  {
    id: "annotation", title: "Annotations and item details",
    caption: "Ctrl+Enter commits the label. Space or Show details opens the selected node's content in a separate, resizable popup. Internal links navigate to connected nodes; Edit content opens the annotation overlay.",
    async run({page}) {
      await page.getByLabel("Inline node label", {exact: true}).press("Control+Enter");
      const details = page.locator("#toggle-details");
      await details.scrollIntoViewIfNeeded();
      if ((await details.textContent()).startsWith("Show")) await details.click();
      await page.locator(".fm-node-details[open]").waitFor({state: "visible"});
    }
  },
  {
    id: "save-yaml", title: "Save the complete graph as YAML",
    caption: "Ctrl+Shift+S opens the filename dialog. Saving downloads the complete stored graph, including hidden nodes, with optional layout/view state and embedded or companion type configuration.",
    async run({page}) {
      await page.getByRole("button", {name: "Close node content", exact: true}).click();
      await page.locator("#graph svg").focus(); await page.keyboard.press("Control+Shift+s");
      await page.getByLabel("Save filename", {exact: true}).fill("freshmind-flipbook.fm.yaml");
    }
  },
  {
    id: "rfc-baseline", title: "Single-focus comparison: ordinary layout",
    caption: "The synthetic crowded-star fixture uses a fixed center and fixed context anchors. This is the ordinary TouchGraph layout after 250 batches from the saved initial coordinates; RFC is off. Adaptive damping is off throughout the fixed-force comparison. Both comparison views use 200% graph spacing and 100% canvas zoom for readability.",
    async run({page, advance}) {
      const [download] = await Promise.all([
        page.waitForEvent("download"), page.getByRole("button", {name: "Download YAML", exact: true}).click()
      ]);
      if (download.suggestedFilename() !== "freshmind-flipbook.fm.yaml") throw new Error("Unexpected YAML download name");
      await openRfc(page);
      await page.evaluate(()=>window.graphBrowser.getRfc().setFocus(null));
      await advance(250);
      await sidebar(page, "rfc-section");
    }
  },
  {
    id: "rfc-attraction", title: "Single-focus comparison: attraction reinforcement",
    caption: "Reload the identical graph, choose Attraction only and run 250 batches. This earlier preset combines attraction multiplier 3 with angular stiffness 300, without a target-length spring. Soft yellow halos identify the reinforced nodes and relations; semantic graph records remain unchanged.",
    async run({page, advance}) {
      await openRfc(page);
      await page.getByRole("button", {name: "Attraction only", exact: true}).click();
      await page.getByRole("button", {name: "Reinforce selected node", exact: true}).click();
      await advance(250);
      await page.waitForFunction(() => window.graphBrowser.getRfc().getState().branchIds.length === 6);
    }
  },
  {
    id: "rfc", title: "Single-focus comparison: length-constrained tree",
    caption: "The default Tree structure preset combines target focal length 120, radial stiffness 1 and angular stiffness 10000. From the same starting graph and after 250 batches, the focal star is more regular. Both stronger angular constraints and the new length spring contribute. Yellow halos show reinforcement; optional focal-region exclusion is demonstrated separately below.",
    async run({page, advance}) {
      await openRfc(page);
      await page.getByRole("button", {name: "Tree structure", exact: true}).click();
      await page.getByRole("button", {name: "Reinforce selected node", exact: true}).click();
      await advance(250);
    }
  },
  {
    id: "rfc-weighted", title: "Weighted RFC for horizontally extended labels",
    caption: "The wide-label fixture uses horizontal coordinate weight 0.25 and vertical weight 1. Equal angles are measured in weighted physical coordinates, permitting a wider focal layout while the viewing lens and both zooms stay independent. Ordinary context springs still compete with reinforcement; the metric alone does not guarantee clear space or eliminate label overlaps.",
    async run({page, advance}) {
      await openRfc(page, weightedExample);
      const weight = page.getByLabel("Horizontal coordinate weight", {exact: true});
      await weight.fill("0.25"); await weight.press("Tab");
      await page.getByRole("button", {name: "Reinforce selected node", exact: true}).click();
      await advance(250);
      await page.locator(".sidebar").evaluate(sidebar => { sidebar.scrollTop = 0; });
    }
  },
  {
    id: "multiple-foci", title: "Reinforce multiple stored trees",
    caption: "Two saved tree definitions reinforce deeper neighborhoods at the same time. Their context relations remain ordinary graph edges. Stored membership survives YAML export; active RFC centers are temporary view state. Shift+Enter can also add or remove an individual center.",
    async run({page, open, advance}) {
      await open("/"); await example(page, "joined-trees"); const structure = await reinforceStored(page);
      await advance(150);
      await frame(page);
      await sidebar(page, "rfc-section");
      await page.getByText("Force settings", {exact: true}).click();
      await page.getByText("Substructures", {exact: true}).click();
      await page.getByLabel("Substructure", {exact: true}).selectOption(structure);
      await page.waitForFunction(() => window.graphBrowser.getRfc().getState().centers.filter(center => center.active).length === 2);
    }
  },
  {
    id: "clusters", title: "Overlapping clusters and their boundaries",
    caption: "RFC can reinforce cyclic clusters as well as trees. These two stored clusters share a member, retain their internal relations and show translucent boundaries. Cluster rigidity controls resistance to deformation; the representative selects the group without becoming a physical anchor.",
    async run({page, open, advance}) {
      await open("/"); await example(page, "clusters"); const structure = await reinforceStored(page);
      await advance(150);
      await frame(page, 2);
      await sidebar(page, "rfc-section");
      await page.getByText("Force settings", {exact: true}).click();
      await page.getByText("Substructures", {exact: true}).click();
      await page.getByLabel("Substructure", {exact: true}).selectOption(structure);
      await page.waitForFunction(() => document.querySelectorAll(".fm-cluster-boundary").length === 2);
    }
  },
  {
    id: "focal-regions", title: "Optional focal-region exclusion",
    caption: "Dashed physical regions show the space reserved around two reinforced structures. Optional exclusion pushes context and non-shared focal nodes away from those regions while shared members remain exempt from their own regions. The forces are soft; pinned nodes and labels can still overlap.",
    async run({page, open, advance}) {
      await open("/"); await example(page, "exclusion"); await reinforceStored(page);
      await sidebar(page, "rfc-section");
      await page.getByText("Force settings", {exact: true}).click();
      await page.getByText("Focal regions", {exact: true}).click();
      await page.getByLabel("Keep context outside focal regions", {exact: true}).check();
      await advance(150);
      await frame(page, 2);
      await page.waitForFunction(() => document.querySelectorAll(".fm-exclusion-region").length === 2);
    }
  },
  {
    id: "importance", title: "Node importance and exact weight values",
    caption: "Node weight scales body and label size within configured limits. Weight 1 keeps normal size and weight 0 remains visible. Optional values make weights explicit when labels differ in length. Size shows importance; yellow halos independently show RFC participation.",
    async run({page, open, advance}) {
      await open("/"); await example(page, "weighted-tree"); await reinforceStored(page);
      await advance(100);
      await frame(page, 2);
      await sidebar(page, "view-section");
      await page.getByText("Node importance", {exact: true}).click();
      await page.getByLabel("Show node weight values", {exact: true}).check();
      await page.waitForFunction(() => document.querySelectorAll(".fm-node-weight").length === 7);
    }
  },
  {
    id: "structural-view", title: "Combine RFC with structural aggregation",
    caption: "The structural focus + context example combines a viewing lens, RFC and reversible Person/Paper leaf aggregation. Six of thirteen nodes remain visible, with seven aggregated leaves counted under their parents. The shared collaborator stays visible because it connects two semantic neighbors. The complete graph remains intact.",
    async run({page, open}) {
      await open("/"); await example(page, "structural-focus-context");
      await sidebar(page, "structural-section");
      await page.getByLabel("Aggregate leaf types", {exact: true}).selectOption(["person", "paper"]);
      await page.getByLabel("Enable structural view", {exact: true}).check();
      await page.waitForFunction(() => window.graphBrowser.getStructuralView().getState().aggregatedNodeIds.length === 7);
      await frame(page);
    }
  },
  {
    id: "reveal-detail", title: "Reveal aggregated detail without losing context",
    caption: "Select Group Beta and reveal its leaves to restore detail while retaining the current graph, focal center and lens. Nine nodes are now visible. E also reveals a selected parent's leaves; Reset structural view restores the current neighborhood without deleting semantic data.",
    async run({page}) {
      await page.evaluate(() => {
        const panel = window.graphBrowser; panel.setSelect(panel.findNode("beta"));
      });
      await page.getByRole("button", {name: "Reveal selected parent’s leaves", exact: true}).click();
      await page.waitForFunction(() => window.graphBrowser.visibleNodeCount() === 9);
    }
  },
  {
    id: "nips", title: "Browse the approved NIPS dataset",
    caption: "NIPS-FM contains 3,777 nodes and 5,257 relations. This bounded neighborhood uses the label-separation command and canvas framing to make the long paper titles readable, with motion paused. All 3,777 nodes remain stored for subsequent navigation and export; this is not a whole-corpus overview.",
    async run({page, advance}) {
      await sidebar(page, "files-section", "view-section");
      await example(page, "nips-fm");
      await page.waitForFunction(() => document.querySelector("#file-status").textContent.includes("3777 nodes, 5257 relations"));
      await advance(80); await readableOverview(page,2);
      await page.locator(".sidebar").evaluate(sidebar => { sidebar.scrollTop = 0; });
    }
  },
  {
    id:"label-overlap",title:"Inspect overlapping node labels",
    caption:"The graph-browser example retains RFC on its center node. Point-based layout can leave wide node labels intersecting even when their centers are apart. Label spacing uses the measured visible bodies, including multiline labels and importance scaling.",
    async run({page,open,advance}){
      await open("/");await page.waitForFunction(()=>window.graphBrowser.getRfc().getState().focusId==="root");await advance(60);
      await page.evaluate(()=>window.graphBrowser.centerOn(window.graphBrowser.findNode("root"),true));await sidebar(page,"view-section");
      await page.locator("#readability-section").evaluate(e=>e.open=true);
      readabilityBefore=await overlaps(page);if(!readabilityBefore)throw new Error("Readability comparison needs an overlapping baseline");
      await page.evaluate(()=>document.activeElement?.blur());
    }
  },
  {
    id:"labels-separated",title:"Separate overlapping nodes",
    caption:"Separate overlapping nodes arranges visible bodies with a requested gap and pauses motion. Pinned nodes and the viewing focus stay in place; semantic relations, RFC, hidden nodes and viewing settings are retained. The status reports remaining intersections. Resuming motion or changing the view can introduce new overlaps; relation labels and crossings are separate concerns.",
    async run({page}){
      await page.getByRole("button",{name:"Separate overlapping nodes",exact:true}).click();
      await page.waitForFunction(()=>document.querySelector("#readability-status").textContent.includes("overlapping node pairs"));
      const after=await overlaps(page);if(after>=readabilityBefore)throw new Error("Label arrangement did not reduce measured body overlaps");
      console.log(`[flipbook] Node body overlaps: ${readabilityBefore} -> ${after}`);
      await page.evaluate(()=>document.activeElement?.blur());
    }
  },
  {
    id:"relation-overlap",title:"Inspect original relation-label positions",
    caption:"With node bodies already separated and motion paused, turn off Avoid relation label overlaps to inspect the original midpoint-and-offset anchors. Relation text can still intersect node bodies or other relation labels. The following view uses these exact node positions and curves.",
    async run({page}){
      await page.getByLabel("Avoid relation label overlaps",{exact:true}).uncheck();
      relationBefore=await relationMetrics(page);if(!relationBefore.count)throw new Error("Relation-label comparison needs an overlapping baseline");
      await page.evaluate(()=>document.activeElement?.blur());
    }
  },
  {
    id:"relations-separated",title:"Place relation labels near clear curve positions",
    caption:"Avoid relation label overlaps measures SVG text and tries nearby positions along each curve and its normal. The browser enables this bounded presentation pass by default. It reduces label–node and label–label intersections in this view while retaining every label, node position and curve. Dense views can still overlap; toggling off restores original anchors.",
    async run({page}){
      await page.getByLabel("Avoid relation label overlaps",{exact:true}).check();const after=await relationMetrics(page);
      if(after.count>=relationBefore.count)throw new Error("Relation-label placement did not reduce measured intersections");
      if(JSON.stringify(after.positions)!==JSON.stringify(relationBefore.positions)||JSON.stringify(after.paths)!==JSON.stringify(relationBefore.paths))throw new Error("Relation-label placement changed nodes or curves");
      console.log(`[flipbook] Relation-label intersections: ${relationBefore.count} -> ${after.count}`);
      await page.evaluate(()=>document.activeElement?.blur());
    }
  },
  {
    id:"label-weight",title:"Edit labels and weights together",
    caption:"F2 opens a graph-anchored label overlay with weight controls for either a node or a relation. Ctrl+G/H adjusts the shared draft; a numeric suffix such as Graph browsers =3 also sets absolute weight on Save. The draft leaves the graph unchanged until committed; Escape cancels both label and weight.",
    async run({page}){
      await page.evaluate(()=>window.graphBrowser.setSelect(window.graphBrowser.findNode("root")));
      await sidebar(page,"selection-section");await page.locator("#graph svg").focus();await page.keyboard.press("F2");
      await page.getByLabel("Node weight",{exact:true}).fill("3");
    }
  },
  {
    id:"details-editor",title:"Edit node details directly in an overlay",
    caption:"Ctrl+Enter commits the weight. Ctrl+Space or Shift+F2 then opens the full modeless editor at the node annotation, outside the side pane. It also exposes types, visual settings, URLs and metadata. Close retains a per-item draft; Save commits and Escape cancels. The annotation shown here is still a draft.",
    async run({page}){
      await page.getByLabel("Inline node label",{exact:true}).press("Control+Enter");await page.keyboard.press("Control+Space");
      await page.getByLabel("Annotation",{exact:true}).fill("Draft details edited directly in the overlay.");
    }
  },
  {
    id:"hover-keyboard",title:"Point at the graph to control its center",
    caption:"Close the editor, clear selection and move the pointer over a branch without clicking. Keyboard control resumes at the node in the viewport center, independently of the hovered branch. Enter acts immediately on that centered target; arrow navigation then continues from the selected node.",
    async run({page}){
      await page.getByRole("button",{name:"Close item editor",exact:true}).click();
      await page.evaluate(()=>{window.graphBrowser.setSelect(null);document.activeElement?.blur();});
      await page.locator('[data-node-id="topic-0"]').hover();await page.keyboard.press("Enter");
      const valid=await page.evaluate(()=>{const p=window.graphBrowser;return document.activeElement===document.querySelector('[data-node-id="root"]')&&p.getSelection()===p.getCenteredNode()&&p.getSelect()?.getID()==="root";});
      if(!valid)throw new Error("Pointer activation did not route Enter to the centered node");
    }
  },
  {
    id:"control-focus",title:"Explicit control focus takes priority",
    caption:"Focus Graph spacing in the side pane, then point back at the graph. The input keeps focus and Enter belongs to that control. Editors, buttons and summaries have the same protection. Click or Tab into the graph when ready to return keyboard control.",
    async run({page}){
      await sidebar(page,"view-section");await page.evaluate(()=>window.graphBrowser.setSelect(null));await page.locator("#graph-zoom").focus();
      const bounds=await page.locator("#graph svg").boundingBox();await page.mouse.move(bounds.x+20,bounds.y+20);await page.keyboard.press("Enter");
      const valid=await page.evaluate(()=>document.activeElement===document.querySelector("#graph-zoom")&&!window.graphBrowser.getSelection());
      if(!valid)throw new Error("Graph hover took explicit control focus");
    }
  },
  {
    id:"layout-damping",title:"Suppress oscillation with or without RFC",
    caption:"View → Layout motion enables general adaptive damping by default. It watches all movable visible nodes, including when RFC is off as shown here. Adaptive impulses attenuates repeated swings and gradually restores gain; Earlier TouchGraph cooling instead starts the inherited fast cooling phase after detected cycles. The status makes the active setting visible.",
    async run({page}){
      await sidebar(page,"view-section");
      await page.locator("#adaptive-damping").evaluate(e=>{e.closest("details").open=true;});
      await page.evaluate(()=>window.graphBrowser.getRfc().setFocus(null));
      await page.getByLabel("Adaptive damping",{exact:true}).check();
      await page.getByLabel("Damping response",{exact:true}).selectOption("impulse");
      const valid=await page.evaluate(()=>{const p=window.graphBrowser;return p.tgLayout.getAdaptiveDampingState().enabled&&!p.getRfc().getState().enabled;});
      if(!valid)throw new Error("General damping depends on RFC activation");
    }
  }
];

// Present complete user workflows, with search before the detailed layout examples.
// Preserve existing slide IDs so bookmarked examples keep working after reordering.
const chapters = [
  ["Explore", ["browser", "neighborhood", "view-controls", "key-map"]],
  ["Files and content", ["types", "berry", "nips", "public-network", "inline-edit", "annotation", "save-yaml"]],
  ["Focus + context", ["rfc-baseline", "rfc-attraction", "rfc", "rfc-weighted", "multiple-foci", "clusters", "focal-regions", "importance", "structural-view", "reveal-detail"]],
  ["Readability", ["label-overlap", "labels-separated", "relation-overlap", "relations-separated"]],
  ["Editing and keyboard", ["label-weight", "details-editor", "hover-keyboard", "control-focus"]],
  ["Layout motion", ["layout-damping"]]
];
const byId = new Map(browserSteps.map(step => [step.id, step]));
const ordered = chapters.map(([chapter, ids]) => ids.map(id => {
  const step = byId.get(id);
  if (!step) throw new Error("Missing browser tour step: " + id);
  byId.delete(id);
  return {...step, chapter};
}));
if (byId.size) throw new Error("Unassigned browser tour steps: " + [...byId.keys()].join(", "));
export const tour = [
  ...ordered[0],
  ...searchTour.map(step => ({...step, id: "search-" + step.id, chapter: "Search"})),
  ...ordered.slice(1).flat()
];
