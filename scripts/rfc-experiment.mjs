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
const results = rfcScenarios.flatMap(name => [runRfcScenario(name, false, batches),
  runRfcScenario(name, true, batches, "attraction"), runRfcScenario(name, true, batches, "tree")]);
const movingCenters = rfcScenarios.map(name => runRfcScenario(name, true, batches, "tree", {fixedCenter: false}));
const ablationSettings = {
  angles: {springMultiplier: 1, radialStiffness: 0, angularStiffness: 10000},
  length: {springMultiplier: 1, radialStiffness: 1, angularStiffness: 0},
};
const ablations = rfcScenarios.flatMap(name => Object.entries(ablationSettings).map(([method, settings]) =>
  ({...runRfcScenario(name, true, batches, "tree", {settings}), method})));
const oscillations = [{radialStiffness:1,rigidity:1},{radialStiffness:2,rigidity:1},{radialStiffness:2,rigidity:.25}]
  .map(({radialStiffness,rigidity}) => runRfcScenario("crowded-star",true,batches,"tree",{fixedCenter:false,rigidity,settings:{radialStiffness}}));
const report = {description: "Synthetic single-focus RFC: baseline, attraction reinforcement and length-constrained tree. No proprietary data or paper-figure reconstruction.",
  seed: "0x1234abcd", batches, stepsPerBatch: 10, fixedContextAnchors: true, results, movingCenters, ablations, oscillations};
await writeFile(join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
const sweep = [];
for (const name of rfcScenarios) for (const radialStiffness of [.25, .5, 1, 2]) for (const angularStiffness of [300, 3000, 10000, 30000]) {
  const result = runRfcScenario(name, true, batches, "tree", {settings: {radialStiffness, angularStiffness}});
  sweep.push({name, settings: result.settings, final: result.final, lastBatchMaxDisplacement: result.lastBatchMaxDisplacement});
}
await writeFile(join(output, "stiffness-sweep.json"), JSON.stringify({seed: report.seed, batches, fixedCenter: true, fixedContextAnchors: true, results: sweep}, null, 2) + "\n");
const labels = {baseline: "TouchGraph", attraction: "Attraction RFC", tree: "Tree RFC"};
let text = "# Single-focus RFC comparison\n\nSynthetic competing-context fixtures; identical initial coordinates, seeded RNG `0x1234abcd`, 250 batches × 10 integration steps, original adaptive damping. The main comparison fixes center/context anchors. A second check allows the focal center to move. The wide-labels fixture uses coordinate weights (0.25, 1); the others use (1, 1). All modes within a fixture use the same metric. These are mechanism checks, not a general layout-quality evaluation or a reconstruction of the paper's figures.\n\nThe attraction preset retains the checkpoint's multiplier 3 and angular stiffness 300, with no target-length force. The default tree preset uses multiplier 1, radial stiffness 1, target weighted length 120 and angular stiffness 10000. The new spring resists compression as well as extension; increasing the old attraction multiplier alone shrinks branches.\n\n| Scenario | Mode | Weighted gap RMS (rad) | Target-length RMS | Physical gap RMS (rad) | Mean physical radius |\n| --- | --- | ---: | ---: | ---: | ---: |\n";
for (const result of results)
  text += `| ${result.name} | ${labels[result.profile]} | ${result.final.angularGapRms.toFixed(4)} | ${result.final.radialLengthRms.toFixed(2)} | ${result.final.physicalAngularGapRms.toFixed(4)} | ${result.final.meanRadius.toFixed(2)} |\n`;
text += "\nTarget-length RMS measures weighted center-to-branch distance against 120. Physical angle error is reported separately because equal weighted angles form an ellipse. The compact fixtures improve both angular and length errors substantially. In wide-labels, spreading branches around the center improves angles but exposes more competition with fixed context anchors: its length error can exceed the tightly bunched attraction-only layout. The report retains that tradeoff. These metrics do not measure label overlap, crossings or general convergence.\n\n## Varying stiffness\n\n`stiffness-sweep.json` records 48 runs: radial stiffness 0.25, 0.5, 1 and 2 crossed with angular stiffness 300, 3000, 10000 and 30000 for each fixture. Target length stays 120 and the attraction multiplier stays 1. Increasing radial stiffness reduces length error at angular stiffness 10000 in all three pinned fixtures. Higher angular stiffness can further regularize gaps, but a stiff fixed-center result does not establish stability with a movable center.\n\n## Movable focal centers\n\n| Scenario | Weighted gap RMS (rad) | Target-length RMS | Maximum displacement in final batch |\n| --- | ---: | ---: | ---: |\n";
for (const result of movingCenters) text += `| ${result.name} | ${result.final.angularGapRms.toFixed(4)} | ${result.final.radialLengthRms.toFixed(2)} | ${result.lastBatchMaxDisplacement.toFixed(4)} |\n`;
text += "\nThe center can translate or rotate toward competing context. The default avoids the stiffest tested settings; remaining movement is reported rather than treated as a converged layout. Fixed/dragged node rules and the existing TouchGraph damping/integration still apply.\n\n## Load and reproduce\n\n`results.json` records complete coordinates, unchanged semantic endpoints/lengths, force settings and metric traces. The three `*.fm.yaml` files contain initial graphs with embedded types. Open one, select **Focal project**, expand **Reinforcement Focus + Context**, choose **Tree structure** or **Attraction only**, then **Reinforce selected node**. Adjust **Target focal length**, **Radial stiffness** and **Angular stiffness** independently. For wide-labels set Horizontal coordinate weight to **0.25** and Vertical coordinate weight to **1**; use **1** for both otherwise. Presets retain the chosen metric. Reload initial coordinates for each comparison; disable RFC for the baseline. RFC settings remain transient and are not restored from native files. Only synthetic data is used.\n\nRegenerate with `just rfc-experiment`; plot with `just rfc-plot` (Python/matplotlib required). `comparison.svg` shows all three layouts on identical physical axes within each fixture, with angular and length-error traces. No viewing transforms affect the recorded geometry.\n";
text += "\n## Controlled ablations and oscillation\n\n`results.json` also records strong angles alone (multiplier 1, radial stiffness 0, angular stiffness 10000) and length alone (1, 1, 0) on all three fixtures. Compare these with the tree profile to distinguish the effects of stronger angles and an explicit length spring. The lower-error combined profile is not evidence that radial stiffness alone caused all angular improvement.\n\nThree movable-center crowded-star runs compare radial stiffness 1 and 2 at rigidity 1, plus stiffness 2 at rigidity 0.25. Rigidity changes apply after the initial ten-step batch.\n\n| Radial stiffness | Rigidity | Final angle RMS | Final length RMS | Maximum net movement in final batch | Final damper |\n| ---: | ---: | ---: | ---: | ---: | ---: |\n";
for (const run of oscillations) text += `| ${run.settings.radialStiffness} | ${run.rigidity} | ${run.final.angularGapRms.toFixed(5)} | ${run.final.radialLengthRms.toFixed(3)} | ${run.lastBatchMaxDisplacement.toFixed(4)} | ${run.trace.at(-1).damper.toFixed(4)} |\n`;
text += "\nNet movement across a ten-step batch can alias faster oscillations; it is not a per-step velocity or the legacy maxMotion statistic. The [second draft paper](../../papers/rfc-revisited-draft2.md) derives the discrete update's local stability condition, explains the movable-center stiffness increase and discusses damping alternatives. Reproduce its six SVG/PDF/PNG figures with `just rfc-figures` or render the full draft with `just rfc-paper`. No alternative solver or automatic damping is introduced by these experiments.\n";
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
