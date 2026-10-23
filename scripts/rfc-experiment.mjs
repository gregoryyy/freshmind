/* Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
 * TypeScript port by Gregor Heinrich using Codex GPT-6.1. */
import {mkdir, writeFile} from "node:fs/promises";
import {resolve, join} from "node:path";
import {FreshmindDocument, TypeRegistry, freshmind2014Configuration} from "fm4/fm/core";
import {serializeDocument} from "fm4/fm/io";
import {rfcScenarios, rfcFixture, runRfcScenario} from "../tests/fixtures/rfc.mjs";

const output = resolve(process.argv[2] ?? "docs/experiments/rfc-single-focus");
if (process.argv.length > 3 || process.argv[2]?.startsWith("-")) throw new Error("Usage: node scripts/rfc-experiment.mjs [output-directory]");
await mkdir(output, {recursive: true});
const batches = 250;
const results = rfcScenarios.flatMap(name => [false, true].map(enabled => runRfcScenario(name, enabled, batches)));
const report = {description: "Synthetic single-focus RFC; equation (1). No proprietary data or paper-figure reconstruction.",
  seed: "0x1234abcd", batches, stepsPerBatch: 10, fixedCenter: true, fixedContextAnchors: true, results};
await writeFile(join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
let text = "# Single-focus RFC comparison\n\nSynthetic competing-context fixtures; identical initial coordinates, fixed center/context anchors, seeded RNG `0x1234abcd`, 250 batches × 10 integration steps, original adaptive damping. RFC uses spring multiplier 3 and angular stiffness 300. The wide-labels fixture uses coordinate weights (0.25, 1); the other fixtures use (1, 1). Baseline and RFC metrics within each fixture use identical weights. This is a small mechanism check, not a general layout-quality evaluation or a reconstruction of the paper's figures.\n\n| Scenario | Mode | Initial weighted gap RMS (rad) | Final weighted gap RMS (rad) | Physical gap RMS (rad) | Mean final radius |\n| --- | --- | ---: | ---: | ---: | ---: |\n";
for (const result of results)
  text += `| ${result.name} | ${result.reinforced ? "RFC" : "TouchGraph"} | ${result.initial.angularGapRms.toFixed(4)} | ${result.final.angularGapRms.toFixed(4)} | ${result.final.physicalAngularGapRms.toFixed(4)} | ${result.final.meanRadius.toFixed(2)} |\n`;
text += "\nLower weighted gap RMS means more even angles in the configured metric; equal weighted angles do not mean equal physical angles on an ellipse. Physical angle error is reported separately. These metrics do not measure label overlap, crossings, context quality or convergence. Fixed anchors keep the competing context reproducible. Stronger radial springs also contract the focal branches, so radius is reported alongside angle error. Disabling RFC keeps the current positions and momentum.\n\n`results.json` records all final coordinates, unchanged semantic endpoints/lengths, settings and ten-batch metric traces. The three `*.fm.yaml` files contain the initial graphs with embedded types. Open one in the browser, select **Focal project**, expand **Reinforcement Focus + Context** and choose **Reinforce selected node**. For wide-labels, set Horizontal coordinate weight to **0.25** and Vertical coordinate weight to **1** first; for the other fixtures use **1** for both. RFC settings are transient and are not restored from these native graph files. Reload the same file for fresh initial coordinates; disable RFC for the baseline. Only synthetic data is used.\n\nRegenerate from the repository root with `just rfc-experiment`; plot with `just rfc-plot` (Python with matplotlib required). The optional `comparison.svg` shows physical positions with identical axes within each fixture and weighted angle-error traces, without viewing-lens or canvas transformations.\n";
await writeFile(join(output, "README.md"), text);
for (const name of rfcScenarios) {
  const {graph, layout, rfc} = rfcFixture(name);
  const document = new FreshmindDocument(new TypeRegistry(freshmind2014Configuration), graph);
  document.title = `RFC ${name} (synthetic)`;
  document.view = {focus: "center", radius: 2, wholeGraph: true, lenses: {zoom: 1, hyperbolic: 0, rotation: 0}, canvas: {zoom: 1}};
  await writeFile(join(output, `${name}.fm.yaml`), serializeDocument(document, {includeLayout: true}));
  rfc.destroy(); layout.stop();
}
console.log(`Wrote repeatable RFC report and ${rfcScenarios.length} synthetic initial graphs to ${output}`);
