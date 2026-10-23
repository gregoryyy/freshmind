# Freshmind 4 milestones

Develop the browser in stages: establish a plain TouchGraph baseline, restore Freshmind functionality, then add reinforcement and graph visual search.

Completed work, implementation notes, deviations, and lessons are recorded in [DONE.md](DONE.md).

**Current status:** Milestones 1 and 2 are complete. Milestone 3 includes multiple RFC centers, stored tree/DAG/cluster memberships, clustering, and reproducible single- and multiple-focus tree experiments. Node/link importance now affects added RFC stiffness. Optional focal-region and non-shared overlap exclusion are implemented; structural aggregation and clear browser node-importance encoding remain open. Milestone 4 (LDA-based visual search) has not started.

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
  - [x] 2.3.5 Add Ctrl+Shift+↑/↓ graph spacing (also Ctrl+↑/↓), Ctrl+Shift+←/→ focus + context, and Ctrl+Shift+Option/Alt+↑/↓ / Ctrl+Shift+1 canvas zoom/reset controls, keeping view controls synchronized and text entry unaffected.
  - [x] 2.3.6 Separate graph-distance zoom from canvas scaling, expose both controls and preserve inverse interaction, centering and physical coordinates through their composition.
  - [x] 2.3.7 Map vertical scrolling to graph spacing, horizontal two-finger scrolling to focus + context and pinch/Ctrl+wheel to canvas zoom, preserving text-editor input and graph/navigation state.
  - [x] 2.3.8 Adapt the reference `keys.txt` into a user key map and accessible browser help, showing implemented commands and documenting changes from Java.
  - [x] 2.3.9 Add Ctrl+Shift+Option/Alt+←/→ view rotation, retaining physical positions, upright labels and navigation state.
  - [x] 2.3.10 Restore C to cycle default edge forms, with W as an alias; synchronize the browser selector and key map while preserving explicit relation overrides and text-editor input.
  - [x] 2.3.11 Highlight selected relations on their rendered line, matching the Java selection color; replace browser bounding-box focus frames with stroke emphasis, including curves, parallel relations and self-loops on both pages.
  - [x] 2.3.12 Group left-pane controls into collapsible sections with larger headings, retaining values and keyboard access to a collapsed inspector.
- [x] 2.4 Port labeling and the associated editors.
  - [x] 2.4.1 Restore multiline labels, node details, annotations, URLs, relation labels and hidden-link counts shown in the thesis example.
  - [x] 2.4.2 Add node/relation editors for labels, types, visual overrides and associated metadata, preserving stable IDs.
  - [x] 2.4.3 Implement commit/cancel and field validation through shared commands; preserve focus and position inline editors using renderer geometry.
  - [x] 2.4.4 Restore the FM2014 node-content popup: modeless/resizable text and safe HTML, selection tracking, internal navigation, keyboard close/focus return and editing through the shared inspector.

The main browser supports inline labels and full inspector edits, including annotations, URLs, visual overrides and metadata. Shared commands validate the entire draft before mutation, preserve stable IDs and restore graph focus. See the [user key map](KEYMAP.md) and [completion record](DONE.md).
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
- [ ] 3.2 Rebuild the Reinforcement Focus + Context mechanism.
  - [x] 3.2.1 Identify the one-hop focal tree around a selected center and strengthen its edge springs, keeping constraints outside semantic graph data.
  - [x] 3.2.2 Reinforce even branch spacing using the angular constraint in equation (1), with deterministic multigraph handling and reversible activation.
  - [x] 3.2.3 Support weighted coordinate distances to accommodate horizontally extended labels.
  - [x] 3.2.4 Repel non-focal nodes from the elliptical focal region. Add optional bounded union-escape forces, physical boundaries, controls and independent settings; preserve historical forces with exclusion off.
  - [x] 3.2.5 Handle overlapping focal regions with the paper's non-shared vertex policy. Shared members are exempt from their own regions; non-shared members are excluded from foreign regions using one escape direction and balanced reactions. This is soft vertex exclusion, not a guarantee of disjoint ellipses or label clearance.
  - [ ] 3.2.6 Add type-based structural aggregation/filtering and combine it with RFC and the viewing lens. RFC already operates independently of, and alongside, the lens; aggregation/filtering remains pending.
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
  - [ ] 3.2.18 Define a clear configurable visual encoding for node importance. Current node bodies/fonts do not encode weight; the optional legacy halo only changes above weight 10. Edge thickness already uses relation weight. Keep importance distinct from RFC participation halos.
- [ ] 3.3 Assemble representative test data and document how to load it.
  - [ ] 3.3.1 Recreate the single-focus, two-focus, and hybrid examples in Figures 1–3 of the 2005 paper. Current synthetic fixtures test the mechanisms; they do not reconstruct those figures or the hybrid filtering example.
  - [x] 3.3.2 Add synthetic single-focus competing-context fixtures, including unequal branch radii and horizontally extended labels, with loadable native YAML graphs.
  - [x] 3.3.3 Add a synthetic deep-tree/DAG example with overlapping membership and shared descendants.
  - [x] 3.3.4 Add loadable tree-only multi-focus fixtures: joined trees, additional within/across-tree leaf relations, and shared subtrees.
  - [x] 3.3.5 Add a loadable stored tree with nonuniform/zero node and relation importance, retaining ordinary context and all saved membership IDs.
  - [x] 3.3.6 Add a loadable overlapping-cluster example retaining clique cycles, shared members, zero importance and ordinary boundary links.
  - [x] 3.3.7 Add four synthetic exclusion fixtures with pinned-pressure controls, shared membership and cluster regions; expose the cross-pressure example in the main browser.
- [ ] 3.4 Create reproducible experiments comparing the mechanism with the plain TouchGraph baseline.
  - [x] 3.4.1 Compare the single-focus implementation from identical starting states with seeded randomness and recorded settings/coordinates/metrics.
  - [ ] 3.4.2 Extend comparisons to hybrid structural filtering when implemented. Focal-region exclusion is covered in 3.4.11, weighted coordinates in 3.4.1 and multiple tree foci in 3.4.5.
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

The [RFC design](rfc-design.md), [single-focus report](experiments/rfc-single-focus/README.md), [multiple-focus tree report](experiments/rfc-multifocus/README.md), [follow-up comparisons F–H](experiments/rfc-followup/README.md), [exclusion Experiment I](experiments/rfc-exclusion/README.md) and [second draft paper](papers/rfc-revisited-draft2.md) document the implementation and experiments. The current experimental round covers stars/trees, damping versus rigidity, nonuniform importance and compact clusters; DAG templates have functional checks only. The main browser exposes activation/removal and strength controls under **Reinforcement Focus + Context**. Node/link weights scale RFC stiffness separately from coordinate weights and ordinary TG forces; see the [importance contract](rfc-importance.md). Clear node-importance visualization remains open (3.2.18). Optional [focal-region exclusion](rfc-exclusion.md) is implemented and evaluated in 100 additional runs. Structural aggregation (3.2.6), original-paper example reconstruction (3.3.1) and hybrid comparisons (3.4.2) remain open. Multiple centers and memberships are documented in [the substructure design](rfc-substructures.md); [cluster forces](rfc-clusters.md) remain deformable rather than rigid bodies. Finite synthetic comparisons do not establish general convergence or readability.

## 4. Add graph visual search with LDA

Use the thesis excerpt as the interaction reference. Its community browser uses ETT models; this milestone introduces LDA-based retrieval with the same style of graph interaction.

The LDA libraries used by the Java prototype are available as sources. Local source references include `../knowceans/knowceans-lda-simple/` and `../knowceans/knowceans-ilda/`, with simple LDA implementations in `org.knowceans.topics.simple`. Select and audit the required source subset and map it to the prototype's search interfaces.

- [ ] 4.1 Identify the Lucene functionality and `knowceans` dependencies required for graph visual search.
- [ ] 4.2 Port the required Lucene search functionality and integration points.
- [ ] 4.3 Port the required `knowceans-lda-simple` framework functionality from the available sources (`org.knowceans.topics.simple`).
- [ ] 4.4 Port the required utilities from `knowceans.util.*`.
- [ ] 4.5 Integrate LDA-based graph visual search methods with the browser.
  - [ ] 4.5.1 Represent term and tag queries as graph nodes linked to retrieved results.
  - [ ] 4.5.2 Allow similarity queries from existing nodes and add links to the retrieved items.
  - [ ] 4.5.3 Allow removal of irrelevant result links and retain that interaction as input for future relevance feedback.
- [ ] 4.6 Add example data and reproducible search experiments.
