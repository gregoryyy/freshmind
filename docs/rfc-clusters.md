# Clusters as RFC structures

A cluster is an unordered focal member set, alongside hierarchical trees and DAGs. It stores the same stable node/relation IDs, can overlap other structures, and does not replace semantic adjacency. Its forces live in `src/fm/rfc/clusters.ts`; plain TouchGraph physics remains unchanged.

| Structure | Membership | Added geometry |
| --- | --- | --- |
| Tree | Connected, acyclic selected relations, ignoring direction | Target-length springs and local equal-angle neighborhoods |
| DAG | Root-reachable directed acyclic selected relations | Root-relative ranked template |
| Cluster | Arbitrary members and selected internal relations, including cycles or disconnected members | Internal spring rigidity and soft compactness around a weighted centroid |

Clusters are a new Freshmind 4 extension, not a reconstruction of a cluster force law from the 2005 paper. They preserve community structure rather than projecting every community into a tree.

## Membership, activation and editing

Native YAML uses `kind: cluster`. The existing `rootId` field names a **representative** for navigation, activation and visibility suspension. It has no privileged force role, and changing it does not change the layout equations or pin a node. It must be a member. A hidden representative suspends that activation, matching existing center behavior; hidden ordinary members simply leave the visible projection.

```yaml
substructures:
  - id: community
    label: Community
    kind: cluster
    rootId: a
    nodeIds: [a, b, c]
    edgeIds: [ab, bc, ca]
```

Selected relations must exist and have two distinct member endpoints. Direction does not affect cluster forces; cycles, parallel and reciprocal relations are valid. Self-loops remain ordinary semantic relations. A disconnected cluster is allowed: the compactness term can group manually selected concepts even without internal links. Singleton clusters have no added force.

`clusterStructure(graph, members, representative, id, label)` captures every current internal non-loop relation, including zero-weight relations. Programmatic/YAML definitions may select a subset. Membership is explicit: later semantic links do not silently enter a saved definition. Deleting/reconnecting a selected relation or deleting a member invalidates the definition under the same conservative policy as trees/DAGs. Ordinary boundary-link edits do not invalidate it.

In **Substructures**, choose **Structure kind → Cluster** and create from the visible graph. Adding/removing members rebuilds the current internal relation subset. Renaming and changing the representative retain the selected relation IDs. Changing kind explicitly converts the membership using the destination kind's validation rules; an invalid conversion leaves the saved definition intact.

**Graph clusters → Render cluster with RFC** now accepts a detected community directly as `kind: cluster`. `clusterToSubstructure()` defaults to that behavior. For an intentional tree projection, pass `"tree"` as its final argument after the optional representative:

```ts
import {clusterGraph, clusterToSubstructure} from "fm4/fm/cluster";

const result = clusterGraph(graph);
const cluster = clusterToSubstructure(graph, result, result.clusters[0].id, "community");
graph.setSubstructure(cluster);
panel.getRfc().activateSubstructure(cluster.id, true);

const tree = clusterToSubstructure(graph, result, result.clusters[0].id,
  "community-tree", "Community tree", undefined, "tree");
```

Proposal freshness, clustering scope and the optional raw relation-weight detector policy remain unchanged. Native version 1 accepts the new kind; older readers restricted to tree/DAG kinds will reject it. Existing files need no migration. Activation and force settings remain transient.

## Force contract

Let `sᵢ` be the bounded node importance and `q(e)` the symmetric node/relation coefficient from the [importance contract](rfc-importance.md). Let `W = diag(λx, λy)`, target focal length `L`, radial stiffness `k`, cluster rigidity `g`, and layout rigidity `r`.

### Internal relations

Each eligible visible selected relation receives a one-sided length constraint. With endpoint displacement `v`, `D² = vᵀWv`, `ρ = sqrt(D² + 1)` and `h(e)` the larger eligible relation count at its endpoints, its potential is:

`E_link(e) = k r q(e) / (2 h(e)) · max(0, ρ − L)²`.

This cap pulls an overly long link toward `L` and does not expand a short one. A separate two-sided spring adds rigidity about each semantic spring length, scaled with focal length:

`L_e = edge.getLength() · L / 120`,

`E_rigid(e) = g r q(e) / (2 h(e)) · (ρ − L_e)²`.

The **Cluster rigidity** control sets `g` in 0–2, default **1**. It resists both stretching and compression; zero restores the earlier soft grouping behavior. Different semantic spring lengths retain their proportions. Members remain movable and the group can translate, rotate and deform; this is spring rigidity rather than a rigid-body constraint. Sparse subgraphs can still hinge, and dense/cyclic length targets can be mutually incompatible. Ordinary TouchGraph repulsion remains active. The attraction-multiplier control also adds the existing `D³` attraction potential, scaled by `q(e)/h(e)`. Degree normalization includes positive parallel/reciprocal relations; all explicitly selected links participate rather than choosing a single canonical star relation. The normalization limits added stiffness in dense groups. It does not guarantee stability under every metric, multiplier or coupled structure.

Across active clusters, a shared semantic relation is applied once, using the largest endpoint degree from its participating cluster projections. Shared attraction with a tree/DAG is applied once through the existing hierarchical path. A tree's two-sided length constraint takes precedence over both cluster length terms on a shared edge. Distinct parallel semantic relations remain distinct constraints. Boundary relations receive no added cluster force.

### Weighted centroid and soft extent

Use the visible positive-importance members, independently of their incident link weights. For `n` such members:

`c = Σ sᵢ pᵢ / Σ sᵢ`, `R = L sqrt(n)/2`, and `Dᵢ² = (pᵢ − c)ᵀ W (pᵢ − c)`.

The compactness potential is:

`E_group = k r / (8 m) · Σ sᵢ max(0, Dᵢ − R)²`,

where `m` is the largest contributing structure-ownership count among the members. Its quarter-strength coefficient gives a soft extent without forcing every member onto a circle. Nodes inside it have no direct boundary pull; they can still receive the reaction to an outlying member. The centroid moves with the nodes, and differentiation distributes this reaction by `sᵢ / Σ sᵢ`. With identical locality flags, total added impulse is zero. Fixed nodes and the inherited locality-mobility adaptation can prevent the corresponding actual motion from balancing, as in other RFC constraints.

The implementation evaluates the centroid and its reaction in linear time, including TouchGraph's established/newly-local weighting. Identical overlapping memberships divide their group term by shared ownership, avoiding doubled compactness. Different overlapping memberships may have competing centroids; this is a compromise, not geometric overlap exclusion.

`R` is a soft target derived from visible membership count, not a measured enclosure or a hard collision boundary. Hiding a positive member or changing its weight to zero can change both `c` and `R`. Positive importance affects the centroid and stiffness; it does not assign physical mass or change the count-based radius. Coordinate weights turn the target region into an ellipse in physical space.

### Controls, zeros and presentation

- **Target focal length** controls the internal-link cap and count-scaled soft extent.
- **Radial stiffness** controls link caps and compactness; zero disables both. Additional attraction and cluster rigidity remain independent.
- **Cluster rigidity** controls two-sided internal springs. Call `rfc.configureClusters({rigidity: 0.7})`; `getState().clusterSettings` returns a detached snapshot. This separate contract leaves star/tree settings and their recorded experiment metadata unchanged. Tree/attraction presets retain cluster rigidity. It remains transient, like other RFC force settings.
- **Angular stiffness** has no effect on clusters. Per-center angular-gap diagnostics are null; there is no branch ordering or ranked template.
- A zero node leaves cluster reinforcement entirely. A zero relation loses its link constraint, while its positive endpoints can still participate in compactness through membership.
- Positive visible members and eligible selected relations receive the existing soft yellow halos, deduplicated across structures. Each active cluster also has a smooth outer boundary and translucent background fill. Ordinary context remains visible and physically connected.
- Experimental damping runs once on the contributing member union, following the existing opt-in policy.

## Smooth displayed boundary

`src/fm/geometry/cluster-boundary.ts` builds a convex hull of displayed node-body boxes and selected internal Bézier control points, then expands it by a 24-unit disk. Straight tangent segments and circular corner arcs form a smooth closed enclosure. Unlike a smoothing spline through hull vertices, this construction does not cut across member bodies. Including curve control points conservatively contains the internal curves. Singleton/coincident/collinear memberships also produce valid paths. The construction is convex and can therefore enclose empty areas or unrelated nodes; arbitrary long edge-label extents are not measured.

The boundary uses the current drawing coordinates, so it follows labels/shapes, dragging, layout motion, graph spacing, rotation and the nonlinear viewing lens. Canvas zoom/pan transforms it with the rest of the scene. The 24-unit padding precedes canvas scaling. Only positive visible RFC members and eligible links enter the hull; a hidden representative removes the boundary until that activation resumes.

The shared Freshmind renderer draws one enclosure per active cluster, below halos and semantic edges/nodes. A stable structure-ID palette distinguishes groups, with 10% fill opacity and a thin partially transparent stroke. Overlap leaves both fills visible. The entire decoration layer is noninteractive and hidden from assistive technology, so graph picking, panning and keyboard navigation retain their existing targets. This is a visual enclosure, not a physical wall: optional [focal-region exclusion](rfc-exclusion.md) fits a separate physical ellipse and applies soft vertex repulsion. The displayed hull is not that force boundary.

## Example and verification

Choose **Load example → Overlapping clusters**, then **Substructures → Research cluster → Reinforce substructure**, followed by **Applications cluster → Reinforce substructure**. The synthetic graph has nine nodes and fifteen relations. Both positive four-node groups retain all six clique links, share one member, and keep two boundary context links outside reinforcement. Research also stores a zero-importance member and its internal relation. The visible union has seven reinforced nodes and twelve reinforced relations. Regenerate with `just substructure-examples`.

Tests cover compression/stretching and restoring targets, independent rigidity controls, a matched external-load deformation check, rounded boundary degeneracies and enclosure under lenses/rotation/canvas scaling, as well as cyclic/disconnected validation, YAML round trips, invalidation, independent finite-difference energy gradients, balanced and locality-adjusted centroid reactions, importance/degree scaling, representative invariance, overlap deduplication, zero/hidden members, dense integration, browser membership editing and actual downloads/reloads. Existing single-focus and 120 multiple-tree experiment records are replayed unchanged.

[Experiment H](experiments/rfc-followup/clusters/README.md) adds 240 matched runs against plain TG and perimeter-tree projections, varying rigidity, shared membership and external load. It records common link error, all-pairs reference deformation, extent, hull intersection, boundary-link error, actual motion and a final undamped force probe. Dense cliques preserve their reference shape better under these cluster constraints; sparse rings can deform more even when reinforced link errors decrease. Eight-condition seed ranges and companion drawings retain these trade-offs. Community-detection quality, human readability, large-graph performance, hard physical separation and browser label collision remain unevaluated. [Experiment I](experiments/rfc-exclusion/README.md) separately measures optional soft ellipse exclusion on synthetic cluster regions.
