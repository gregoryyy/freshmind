# Source modules

The library is one ESM package with two domains: `tg/` preserves TouchGraph, and `fm/` adds Freshmind. Each feature directory has an `index.ts` contract. Top-level `core.ts` and `index.ts` files compose the existing public API; they do not duplicate implementations. Existing `fm4`, `fm4/core`, `fm4/tg`, `fm4/tg/core`, `fm4/fm` and `fm4/fm/core` imports retain constructor identity and their named exports.

## TouchGraph

| Module | Responsibility | Package entry |
| --- | --- | --- |
| `tg/model/` | `Node` and `Edge`, split into their own files; graph objects share these identities. | `fm4/tg/model` |
| `tg/graph/` | Complete membership, locality/visibility, visitor contracts, exceptions, traversal and serialized locality animation. Complete adjacency remains owned by `GraphEltSet`. | `fm4/tg/graph` |
| `tg/layout/` | The original spring embedder, layout host/force contracts and timed runner. | `fm4/tg/layout` |
| `tg/lenses/` | Points, lens composition, HyperScroll-derived mapping and affine transforms. | `fm4/tg/lenses` |
| `tg/browser/` | SVG panel, pointer/drag/canvas interaction and mounting; depends on D3 and DOM APIs. | `fm4/tg/browser` |

`fm4/core` / `fm4/tg/core` compose the first four modules. `fm4` / `fm4/tg` also expose the browser panel. TouchGraph never imports Freshmind. Its source headers retain the original copyright notices and point to root [LICENSE](../LICENSE) and [NOTICE](../NOTICE); moved files have corrected relative paths. Both files must accompany redistribution. Java references retain their original full headers.

## Freshmind

| Module | Responsibility | Package entry |
| --- | --- | --- |
| `fm/model/` | FreshNode, FreshEdge, FreshGraph, document aggregate, metadata/options and the locality mutation-owner capability. Classes have one implementation each. | `fm4/fm/model` |
| `fm/config/` | Validated semantic/visual types, inheritance, preset and primitive validation. `core.ts` is parser-free; `index.ts` adds YAML type loading. | `fm4/fm/config/core`, `fm4/fm/config` |
| `fm/geometry/` | Pure node outlines, curve routing/picking, cluster hulls and bounded importance display mapping. | `fm4/fm/geometry` |
| `fm/rendering/` | SVG/D3 presentation using resolved styles, geometry and shared graph objects. | `fm4/fm/rendering` |
| `fm/navigation/` | Headless candidates, preselection, timer/command state and key-map data. | `fm4/fm/navigation` |
| `fm/editing/` | Atomic validated node/relation edits, delegating to model and source-neighborhood owners. | `fm4/fm/editing` |
| `fm/io/` | Native transfer contracts, strict YAML values and complete-graph codec; DOM-free, with a YAML dependency. | `fm4/fm/io` |
| `fm/structures/` | Persistent tree/DAG/cluster definitions, validation, topology and spanning-tree selection. | `fm4/fm/structures` |
| `fm/rfc/` | Reinforcement projection, forces, importance, exclusion, optional stabilizer and transient controller. | `fm4/fm/rfc` |
| `fm/clustering/` | Community/component detection and conversion to stored memberships. | `fm4/fm/clustering` |
| `fm/structure-view/` | Reversible type filtering/leaf aggregation and the presented membership index. | `fm4/fm/structure-view` |
| `fm/search/` | Headless corpus/analyzer, bounded query parser, lexical term vectors and owned graph search/feedback commands. | `fm4/fm/search` |
| `fm/topics/` | Serial LDA training, fixed-topic fold-in, topic similarity and the required seeded numerical utilities. Sampler/model code retains GPL-3.0-or-later. | `fm4/fm/topics` |
| `fm/browser/` | FreshmindPanel composition, DOM keyboard adapter, document installation/capture, safe annotations and disposable graph-search worker/model lifecycle. | `fm4/fm/browser` |
| `fm/ui/` | Reusable caller-owned controls, content popup and key-map/zoom/importance/structure/search bindings. | `fm4/fm/ui` |

The search/topic entries describe the current prototype code. The intended
literal and semantic search module will be supplied by Gregor; LDA is superseded.
See the [integration plan](../docs/search-module-integration.md) for pending
backend and browser adaptation.

`fm4/fm/core` composes the parser-free, DOM-free feature modules; model references to geometry/view types are type-only. `fm4/fm` adds browser, rendering, UI and codecs. `fm4/fm/ui/style.css` remains the optional stylesheet. Pure geometry no longer shares a directory with the DOM renderer, and navigation/editing/I/O modules no longer contain panel or DOM adapters.

The canonical type configuration remains `config/fm2014.types.yaml`; `npm run sync:fm-config` generates `fm/config/fm2014.ts` and the documented example. The demo owns file pickers/downloads and editor drafts. XML migration and reproducible research tools live in `scripts/`; proprietary reference datasets remain excluded.

```ts
import {FreshGraph, FreshNode, FreshEdge} from "fm4/fm/model";
import {TypeRegistry, freshmind2014Configuration} from "fm4/fm/config/core";
import {FreshmindPanel} from "fm4/fm/browser";
import {bindRfcControls} from "fm4/fm/ui";
```

## Dependency rules

- Cross-feature imports use the destination's `index.ts` contract, or `config/core.ts` for parser-free configuration. Inside a feature, concrete file imports keep the runtime graph acyclic. Source consumers and research tools use public entry points rather than emitted private paths.
- TouchGraph imports no Freshmind code. Parser-free feature modules import neither browser adapters, rendering/UI modules, D3 nor YAML. YAML codecs remain usable in Node through their separate entry point.
- Complete adjacency, locality, coordinates, selection and lifecycle state keep their existing owners. Split model files do not create parallel graph/selection objects. Renderers receive styles/geometry and do not own physics or semantic membership.
- Type-only contracts can connect model, geometry and view data without importing those implementations at runtime. Layout forces use physical coordinates, independently of viewing transforms and presentation size.
- Edit commands resolve a projected locality's mutation owner through the small model capability, rather than importing `StructuralLocality`. Structural viewing still derives its presented subset from TG's authoritative neighborhood.
- Browser controllers compose features and retain explicit listener/timer cleanup. UI bindings take caller-owned elements and return disposers; core features remain usable without controls or a mounted panel.

`tests/module-boundaries.test.mjs` verifies source contracts, one-way domain dependencies, parser/browser-free headless closures, runtime import cycles, the pre-refactor export inventory and constructor identity. A separate external-consumer TypeScript fixture checks the emitted declarations across package subpaths. The existing behavior, numerical replays and Java parity checks remain the compatibility evidence.

New features should get a feature module and a narrow contract, use existing graph/panel owners, and keep browser adapters out of headless modules. Former flat implementation files were removed; no compatibility source shims were added.
