/* Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
 * TypeScript port by Gregor Heinrich using Codex GPT-6.1. */
import {fileURLToPath} from "node:url";

const rfcExample = fileURLToPath(new URL("../../docs/experiments/rfc-single-focus/crowded-star.fm.yaml", import.meta.url));
const weightedExample = fileURLToPath(new URL("../../docs/experiments/rfc-single-focus/wide-labels.fm.yaml", import.meta.url));

/** Waits for the actual replacement, including when reopening a file with the same name and focus ID. */
async function openRfc(page, example = rfcExample) {
  const previous = await page.evaluateHandle(() => window.graphBrowser.getCompleteEltSet());
  try {
    await page.locator("#open-graph-files").setInputFiles(example);
    await page.waitForFunction(graph => window.graphBrowser.getCompleteEltSet() !== graph && window.graphBrowser.getSelection()?.getID() === "center", previous);
    await page.getByLabel("Graph spacing").fill("200");
  } finally { await previous.dispose(); }
}

/** Ordered acts and captions are the source of the generated walkthrough. */
export const tour = [
  {
    id: "browser", title: "Graph browser",
    caption: "The main browser opens a local neighborhood. Select nodes to inspect their connections; dragging, pinning and neighborhood controls use the same graph model.",
    async run({open, advance}) { await open("/"); await advance(60); }
  },
  {
    id: "neighborhood", title: "Reveal the complete graph",
    caption: "Show whole graph reveals stored nodes beyond the current neighborhood. Expansion, collapse and hiding change the visible graph while retaining the complete graph for editing and export.",
    async run({page, advance}) { await page.getByRole("button", {name: "Show whole graph"}).click(); await advance(60); }
  },
  {
    id: "view-controls", title: "Graph spacing, canvas zoom and viewing lens",
    caption: "Graph spacing changes node distances. Canvas zoom scales shapes, labels and strokes together. The focus + context slider applies the independent nonlinear viewing lens.",
    async run({page}) {
      await page.getByLabel("Graph spacing").fill("120");
      await page.getByRole("button", {name: "Canvas zoom in", exact: true}).click();
      await page.locator("#hyper").fill("40");
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
      await advance(80);
    }
  },
  {
    id: "public-network", title: "Florentine families",
    caption: "This public example has 15 families and 20 undirected marriage links. Node content contains graph-derived summaries and links to the connected families, with source attribution retained in the document.",
    async run({page, advance}) {
      await page.locator("#example-graph").selectOption("florentine");
      await page.waitForFunction(() => document.querySelector("#file-status").textContent.includes("15 nodes, 20 relations"));
      await advance(80);
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
    caption: "Ctrl+Enter commits the label. Space or Show details opens the selected node's content in a separate, resizable popup. Internal links navigate to connected nodes; Edit content delegates to the annotation inspector.",
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
    caption: "The synthetic crowded-star fixture uses a fixed center and fixed context anchors. This is the ordinary TouchGraph layout after 250 batches from the saved initial coordinates; RFC is off. Both comparison views use 200% graph spacing and 100% canvas zoom for readability.",
    async run({page, advance}) {
      const [download] = await Promise.all([
        page.waitForEvent("download"), page.getByRole("button", {name: "Download YAML", exact: true}).click()
      ]);
      if (download.suggestedFilename() !== "freshmind-flipbook.fm.yaml") throw new Error("Unexpected YAML download name");
      await openRfc(page);
      await page.evaluate(()=>window.graphBrowser.getRfc().setFocus(null));
      await advance(250);
      await page.locator(".sidebar").evaluate(sidebar => { sidebar.scrollTop = 0; });
      await page.getByText("Reinforcement Focus + Context", {exact: true}).click();
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
    caption: "The default Tree structure preset combines target focal length 120, radial stiffness 1 and angular stiffness 10000. From the same starting graph and after 250 batches, the focal star is more regular. Both stronger angular constraints and the new length spring contribute. RFC halos fade away without a rim; focal-region exclusion remains later work.",
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
    id: "nips", title: "Browse the approved NIPS dataset",
    caption: "NIPS-FM contains 3,777 nodes and 5,257 relations. Opening it starts with a bounded neighborhood; the full graph remains stored for subsequent navigation and export.",
    async run({page, advance}) {
      await page.locator("#example-graph").selectOption("nips-fm");
      await page.waitForFunction(() => document.querySelector("#file-status").textContent.includes("3777 nodes, 5257 relations"));
      await advance(80);
      await page.locator(".sidebar").evaluate(sidebar => { sidebar.scrollTop = 0; });
    }
  }
];
