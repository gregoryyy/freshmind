# Freshmind 4 milestones

Develop the browser in stages: establish a plain TouchGraph baseline, restore Freshmind functionality, then add reinforcement and graph visual search.

Completed work, implementation notes, deviations, and lessons are recorded in [DONE.md](DONE.md).

The [ROAD document](ROAD.md) researches modern applications, RFC/visual-search
techniques and libraries, and proposes a radius-two adjacency view. Its research
and interactive design are complete; implementation/evaluation tasks in milestone
6 below are proposed future increments.

**Current status:** Milestones 1–3 are complete within their agreed scope. Milestone 4
now uses elasticlunr for literal retrieval and LDA semantics for FM 2014 feature
parity; embeddings are deferred. Tasks 4.8–4.12 describe a superseded plan, not
unfinished requirements under the latest direction. Milestone 5 covers node and
relation-label readability. RFC and visual search realize the ideas described in
the reference text; exact figure layouts, crosshairs and labels are outside scope.
See the [search direction](search-module-integration.md),
[parity limits](fm2014-retrieval-parity.md) and [implementation history](DONE.md).

## Source material

- [Reinforcement Focus+Context (2005)](literature/rfc@3ia05compact.pdf): RFC layout mechanism, equations (1)–(2), and single-focus, multiple-focus, and hybrid examples.
- [Freshmind community browser (2011), thesis excerpt, pp. 212–213](literature/gheinrich-phd-thesis_p212.pdf): Figure 10.17 and the accompanying description of typed relations, neighborhood navigation, annotations, and visual queries.

## 1. Port plain TouchGraph

- [x] 1.1 Complete the TypeScript port.
  - [x] 1.1.1 Port the core graph model, spring layout, locality browsing, and lens pipeline.
  - [x] 1.1.2 Validate layout and lens behavior against the Java reference.
  - [x] 1.1.3 Audit remaining API and interaction gaps against the Java reference.
  - [x] 1.1.4 Complete the remaining compatibility work within the plain TouchGraph scope.

See the [milestone 1 compatibility audit and completion record](DONE.md#milestone-1-plain-touchgraph-port--2026-10-22) for supported APIs, browser adaptations, verification, and remaining limits.

## 2. Port Freshmind functionality from FM 2014

Use the Java FM 2014 prototype as the feature reference for labels, editing, navigation, search, file I/O and related behavior; it is essentially the version of Freshmind developed through 2011. Recover these features from the source and complete or correct unfinished behavior during the port.
Use the thesis excerpt as a reference for browser behavior and presentation.

Reference project: `../knowceans/knowceans-freshmind-2014/`. The [source analysis](fm2014_analysis.md) records active features, incomplete paths, dependencies, defects and the proposed port order.

The [Freshmind feature design](fm_port-design.md) specifies milestones 2.2–2.5, with supported YAML type configuration and a native graph example. It preserves the Java feature intent while introducing a native YAML format and batch migration of the existing examples.

Keep the existing TouchGraph design as the foundation. Add Freshmind through model/panel subclasses, composed helpers and narrow default-compatible hooks; retain the graph/locality structure, layout, lenses and existing API behavior.

- [x] 2.1 Review the FM 2014 source and identify the components and dependencies to port.
- [x] 2.2 Add model types, visual types and labeled curved relations.
  - [x] 2.2.1 Extend `Node`/`Edge` with Freshmind subclasses for semantic types and metadata, retaining graph identity and keeping semantic types separate from TouchGraph shape types.
  - [x] 2.2.2 Add visual types and style resolution for shapes, colors, fonts, strokes and interaction states.
  - [x] 2.2.3 Load type definitions and visual styles from YAML; use the existing Freshmind types/palette as the first configuration.
  - [x] 2.2.4 Support independently editable relation labels and semantic types, including authoring and citation relations.
  - [x] 2.2.5 Restore the distinctive Java curved-edge rendering, including spider/lens modes, midpoint arrows and relation-label placement.
  - [x] 2.2.6 Share curve geometry across rendering, hit testing, selection and editor positioning; cover parallel edges and self-loops.
  - [x] 2.2.7 Add `FreshmindPanel` and the required creation/presentation hooks while preserving ordinary `TGPanel` defaults and compatibility checks.
  - [x] 2.2.8 Integrate Freshmind types, node shapes, labeled relations and curve controls into the main graph browser, alongside the separate palette explorer.
- [x] 2.3 Port Freshmind navigation behavior and integrate it with the browser interactions.
  - [x] 2.3.1 Extend existing panel selection/focus with edge selection and temporary keyboard preselection, using its selected node as the navigation anchor.
  - [x] 2.3.2 Restore directional neighbor/edge navigation, candidate highlighting/cycling, confirmation, cancellation and timeout behavior.
  - [x] 2.3.3 Integrate mouse selection, keyboard shortcuts, details and editing without intercepting text-entry or browser controls.
  - [x] 2.3.4 Verify radius/backlink/degree limits, centering, expansion, collapse and hide behavior with the selection model.
  - [x] 2.3.5 Add Ctrl+Shift+↑/↓ graph spacing (also Ctrl+↑/↓), Ctrl+Shift+←/→ focus + context, and Shift+Option/Alt+↑/↓ / Ctrl+Shift+1 canvas zoom/reset controls, keeping view controls synchronized and text entry unaffected.
  - [x] 2.3.6 Separate graph-distance zoom from canvas scaling, expose both controls and preserve inverse interaction, centering and physical coordinates through their composition.
  - [x] 2.3.7 Map vertical scrolling to graph spacing, horizontal two-finger scrolling to focus + context and pinch/Ctrl+wheel to canvas zoom, preserving text-editor input and graph/navigation state.
  - [x] 2.3.8 Adapt the reference `keys.txt` into a user key map and accessible browser help, showing implemented commands and documenting changes from Java.
  - [x] 2.3.9 Add Shift+Option/Alt+←/→ view rotation, retaining physical positions, upright labels and navigation state.
  - [x] 2.3.10 Restore C to cycle default edge forms, with W as an alias; synchronize the browser selector and key map while preserving explicit relation overrides and text-editor input.
  - [x] 2.3.11 Highlight selected relations on their rendered line, matching the Java selection color; replace browser bounding-box focus frames with stroke emphasis, including curves, parallel relations and self-loops on both pages.
  - [x] 2.3.12 Group left-pane controls into collapsible sections with larger headings, retaining values and keyboard access to a collapsed inspector.
  - [x] 2.3.13 Restore FM2014 quick/literal/topic query, similarity and index/training shortcuts through optional graph-scoped actions, retaining current search backends and text-input behavior.
  - [x] 2.3.14 Let pointer entry resume graph keyboard control from the centered node without a click; preserve explicit side-pane/editor focus, selection-driven navigation, stationary-pointer recovery and listener cleanup.
  - [x] 2.3.15 Simplify canvas zoom and rotation from Ctrl+Shift+Option/Alt arrows to Shift+Option/Alt arrows, updating help/tooltips while retaining native editor input and other view shortcuts.
- [x] 2.4 Port labeling and the associated editors.
  - [x] 2.4.1 Restore multiline labels, node details, annotations, URLs, relation labels and hidden-link counts shown in the thesis example.
  - [x] 2.4.2 Add node/relation editors for labels, types, visual overrides and associated metadata, preserving stable IDs.
  - [x] 2.4.3 Implement commit/cancel and field validation through shared commands; preserve focus and position inline editors using renderer geometry.
  - [x] 2.4.4 Restore the FM2014 node-content popup: modeless/resizable text and safe HTML, selection tracking, internal navigation, keyboard close/focus return and editing through the shared inspector.
  - [x] 2.4.5 Move full item/details editing into a modeless overlay; expose Ctrl+Space and Shift+F2 for direct details editing, retain per-item drafts and preserve focus during graph replacement.
  - [x] 2.4.6 Add numeric label weight commands, inline weight controls and Ctrl+G/H draft adjustments for nodes and relations, with atomic save/cancel and unchanged imported literal labels on unrelated edits.
  - [x] 2.4.7 Add a configurable in-place label mode: stable editable node/edge text components that move with the graph, preserve caret/composition, preview drafts through shared geometry and commit label/weight changes safely; retain on-demand/full overlays and graph/body gestures.

The main browser supports inline labels/weights and full overlay edits, including annotations, URLs, visual overrides and metadata. Optional in-place label editing keeps editable node/relation text moving with the graph. Shared commands validate edits before mutation, preserve stable IDs and restore graph focus. See the [user key map](KEYMAP.md) and [completion record](DONE.md).
- [x] 2.5 Create native YAML persistence and migrate the legacy examples.
  - [x] 2.5.1 Define and validate the versioned `.fm.yaml` graph format, with embedded or companion YAML type configuration.
  - [x] 2.5.2 Implement browser loading/saving and complete-graph serialization, including optional saved view/layout state.
  - [x] 2.5.3 Build a standalone batch converter for the legacy XML example files; it may use another language.
  - [x] 2.5.4 Convert only the approved `berry` and `nips-fm` Java datasets into `examples/fm2014/`, with conversion reports and explicit recovery of known legacy defects. All other reference datasets are proprietary and excluded from migration, fixtures and distribution.
  - [x] 2.5.5 Verify source-to-YAML migration and YAML round trips preserve IDs, labels, annotations, metadata, isolated nodes, parallel relations and self-loops.
  - [x] 2.5.6 Load the converted examples in the demo and add `just` conversion/validation recipes.
  - [x] 2.5.7 Move export settings into a dedicated Options menu with keyboard/outside dismissal and narrow-screen support.

## 3. Add Reinforcement Focus + Context

Rebuild this mechanism from GH's 2005 paper. The FM 2014 RFC prototype is historical context, not the implementation specification. RFC reinforces recognizable local structures through additional layout forces; it can be combined with the viewing lens and structural filtering. Keep reinforcement constraints separate from persistent semantic graph relations.

- [x] 3.1 Add the paper reference and extract the mechanism's implementation requirements into the tasks below.
- [x] 3.2 Rebuild the Reinforcement Focus + Context mechanism.
  - [x] 3.2.1 Identify the one-hop focal tree around a selected center and strengthen its edge springs, keeping constraints outside semantic graph data.
  - [x] 3.2.2 Reinforce even branch spacing using the angular constraint in equation (1), with deterministic multigraph handling and reversible activation.
  - [x] 3.2.3 Support weighted coordinate distances to accommodate horizontally extended labels.
  - [x] 3.2.4 Repel non-focal nodes from the elliptical focal region. Add optional bounded union-escape forces, physical boundaries, controls and independent settings; preserve historical forces with exclusion off.
  - [x] 3.2.5 Handle overlapping focal regions with the paper's non-shared vertex policy. Shared members are exempt from their own regions; non-shared members are excluded from foreign regions using one escape direction and balanced reactions. This is soft vertex exclusion, not a guarantee of disjoint ellipses or label clearance.
  - [x] 3.2.6 Add reversible type-based leaf aggregation and node/relation filtering alongside RFC and the viewing lens. Preserve source neighborhood membership, complete graph data and focal detail; expose typed parent counts, radius/reveal/reset controls and a synthetic hybrid example.
  - [x] 3.2.7 Support node and link weights in RFC physics, separately from coordinate weights and visual styling. Define force semantics, normalization/defaults, zero-weight behavior and multigraph handling; verify weight changes affect reinforcement while preserving plain TouchGraph behavior.
  - [x] 3.2.8 Add explicit focal target-length springs and tree/attraction presets; show soft yellow reinforcement halos and transfer enabled RFC on repeated Return/double-click of the center.
  - [x] 3.2.9 Add a separate opt-in oscillation/damping experiment with per-step detection, local impulse attenuation, quiet-time detection and three-second annealed recovery. Keep fixed-force RFC the default.
  - [x] 3.2.10 Store validated overlapping tree/DAG substructures with YAML persistence and membership editing; render deeper trees and layered DAGs.
  - [x] 3.2.11 Add independent RFC centers via Shift+Enter/Shift+double-click; deduplicate shared constraints, halos and experimental damping.
  - [x] 3.2.12 Add Louvain/component clustering with scope/weight controls, proposal inspection and direct storage of selected communities as RFC clusters, with optional tree projection.
  - [x] 3.2.13 Make ordinary RFC activation replace all centers, and Shift+Enter/Shift+double-click toggle one center, including removing the primary or last center. Preserve explicit additive APIs and stored memberships.
  - [x] 3.2.14 Enable RFC by default in the main browser, show its state in the collapsed section heading, and carry the current on/off choice across graph loads. Keep library/experiment activation explicit and handle empty graphs.
  - [x] 3.2.15 Add first-class cluster memberships with cyclic/disconnected member sets, weighted-centroid compactness and degree-normalized internal-link reinforcement. Preserve tree/DAG behavior, shared constraints, manual/detected membership and YAML persistence.
  - [x] 3.2.16 Add independent cluster rigidity with weighted two-sided internal springs and smooth outer enclosures with translucent fills. Follow current node/curve geometry through movement and view transforms; preserve graph interaction and existing tree physics.
  - [x] 3.2.17 Detect individual-node reversals and circulating motion without global energy voting; strengthen large-swing backoff, roll back failed recovery, monitor other centers during dragging and expose detection diagnostics. Preserve opt-in behavior.
  - [x] 3.2.18 Make adaptive damping a general layout setting enabled by default in the browser, independent of RFC; detect slower swings after a few cycles, offer earlier inherited cooling as a conservative response, preserve legacy/library baselines, and document matched native/RFC experiments in the paper.
  - [x] 3.2.18 Encode node importance with configurable bounded body/label sizes, exact default-weight identity and visible zero-weight nodes. Support inherited type/item/state settings, uniform/legacy display overrides and optional exact values. Keep importance distinct from yellow RFC participation halos and physical forces.
- [x] 3.3 Assemble representative test data and document how to load it.
  - 3.3.1 Original-figure reproduction removed from scope at the user's request (2026-10-24). The loadable synthetic fixtures below cover the mechanisms without claiming to reconstruct Figures 1–3.
  - [x] 3.3.2 Add synthetic single-focus competing-context fixtures, including unequal branch radii and horizontally extended labels, with loadable native YAML graphs.
  - [x] 3.3.3 Add a synthetic deep-tree/DAG example with overlapping membership and shared descendants.
  - [x] 3.3.4 Add loadable tree-only multi-focus fixtures: joined trees, additional within/across-tree leaf relations, and shared subtrees.
  - [x] 3.3.5 Add a loadable stored tree with nonuniform/zero node and relation importance, retaining ordinary context and all saved membership IDs.
  - [x] 3.3.6 Add a loadable overlapping-cluster example retaining clique cycles, shared members, zero importance and ordinary boundary links.
  - [x] 3.3.7 Add four synthetic exclusion fixtures with pinned-pressure controls, shared membership and cluster regions; expose the cross-pressure example in the main browser.
  - [x] 3.3.8 Build a capability-equivalent current RFC/hybrid showcase: a new typed research community with single/two foci, shared groups, semantic bridges and reversible context aggregation. Add six browser comparison setups, complete YAML preservation and a production walkthrough. Original-figure reproduction remains outside scope.
- [x] 3.4 Create reproducible experiments comparing the mechanism with the plain TouchGraph baseline.
  - [x] 3.4.1 Compare the single-focus implementation from identical starting states with seeded randomness and recorded settings/coordinates/metrics.
  - [x] 3.4.2 Compare hybrid structural filtering/aggregation with matched TG/RFC/lens controls, accounting for retained constraints and changed visible graph size. Experiment J records 160 runs, identical nominated detail in force controls, common-subset scores, exact physical lens twins and motion/force diagnostics. Focal-region exclusion is covered in 3.4.11, weighted coordinates in 3.4.1 and multiple tree foci in 3.4.5.
  - [x] 3.4.3 Separate radial/angular effects through ablations, sweep stiffness and compare movable-center oscillations with lower rigidity.
  - [x] 3.4.4 Record adaptive damping off/on comparisons separately, including recovery traces, unchanged force settings and limitations; extend the second draft and drawings.
  - [x] 3.4.5 Compare neither/either/both tree foci across five matched initializations and pinned/movable roots; report per-tree/union errors, per-step motion, shared-root feasibility and failed runs. Keep adaptive damping separate.
  - [x] 3.4.6 Compare adaptive damping and lower rigidity on the recorded multiple-focus oscillatory starts as a separate experiment, retaining the fixed-force runs and distinguishing infeasible targets from dynamic instability. Experiment F records 240 matched runs, pinned/movable roots and an undamped final-coordinate force diagnostic.
  - [x] 3.4.7 Compare nonuniform node/link importance on matched tree fixtures, including saturation, zero transitions and coupled-stiffness effects. Experiment G records 300 runs, common/weighted/priority errors and an identical-wake control for zero transitions; plain TG equivalence is audited.
  - [x] 3.4.8 Compare compact cluster RFC with plain TouchGraph and tree projections on matched dense-community fixtures, including rigidity sweeps, overlap, boundary-link tension, extent, oscillations and readability limits. Experiment H records 240 runs on dense/shared cliques and sparse rings, with weak/strong loads and common all-pairs deformation metrics.
  - [x] 3.4.9 Reproduce v1 detector blind spots and compare v1/v2 responses on a four-node/two-center graph, overlapping weighted clusters and recorded multi-tree starts. Preserve historical Experiment B through an isolated reference fixture.
  - [x] 3.4.10 Add reproducible stability diagrams: prescribed-motion probes, large-step/error overview, matched initial/final layouts and per-step startup/batch motion, gain and global-cooling plots. Separate stability from remaining geometry error.
  - [x] 3.4.11 Compare context/intersection exclusion with plain TG and RFC-only baselines on 100 matched runs. Record all-step exposure, startup forces, fitted region sizes, fixed/movable intruders, common link error, motion and force balance; provide three diagrams and explicit negative/limited overlap findings.
- [x] 3.5 Record experiment settings, results, and observations.
  - [x] 3.5.1 Document the initial force design, deviations from the paper's underspecified details, and single-focus comparison results.
  - [x] 3.5.2 Write a second draft reviewing the 2005 paper, with reproducible drawings, unequal-radius chord analysis and a discrete oscillation/damping calculation.
  - [x] 3.5.3 Extend the second draft with tree-only Experiments C–E, all 120 matched runs, per-tree/union measurements, clipped-motion outliers and a shared-root feasibility calculation; provide eleven drawings, explicit captions and a rebuilt PDF.
  - [x] 3.5.4 Document follow-up Experiments F–H in three reports with eight reproducible SVG/PDF/PNG diagrams, complete numeric records/condition tables and a second-draft synthesis. Distinguish motion, force balance, feasibility, importance and shape preservation.

The [RFC design](rfc-design.md), [single-focus report](experiments/rfc-single-focus/README.md), [multiple-focus tree report](experiments/rfc-multifocus/README.md), [follow-up comparisons F–H](experiments/rfc-followup/README.md), [exclusion Experiment I](experiments/rfc-exclusion/README.md), [hybrid Experiment J](experiments/rfc-hybrid/README.md) and [second draft paper](papers/rfc-revisited-draft2.md) document the implementation and experiments. The current experimental round covers stars/trees, damping versus rigidity, nonuniform importance, compact clusters, exclusion and hybrid views; DAG templates have functional checks only. The main browser exposes activation/removal and strength controls under **Reinforcement Focus + Context**. Node/link weights scale RFC stiffness separately from coordinate weights and ordinary TG forces; the [importance contract](rfc-importance.md) also defines bounded browser body/label sizing (3.2.18). Optional [focal-region exclusion](rfc-exclusion.md) is implemented and evaluated in 100 additional runs. [Structural focus + context](structural-focus-context.md) implements reversible type filtering and conservative leaf aggregation (3.2.6); Experiment J completes the matched hybrid comparisons (3.4.2). Multiple centers and memberships are documented in [the substructure design](rfc-substructures.md); [cluster forces](rfc-clusters.md) remain deformable rather than rigid bodies. Finite synthetic comparisons do not establish general convergence or readability.

- [x] 3.6 Preserve context progress during adaptive damping: use independent node gains/recovery, verify RFC clearing and real label geometry, retain historical shared-gain experiments and document limits.

## 4. Graph visual search

Use **elasticlunr** as the literal engine and implement **LDA semantic retrieval**
for FM 2014 graph-search feature parity, per the latest user direction. Embeddings
are deferred. See the [integration plan](search-module-integration.md) and
[parity record](fm2014-retrieval-parity.md).

Tasks **4.1–4.6** built the earlier prototype; **4.13** separated IR from FM/TG.
Tasks **4.7** and **4.14** record earlier scope decisions. Tasks **4.8–4.12** below
are superseded, not silently redefined or claimed as implemented.

- [x] 4.7 Record the revised search ownership and scope: user-supplied literal and semantic search; LDA superseded; text-described interactions guide RFC and search examples.
- ~~4.8 (Superseded) Review the supplied module's API, indexing lifecycle, query capabilities, result identities/scores and execution requirements once it is available.~~
- ~~4.9 (Superseded) Adapt the browser search boundary to that API and replace LDA-specific backend assumptions, training controls, lifecycle and dependencies.~~
- ~~4.10 (Superseded) If the current literal index needs replacement, integrate elasticlunr and verify its actual query behavior; preserve stable result IDs and graph interactions.~~
- ~~4.11 (Superseded) Integrate and verify the supplied semantic approach, including embeddings if selected by that module.~~
- ~~4.12 (Superseded) Adapt examples, walkthroughs and reproducible comparisons to the supplied module; verify graph query/context/result links, supported node similarity, rejection feedback, persistence and stale-work cleanup.~~

- [x] 4.13 Separate information retrieval into `ir` alongside `fm` and `tg`, move topics and worker/model ownership there, and use short Freshmind module names (`render`, `navigate`, `edit`, `struct`, `cluster`, `struct-view`) while preserving public aliases.

- [x] 4.14 Record the retained current-search baseline and conditional elasticlunr choice; defer replacement work and continue with readability.

- [x] 4.15 Audit FM 2014 retrieval sources and authorized Dirichlet binaries; document operations, equations, defects and intentional differences using synthetic reference checks.
- [x] 4.16 Integrate pinned npm elasticlunr with stable IDs, existing bounded query grammar, exact metadata filters and node-based literal queries; preserve independent IR ownership.
- [x] 4.17 Add FM-style LDA distance/likelihood document and term operations, minimum document frequency, explicit metric provenance and local model save/load with freshness/cancellation guards. Defer embeddings and Java binary-model import.
- [x] 4.18 Verify numeric reference, workers/browser lifecycle and distribution artifacts; refresh progress, guides and the production search walkthrough. Historical prototype experiment records remain reproducible with their original scorer.
- [x] 4.19 Restore graph-native Ctrl+F/Ctrl+Shift+F query creation, moving query entry and Enter submission, F2/Ctrl+Enter reruns, direct query deletion and context return. Preserve content nodes, native text/IME ownership, corpus freshness and pending-job cancellation; route ordinary Edit-mode deletion by selected item with relation precedence.

## 5. Readability: node separation and relation-label placement

Improve the rendered graph without changing the TouchGraph/RFC force equations.
The first increment is an explicit arrangement action for visible node bodies and
labels, with measurable before/after intersections. The second places relation
labels near their curves using measured text and a bounded candidate search.
Crossings, decorations and continuous node collision handling remain future work.

- [x] 5.1 Define measured rectangle separation, pinned/focus/drag protection, transform handling, work bounds and compatibility limits.
- [x] 5.2 Implement a deterministic headless separator and browser adapter using measured node geometry and existing inverse lenses.
- [x] 5.3 Add caller-owned controls under View, report before/after overlaps and synchronize paused motion; preserve semantic data and hidden positions.
- [x] 5.4 Verify logic and real SVG geometry, document limits and add a production before/after comparison to the main flipbook.
- [x] 5.5 Add deterministic, bounded relation-label candidate placement against visible node bodies and other relation labels, keeping every label and preserving node/curve geometry.
- [x] 5.6 Cache measured SVG text and share chosen anchors with rendering and inline relation editors through lenses, parallel edges and self-loops.
- [x] 5.7 Enable relation-label avoidance in the main browser with a reversible View control; preserve original library defaults and transient preferences across graph replacement.
- [x] 5.8 Verify independent rectangle counts, real SVG collisions, editing/control lifecycle and production before/after captures; document limits.

## 6. Applications and radius-two exploration

The [research roadmap](ROAD.md) and [design contract](radius-two-view.md) define
this direction. Completed research/design is distinct from the proposed
implementation below. Keep retrieval behind IR contracts; use the elasticlunr
and LDA capabilities described above. Embedding retrieval remains deferred.

- [x] 6.1 Research high-value application workflows, RFC/visual-search state of the art and available libraries, with primary sources and explicit shortcomings; extend [ROAD Appendix A](ROAD.md#appendix-a-related-work-before-2024) with pre-2024 work and distinguish close comparisons from adjacent techniques.
- [x] 6.2 Design the orthogonal radius-two view: vertical direct neighbors, horizontal second-hop occurrences, relationship labels/weights, shared identity, non-row relations, bounded data access and keyboard/overlay integration. Provide an interactive fictional mockup.
- [ ] 6.3 Implement a detached, deterministic radius-two projection with stable identities, explicit occurrence/edge records, direction/filter policies and incomplete-page contracts; verify graph/coordinate preservation and graph-replacement behavior.
- [ ] 6.4 Add an opt-in bounded browser view with measured/virtual rows and cells, paging, selection, pivot/history, accessible navigation and shared overlay editing; preserve the current RFC/lens view.
- [ ] 6.5 Connect existing retrieval results as view seeds without changing IR ownership; use the LDA adapter and preserve query provenance, cancellation and stale-result guards.
- [ ] 6.6 Evaluate correctness, browser costs and user tasks against ordinary ego node-link, RFC and simple list/tree baselines, with a matrix for shared-neighbor tasks; use attributed data and distinguish unique nodes, occurrences and edge records.
- [ ] 6.7 Run a narrow maintainer/researcher pilot to validate a repeated investigation task; revise the representation if direction, sharing or missing context causes errors.
- [ ] 6.8 Add one application adapter after the pilot identifies a useful task and available source, initially considering dependency impact, evidence exploration or data lineage; preserve source evidence and scope.

## 7. System assurance

The [assurance approach](assurance/README.md) starts from the intended local-first
graph browser and optional future server use. It is a reviewable specification
baseline, not a declaration that the implementation meets it.

- [x] 7.1 Document system intent, usage constraints and logical architectural requirements independently of the current implementation, with stable IDs and explicit open decisions.
- [x] 7.2 Record the assurance approach: purpose/change tracking, risk-based rigor, gap analysis, deterministic verification designs and evidence tied to the assembled deliverable.
- [ ] 7.3 Review baseline interpretations and resolve initial workload, environment, storage/recovery and privacy policy decisions; record requirement sources and supersession explicitly.
- [ ] 7.4 Map implementation and existing tests to the requirement IDs, with risk/assumptions, independent oracles, evidence scope and identified gaps; do not infer conformance from test counts.
- [ ] 7.5 Implement prioritized deterministic checks, control time/randomness/scheduling where needed, and measure test sensitivity and coverage for consequential paths.
- [ ] 7.6 Establish reproducible integrated-build evidence and appropriate independent review in the delivery workflow; separately evaluate user tasks and deployment-specific behavior.
- [x] 7.7 Repair reviewed merge regressions in demo startup/teardown, license distribution and progress documentation; add focused integrated-build and lifecycle checks. This does not complete the broader assurance work in 7.3–7.6.
