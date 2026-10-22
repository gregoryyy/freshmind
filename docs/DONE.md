# Freshmind 4 completed work

This is the implementation record for [TODO.md](TODO.md). Entries include completed work, implementation decisions, deviations, and lessons. Earlier steps have been backfilled from the initial development work and Git history; they are retrospective records, not additional implementation claims.

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

- Completed TODO item **2.1** on branch `freshmind4/reference-analysis`: reviewed `../knowceans/knowceans-freshmind-2014/` and wrote the [reference analysis](FM2014_REFERENCE_ANALYSIS.md).
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
