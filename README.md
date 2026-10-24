# Freshmind 4

**Author and maintainer:** Gregor Heinrich.

**Freshmind 4** (`fm4`) is a partial port of Java Freshmind to TypeScript and JavaScript, with a browser demo and an ESM library. It combines graph browsing, typed nodes and curved relations, keyboard navigation, editing and YAML persistence with the original TouchGraph spring layout and viewing lenses.

![Freshmind 4 graph example with RFC enabled on its central Graph browsers node](docs/flipbook/01-browser.png)

The graph-browser example with Reinforcement Focus+Context (RFC) enabled on its center node. [Explore the 21-step flipbook](docs/flipbook/index.html).

The original Freshmind was developed between 2002 and 2014. This project carries its graph-browsing concepts into a modern browser and reimplements and extends the RFC idea from [Gregor Heinrich’s 2005 paper](docs/literature/rfc@3ia05compact.pdf). RFC reinforces selected neighborhoods while retaining their surrounding context. Extensions include explicit focal target lengths, persistent tree/DAG/cluster definitions and reproducible layout comparisons.

## Progress

| Area | Current status |
| --- | --- |
| TouchGraph foundation | Complete: graph/locality APIs, spring layout and lenses, with Java compatibility checks. |
| Freshmind browser features | Complete: types, labeled curves, navigation, editors, content popups and native YAML persistence. |
| Reinforcement Focus + Context | Mechanism implemented: multiple foci, stored structures, clustering, importance weights, optional region exclusion and reversible type filtering/leaf aggregation. Original-paper example reconstruction and matched hybrid comparisons remain open. |
| LDA-based graph visual search | Not started. Reference Java/LDA sources have been located. |

See the [roadmap](docs/TODO.md) for remaining tasks and the [implementation record](docs/DONE.md) for completed scope, verification and compatibility limits. RFC experiments use small synthetic graphs; they do not establish general convergence or perceptual benefit. The layout uses point-based forces, so labels can overlap, and pairwise repulsion is quadratic in visible nodes.

## Run the browser

```sh
npm install
npm run dev
```

Open the localhost address printed by Vite. `/` is the graph browser; `/freshmind.html` explores the type palette and live YAML configuration. **Load example** offers synthetic RFC graphs, public networks and the approved Berry/NIPS-FM datasets.

RFC starts enabled on the main browser’s center node. Open **Reinforcement Focus + Context** to choose other centers or adjust its settings. Use **Key map**, **?** or **F1** for controls, or follow the [walkthrough](docs/flipbook/README.md).

## Use the library

Build with `npm run build`. Give the graph container an explicit height, for example `600px`:

```ts
import { FreshmindPanel, FreshNode, FreshEdge } from "fm4/fm";

const panel = new FreshmindPanel(document.querySelector<HTMLElement>("#graph")!);
const person = panel.addNode(new FreshNode("person-1", "Ada", { type: "person" }));
const paper = panel.addNode(new FreshNode("paper-1", "A paper", { type: "paper" }));
panel.addEdge(new FreshEdge(person, paper, {
  id: "authored-1", type: "authored", label: "wrote"
}));
await panel.focusNode(person, 1);
panel.getRfc().setFocus(person); // Library applications opt in to RFC.

// Call panel.destroy() when removing the browser.
```

`fm4` / `fm4/tg` expose the TouchGraph browser API. `fm4/core` / `fm4/tg/core` and `fm4/fm/core` provide headless entry points without D3, DOM rendering or YAML parsing. The [module map](src/README.md) documents feature-specific imports and dependency boundaries; the [feature design](docs/fm_port-design.md) describes the model, configuration, editing and persistence contracts.

## Detailed documentation

| Topic | Reference |
| --- | --- |
| Browser controls and examples | [Key map](docs/KEYMAP.md), [walkthrough](docs/flipbook/README.md) |
| Freshmind models, types, navigation, editing and YAML | [Feature design](docs/fm_port-design.md) |
| Source modules and package entry points | [Module map](src/README.md) |
| RFC forces, activation, interaction and damping | [RFC design](docs/rfc-design.md) |
| Trees, DAGs, clustering and cluster forces | [Substructures](docs/rfc-substructures.md), [clusters](docs/rfc-clusters.md) |
| Importance and focal-region exclusion | [Importance contract](docs/rfc-importance.md), [exclusion contract](docs/rfc-exclusion.md) |
| Reversible filtering and leaf aggregation | [Structural focus + context](docs/structural-focus-context.md) |
| Scientific analysis and experiments | [Second draft paper](docs/papers/rfc-revisited-draft2.md), [follow-up reports](docs/experiments/rfc-followup/README.md) |
| Example data, provenance and conversion | [Public networks](examples/public/README.md), [approved Java examples](examples/fm2014/README.md) |
| Java reference and compatibility | [FM 2014 source analysis](docs/fm2014_analysis.md), [compatibility audit](docs/DONE.md#compatibility-audit) |

## Development and verification

```sh
npm run typecheck
npm test
npm run test:java       # Requires a JDK.
npm run build:demo
npx playwright install chromium
npm run test:browser
```

XML conversion checks require Python 3. To use installed Google Chrome for browser tests, run `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`; set `PLAYWRIGHT_PORT` if the default port 4173 is occupied.

`just flipbook` regenerates the production walkthrough. `node scripts/flipbook.mjs --help` lists capture options. `just --list` shows the build, experiment, example-conversion and PDF recipes. Current verification results are recorded in [DONE.md](docs/DONE.md).

## Source and licensing

Freshmind-specific sources are licensed under [Apache 2.0](LICENSE-APACHE-2.0). TouchGraph-derived components retain their original terms; see [LICENSE](LICENSE) and [NOTICE](NOTICE) for license scope, the pinned Java reference and dependency attribution. Distribute both files with the sources.

This product includes software developed by TouchGraph LLC (http://www.touchgraph.com/).

This product includes software developed by TouchGraph (http://www.touchgraph.com/).
