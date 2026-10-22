# Freshmind 4

**Author and maintainer:** Gregor Heinrich.

**Freshmind 4** is a partial port of the Java-based **Freshmind** project to TypeScript and JavaScript, with additional functionality for the browser. The package uses the short name `fm4`.

## Background

The original Freshmind was developed by **Gregor Heinrich** in several waves between **2002 and 2011**. Freshmind 4 continues that work through a partial port, carrying selected functionality forward and adding new capabilities.

The current implementation concentrates on the graph browsing foundation: spring embedding, neighborhood exploration, and focus and context views. Its TouchGraph-derived core preserves the **1.21 API and physics**. D3 supplies SVG data joins, dragging, panning, and zooming; the ported spring embedder calculates the layout.

## Current features

- A TypeScript graph model with Java-style `Node`, `Edge`, and graph browsing APIs.
- The original spring layout calculations, including momentum and adaptive damping.
- Focus and context browsing through visible neighborhoods, expansion, collapse, and a nonlinear viewing lens.
- A browser interface with SVG rendering, dragging through the lens, panning, zooming, selection, and pinning.
- Graph editing with node creation/deletion and directed connections, plus Shift-drag rectangle selection.
- An ESM library for JavaScript and TypeScript, plus a DOM-independent core for headless use.
- A runnable example and compatibility checks against the Java layout and lens implementations.

Milestone 1 is complete for the plain TouchGraph browsing core and browser interactions. See the [roadmap](docs/TODO.md) and [completed work, compatibility audit, and implementation notes](docs/DONE.md).

## Run the example

```sh
npm install
npm run dev
```

With `just` installed, use the equivalent recipes:

```sh
just install
just dev
just build       # Library and TypeScript declarations
just build-demo  # Production demo
just preview     # Build and serve the production demo
just check       # Type checking, core tests, and demo build
just --list      # All recipes, including Java and browser tests
```

Open the localhost address printed by Vite. Select a node, choose **Focus here**, and adjust neighborhood depth and the focus + context slider. Double-click a node (or press Space on a focused node) to expand it. Drag nodes to rearrange them, drag the background to pan, and scroll to zoom. Pinning holds a node in physical coordinates.

The example's `window.graphBrowser` exposes the `TGPanel` for experimentation.

Click a selected node again or click the background to clear selection. Shift-drag the background to select a node inside a rectangle; as in Java, this chooses one candidate rather than retaining a selection set. In **Edit graph** mode, double-click the background to add a node, select a source and Shift-click a target to connect them, and focus a node and press Delete/Backspace to remove it and its links.

## Use the library

```ts
import { Edge, GraphEltSet, Node, TGPanel } from "fm4";

const graph = new GraphEltSet();
const alice = new Node("alice", "Alice");
const bob = new Node("bob", "Bob");
const carol = new Node("carol", "Carol");
graph.addNode(alice);
graph.addNode(bob);
graph.addNode(carol);
graph.addEdge(new Edge(alice, bob, 40));
graph.addEdge(new Edge(bob, carol, 40));

// Give the container an explicit height, e.g. style="height: 600px".
const panel = new TGPanel(document.getElementById("graph")!, {
  hyperbolic: 60,            // 0–100, matching the original HyperScroll control
  onSelect: node => console.log(node?.getLabel())
});
panel.setGraphEltSet(graph); // Starts with an empty visible locality, as in Java.
await panel.focusNode(alice, 2);

// Later:
await panel.expandNode(bob);
await panel.collapseNode(bob);
await panel.setLocaleAll();
panel.destroy();             // Stops layout, animations and resize observation.
```

You can also populate the visible graph through the Java-style panel API:

```ts
const panel = new TGPanel(document.getElementById("graph")!);
const a = panel.addNode("a", "Alpha");
const b = panel.addNode("b", "Beta");
panel.addEdge(a, b, 40);
panel.setSelect(a);
```

`panel.addNode("Alpha")` treats the argument as a label and assigns an ID, matching the Java overload. `new Node("alpha")` treats it as an ID.

## Focus and context

There are two independent parts:

1. **Graph locality.** `GraphEltSet` retains the complete graph. `VisibleLocality` holds the subset displayed and simulated. `setLocale(node, radius, maxAddEdgeCount?, maxExpandEdgeCount?, unidirectional?)` calculates graph distance from the focal node. Expanding reveals neighbors; hiding and collapsing retain the largest connected component, as in the Java library. Hidden nodes retain their coordinates and adjacency for subsequent exploration.
2. **Viewing lenses.** `TGLensSet` applies invertible transforms to physical `(x, y)` coordinates to produce `(drawx, drawy)`. `HyperLens` ports `HyperScroll`'s nonlinear radial function: nearby space expands, peripheral space compresses, and radius 250 stays fixed. Labels retain a readable size. This is the original nonlinear lens, rather than a mathematically hyperbolic embedding.

The default view pipeline is:

```text
world → focus translation → zoom → pan → nonlinear lens → rotation → viewport origin
```

`focusNode(node, radius)` combines neighborhood browsing with centering the lens on that node. `setLocale()` changes the visible neighborhood alone. `setHyperbolic()` changes the view alone. Lens adjustments never change the physical coordinates or the spring forces. Dragging converts screen coordinates back through the reversed lens pipeline, including when dragging the focus node itself.

Custom lenses can extend `TGAbstractLens`, implement `applyLens(point)` and `undoLens(point)`, and be composed in a `TGLensSet`. `panel.setLensSet(lenses)` replaces the complete default pipeline; callers then own its viewport and interaction transforms.

## Library support

| Component | Choice | Reason |
| --- | --- | --- |
| Layout | Ported `TGLayout` | Keeps the original rubber-band force, momentum, adaptive damper, cutoff and integration order. |
| Graph and locality | Ported TypeScript classes | Keeps the Java object model, adjacency, graph-distance filtering and browsing operations. |
| Lenses | Ported `TGLensSet` and `HyperScroll` math | Keeps focus and context behavior independently of the simulation. |
| Rendering | SVG + [`d3-selection`](https://d3js.org/d3-selection) | Supports labels, per-node shapes, DOM events and inspection. |
| Pointer interaction | [`d3-drag`](https://d3js.org/d3-drag), [`d3-zoom`](https://d3js.org/d3-zoom) | Supplies drag gestures and pan/zoom state. |
| Tooling | TypeScript + Vite | Builds the ESM library, declarations and example. |

[`d3-force`](https://d3js.org/d3-force) uses a different integrator and force model, so it is not used as a replacement for `TGLayout`. The core stays independent of D3 and the DOM. A Canvas or WebGL renderer can reuse the same model, simulation and lenses later.

## Headless layout

```ts
import { GraphEltSet, Node, TGLayout } from "fm4/core";

const graph = new GraphEltSet();
const a = new Node("a");
const b = new Node("b");
a.setLocation({ x: -50, y: 0 });
b.setLocation({ x: 50, y: 0 });
graph.addNode(a);
graph.addNode(b);
graph.addEdge(a, b, 40);

const layout = new TGLayout({ getGES: () => graph, repaintAfterMove() {} });
layout.resetDamper();
layout.tick(100); // Each batch contains the original ten integration steps.
console.log(a.x, a.y);
```

Use `start()` / `stop()` for timed layout, or `tick()` for deterministic stepping in a worker or on a server. `setRigidity()` takes effect after the next batch, matching Java. `resetDamper()`, `startDamper()`, `stopDamper()`, `stopMotion()`, and fixed/dragged-node behavior are retained.

## Compatibility and current scope

| Java concept | Port |
| --- | --- |
| `Node`, `Edge` | Same object references, constructors, coordinates, layout fields and common getters/setters; CSS color/font strings replace AWT objects. |
| `GraphEltSet`, `Locality`, `VisibleLocality`, `GESUtils` | Ordered node/edge traversal, adjacency and visible/complete graph distinction; Java-style visitor objects or plain callbacks. |
| `TGLayout` 1.21 | Direct force and damper port, including Java int32 repulsion arithmetic and ten steps per batch. |
| `TGPanel` | Common graph, selection, locality, damper and lens operations backed by SVG. |
| `LocalityUtils` | Awaitable, serialized operations replace Java animation threads; default phase delays follow the original. |
| `TGPoint2D`, `TGAbstractLens`, `TGLensSet` | Mutable points, composable forward transforms and reverse-order inverse transforms. |
| `HyperScroll` | `HyperLens`, plus `panel.setHyperbolic(0…100)`; the demo slider replaces Swing's scrollbar. |

Freshmind 4 provides the core graph browsing library and browser equivalents for navigation, editing, and rectangle selection. The [compatibility audit](docs/DONE.md#compatibility-audit) describes the supported APIs. Swing controls, AWT painting hooks, and the `GLPanel`/applet wrappers are replaced by SVG, DOM events, and browser controls. Freshmind file I/O is planned in milestone 2. Rotation is available through `setRotation(radians)`. SVG edges connect transformed endpoints and show their direction with arrow markers.

Known differences and limits:

- The baseline is the pinned 1.21 source, not modified 1.22 forks. Locality additions at equal graph distance use stable BFS order instead of Java Hashtable enumeration order. Animation scheduling uses the browser event loop, so wall-clock motion is not frame-identical to a Java thread.
- The original nonlinear lens inverse uses a 200-sample lookup table across radii 0–1990, with linear extrapolation beyond that range. The port preserves that approximation, including its loss of precision far from the focus.
- Coincident-node separation uses randomness, as in Java. Set initial coordinates for repeatable graphs; `TGLayout` optionally accepts a random function for repeatable coincident-node handling.
- Iterators are JavaScript iterators; failed lookups return `null`. Edges require endpoints already in the graph, and lengths must be positive integers rather than allowing division by zero. Node IDs should stay unique and stable after insertion.
- Pairwise repulsion remains **O(n²)** in visible nodes, and rendering uses SVG. Keeping neighborhoods small is part of the intended browsing model. Large-graph performance has not been benchmarked; a Barnes–Hut approximation would change the original physics.
- The original repulsion treats nodes as points. Wide labels can overlap; an additional collision force has not been introduced into the faithful layout.
- A graph's mutable visibility fields are intended for one panel/locality at a time. Clone the model for independent simultaneous views.

## Verification

```sh
npm run typecheck
npm test
npm run test:java       # Requires a JDK; runs the original Java source locally.
npm run build:demo
npx playwright install chromium
npm run test:browser
```

To use an installed Google Chrome instead, run `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`.
If the default test-server port 4173 is occupied, choose another with `PLAYWRIGHT_PORT`, for example `PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_PORT=4175 just test-browser`.

The Java harness compares **9 scenarios, 276 layout batches and 35 lens cases** against the unmodified upstream `TGLayout` and `HyperScroll` implementations. It checks node coordinates, velocities, damper state and lens transforms with a relative tolerance of `1e-10` (absolute `1e-10` below unit magnitude). Scenarios cover fixed/dragged nodes, locality flags, the repulsion cutoff, integer truncation/overflow, delayed rigidity and damper controls. Coincident positions are tested separately with a controlled random function.

Committed Java-generated snapshots allow ordinary tests to run without a JDK. Browser tests cover locality exploration, inverse dragging, moving the focal node, selection, pinning, zoom, a narrow viewport, graph editing, directed edges, hover, and rectangle selection.

## Source and attribution

This product includes software developed by TouchGraph LLC (http://www.touchgraph.com/).

This product includes software developed by TouchGraph (http://www.touchgraph.com/).

The TouchGraph compatibility reference is [the Java graphlayout source in componavt/wikokit](https://github.com/componavt/wikokit/tree/0db2310283d792abbaa57746fe9fe475fe9e6ab8/TGWikiBrowser/src/com/touchgraph/graphlayout), pinned at `0db2310283d792abbaa57746fe9fe475fe9e6ab8`. The layout is version 1.21; `HyperScroll` is version 1.06. Original notices and both license variants are retained in [LICENSE](LICENSE), [NOTICE](NOTICE), the adapted sources and the Java reference files.
