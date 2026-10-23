# Freshmind 4 milestones

Develop the browser in stages: establish a plain TouchGraph baseline, restore Freshmind functionality, then add reinforcement and graph visual search.

Completed work, implementation notes, deviations, and lessons are recorded in [DONE.md](DONE.md).

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

## 3. Add Reinforcement Focus + Context

Rebuild this mechanism from GH's 2005 paper. The FM 2014 RFC prototype is historical context, not the implementation specification. RFC reinforces recognizable local structures through additional layout forces; it can be combined with the viewing lens and structural filtering. Keep reinforcement constraints separate from persistent semantic graph relations.

- [x] 3.1 Add the paper reference and extract the mechanism's implementation requirements into the tasks below.
- [ ] 3.2 Rebuild the Reinforcement Focus + Context mechanism.
  - [x] 3.2.1 Identify the one-hop focal tree around a selected center and strengthen its edge springs, keeping constraints outside semantic graph data.
  - [x] 3.2.2 Reinforce even branch spacing using the angular constraint in equation (1), with deterministic multigraph handling and reversible activation.
  - [x] 3.2.3 Support weighted coordinate distances to accommodate horizontally extended labels.
  - [ ] 3.2.4 Repel non-focal nodes from the elliptical focal region.
  - [ ] 3.2.5 Handle multiple foci, shared branches, and overlapping focal regions.
  - [ ] 3.2.6 Combine RFC with the viewing lens and type-based structural aggregation/filtering.
  - [ ] 3.2.7 Support node and link weights in RFC physics, separately from coordinate weights and visual styling. Define force semantics, normalization/defaults, zero-weight behavior and multigraph handling; verify weight changes affect reinforcement while preserving plain TouchGraph behavior.
- [ ] 3.3 Assemble representative test data and document how to load it.
  - [ ] 3.3.1 Recreate the single-focus, two-focus, and hybrid examples in Figures 1–3.
  - [x] 3.3.2 Add synthetic single-focus competing-context fixtures, including unequal branch radii and horizontally extended labels, with loadable native YAML graphs.
- [ ] 3.4 Create reproducible experiments comparing the mechanism with the plain TouchGraph baseline.
  - [x] 3.4.1 Compare the single-focus implementation from identical starting states with seeded randomness and recorded settings/coordinates/metrics.
  - [ ] 3.4.2 Extend comparisons to weighted geometry, exclusion, multiple foci and hybrid filtering as those features are implemented.
- [ ] 3.5 Record experiment settings, results, and observations.
  - [x] 3.5.1 Document the initial force design, deviations from the paper's underspecified details, and single-focus comparison results.

The [RFC design](rfc-design.md) and [initial experiment report](experiments/rfc-single-focus/README.md) cover this first implementation. The main browser exposes activation/removal and strength controls under **Reinforcement Focus + Context**. Coordinate weights now support anisotropic focal geometry. Node/link weights are currently stored, edited and serialized but do not influence RFC forces. Implement 3.2.7 before focal-region exclusion (3.2.4). Focal-region exclusion, multiple centers and structural aggregation remain open.

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
