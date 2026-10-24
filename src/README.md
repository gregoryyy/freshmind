# Source modules

The library is one ESM package with three domains: `tg/` preserves TouchGraph, `fm/` adds Freshmind graph interactions, and `ir/` owns information retrieval independently of either graph domain. Each feature directory has an `index.ts` contract. Top-level `core.ts` and `index.ts` files compose the existing public API; they do not duplicate implementations. Existing `fm4`, `fm4/core`, `fm4/tg`, `fm4/tg/core`, `fm4/fm` and `fm4/fm/core` imports retain constructor identity and their named exports.

## TouchGraph

| Module | Responsibility | Package entry |
| --- | --- | --- |
| `tg/model/` | `Node` and `Edge`, split into their own files; graph objects share these identities. | `fm4/tg/model` |
| `tg/graph/` | Complete membership, locality/visibility, visitor contracts, exceptions, traversal and serialized locality animation. Complete adjacency remains owned by `GraphEltSet`. | `fm4/tg/graph` |
| `tg/layout/` | The original spring embedder, layout host/force contracts and timed runner; an optional general motion stabilizer runs after force accumulation. | `fm4/tg/layout` |
| `tg/lenses/` | Points, lens composition, HyperScroll-derived mapping and affine transforms. | `fm4/tg/lenses` |
| `tg/browser/` | SVG panel, pointer/drag/canvas interaction and mounting; depends on D3 and DOM APIs. | `fm4/tg/browser` |

`fm4/core` / `fm4/tg/core` compose the first four modules. `fm4` / `fm4/tg` also expose the browser panel. TouchGraph imports neither Freshmind nor IR. Its derived source headers retain the original copyright notices and point to root [LICENSE](../LICENSE) and [NOTICE](../NOTICE); the added motion stabilizer retains its Apache-2.0 header. Both root files must accompany redistribution. Java references retain their original full headers.

## Freshmind

| Module | Responsibility | Package entry |
| --- | --- | --- |
| `fm/model/` | FreshNode, FreshEdge, FreshGraph, document aggregate, metadata/options and the locality mutation-owner capability. Classes have one implementation each. | `fm4/fm/model` |
| `fm/config/` | Validated semantic/visual types, inheritance, preset and primitive validation. `core.ts` is parser-free; `index.ts` adds YAML type loading. | `fm4/fm/config/core`, `fm4/fm/config` |
| `fm/geometry/` | Pure node outlines, curve routing/picking, cluster hulls, bounded importance mapping, rectangle separation and relation-label candidate placement. | `fm4/fm/geometry` |
| `fm/render/` | SVG/D3 presentation using resolved styles, geometry and shared graph objects; cached relation-text measurements feed shared label/editor anchors. | `fm4/fm/render` |
| `fm/navigate/` | Headless candidates, preselection, timer/command state and key-map data. | `fm4/fm/navigate` |
| `fm/edit/` | Atomic validated node/relation edits, delegating to model and source-neighborhood owners. | `fm4/fm/edit` |
| `fm/io/` | Native transfer contracts, strict YAML values and complete-graph codec; DOM-free, with a YAML dependency. | `fm4/fm/io` |
| `fm/struct/` | Persistent tree/DAG/cluster definitions, validation, topology and spanning-tree selection. | `fm4/fm/struct` |
| `fm/rfc/` | Reinforcement projection, forces, importance, exclusion, optional stabilizer and transient controller. | `fm4/fm/rfc` |
| `fm/cluster/` | Community/component detection and conversion to stored memberships. | `fm4/fm/cluster` |
| `fm/struct-view/` | Reversible type filtering/leaf aggregation and the presented membership index. | `fm4/fm/struct-view` |
| `fm/ir/` | Graph-to-corpus adapter, query/context/result relations, provenance and rejection feedback. Retrieval algorithms live in IR. | `fm4/fm/ir` |
| `fm/browser/` | FreshmindPanel composition, DOM keyboard adapter, document installation/capture, safe annotations and graph-search coordination, stale graph/source checks and result visibility. Workers and models belong to IR. | `fm4/fm/browser` |
| `fm/ui/` | Reusable caller-owned controls, content popup and key-map/zoom/importance/structure/search bindings. | `fm4/fm/ui` |

`fm4/fm/core` composes the parser-free, DOM-free feature modules; model references to geometry/view types are type-only. `fm4/fm` adds browser, rendering, UI and codecs. `fm4/fm/ui/style.css` remains the optional stylesheet. Pure geometry no longer shares a directory with the DOM renderer, and navigation/edit/I/O modules no longer contain panel or DOM adapters.

The canonical type configuration remains `config/fm2014.types.yaml`; `just sync-fm-config` generates `fm/config/fm2014.ts` and the documented example. The demo owns file pickers/downloads and shared drafts for full/inline overlay editors. Numeric label-weight parsing is a pure edit helper; graph search shortcuts call optional navigation actions owned by the search UI. XML migration and reproducible research tools live in `scripts/`; proprietary reference datasets remain excluded.

```ts
import {FreshGraph, FreshNode, FreshEdge} from "fm4/fm/model";
import {TypeRegistry, freshmind2014Configuration} from "fm4/fm/config/core";
import {FreshmindPanel} from "fm4/fm/browser";
import {bindRfcControls} from "fm4/fm/ui";
```

## Information retrieval

| Module | Responsibility | Package entry |
| --- | --- | --- |
| `ir/corpus/` | Plain document/result/request contracts, deterministic corpus snapshots, normalization, annotation text extraction and validation. | `fm4/ir/corpus` |
| `ir/lexical/` | Elasticlunr postings/scores, bounded FM query grammar, exact metadata filters and label/content similarity queries. | `fm4/ir/lexical` |
| `ir/topics/` | Seeded LDA training and vocabulary filtering, fixed-topic inference, FM document/term retrieval metrics and validated model snapshots, with original component licenses. | `fm4/ir/topics` |
| `ir/browser/` | Worker protocol/entry, cancellable worker transport and independent search session/model lifecycle. | `fm4/ir/browser` |

`fm4/ir` and `fm4/ir/core` expose the headless modules. They need no graph objects, DOM, D3 or YAML. `fm4/ir/browser` is explicit; importing it does not start a worker or install the worker's global message handler. `SearchSession` takes document snapshots and returns stable-ID results. Freshmind's `GraphSearchController` composes it with graph replacement/edit guards, graph commands and panel visibility.

Literal retrieval uses elasticlunr; LDA supplies FM 2014-style document and term
retrieval. Embeddings are deferred. The [integration plan](../docs/search-module-integration.md)
and [parity record](../docs/fm2014-retrieval-parity.md) define supported operations,
score interpretation and intentional differences from the reference.

```ts
import {createSearchCorpus, LexicalSearchIndex} from "fm4/ir";
import {graphSearchCorpus, applyGraphSearchResults} from "fm4/fm/ir";
import {SearchSession} from "fm4/ir/browser";
```

The shorter Freshmind entries are canonical: `render`, `navigate`, `edit`, `struct`, `cluster` and `struct-view`. Previous public subpaths (`rendering`, `navigation`, `editing`, `structures`, `clustering`, `structure-view`, `search` and `fm/topics`) remain export-map aliases to the same implementations. Generic retrieval exports also remain available through the earlier combined Freshmind API. There are no duplicate source implementations or compatibility folders.

## Dependency rules

- Cross-feature imports use the destination's `index.ts` contract, or `config/core.ts` for parser-free configuration. Inside a feature, concrete file imports keep the runtime graph acyclic. Source consumers and research tools use public entry points rather than emitted private paths.
- TouchGraph and IR each import neither of the other domains. Freshmind composes both through their module contracts. Parser-free feature modules import neither browser adapters, rendering/UI modules, D3 nor YAML. YAML codecs remain usable in Node through their separate entry point.
- Complete adjacency, locality, coordinates, selection and lifecycle state keep their existing owners. Split model files do not create parallel graph/selection objects. Renderers receive styles/geometry and do not own physics or semantic membership.
- Type-only contracts can connect model, geometry and view data without importing those implementations at runtime. Layout forces use physical coordinates, independently of viewing transforms and presentation size.
- Edit commands resolve a projected locality's mutation owner through the small model capability, rather than importing `StructuralLocality`. Structural viewing still derives its presented subset from TG's authoritative neighborhood.
- Browser controllers compose features and retain explicit listener/timer cleanup. UI bindings take caller-owned elements and return disposers; core features remain usable without controls or a mounted panel.

`tests/module-boundaries.test.mjs` verifies source contracts, one-way domain dependencies, parser/browser-free headless closures, runtime import cycles, the pre-refactor export inventory and constructor identity. A separate external-consumer TypeScript fixture checks the emitted declarations across package subpaths. A standalone IR declaration consumer also runs without DOM types. Worker/session tests use plain documents without graph objects. The existing behavior, numerical replays and Java parity checks remain the compatibility evidence.

New features should get a feature module and a narrow contract, use existing graph/panel owners, and keep browser adapters out of headless modules. Former flat implementation files were removed; no compatibility source shims were added.
