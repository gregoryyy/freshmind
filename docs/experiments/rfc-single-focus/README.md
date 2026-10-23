# Single-focus RFC comparison

Synthetic competing-context fixtures; identical initial coordinates, seeded RNG `0x1234abcd`, 250 batches × 10 integration steps, original adaptive damping. The main comparison fixes center/context anchors. A second check allows the focal center to move. The wide-labels fixture uses coordinate weights (0.25, 1); the others use (1, 1). All modes within a fixture use the same metric. These are mechanism checks, not a general layout-quality evaluation or a reconstruction of the paper's figures.

The attraction preset retains the checkpoint's multiplier 3 and angular stiffness 300, with no target-length force. The default tree preset uses multiplier 1, radial stiffness 1, target weighted length 120 and angular stiffness 10000. The new spring resists compression as well as extension; increasing the old attraction multiplier alone shrinks branches.

| Scenario | Mode | Weighted gap RMS (rad) | Target-length RMS | Physical gap RMS (rad) | Mean physical radius |
| --- | --- | ---: | ---: | ---: | ---: |
| crowded-star | TouchGraph | 1.1308 | 22.78 | 1.1308 | 134.92 |
| crowded-star | Attraction RFC | 0.2793 | 53.07 | 0.2793 | 78.01 |
| crowded-star | Tree RFC | 0.0309 | 5.56 | 0.0309 | 117.14 |
| unequal-radii | TouchGraph | 1.2774 | 48.92 | 1.2774 | 138.35 |
| unequal-radii | Attraction RFC | 0.2903 | 54.31 | 0.2903 | 84.34 |
| unequal-radii | Tree RFC | 0.0310 | 6.97 | 0.0310 | 116.71 |
| wide-labels | TouchGraph | 1.5182 | 21.07 | 1.8056 | 203.97 |
| wide-labels | Attraction RFC | 1.3571 | 12.13 | 1.6448 | 179.73 |
| wide-labels | Tree RFC | 0.1973 | 27.68 | 0.4700 | 159.20 |

Target-length RMS measures weighted center-to-branch distance against 120. Physical angle error is reported separately because equal weighted angles form an ellipse. The compact fixtures improve both angular and length errors substantially. In wide-labels, spreading branches around the center improves angles but exposes more competition with fixed context anchors: its length error can exceed the tightly bunched attraction-only layout. The report retains that tradeoff. These metrics do not measure label overlap, crossings or general convergence.

## Varying stiffness

`stiffness-sweep.json` records 48 runs: radial stiffness 0.25, 0.5, 1 and 2 crossed with angular stiffness 300, 3000, 10000 and 30000 for each fixture. Target length stays 120 and the attraction multiplier stays 1. Increasing radial stiffness reduces length error at angular stiffness 10000 in all three pinned fixtures. Higher angular stiffness can further regularize gaps, but a stiff fixed-center result does not establish stability with a movable center.

## Movable focal centers

| Scenario | Weighted gap RMS (rad) | Target-length RMS | Maximum displacement in final batch |
| --- | ---: | ---: | ---: |
| crowded-star | 0.0075 | 1.31 | 0.5921 |
| unequal-radii | 0.0079 | 2.85 | 2.5470 |
| wide-labels | 0.0234 | 9.82 | 0.1933 |

The center can translate or rotate toward competing context. The default avoids the stiffest tested settings; remaining movement is reported rather than treated as a converged layout. Fixed/dragged node rules and the existing TouchGraph damping/integration still apply.

## Load and reproduce

`results.json` records complete coordinates, unchanged semantic endpoints/lengths, force settings and metric traces. The three `*.fm.yaml` files contain initial graphs with embedded types. Open one, select **Focal project**, expand **Reinforcement Focus + Context**, choose **Tree structure** or **Attraction only**, then **Reinforce selected node**. Adjust **Target focal length**, **Radial stiffness** and **Angular stiffness** independently. For wide-labels set Horizontal coordinate weight to **0.25** and Vertical coordinate weight to **1**; use **1** for both otherwise. Presets retain the chosen metric. Reload initial coordinates for each comparison; disable RFC for the baseline. RFC settings remain transient and are not restored from native files. Only synthetic data is used.

Regenerate with `just rfc-experiment`; plot with `just rfc-plot` (Python/matplotlib required). `comparison.svg` shows all three layouts on identical physical axes within each fixture, with angular and length-error traces. No viewing transforms affect the recorded geometry.

## Controlled ablations and oscillation

`results.json` also records strong angles alone (multiplier 1, radial stiffness 0, angular stiffness 10000) and length alone (1, 1, 0) on all three fixtures. Compare these with the tree profile to distinguish the effects of stronger angles and an explicit length spring. The lower-error combined profile is not evidence that radial stiffness alone caused all angular improvement.

Three movable-center crowded-star runs compare radial stiffness 1 and 2 at rigidity 1, plus stiffness 2 at rigidity 0.25. Rigidity changes apply after the initial ten-step batch.

| Radial stiffness | Rigidity | Final angle RMS | Final length RMS | Maximum net movement in final batch | Final damper |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 0.00745 | 1.307 | 0.5921 | 0.2605 |
| 2 | 1 | 0.22670 | 33.576 | 29.3014 | 0.9149 |
| 2 | 0.25 | 0.01475 | 0.837 | 0.0229 | 0.7786 |

Net movement across a ten-step batch can alias faster oscillations; it is not a per-step velocity or the legacy maxMotion statistic. The [second draft paper](../../papers/rfc-revisited-draft2.md) derives the discrete update's local stability condition, explains the movable-center stiffness increase and discusses damping alternatives. Reproduce its six SVG/PDF/PNG figures with `just rfc-figures` or render the full draft with `just rfc-paper`. No alternative solver or automatic damping is introduced by these experiments.
