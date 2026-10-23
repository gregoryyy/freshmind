# Multiple tree foci: experiments C–E

Three controlled topology families, five perturbed starting layouts, movable/pinned roots and four activation modes produce **120 runs**. All use 250 batches × 10 steps, the default tree preset (length 120, radial stiffness 1, angular stiffness 10000, attraction multiplier 1), the original TouchGraph damper, unit coordinate weights and **no experimental adaptive RFC damping**. The same seed gives identical initial coordinates across activation and root-fixing conditions. No proprietary data is used.

## Topologies

- **C — joined-trees:** two disjoint seven-node, depth-two trees, joined by one ordinary root-to-root context edge. The complete graph is a tree (14 nodes, 13 relations).
- **D — leaf-connected-trees:** the same graph plus four ordinary leaf links: one within each tree and two between trees (14 nodes, 17 relations). Each RFC definition remains a tree.
- **E — shared-subtree:** two seven-member trees share an intermediate branch and its two leaves (11 unique nodes, 10 unique relations). The complete graph is a tree. The shared branch has degree three in either definition and degree four in their union.

**baseline**, **left**, **right** and **both** activate neither tree, the left tree, the right tree or both. Extra leaf/context edges participate in the ordinary embedding throughout, but never become RFC constraints. Sharing is handled by the existing controller: radial edges are deduplicated and shared angular neighborhoods are merged/attenuated. No overlap exclusion or graph aggregation is introduced.

## Final errors across starting layouts

Values are means of five runs, not confidence intervals. Length error is in physical layout units; angular RMS is in radians. Each tree is measured independently, including all deeper branch vertices, even while inactive. Shared-tree angular targets can conflict with the merged neighborhood used for reinforcement. `results.json` retains per-run coordinates, settings, per-tree results, min/max summaries and traces.

| Topology | Roots | Active foci | Left angle | Right angle | Union angle | Union length | Tail step RMS (mean [min, max]) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| joined-trees | movable | baseline | 0.8610 | 0.8611 | 0.8610 | 43.36 | 0.0000 [0.0000, 0.0000] |
| joined-trees | movable | left | 0.0134 | 0.9751 | 0.6896 | 36.69 | 0.0010 [0.0000, 0.0025] |
| joined-trees | movable | right | 0.9750 | 0.0136 | 0.6895 | 36.67 | 0.0004 [0.0000, 0.0022] |
| joined-trees | movable | both | 0.0254 | 0.0253 | 0.0254 | 2.42 | 0.0636 [0.0000, 0.1446] |
| joined-trees | pinned | baseline | 0.7410 | 0.7410 | 0.7410 | 35.65 | 0.0000 [0.0000, 0.0001] |
| joined-trees | pinned | left | 0.0095 | 0.8044 | 0.5688 | 29.84 | 0.0024 [0.0010, 0.0041] |
| joined-trees | pinned | right | 0.8089 | 0.0095 | 0.5720 | 29.98 | 0.0078 [0.0013, 0.0247] |
| joined-trees | pinned | both | 0.0181 | 0.0181 | 0.0181 | 2.25 | 0.0039 [0.0000, 0.0092] |
| leaf-connected-trees | movable | baseline | 0.6872 | 0.6872 | 0.6872 | 47.72 | 0.0000 [0.0000, 0.0000] |
| leaf-connected-trees | movable | left | 0.0379 | 0.7328 | 0.5189 | 38.52 | 0.0088 [0.0051, 0.0115] |
| leaf-connected-trees | movable | right | 0.7366 | 0.0379 | 0.5215 | 38.58 | 0.0090 [0.0008, 0.0131] |
| leaf-connected-trees | movable | both | 0.1852 | 0.0861 | 0.1466 | 15.97 | 8.4557 [0.0249, 42.0850] |
| leaf-connected-trees | pinned | baseline | 0.6855 | 0.6855 | 0.6855 | 44.12 | 0.0000 [0.0000, 0.0000] |
| leaf-connected-trees | pinned | left | 0.0396 | 0.8372 | 0.5926 | 44.13 | 0.0113 [0.0000, 0.0204] |
| leaf-connected-trees | pinned | right | 0.8415 | 0.0399 | 0.5957 | 44.06 | 0.0128 [0.0020, 0.0247] |
| leaf-connected-trees | pinned | both | 0.0766 | 0.0766 | 0.0766 | 10.81 | 0.0017 [0.0000, 0.0039] |
| shared-subtree | movable | baseline | 0.7714 | 0.7714 | 0.3934 | 39.88 | 0.0000 [0.0000, 0.0000] |
| shared-subtree | movable | left | 0.0035 | 0.9624 | 0.3731 | 34.47 | 0.0046 [0.0000, 0.0072] |
| shared-subtree | movable | right | 0.9629 | 0.0036 | 0.3740 | 34.96 | 0.0038 [0.0000, 0.0066] |
| shared-subtree | movable | both | 0.4707 | 0.4707 | 0.0214 | 3.41 | 0.0039 [0.0004, 0.0073] |
| shared-subtree | pinned | baseline | 0.8545 | 0.8479 | 0.4482 | 50.85 | 0.0140 [0.0013, 0.0280] |
| shared-subtree | pinned | left | 0.0068 | 0.9681 | 0.3800 | 60.06 | 0.0374 [0.0292, 0.0459] |
| shared-subtree | pinned | right | 0.9767 | 0.0498 | 0.3740 | 58.45 | 5.4698 [0.0011, 27.3235] |
| shared-subtree | pinned | both | 0.7325 | 0.7045 | 0.2931 | 48.96 | 7.2094 [0.0000, 36.0468] |

## Interpretation and limits

These experiments test whether several tree constraints coexist, how ordinary leaf links compete with them, and how shared membership changes local targets. They are small mechanism checks. They do not measure human readability, label collision, edge crossing, layout optimality, statistical generalization or large-graph performance. A low motion value can result from inherited cooling while geometric error remains. Pinned/free comparisons change the feasible geometry as well as dynamics. Five starting layouts show sensitivity rather than establish a population estimate. Inspect both per-tree and union measurements; one cannot replace the other for overlapping structures.

In the shared-subtree family the roots connect through two selected edges. Pinned roots farther apart than 240 cannot both be at target distance 120 from the shared branch. With root distance D and ten unique selected edges, union length RMS is at least max(0, D−240)/√20. This bound is retained in the JSON; a residual length error here is partly a feasibility obstruction, not solely a solver failure. Moreover, equal 90° gaps at the merged degree-four shared vertex yield 90°, 90°, 180° gaps in either degree-three tree. A nonzero individual-tree angle error can therefore coexist with a regular union.

The tail motion metric samples actual single integration steps, avoiding the ten-step net-displacement aliasing of the earlier fixed-force experiment. Its reversal diagnostic is a sign check above a threshold, not proof of a periodic oscillation. The added adaptive damping experiment remains separate and off here.

## Load and reproduce

Run `just rfc-multifocus-experiment`; `just rfc-figures` generates Figures 8–11, and `just rfc-paper` regenerates the full paper workflow. JSON records all 120 matched runs. Initial `*.fm.yaml` files embed the visual types and both stored tree definitions. Main-browser **Load example → RFC** offers all three families.

For an interactive run, pause motion before loading. In **Substructures**, choose **Left tree** and **Reinforce substructure**, then **Right tree** and **Reinforce substructure** again (this action adds the stored tree without removing the first). Activate only one for a single-focus condition. Use the Tree structure preset, coordinate weights (1, 1), and leave Experimental adaptive damping off. Files store membership and initial coordinates, not activation or force settings. Roots are initially movable; pin a0 and b0 in the inspector for the pinned control. Resume motion after setting the condition. Browser timing and layout batches need not reproduce the fixed-budget JSON exactly.
