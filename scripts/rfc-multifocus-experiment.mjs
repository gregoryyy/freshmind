/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdir, writeFile} from "node:fs/promises";
import {resolve, join} from "node:path";
import {FreshmindDocument, TypeRegistry, freshmind2014Configuration} from "fm4/fm/core";
import {serializeDocument} from "fm4/fm/io";
import {multiFocusScenarios, multiFocusModes, multiFocusSeeds, multiFocusFixture, runMultiFocus} from "../tests/fixtures/rfc-multifocus.mjs";

if (process.argv.length > 3 || process.argv[2]?.startsWith("-")) throw new Error("Usage: node scripts/rfc-multifocus-experiment.mjs [output-directory]");
const output = resolve(process.argv[2] ?? "docs/experiments/rfc-multifocus");
await mkdir(output, {recursive: true});
const batches = 250, results = [];
for (const name of multiFocusScenarios) for (const fixedRoots of [false, true]) for (const seed of multiFocusSeeds) for (const mode of multiFocusModes)
  results.push(runMultiFocus(name, {fixedRoots, seed, mode, batches}));
const stats = values => ({mean: values.reduce((a, b) => a + b, 0) / values.length, min: Math.min(...values), max: Math.max(...values)});
const summary = [];
for (const name of multiFocusScenarios) for (const fixedRoots of [false, true]) for (const mode of multiFocusModes) {
  const runs = results.filter(r => r.name === name && r.fixedRoots === fixedRoots && r.mode === mode);
  summary.push({name, fixedRoots, mode, runs: runs.length,
    trees: ["a-tree", "b-tree"].map(id => ({id,
      angularGapRms: stats(runs.map(r => r.final.trees.find(t => t.id === id).angularGapRms)),
      radialLengthRms: stats(runs.map(r => r.final.trees.find(t => t.id === id).radialLengthRms))})),
    unionAngularGapRms: stats(runs.map(r => r.final.unionAngularGapRms)), unionLengthRms: stats(runs.map(r => r.final.unionLengthRms)),
    tailStepRms: stats(runs.map(r => r.tailStepRms)), tailStepMax: stats(runs.map(r => r.tailStepMax)),
    rootSeparation: stats(runs.map(r => r.final.rootSeparation)),
    unionLengthLowerBound: runs[0].final.unionLengthLowerBound === null ? null : stats(runs.map(r => r.final.unionLengthLowerBound))});
}
const report = {
  description: "Experiments C–E: multiple stored tree foci, ordinary leaf connections and shared subtrees. Synthetic data only; no DAG templates or new force laws.",
  seeds: multiFocusSeeds, batches, stepsPerBatch: 10, targetLength: 120, coordinateWeights: {x: 1, y: 1}, stabilizationEnabled: false,
  initialJitter: "Uniform [-40, 40) per coordinate, from the seeded LCG. Pinned/free runs retain identical starting coordinates.",
  metrics: {
    angularGapRms: "RMS over all angular gaps at vertices of degree >=2 within each stored tree, including deeper branches. Both trees are scored in every mode.",
    unionAngularGapRms: "Same observable on the deduplicated union of both trees, regardless of activation. At a shared branch, union degree can differ from each individual tree degree.",
    radialLengthRms: "RMS physical endpoint distance minus 120 over selected tree edges; unionLengthRms counts shared edges once.",
    motion: "Final 100 actual integration steps, RMS over movable nodes and steps; maximum also retained. A read-only force callback observes nine steps and repaint observes the tenth in every batch.",
    unionLengthLowerBound: "For a root path with q selected edges among M unique tree edges: max(0, rootSeparation-q*120)/sqrt(q*M). Triangle inequality and Cauchy–Schwarz. Null if no selected root path; a fixed feasibility obstruction only while roots are pinned.",
    reversals: "Fraction of eligible consecutive movable-node displacements whose dot product is negative; both magnitudes must exceed 0.05. Null if no eligible pair. Diagnostic, not an oscillation spectrum."
  },
  summary, results
};
await writeFile(join(output, "results.json"), JSON.stringify(report, null, 2) + "\n");
let text = `# Multiple tree foci: experiments C–E\n\nThree controlled topology families, five perturbed starting layouts, movable/pinned roots and four activation modes produce **${results.length} runs**. All use 250 batches × 10 steps, the default tree preset (length 120, radial stiffness 1, angular stiffness 10000, attraction multiplier 1), the original TouchGraph damper, unit coordinate weights and **no experimental adaptive RFC damping**. The same seed gives identical initial coordinates across activation and root-fixing conditions. No proprietary data is used.\n\n`;
text += "## Topologies\n\n- **C — joined-trees:** two disjoint seven-node, depth-two trees, joined by one ordinary root-to-root context edge. The complete graph is a tree (14 nodes, 13 relations).\n- **D — leaf-connected-trees:** the same graph plus four ordinary leaf links: one within each tree and two between trees (14 nodes, 17 relations). Each RFC definition remains a tree.\n- **E — shared-subtree:** two seven-member trees share an intermediate branch and its two leaves (11 unique nodes, 10 unique relations). The complete graph is a tree. The shared branch has degree three in either definition and degree four in their union.\n\n**baseline**, **left**, **right** and **both** activate neither tree, the left tree, the right tree or both. Extra leaf/context edges participate in the ordinary embedding throughout, but never become RFC constraints. Sharing is handled by the existing controller: radial edges are deduplicated and shared angular neighborhoods are merged/attenuated. No overlap exclusion or graph aggregation is introduced.\n\n";
text += "## Final errors across starting layouts\n\nValues are means of five runs, not confidence intervals. Length error is in physical layout units; angular RMS is in radians. Each tree is measured independently, including all deeper branch vertices, even while inactive. Shared-tree angular targets can conflict with the merged neighborhood used for reinforcement. `results.json` retains per-run coordinates, settings, per-tree results, min/max summaries and traces.\n\n| Topology | Roots | Active foci | Left angle | Right angle | Union angle | Union length | Tail step RMS (mean [min, max]) |\n| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |\n";
for (const r of summary) text += `| ${r.name} | ${r.fixedRoots ? "pinned" : "movable"} | ${r.mode} | ${r.trees[0].angularGapRms.mean.toFixed(4)} | ${r.trees[1].angularGapRms.mean.toFixed(4)} | ${r.unionAngularGapRms.mean.toFixed(4)} | ${r.unionLengthRms.mean.toFixed(2)} | ${r.tailStepRms.mean.toFixed(4)} [${r.tailStepRms.min.toFixed(4)}, ${r.tailStepRms.max.toFixed(4)}] |\n`;
text += "\n## Interpretation and limits\n\nThese experiments test whether several tree constraints coexist, how ordinary leaf links compete with them, and how shared membership changes local targets. They are small mechanism checks. They do not measure human readability, label collision, edge crossing, layout optimality, statistical generalization or large-graph performance. A low motion value can result from inherited cooling while geometric error remains. Pinned/free comparisons change the feasible geometry as well as dynamics. Five starting layouts show sensitivity rather than establish a population estimate. Inspect both per-tree and union measurements; one cannot replace the other for overlapping structures.\n\nIn the shared-subtree family the roots connect through two selected edges. Pinned roots farther apart than 240 cannot both be at target distance 120 from the shared branch. With root distance D and ten unique selected edges, union length RMS is at least max(0, D−240)/√20. This bound is retained in the JSON; a residual length error here is partly a feasibility obstruction, not solely a solver failure. Moreover, equal 90° gaps at the merged degree-four shared vertex yield 90°, 90°, 180° gaps in either degree-three tree. A nonzero individual-tree angle error can therefore coexist with a regular union.\n\nThe tail motion metric samples actual single integration steps, avoiding the ten-step net-displacement aliasing of the earlier fixed-force experiment. Its reversal diagnostic is a sign check above a threshold, not proof of a periodic oscillation. The added adaptive damping experiment remains separate and off here.\n\n## Load and reproduce\n\nRun `just rfc-multifocus-experiment`; `just rfc-figures` generates Figures 8–11, and `just rfc-paper` regenerates the full paper workflow. JSON records all 120 matched runs. Initial `*.fm.yaml` files embed the visual types and both stored tree definitions. Main-browser **Load example → RFC** offers all three families.\n\nFor an interactive run, pause motion before loading. In **Substructures**, choose **Left tree** and **Reinforce substructure**, then **Right tree** and **Reinforce substructure** again (this action adds the stored tree without removing the first). Activate only one for a single-focus condition. Use the Tree structure preset, coordinate weights (1, 1), and leave Experimental adaptive damping off. Files store membership and initial coordinates, not activation or force settings. Roots are initially movable; pin a0 and b0 in the inspector for the pinned control. Resume motion after setting the condition. Browser timing and layout batches need not reproduce the fixed-budget JSON exactly.\n";
text += "\n## Diagrams\n\nThese recorded-data drawings use the first seed for layout panels and matched traces; the final motion plot shows all 120 runs. They retain fixed-force RFC with adaptive local damping off.\n\n![Joined tree foci and error traces](../../papers/figures/rfc/08-joined-trees.svg)\n\n*Paper Figure 8. Neither, one and both tree foci on shared physical axes, with angle/length traces.* [PDF](../../papers/figures/rfc/08-joined-trees.pdf)\n\n![Leaf-connected tree foci and error traces](../../papers/figures/rfc/09-leaf-connected-trees.svg)\n\n*Paper Figure 9. Extra semantic leaf connections compete with the reinforced trees.* [PDF](../../papers/figures/rfc/09-leaf-connected-trees.pdf)\n\n![Shared subtree and error traces](../../papers/figures/rfc/10-shared-subtree.svg)\n\n*Paper Figure 10. Shared membership distinguishes individual-tree and merged-neighborhood errors.* [PDF](../../papers/figures/rfc/10-shared-subtree.pdf)\n\n![Motion across all multiple-focus runs](../../papers/figures/rfc/11-multifocus-motion.svg)\n\n*Paper Figure 11. Per-step tail motion across all seeds/root conditions retains the oscillatory outliers. The [stability follow-up](../rfc-stability/README.md) compares damping on selected starts separately.* [PDF](../../papers/figures/rfc/11-multifocus-motion.pdf)\n";
await writeFile(join(output, "README.md"), text);
for (const name of multiFocusScenarios) {
  const {graph, layout, rfc} = multiFocusFixture(name);
  const document = new FreshmindDocument(new TypeRegistry(freshmind2014Configuration), graph);
  document.title = `RFC ${name} (synthetic, two tree definitions)`;
  document.view = {focus: "a0", radius: 3, wholeGraph: true, lenses: {zoom: 1, hyperbolic: 0, rotation: 0}, canvas: {zoom: .8}};
  await writeFile(join(output, `${name}.fm.yaml`), serializeDocument(document));
  rfc.destroy(); layout.stop();
}
console.log(`Wrote ${results.length} multi-focus runs and three initial tree graphs to ${output}`);
