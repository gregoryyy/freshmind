# Node-label readability

Open **View → Label spacing**, choose a gap (default 8), then press **Separate
overlapping nodes**. The action arranges the currently visible node bodies and
labels and pauses motion when nodes move. The status shows the number of
intersecting node pairs before and after. Pinned nodes, the viewing focus and a
node being dragged stay in place. Hidden and structurally aggregated nodes keep
their stored positions.

The gap uses the same drawing units as node bodies: 8 pixels at 100% canvas zoom.
Canvas zoom scales it along with the shapes and text. **Resume motion** returns
to ordinary layout; its forces can introduce overlaps again. Changing the lens,
graph spacing, rotation, label text or importance can also require another pass.
Save with layout positions enabled to retain the arrangement in native YAML.

The final two views in the [main flipbook](flipbook/index.html#label-overlap)
show the current browser before and after separation.

## Geometry and ownership

The renderer already measures wrapped/multiline text and updates each node's
body size, including importance scaling. The browser adapter uses these dimensions
plus stroke width in draw coordinates, before canvas scaling/pan. The headless
separator sweeps horizontal bounds and iteratively moves intersecting rectangles
along the axis requiring less displacement. Two movable nodes share the shift;
an immovable node leaves the whole shift to its neighbor. Stable IDs break ties,
and input snapshots remain unchanged.

The browser maps proposed positions through the existing inverse lens chain,
checks finite coordinates before applying them, clears momentum on moved nodes,
and repaints through existing routing, picking and editor geometry. Selection,
semantic relations, types, weights, annotations, RFC activations, structural rules,
search corpus and viewing settings keep their existing owners. The complete
graph and native persistence format remain unchanged; the action changes visible
movable layout positions and their momentum, and wakes the damper for a later
resume. It stops the layout runner;
application controls synchronize through the binding callback.

```ts
import {separateNodeOverlaps} from "fm4/fm/geometry"; // Also in fm4/fm/core.
import {separateNodeLabels} from "fm4/fm/browser";

const result = separateNodeLabels(panel, {gap: 8});
// result.before, result.after, result.moved, result.passes
```

`separateNodeOverlaps()` accepts plain `{id, x, y, width, height, fixed?}` boxes
and returns detached arranged boxes plus diagnostics. No graph, renderer, DOM or
force engine is needed. `bindReadabilityControls()` binds caller-owned controls
and returns a disposer; its callback lets the application update its motion UI.

## Limits and verification

This is a bounded one-shot arrangement. It uses conservative rectangular body
bounds, rather than exact shape intersections. The default is 100 passes (maximum
500) with a total budget of one million candidate pair comparisons. A capped or
constrained pure arrangement is discarded if it increases the body-overlap count.
Pinned/focus/drag conflicts can remain, and a dense graph can exhaust the budget.
The browser reports actual intersections after inverse projection; HyperScroll's
inverse is sampled, so it need not reproduce the proposed coordinates exactly.

Relation labels, hidden-link/aggregation/weight decorations, edge crossings and
viewport fitting are outside this first increment. The arrangement can expand
the graph footprint. It does not change TouchGraph/RFC force equations or promise
continuous collision avoidance or an optimal packing. Exact intersection counting
can still be quadratic in dense views; smaller neighborhoods remain useful.

Logic checks cover independent rectangle clearance, ties, pins, pass limits,
validation and input preservation. Headless integration checks protect hidden,
focus and dragged nodes, graph identity, search corpus, RFC and view settings.
Chrome checks use real measured multiline/importance-scaled SVG bodies, verify
before/after intersections and paused motion, and cover invalid input and binding
disposal. The production flipbook provides a current-graph comparison.
