# Freshmind 4 completed work

This is the implementation record for [TODO.md](TODO.md). Entries include completed work, implementation decisions, deviations, and lessons. Earlier steps have been backfilled from the initial development work and Git history; they are retrospective records, not additional implementation claims.

## Browser copy cleanup — 2026-10-23

- Removed decorative slogans, the atlas heading, static status dots and the Java reference link from the main browser. Removed the equivalent promotional heading/copy from the palette page and generic filler annotations from the sample graph.
- Retained functional control labels, graph counts, shortcuts, page navigation and attribution; removed unused decoration styles. Work continues on `freshmind4/browser-fixes` with the existing navigation/highlight changes preserved.
- Type checking, the production demo build and four targeted Chrome flows pass, covering palette rendering, keyboard navigation, editing and mobile layout.

## Navigation follow-up: node highlighting and double-click centering — 2026-10-23

**Completed**

- Replaced native rectangular SVG keyboard outlines on Freshmind nodes with a sibling SVG path generated from the resolved node shape. Keyboard and viewing-focus frames follow all twelve supported shapes and remain outside the focusable node group; hidden-link badges retain separate bounds and clear the frame's stroke.
- Corrected the bundled YAML palette's highlight text colors: yellow selection/hover and orange preselection use dark labels. Light pinned fills and the normal person style also receive readable labels; active candidate borders use a dark stroke. Regenerated the headless preset and documentation mirror. A contrast regression covers all 21 node types and all 32 combinations of interaction states, with a minimum label contrast ratio of 4.5:1.
- Changed Freshmind node double-click from expansion to selecting and centering through the same controller/settings as Enter. Pan-only mode keeps the neighborhood; normal centering replaces it. Expansion remains available through E and the sidebar. Added protected double-click/tooltip hooks to TouchGraph while preserving its original defaults and edit gestures; Freshmind tooltips now describe its own shortcuts.

**Implementation notes and insights**

- The incorrect frame came from the browser's native SVG bounding-box outline. The viewing-focus decoration already used the node shape. Suppressing the native outline requires an explicit replacement for keyboard focus, including immediate refresh when motion is stopped and cleanup when focus leaves.
- Blur can fire while D3 removes a focused graph item. Focus updates coalesce into a microtask, avoiding reentrant DOM joins; disposal invalidates queued redraws. Hidden-count clearance is checked against the actual SVG stroke, since the browser's path bounding rectangle can conservatively inflate joins.
- Contrast is a profile setting rather than a renderer heuristic. The supplied palette keeps its legacy fills and type identities while changing foregrounds and the candidate border. Custom YAML remains authoritative for its own styles and contrast.

**Verification**

- **67 Node tests** and **24 Chrome browser tests** pass, along with type checking and library/production-demo builds. New browser regressions exercise every shape's focus paths, badge clearance, centering in both modes and unchanged edit-mode behavior; existing deletion/hiding tests cover focused-item cleanup.

## Milestone 2.3: Freshmind navigation — 2026-10-23

Completed TODO items **2.3.1–2.3.4**.

**Completed**

- Added `src/fm/navigation/` with a headless directional-candidate helper and navigation controller, plus a separate SVG keyboard/status adapter. `FreshmindPanel.getNavigation()` exposes shared commands, validated settings, detached state snapshots and subscription cleanup. The controller reads live selection/membership from its host instead of maintaining another committed selection model.
- Added node and relation navigation using four screen-space sectors, incoming/outgoing visible links, axis/distance/ID tie-breaking and frozen clockwise candidate order. Node choices deduplicate parallel links; relation choices retain them. One candidate commits immediately; multiple candidates highlight independently of committed selection, cycle in either direction, confirm or cancel. Directional auto-repeat cannot accidentally confirm a candidate.
- Added inactivity expiry (2,500 ms default; zero disables it), injectable clocks, membership pruning without automatic confirmation, restoration of previously owned highlight flags, and cleanup on selection, locality/graph replacement, focus leaving the graph and destruction.
- Kept neighborhood origin, selected-node anchor, committed node/relation, transient candidates, viewing-lens focus and DOM focus distinct. `getNeighborhoodFocus()` tracks the requested locality origin; queued operations cannot reset the latest request. A relation retains an incident anchor, and Escape returns to it before clearing node selection.
- Added shared centering, radius/backlink/degree filtering, expand/collapse/hide and details commands. Enter centers the anchor, optionally updating neighborhood and lens focus; N toggles that option. Space opens details, E/K/H control locality, 0–6 set radius, B toggles backlinks and F2 invokes the editor action. Sidebar controls use the same state, including degree limits, pan-only centering and timeout configuration.
- Added selected-node annotation and node/relation detail views in the main browser. A live status region announces candidate position and label; relation accessible names include endpoints/direction, label and type. Graph input excludes text fields, composition and browser modifier chords; Tab retains ordinary DOM focus movement. Existing editing/dragging, mouse selection, pinning and curve controls remain available.
- Updated README usage, source boundaries, feature design and milestone status.

**Implementation notes and deviations**

- TouchGraph retains its graph/locality, layout and lens ownership. The only added base API is `TGPanel.centerOn(node, updateFocus = false)`: pan a stored node to the origin through the default lens chain without changing selection, visibility or physical coordinates. Callers replacing the complete lens chain still own viewport transforms. Plain-panel keyboard defaults, including Space expansion, are unchanged.
- The Java `<45°` diagonal gaps are corrected with half-open sectors: NE → right, SE → down, SW → left, NW → up. Symmetric axis scores use absolute vector components, avoiding modulo-rounding bias in distance/ID tie-breaking. The order captured at preselection start survives spring/lens movement; invalid members are removed without reordering or committing survivors.
- For accessible item activation, Enter on a different DOM-focused node/relation selects that item first; a subsequent Enter centers its anchor. Ordinary committed selection does not replace the neighborhood. Sidebar connection links can explicitly reveal a hidden neighbor even with pan-only centering enabled.
- Degree limits govern neighborhood discovery/traversal through the existing locality API. Explicit expansion retains TouchGraph's immediate-neighbor behavior; collapse/hide prune the view while preserving complete graph data. Deletion continues to edit the complete graph.
- Details render annotation source as text. Full metadata/annotation editing, HTML presentation and inline editor positioning remain milestone 2.4; this step completes their navigation entry points.

**Insights**

- Frozen candidate IDs alone are insufficient: candidate membership, active index, temporary style ownership and timer lifetime must be reconciled together. Removing all but one candidate must never act as confirmation.
- Keeping locality origin separate from lens focus supports both pan-only browsing and explicit neighborhood replacement. Async locality callbacks need request generations so completion of an earlier operation cannot invalidate a later hidden focus.
- SVG capture handlers must also bypass inherited node activation/deletion when input comes from an embedded editor or a modifier chord. Merely declining the Freshmind command still permits a bubbling TouchGraph handler to run.

**Verification**

- Type checking, **66 Node tests**, and library/production-demo builds pass. Fifteen new Node tests cover sectors, ties, parallel/incoming links, frozen order, pruning, confirmation/cancellation, timer ownership, selection/filter/centering contracts and queued locality replacement.
- **22 Chrome browser tests** pass, including four new navigation flows covering cycling/repeat, relation anchors, details, pan-only centering, filters, timeout, mouse/focus cancellation, editor handoff and input/modifier isolation.
- Running unmodified Java reference comparison still passes: **9 scenarios, 276 layout batches and 35 lens cases**. This verifies the preserved TouchGraph physics/lenses, not full Java UI equivalence.

## Main-browser Freshmind integration and basic editing — 2026-10-23

**Completed**

- Replaced the main demo's plain graph/panel instances with `FreshGraph`, `FreshNode`, `FreshEdge` and `FreshmindPanel`. Its existing atlas now uses semantic types, varied node shapes and labeled relations while retaining neighborhood navigation, pinning, dragging and editing gestures. Added the main-browser integration task **2.2.8**.
- Added a visible main-browser curve selector for spider, lens-midpoint and straight modes, with guidance about diagonal endpoints and nonlinear lens strength. A relation can override the view default and reset to inherited styling.
- Added sidebar editors for node labels/types/shapes and relation labels/types/curves, explicit add/delete buttons, F2, keyboard save/cancel and graph focus restoration. Labels remain independent of stable IDs. Per-item drafts survive selection changes, and text entry cannot trigger graph deletion shortcuts.
- Added headless edit commands that validate before mutating model objects, preserving coordinates and unrelated metadata. Added Freshmind selection subscriptions so relation selection and locality cleanup update inspectors consistently.
- Cached node text measurements by label, font/loading state, wrapping/padding and shape; view movement no longer needs to remeasure unchanged labels. Tightened the Freshmind keyboard-outline offset to clear hidden-link counts with its measured node bodies.
- Removed the eight compatibility re-export files from the `src/` root. Package exports now map `fm4` and `fm4/core` directly to the same TouchGraph builds as `fm4/tg` and `fm4/tg/core`. Tests use public package imports; builds clear old output so deleted shims cannot remain in published artifacts.

**Scope and implementation notes**

- The separate `/freshmind.html` palette/configuration explorer remains available. Main-browser integration required explicitly choosing the Freshmind panel; merely exporting the extension classes did not add controls to the existing demo.
- This is a basic sidebar editor, not completion of milestone 2.4. URL/annotation editing, arbitrary visual overrides, inline positioning and a broader edit notification/undo interface remain planned. The directional keyboard navigation controller remains in 2.3.
- TouchGraph classes, spring equations and locality/lens ownership are unchanged. The new selection observer belongs to the Freshmind panel; existing `TGPanel.onSelect` behavior remains intact.

**Verification**

- Type checking, **51 Node tests** and production demo build pass. New model tests cover edit validation/atomicity, identity/metadata preservation and selection cleanup.
- **18 Chrome browser tests** pass, covering main-browser curve modes, label/type/shape save/cancel, retained drafts, relation overrides, explicit add/delete and text-metric invalidation, alongside the existing navigation and palette flows.

## Milestone 2.2: Freshmind types and labeled curves — 2026-10-23

Completed TODO items **2.2.1–2.2.7**.

**Completed**

- Separated TouchGraph implementation into `src/tg/` and Freshmind extensions into `src/fm/`, with configuration and rendering subfolders. Existing root modules re-export the same TouchGraph constructors. Added explicit `fm4/tg`, `fm4/tg/core`, `fm4/fm`, `fm4/fm/core` and `fm4/fm/config` package entry points.
- Added `FreshNode`, `FreshEdge`, `FreshGraph` and a small document aggregate. Semantic type IDs, independent relation labels, visual overrides, annotations, URLs, weights, metadata and extension fields remain separate from spring state. Graph identity and adjacency continue to use the TouchGraph implementation; Freshmind enforces stable IDs and permits duplicate labels, parallel relations and self-loops.
- Added validated semantic/visual type configuration, visual inheritance, per-item overrides and fieldwise interaction styles. The initial YAML profile includes all 21 legacy node types, twelve shapes, authoring/citation relation types, strokes, fonts, halos and selected/preselected/candidate states. Unknown type IDs survive with fallback presentation and registry diagnostics.
- Added strict YAML 1.2 type loading and atomic registry replacement. `config/fm2014.types.yaml` is authoritative; `just sync-fm-config` generates `src/fm/config/fm2014.ts` and the documentation mirror. The static preset allows headless use without a YAML parser dependency.
- Added `FreshmindPanel` through protected creation, node/edge painting and decoration hooks. It retains the original panel's mounting, gestures, locality, layout, lens pipeline and lifecycle. Plain-panel defaults and existing imports remain supported.
- Restored labeled quadratic spider/lens/straight relations, midpoint arrows, multiline node labels and deterministic routing for parallel/reciprocal relations. Self-loops and coincident endpoints use finite cubic routes. Rendering, pointer hit paths, programmatic picking and future editor anchors share curve geometry.
- Added `/freshmind.html` with the legacy palette, curve controls and live YAML configuration, alongside the existing plain TouchGraph demo. Focus bounds exclude hidden-link counts, halos and pin indicators.
- Documented key TouchGraph and Freshmind APIs with JSDoc, including coordinate spaces, ownership, extension hooks, validation and geometry approximations. Comments are retained in generated declarations.
- Added short Apache 2.0 notices to Freshmind-specific sources and preserved them during profile generation. Package/demo outputs include the full license text alongside the inherited TouchGraph licenses. Updated the README's development period to 2002–2014 and described the port's purpose as demonstrating enduring concepts in a modern environment.
- Centralized the full TouchGraph terms in the root `LICENSE`, with attribution in `NOTICE`. Adapted TypeScript files retain short copyright headers requiring both files to accompany source redistribution. The Java reference headers remain intact.

**Implementation notes and deviations**

- Semantic type uses `getSemanticType()`; TouchGraph's numeric `getType()` shape contract is preserved. The renderer resolves Freshmind shapes through its registry. Relation label editing and type changes are independent model operations; the full editors remain in 2.4.
- For transformed endpoints `A`, `Z` and chord midpoint `M`, spider control is the transformed world point `((x0+x1)/2, y0)`. Lens control is `2B-M`, where `B` is the transformed world midpoint. The quadratic midpoint is `(M+Q)/2`, with the legacy label offset `(2,12)`. This retains the Java construction through composed nonlinear and rotation lenses.
- Visible curves are clipped against node shapes using sampled boundary search and binary refinement, then emitted as exact subcurves. Distance picking flattens the visible curve into 128 segments; this is an approximation rather than an analytic nearest-point solution. Convex/concave side outlines use sampled containment as well.
- Parallel routes are ordered by stable edge IDs without changing adjacency or physics iteration order. Cubic loop routing, clipping, SVG text metrics and fractional stroke widths are deliberate browser adaptations, rather than claims of pixel-identical Java painting.
- Node weights scale halos and relation weights scale strokes, as specified in the design. They do not change repulsion or spring force. Basic edge pointer/Enter selection and presentation flags are available; the directional preselection controller remains in 2.3.
- `getMiddle()` returns the curve midpoint; `getLabelAnchor()` includes the label offset for future editors. Rendered geometry is transient, recalculated by repaint or `getEdgeGeometry()`, and cleared when an edge is hidden, deleted or reversed. Headless consumers can call the pure geometry functions with their own text dimensions and transforms.
- YAML graph I/O, batch example conversion, details/editing interfaces, RFC and search remain in their respective milestones. The type loader does not load the proposed graph YAML format.

**Verification**

- Type checking, library build, production demo build and npm package dry run pass.
- **48 Node tests** cover the existing TouchGraph behavior, model invariants, YAML validation, profile synchronization, inheritance/states, class identity and package exports, dependency boundaries, Java curve equations under lenses, clipping/picking and difficult edge routes.
- **12 Chrome browser tests** cover both demos, including live configuration rollback, relation edits, lens changes, curved-edge selection, dragging, creation/deletion and focus bounds around nodes with hidden links.
- The original Java layout/lens comparison still passes: **9 scenarios, 276 layout batches and 35 lens cases**. The Freshmind curve tests verify the Java equations separately; they do not constitute Java raster-image parity.

**Insights**

- Transforming the world midpoint and averaging transformed endpoints differ under a nonlinear lens. Keeping these constructions explicit is necessary to recover the distinctive Freshmind curve appearance.
- Rendering hooks can add Freshmind presentation while preserving the tested TouchGraph ownership model. Type-only references from metadata objects to presentation contracts avoid pulling renderer or parser code into the headless dependency closure.
- Labels, semantic types, stable IDs, physics and visual weights need separate contracts. The Java prototype's overloaded type API and implicit coupling should not become requirements for the new extension layer.

## Initial foundation — retrospective, 2026-10-22

Recorded in commit `818030e`.

**Completed**

- Established the TypeScript ESM library, declaration build, Vite demo, dependency lockfile, and `.gitignore`.
- Ported the TouchGraph graph model, spring embedder, visible locality, and composable viewing lenses.
- Added SVG rendering, node dragging, pan/zoom, selection, pinning, neighborhood browsing, and a runnable example.
- Added the `fm4/core` entry point for use without D3 or a browser DOM.
- Preserved the upstream licenses and attribution and included notices in the production demo build.
- Added an executable Java reference harness, committed Java-generated snapshots, core tests, and browser tests.

**Implementation notes and deviations**

- The compatibility reference is TouchGraph `TGLayout` **1.21** and `HyperScroll` **1.06**, from [componavt/wikokit at `0db2310`](https://github.com/componavt/wikokit/tree/0db2310283d792abbaa57746fe9fe475fe9e6ab8/TGWikiBrowser/src/com/touchgraph/graphlayout). This is the baseline, rather than a modified 1.22 fork.
- D3 supplies SVG joins and input gestures. The layout is a direct TypeScript adaptation of the Java calculations; `d3-force` is not used.
- Java threads became event-loop scheduling and serialized, awaitable locality animations. Equal-distance additions use stable BFS ordering instead of Java Hashtable enumeration order.
- Swing painting became SVG. CSS colors/fonts replace AWT objects, and text metrics come from the rendered SVG labels.

**Insights**

- The spring engine's rubber-band attraction, momentum, adaptive damper, 600-unit repulsion cutoff, and ten-step batches are all significant to its behavior. A generic force-layout replacement would lose that compatibility.
- Java's signed integer multiplication and truncating division matter to repulsion. The port uses `Math.imul` and truncation, and tests integer overflow explicitly.
- Locality and viewing lenses solve different problems. Hidden nodes remain in the complete graph with their coordinates and adjacency; lens changes affect draw coordinates without changing physical coordinates.
- The original nonlinear lens inverse is a sampled approximation. Its 200-entry table and extrapolation beyond radius 1990 are preserved, including the precision limitation.

## Project identity, workflow, and research references — retrospective, 2026-10-22

Recorded in commit `8c0d36c`.

**Completed**

- Documented Freshmind 4 as a partial port and continuation of Gregor Heinrich's Java Freshmind work from 2002–2011.
- Added project authorship and maintenance credit to the README, package metadata, and `NOTICE`, alongside the inherited TouchGraph attribution.
- Added `just` recipes for installation, development, library/demo builds, preview, type checking, and core/Java/browser tests.
- Added the numbered roadmap and the [2005 RFC paper](literature/rfc@3ia05compact.pdf) and [2011 community-browser thesis excerpt](literature/gheinrich-phd-thesis_p212.pdf).
- Extracted RFC implementation requirements into milestone 3 and visual-query interaction requirements into milestone 4. This completes TODO item **3.1**, not the RFC implementation.

**Insights**

- RFC is additional layout reinforcement around focal structures, not the nonlinear viewing lens already present. Its force constraints belong to milestone 3.
- The thesis excerpt demonstrates ETT-based retrieval. It provides an interaction reference for the planned LDA search work, rather than evidence that the existing browser implements LDA.
- The original Freshmind application features still require the FM 2014 source audit and port in milestone 2.

## TypeScript configuration correction — 2026-10-22

**Completed**

- Added Vite client declarations for demo CSS imports and Node type declarations for `vite.config.ts`.
- Included the Vite config in `npm run typecheck` and enabled checking of side-effect imports.

**Insight**

A successful Vite bundle does not establish TypeScript correctness. The previous type-check configuration excluded the config file and silently accepted unresolved side-effect imports. Both are now checked by `just check`.

## Milestone 1: plain TouchGraph port — 2026-10-22

Completed TODO items **1.1**, **1.1.1–1.1.4** for the graph browsing library and browser equivalents of its interactions.

### Compatibility audit

The audit checked public methods and behavior in the pinned Java `Node`, `Edge`, `TGException`, `GraphEltSet`, `Locality`, `VisibleLocality`, `GESUtils`, `TGLayout`, `LocalityUtils`, `TGPanel`, and lens classes. Java UI classes were reviewed as interaction responsibilities; their Swing class hierarchy is replaced by browser controls and gestures.

| Area | Completed coverage | Browser adaptation or explicit boundary |
| --- | --- | --- |
| `Node` | Constructors, IDs, labels, type/color/font accessors and defaults, fixed state including `getFixed`, adjacency, visibility, dimensions, and hit tests. | CSS values and SVG text measurements replace AWT. Hit tests retain the rectangular bounds convention. |
| `Edge` | Endpoints, IDs, color/length defaults, reversal, visibility, viewport intersection and Java's hit-distance approximation. Directed edges are visible in SVG. | SVG arrow markers replace Java's tapered line painting; arrows stop outside the target label. |
| `TGException` | Original error identifiers, `getId`, message/identifier constructors and tunneled exceptions. | Extends JavaScript `Error` and exposes the tunneled error through `cause` as well as `exception`. |
| `GraphEltSet` | Ordered traversal, pair callbacks, count aliases, indexing, ID and label lookup, edge lookup/deletion overloads, bulk operations, and clearing. | JavaScript iterators replace Java iterators; an empty label result is `[]`. Invalid indices throw `RangeError`. |
| `ImmutableGraphEltSet` | Exported read-only membership/traversal type used by the layout host. | Node coordinates remain mutable, as with the Java interface. |
| `Locality` / `VisibleLocality` | Visible/complete distinction, bulk removal, hidden-element deletion, endpoint counts, and synchronization from visibility flags. | Rejects visible edges with hidden endpoints and removes orphaned visible references after external model deletion. |
| `GESUtils` | BFS distance, direction and degree limits; largest connected component. | Stable traversal preserves insertion order. |
| `TGLayout` | Original force/damper equations, integer arithmetic, drag/fixed-node behavior, rigidity timing, manual stepping and timed lifecycle. | Browser timers replace threads; wall-clock timing is not Java frame timing. |
| `LocalityUtils` | Focus neighborhoods, expand/hide/collapse, complete-graph reveal, fast finish and serialized animations. | Operations return promises. Disposal cancels pending animation effects. |
| `TGPanel` | Graph construction/deletion overloads, label lookup, total/visible counts, selection, hover, bounds/coordinate helpers, visibility synchronization, graph listeners, layout replacement and lens access. | DOM/SVG events and styles replace AWT paint callbacks and the `SwitchSelectUI` handler object. |
| Lenses and view controls | Point helpers, forward/reverse lens composition, nonlinear lens, pan, zoom, rotation, viewport origin and inverse dragging. | Browser gestures and `setZoom`/`setRotation`/`setHyperbolic` replace scrollbar widgets. |
| Interaction modes | Navigation, edit mode, directed connection creation, node deletion, click selection toggling, background clearing, keyboard actions and Shift-drag rectangle selection. | Edit gestures are double-click background to add, Shift-click target to connect, and Delete/Backspace to remove a focused node. |

### Work completed during closure

- Filled the graph, model, panel, exception, and visibility API gaps listed above.
- Added directed arrow rendering, hover state, measured node bounds, and browser graph editing.
- Preserved Java's rectangle-selection semantics: choose **one** candidate inside the box, randomly if several qualify. It is not a persistent selection set.
- Cleared stale selected, focused, dragged, and hovered references after removals and locality changes.
- Fixed timed layout startup so its first batch runs even with an idle damper. Added generation checks to prevent a stopped/restarted loop from scheduling duplicate work.
- Kept the desktop graph viewport stable while the inspector changes size; the sidebar scrolls independently. This prevents a double-click's first click from moving the coordinate system before node creation.
- Added regression coverage for bulk mutation with live iterators, self-loops and parallel edges, visibility flags, stale references, hit tests, exception tunneling, screen-space selection, and timer restart behavior.
- Made the browser-test port configurable with `PLAYWRIGHT_PORT`; an occupied default port no longer requires stopping another server.

### Deliberate deviations and remaining limits

- This is a port of the graph browsing library and its browser interactions. Java applet/desktop launchers, `GLPanel`/`TGScrollPane` Swing composition, AWT `Graphics` paint hooks, and Java listener/widget classes are replaced rather than reproduced as compatibility classes. SVG/DOM and panel methods are the extension points.
- Graph editing gestures differ from the Java mouse-handler implementation. Freshmind-specific labeling editors and file formats remain in milestone 2; RFC and search remain in milestones 3 and 4.
- Edge lengths require positive integers and endpoints must belong to the graph. Directed lookup checks both endpoints, avoiding the Java implementation's ambiguous inbound-edge lookup. Anonymous nodes receive usable IDs rather than inheriting null-label failures.
- Visibility membership and endpoint counts are kept consistent even when callers edit flags or delete directly from the complete graph. Manipulate active graphs through the panel/locality APIs, or call `updateLocalityFromVisibility()` after external edits.
- Repulsion remains quadratic in visible nodes and treats nodes as points. Wide labels may overlap; adding a collision force or Barnes–Hut approximation would change the reference physics. Large-graph performance has not been benchmarked.
- The sampled nonlinear inverse can be inaccurate far from the focus. Coincident-node separation remains random unless a random function is supplied to `TGLayout`.
- A graph's mutable visibility fields are intended for one panel/locality at a time. Independent views should use separate models.

### Verification

Commands used for milestone closure:

```sh
just check
just test-java
PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_PORT=4175 just test-browser
```

- Type checking covers the library, demo, CSS declarations, and Vite configuration.
- **34 core tests**, including Java snapshot comparisons and the API/lifecycle regressions.
- Running Java reference comparison: **9 scenarios, 276 layout batches, 35 lens cases**, using relative tolerance `1e-10` (absolute `1e-10` below unit magnitude).
- **6 Chrome browser tests** cover neighborhood exploration, inverse dragging, focal-node movement, pinning, zoom, mobile layout, graph editing, hover/direction rendering, selection toggling and rectangle selection.
- Library and production-demo builds pass. Browser testing used port 4175 because the default 4173 was occupied.

Physics and lens parity are checked against running unmodified Java classes; model/API regression tests check the audited contracts in TypeScript. These are distinct forms of evidence, not a claim of exhaustive Java UI equivalence.

## Hidden-edge count focus outline correction — 2026-10-22

**Completed**

- Moved `+N` counts to a separate, non-interactive SVG annotation layer. The focusable node group now contains only its body and label.
- Left sufficient space between the count and the keyboard outline, and included the hidden count in the node's accessible label.
- Added a browser regression that checks the focus bounds, the outline/count gap, and removal of the annotation after expansion reveals its hidden neighbor.

**Insight**

A browser outlines the bounding box of the entire focusable SVG group. Placing the count inside that group enlarged a 28-pixel node's focus bounds to 45 pixels. Styling the node border alone would not correct the native focus outline; separating the annotation fixes the bounds while keeping keyboard focus visible.

**Verification**

Type checking and the production demo build pass. All **7 Chrome browser tests** pass, including the new focus-outline regression.

## FM 2014 reference analysis — 2026-10-22

**Completed**

- Completed TODO item **2.1** on branch `freshmind4/reference-analysis`: reviewed `../knowceans/knowceans-freshmind-2014/` and wrote the [reference analysis](fm2014_analysis.md).
- Inventoried 178 Java files, including 43 in the modified TouchGraph subtree; traced application wiring, model, navigation/editors, file formats, RFC and search dependencies.
- Distinguished active application paths from experimental alternatives, stubs and historical TODOs; proposed an implementation order for the remaining milestones.
- Recorded the decision to rebuild RFC from the 2005 paper and keep reinforcement constraints separate from persistent graph relations.
- Clarified the Java prototype's role as the feature reference for labels, editing, navigation, search and file I/O. Recorded the author's confirmation of LDA source availability and located the local `knowceans-lda-simple` and `knowceans-ilda` source trees, including their `org.knowceans.topics.simple` entry points.

**Implementation notes and deviations**

- This step changes documentation only. The reference tree was read without changing its sources, data, indexes or binaries; all compilation/probe outputs were temporary.
- The unmodified source compilation fails on Batik manifest metadata, then internal JDK exception imports when the aggregate Batik jar is omitted. A diagnostic build with three temporary exception substitutions compiles; it is not an unmodified-build success.
- Headless probes reproduce XML node-weight/type loss and isolated-node omission, plus untracked RFC edges, ineffective undo, repeated activation and failure on an isolated center. Broader GUI/search behavior has not been runtime-validated.

**Insights**

- Freshmind's `getType()` means semantic category, while plain TouchGraph's means shape. A literal subclass port would conflict with the current SVG renderer; model semantics and resolved visual style need separate contracts.
- The reference already contains Lucene/LDA graph-query integration, but mixes an older bundled `dirichlet.lda` backend with a partial `ir.semantic` migration. LDA source projects are available locally; selecting the required implementation and mapping these interfaces remain milestone 4 work.
- The existing RFC code is a prototype rather than a complete implementation of the paper. Rebuilding it should preserve the plain TouchGraph baseline and avoid writing reinforcement edges into user graph data.

## Freshmind feature design draft — 2026-10-22

**Completed**

- Drafted the [feature design](fm_port-design.md) for milestones **2.2–2.5** and expanded their implementation subtasks.
- Specified separate semantic and visual types, YAML configuration, labeled relations, and the Java spider/lens quadratic edge geometry with midpoint arrows and labels.
- Specified keyboard selection/preselection state, directional candidates, cycling, confirmation, cancellation, timeout, and integration with mouse navigation and editors.
- Proposed a native versioned YAML graph format and a standalone batch conversion workflow for all seven top-level legacy XML examples.
- Added a draft YAML configuration for all 21 canonical Freshmind node types and a small graph example illustrating the proposed format.
- Made the architectural constraint explicit: retain the TouchGraph design, extend `Node`/`Edge`/`TGPanel`, and add composed helpers and narrow hooks while preserving existing graph/locality/layout/lens responsibilities and plain-panel compatibility.

**Implementation notes**

This is a design/documentation step. The YAML examples illustrate proposed contracts; renderer/editor changes, native YAML runtime I/O, the converter and conversion of the seven legacy graphs remain unchecked implementation work. The Java reference tree is unchanged.

**Verification**

Both YAML examples parse with duplicate-key detection. All 21 node type IDs match Java `NodeTypes`; visual inheritance, type references, graph IDs/endpoints and the focus reference resolve. Checked the quadratic midpoint/control-point identities, local Markdown links and `git diff --check`.

## Markdown PDF recipes — 2026-10-23

**Completed**

- Added `just pdf FILE` and `just pdfs [PATHS...]` following Kibitz's Pandoc/headless Chrome workflow, with its print stylesheet and embedded Mermaid support.
- Write PDFs beside their Markdown sources as `file.md.pdf`; hash the source, rendering inputs, recipe and output to skip unchanged PDFs.
- Batch tracked/new, non-ignored Markdown files; skip deleted files, `CLAUDE.md` and `.github/` templates, and handle filenames as positional arguments with NUL-delimited discovery.
- Ignore generated Markdown PDFs and `.pdfstamps/`, preserving the source-paper PDFs. Document prerequisites, `CHROME`, network use for Mermaid and rebuilding after image-only changes.

**Verification**

Generated PDFs for the README and all four Markdown documents under `docs/`. Confirmed Mermaid diagrams render, inspected the design PDF, and verified a second run skips unchanged PDFs. `just --list` and `git diff --check` pass.
