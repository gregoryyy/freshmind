# RFC substructures, centers and clustering

Freshmind stores substructure membership with the graph. RFC activation, additional layout constraints and the experimental damper remain transient. A semantic node can belong to several substructures; an active center can use one stored definition at a time. No second graph owns adjacency, and no synthetic semantic relations are inserted.

## Data model and persistence

`FreshGraph.setSubstructure()` validates a complete definition before replacing the stored record. Getters return copies; `getNodeSubstructures(nodeOrId)` derives memberships from the graph owner. References use stable semantic node/relation IDs. Definitions can overlap.

```yaml
substructures:
  - id: project-tree
    label: Project tree
    kind: tree
    rootId: project
    nodeIds: [project, person, document]
    edgeIds: [project-person, person-document]
```

The optional top-level `substructures` sequence extends native version-1 YAML. New readers still accept all existing files; older strict readers may reject files containing the new field. Files without definitions retain their previous record shape. Restoring records alone does not activate stored definitions. The main browser separately applies its current RFC on/off policy to the new initial focus; it does not restore activation from YAML.

A **tree** selects a connected acyclic set of semantic relations, ignoring their direction for the structural hierarchy. It has exactly one fewer selected relation than nodes. Other relations among the members can remain in the graph without becoming structural constraints. A **DAG** uses the selected relations' semantic direction, rejects directed cycles, and requires every member to be reachable from its root. Shared descendants and parallel directed relations are allowed. A **cluster** is unordered membership with arbitrary internal non-loop relations, including cycles and disconnected members. Its `rootId` is an activation/navigation representative, without a hierarchical force role. Self-loops cannot be structural relations, but can remain ordinary graph relations.

Deleting a member or a selected structural relation invalidates and removes the affected definitions; reconnecting a structural relation also invalidates them. Other context relations and locality hiding do not remove definitions. This conservative policy prevents dangling or silently reinterpreted membership. Use the structure editor to change membership atomically before deleting semantic content when retaining the definition matters.

```ts
import {spanningTree} from "fm4/fm/structures";

const graph = panel.getCompleteEltSet();
graph.setSubstructure(spanningTree(graph, ["a", "b", "c"], "a", "s1", "Selected tree"));
console.log(graph.getNodeSubstructures("b"));
panel.getRfc().activateSubstructure("s1"); // root must be visible
```

The browser's **Substructures** controls create a tree/DAG/cluster from visible nodes, save its name/kind, change its root, and add/remove the selected node. Tree membership edits choose a deterministic breadth-first spanning tree through the resulting members; a disconnected selection fails without changing the stored definition. DAG edits use all non-loop relations among those members, so a directed cycle is reported rather than removed automatically. Programmatic/native definitions can choose a smaller DAG edge subset. Cluster creation/member edits capture all current internal non-loop relations. Renaming and changing the representative preserve selected relation IDs; disconnected cluster membership is valid. **Reinforce substructure** reveals members and adds its root as a center while retaining existing context and centers.

Name-only changes and rerooting retain the selected structural relation IDs. Changing the root of an active definition migrates its RFC center; a newly hidden root becomes suspended. The model revision also invalidates cached topology before the next force step. Activation remains independent of the viewing-lens focus.

## Layout and shared members

For an implicit center, RFC retains its original one-hop star and its numerical path at default node/relation importance. A stored tree reinforces every selected tree relation and applies local angular regularization around each structural vertex, including deeper descendants. Intermediate vertices include their parent among the angular branches; the tree's root identifies activation and visibility suspension. This is a collection of local tree constraints, not a guaranteed planar or crossing-free radial tree drawing.

DAGs use an explicit layered template instead of cyclic angular constraints. Longest-path ranks set the vertical layers; stable node-ID ordering sets slots within each layer. At target focal length `L`, rank spacing is `L / sqrt(λy)` and horizontal slot spacing is `1.25 L / sqrt(λx)`. Radial stiffness supplies the template spring coefficient. Each visible non-root member is attracted toward its root-relative slot, with an opposite reaction on the root. This preserves a movable focal center and makes shared descendants visible in the hierarchy. Angular stiffness does not control the DAG template, and no crossing minimization or label collision solver is implied. Attraction multiplier still adds attraction on selected semantic relations.

Across active centers, a shared tree relation receives its radial constraint once. Angular neighborhoods at the same structural vertex are merged. Moments involving shared members are divided by the maximum membership count of the two branches. DAG target springs are similarly divided by root/member ownership, limiting duplicated stiffness while permitting a compromise between competing structures. The experimental damper acts once on the union of focal members, avoiding repeated attenuation at shared nodes. Optional [elliptical exclusion](rfc-exclusion.md) now repels context and non-shared intersection members while retaining shared-node exemptions; hard area/label exclusion remains outside the force contract.

The presentation paints one soft yellow halo per reinforced node/relation in the visible union. It uses the existing shape/curve geometry. Hidden members retain their stored memberships; only visible selected relations contribute tree forces. Hiding a root suspends that center without suspending another visible center. DAG ranks and slot ordering come from complete membership, avoiding reordering when some members are hidden. Cached structural topology is invalidated by the graph's substructure revision; physical coordinates remain live.

Node/relation importance now scales the added forces. Zero-strength relations and disabled members leave the reinforcement projection without changing stored IDs; ranks and slots retain the complete DAG topology. See the [importance contract](rfc-importance.md) for normalization, DAG incoming means and shared/zero behavior.

Clusters instead reinforce long internal links with degree normalization, add adjustable two-sided spring rigidity, and encourage compactness about a moving importance-weighted centroid. They apply no tree angles or DAG template. The representative controls activation/suspension but receives no special reaction. Positive visible members participate even without eligible internal links; zero-weight relations disable their link term while positive members can still contribute to compactness. Shared links and halos are deduplicated, and shared ownership attenuates centroid compactness. Smooth translucent enclosures follow their displayed nodes and internal curves beneath the existing halos. See the [cluster contract](rfc-clusters.md) for potentials, locality reactions, boundary geometry and limitations.

## Center commands

| Command | Effect |
| --- | --- |
| Shift+Enter | Toggle the selected node's RFC center; confirm a pending candidate first. |
| Shift+double-click | Select that node and toggle its RFC center. |
| Add RFC center | Add the selected node without toggling or removing existing centers. |
| Return/double-click on an already centered node | Replace all RFC centers with this node when RFC is enabled. |
| RFC centers → Remove selected RFC center | Remove only that activation. |
| Remove RFC | Clear every active/stored center, retaining definitions and graph positions. |

The Shift commands can establish the first center or remove the last, turning RFC off. They do not pan, replace the visible locality, or change the viewing-lens focus. Removing the primary promotes another existing center. Editor fields retain native Shift+Enter behavior, and held-key repeats do not toggle repeatedly. `setFocus(node)` replaces all centers, retaining the node's stored definition if already active; null clears all. `toggleFocus(node)` toggles one and returns its resulting activation state. `addFocus(node)` remains idempotent and additive, `removeFocus(nodeOrId)` removes one, and `activateSubstructure(id, true)` explicitly adds a definition's root. Without the additive flag, `activateSubstructure(id)` replaces all centers, including when its root is already primary. `getState().centers` and `memberIds` expose the full state; legacy `focusId`/`branchIds` describe the primary center. The browser's Reinforce substructure action explicitly adds a stored definition.

## Finding clusters

The clustering module creates a detached Graphology projection and offers:

- **Louvain communities**, a modularity-based community detector with adjustable resolution. Larger resolution generally yields more communities. Uses the library's nonrandom traversal and stable input ordering. See [Graphology's implementation](https://graphology.github.io/standard-library/communities-louvain.html) and [Blondel et al. (2008)](https://arxiv.org/abs/0803.0476).
- **Connected components**, weak connectivity grouping on the same undirected projection, including isolates. This identifies disconnected pieces rather than communities within a connected graph. See [Graphology components](https://graphology.github.io/standard-library/components.html).

The projection ignores direction and self-loops, sums reciprocal/parallel relations, and uses unit weight per semantic relation by default. **Use relation weights for clustering** explicitly opts into `FreshEdge.getWeight()` and ignores zero-weight relations. Node weights and RFC force weighting are separate. Louvain communities are split into induced connected pieces before presentation, so every offered community is connected; explicit cluster memberships can also be disconnected. The reported modularity belongs to the original Louvain partition before that connectivity split; it is not recalculated or used as a layout-quality score.

The browser offers visible/complete graph scope, a cluster selector and a member-label preview. **Render cluster with RFC** stores an unordered cluster definition with its internal links, reveals its members, and adds its root as a center. If the selected node belongs to the cluster it becomes the representative; otherwise the highest internal projected-degree member is chosen, with ID tie breaking. All ordinary semantic relations remain in the graph, including connections to other clusters. Definitions are saved; unaccepted proposals are not.

```ts
import {clusterGraph, clusterToSubstructure} from "fm4/fm/clustering";

const result = clusterGraph(graph, {algorithm: "louvain", resolution: 1, weighted: false});
const definition = clusterToSubstructure(graph, result, result.clusters[0].id, "community-1", "Community 1");
graph.setSubstructure(definition);
panel.getRfc().activateSubstructure(definition.id, true);
```

Proposals fingerprint the source identities/topology and optional weights. Position/zoom changes do not invalidate them; graph changes require clustering again before conversion. Graph replacement clears the browser's proposals. Algorithms currently run synchronously on the requested graph; clustering very large complete graphs has not been benchmarked. Components and Louvain do not infer a semantic hierarchy. Direct conversion retains a cluster; an optional final `"tree"` argument to `clusterToSubstructure()` requests the former spanning-tree projection. Cluster definitions retain all current internal non-loop relations, including zero-weight links omitted from a weighted detector projection; their zero strength is respected by RFC.

## Example and validation

Choose **Load example → Trees and DAG**. The [synthetic file](experiments/rfc-substructures/trees-and-dag.fm.yaml) contains 12 nodes, 13 semantic relations, a seven-member deep tree and a six-member DAG. The definitions share one member; the DAG has a separate descendant reached from two parents. One extra semantic context relation is in neither structure. Open **Substructures**, choose each definition and press **Reinforce substructure** to view both. Regenerate with `just substructure-examples`.

For clustering, load **Zachary's karate club**, choose **Graph clusters**, detect communities and render one. The graph retains all 34 nodes and 78 relations while the accepted cluster retains its internal relations. Automated checks additionally use two synthetic dense communities joined by a bridge, isolates, reciprocal/parallel edges and zero weights.

Functional checks cover model validation, membership/native round trips, lifecycle invalidation, deep-tree/DAG forces, additive gestures, shared halos, stale proposals and unchanged semantic counts. The second draft and [follow-up reports](experiments/rfc-followup/README.md) compare stars/multiple trees, importance and compact clusters. Experiment H retains all internal semantic links when comparing cluster reinforcement with a perimeter-tree projection. DAG templates still have functional checks without a comparative layout study.
