# RFC focal-region and overlap exclusion

This optional extension implements the vertex-exclusion policy described on page 3 of the [2005 paper](literature/rfc@3ia05compact.pdf). The paper proposes additional repulsion from an elliptical focal region, exempts focal nodes from ordinary context repulsion, and excludes non-shared vertices from intersecting focal regions. It does not specify an ellipse-fitting algorithm, force constant, distance solver or integration rule. The choices below are explicit Freshmind 4 reconstruction/extension decisions. Ordinary TouchGraph attraction, repulsion, momentum and integration remain unchanged.

## Geometry and membership

An implicit one-hop star uses its focal root as center. A stored tree, DAG or cluster uses the importance-weighted centroid of its eligible visible members. This extends the star primitive to whole substructures without treating a cluster representative as a physical anchor. Let `sᵢ = 2wᵢ/(wᵢ+1)` and `αᵢ = sᵢ/Σs`; stored centers are `c = Σαᵢxᵢ`. Implicit stars instead have one root anchor of fraction one.

For the existing coordinate metric `W = diag(λx,λy)`, fit

`R = padding + maxᵢ sqrt(λx(xᵢ−cx)² + λy(yᵢ−cy)²)`.

The physical exclusion ellipse has center `c` and semiaxes `R/sqrt(λx)` and `R/sqrt(λy)`. Every eligible member center lies inside it. Even a singleton reserves its positive padding. Zero-importance members do not define the region; they remain context and can receive exclusion forces from other reinforced members. Hidden members are omitted, and a hidden activation root suspends its region as it suspends its other constraints. Region IDs distinguish implicit stars from stored definitions.

This fits point centers, not node bodies, labels, arrows or routed edges. A large/deep structure can reserve considerable empty space. Weighted padding is not a fixed screen-pixel margin. The ellipse differs from the displayed rounded convex cluster enclosure; those remain separate visual/physical concepts.

## Context and intersecting foci

- A node outside all focal memberships is excluded from the union of active regions.
- With overlap exclusion off, every focal member is exempt from ordinary context exclusion, including a member inside another focus's region.
- With overlap exclusion on, a focal member is excluded only from regions to which it does not belong. Shared members remain exempt from their own regions.

Each fitted region contains its own members. Consequently, a member inside a foreign region is in an intersection with its own region. Exiting the foreign region implements the paper's non-shared intersection policy. Trying to exit its own frozen region would be ineffective when that region is fitted around the member again. A node shared by A and B remains exempt from both, but can be excluded from a third, foreign region C. The policy does not require ellipses themselves to become disjoint; shared-membership intersections remain legitimate.

## One escape force instead of opposing sums

Independent pushes from two ellipses can cancel on their centerline. The implementation therefore chooses one escape from the union of all applicable foreign regions.

In weighted coordinates each ellipse is a circle. For each candidate ray, solve its circle entry/exit intervals and merge the connected interval containing the node. Include regions entered later along the ray: leaving an initially containing ellipse is insufficient if that endpoint lies inside another ellipse. The limiting exit identifies the region or tied regions that receive the reaction.

Candidates are sixteen ID-rotated weighted directions, four coordinate axes, and outward rays for containing regions. The shortest sampled escape in physical units wins. ID rotation resolves center/tie cases without consuming TG's coincidence RNG. This is a deterministic approximation, not an exact nearest-ellipse/union boundary solver. All regions share the controller's metric; mixed metrics are rejected by the standalone escape helper.

Let `v` be the physical escape vector, `d=|v|`, global layout rigidity `q`, strength `k` and focal length `L`. The additional impulse is

`F = q k d/(1+d/L) · v/d`.

It tends to zero at the boundary and, for nonnegative rigidity, has magnitude below `q k L`. There is no singular inverse-distance force at the center. Each intruder receives one impulse. Its opposite reaction is distributed over the limiting region's root or centroid anchors; tied regions share the reaction, and shared anchors are combined before application. Equal mobility conserves total added impulse. Different established/newly-local mobility follows the existing TG rule and can make the applied reactions unequal, just as for other RFC constraints. Fixed/dragged nodes retain their positions through TG integration.

The fit is frozen within a force evaluation, then recomputed at the next callback. Radius/maximum-member derivatives are omitted. The dynamic force is therefore not claimed as a conservative energy gradient. Direction choices, changing extent, context forces and inherited cooling can still cause motion or residual penetration. It is a soft exclusion force, not a collision solver or guaranteed empty region. Shared members may receive centroid reactions from forces on other nodes despite their direct exemption.

## API and controls

```ts
const rfc = panel.getRfc();
rfc.configureExclusion({enabled: true, overlap: true, strength: 0.25, padding: 20});
console.log(rfc.getState().exclusionSettings, rfc.getState().regions);
```

Defaults are `enabled: false`, `overlap: true`, `strength: 0.25`, `padding: 20`. Strength accepts 0–2; padding accepts 1–200 weighted units. Zero strength keeps the inspection boundaries but contributes no force or additional damping participants. `configureExclusion()` validates atomically, wakes the layout, publishes detached snapshots and preserves historical tree/cluster settings and presets. A standalone controller accepts these options as its optional fourth constructor argument; panels accept `rfcExclusion`.

The reusable `bindRfcControls()` supports optional `excludeContext`, `excludeOverlap`, `exclusionStrength` and `exclusionPadding` elements. The main browser exposes them in **RFC → Focal regions**, alongside **RFC → Focal-region exclusion** in the examples menu. Disposing a binding removes only its own listeners. Exclusion settings/activation remain transient and are not added to the YAML format.

Dashed, noninteractive paths show physical exclusion ellipses through the current focus/context, graph-spacing, hyperbolic, rotation and origin lenses. Canvas pan/scale transforms the whole scene. The renderer samples each physical ellipse with 96 segments; a screen-space ellipse would be wrong under nonlinear lenses. Disabling exclusion, removing all centers or hiding their roots removes those paths without changing graph data.

## Optional damping

Exclusion impulses are accumulated before the existing optional stabilizer. Its participant union includes focal members and nearby candidate intruders. A conservative watch margin of 90 physical units, expressed as weighted clearance `< 90 sqrt(max(λx,λy))`, keeps context nodes observable through ordinary boundary crossings instead of dropping their motion history on every in/out step. This envelope may include additional points under anisotropy. During detected episodes, nearby context's accumulated ordinary impulses can consequently be attenuated too. Distant context remains outside that local participant set.

The experimental detector remains off by default and does not change configured exclusion strength. Entering/leaving the wider watch envelope or changing membership still changes the observation set; this is not a general stability guarantee. The regression with fixed focal members and a context node reversing across the boundary verifies that such intruder motion is monitored independently of focal movement.

## Evaluation

[Experiment I](experiments/rfc-exclusion/README.md) records 100 runs over four synthetic cases, five starts and five activation/exclusion modes. It separates movable context, non-shared focal members and pinned intruders; reports region size and common link error; and includes actual per-integration exposure, startup impulses, motion and final force balance. Default exclusion reduces context penetration in these cases. Increasing strength does not uniformly improve the coupled result. RFC alone already clears final non-shared overlap in these starts, so the added overlap policy has direct force/regression checks and transient observations, rather than demonstrated final-quality gains on those fixtures.

The earlier experiments replay unchanged with exclusion disabled. Hybrid structural filtering, shape-aware label collision, exact union distances, broader overlap studies and alternative integration remain separate work.
