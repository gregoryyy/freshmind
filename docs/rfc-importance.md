# RFC node and relation importance

Node and relation `weight` now control the stiffness of added RFC constraints, alongside their existing visual uses. Coordinate weights still describe the x/y metric. These are separate quantities. Ordinary TouchGraph attraction, repulsion, mass, retained momentum and integration rules are unchanged.

This is an explicit Freshmind 4 extension. The Java prototype has visual weights and commented-out force experiments, rather than a completed force-weighting contract to port. The bounded mapping below is not claimed as an equation from the 2005 paper.

## Normalization and forces

For a nonnegative finite model weight `w` with default `d`, use `s(w; d) = 2w / (w + d)`. Node default is **1**; relation default is **10**. Both defaults give exactly one, zero gives zero, and arbitrarily large weights approach two. Floating-point rounding can attain two. The implementation divides before multiplying to avoid overflow.

For a relation `e = (u, v)`, the symmetric coefficient is:

`q(e) = sqrt(s(u; 1)) · sqrt(s(v; 1)) · s(e; 10)`

It is bounded by four. Both added attraction and the target-length spring are multiplied by `q(e)`. At default weights, the existing numerical path is unchanged. Importance changes stiffness, not physical spring length or the target RFC radius. No endpoint becomes heavier or more repulsive.

For cyclic neighboring branches `i` and `j`, multiply their angular moment by `sqrt(q(i)) · sqrt(q(j))`. Existing division by shared ownership remains. Thus positive weights change how strongly each constraint resists competing context; target gaps remain equal among eligible branches. These constant-in-position factors also multiply the corresponding radial/angular potentials, preserving their physical energy-gradient interpretation outside the existing soft core and locality-mobility adaptations.

The mapping deliberately saturates. For example, relation weight 30 gives factor 1.5 when both endpoint weights are one. Raising one endpoint to weight nine adds factor `sqrt(1.8)`. Raising node weight nine does not multiply a force by nine. Bounding coefficients limits weight-induced stiffness growth; it does not guarantee stability of the coupled layout.

## Zeros, membership and parallel relations

- A zero node disables added incident star/tree constraints. A zero relation disables its added RFC constraint. Ordinary semantic graph forces continue; nothing is deleted or reweighted in TouchGraph.
- Zero-strength branches do not enter angular ordering or degree counts. There is no residual moment on a disabled endpoint from an adjacent angular pair. Nonzero descendants of a stored tree can still reinforce their own eligible neighborhoods if an intermediate node has zero weight.
- Zero is a discrete exclusion: a small positive weight still occupies an angular branch and a DAG slot. Crossing to or from zero can therefore change the remaining angular targets abruptly, like a locality change. DAG rank/slot geometry itself remains fixed by the full definition.
- Stored membership definitions retain all IDs. The visible reinforcement projection and yellow halos omit disabled relations and members with no eligible contribution, apart from the positive focal root itself. These nodes/relations remain visible graph context. Experimental damping excludes zero-contribution nodes, so it cannot attenuate their ordinary impulses through a disabled RFC constraint.
- One-hop and local angular stars choose the lowest stable ID among eligible parallel/reciprocal relations. Zero-strength candidates are skipped. Importance is not summed across duplicates. The ordinary layout still simulates every semantic relation. Stored trees retain their explicitly selected relation IDs; no alternative relation is silently substituted into a saved tree.
- Shared tree edges are reinforced once across centers. Shared angular/target normalization counts contributing projections, avoiding extra ownership from an entirely disabled contribution.

## DAG templates

DAG ranks and slots remain derived from the complete stored topology. Zeros do not rerank the graph or close the slot occupied by a disabled member.

A root-relative target spring for member `v` is scaled by `sqrt(s(root; 1))` times the **mean `q(e)` of all selected incoming relations to `v`**, including zero terms. Thus disabling one of two equal incoming relations halves its template stiffness; disabling all removes that target spring. Parent-node importance participates through `q(e)`. The coefficient is bounded by `4 sqrt(2)`. Opposite reaction remains on the root.

Incoming weights come from the complete selected definition, like its ranks. Hiding a parent does not silently discard its contribution to a still-visible descendant's target. Selected semantic-relation attraction uses the relation coefficient independently. The template remains a prototype, with no crossing or label-overlap guarantee.

## Clusters

First-class clusters use the same `q(e)` for internal relation reinforcement, normalized by eligible endpoint degree. Their compactness term uses node importance directly for the weighted centroid and boundary stiffness. A zero node leaves both terms; a zero relation disables its link contribution while positive endpoint members can still participate in compactness. Parallel/reciprocal selected links all participate with degree normalization, rather than star canonicalization. The activation representative has no special force role. See the [cluster force contract](rfc-clusters.md) for the potentials, centroid reaction, shared constraints and soft extent.

## Use and verification

Edit **Weight** in the main inspector. Saving validates the value, wakes the layout and redraws it. Model setters are also read live by RFC without rebuilding topology. After a direct programmatic change on a cooled layout, call `panel.resetDamper()` and `panel.repaintAfterMove()`, as with other direct model edits.

```ts
node.setWeight(9);
relation.setWeight(30);
panel.resetDamper();
panel.repaintAfterMove();
```

`rfcNodeImportance()`, `rfcEdgeImportance()` and `rfcRelationStrength()` are exported through `fm4/fm/rfc` and the Freshmind core. Plain TouchGraph objects without importance fields have unit coefficients. The existing node/relation weight fields are retained; no graph-format version change is required. Display encoding is configured independently below. Clustering's explicit raw relation-weight option remains a separate projection policy.

Load **RFC → Weighted tree** to inspect a saved tree with node importance nine, relation importance thirty, a zero node and a zero relation. Choose **Substructures → Weighted tree → Reinforce substructure** to activate its deeper membership. Regenerate the substructure examples with `just substructure-examples`. The example retains seven semantic nodes, six relations and the complete saved tree while four relations and five nodes receive RFC halos.

The regressions verify finite bounds, symmetry/defaults, analytical scaling, numerical physical energy gradients under anisotropy/shared ownership, zero impulses, multigraph selection, shared-edge deduplication, DAG templates/hiding, browser editing and inactive-RFC equivalence. Existing single-focus, stiffness-sweep, adaptive-damping and 120 multi-focus records remain separate and unchanged at default importance. [Experiment G](experiments/rfc-followup/weights/README.md) adds 300 matched runs covering nonuniform importance, saturation, zero/epsilon eligibility, identical-wake controls and common versus weighted geometric errors. Its numerical findings do not establish perceptual readability or general convergence.

## Importance and optional region exclusion

Zero-importance members do not define [exclusion regions](rfc-exclusion.md); they remain context and can receive that independent environmental force when exclusion is enabled. This does not restore their disabled incident tree/DAG/cluster constraints. Experimental damping then also watches nearby context candidates, including zero-importance nodes inside that watch envelope. With exclusion off, the earlier zero-contribution/damping behavior and all recorded importance comparisons remain unchanged.

## Node importance display

Task **3.2.18** adds bounded body and label scaling. Default weight 1 has exactly the original dimensions. Weight 0 remains a smaller visible node; higher weights enlarge the body and glyphs together without changing labels, colors, stroke widths, shape categories or physical coordinates. Yellow RFC halos continue to indicate membership, independently of this display mode. Optional exact values sit above the bodies in a separate noninteractive layer, outside focus and hit bounds; accessible names/tooltips always include the weight.

For the size mode, evaluate `q = 2 · (w / (w + 1))` without overflowing `2w`, and map it to a **linear** draw-size scale:

- `q ≤ 1`: `scale = minScale + (1 − minScale) q`.
- `q > 1`: `scale = 1 + (maxScale − 1) (q − 1)`.

| Node weight | Default linear scale |
| --- | --- |
| 0 | 0.85 |
| 0.25 | 0.91 |
| 1 | 1.00 |
| 9 | 1.40 |
| Very large finite weight | Approaches 1.50 |

This is a perceptual tuning choice, not a recovered Java equation or a proportional-area encoding. Body area scales quadratically with this factor. It is also distinct from RFC's force multiplier, despite sharing a convenient bounded normalization. The factor stays finite for the largest finite model weight. Default bounds are 0.85–1.5; validated custom bounds are 0.5–1 for `minScale` and 1–3 for `maxScale`. Bounds straddle one by construction, including through partial inheritance.

Configure the visual in the canonical `config/fm2014.types.yaml`, a companion/embedded type profile, named inherited visuals, per-item visual overrides or interaction styles:

```yaml
nodeVisuals:
  default:
    importance: {mode: size, minScale: 0.85, maxScale: 1.5}
  person:
    extends: default
    importance: {maxScale: 1.8}
```

Modes are `size`, `none` (uniform body/text with no importance halo) and `legacy`. Legacy keeps uniform bodies and the old colored halo when `halo.enabled` is true: width factor `sqrt(max(w,10)/10)` and height factor `max(w,10)/10`, with the ratio capped at 1000 to keep very large valid weights finite. The halo is a decorative sibling, not the yellow reinforcement glow. Existing profiles without `importance` resolve to the new size default; choose Legacy halo to recover the former presentation. The graph/type format remains version 1 with additive optional style fields.

The renderer measures intrinsic untransformed text before applying the scale, avoiding transform-dependent text-width hinting. Cached measurements include shape, font, wrapping, padding, scale and font-loading state. Actual scaled dimensions drive node picking, focus outlines, edge clipping/loops, hidden/aggregation counts, cluster enclosures and RFC silhouette halos. Viewing lenses and canvas transforms still have their usual independent owners. Label wrapping uses its original intrinsic width; its displayed width scales with the glyphs. This does not add body-aware physical forces or label-clearance guarantees.

In the main browser, open **View → Node importance**. **Importance display** can use the configured type/item style, force body/label size, use uniform size or select the legacy halo. **Show node weight values** adds exact values. Try **Load example → RFC → Weighted tree** and edit weights in the inspector: the zero node stays visible, while the weight-nine node is larger. Default-weight nodes in other graphs intentionally retain equal size. Optional readouts can help compare nodes whose labels have different intrinsic lengths; size alone is not an exact weight readout.

```ts
panel.configureNodeImportance({mode: "configured", showValues: true});
panel.configureNodeImportance({mode: "none"});
console.log(panel.getNodeImportance()); // detached transient preferences
```

`FreshmindPanel` accepts `nodeImportance` constructor options. `bindNodeImportanceControls()` from `fm4/fm/ui` binds caller-owned elements and returns a disposer; programmatic preferences synchronize through graph/view notifications. Preferences persist across document changes but remain outside native saved view data. Configured styles/item overrides and model weights do round-trip in YAML. Repainting a display preference leaves the damper, point-based ordinary forces and RFC force settings/impulses unchanged. There is no additional animation, layout step, mass, repulsion or force weight from displaying size.

Five new core checks cover finite/monotone bounds, exact default identity, invalid values, type/item/state inheritance, old-profile fallback, atomic/copied preferences, unchanged forces/coordinates/damper and native round trips. Three Chrome checks cover body/glyph scaling and readouts, real weight editing, focus/picking/curve geometry, lens composition, uniform/legacy modes, finite legacy extremes and reusable control disposal. The earlier scientific comparisons remain unchanged; this is functional presentation work rather than a new readability experiment.
