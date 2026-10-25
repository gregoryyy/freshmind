# Radius-two browser

Choose **View → Exploration view → Radius two**. The center sits among a vertical
spine of direct neighbors; each row's incoming and outgoing second-hop neighbors
appear to its left and right. No drawn links imply connections between adjacent
cells. This is a fixed screen-space alternative to the existing graph/RFC view.

The view inspects the **complete stored graph**, including nodes hidden by the
force view's locality, type filters or aggregation. Those controls are view
rules, not permission boundaries. Switching modes preserves the force view's
membership, physical coordinates and camera. The graph's old count/zoom/motion
controls are hidden while the alternative view is active; its own counts explain
unique neighbors, repeated occurrences and real relation records.

[Open the three-view production walkthrough](radius-two-walkthrough/index.html),
or regenerate it with `just radius-two-flipbook`. Its
[fictional workspace graph](../examples/radius-two/README.md) demonstrates
interaction, not dependency-impact findings or a usability advantage. The
[design and related-work contract](radius-two-view.md) remains the broader plan.

## Read relationships and sharing

- Direct neighbors remain direct even when also reachable through another row.
  Type, label and stable ID determine order, independently of input insertion
  order and page windows.
- A wing's arrow/direction is relative to its row node. A direct-neighbor cell
  describes the relation from the center. Relation buttons name real endpoints,
  label/type, weight and ID; parallel records are expanded separately, preserving
  zero weights. Generic values are called weights, without invented domain units.
- Repeated node labels share a canonical identity. Hover or keyboard focus
  highlights its visible occurrences and witness rows; selecting it selects one
  underlying graph node. **Via … rows** lists witnesses with commands to reach
  their rows, using bounded record pages.
- Loops, links between direct neighbors and other induced neighborhood relations
  remain inspectable. **Other neighborhood relations** discloses cross-links and
  loops among second-hop nodes, rather than drawing misleading cell connections.
  Long text is clipped for display; use the existing details overlay and native
  document for full fields.

## Navigate and edit

Click or **Space** selects; **Enter** or double-click pivots the center. Arrow
keys move occurrence focus independently of selection; **Home** focuses the
center. **Page Up/Down** pages direct-neighbor rows. Each wing has its own paging
controls. **Back/Forward** or **Alt+Left/Right** restores center, direction, page
windows, selection and search provenance, with at most 100 history entries.

**F2/Ctrl+Enter** edits the selected label in the shared overlay;
**Shift+F2/Ctrl+Space** opens details. Hidden complete-graph items can be selected
and edited explicitly without revealing them in the force locality. Accepted
edits use the existing command/validation owner; canceled drafts preserve data.
Closing the overlay returns focus to this view. Ordinary force-view selection
cleanup is restored when returning to the graph. A hidden selection falls back
to the previous valid force-view anchor.

The snapshot stays stable during inspection. **Refresh snapshot** incorporates
edits, graph changes or newly accepted retrieval results. Changing documents
clears the old snapshot/history; retired occurrence callbacks cannot act on the
replacement. Empty documents and work-limit errors keep **Return to graph**
available. The previously running/paused layout state is restored on return.

Rows/cells use viewport measurements with bounded pages: 2–12 direct-neighbor
rows, 1–4 cells per wing, and eight records/witnesses per expanded detail page.
Expanded details can increase row height; the body scrolls. Narrow screens use
an internally scrolling adjacency area while keeping header actions available.
This bounds rendered content, rather than promising constant total computation.

## Retrieval seeds

Search using the existing lexical or LDA workflow, then open **Search result
seeds**. Choosing an accepted result captures a fresh snapshot, centers and
selects that node, and retains source/query, engine, rank, raw score, optional
metric value and corpus fingerprint. The empty chooser entry does not navigate.
A query node can also be inspected directly as a center.

The adapter reuses graph result records applied in this session, checking an
exact in-memory corpus key and the unchanged accepted metadata. The compact
serialized fingerprint remains provenance rather than an identity check. Saved
or imported result records remain browsable, but require rerunning search before
they enter the verified picker. No exact corpus key is added to graph files.
The adapter performs no retrieval or training and adds no graph objects. Corpus/source/request changes, malformed
provenance and deleted/rejected relations exclude invalid seeds. The lexical and
LDA worker/session cancellation and freshness owners remain unchanged; embedding
retrieval is still deferred. See [graph search](graph-search.md).

## Projection and ownership contract

`captureRadiusSnapshot` extracts IDs, labels, types, weights and real relation
endpoints/direction. It copies no coordinates, annotations, arbitrary metadata or
live graph references. `projectRadiusTwo` derives deterministic rows, occurrence
IDs, bundled relation IDs, witnesses and supplementary records. Its API supports
direction/type policies and incomplete snapshots: absent adjacency never proves
no relation; unknown totals stay unknown, and unverified second-step candidates
are labeled accordingly. The browser currently uses complete local snapshots,
not a remote provider. FM semantic relations are directed even when their
configured painted arrows are absent.

Local work limits are 50,000 nodes, 200,000 relations and eight million text code
units; IDs are limited to 4,096 code units. The projection scans the supplied
snapshot before paging. Larger inputs require another scoped provider/workflow;
there is no silent truncation or background worker in this implementation.

TG retains graph, locality, coordinates and layout. FM's panel retains selection;
its explicit complete-graph selection option supports this composed view while
default visible selection remains unchanged. `RadiusTwoRenderer` creates HTML
and emits actions; `RadiusTwoView` owns snapshots, bounded history, navigation
and teardown. IR retains document-independent retrieval contracts. Preferences
and snapshots stay local/session-only; graph files contain original semantic
nodes and relations, never occurrence copies.

Headless oracles cover exact paths/edge accounting, directions, sharing,
zero/parallel relations, paging, partial adjacency, invalid inputs, prototype-like
IDs, graph preservation and accepted/stale retrieval provenance. Browser checks
cover real selection/editing, pivot/history, hover/focus, large adjacency,
replacement/disposal, narrow screens and real lexical/LDA worker seeds.
Correctness checks and the production walkthrough do not establish task benefit,
large-graph performance or usability; comparative evaluation and the public
dependency-impact pilot remain separate milestones 6.6–6.7.
