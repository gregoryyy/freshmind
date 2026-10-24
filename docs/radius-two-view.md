# Radius-two adjacency view: design contract

Proposal, **2026-10-24**; tasks **6.2–6.6**. The [ROAD document](ROAD.md) contains
the application rationale, related work, library comparison and proposed
delivery order. This is a different presentation from force layout. It uses
alignment and explicit relation text to make a local graph readable.

[Interactive mockup](design/radius-two/index.html) ·
[Preview](design/radius-two/preview.png) ·
[existing locality/filter contract](structural-focus-context.md)

## Geometry and reading order

The center `c` is at the middle of a vertical spine. Every distinct direct
neighbor `u` occupies one spine row above or below `c`. Its other neighbors `v`
occupy horizontal cells on that row. They are all adjacent to **u**; neighboring
cells are not connected to one another merely because they are next to each
other. No ordinary edge lines are drawn by default.

```text
       incoming to row node        direct neighbors        outgoing from row node

  Gateway · calls → 180 req/s           Web                calls → Identity · 180 req/s
                               Web → Checkout · calls 180

                                      Billing            calls → Identity · 48 req/s
                               Checkout → Billing · 95   Ledger · 2 relations

                                     CHECKOUT
                                 center / radius two

                                      Inventory          calls → Identity · 12 req/s
                               Checkout → Inventory ·120 calls → Warehouse ·100 req/s

                                      Support            calls → CRM · 15 req/s
                               Support → Checkout · 15
```

Left/right means direction relative to the row node, **not relative to the
center**. An incoming left cell reads `Gateway → Web`; an outgoing right cell
reads `Web → Identity`. Each cell's accessible description names both endpoints.
The center relation has its own text under the row's node label. Vertical order
does not imply direction or adjacency between the spine nodes.

In a bounded page with row height `h`, place `c` at `(x₀,y₀)` and r=1 rows at
`(x₀,y₀+k·h)`, where `k` takes balanced nonzero integer slots. Measure text before
placing cells, then fill horizontal slots outward on each side. Cell spacing and
row order carry no weight or distance semantics. Long relation text opens as
detail rather than silently covering the next cell.

Default ordering is stable type group, label, then canonical ID; a user may
choose a domain attribute, pin rows or explicitly apply a score order. Use the
same order on both wings. Freeze order during inspection; show that new results
are available instead of moving a target under the pointer. The fictional
mockup has a curated initial order to illustrate the design.

For many r=1 nodes, keep the center reference visible and page virtual row slots
above/below it. Show the current range and allow scrolling/Page Up/Page Down to
advance that range. The center is not duplicated as another semantic node.
Horizontal cells need independent bounded windows and a searchable “all
neighbors of u” list. The initial page is balanced; incoming/outgoing r=1 groups
can be an explicit alternate ordering, never an unexplained positional rule.

## Which nodes and relationships are represented?

Let `A(v)` be distinct eligible adjacent nodes under the chosen direction,
relation-type, permission and time policy. Default exploration follows either
edge direction while retaining each edge's true direction:

```text
N1 = A(c) − {c}
N2 = (union of A(u) for u in N1) − N1 − {c}
```

These are shortest-hop levels under that policy, not weighted distances. If an
outgoing-only policy is selected, recompute levels and disclose it prominently.
Do not mix “two undirected hops” and “two directed traversals”.

Each `u ∈ N1` appears once on the spine, even when multiple edges join it to the
center. For every `v ∈ N2` adjacent to `u`, create a **view occurrence** in that
row. One occurrence can bundle parallel edge records but retains every edge ID,
type and direction. Shared `v` appears in multiple rows. All occurrences point
to the same canonical node; none is inserted into the source graph.

This projection shows path witnesses through r=1; it is not a full induced-graph
drawing. Account for the remaining relationships explicitly:

| Case | Presentation / rule |
| --- | --- |
| Return to `c` | Already represented by the center-to-row relation bundle; no r=2 proxy of the center. Reciprocal arrows remain individually inspectable. |
| r=1 ↔ r=1 | A row badge such as `also linked to Support` opens the exact relation(s). Linked highlighting locates the other spine row. Both row references resolve to one canonical edge; count it once in global totals. |
| r=2 ↔ r=2 | Supplementary **other neighborhood relations** list, searchable by endpoint/type; optional matrix or ordinary graph detail. Report whether these relationships have been fetched. Never imply that absent drawn lines mean absent edges. |
| Self-loop | Explicit `self: health check · 2 req/s` relation entry on the relevant node; not an extra neighbor or hop. |
| Parallel relations | Compact `2 relations` badge; expand to individual phrases, weights, provenance and edge IDs. Do not sum unlike types or units by default. |
| Reciprocal relations | Separate incoming/outgoing records. A node can occur on both wings; a `↔` badge can summarize the pair, with two exact direction descriptions in detail. |
| Undirected relation | Use a labeled **undirected** group, balanced left/right by stable ID if both wings are needed. A `— related to` glyph and text distinguish it from a directed edge. Side placement has no semantic meaning in this mode. |
| Filtered, forbidden or not loaded | State the applied scope and completeness. Respect provider permissions; do not reveal forbidden identities or totals through badges. Unknown totals remain unknown. |

The initial implementation should be read-only for graph structure; shared
node/edge detail editing can use the existing overlay once identity mapping is
verified. A row occurrence must never become a saved graph node.

## Edge labels and weights

Use a two-line cell: **node label** followed by **relation phrase + direction +
weight/unit**. Put the r=1 ↔ center phrase in the spine row header; put the
r=1 ↔ r=2 phrase with the horizontal entry. An explicit edge label takes priority,
with semantic type as a fallback. If they differ, expose both in detail.

Example: `Identity` / `calls → 48 req/s` on Billing's right wing. Selecting it
reads `Billing → Identity · calls · 48 req/s`, followed by the source record and
observation time. This makes the relationship inspectable without reconstructing
an invisible line. A lightweight row background and consistent gaps establish
grouping. They are layout guides, not semantic edges.

| Information | Default encoding | Exact detail / pitfall |
| --- | --- | --- |
| Edge type and direction | Short phrase plus arrow; explicit incoming/outgoing headings | Full source → target sentence, original label/type and edge ID. No hover-only meaning. |
| Edge weight | Number with named metric/unit; optional fixed-width microbar | Full precision, scale, time window and provenance. Bars compare only one declared metric on a shared scale. |
| Unknown / zero | `not supplied` versus `0` | Neither absence nor zero deletes the relationship. The mockup includes a zero-weight parallel relation. |
| Multiple weights | Chosen named metric, with `+2 metrics` if needed | Traffic, confidence, monetary amount, recency and similarity are different quantities; no automatic sum or common scale. |
| Node importance | Separate small node badge or sortable column | Do not reuse edge weight or layout distance. Keep equal cell widths and a readable minimum font size. |
| Search relevance | Explicit result rank/score and query origin | Do not substitute relevance for a semantic edge's weight, or call an uncalibrated similarity a probability. |

For graphs with the current generic numeric Freshmind weight, show `weight 10`
rather than inventing a domain unit. The mockup's `req/s` is fictional domain
metadata, not a change to FM's model-weight/RFC-force contract. Negative metrics,
if supplied as domain data, need a signed scale; do not feed them into the
existing nonnegative importance API.

## Shared second-hop nodes without link clutter

Use **repeated labels + explicit witnesses**, not drawn cross-row links:

1. Repeat `Identity` in every applicable row, always bound to the same ID.
2. Add `via 3 rows` (or `via ≥3 loaded rows` when incomplete). The detail names
   Billing, Inventory and Web, with their relationship records.
3. Hover or keyboard focus highlights every visible occurrence and its row
   header. Selection persists that emphasis for touch and keyboard inspection.
4. Clicking a witness name moves to its row and preserves the selected identity.
   A summary distinguishes **5 unique r=2 nodes / 7 row occurrences** in the
   initial mockup. Parallel edges do not inflate either node count.
5. For many shared identities, offer an optional comparison view: r=1 rows ×
   **unique** r=2 columns with typed/directional relationship cells. Freeze and
   virtualize the column order. It trades repeated names for empty cells and
   harder path reading; keep the original rows available.

A label like “also via Inventory” communicates sharing rather than an extra
edge between Billing and Inventory. Only actual edge records can establish that
connection. Display canonical IDs when equal labels would be ambiguous. Keep
unresolved entity matches distinct; the layout cannot decide identity resolution.

## Interaction and accessible detail

Click/Space selects; Enter or double-click pivots the selected node into the
center. Arrow navigation follows logical rows and cells; vertical movement
preserves a sensible wing/column when possible. Returning to the spine is always
possible. Home targets the center, Escape closes transient detail, and history
restores center, filters, ordering, row/cell windows and selection. Avoid new
three-modifier chords. Details/editing open in the established overlay.

Pointer entry may resume graph commands from the center when focus is passive,
consistent with the current browser. Explicit side-pane or overlay input keeps
priority. Selection is a canonical node or a specific edge; keyboard position is
an occurrence, so selecting one proxy highlights all while returning focus to
the original row. Use roving focus, full relation descriptions and a complete
text/list equivalent. Hover must not be required for any fact or action.

On pivot, keep the chosen occurrence as a temporary transition anchor, then
place its canonical node at the center. Respect reduced motion and retain a
breadcrumb/history entry. With remote data, show a busy state and scope rather
than a plausible-looking empty neighborhood. Distinguish no neighbors from
not loaded, failed and filtered-out neighbors.

## Large-graph architecture

Radius two does not bound volume: its candidate work is proportional to the
queried center adjacency plus the adjacencies of its r=1 neighbors, before
deduplication/sorting. A hub can expose most of a graph. Virtualization reduces
mounted DOM/render cost; it does not reduce query, transfer or projection cost.

- Request r=1 pages with deterministic order/cursors and then bounded adjacency
  pages for those rows. Support cancellation, per-row limits, type/time filters
  and explicit load-more. Preserve off-page r=1 membership checks so a direct
  neighbor is not misclassified as r=2 because its spine page is absent. If the
  provider cannot establish shortest-hop membership, label the item as a
  second-step candidate until verified.
- Report unique nodes, occurrences and edge records separately. A known total
  is exact only for the declared scope/snapshot. “12 shown of 4,810” requires an
  authoritative total; otherwise use “12 shown; more available”. Shared-node
  witness counts must identify whether they cover all or only loaded rows.
- Compute and cache a detached projection keyed by document generation,
  canonical IDs, filter/time policy, order and page cursors. Check graph version
  before applying async results; ignore cancelled or stale responses. Loading a
  different graph must clear selection/history references safely.
- Keep TG graph/locality and physical coordinates with their current owners.
  FM composes projection, rendering, navigation and the overlay editor using
  `struct-view`, `render`, `navigate` and `edit` contracts. Do not route this fixed
  screen-space layout through the force integrator or overwrite saved positions.
  Switching back restores the ordinary view/lens state.
- IR consumes document snapshots and returns stable-ID ranked results. A graph
  adjacency provider is a separate responsibility from lexical/semantic
  retrieval; it must declare whether it traverses the complete permitted graph
  or only the loaded graph. No graph objects or new layout ownership move to IR.

## Prototype scope and evaluation

The standalone mockup uses ten fictional services, fourteen directed relations,
one shared identity, a parallel pair including zero, an r=1 cross-link and a
self-loop. It demonstrates selection, shared highlighting, relation/witness
detail, weights on/off, pivot and history. Its complete small in-memory fixture
has no server, virtualization, production editing or implemented matrix view.
The preview is captured from this file; it is not a screenshot of Freshmind's
production UI. Open `index.html` directly; no dependencies or network are needed.
To reproduce the preview, reset the study, leave weights enabled and keep the
initial Identity/Billing selection. Capture the full page in Chrome with a
1440 × 1120 viewport and device scale 1; the recorded image is 1440 × 1328.

The production design still needs the correctness, performance and task studies
specified in [ROAD](ROAD.md#delivery-sequence-and-evaluation-gates). Compare
against an ordinary ego node-link view, current RFC and a plain adjacency
list/tree, with a matrix for shared-neighbor comparison. Include deliberately
dense r=2 links and longer paths, where this view may be worse. Record missed
relationships and duplicate-count errors, not just speed or visual preference.
Only retain the proposed defaults if those tasks support them.
