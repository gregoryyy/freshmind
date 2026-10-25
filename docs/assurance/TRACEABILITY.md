# Requirement and source traceability

TODO **7.4**. Generated from [traceability.json](traceability.json) by
`just assurance-map --write`; validate with `just assurance-map`.

Implementation baseline: `0f77c536a14630e3db2284f440b40c3d0291c3a8`. Behavior/subsystem map with selected named functions/classes, not exhaustive Java/TypeScript function parity. References identify evidence candidates; execution and adequate coverage must be assessed separately.

Original Java files are identified by fully qualified symbols and SHA-256. They
remain in the owner’s local reference checkout; no JARs or decompiled code are
redistributed. To verify those hashes, pass `--legacy-root /path/to/fm2014`.
Normal validation needs no sibling checkout. A file hash pins a reviewed mapping;
it is not proof of equivalence. A changed mapped file requires review.

Use browser find on a requirement, symbol, source path or TODO to navigate in
either direction. Class entries identify a responsibility, not coverage of every
method. Full private-helper/function coverage and unmapped legacy features remain
outside this first map. User intent outranks historical behavior.

| Requirement | Meaning | Mappings |
| --- | --- | --- |
| [INT-01](../../docs/assurance/01-intent.md) | Understand and navigate relationships | [MAP-04](#map-04) |
| [INT-02](../../docs/assurance/01-intent.md) | Preserve information | [MAP-01](#map-01) |
| [INT-03](../../docs/assurance/01-intent.md) | Provide useful focus and context | [MAP-07](#map-07) |
| [INT-04](../../docs/assurance/01-intent.md) | Maintain orientation and interaction ownership | [MAP-04](#map-04) |
| [INT-05](../../docs/assurance/01-intent.md) | Support deliberate authoring | [MAP-03](#map-03) |
| [INT-06](../../docs/assurance/01-intent.md) | Combine retrieval and exploration | [MAP-08](#map-08) |
| [INT-07](../../docs/assurance/01-intent.md) | Keep local use self-contained | [MAP-02](#map-02) |
| [INT-08](../../docs/assurance/01-intent.md) | Allow future server-backed use | [MAP-14](#map-14) |
| [INT-09](../../docs/assurance/01-intent.md) | Make results inspectable | [MAP-10](#map-10) |
| [USE-01](../../docs/assurance/02-usage-constraints.md) | Explicit data boundaries | [MAP-12](#map-12) |
| [USE-02](../../docs/assurance/02-usage-constraints.md) | Honest storage and confidentiality claims | [MAP-02](#map-02) |
| [USE-03](../../docs/assurance/02-usage-constraints.md) | Lossless supported operations | [MAP-01](#map-01) |
| [USE-04](../../docs/assurance/02-usage-constraints.md) | Controlled changes and failures | [MAP-03](#map-03) |
| [USE-05](../../docs/assurance/02-usage-constraints.md) | Imported content is data | [MAP-13](#map-13) |
| [USE-06](../../docs/assurance/02-usage-constraints.md) | Explicit readability and workload limits | [MAP-06](#map-06) |
| [USE-07](../../docs/assurance/02-usage-constraints.md) | Predictable lifecycle and input ownership | [MAP-11](#map-11) |
| [USE-08](../../docs/assurance/02-usage-constraints.md) | Accessible meaning | [MAP-04](#map-04) |
| [USE-09](../../docs/assurance/02-usage-constraints.md) | Bounded retrieval claims | [MAP-09](#map-09) |
| [USE-10](../../docs/assurance/02-usage-constraints.md) | Explicit server authority | [MAP-14](#map-14) |
| [USE-11](../../docs/assurance/02-usage-constraints.md) | Reproducible, scoped claims | [MAP-16](#map-16) |
| [USE-12](../../docs/assurance/02-usage-constraints.md) | Attribution travels with distribution | [MAP-16](#map-16) |
| [ARC-01](../../docs/assurance/03-architecture.md) | One authoritative semantic document per revision | [MAP-01](#map-01) |
| [ARC-02](../../docs/assurance/03-architecture.md) | Validated command boundary | [MAP-03](#map-03) |
| [ARC-03](../../docs/assurance/03-architecture.md) | Derived views retain provenance | [MAP-07](#map-07) |
| [ARC-04](../../docs/assurance/03-architecture.md) | Separate semantic, layout and screen coordinates | [MAP-05](#map-05) |
| [ARC-05](../../docs/assurance/03-architecture.md) | Bounded layout with explicit constraints | [MAP-06](#map-06) |
| [ARC-06](../../docs/assurance/03-architecture.md) | Retrieval behind a document-independent contract | [MAP-08](#map-08) |
| [ARC-07](../../docs/assurance/03-architecture.md) | Explicit session and asynchronous ownership | [MAP-11](#map-11) |
| [ARC-08](../../docs/assurance/03-architecture.md) | Local effects isolated from network effects | [MAP-12](#map-12) |
| [ARC-09](../../docs/assurance/03-architecture.md) | Validate at trust boundaries | [MAP-13](#map-13) |
| [ARC-10](../../docs/assurance/03-architecture.md) | Future remote authority is versioned and scoped | [MAP-14](#map-14) |
| [ARC-11](../../docs/assurance/03-architecture.md) | Verifiable dependency and effect boundaries | [MAP-15](#map-15) |
| [ARC-12](../../docs/assurance/03-architecture.md) | Inspectable composition and distribution | [MAP-15](#map-15) |

## MAP-01

**Canonical graph identity and membership** — adapted; risk: high; status: partial-evidence.

Requirements: INT-02, ARC-01, USE-03. TODO: 1.1, 2.5, 7.5.

Current declarations:

- [src/fm/model/graph.ts#FreshGraph](../../src/fm/model/graph.ts)
- [src/fm/model/document.ts#FreshmindDocument](../../src/fm/model/document.ts)
- [src/tg/graph/graph.ts#GraphEltSet](../../src/tg/graph/graph.ts)

Origins:

- `org.knowceans.freshmind.FreshNode` — `src/org/knowceans/freshmind/FreshNode.java`; SHA-256 `16f9769b27b2fc295b0c7621799878a594a7de3d895d4e6091116989840980af`.
- `org.knowceans.freshmind.FreshEdge` — `src/org/knowceans/freshmind/FreshEdge.java`; SHA-256 `5879fd26cfa4275d819b8174342a825f9b5db8f0232eba530e9943bffa4bf941`.
- `org.knowceans.freshmind.tg.graphelements.GraphEltSet` — `src/org/knowceans/freshmind/tg/graphelements/GraphEltSet.java`; SHA-256 `d486f084944a3895b29c0211edcdfb85be8befd29297c104848c806b900778f6`.

Assumptions: One complete local document; stable string identities; supported native fields only.

Failure consequence: Hidden or parallel information lost or identities confused during viewing/export.

Evidence candidates: [tests/persistence.test.mjs](../../tests/persistence.test.mjs), [tests/core.test.mjs](../../tests/core.test.mjs), [tests/assurance-critical.test.mjs](../../tests/assurance-critical.test.mjs).

Independent expectation: Hand-authored node/edge records including isolated nodes, loops, parallel relations and hidden membership.

**Gaps/limits:** Canonical round trips are scoped evidence; source-code mutation paths are not all mediated by a revisioned command boundary.

## MAP-02

**Native persistence and honest save status** — new; risk: high; status: partial-evidence.

Requirements: USE-02, INT-07. TODO: 2.5, 7.3, 7.5.

Current declarations:

- [src/fm/io/codec.ts#parseDocument](../../src/fm/io/codec.ts)
- [src/fm/io/codec.ts#serializeDocument](../../src/fm/io/codec.ts)
- [src/fm/browser/document.ts#captureDocument](../../src/fm/browser/document.ts)
- [src/fm/browser/document.ts#installDocument](../../src/fm/browser/document.ts)

Origins:

New requirement/design or external specification; no Java function equivalence claimed.

Assumptions: Explicit user file selection/export; format version 1; no durable-save acknowledgement from the OS.

Failure consequence: User believes unsaved memory is durable, or a save/load changes supported information.

Evidence candidates: [tests/persistence.test.mjs](../../tests/persistence.test.mjs), [tests/browser/editing-io.spec.mjs](../../tests/browser/editing-io.spec.mjs), [tests/assurance-critical.test.mjs](../../tests/assurance-critical.test.mjs), [tests/assurance-browser/local.spec.mjs](../../tests/assurance-browser/local.spec.mjs), [docs/assurance/evidence/7.5-browser.json](../../docs/assurance/evidence/7.5-browser.json).

Independent expectation: Explicit fixture schema and original field values; rejected imports preserve the prior graph. Download initiation is not a durability oracle.

**Gaps/limits:** No crash-safe save, autosave or secure-erasure claim. One production canary workflow observes no storage writes; this is not universal storage/confidentiality evidence. Native YAML is a new format, not a Java serialization clone.

## MAP-03

**Deliberate atomic editing** — adapted; risk: high; status: partial-evidence.

Requirements: INT-05, USE-04, ARC-02. TODO: 2.6, 8.1, 8.2.

Current declarations:

- [src/fm/edit/commands.ts#applyNodeEdit](../../src/fm/edit/commands.ts)
- [src/fm/edit/commands.ts#applyRelationEdit](../../src/fm/edit/commands.ts)
- [src/fm/edit/structure.ts#createLinkedNode](../../src/fm/edit/structure.ts)
- [src/fm/edit/structure.ts#GraphClipboard](../../src/fm/edit/structure.ts)

Origins:

- `org.knowceans.freshmind.FreshCommands` — `src/org/knowceans/freshmind/FreshCommands.java`; SHA-256 `e11427ea99f05d15f9e712e34d670b5854db5c85a4296194a8039e18dcd43e08`.
- `org.knowceans.freshmind.editors.FreshNodeEditor` — `src/org/knowceans/freshmind/editors/FreshNodeEditor.java`; SHA-256 `c87ce00b31ce7c9840af937a5cc4845145549c726dc4a0128daa351ea730d80c`.
- `org.knowceans.freshmind.editors.FreshEdgeEditor` — `src/org/knowceans/freshmind/editors/FreshEdgeEditor.java`; SHA-256 `14ecfbc491906c5a35fd4a539dce8c13413ea5a7e6ee6b4197f3617e3758baa2`.

Assumptions: Single-user edits; current object identities; ordinary allocation succeeds; rejected commands must remain atomic.

Failure consequence: Partial mutation, unintended edits or inability to recover intentional changes.

Evidence candidates: [tests/label-commands.test.mjs](../../tests/label-commands.test.mjs), [tests/structural-editing.test.mjs](../../tests/structural-editing.test.mjs), [tests/browser/editor-shortcuts.spec.mjs](../../tests/browser/editor-shortcuts.spec.mjs), [tests/assurance-critical.test.mjs](../../tests/assurance-critical.test.mjs).

Independent expectation: Independent field/end-point expectations, stale-object and injected insertion-failure cases.

**Gaps/limits:** Undo remains absent; global command/revision coverage is partial. ASSURE-02 verifies full-record/incidence preservation for specified invalid drafts, not every possible mutation/failure.

## MAP-04

**Graph navigation and focus ownership** — adapted; risk: medium; status: partial-evidence.

Requirements: INT-01, INT-04, USE-08. TODO: 2.6, 9.1, 9.4.

Current declarations:

- [src/fm/navigate/controller.ts#FreshmindNavigation](../../src/fm/navigate/controller.ts)

Origins:

- `org.knowceans.freshmind.keyboard.FreshKeys` — `src/org/knowceans/freshmind/keyboard/FreshKeys.java`; SHA-256 `a4812fbb79f59ca0f883b6e51f9912ccffa2f11f3d5232df0d279e6d86deb349`.
- `org.knowceans.freshmind.FreshCommands` — `src/org/knowceans/freshmind/FreshCommands.java`; SHA-256 `e11427ea99f05d15f9e712e34d670b5854db5c85a4296194a8039e18dcd43e08`.

Assumptions: Application receives the event; explicit control/text focus takes precedence over graph focus.

Failure consequence: Commands target the wrong item, consume text input, or prevent accessible navigation.

Evidence candidates: [tests/navigation.test.mjs](../../tests/navigation.test.mjs), [tests/browser/hover-keyboard.spec.mjs](../../tests/browser/hover-keyboard.spec.mjs), [tests/browser/editor-shortcuts.spec.mjs](../../tests/browser/editor-shortcuts.spec.mjs).

Independent expectation: Literal Java command bodies and key map, plus explicit current selection/text-focus rules.

**Gaps/limits:** OS-reserved chord delivery, assistive technology, touch and human discoverability remain unassessed.

## MAP-05

**Lens coordinate contracts** — adapted; risk: medium; status: partial-evidence.

Requirements: ARC-04. TODO: 1.1, 5.10.

Current declarations:

- [src/tg/lenses/lens-set.ts#TGLensSet](../../src/tg/lenses/lens-set.ts)
- [src/tg/lenses/horizontal-stretch.ts#HorizontalStretchLens](../../src/tg/lenses/horizontal-stretch.ts)

Origins:

- `org.knowceans.freshmind.FreshmindBrowser.HorizontalStretchLens` — `src/org/knowceans/freshmind/FreshmindBrowser.java`; SHA-256 `ce9a2b88a3846d60058556d2dc858285b9904a1870104a36cfaad09df60fc2fb`.
- `org.knowceans.freshmind.tg.TGLensSet` — `src/org/knowceans/freshmind/tg/TGLensSet.java`; SHA-256 `e957500e4e967f142c36354260d68a79dc6adc434e9f5139e61de97f1460bc7d`.

Assumptions: Declared lens order and valid factors; custom lenses require separate contracts.

Failure consequence: Picking/editing disagrees with drawing or screen transforms alter semantic state.

Evidence candidates: [tests/graph-aspect.test.mjs](../../tests/graph-aspect.test.mjs), [tests/compatibility.test.mjs](../../tests/compatibility.test.mjs), [tests/background-pan.test.mjs](../../tests/background-pan.test.mjs).

Independent expectation: Analytic forward/inverse coordinates and pinned Java reference; fixed 1.5 horizontal stretch generalized to explicit factors.

**Gaps/limits:** Nonlinear/custom lenses do not imply exact invertibility or unconstrained collision clearance.

## MAP-06

**Bounded layout and independent damping** — adapted; risk: medium; status: partial-evidence.

Requirements: USE-06, ARC-05. TODO: 3.6, 5.1, 7.3.

Current declarations:

- [src/tg/layout/layout.ts#TGLayout](../../src/tg/layout/layout.ts)
- [src/tg/layout/node-stabilization.ts#NodeMotionStabilizer](../../src/tg/layout/node-stabilization.ts)

Origins:

- `org.knowceans.freshmind.tg.TGLayout` — `src/org/knowceans/freshmind/tg/TGLayout.java`; SHA-256 `bd7b55c7d14ecbd6bbecd57d15df29f51ed1725c5fdf8297cd005f3fb531c395`.

Assumptions: Fixed seed, initial coordinates, visible membership, constraints and integration-step budget.

Failure consequence: Unbounded work, unreadable placement, stalled context or movement of protected nodes.

Evidence candidates: [tests/compatibility.test.mjs](../../tests/compatibility.test.mjs), [tests/layout-damping.test.mjs](../../tests/layout-damping.test.mjs), [tests/search-disk.test.mjs](../../tests/search-disk.test.mjs), [tests/readability.test.mjs](../../tests/readability.test.mjs).

Independent expectation: Pinned upstream Java layout for ordinary forces; prescribed oscillator/drift inputs and analytic rectangle/disk fixtures for extensions.

**Gaps/limits:** No general workload/latency or arbitrary-graph convergence guarantee; import/render global resource limits still need assessment.

## MAP-07

**RFC and derived structural views** — new; risk: medium; status: partial-evidence.

Requirements: INT-03, ARC-03. TODO: 3.7, 6.3, 6.7.

Current declarations:

- [src/fm/rfc/controller.ts#RfcController](../../src/fm/rfc/controller.ts)
- [src/fm/struct-view/radius-two.ts#projectRadiusTwo](../../src/fm/struct-view/radius-two.ts)
- [src/fm/struct-view/projection.ts#projectStructuralView](../../src/fm/struct-view/projection.ts)

Origins:

New requirement/design or external specification; no Java function equivalence claimed.

Assumptions: Explicit loaded/visible source scope; deterministic node/edge order and configured page budgets.

Failure consequence: Users infer false relationships or completeness from a derived or partial view.

Evidence candidates: [tests/rfc-automatic.test.mjs](../../tests/rfc-automatic.test.mjs), [tests/radius-two.test.mjs](../../tests/radius-two.test.mjs), [tests/structural-view.test.mjs](../../tests/structural-view.test.mjs).

Independent expectation: Explicit adjacency/occurrence/witness tables; source preservation; RFC paper equations and prescribed trees, not pixel recreation.

**Gaps/limits:** Preferred in-graph r=2 dependency-impact task awaits human observations. RFC is a reimplementation/extension of the paper, not a claimed Java function port.

## MAP-08

**Literal retrieval replacement** — replaced; risk: high; status: partial-evidence.

Requirements: INT-06, ARC-06. TODO: 4.13, 4.16.

Current declarations:

- [src/ir/lexical/lexical.ts#LexicalSearchIndex](../../src/ir/lexical/lexical.ts)
- [src/fm/ir/corpus.ts#graphSearchCorpus](../../src/fm/ir/corpus.ts)

Origins:

- `org.knowceans.freshmind.ir.search.LuceneSearch` — `src/org/knowceans/freshmind/ir/search/LuceneSearch.java`; SHA-256 `e3d817013c0a4ebcd11b9f7455782269802754a4673f0a3aec2b3b967be01f11`.

Assumptions: Current eligible content snapshot; no query/result nodes in the indexed content corpus.

Failure consequence: Private content leaks across provider boundaries or unrelated source records enter ranking.

Evidence candidates: [tests/search.test.mjs](../../tests/search.test.mjs), [tests/retrieval-parity.test.mjs](../../tests/retrieval-parity.test.mjs), [tests/module-boundaries.test.mjs](../../tests/module-boundaries.test.mjs).

Independent expectation: Hand-specified lexical fixtures and independent provider/graph ownership contracts.

**Gaps/limits:** Elasticlunr is intentionally not Lucene scoring parity; real-world relevance needs judged queries.

## MAP-09

**LDA retrieval and corrected legacy similarities** — reimplemented; risk: high; status: partial-evidence.

Requirements: USE-09. TODO: 4.14, 4.15.

Current declarations:

- [src/ir/topics/model.ts#LdaQueryClient](../../src/ir/topics/model.ts)
- [src/ir/topics/similarities.ts#LdaSimilarities](../../src/ir/topics/similarities.ts)

Origins:

- `org.knowceans.freshmind.ir.semantic.LdaSimilaritiesFm` — `src/org/knowceans/freshmind/ir/semantic/LdaSimilaritiesFm.java`; SHA-256 `39ffa948aeb28a2ffc02efcced412e5e1e84e18455f1b853c039a22d4d76964c`.

Assumptions: Validated model matrices, vocabulary and corpus identity; declared distance metric and inference seed.

Failure consequence: Stale/mismatched model silently produces misleading similarities or ranking.

Evidence candidates: [tests/retrieval-parity.test.mjs](../../tests/retrieval-parity.test.mjs), [tests/topics.test.mjs](../../tests/topics.test.mjs).

Independent expectation: Owner-authorized binary harness on synthetic probability matrices, plus independent distance formulas. See retrieval parity record.

**Gaps/limits:** Source-only wrapper is not the missing Dirichlet implementation; binary hashes/oracle limits are pinned by the harness. No general topic/relevance-quality claim.

## MAP-10

**Graph query provenance and feedback** — adapted; risk: high; status: partial-evidence.

Requirements: INT-09. TODO: 4.17, 6.5.

Current declarations:

- [src/fm/ir/graph.ts#applyGraphSearchResults](../../src/fm/ir/graph.ts)
- [src/fm/ir/graph.ts#rejectGraphSearchResult](../../src/fm/ir/graph.ts)

Origins:

- `org.knowceans.freshmind.ir.search.NodeQueryAdapter` — `src/org/knowceans/freshmind/ir/search/NodeQueryAdapter.java`; SHA-256 `df24c1b22a4bdf3ec580b1a573b73cac49f35bf483a979744fb15309ca2c1a5d`.

Assumptions: Accepted results belong to the live graph and exact eligible content snapshot.

Failure consequence: Retrieved associations masquerade as facts or feedback deletes ordinary relations.

Evidence candidates: [tests/search.test.mjs](../../tests/search.test.mjs), [tests/radius-two-seeds.test.mjs](../../tests/radius-two-seeds.test.mjs).

Independent expectation: Explicit expected query/context/result roles, content membership and source freshness, including known corpus-fingerprint collision.

**Gaps/limits:** Imported result metadata is data, not trusted evidence. Exported findings do not establish domain truth.

## MAP-11

**Cancellation, replacement and teardown** — new; risk: high; status: partial-evidence.

Requirements: USE-07, ARC-07. TODO: 4.18, 7.5.

Current declarations:

- [src/ir/browser/worker-client.ts#SearchWorkerClient](../../src/ir/browser/worker-client.ts)
- [src/ir/browser/session.ts#SearchSession](../../src/ir/browser/session.ts)
- [src/fm/browser/search.ts#GraphSearchController](../../src/fm/browser/search.ts)

Origins:

New requirement/design or external specification; no Java function equivalence claimed.

Assumptions: Worker/job ownership and source generations are checked; effects can be driven by a controlled scheduler.

Failure consequence: Old work mutates a new document or leaked workers/listeners repeat commands.

Evidence candidates: [tests/ir-browser.test.mjs](../../tests/ir-browser.test.mjs), [tests/search-browser-controller.test.mjs](../../tests/search-browser-controller.test.mjs), [tests/structural-editing.test.mjs](../../tests/structural-editing.test.mjs), [tests/assurance-critical.test.mjs](../../tests/assurance-critical.test.mjs).

Independent expectation: Controlled workers and deferred reads delivered after cancellation/replacement/disposal; explicit active-owner expectations.

**Gaps/limits:** No wall-clock sleeps are an oracle for race freedom. Exhaustive scheduling and every UI lifecycle path are not covered.

## MAP-12

**Local privacy and network isolation** — new; risk: high; status: partial-evidence.

Requirements: USE-01, ARC-08. TODO: 7.3, 7.5.

Current declarations:

- [src/fm/browser/content.ts#resourceURL](../../src/fm/browser/content.ts)
- [src/ir/browser/session.ts#SearchSession](../../src/ir/browser/session.ts)

Origins:

New requirement/design or external specification; no Java function equivalence claimed.

Assumptions: Application assets are served locally or from the trusted distribution; graph/query data must remain local.

Failure consequence: Private graph/query/model data leaves the device or persists without a declared policy.

Evidence candidates: [tests/browser/content.spec.mjs](../../tests/browser/content.spec.mjs), [tests/module-boundaries.test.mjs](../../tests/module-boundaries.test.mjs), [tests/assurance-browser/local.spec.mjs](../../tests/assurance-browser/local.spec.mjs), [docs/assurance/evidence/7.5-browser.json](../../docs/assurance/evidence/7.5-browser.json).

Independent expectation: Explicit allowed application requests and synthetic canary graph/query/model content; observe actual production browser effects.

**Gaps/limits:** The scoped production canary workflow observes network, storage, console and WebSockets; positive controls detect attempted same-origin/external transfers. Other paths, browser/OS services and adversarial channels remain unassessed; no encryption/secure-erasure claim.

## MAP-13

**Untrusted content and validation** — new; risk: high; status: partial-evidence.

Requirements: USE-05, ARC-09. TODO: 2.4, 7.5.

Current declarations:

- [src/fm/browser/content.ts#renderAnnotation](../../src/fm/browser/content.ts)
- [src/fm/io/codec.ts#readDocument](../../src/fm/io/codec.ts)

Origins:

New requirement/design or external specification; no Java function equivalence claimed.

Assumptions: Imported labels, markup, URLs and files are hostile even on the local device.

Failure consequence: Imported data executes code, triggers a network request or corrupts the accepted document.

Evidence candidates: [tests/browser/content.spec.mjs](../../tests/browser/content.spec.mjs), [tests/persistence.test.mjs](../../tests/persistence.test.mjs), [tests/assurance-browser/local.spec.mjs](../../tests/assurance-browser/local.spec.mjs), [docs/assurance/evidence/7.5-browser.json](../../docs/assurance/evidence/7.5-browser.json).

Independent expectation: Hostile synthetic labels, markup, URL protocols, malformed records and explicit expected rejection/inert display.

**Gaps/limits:** No complete threat-model or global parser resource-limit audit. Test hostile content in the production build as well as isolated helpers.

## MAP-14

**Future server authority** — new; risk: high; status: not-implemented.

Requirements: INT-08, USE-10, ARC-10. TODO: 7.3, 7.6.

Current declarations:

No function-level implementation claimed.

Origins:

New requirement/design or external specification; no Java function equivalence claimed.

Assumptions: Future mode only; server boundary and authentication/authorization policies not yet specified.

Failure consequence: Unauthorized cross-user access or conflicting/partial remote data accepted as complete.

Evidence candidates: none; future or missing implementation.

Independent expectation: Future server-side allowed/denied access, revision/conflict and partial-result fixtures. Client-only tests cannot validate authority.

**Gaps/limits:** Not implemented or accepted as an initial delivery capability. Authentication, tenant isolation, retention and concurrency policy require a separate specification.

## MAP-15

**Architectural ownership and composition** — new; risk: high; status: partial-evidence.

Requirements: ARC-11, ARC-12. TODO: 7.6.

Current declarations:

- [src/fm/browser/panel.ts#FreshmindPanel](../../src/fm/browser/panel.ts)

Origins:

New requirement/design or external specification; no Java function equivalence claimed.

Assumptions: Public contracts are the supported composition boundary; browser effects must remain explicit.

Failure consequence: Duplicate state ownership, hidden effects or an assembled build behaves differently from checked modules.

Evidence candidates: [tests/module-boundaries.test.mjs](../../tests/module-boundaries.test.mjs), [tests/distribution.test.mjs](../../tests/distribution.test.mjs), [tests/browser/freshmind.spec.mjs](../../tests/browser/freshmind.spec.mjs), [tests/assurance-delivery.test.mjs](../../tests/assurance-delivery.test.mjs), [docs/assurance/06-delivery.md](../../docs/assurance/06-delivery.md).

Independent expectation: Independent dependency rules, public export/constructor inventory, cold headless imports and original license texts.

**Gaps/limits:** Dependency rules and repeated assembled-build/browser checks are scoped evidence, not proof of mutation ownership. Independent review remains pending; repeatability within one environment is not hermetic/cross-platform reproducibility.

## MAP-16

**Evidence and attribution** — new; risk: high; status: partial-evidence.

Requirements: USE-11, USE-12. TODO: 7.4, 7.6.

Current declarations:

- [scripts/lib/assurance-artifacts.mjs#inventory](../../scripts/lib/assurance-artifacts.mjs)

Origins:

New requirement/design or external specification; no Java function equivalence claimed.

Assumptions: Pinned inputs and original attribution texts are available; toolchain/environment are recorded.

Failure consequence: Unsupported correctness claims or missing notices in the actual distribution.

Evidence candidates: [tests/distribution.test.mjs](../../tests/distribution.test.mjs), [tests/compatibility.test.mjs](../../tests/compatibility.test.mjs), [tests/assurance-delivery.test.mjs](../../tests/assurance-delivery.test.mjs), [docs/assurance/06-delivery.md](../../docs/assurance/06-delivery.md).

Independent expectation: Original license bytes, pinned reference scenarios, exact inputs/versions and evidence hashes rather than test counts.

**Gaps/limits:** Delivery records preserve exact inputs/artifacts and review-pending status; independent review and human task validation remain missing. Historical experimental evidence retains its original scope.
