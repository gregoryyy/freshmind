# Graph readability

**View → Label spacing** offers an explicit node arrangement and automatic
relation-label placement. Both use measured SVG geometry; neither changes
TouchGraph/RFC force equations.

## Separate overlapping nodes

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

Views 22–23 in the [main flipbook](flipbook/index.html#label-overlap)
show the current browser before and after node separation. Views 24–25 compare
relation-label placement on the same paused arrangement.

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

## Node-separation limits

This is a bounded one-shot arrangement. It uses conservative rectangular body
bounds, rather than exact shape intersections. The default is 100 passes (maximum
500) with a total budget of one million candidate pair comparisons. A capped or
constrained pure arrangement is discarded if it increases the body-overlap count.
Pinned/focus/drag conflicts can remain, and a dense graph can exhaust the budget.
The browser reports actual intersections after inverse projection; HyperScroll's
inverse is sampled, so it need not reproduce the proposed coordinates exactly.

Hidden-link/aggregation/weight decorations, edge crossings and viewport fitting
are outside this arrangement. It can expand the graph footprint and does not
promise continuous node collision avoidance or an optimal packing. Exact node
intersection counting can still be quadratic in dense views; smaller
neighborhoods remain useful.

## Avoid relation-label overlaps

**Avoid relation label overlaps** is enabled by default in the main browser.
It places text near its own curve while checking visible node bodies and other
relation labels. It follows graph movement and view changes without moving nodes,
changing curves or hiding text. Turn it off to restore each curve's original
midpoint plus configured label offset. The choice carries across graph loads
as a transient view preference; it is outside the saved graph/view schema.

Library panels retain original placement by default. Applications opt in with
`new FreshmindPanel(container, {relationLabelPlacement: "avoid-overlap"})` or
`panel.setRelationLabelPlacement("avoid-overlap")`; the other mode is
`"original"`. `getRelationLabelPlacement()` reads the current preference.
`bindReadabilityControls()` accepts an optional `relationLabels` checkbox and
synchronizes programmatic changes; its disposer removes listeners.

The renderer caches actual SVG text bounds, including font and glyph bearings,
and refreshes them when text/font or font-loading status changes. Unchanged
repaints reuse those measurements. Original library placement does not measure
relation text. Node obstacles use current lens projection and measured bodies;
label and node bounds receive a small drawing-unit margin. Canvas zoom/pan then
scales the entire drawing normally.

Candidates sample five points in the middle half of each curve and five normal
offsets based on text height. Configured label offsets remain part of every
candidate. A headless spatial index scores intersections first, overlap area
second and distance from the original anchor third. Stable edge IDs determine
iteration order. Each committed move improves that local score. Curves, arrows
and picking paths remain unchanged; panel geometry and inline relation editors
reuse the same text measurements and chosen label anchors.

`placeRelationLabels(labels, obstacles, options)` is exported through
`fm4/fm/geometry` and `fm4/fm/core`. It accepts detached center-based rectangles
and candidate centers, returns positions plus `moved`/`limited` diagnostics and
does not mutate inputs. Fixed labels and labels beyond the arranged-label cap
stay at their original anchors and remain obstacles. Defaults are 200 arranged
labels, two passes and 200,000 spatial-index entry visits; options permit caps of
2,000 labels, ten passes and ten million visits. A candidate is committed only
after its complete score is known. Oversized rectangles use a bounded overflow
path rather than enumerating arbitrarily many grid cells.

This greedy, bounded pass can leave collisions, especially in dense views or
when the work limit is reached. Its conservative rectangles are not exact glyph
outlines. It does not avoid curve crossings, decorations, viewport boundaries or
guarantee a globally optimal placement. Movement can switch candidates between
frames; no temporal smoothing or user-study claim is made. The
[production comparison](flipbook/index.html#relation-overlap) records actual
SVG label–node and label–label intersections with identical nodes and curves:
**27 → 2** in the current paused example, after node-body separation reduced
body intersections from **8 → 0**. These are fixture observations, not general
readability guarantees.

## Verification

Logic checks cover independent rectangle clearance, ties, pins, pass limits,
validation and input preservation. Headless integration checks protect hidden,
focus and dragged nodes, graph identity, search corpus, RFC and view settings.
Chrome checks use real measured multiline/importance-scaled SVG bodies, verify
before/after intersections and paused motion, and cover invalid input and binding
disposal. Relation-label checks independently count rectangle intersections and
area across varied deterministic fixtures, enforce work caps and preserve inputs.
Chrome checks compare actual SVG intersections, unchanged node positions/curves,
reversible anchors, loops/parallel edges, transformed inline editing, safe text,
measurement reuse and control disposal. The production flipbook provides both
current-graph comparisons.
