# Java information by TypeScript file

TODO **7.8**. Generated from [src/java-provenance.json](../../src/java-provenance.json) by
`just java-provenance --write`; normal `just assurance-map` checks this inventory too.

Baseline: `037c7754189a90ff1de17d0cc29b7269ec65f78f`. Every tracked TypeScript file, including declarations, demo, type-check fixtures and Vite config. File-level provenance/counterparts only; not exhaustive function or behavioral equivalence. Existing headers and licensing remain authoritative.

**Adapted** identifies a corresponding adapted responsibility; **related** is a
legacy counterpart or historical concept, not a claim that code was copied.
**Reimplemented** identifies reconstructed contracts/formulas, including authorized
bytecode rather than recovered Java source. **New**, **composition** and **generated**
make no direct Java-file claim; **unresolved** reserves explicit uncertainty.
The universal-looking copyright boilerplate is not evidence of a direct port.

FM2014 TouchGraph classes below are local **counterparts**. Upstream port/reference
identity remains in [NOTICE](../../NOTICE) and [tests/reference/README.md](../../tests/reference/README.md). In particular,
headless Java test hosts must not be mistaken for upstream source. Cokus attribution
remains Shawn Cokus → David Blei’s lda-c → Java adaptation → TypeScript.

Find a TypeScript path or a Java class in this page or the JSON. MAP links lead to
requirements, TODOs and scoped evidence in [TRACEABILITY.md](TRACEABILITY.md).
Java/JAR contents are not redistributed. Optional local verification:

```sh
just java-provenance --reference-root fm2014=../knowceans/knowceans-freshmind-2014 \
  --reference-root lda-reference=../knowceans/knowceans-ilda
```

The JSON has explicit per-file decisions; validation never guesses an origin
from a filename. New/moved tracked TypeScript files require an inventory update.
Hashes pin reference bytes, not TypeScript equivalence or changed licensing.

| TypeScript file | Relationship | Java references | Behavior map | Rationale |
| --- | --- | --- | --- | --- |
| [demo/file-controls.ts](../../demo/file-controls.ts) | new | — | — | New web application composition/control surface; no Java source translation claimed. |
| [demo/freshmind.ts](../../demo/freshmind.ts) | new | — | — | New web application composition/control surface; no Java source translation claimed. |
| [demo/main.ts](../../demo/main.ts) | new | — | — | New web application composition/control surface; no Java source translation claimed. |
| [demo/rfc-showcase.ts](../../demo/rfc-showcase.ts) | new | — | — | New web application composition/control surface; no Java source translation claimed. |
| [demo/selection-editor.ts](../../demo/selection-editor.ts) | new | — | — | New web application composition/control surface; no Java source translation claimed. |
| [demo/vite-env.d.ts](../../demo/vite-env.d.ts) | new | — | — | New web application composition/control surface; no Java source translation claimed. |
| [src/fm/browser/content.ts](../../src/fm/browser/content.ts) | related | [org.knowceans.freshmind.HintButton](#ref-fm2014-hintbutton)<br>[org.knowceans.freshmind.io.BrowserLauncher](#ref-fm2014-io-browserlauncher) | [MAP-12](TRACEABILITY.md#map-12), [MAP-13](TRACEABILITY.md#map-13) | Related node-content/resource actions; the inert annotation allowlist and explicit URL policy are new. |
| [src/fm/browser/document.ts](../../src/fm/browser/document.ts) | new | — | [MAP-02](TRACEABILITY.md#map-02), [MAP-02](TRACEABILITY.md#map-02) | New browser lifecycle, rendering and interaction composition; no direct Java file translation claimed. |
| [src/fm/browser/index.ts](../../src/fm/browser/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/browser/label-editing.ts](../../src/fm/browser/label-editing.ts) | related | [org.knowceans.freshmind.editors.FreshNodeEditor](#ref-fm2014-editors-freshnodeeditor)<br>[org.knowceans.freshmind.editors.FreshEdgeEditor](#ref-fm2014-editors-freshedgeeditor) | — | Related editable Java labels; moving DOM components and lifecycle handling are a new implementation. |
| [src/fm/browser/navigation.ts](../../src/fm/browser/navigation.ts) | related | [org.knowceans.freshmind.FreshNavigateUI](#ref-fm2014-freshnavigateui)<br>[org.knowceans.freshmind.FreshCommands](#ref-fm2014-freshcommands) | — | Related legacy navigation handlers; DOM event routing and focus ownership are a new browser implementation. |
| [src/fm/browser/panel.ts](../../src/fm/browser/panel.ts) | related | [org.knowceans.freshmind.FreshmindBrowser](#ref-fm2014-freshmindbrowser)<br>[org.knowceans.freshmind.tg.TGPanel](#ref-fm2014-tg-tgpanel) | [MAP-15](TRACEABILITY.md#map-15) | Related Java browser/panel responsibilities, reorganized through narrow module contracts; not a Swing class translation. |
| [src/fm/browser/query-editor.ts](../../src/fm/browser/query-editor.ts) | new | — | — | New browser lifecycle, rendering and interaction composition; no direct Java file translation claimed. |
| [src/fm/browser/radius-two.ts](../../src/fm/browser/radius-two.ts) | new | — | — | New browser lifecycle, rendering and interaction composition; no direct Java file translation claimed. |
| [src/fm/browser/readability.ts](../../src/fm/browser/readability.ts) | new | — | — | New browser lifecycle, rendering and interaction composition; no direct Java file translation claimed. |
| [src/fm/browser/search-focus.ts](../../src/fm/browser/search-focus.ts) | new | — | — | New browser lifecycle, rendering and interaction composition; no direct Java file translation claimed. |
| [src/fm/browser/search.ts](../../src/fm/browser/search.ts) | related | [org.knowceans.freshmind.ir.search.NodeQueryAdapter](#ref-fm2014-ir-search-nodequeryadapter)<br>[org.knowceans.freshmind.ir.index.IndexLdaClient](#ref-fm2014-ir-index-indexldaclient) | [MAP-11](TRACEABILITY.md#map-11) | Related graph-search coordination; independent IR, workers, source generations and graph replacement guards are new. |
| [src/fm/browser/structural-editing.ts](../../src/fm/browser/structural-editing.ts) | adapted | [org.knowceans.freshmind.FreshCommands](#ref-fm2014-freshcommands) | — | Browser routing for adapted structural commands; platform events, focus and disposal are new. |
| [src/fm/cluster/index.ts](../../src/fm/cluster/index.ts) | related | [org.knowceans.freshmind.cluster.MarkovGraphClusterer](#ref-fm2014-cluster-markovgraphclusterer)<br>[org.knowceans.freshmind.cluster.ChineseWhispers](#ref-fm2014-cluster-chinesewhispers) | — | Related clustering purpose only: current Graphology components/Louvain do not port these legacy algorithms. |
| [src/fm/config/core.ts](../../src/fm/config/core.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/config/fm2014.ts](../../src/fm/config/fm2014.ts) | generated | — | — | Generated by scripts/sync-fm-config.mjs from config/fm2014.types.yaml; that profile records migrated type values. No single Java source file is its generator. |
| [src/fm/config/index.ts](../../src/fm/config/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/config/registry.ts](../../src/fm/config/registry.ts) | related | [org.knowceans.freshmind.NodeTypes](#ref-fm2014-nodetypes)<br>[org.knowceans.freshmind.EdgeTypes](#ref-fm2014-edgetypes) | — | Related semantic type roles; YAML inheritance and strict validation are newly implemented. |
| [src/fm/config/types.ts](../../src/fm/config/types.ts) | related | [org.knowceans.freshmind.NodeTypes](#ref-fm2014-nodetypes)<br>[org.knowceans.freshmind.EdgeTypes](#ref-fm2014-edgetypes)<br>[org.knowceans.freshmind.ItemShapes](#ref-fm2014-itemshapes) | — | Related type/style vocabulary, expressed as new TypeScript contracts rather than ported Java APIs. |
| [src/fm/config/validation.ts](../../src/fm/config/validation.ts) | new | — | — | New validated TypeScript type/style configuration; no direct Java file translation claimed. |
| [src/fm/config/yaml.ts](../../src/fm/config/yaml.ts) | new | — | — | New validated TypeScript type/style configuration; no direct Java file translation claimed. |
| [src/fm/core.ts](../../src/fm/core.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/edit/commands.ts](../../src/fm/edit/commands.ts) | related | [org.knowceans.freshmind.editors.FreshNodeEditor](#ref-fm2014-editors-freshnodeeditor)<br>[org.knowceans.freshmind.editors.FreshEdgeEditor](#ref-fm2014-editors-freshedgeeditor) | [MAP-03](TRACEABILITY.md#map-03), [MAP-03](TRACEABILITY.md#map-03) | Related editing fields; detached-candidate validation/atomic commands are current contracts. |
| [src/fm/edit/index.ts](../../src/fm/edit/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/edit/label.ts](../../src/fm/edit/label.ts) | new | — | — | New TypeScript infrastructure; no direct Java file translation claimed. |
| [src/fm/edit/structure.ts](../../src/fm/edit/structure.ts) | adapted | [org.knowceans.freshmind.FreshCommands](#ref-fm2014-freshcommands) | [MAP-03](TRACEABILITY.md#map-03), [MAP-03](TRACEABILITY.md#map-03) | Adapted linked-node/sibling/link command semantics; local snapshot clipboard and atomic failure handling are current contracts. |
| [src/fm/geometry/cluster-boundary.ts](../../src/fm/geometry/cluster-boundary.ts) | new | — | — | New measured/browser geometry helpers; no direct Java translation claimed. |
| [src/fm/geometry/geometry.ts](../../src/fm/geometry/geometry.ts) | new | — | — | New measured/browser geometry helpers; no direct Java translation claimed. |
| [src/fm/geometry/importance.ts](../../src/fm/geometry/importance.ts) | new | — | — | New measured/browser geometry helpers; no direct Java translation claimed. |
| [src/fm/geometry/index.ts](../../src/fm/geometry/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/geometry/overlap.ts](../../src/fm/geometry/overlap.ts) | new | — | — | New measured/browser geometry helpers; no direct Java translation claimed. |
| [src/fm/geometry/relation-labels.ts](../../src/fm/geometry/relation-labels.ts) | new | — | — | New measured/browser geometry helpers; no direct Java translation claimed. |
| [src/fm/geometry/search-disk.ts](../../src/fm/geometry/search-disk.ts) | new | — | — | New measured/browser geometry helpers; no direct Java translation claimed. |
| [src/fm/geometry/shapes.ts](../../src/fm/geometry/shapes.ts) | related | [org.knowceans.freshmind.ItemShapes](#ref-fm2014-itemshapes) | — | Related Java shape vocabulary; SVG geometry/picking implementation is new. |
| [src/fm/index.ts](../../src/fm/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/io/codec.ts](../../src/fm/io/codec.ts) | new | — | [MAP-02](TRACEABILITY.md#map-02), [MAP-02](TRACEABILITY.md#map-02), [MAP-13](TRACEABILITY.md#map-13) | New native YAML contracts/validation, not Java XML serialization compatibility. |
| [src/fm/io/index.ts](../../src/fm/io/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/io/types.ts](../../src/fm/io/types.ts) | new | — | — | New native YAML contracts/validation, not Java XML serialization compatibility. |
| [src/fm/io/yaml-value.ts](../../src/fm/io/yaml-value.ts) | new | — | — | New native YAML contracts/validation, not Java XML serialization compatibility. |
| [src/fm/ir/corpus.ts](../../src/fm/ir/corpus.ts) | new | — | [MAP-08](TRACEABILITY.md#map-08) | New graph-to-independent-IR boundary with stable-ID/provenance guards. |
| [src/fm/ir/graph.ts](../../src/fm/ir/graph.ts) | adapted | [org.knowceans.freshmind.ir.search.NodeQueryAdapter](#ref-fm2014-ir-search-nodequeryadapter) | [MAP-10](TRACEABILITY.md#map-10), [MAP-10](TRACEABILITY.md#map-10) | Adapted graph-native query/result/feedback idea; explicit metadata, exact source validity and ordinary-edge preservation replace encoded roles. |
| [src/fm/ir/index.ts](../../src/fm/ir/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/ir/view-seeds.ts](../../src/fm/ir/view-seeds.ts) | new | — | — | New graph-to-independent-IR boundary with stable-ID/provenance guards. |
| [src/fm/model/document.ts](../../src/fm/model/document.ts) | new | — | [MAP-01](TRACEABILITY.md#map-01) | New TypeScript document/options/validation ownership around adapted graph objects. |
| [src/fm/model/edge.ts](../../src/fm/model/edge.ts) | adapted | [org.knowceans.freshmind.FreshEdge](#ref-fm2014-freshedge) | — | Adapted semantic relation/curve fields with explicit stable edge identity and validated metadata. |
| [src/fm/model/graph.ts](../../src/fm/model/graph.ts) | new | — | [MAP-01](TRACEABILITY.md#map-01) | New TypeScript document/options/validation ownership around adapted graph objects. |
| [src/fm/model/index.ts](../../src/fm/model/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/model/locality.ts](../../src/fm/model/locality.ts) | new | — | — | New TypeScript document/options/validation ownership around adapted graph objects. |
| [src/fm/model/metadata.ts](../../src/fm/model/metadata.ts) | new | — | — | New TypeScript document/options/validation ownership around adapted graph objects. |
| [src/fm/model/node.ts](../../src/fm/model/node.ts) | adapted | [org.knowceans.freshmind.FreshNode](#ref-fm2014-freshnode) | — | Adapted semantic node fields on the shared TG node; typed validation and metadata are modern extensions. |
| [src/fm/model/types.ts](../../src/fm/model/types.ts) | new | — | — | New TypeScript document/options/validation ownership around adapted graph objects. |
| [src/fm/navigate/candidates.ts](../../src/fm/navigate/candidates.ts) | adapted | [org.knowceans.freshmind.keyboard.AngleItem](#ref-fm2014-keyboard-angleitem) | — | Adapted directional candidate intent; deterministic screen-coordinate ranking is a current implementation choice. |
| [src/fm/navigate/controller.ts](../../src/fm/navigate/controller.ts) | adapted | [org.knowceans.freshmind.FreshCommands](#ref-fm2014-freshcommands) | [MAP-04](TRACEABILITY.md#map-04) | Adapted navigation/preselection command semantics with explicit browser focus and lifecycle ownership. |
| [src/fm/navigate/index.ts](../../src/fm/navigate/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/navigate/keymap.ts](../../src/fm/navigate/keymap.ts) | adapted | [org.knowceans.freshmind.keyboard.FreshKeys](#ref-fm2014-keyboard-freshkeys) | — | Adapted command/key intent; browser-safe changes and platform fallbacks are documented in the keyboard audit. |
| [src/fm/navigate/types.ts](../../src/fm/navigate/types.ts) | new | — | — | New TypeScript infrastructure; no direct Java file translation claimed. |
| [src/fm/render/index.ts](../../src/fm/render/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/render/presentation.ts](../../src/fm/render/presentation.ts) | related | [org.knowceans.freshmind.FreshNode](#ref-fm2014-freshnode)<br>[org.knowceans.freshmind.FreshEdge](#ref-fm2014-freshedge) | — | Related Java drawing responsibilities; SVG/D3 and measured presentation are a new implementation. |
| [src/fm/render/radius-two.ts](../../src/fm/render/radius-two.ts) | new | — | — | New TypeScript infrastructure; no direct Java file translation claimed. |
| [src/fm/rfc/clusters.ts](../../src/fm/rfc/clusters.ts) | new | — | — | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. |
| [src/fm/rfc/controller.ts](../../src/fm/rfc/controller.ts) | related | [org.knowceans.freshmind.rfc.RfcManager](#ref-fm2014-rfc-rfcmanager)<br>[org.knowceans.freshmind.tg.FMLayout](#ref-fm2014-tg-fmlayout) | [MAP-07](TRACEABILITY.md#map-07) | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. Java classes are historical concept references only; exact old figures are outside scope. |
| [src/fm/rfc/exclusion.ts](../../src/fm/rfc/exclusion.ts) | new | — | — | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. |
| [src/fm/rfc/forces.ts](../../src/fm/rfc/forces.ts) | related | [org.knowceans.freshmind.rfc.RfcManager](#ref-fm2014-rfc-rfcmanager)<br>[org.knowceans.freshmind.tg.FMLayout](#ref-fm2014-tg-fmlayout) | — | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. Java classes are historical concept references only; exact old figures are outside scope. |
| [src/fm/rfc/importance.ts](../../src/fm/rfc/importance.ts) | new | — | — | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. |
| [src/fm/rfc/index.ts](../../src/fm/rfc/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/rfc/metric.ts](../../src/fm/rfc/metric.ts) | new | — | — | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. |
| [src/fm/rfc/presets.ts](../../src/fm/rfc/presets.ts) | new | — | — | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. |
| [src/fm/rfc/stabilization.ts](../../src/fm/rfc/stabilization.ts) | new | — | — | New adaptive motion detection/damping; no Java predecessor claimed. Generic inherited copyright/header text is not evidence of a function-level origin. |
| [src/fm/rfc/structures.ts](../../src/fm/rfc/structures.ts) | related | [org.knowceans.freshmind.rfc.RfcManager](#ref-fm2014-rfc-rfcmanager)<br>[org.knowceans.freshmind.tg.FMLayout](#ref-fm2014-tg-fmlayout) | — | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. Java classes are historical concept references only; exact old figures are outside scope. |
| [src/fm/rfc/types.ts](../../src/fm/rfc/types.ts) | new | — | — | New paper-driven RFC implementation/extension; modern forces, memberships and policies are not a Java prototype port. |
| [src/fm/struct-view/controller.ts](../../src/fm/struct-view/controller.ts) | new | — | — | New deterministic projections/locality adapters, including the experimental radius-two study. |
| [src/fm/struct-view/index.ts](../../src/fm/struct-view/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/struct-view/locality.ts](../../src/fm/struct-view/locality.ts) | new | — | — | New deterministic projections/locality adapters, including the experimental radius-two study. |
| [src/fm/struct-view/projection.ts](../../src/fm/struct-view/projection.ts) | new | — | [MAP-07](TRACEABILITY.md#map-07) | New deterministic projections/locality adapters, including the experimental radius-two study. |
| [src/fm/struct-view/radius-two.ts](../../src/fm/struct-view/radius-two.ts) | new | — | [MAP-07](TRACEABILITY.md#map-07) | New deterministic projections/locality adapters, including the experimental radius-two study. |
| [src/fm/struct/index.ts](../../src/fm/struct/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/struct/model.ts](../../src/fm/struct/model.ts) | new | — | — | New stable-ID tree/DAG/cluster storage and validation contracts. |
| [src/fm/ui/choice-radios.ts](../../src/fm/ui/choice-radios.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/graph-aspect.ts](../../src/fm/ui/graph-aspect.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/index.ts](../../src/fm/ui/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/fm/ui/keymap.ts](../../src/fm/ui/keymap.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/label-editing.ts](../../src/fm/ui/label-editing.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/motion-controls.ts](../../src/fm/ui/motion-controls.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/node-details.ts](../../src/fm/ui/node-details.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/node-importance.ts](../../src/fm/ui/node-importance.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/numeric-sliders.ts](../../src/fm/ui/numeric-sliders.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/panel-toggle.ts](../../src/fm/ui/panel-toggle.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/readability.ts](../../src/fm/ui/readability.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/rfc-controls.ts](../../src/fm/ui/rfc-controls.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/search-controls.ts](../../src/fm/ui/search-controls.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/structural-view.ts](../../src/fm/ui/structural-view.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/substructures.ts](../../src/fm/ui/substructures.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/fm/ui/zoom-controls.ts](../../src/fm/ui/zoom-controls.ts) | new | — | — | New caller-owned browser controls and accessible DOM bindings; no Swing component port claimed. |
| [src/ir/browser/index.ts](../../src/ir/browser/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/ir/browser/protocol.ts](../../src/ir/browser/protocol.ts) | new | — | — | New worker/session lifecycle; replaces legacy threading rather than copying its lifecycle. |
| [src/ir/browser/session.ts](../../src/ir/browser/session.ts) | new | — | [MAP-11](TRACEABILITY.md#map-11), [MAP-12](TRACEABILITY.md#map-12) | New worker/session lifecycle; replaces legacy threading rather than copying its lifecycle. |
| [src/ir/browser/worker-client.ts](../../src/ir/browser/worker-client.ts) | new | — | [MAP-11](TRACEABILITY.md#map-11) | New worker/session lifecycle; replaces legacy threading rather than copying its lifecycle. |
| [src/ir/browser/worker.ts](../../src/ir/browser/worker.ts) | new | — | — | New worker/session lifecycle; replaces legacy threading rather than copying its lifecycle. |
| [src/ir/core.ts](../../src/ir/core.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/ir/corpus/corpus.ts](../../src/ir/corpus/corpus.ts) | new | — | — | New immutable content/query contracts, analysis and exact source-snapshot identity. |
| [src/ir/corpus/index.ts](../../src/ir/corpus/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/ir/corpus/request.ts](../../src/ir/corpus/request.ts) | new | — | — | New immutable content/query contracts, analysis and exact source-snapshot identity. |
| [src/ir/corpus/types.ts](../../src/ir/corpus/types.ts) | new | — | — | New immutable content/query contracts, analysis and exact source-snapshot identity. |
| [src/ir/index.ts](../../src/ir/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/ir/lexical/elasticlunr-runtime.d.ts](../../src/ir/lexical/elasticlunr-runtime.d.ts) | new | — | — | Handwritten TypeScript declaration for generated npm elasticlunr ESM. The engine is JavaScript/MIT, not Java; generator/package notices identify its source. |
| [src/ir/lexical/index.ts](../../src/ir/lexical/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/ir/lexical/lexical.ts](../../src/ir/lexical/lexical.ts) | related | [org.knowceans.freshmind.ir.search.LuceneSearch](#ref-fm2014-ir-search-lucenesearch)<br>[org.knowceans.freshmind.ir.search.LuceneSimilaritySearch](#ref-fm2014-ir-search-lucenesimilaritysearch) | [MAP-08](TRACEABILITY.md#map-08) | Elasticlunr replacement of literal/term-vector retrieval roles; Lucene scores and legacy ordinal-as-score defect are not reproduced. |
| [src/ir/lexical/query.ts](../../src/ir/lexical/query.ts) | related | [org.knowceans.freshmind.ir.search.SimpleQuery](#ref-fm2014-ir-search-simplequery) | — | Related FM query grammar; intentionally bounded parser, not full Lucene parser parity. |
| [src/ir/topics/cokus.ts](../../src/ir/topics/cokus.ts) | adapted | [org.knowceans.util.CokusRandom](#ref-lda-reference-org-knowceans-util-cokusrandom) | — | Shawn Cokus MT19937 → David Blei lda-c → Gregor Heinrich Java adaptation → TypeScript. Copyright is not reassigned to the Java adapter; see NOTICE and LGPL text. |
| [src/ir/topics/gibbs.ts](../../src/ir/topics/gibbs.ts) | adapted | [org.knowceans.topics.simple.LdaGibbs](#ref-lda-reference-org-knowceans-topics-simple-ldagibbs) | — | Port/adaptation of the separately available knowceans-ilda sampler; this is not the missing org.knowceans.dirichlet binary implementation. See the pinned sampler harness. |
| [src/ir/topics/index.ts](../../src/ir/topics/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/ir/topics/model.ts](../../src/ir/topics/model.ts) | reimplemented | [org.knowceans.freshmind.ir.semantic.LdaSimilaritiesFm](#ref-fm2014-ir-semantic-ldasimilaritiesfm)<br>[org.knowceans.dirichlet.lda.LdaQueryClient](#ref-binary-ldaqueryclient)<br>[org.knowceans.dirichlet.lda.LdaTopicSimilarities](#ref-binary-ldatopicsimilarities)<br>[org.knowceans.dirichlet.lda.LdaGibbsQuerySampler](#ref-binary-ldagibbsquerysampler) | [MAP-09](TRACEABILITY.md#map-09) | Mathematical/API reimplementation checked against authorized Dirichlet bytecode on synthetic matrices, not a recovered Java source port. Binary members are pinned individually; sources/JARs are not redistributed. |
| [src/ir/topics/numeric.ts](../../src/ir/topics/numeric.ts) | new | — | — | New TypeScript mathematical/model support; specific Java references are recorded where verified. |
| [src/ir/topics/similarities.ts](../../src/ir/topics/similarities.ts) | reimplemented | [org.knowceans.freshmind.ir.semantic.LdaSimilaritiesFm](#ref-fm2014-ir-semantic-ldasimilaritiesfm)<br>[org.knowceans.dirichlet.lda.LdaQueryClient](#ref-binary-ldaqueryclient)<br>[org.knowceans.dirichlet.lda.LdaTopicSimilarities](#ref-binary-ldatopicsimilarities)<br>[org.knowceans.dirichlet.lda.LdaGibbsQuerySampler](#ref-binary-ldagibbsquerysampler) | [MAP-09](TRACEABILITY.md#map-09) | Mathematical/API reimplementation checked against authorized Dirichlet bytecode on synthetic matrices, not a recovered Java source port. Binary members are pinned individually; sources/JARs are not redistributed. |
| [src/tg/browser/index.ts](../../src/tg/browser/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/tg/browser/panel.ts](../../src/tg/browser/panel.ts) | adapted | [org.knowceans.freshmind.tg.TGPanel](#ref-fm2014-tg-tgpanel)<br>[org.knowceans.freshmind.tg.interaction.DragNodeUI](#ref-fm2014-tg-interaction-dragnodeui)<br>[org.knowceans.freshmind.tg.interaction.GLNavigateUI](#ref-fm2014-tg-interaction-glnavigateui) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/core.ts](../../src/tg/core.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/tg/graph/error.ts](../../src/tg/graph/error.ts) | adapted | [org.knowceans.freshmind.tg.TGException](#ref-fm2014-tg-tgexception) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/graph/graph.ts](../../src/tg/graph/graph.ts) | adapted | [org.knowceans.freshmind.tg.graphelements.GraphEltSet](#ref-fm2014-tg-graphelements-grapheltset) | [MAP-01](TRACEABILITY.md#map-01) | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/graph/index.ts](../../src/tg/graph/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/tg/graph/locality-utils.ts](../../src/tg/graph/locality-utils.ts) | adapted | [org.knowceans.freshmind.tg.LocalityUtils](#ref-fm2014-tg-localityutils) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/graph/locality.ts](../../src/tg/graph/locality.ts) | adapted | [org.knowceans.freshmind.tg.graphelements.Locality](#ref-fm2014-tg-graphelements-locality)<br>[org.knowceans.freshmind.tg.graphelements.VisibleLocality](#ref-fm2014-tg-graphelements-visiblelocality) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/graph/traversal.ts](../../src/tg/graph/traversal.ts) | adapted | [org.knowceans.freshmind.tg.graphelements.GESUtils](#ref-fm2014-tg-graphelements-gesutils) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/graph/types.ts](../../src/tg/graph/types.ts) | new | — | — | New TypeScript infrastructure; no direct Java file translation claimed. |
| [src/tg/index.ts](../../src/tg/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/tg/layout/index.ts](../../src/tg/layout/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/tg/layout/layout.ts](../../src/tg/layout/layout.ts) | adapted | [org.knowceans.freshmind.tg.TGLayout](#ref-fm2014-tg-tglayout) | [MAP-06](TRACEABILITY.md#map-06) | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/layout/node-stabilization.ts](../../src/tg/layout/node-stabilization.ts) | new | — | [MAP-06](TRACEABILITY.md#map-06) | New adaptive motion detection/damping; no Java predecessor claimed. Generic inherited copyright/header text is not evidence of a function-level origin. |
| [src/tg/layout/stabilization.ts](../../src/tg/layout/stabilization.ts) | new | — | — | New adaptive motion detection/damping; no Java predecessor claimed. Generic inherited copyright/header text is not evidence of a function-level origin. |
| [src/tg/layout/types.ts](../../src/tg/layout/types.ts) | new | — | — | New TypeScript infrastructure; no direct Java file translation claimed. |
| [src/tg/lenses/horizontal-stretch.ts](../../src/tg/lenses/horizontal-stretch.ts) | adapted | [org.knowceans.freshmind.FreshmindBrowser](#ref-fm2014-freshmindbrowser) | [MAP-05](TRACEABILITY.md#map-05) | FreshmindBrowser.HorizontalStretchLens: fixed Java x factor 1.5 generalized to validated display aspect choices; physical coordinates stay separate. |
| [src/tg/lenses/hyperbolic.ts](../../src/tg/lenses/hyperbolic.ts) | adapted | [org.knowceans.freshmind.tg.interaction.HyperScroll](#ref-fm2014-tg-interaction-hyperscroll) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/lenses/index.ts](../../src/tg/lenses/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/tg/lenses/lens-set.ts](../../src/tg/lenses/lens-set.ts) | adapted | [org.knowceans.freshmind.tg.TGAbstractLens](#ref-fm2014-tg-tgabstractlens)<br>[org.knowceans.freshmind.tg.TGLensSet](#ref-fm2014-tg-tglensset) | [MAP-05](TRACEABILITY.md#map-05) | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/lenses/point.ts](../../src/tg/lenses/point.ts) | adapted | [org.knowceans.freshmind.tg.TGPoint2D](#ref-fm2014-tg-tgpoint2d) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/lenses/transforms.ts](../../src/tg/lenses/transforms.ts) | adapted | [org.knowceans.freshmind.tg.interaction.HVScroll](#ref-fm2014-tg-interaction-hvscroll)<br>[org.knowceans.freshmind.tg.interaction.ZoomScroll](#ref-fm2014-tg-interaction-zoomscroll)<br>[org.knowceans.freshmind.tg.interaction.RotateScroll](#ref-fm2014-tg-interaction-rotatescroll) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/model/edge.ts](../../src/tg/model/edge.ts) | adapted | [org.knowceans.freshmind.tg.Edge](#ref-fm2014-tg-edge) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [src/tg/model/index.ts](../../src/tg/model/index.ts) | composition | — | — | TypeScript public entry point/re-exports; follow its target modules for Java information. |
| [src/tg/model/node.ts](../../src/tg/model/node.ts) | adapted | [org.knowceans.freshmind.tg.Node](#ref-fm2014-tg-node) | — | Adapted TouchGraph responsibility/equations with browser/collection/scheduling extensions. These pinned files are FM2014 counterparts; the upstream TouchGraph revision and unmodified-vs-test-host distinction remain in NOTICE and tests/reference/README.md. |
| [tests/types/ir.ts](../../tests/types/ir.ts) | new | — | — | New external-consumer declaration fixture; no Java origin. |
| [tests/types/modules.ts](../../tests/types/modules.ts) | new | — | — | New external-consumer declaration fixture; no Java origin. |
| [vite.config.ts](../../vite.config.ts) | new | — | — | New TypeScript infrastructure; no direct Java file translation claimed. |

## Pinned Java references

Root paths are hints, not required machine-specific locations. Override them
with `--reference-root NAME=DIRECTORY`; ordinary checks need no sibling checkout.

<a id="ref-fm2014-tg-node"></a>

**org.knowceans.freshmind.tg.Node** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/Node.java`
- SHA-256: `166c4de088aa0a58222f187c0f81710d3fd1616458e65df953b40997909fbd55`

<a id="ref-fm2014-tg-edge"></a>

**org.knowceans.freshmind.tg.Edge** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/Edge.java`
- SHA-256: `071fde9d854401758b45e3cad3dcefc4031307e8939726032a3b2a1ad6bebc94`

<a id="ref-fm2014-tg-graphelements-grapheltset"></a>

**org.knowceans.freshmind.tg.graphelements.GraphEltSet** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/graphelements/GraphEltSet.java`
- SHA-256: `d486f084944a3895b29c0211edcdfb85be8befd29297c104848c806b900778f6`

<a id="ref-fm2014-tg-graphelements-locality"></a>

**org.knowceans.freshmind.tg.graphelements.Locality** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/graphelements/Locality.java`
- SHA-256: `805d5780e7e4e312c6b3832c958d98bc77ad78fe495c3419e74383309964d26b`

<a id="ref-fm2014-tg-graphelements-visiblelocality"></a>

**org.knowceans.freshmind.tg.graphelements.VisibleLocality** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/graphelements/VisibleLocality.java`
- SHA-256: `d66853a0cf7c5fd9ecdf0677120b4ef6a060493f155509e88f4ad1d0b0de833d`

<a id="ref-fm2014-tg-localityutils"></a>

**org.knowceans.freshmind.tg.LocalityUtils** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/LocalityUtils.java`
- SHA-256: `85780214548ebcf4061223441905f4e3f97d1e3fce297aad138d6d104d9b5949`

<a id="ref-fm2014-tg-graphelements-gesutils"></a>

**org.knowceans.freshmind.tg.graphelements.GESUtils** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/graphelements/GESUtils.java`
- SHA-256: `1354a010370d18116674e76151a7819e1961067cd06070756b59392c0e8d9208`

<a id="ref-fm2014-tg-tgexception"></a>

**org.knowceans.freshmind.tg.TGException** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/TGException.java`
- SHA-256: `0e840813583c8454374baec8b834ab3cf93b824be811ac4cebcee534ec5ea8d1`

<a id="ref-fm2014-tg-tglayout"></a>

**org.knowceans.freshmind.tg.TGLayout** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/TGLayout.java`
- SHA-256: `bd7b55c7d14ecbd6bbecd57d15df29f51ed1725c5fdf8297cd005f3fb531c395`

<a id="ref-fm2014-tg-tgpoint2d"></a>

**org.knowceans.freshmind.tg.TGPoint2D** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/TGPoint2D.java`
- SHA-256: `0bcaea3335e3c1604252290928ba05fda7b4031eb514fd8884dacac97c8cce98`

<a id="ref-fm2014-tg-tgabstractlens"></a>

**org.knowceans.freshmind.tg.TGAbstractLens** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/TGAbstractLens.java`
- SHA-256: `fac14a5d2da0ee723ce9b2505cb6a13a1678f30b24e69f1c82abf67414d595e0`

<a id="ref-fm2014-tg-tglensset"></a>

**org.knowceans.freshmind.tg.TGLensSet** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/TGLensSet.java`
- SHA-256: `e957500e4e967f142c36354260d68a79dc6adc434e9f5139e61de97f1460bc7d`

<a id="ref-fm2014-tg-interaction-hyperscroll"></a>

**org.knowceans.freshmind.tg.interaction.HyperScroll** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/interaction/HyperScroll.java`
- SHA-256: `f76b8e326eacf50d5deb4b94b0d2269f5214bfe6c4730f846fdf5fd2c887a4e4`

<a id="ref-fm2014-tg-interaction-hvscroll"></a>

**org.knowceans.freshmind.tg.interaction.HVScroll** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/interaction/HVScroll.java`
- SHA-256: `5ab668b95b259b9d2911aec3807fd235aa79dd26afa02c0830fb1d81a277770d`

<a id="ref-fm2014-tg-interaction-zoomscroll"></a>

**org.knowceans.freshmind.tg.interaction.ZoomScroll** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/interaction/ZoomScroll.java`
- SHA-256: `baecba3506ee82fcdaa7305a4a17acd50d0d910b24bc7e982e83ee04f2a5ffa1`

<a id="ref-fm2014-tg-interaction-rotatescroll"></a>

**org.knowceans.freshmind.tg.interaction.RotateScroll** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/interaction/RotateScroll.java`
- SHA-256: `98a70cdb2f9bf11c6ea90c6c813bff915469d550e22bf0965390acaab0116769`

<a id="ref-fm2014-tg-tgpanel"></a>

**org.knowceans.freshmind.tg.TGPanel** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/TGPanel.java`
- SHA-256: `c2c5ff3ee043c2bc11c5539860bcdc905f54027fed4438ee43b05a3441add469`

<a id="ref-fm2014-tg-interaction-dragnodeui"></a>

**org.knowceans.freshmind.tg.interaction.DragNodeUI** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/interaction/DragNodeUI.java`
- SHA-256: `dc824cb0924805aaabbe03120abd87b371da0d7e00685179b607fb5a905321ad`

<a id="ref-fm2014-tg-interaction-glnavigateui"></a>

**org.knowceans.freshmind.tg.interaction.GLNavigateUI** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/interaction/GLNavigateUI.java`
- SHA-256: `b216d05a60a3ba0cafd7badb3194d53d496c89563346f7f8ff5dfaadddf86adf`

<a id="ref-fm2014-freshmindbrowser"></a>

**org.knowceans.freshmind.FreshmindBrowser** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/FreshmindBrowser.java`
- SHA-256: `ce9a2b88a3846d60058556d2dc858285b9904a1870104a36cfaad09df60fc2fb`

<a id="ref-fm2014-freshnode"></a>

**org.knowceans.freshmind.FreshNode** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/FreshNode.java`
- SHA-256: `16f9769b27b2fc295b0c7621799878a594a7de3d895d4e6091116989840980af`

<a id="ref-fm2014-freshedge"></a>

**org.knowceans.freshmind.FreshEdge** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/FreshEdge.java`
- SHA-256: `5879fd26cfa4275d819b8174342a825f9b5db8f0232eba530e9943bffa4bf941`

<a id="ref-fm2014-freshcommands"></a>

**org.knowceans.freshmind.FreshCommands** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/FreshCommands.java`
- SHA-256: `e11427ea99f05d15f9e712e34d670b5854db5c85a4296194a8039e18dcd43e08`

<a id="ref-fm2014-keyboard-angleitem"></a>

**org.knowceans.freshmind.keyboard.AngleItem** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/keyboard/AngleItem.java`
- SHA-256: `53ed0b5235c1943d7f4286b6efad8998480c58f9a6767175d88e75b60acee39f`

<a id="ref-fm2014-keyboard-freshkeys"></a>

**org.knowceans.freshmind.keyboard.FreshKeys** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/keyboard/FreshKeys.java`
- SHA-256: `a4812fbb79f59ca0f883b6e51f9912ccffa2f11f3d5232df0d279e6d86deb349`

<a id="ref-fm2014-ir-search-nodequeryadapter"></a>

**org.knowceans.freshmind.ir.search.NodeQueryAdapter** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/ir/search/NodeQueryAdapter.java`
- SHA-256: `df24c1b22a4bdf3ec580b1a573b73cac49f35bf483a979744fb15309ca2c1a5d`

<a id="ref-fm2014-freshnavigateui"></a>

**org.knowceans.freshmind.FreshNavigateUI** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/FreshNavigateUI.java`
- SHA-256: `b83ef2c5fc8b7cd8981c75233d11999fddb504de35229ec93fc885af6e64d178`

<a id="ref-fm2014-hintbutton"></a>

**org.knowceans.freshmind.HintButton** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/HintButton.java`
- SHA-256: `9489f035869e2810af9beb7335cf5a99b963743546d30dd217a90f7ce8294d74`

<a id="ref-fm2014-io-browserlauncher"></a>

**org.knowceans.freshmind.io.BrowserLauncher** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/io/BrowserLauncher.java`
- SHA-256: `c7fa78b5dc1a640ed82f060ada38ee6ef8d75852b5b632067223f527fc499568`

<a id="ref-fm2014-editors-freshnodeeditor"></a>

**org.knowceans.freshmind.editors.FreshNodeEditor** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/editors/FreshNodeEditor.java`
- SHA-256: `c87ce00b31ce7c9840af937a5cc4845145549c726dc4a0128daa351ea730d80c`

<a id="ref-fm2014-editors-freshedgeeditor"></a>

**org.knowceans.freshmind.editors.FreshEdgeEditor** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/editors/FreshEdgeEditor.java`
- SHA-256: `14ecfbc491906c5a35fd4a539dce8c13413ea5a7e6ee6b4197f3617e3758baa2`

<a id="ref-fm2014-nodetypes"></a>

**org.knowceans.freshmind.NodeTypes** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/NodeTypes.java`
- SHA-256: `16c19760a2d7b4417f2a3d647f254d6227264f1ff4b904cab0d40fd97fecde33`

<a id="ref-fm2014-edgetypes"></a>

**org.knowceans.freshmind.EdgeTypes** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/EdgeTypes.java`
- SHA-256: `0fa0556a62a6ee48070244cb313e9c18822bd07655a16c3614c2edc593ec9be2`

<a id="ref-fm2014-itemshapes"></a>

**org.knowceans.freshmind.ItemShapes** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/ItemShapes.java`
- SHA-256: `fadb0f681db0329f07c1db52bb878def61443c89ea3e5be3026b1fdff1f0df80`

<a id="ref-fm2014-ir-search-simplequery"></a>

**org.knowceans.freshmind.ir.search.SimpleQuery** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/ir/search/SimpleQuery.java`
- SHA-256: `87c338b99fa03a493dea91de0b1c3349e766ef431aea670029798ac1a7375807`

<a id="ref-fm2014-ir-search-lucenesearch"></a>

**org.knowceans.freshmind.ir.search.LuceneSearch** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/ir/search/LuceneSearch.java`
- SHA-256: `e3d817013c0a4ebcd11b9f7455782269802754a4673f0a3aec2b3b967be01f11`

<a id="ref-fm2014-ir-search-lucenesimilaritysearch"></a>

**org.knowceans.freshmind.ir.search.LuceneSimilaritySearch** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/ir/search/LuceneSimilaritySearch.java`
- SHA-256: `7963f53221de636f966fc9bd693eb82ae7a98e2b587a8b07d545e95f7b62f5bf`

<a id="ref-fm2014-ir-index-indexldaclient"></a>

**org.knowceans.freshmind.ir.index.IndexLdaClient** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/ir/index/IndexLdaClient.java`
- SHA-256: `344d0d6a1a1b5d7804566b75564eafa3648546388d6f2805bcfb55e39fe267fb`

<a id="ref-fm2014-cluster-markovgraphclusterer"></a>

**org.knowceans.freshmind.cluster.MarkovGraphClusterer** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/cluster/MarkovGraphClusterer.java`
- SHA-256: `2b04c009259b1716f5be851be47a2c2b19664e4e1816c89e940488cbe05fdd8b`

<a id="ref-fm2014-cluster-chinesewhispers"></a>

**org.knowceans.freshmind.cluster.ChineseWhispers** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/cluster/ChineseWhispers.java`
- SHA-256: `92853496c5060ede66a1c744c670d6704f2a02de8e2c98126276dbcb197c1791`

<a id="ref-fm2014-rfc-rfcmanager"></a>

**org.knowceans.freshmind.rfc.RfcManager** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/rfc/RfcManager.java`
- SHA-256: `19f89007d71d362136c811669ee5d8794d2e6e9f86cf3de71d5251fc349e3d3d`

<a id="ref-fm2014-tg-fmlayout"></a>

**org.knowceans.freshmind.tg.FMLayout** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/tg/FMLayout.java`
- SHA-256: `1fda5924f1d53ee16a911e1d286b429ada91528abfaa0e7eb1fb83df39be5a07`

<a id="ref-lda-reference-org-knowceans-topics-simple-ldagibbs"></a>

**org.knowceans.topics.simple.LdaGibbs** (java)

- Root: `lda-reference` — Separately available sampler/RNG source; not the same package generation as bundled Dirichlet.
- File: `src/org/knowceans/topics/simple/LdaGibbs.java`
- SHA-256: `8d098e7377840203ec757c5b926ca6ee4aa3243e933e0b2a4d642ec56a5460ed`

<a id="ref-lda-reference-org-knowceans-util-cokusrandom"></a>

**org.knowceans.util.CokusRandom** (java)

- Root: `lda-reference` — Separately available sampler/RNG source; not the same package generation as bundled Dirichlet.
- File: `src/org/knowceans/util/CokusRandom.java`
- SHA-256: `bb553def52d76f80c77bee1949024d35daca8443fc79dfd7c8ad9e206a90af1a`

<a id="ref-binary-ldaqueryclient"></a>

**org.knowceans.dirichlet.lda.LdaQueryClient** (java-bytecode)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `lib/knowceans-corpus.jar`; member: `org/knowceans/dirichlet/lda/LdaQueryClient.class`
- SHA-256: `36318c2a37c1eb1c109efe0264076b9236b3c86c03f6970e753ce7d04cea0fec`

<a id="ref-binary-ldatopicsimilarities"></a>

**org.knowceans.dirichlet.lda.LdaTopicSimilarities** (java-bytecode)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `lib/knowceans-corpus.jar`; member: `org/knowceans/dirichlet/lda/LdaTopicSimilarities.class`
- SHA-256: `a6b282061856da204a2fbfc5bc2f24e9c85231b0cca776a0a0fdac8caff6ceb3`

<a id="ref-binary-ldagibbsquerysampler"></a>

**org.knowceans.dirichlet.lda.LdaGibbsQuerySampler** (java-bytecode)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `lib/knowceans-corpus.jar`; member: `org/knowceans/dirichlet/lda/LdaGibbsQuerySampler.class`
- SHA-256: `02e2e8200a050cef468896a56902c184f4b3f884e14a93307fa022ef4ed0919a`

<a id="ref-fm2014-ir-semantic-ldasimilaritiesfm"></a>

**org.knowceans.freshmind.ir.semantic.LdaSimilaritiesFm** (java)

- Root: `fm2014` — Owner-provided FM2014 source and authorized bundled Dirichlet binary.
- File: `src/org/knowceans/freshmind/ir/semantic/LdaSimilaritiesFm.java`
- SHA-256: `39ffa948aeb28a2ffc02efcced412e5e1e84e18455f1b853c039a22d4d76964c`

