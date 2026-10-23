# Single-focus RFC comparison

Synthetic competing-context fixtures; identical initial coordinates, fixed center/context anchors, seeded RNG `0x1234abcd`, 250 batches × 10 integration steps, original adaptive damping. RFC uses spring multiplier 3 and angular stiffness 300. The wide-labels fixture uses coordinate weights (0.25, 1); the other fixtures use (1, 1). Baseline and RFC metrics within each fixture use identical weights. This is a small mechanism check, not a general layout-quality evaluation or a reconstruction of the paper's figures.

| Scenario | Mode | Initial weighted gap RMS (rad) | Final weighted gap RMS (rad) | Physical gap RMS (rad) | Mean final radius |
| --- | --- | ---: | ---: | ---: | ---: |
| crowded-star | TouchGraph | 0.8579 | 1.1308 | 1.1308 | 134.92 |
| crowded-star | RFC | 0.8579 | 0.2793 | 0.2793 | 78.01 |
| unequal-radii | TouchGraph | 0.8579 | 1.2774 | 1.2774 | 138.35 |
| unequal-radii | RFC | 0.8579 | 0.2903 | 0.2903 | 84.34 |
| wide-labels | TouchGraph | 0.8579 | 1.5182 | 1.8056 | 203.97 |
| wide-labels | RFC | 0.8579 | 1.3571 | 1.6448 | 179.73 |

Lower weighted gap RMS means more even angles in the configured metric; equal weighted angles do not mean equal physical angles on an ellipse. Physical angle error is reported separately. These metrics do not measure label overlap, crossings, context quality or convergence. Fixed anchors keep the competing context reproducible. Stronger radial springs also contract the focal branches, so radius is reported alongside angle error. Disabling RFC keeps the current positions and momentum.

`results.json` records all final coordinates, unchanged semantic endpoints/lengths, settings and ten-batch metric traces. The three `*.fm.yaml` files contain the initial graphs with embedded types. Open one in the browser, select **Focal project**, expand **Reinforcement Focus + Context** and choose **Reinforce selected node**. For wide-labels, set Horizontal coordinate weight to **0.25** and Vertical coordinate weight to **1** first; for the other fixtures use **1** for both. RFC settings are transient and are not restored from these native graph files. Reload the same file for fresh initial coordinates; disable RFC for the baseline. Only synthetic data is used.

Regenerate from the repository root with `just rfc-experiment`; plot with `just rfc-plot` (Python with matplotlib required). The optional `comparison.svg` shows physical positions with identical axes within each fixture and weighted angle-error traces, without viewing-lens or canvas transformations.
