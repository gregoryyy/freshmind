# Freshmind 4 completed work

This is the implementation record for [TODO.md](TODO.md). Entries include completed work, implementation decisions, deviations, and lessons. Earlier steps have been backfilled from the initial development work and Git history; they are retrospective records, not additional implementation claims.

## Current completion status — 2026-10-23

| Milestone | Status | Completed scope |
| --- | --- | --- |
| 1. Plain TouchGraph | Complete | TypeScript graph, physics, locality and lenses, with Java compatibility checks. |
| 2. Freshmind features | Complete | Types and curves, keyboard/pointer navigation, editors and content popup, YAML persistence and approved example migration; subsequent view/edge-form controls are included. |
| 3. Reinforcement Focus + Context | Partial | Star/deep-tree forces, coordinate and node/link importance weights, multiple centers, shared memberships, tree/DAG persistence, cluster-to-tree controls, a separate adaptive-damping experiment and reproducible multiple-tree comparisons. |
| 4. Graph visual search with LDA | Not started | Java/LDA sources have been located; retrieval implementation and experiments remain open. |

RFC experiment documentation (**3.5**) is complete for the implemented comparisons. The [second draft](papers/rfc-revisited-draft2.md) includes eleven drawings and a rebuilt PDF. Multiple-tree Experiments C–E cover 120 matched runs; DAG templates, clustering and nonuniform importance have functional verification only. The latest verification comprises 141 core tests, the complete 76-test browser suite, Java parity, type checking and library/demo builds. Earlier entries retain the test counts and scope at their respective checkpoints.

Remaining RFC work is tracked in TODO: focal-region exclusion (**3.2.4–3.2.5**), structural aggregation/filtering (**3.2.6**), original-paper/hybrid example reconstruction (**3.3.1**), and further exclusion/hybrid, multi-focus damping and importance comparisons (**3.4.2**, **3.4.6–3.4.7**). Node/link importance (**3.2.7**) is complete; exclusion is next. Numerical regularity, low motion and successful tests do not establish perceptual benefit or general convergence.

## Node and relation importance in RFC physics — 2026-10-23

- Completes TODO **3.2.7**. Freshmind model weights now scale added RFC stiffness independently of coordinate weights, mass and ordinary TouchGraph attraction/repulsion. Normalize with `s(w;d)=2w/(w+d)`, node default 1 and relation default 10. Symmetric relation strength is `sqrt(s(u)) sqrt(s(v)) s(e)`, bounded by four; adjacent angular moments use its geometric mean. At defaults every factor is exactly one. This bounded mapping is an explicit 2026 extension, not a recovered Java/2005 formula.
- Zero-strength relations leave the reinforcement projection and angular degree count without removing graph records. Disabled/orphaned members leave reinforcement halos; positive focal roots remain identifiable. Stored definitions retain all IDs. Stars choose the lowest eligible parallel/reciprocal ID without summing duplicates, and shared tree edges remain reinforced once. Importance is read live from model references; editor commits already wake the layout. Direct programmatic edits use the normal resetDamper/repaint calls.
- DAG template stiffness uses square-root root importance times mean incoming selected relation strength, including zero terms. Ranks/slots and incoming weights retain the complete definition through hiding. Reactions remain on the root. Shared ownership and experimental damping use contributing projections; disabling all contributions resets the damping experiment instead of retaining an inactive recovery loop.
- Added nine core regressions for finite bounds/defaults, analytical scaling, physical energy gradients with anisotropy/shared ownership, zero forces, multigraphs, shared radial deduplication, DAG hiding, unchanged ordinary integration and zero-node damping exclusion. Browser checks edit node/relation weights through the inspector, retain ordinary forces at zero importance and verify the weighted-tree projection/halos.
- Added **RFC → Weighted tree**, a synthetic seven-node/six-relation stored tree with nonuniform and zero importance. `just substructure-examples` regenerates it alongside the existing tree/DAG example. Documented the [importance contract](rfc-importance.md), updated current designs/README/roadmap and noted the neutral-weight scope of the paper's existing experiments. Nonuniform layout-quality evaluation remains separate; elliptical focal-region exclusion is next.
- Verification: 141 core tests and the complete 76-test Chrome suite pass; Java parity passes 9 scenarios, 276 layout batches and 35 lens cases. Type checking and library/demo builds pass. Re-generated single-focus, sweep, damping and 120 multi-focus JSON records remain byte-for-byte unchanged at default importance. Zero transitions are documented as discrete constraint changes, with no claim of smooth angular targets across zero or general stability from bounded coefficients.

## Browser RFC default, collapsible controls and Options menu — 2026-10-23

- Completes TODO **2.3.12**, **2.5.7** and **3.2.14**. The main browser reinforces its initial root by default. Graph/example loading carries the current RFC on/off choice to the new initial focus, replacing old activations. Removing RFC keeps subsequent loads off. The collapsed RFC heading shows On/Off/Paused without repeated live-region updates during motion; experimental adaptive damping stays off.
- Added optional `installDocument(..., {reinforceFocus: true})` as explicit application policy. Library panels/default document installation and headless experiment fixtures retain explicit activation; YAML does not store RFC activation. Empty documents now load without attempting to read node zero. A startup guard prevents an obsolete initial graph from taking focus after replacement.
- Grouped the sidebar into Graph files, View, RFC, Navigation options and Selected item, using native collapsible sections and 16 px headings. Force settings, substructures, clusters and connections have their own collapsible groups. Closing a section retains its values; keyboard annotation editing opens a collapsed inspector before focusing it.
- Moved the existing export checkboxes into a top-bar Options popover, with a larger Export options heading, close button, Escape/outside dismissal and narrow-screen sizing. Saving continues to use the same export values and companion-file behavior. Removed sidebar duplication and kept shortcut reminders within Navigation options.
- Updated README/TODO and the controlled RFC browser fixtures and flipbook baseline so their force comparisons explicitly disable the new browser default. Added checks for startup/load policy, section collapse, hidden-inspector editing, export downloads, keyboard focus and mobile menu bounds.
- Verification: all 132 core tests and 74 Chrome browser tests pass; type checking and library/demo builds pass. Inspected desktop sidebar and mobile Options screenshots. The new empty-document check exposed and fixed the previous node-zero lookup failure.

## Exclusive RFC activation and Shift toggles — 2026-10-23

- Completes TODO **3.2.13** and supersedes the earlier behavior that retained additional centers on ordinary primary replacement. Ordinary node RFC activation now replaces the whole center set, including when the chosen node is already primary. Selecting an active stored-tree/DAG root preserves its attached definition.
- Shift+Enter and Shift+double-click toggle one node independently. They can add the first center, remove a secondary or primary center, or remove the last and turn RFC off. Removing the primary promotes another existing center. Navigation reports Added/Removed; halos and controls follow the resulting state. Held-key repeats do not toggle repeatedly; editor input remains native.
- Added controller/panel/navigation toggle commands. Explicit `addFocus()` and the Add RFC center button remain additive/idempotent; `activateSubstructure(id, true)` and the browser's stored-substructure action remain explicitly additive. The default `activateSubstructure(id)` is exclusive. Selection/locality, coordinates, semantic relations and saved membership records are preserved by center-state changes.
- Updated browser help, shared/generated key maps, README and the substructure design. Regression coverage exercises both gestures, ordinary activation on primary/secondary centers, toolbar replacement, last-center halo removal, stored-definition preservation and paused-layout wake-up.
- Verification: 131 core tests and 28 focused Chrome tests pass; type checking and library/demo builds pass. All 120 multi-focus numerical records are unchanged. A lifecycle regression caught reuse of a deleted membership during ordinary activation; invalid definitions now fall back to a star. Refreshed the substructure guide and paper PDFs.

## Edge selection and keyboard focus on the rendered line — 2026-10-23

- Completes TODO **2.3.11**. Checked Java `FreshEdge.paint()`: selected relations use `SELECTED_COLOR` (#ff0000) on the edge/arrow. The port already resolves that color; the unwanted rectangular frame was the browser's native SVG group focus outline.
- Suppressed that outline in the shared Freshmind renderer. Keyboard focus adds two pixels to the actual routed stroke; selection retains its configured color after focus moves to a control. Curves, arrows, labels, hit paths and semantic selection retain their existing geometry/state.
- Removed the palette-only focus/hit-stroke CSS so both pages use the same source implementation, including library users without the demo stylesheet. Coverage checks all three curve forms, weighted widths, parallel relations, loops, selection/focus separation and pointer activation.
- Verification: 15 focused Chrome rendering/navigation tests pass; type checking and the production demo build pass.

## Multiple-focus tree experiments — 2026-10-23

- Completes TODO **3.3.4**, **3.4.5** and **3.5.3**, and closes documentation item **3.5** for the current experiments. Original-paper reconstruction, exclusion/hybrid comparisons and a separate multi-focus damping follow-up remain open.
- Added three numerical experiment families: two depth-two trees joined by ordinary context, the same trees with four extra within/across-tree leaf relations, and two trees sharing a branch and its leaves. All focal definitions remain trees. Native YAML examples are available in the main browser's RFC example group.
- Recorded 120 matched runs: three families × neither/left/right/both foci × movable/pinned roots × five perturbed initial layouts, each for 250 ten-step batches. Existing default tree forces and the original damper are retained; experimental adaptive damping is explicitly disabled. JSON includes initial/final coordinates, unchanged semantic endpoints, memberships, settings, seeds, per-tree/union errors and traces.
- Added a passive per-step displacement observer, sampling all ten integrations per batch. Tail RMS/max and eligible sign reversals expose motion hidden by net-batch sampling. Measurements distinguish each tree's local targets from merged shared neighborhoods. Repeated full generation reproduces the JSON exactly.
- Extended the second draft with Experiments C–E, four SVG/PDF/PNG drawings and a rebuilt PDF. Results retain clipped-motion outliers: extra leaf links destabilize one movable-root initialization; pinned shared roots also show large residuals and an unstable initialization. Single-focus regularity can disturb the other tree. These are small mechanism checks, not convergence/readability claims.
- Made all eleven figure captions explicit in Markdown so they print in the PDF, placed figures in numerical order, and checked the 19-page output for captions and rendered equations. All report/paper/figure links resolve; all five generated experiment outputs reproduce byte-for-byte.
- Derived a shared-root feasibility bound: a selected root path of q edges among M unique tree edges gives length RMS ≥ max(0, D−qL)/√(qM). For the shared fixture this is max(0, D−240)/√20. Also explained why a regular merged degree-four vertex has nonzero per-tree degree-three angle error. Cooling, feasibility and oscillation are reported separately.
- Added `just rfc-multifocus-experiment` and integrated it into `just rfc-paper`; the figure workflow now produces eleven drawings. Updated the README, TODO, figure index and [experiment report](experiments/rfc-multifocus/README.md). No DAG templates or clustering algorithms enter these comparisons.
- Verification: 129 core tests and 9 focused Chrome substructure tests pass, including topology/membership, matched initial states, semantic-link preservation, feasibility, exact repeatability and all three browser load/activation paths. Type checking and library/demo builds pass.

## Edge-form keyboard switching — 2026-10-23

- Completes TODO **2.3.10**.
- Restored the original FM2014 **C** edge-form shortcut and added **W** as an alias. Both cycle Spider → Lens midpoint → Straight with graph focus; editor typing and modified browser shortcuts retain their normal behavior.
- Added panel methods `getEdgeCurve()`, `setEdgeCurve()` and `cycleEdgeCurve()`. Changes use the configured default visual, retain explicit relation overrides and preserve graph coordinates. Keyboard handling lives in the library; the browser selector and explanation follow registry changes, including configuration reloads.
- Updated the shared browser/documented key map. Regression coverage checks rendered paths, selector synchronization, inherited defaults, explicit overrides, modifier filtering and editor typing.
- Verification: 43 focused model/navigation tests and 3 Chrome browser tests pass; type checking and library/demo builds pass.

## Persistent substructures, multiple RFC centers and clustering — 2026-10-23

- Added graph-owned, overlapping tree/DAG membership under `src/fm/structures/`. Definitions reference semantic node/relation IDs, have a root and label, and validate atomically. Trees select a connected acyclic relation set independently of semantic direction; DAGs retain direction, reject cycles and allow shared descendants. `getNodeSubstructures()` derives memberships without duplicating adjacency on nodes. Optional native YAML `substructures` records round-trip; files without definitions retain their previous record shape. Opening a file restores definitions without activating RFC.
- Added membership/name/kind/root editing and activation controls in the main browser through reusable `bindSubstructureControls()`. Tree creation/edits use deterministic BFS spanning relations, retaining all ordinary graph relations. DAG editing uses induced directed relations and fails cleanly on cycles. Deleting/reconnecting a structural relation or deleting a member invalidates affected definitions; context edits and hiding retain them. Active root edits migrate the center and invalidate cached topology.
- Added independent centers through Shift+Enter, Shift+double-click and an Add RFC center button. They retain existing centers, locality and the lens focus. The center selector removes one activation; Remove RFC clears all. Primary-center replacement keeps additional centers, hidden roots suspend independently, and graph replacement clears activation. Legacy state fields describe the primary center; `centers` and `memberIds` expose the whole active/stored set.
- Stored trees reinforce deeper descendants through selected radial relations and local angular neighborhoods at each vertex. DAGs use longest-path layers and ID-stable slots with root-relative target springs, using focal length as spacing and radial stiffness as the template coefficient. This is an explicit layered template, not a port of an unimplemented Java DAG layout or a crossing minimizer. Shared radial constraints and halos are deduplicated, shared angular/target constraints are attenuated, and optional damping runs once on the focal-member union. Elliptical exclusion/overlap handling and node/link force weighting remain open.
- Added detached Graphology Louvain and weak connected-component projections under `src/fm/clustering/`, exported through `fm4/fm/clustering`. Projection sums reciprocal/parallel links, ignores loops, defaults to unit relation weights and explicitly supports optional nonnegative relation weights/zero-link exclusion. Communities are split into connected pieces for tree conversion. Stable ordering/nonrandom walks reproduce results. Proposal fingerprints reject graph/weight changes while allowing position/view changes. The main browser supports algorithm, scope, resolution, weight selection, member preview and cluster-to-stored-tree activation without removing semantic relations.
- Added Graphology and its clustering libraries to the lockfile; their MIT notices and transitive dependencies are included in the production demo's `LICENSES-CLUSTERING.txt` and noted in NOTICE. TouchGraph remains the graph/physics owner; the new modules do not introduce Freshmind imports into `src/tg/`.
- Added a synthetic 12-node/13-relation **Trees and DAG** example, with a deep tree, a DAG shared descendant and a node belonging to both definitions. `just substructure-examples` regenerates it. Updated the key map, README, roadmap, [companion design](rfc-substructures.md) and draft-paper scope notes. At this checkpoint the new structures had functional tests only; the subsequent multiple-focus tree experiments above add numerical comparisons for trees. DAG templates and clustering remain outside those comparisons.
- Verified that all stored single-focus results, the stiffness sweep and adaptive-damping experiment records are numerically unchanged after this extension. 124 core tests pass, covering validation, defensive copies, YAML, lifecycle invalidation, multi-center visibility, shared-force deduplication, deeper-tree/DAG forces and deterministic/stale cluster handling. The 63-test browser suite passes, including both additive gestures, full memberships/shared halos, editing/root migration/YAML reload and cluster controls. Java parity passes 9 scenarios, 276 layout batches and 35 lens cases; type checking and library/demo builds pass.

## Separate adaptive-damping experiment — 2026-10-23

- Added `RfcStabilizer` behind an opt-in **Experimental adaptive damping** checkbox and `rfc.setStabilizationEnabled()` / `rfcStabilization` panel options. It is **off by default**, and the existing fixed-force experiments explicitly disable it. Force settings, graph data, view transforms and YAML records remain unchanged.
- Observes actual focal-node positions on every integration step. Three substantial reversal votes within eight steps halve local impulse gain, bounded below by 1/256. Votes require angle >120°, successive magnitudes >0.5 units, new magnitude ≥80% of the previous one, and reversing members accounting for >50% of displacement energy. Fixed members are excluded. Steady translation, tiny jitter and rapidly decaying oscillations are covered by regressions.
- Applies gain to accumulated impulses of movable focal nodes, including inherited momentum and earlier ordinary forces. This deliberately damps local integration rather than weakening RFC springs relative to context. The underlying zero-force equations are retained in the idealization; trajectories and final local arrangements can still change. Later registered force callbacks run after this damping.
- Requires 500 ms of quiet integration (all sampled movements ≤0.1 units) before easing gain toward one over three seconds with cubic smoothstep. Movement interrupts recovery; renewed oscillation backs off again. Long gaps and dragging discard sampling/quiet history without treating pauses as stabilization. Focus removal/replacement and suspension clear learned damping. No extra timer is created.
- Added optional `LayoutForce.needsTicks()` so a recovering extension can keep the existing runner sampling after global cooling. Without this generic activity request, plain TouchGraph scheduling and numerics are unchanged. Explicit stop remains authoritative. A mocked-runner regression caught and verifies the otherwise-stalled recovery at global damper zero.
- Recorded six off/on runs in [adaptive-damping.json](experiments/rfc-single-focus/adaptive-damping.json), using the same synthetic graphs and force settings, movable centers, radial stiffness 2, 400 batches and an injected clock at 2 ms per step. Tail net-batch motion RMS drops from 6.69492 to 0.00591 in crowded-star, 0.92606 to 0.29569 in unequal-radii and 0.15915 to zero in wide-labels. Angular/length errors do not improve uniformly. The inherited global damper can freeze residual error; small/slow modes, thresholds and the gain floor limit the heuristic.
- Extended the [second draft](papers/rfc-revisited-draft2.md) with Experiment B, an effective-damper calculation, a separate comparison table and [Figure 7](papers/figures/rfc/07-adaptive-damping.svg). The recovery plots retain incomplete annealing at the eight-second cutoff. This is an experiment, not a general convergence or layout-quality claim.
- Verification: 112 Node tests and 57 Chrome browser tests pass; Java parity passes all 9 scenarios, 276 layout batches and 35 lens cases. Type checking and library/demo builds pass. Browser coverage checks that damping is initially off, can be enabled/disabled and reports detection without changing force settings or exports. The full suite exposed an existing 100 ms inactivity-test race; capturing immediate feedback in the same browser event turn removes the protocol-latency race without changing navigation behavior.

## RFC tree constraints, soft halos and second draft — 2026-10-23

- Checkpointed the prior implementation as `8414b9a` before changing its physics. Added explicit focal target length and radial stiffness independently of the existing attraction multiplier and angular stiffness. The default Tree structure preset uses multiplier 1, radial stiffness 1, weighted target length 120 and angular stiffness 10000; Attraction only preserves the earlier multiplier 3 / angular stiffness 300, with the new spring disabled. Presets retain focus and coordinate weights. No node/link force weighting is implied; 3.2.7 remains pending.
- The new force is the negative gradient of `k · rigidity · (sqrt(D² + 1) − L)² / 2`, providing expansion under compression as well as contraction under stretch. Tests verify signs, weighted numerical energy gradients, equal/opposite reactions and finite coincident behavior. Stronger ordinary attraction alone shrinks a star because TouchGraph's edge-length parameter is not a rest length.
- Added soft yellow halos beneath active focal nodes and representative reinforced relations. Gaussian blur fades the combined silhouette outward without a node rim; node shapes and routed edge geometry are reused. The noninteractive, aria-hidden group stays outside node focus bounds. Controller changes queue a coalesced repaint, so activation/removal works with the layout paused. Hidden centers, graph replacement and destruction retain existing lifecycle ownership.
- Repeated Return or double-click on an already centered node transfers an enabled RFC focus and wakes the layout. The first center command still centers normally; disabled RFC remains disabled. Navigation uses an optional host extension rather than importing RFC. Updated the shared key map and browser hints.
- Expanded reproducible experiments to baseline, earlier attraction and combined-tree profiles; strong-angle and length-only ablations; a 48-run stiffness sweep; movable-center comparisons; and a rigidity experiment. All inputs are synthetic. At 250 batches the combined crowded-star profile reduces angular RMS from 0.2793 to 0.0309 and length RMS from 53.07 to 5.56 relative to the earlier preset. Ablations show much of the angular improvement comes from stronger angular forces. Wide-label length error increases against the bunched earlier profile, so no universal improvement is claimed.
- Wrote the [second draft paper](papers/rfc-revisited-draft2.md) and six reproducible SVG/PDF/PNG figures. The paper reviews the 2005 proposal, derives the unequal-radius chord discrepancy and analyzes the actual retained-momentum recurrence: smooth-mode stability requires `0 < dκ < 2 + d`. A movable regular six-branch center introduces radial curvature up to `4k`, versus `k` when pinned. Lowering rigidity from 1 to 0.25 in the stiff k=2 experiment reduces final net batch movement from 29.3014 to 0.0229. The analysis is local; clipping, changing geometry and adaptive damping prevent a global convergence claim. Alternative solvers/stiffness-aware damping are discussed, not enabled.
- Added `just rfc-figures` and `just rfc-paper`, including the existing PDF workflow. Updated the production flipbook to compare attraction and target-length variants with soft halos.
- Verification: **104 Node tests**, **56 Chrome browser tests**, type checking and library/demo builds pass. Browser regressions cover shape/curve alignment through viewing transforms, paused activation/removal, selection through halos, both repeated-center gestures and disabled RFC. These experiments are not a user study or a label-overlap/large-graph benchmark.

## RFC weighted coordinates (3.2.3) — 2026-10-23

- Resumed RFC on `freshmind4/rfc-single-focus`, based on navigation commit `ec24992` / PR #12. The navigation PR contains no RFC physics or experiment tooling.
- Scope clarification: coordinate weighting does not implement weighted nodes or links. Their fields/editors/serialization are ported, but RFC never reads `getWeight()`; Java node-weight force experiments were commented out. Added explicit force-weighting task 3.2.7 before exclusion; it remains unimplemented.
- Added physical coordinate weights `{x, y}` for the paper's distance `D² = λx dx² + λy dy²`, with default (1, 1). Equal metric angles can form an ellipse, allowing horizontally extended labels more space. Weights of (0.25, 1) correspond to an ideal 2:1 horizontal aspect; graph/canvas zoom and viewing-lens strength remain independent.
- Retained equation (1)'s direct angular law and applied the equation (2) metric consistently. Angular forces use the derivative of weighted `atan2`; radial reinforcement uses the gradient of `c D³/3`. The unchanged baseline TouchGraph forces remain isotropic. This is an explicit metric adaptation, not an implementation of the paper's pairwise approximation or a renderer-dependent label collision solver.
- Added atomic validation, defensive nested copies, optional reusable weight inputs and main-browser controls. Activation/removal returns graph keyboard focus. Values must be finite in 0.01–100; the one-unit weighted soft core keeps near-center moments bounded. No semantic nodes/edges or saved RFC state are introduced.
- Added a synthetic wide-label comparison and native initial graph beside the two prior fixtures. Both baseline and RFC angle metrics use the same configured weights; physical-angle RMS is reported separately. Unit-weight fixtures retain their previous results exactly. The weighted fixture improves weighted gap RMS from **1.5182 to 1.3571 rad** after 250 batches, with substantial residual crowding from competing context springs. Weights alone do not clear a focal region; elliptical exclusion (3.2.4) remains next.
- Verification includes numerical energy gradients, equal opposite reactions, regular elliptical stars, default-force identity, extreme weights/low-degree/singular cases, unchanged graph exports, lens independence, real browser controls and deterministic repeated runs. The walkthrough adds the weighted example. **100 Node tests**, four targeted RFC Chrome tests, type checking and library/demo builds pass. The production walkthrough contains **14 steps**.

## Scroll mapping and graph keyboard focus — 2026-10-23

- Corrected vertical scrolling to adjust graph-distance zoom, keeping node/label sizes fixed. Horizontal scrolling continues to adjust focus/context; diagonal events choose their dominant axis. Pinch/Ctrl+wheel still scales the complete canvas around the pointer. Reused normal D3 wheel sensitivity for pixel/line/page deltas and retained panel zoom limits; extreme deltas remain finite. The plain TouchGraph wheel behavior is unchanged.
- Reproduced a rotation shortcut failure on the active development server after loading an example or pressing the motion button: focus remained on the page/control, so the SVG keyboard binding received no key event. The rotation lens and shortcut worked after explicitly focusing a graph node. Prior rotation tests forced SVG focus and missed this user flow.
- Added `TGPanel.focusGraph()` for explicit focus handoff after graph actions. Successful loading returns focus when it remains on the loader or page, preserving a different control/editor entered during loading. Navigation, whole-graph, motion and canvas-toolbar actions also return focus. Sliders and text fields retain native keyboard behavior; no global shortcut interception is added. The reported browser/system-key behavior remains unconfirmed; this fixes the reproduced focus loss.
- Updated browser gesture hints and the shared key map. Regression coverage checks rotation immediately after control actions/example loading, vertical spacing with fixed object sizes, scroll direction/limits and delta units, independent pinch anchoring, and editor exclusions. A delayed-load test caught inspector focus loss during replacement; focus is restored to the still-available field before considering a graph handoff.
- Validation of the isolated navigation changes: **87 Node tests and 48 Chrome browser tests pass**; type checking and library/demo builds pass. The Node suite used `PATH=/usr/bin:$PATH` to select the working system Python because the local Homebrew Python 3.15 Expat extension cannot load.

## Keyboard view rotation — 2026-10-23

- Ctrl+Shift+Option/Alt+Left/Right rotates the view counterclockwise/clockwise in 5° steps, including held-key repeats. Up/Down with the same modifiers retains canvas zoom.
- Uses the existing rotation lens, preserving physical node positions, upright labels, both zooms, focus/context strength, membership and selection. Frozen preselection order survives rotation and its inactivity timeout is rearmed. Input remains scoped to graph focus; editors keep native key behavior.
- Added `TGPanel.getRotation()` alongside `setRotation(radians)` and a shared navigation `rotateBy(radians)` command. The generated key map and browser help share the new binding. Rotation continues to use the existing saved-view field.
- Validation: **97 Node tests and 17 targeted Chrome tests pass**, as do type checking and library/demo builds. Regenerated the 13-step production flipbook. Coverage includes clockwise/counterclockwise rendered geometry on both browser pages, upright text, unchanged graph/view state, modifier filtering, editor exclusion and candidate timeout behavior.

## Node-content popup and public example graphs — 2026-10-23

- Restored the FM2014 hint-frame behavior as a reusable `bindNodeDetails` binding in `src/fm/ui/node-details.ts`: modeless, resizable, scrollable node content with title, ID/type and explicit linked-resource access. It follows selection while open, anchors near the node using both view transforms, clamps to the viewport and preserves scroll/content selection during layout motion. Relation details retain their inspector view.
- Space toggles node content; Escape or Space inside its reading area closes it and restores selected-node keyboard focus. Native buttons/links retain their Space behavior. Ctrl+Space and **Edit content** hand off to the existing inspector. The popup reads committed content while the inspector retains unsaved per-item drafts; this avoids a second editor/draft owner. HTML uses the existing inert-template allowlist, and internal `#node=ID` links can navigate hidden stored nodes through the application callback. Unknown targets report status without adding edges.
- Adaptation from Java: a DOM popup replaces the Swing hint frame, and source editing remains in the shared inspector rather than recreating its separate HTML editor. Legacy `file:#...` retrieval links and search-driven edge insertion are not introduced; native node links use stable IDs. Selection deletion/clear and graph replacement reset detail state. Cleanup removes the popup and subscriptions while leaving panel/controller ownership with the caller.
- Added three independent public examples from pinned NetworkX 3.4.2 sources: **Florentine families (15 / 20)**, **Zachary's karate club (34 / 78)** and **Les Misérables (77 / 254)**. Graph-derived content provides degree summaries, weighted neighbor lists and internal navigation links. Source weights, original node identities and karate membership survive conversion; undirected relations have no arrowheads. Les Misérables starts with Myriel's bounded neighborhood.
- `just public-examples` regenerates them offline using a literal Python AST reader and the native TypeScript codec. Vendored source, full BSD notice, SHA-256 provenance and original references are retained in [examples/public/](../examples/public/README.md); the production demo emits the full NetworkX license. These datasets do not broaden the Java converter's `berry`/`nips-fm` allowlist.
- Learning: the pinned karate adjacency matrix has asymmetric weights. Matching NetworkX requires row-by-row undirected insertion with the later nonzero reverse entry winning; an upper-triangle-only import loses one edge and changes several weights. Tests independently compare all source pairs/weights, memberships, degrees, links and complete native round trips.
- Validation: **96 Node tests and 48 Chrome browser tests pass**; TypeScript checking and library/demo builds pass. Tests include public-data integrity and explicit detail-state lifecycle. Chrome popup coverage checks modeless operation, scrolling through graph motion, focus return, mobile bounds, HTML filtering without resource loading, hidden links, unknown links, editor-draft handoff, deletion and all three public example loads. The generated flipbook includes the public graph and content popup.

## Generated usage flipbook — 2026-10-23

- Added `just flipbook`, following OrgFab's scripted capture/walkthrough pattern, with a local runner and tour using the existing Vite and Playwright dependencies.
- Builds the production demo, serves it on a dedicated loopback port (available port by default), drives headless Chrome and writes fourteen numbered screenshots, Markdown, a portable HTML viewer and a machine-readable manifest under `docs/flipbook/`. Buttons, arrow keys, Home/End and per-slide hashes navigate the viewer. `--output`, `--port` and `--channel` are optional overrides.
- `scripts/flipbook/tour.mjs` is the editable source for the ordered acts and captions. Steps cover the browser/neighborhood, graph/canvas/lens controls, help, type palette, approved Berry data, public Florentine families, inline labels/content popup, YAML download, synthetic RFC before/after and the approved NIPS-FM neighborhood. Layout is paused using the actual motion control and advanced through explicit batches; the RFC pair reloads identical initial data and uses matching view scales. No proprietary graphs are accessed.
- Captures into temporary storage and publishes only after every step succeeds. Regeneration replaces/removes only previously generated manifest-listed files; unrelated outputs remain. Invalid output directories and busy requested ports fail without deleting content or taking over another server. The runner closes its own browser/server and removes temporary captures on exit.
- Verification: generated and regenerated all **14 production-build steps** successfully, inspected edit/RFC screenshots, checked PNG dimensions and every image in the offline HTML viewer, and exercised buttons, arrow/Home/End keys, direct slide hashes and mobile overflow. Busy-port refusal preserved a live test server, and an unrelated output directory remained untouched. Script syntax, recipe argument forwarding and whitespace checks pass.

## RFC foundation and single-focus reinforcement — 2026-10-23

**Completed**

- Wrote [rfc-design.md](rfc-design.md), using section 2.2/equation (1) of the author's 2005 paper. Added `src/fm/rfc/` with a headless controller, focal-star extraction, detached state/metrics and force helpers, exported through `fm4/fm/rfc` and the existing Freshmind entry points. Completes TODO **3.2.1–3.2.2** and the initial experiment subtasks; milestone 3 remains open.
- Added a generic `TGLayout.addForce()` hook after baseline attraction/repulsion and before existing integration. RFC adds representative radial attraction and paired angular moments; TouchGraph retains momentum, locality weighting, damping, displacement caps, dragging, fixed nodes and scheduling. With no active RFC, no additional force arithmetic runs.
- `FreshmindPanel.getRfc()` owns a disabled-by-default controller and one registration on its current layout. Layout replacement detaches the old callback and attaches the new one. Graph replacement/clearing removes activation. Hidden centers suspend, visible restoration resumes, deleted centers clear, repeated activation is idempotent, and destruction removes callbacks/listeners. Selection, neighborhood origin, lens focus and RFC center remain independent.
- Added reusable `bindRfcControls()` under `src/fm/ui/` and main-browser controls for activation/removal, spring multiplier, angular stiffness and status. Configuration validates atomically. Controls/listeners dispose independently of controller ownership; unchanged status text is not rewritten on every animation frame.
- Added two synthetic competing-context fixtures, embedded-type YAML initial graphs, deterministic report data and a matplotlib SVG comparison under [experiments/rfc-single-focus/](experiments/rfc-single-focus/README.md). `just rfc-experiment` regenerates fixed-coordinate/seeded runs; `just rfc-plot` renders recorded results. No original/proprietary datasets or Java sources are changed.

**Implementation decisions, deviations and lessons**

- Use equation (1)'s angular law directly, rather than equation (2)'s longitudinal approximation. Moments become tangential impulses with equal opposite center reactions; a one-unit soft core bounds the zero-radius denominator. Different branch radii retain the same target angle. This implements the paper's mechanism with explicit integration choices, not numerical parity with the unfinished Java RFC prototype.
- The first focal primitive is a visible depth-one star. Direction is ignored, loops are excluded, and parallel/reciprocal relations share one branch. The lexically smallest relation ID supplies the representative radial spring length; baseline semantic relations all remain simulated. Cyclic order is recalculated in physical coordinates with stable ID ties, so lenses cannot change constraints and crossings do not leave stale winding.
- Reinforcement constraints never enter semantic adjacency or serialized records. Removal stops additional forces without rewinding positions/momentum; fixed-node positions and optional layout exports still retain the actual layout normally.
- Default spring multiplier **3** and angular stiffness **300** are port tuning values. At **250 batches × 10 steps**, angular-gap RMS changes from **1.1308 → 0.2793 rad** in the crowded-star comparison and **1.2774 → 0.2903 rad** with unequal radii. Mean focal radius also contracts (**134.92 → 78.01** and **138.35 → 84.34**). These are two pinned-center/context fixtures, not a general readability, crossing, overlap or convergence result. The report retains all coordinates, settings and traces so that tradeoff is visible.
- Weighted distances, elliptical exclusion, multiple foci/shared branches and structural aggregation are still pending. The synthetic single-focus examples do not reconstruct the paper's two-focus/hybrid figures. Native files do not yet persist RFC settings or activation; the derived constraints remain transient.

**Verification**

- Type checking, library/demo builds, **93 Node tests** and the full **44 Chrome browser tests** pass. New tests cover analytical moments/reactions, representative radial forces, multigraph/locality handling, singular/low-degree stars, atomic/idempotent lifecycle, old/new layout registrations, fixed/dragged positions, unchanged semantic exports, exact repeatability and the real control/file flows.
- Running the unmodified Java comparison still passes **9 scenarios / 276 layout batches / 35 lens cases**. Both synthetic native files preserve their complete **9-node / 12-relation** records through YAML round trips. The generated SVG and actual browser layout were visually inspected; `just --list` and whitespace checks pass.

## Graph-spacing and canvas keyboard mapping — 2026-10-23

- Assigned Ctrl+Shift+↑/↓ to graph spacing and Ctrl+Shift+Option/Alt+↑/↓ to canvas zoom. Ctrl+↑/↓ remains a graph-spacing alias; Ctrl+Shift+←/→ still adjusts focus/context and Ctrl+Shift+1 resets canvas scale. The triple-modifier arrow chord is the explicit exception to ignoring Alt input; other Alt chords retain normal behavior.
- Updated both pages' help/tooltips, shared key-map rows, generated user guide, README and current design. Earlier DONE entries record the mappings at their implementation dates; this entry supersedes their canvas-arrow bindings.
- Regression checks cover independent zoom levels, limits/repeat, unchanged physical coordinates and selection, candidate timeout rearming and editor isolation.
- Verification: type checking, library/demo builds, **83 Node tests** and **15 targeted Chrome navigation/zoom tests** pass.

## Reusable browser controls and original artwork — 2026-10-23

- Moved key-map help and graph/canvas zoom bindings from `demo/` into `src/fm/ui/`, exported through `fm4/fm/ui` and `fm4/fm`. Applications supply elements and receive explicit disposers. Optional help CSS ships separately; core entry points remain independent of DOM modules. Demo pages retain only element lookup and lifecycle wiring.
- Help dialogs use unique label IDs, an optional F1 scope and configurable editing/file rows. Binding cleanup removes owned navigation actions without clearing another registration's replacement. Zoom cleanup removes both DOM listeners and panel subscriptions.
- Restored nine original artwork files from the Java reference: Freshmind GIF/PNG, splash GIF, Arbylon GIF and background JPEG, plus all four original PSD documents. Copies are unchanged and verified by SHA-256, with provenance, roles and dimensions in `assets/artwork/fm2014/`. The local reference has no Git metadata; no source revision is invented. The archive does not change browser branding or enter the npm package.
- The original split treated page-specific element lookup as demo code, but also stranded reusable bindings there. Explicit element contracts keep application layout outside the library while making controls available to consumers.
- Verification: type checking, library/demo builds and **82 Node tests** pass. **15 targeted Chrome tests** cover existing help/zoom/editor flows and an independent two-browser consumer with cleanup. Public UI imports resolve and the npm package includes declarations/CSS. All nine artwork copies and manifest hashes match the reference.

## Milestones 2.4–2.5: editors, native files and approved examples — 2026-10-23

**Completed**

- Added [KEYMAP.md](KEYMAP.md), adapted from the Java reference's `keys.txt`. `src/fm/navigation/keymap.ts` supplies the same implemented command rows to accessible browser help and `just keymap` generates the Markdown. Both pages expose a Key map button, graph-scoped ? and F1 help. The reference lists historical capabilities too; the guide explicitly distinguishes unported search, clipboard, creation, 3D and export shortcuts from current controls.
- Completed node/relation inspector fields: labels, semantic types, weights, node annotation format/source and URL, relation endpoints/direction and spring length, named visual settings/overrides, application metadata and extensions. Advanced mappings use strict YAML. F2/Ctrl+Enter opens inline labels; Ctrl+Space opens annotations, R reverses relations and L explicitly opens supported resources. Existing creation/deletion/connection and text-wrapping/hidden-count features remain in place.
- Inline node editors use the transformed body center; relation editors use the shared curve label anchor. They follow layout, graph/canvas zoom, lens changes and resize. Shared drafts survive selection changes; clicking away never commits. Ctrl/Cmd+Enter or single-line Enter commits, Escape cancels, and completion restores graph focus. Inspector and inline paths use the same validated commands.
- Added strict version-1 `.fm.yaml` parsing/writing under `src/fm/io/`, with a separate `fm4/fm/io` export. Supports embedded or caller-resolved companion type files, document metadata/extensions, complete ordered graphs, optional positions and saved view settings. Unknown ordinary fields, duplicate IDs/keys, invalid references, malformed numbers, aliases, merge keys and custom tags fail before installation. Unknown semantic/visual IDs survive with fallback diagnostics. YAML 1.2 is authoritative; the writer also quotes strings ambiguous to YAML 1.1 readers, including dates, while retaining multiline block scalars.
- Added browser Open/Save controls, Ctrl/Cmd+O/S and a Ctrl/Cmd+Shift+S filename dialog. Opening a graph and companion files validates a detached document before replacement. Export includes the complete stored graph, including hidden/isolated nodes, loops and parallel edges. Options control layout/view and embedded/companion types; fixed-node positions are always written. Both graph and type downloads were exercised.
- Implemented allowlisted XML batch conversion for **only `berry` and `nips-fm`**, with shared type configuration, source hashes and [conversion reports](../examples/fm2014/conversion-report.json). Berry has **21 nodes / 22 relations**; NIPS has **3,777 nodes / 5,257 relations**. The legacy-example group offers only those examples and opens NIPS with a bounded neighborhood. Other reference datasets are proprietary and excluded from converted artifacts, regression data and distribution. Both the Node driver and Python reader enforce the allowed input names.
- Added `just convert-fm2014`, `just validate-examples` and optional independent source auditing. Every approved source ID, label, hint, URL, semantic type, relation endpoint and stroke matches its converted output. Complete normalized native round trips also retain metadata/extensions. Synthetic XML cases cover numeric-type/weight recovery, missing-target placeholders, backward relations and unsupported fields without copying proprietary datasets.

**Implementation notes, deviations and lessons**

- Freshmind remains an extension of TouchGraph. `FreshmindDocument` aggregates the existing complete `FreshGraph`; snapshotting does not insert its relations into a second adjacency owner. Parser-free transfer/view types and editing commands remain in the core dependency closure, with YAML, DOM details, file-picker/download UI and migration tools outside it.
- Commands validate detached candidates before live mutation. `FreshGraph.reconnectEdge` preserves relation identity and graph order while updating endpoint adjacency, including twice for self-loops. The optional visible-locality context removes old incidence before rewiring and re-adds only when both new endpoints are visible. A relation moved outside the current neighborhood remains stored and its stale selection clears.
- Annotation HTML is parsed in an inert template and copied through a formatting/link allowlist. Original HTML remains untouched in the model/export. Scripts, attributes, styles, embedded resources and active elements are not rendered; internal `#node=ID` links use graph identities. Legacy local paths remain data because a web browser cannot launch arbitrary original desktop resources. This is a source editor with sanitized viewing, rather than the Java rich HTML editor or desktop resource launcher.
- The original seven-example conversion plan is superseded by the user's two-dataset restriction. The converter never scans for graph inputs, launches Java, rebuilds indexes, opens resources or changes source XML. Neither approved original requires placeholder or weight recovery. Genuine weight fields take precedence over optional numeric-type recovery; ambiguous conflicts fail, and original/unknown XML fields remain in `extensions.fm2014`.
- Browser saving downloads files instead of replacing an open local file or creating Java-style backups. Companion reads use only caller-supplied contents; the codec performs no filesystem/network operations. Exports serialize committed changes; editor drafts remain separate. Custom lens chains and the old draft horizontal-stretch setting are outside version 1. The supported view contract stores both lens pan and canvas pan: pan-only centering can otherwise appear to lose its position on reload even when both zoom levels survive.
- Label/type/style suffix parsing is replaced by explicit editor fields and YAML visual mappings, preserving stable identities and duplicate labels. HTML source, unavailable URLs, query metadata and unknown type IDs are retained independently of presentation. Runtime legacy XML/FMG/OWL/database adapters, RFC and retrieval are not added by these milestones.

**Verification**

- **81 Node tests** and **40 Chrome browser tests** pass. Regressions cover native schema failures, companion resolution, full-record round trips, complete hidden membership, view restoration, atomic edits, endpoint/loop incidence, annotation sanitization/no external image loading, inline anchors/drafts/focus, help/editor/file shortcuts, both approved examples and filename/companion downloads. Type checking and library/demo builds pass. Java parity remains **9 scenarios / 276 layout batches / 35 lens cases**. Independent source-to-YAML auditing passes for both approved datasets.
- Production-bundle checks exercise the actual key map, inline/annotation commits, complete YAML download, Ctrl+O file chooser from an inline editor, failed-load/draft preservation, unknown-type diagnostics, both bundled examples and mobile overflow. Palette help exposes only its supported navigation/view/help commands. No source-file modification or external-resource access is required by these flows.

## FM2014 view keys and horizontal scrolling — 2026-10-23

- Moved focus/context to Ctrl+Shift+←/→ (five percentage points) and horizontal two-finger scrolling. Restored FM2014's Ctrl+Shift+↑/↓ canvas magnification and Ctrl+Shift+1 neutral scale, retaining the port's 1.2 zoom steps and 15–500% limits. Ctrl+↑/↓ remains graph spacing and +/− (=) remains an additional canvas shortcut. These are deliberate port mappings: Java used Alt arrows for graph zoom/fisheye and +/− for graph zoom. Reset recognizes the physical Digit1 key as well as 1/!, including layouts whose shifted key differs.
- Horizontal wheel handling lives in the Freshmind DOM navigation adapter, leaving TouchGraph's canvas gestures separate. It consumes unmodified horizontal-dominant wheel events before D3 zoom; vertical-dominant events and Ctrl+wheel trackpad pinch reach canvas zoom. Delta units normalize pixels, lines and pages; focus/context changes continuously at one percentage point per 20 pixel-equivalent units and clamps to 0–100. Consuming horizontal input at the bounds also prevents it from scrolling the page. Each event chooses one operation, avoiding simultaneous lens and canvas adjustments from diagonal jitter.
- Both modes route through existing navigation commands, preserving committed selection, locality, physical coordinates, candidate order and inactivity rearming. Embedded text editors keep their keyboard and scrolling behavior. Whole-percent slider/status readouts avoid long fractional values during fine trackpad input. Updated both pages, tooltips, README and TODO.
- Verification: **74 Node tests** and **15 targeted Chrome browser tests** pass, covering both pages, canvas key repeat/limits/reset, horizontal scrolling and clamping, diagonal routing, line/page units, pinch passthrough, editor isolation, control synchronization and retained preselection. Type checking and library/production-demo builds pass. Both production pages also pass actual keyboard and horizontal-wheel input checks with unchanged graph coordinates.

## Separate graph-distance and canvas zoom — 2026-10-23

- Retained TouchGraph graph zoom through `getZoom` / `setZoom` / `zoomBy`: node centers spread or contract before the nonlinear lens while graphical objects retain their renderer sizes. Lens pan scales with graph zoom so a centered node stays centered. Added independent `getCanvasZoom` / `setCanvasZoom` / `canvasZoomBy` for scaling the complete drawing. Both clamp to 15–500% and preserve world coordinates and layout physics.
- Added a graph-spacing slider and percentage to both pages. Vertical wheel/pinch and the toolbar scale the complete canvas; the toolbar percentage resets canvas scale to 100%. Ctrl+↑/↓ retains graph zoom, +/− (also =) controls canvas scale, and Ctrl+Shift+←/→ controls focus/context. Keyboard/toolbar commands share the navigation controller and its candidate timer handling.
- Canvas scaling uses a parent SVG group around all renderer layers. Labels, strokes, curved relations, midpoint arrows, hidden-edge counts and shape-matching focus frames therefore scale together. Node draw positions, edge geometry and programmatic hit tests remain in renderer coordinates. Added `drawToScreen` / `screenToDraw` and corrected `getCenter` to include the canvas transform. Pointer, drag, edit creation and rectangle-selection gestures use the scene's inverse SVG transform before the inverse viewing lenses.
- Background pan now translates the complete scene directly in screen pixels, after the nonlinear lens and rotation. Wheel zoom anchors the pointer; toolbar/API zoom anchors the viewport center. Centering resets canvas pan while retaining both scales; resizing retains pan relative to the new viewport center. Dragging the viewing-focus node compensates lens pan without overwriting canvas state.
- The reference `CanvasTransformer.java` is the source of the two-stage distinction. Its singleton and incomplete center-translation behavior are replaced with per-panel state and explicit center/pointer anchors. Canvas scale belongs outside the lens chain: a positional lens alone cannot scale text, node bodies or strokes. Keeping geometry local also avoids duplicating shape clipping and curve calculations for each zoom level.
- Verification: type checking, library/production-demo builds, **73 Node tests**, **31 Chrome browser tests** and Java parity (**9 scenarios, 276 layout batches, 35 lens cases**) pass. New regressions measure independent spacing/object/font scaling on both pages, limits, reset, pointer/center anchors, resize, combined inverse dragging including focus release, curve picking, centering, edit creation, rectangle selection and candidate timer preservation. Both production pages were also checked with actual toolbar and keyboard input.

## Zoom and focus + context keyboard controls — 2026-10-23

- Added graph-scoped Ctrl+↑/↓ zoom (factor 1.2 per step) and Ctrl+Shift+↑/↓ focus + context adjustment (five percentage points). Both permit key repeat, clamp through existing view limits, work without a selection and preserve graph data, locality and frozen candidates. View commands restart candidate inactivity expiry.
- Routed the registered Ctrl chords through the navigation controller before rejecting other modifiers. Text entry, composition and unregistered browser chords keep their normal behavior. Toolbar zoom buttons share the controller's zoom command.
- Added `TGPanel.getHyperbolic()` alongside the existing setter. Main-browser and palette sliders read the panel's lens strength after view changes, including keyboard/programmatic changes, without duplicating view state.
- The 2014 `FreshKeys.java` snapshot used Alt+↑/↓ for zoom and Alt+←/→ for fisheye; this implementation uses the Ctrl and Ctrl+Shift bindings requested for the port. RFC and layout physics are unaffected.
- Type checking, library/demo builds, **70 Node tests** and **26 Chrome browser tests** pass. New regressions cover limits, repetition, state preservation, timer rearming, editor isolation, measured zoom geometry and slider synchronization on both pages. The production bundle was also checked with actual keyboard input.

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
- Keep the PDF stylesheet and Mermaid header under `scripts/pdf/`, alongside the other development tools; the recipes resolve their paths from the repository root.
- Write PDFs beside their Markdown sources as `file.md.pdf`; hash the source, rendering inputs, recipe and output to skip unchanged PDFs.
- Batch tracked/new, non-ignored Markdown files; skip deleted files, `CLAUDE.md` and `.github/` templates, and handle filenames as positional arguments with NUL-delimited discovery.
- Ignore generated Markdown PDFs and `.pdfstamps/`, preserving the source-paper PDFs. Document prerequisites, `CHROME`, network use for Mermaid and rebuilding after image-only changes.

**Verification**

Generated PDFs for the README and all four Markdown documents under `docs/`. Confirmed Mermaid diagrams render, inspected the design PDF, and verified a second run skips unchanged PDFs. `just --list` and `git diff --check` pass.
