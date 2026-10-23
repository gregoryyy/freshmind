# Freshmind 4

**Author and maintainer:** Gregor Heinrich.

**Freshmind 4** is a partial port of the Java-based **Freshmind** project to TypeScript and JavaScript, with additional functionality for the browser. The package uses the short name `fm4`.

## Background

The original Freshmind was developed by **Gregor Heinrich** in several waves between **2002 and 2014**.

The [original artwork archive](assets/artwork/fm2014/README.md) preserves Freshmind's icons, splash screen and background, including the editable Photoshop sources and a checksum manifest.

The purpose of this partial port is to demonstrate Freshmind's concepts in a modern browser environment. Some of these concepts have aged well and may still be valuable more than a decade later. Freshmind 4 carries selected functionality forward and adds new capabilities for exploring these ideas.

The current implementation concentrates on the graph browsing foundation: spring embedding, neighborhood exploration, and focus and context views. Its TouchGraph-derived core preserves the **1.21 API and physics**. D3 supplies SVG data joins, dragging, panning, and zooming; the ported spring embedder calculates the layout.

## Current features

- A TypeScript graph model with Java-style `Node`, `Edge`, and graph browsing APIs.
- The original spring layout calculations, including momentum and adaptive damping.
- Focus and context browsing through visible neighborhoods, expansion, collapse, and a nonlinear viewing lens.
- A browser interface with SVG rendering, dragging through the lens, panning, zooming, selection, and pinning.
- Graph editing with node creation/deletion and directed connections, plus Shift-drag rectangle selection.
- Freshmind semantic types and metadata, YAML-configured visual types, multiline labels and twelve node shapes.
- Labeled spider/lens curves with midpoint arrows, parallel relations, self-loops and shared picking geometry.
- Keyboard navigation with neighbor/relation preselection, independent graph spacing and canvas zoom, rotation and scroll controls.
- Inline label and metadata editors, plus resizable node-content popups for plain text and sanitized HTML.
- Native YAML loading/saving, the approved Java examples and three attributed public example networks.
- Optional single-focus RFC with reinforced focal springs, even-angle branch forces and weighted coordinate geometry derived from the 2005 paper.
- An ESM library for JavaScript and TypeScript, plus a DOM-independent core for headless use.
- A runnable example and compatibility checks against the Java layout and lens implementations.

**Progress:** Milestone 1 (plain TouchGraph) and Freshmind milestones 2.1–2.5 (types, rendering, navigation, editing and native YAML persistence) are complete. RFC is partially implemented: tasks 3.2.1–3.2.3 provide single-focus reinforcement, angular constraints and weighted x/y distances, with reproducible experiments and a generated browser walkthrough.

Node and link weights are retained by the model, editors and file format, but their effect on RFC forces is still pending. They are separate from the implemented coordinate weights. Next is node/link force weighting, followed by elliptical focal-region exclusion, multiple foci and structural aggregation. LDA-based graph visual search remains planned. See the [roadmap](docs/TODO.md) and [completed work, compatibility audit, and implementation notes](docs/DONE.md).

Porting and re-implementation based on the existing concepts have required only a few hours so far, including code archaeology in the original Java sources.

The Java Freshmind prototype at `../knowceans/knowceans-freshmind-2014/` is the feature reference for labels, editing, navigation, search and file I/O. The [FM 2014 source analysis](docs/fm2014_analysis.md) describes these features, unfinished functionality, dependencies, available LDA source projects and proposed port order. RFC is being rebuilt from the 2005 paper.

The [Freshmind feature design](docs/fm_port-design.md) describes the implemented typed/visual models, labeled curves, keyboard navigation, metadata/inline editors and native YAML persistence. The approved `berry` and `nips-fm` examples are converted from the Java reference; other datasets are proprietary and excluded.

## Reinforcement Focus + Context

In the main browser, select a node, expand **Reinforcement Focus + Context**, then choose **Reinforce selected node**. The default **Tree structure** preset combines an explicit target focal length with radial and angular stiffness. **Attraction only** retains the earlier attraction-multiplier approach, including its angular forces. Soft yellow halos fade outward beneath reinforced nodes and relations. With RFC enabled, press Return or double-click an already centered node to make it the reinforced focus. **Remove RFC** stops the additional forces while retaining the current layout. Pause/resume motion still controls the ordinary layout runner.

The RFC center is independent of selection, neighborhood origin and the viewing lens. Hidden centers suspend reinforcement and resume when shown; replacing the graph clears activation. Semantic nodes/relations and YAML records remain unchanged, while exported positions can retain the resulting layout. Horizontal/vertical coordinate weights control physical RFC geometry: (0.25, 1) permits a focal layout twice as wide in the ideal case, while (1, 1) retains ordinary distances. The viewing lenses are independent. Node/link force weighting, elliptical exclusion, multiple foci and aggregation remain later tasks.

```ts
const rfc = panel.getRfc();
rfc.configure({radialStiffness: 1, radialLength: 120, angularStiffness: 10000, coordinateWeights: {x: 0.25, y: 1}});
rfc.setFocus(node); // node must belong to the visible graph
console.log(rfc.getState());
rfc.setFocus(null);
```

`fm4/fm/rfc` exports the headless controller/force helpers; `bindRfcControls()` from `fm4/fm/ui` binds application-owned controls and returns a disposer. A standalone layout can register `rfc.apply` through `layout.addForce()` and remove it through the returned disposer. The [design](docs/rfc-design.md) explains the force law, defaults and lifecycle. The [experiment report](docs/experiments/rfc-single-focus/README.md) contains three synthetic native YAML graphs to open in the browser and the recorded baseline/RFC results.

```sh
just rfc-experiment  # Regenerate deterministic synthetic comparisons and initial graphs
just rfc-plot        # Render the report with Python/matplotlib
just rfc-paper       # Regenerate six figures and the second draft PDF
```

The [second draft paper](docs/papers/rfc-revisited-draft2.md) reviews the 2005 method, compares attraction, angle and length constraints, and derives local oscillation/stability conditions from the actual TouchGraph update. Its [drawings](docs/papers/figures/rfc/) are supplied as SVG, PDF and PNG. The experiments include ablations, a stiffness sweep and a movable-center damping comparison; they do not establish general convergence or perceptual benefit.

## Run the example

```sh
npm install
npm run dev
```

Open `/` for the Freshmind graph browser with neighborhood navigation, editing and curve controls. `/freshmind.html` is the separate type-palette and live YAML configuration explorer. Both use the same Freshmind model/panel extensions; the ordinary TouchGraph library API remains available.

With `just` installed, use the equivalent recipes:

```sh
just install
just dev
just build       # Library and TypeScript declarations
just build-demo  # Production demo
just preview     # Build and serve the production demo
just flipbook    # Production walkthrough: screenshots, Markdown and HTML
just check       # Type checking, core tests, and demo build
just pdf README.md  # PDF beside one Markdown source
just pdfs docs      # PDFs for Markdown files under docs (omit docs for all)
just --list      # All recipes, including Java and browser tests
```

PDF rendering uses Pandoc and Google Chrome, with the same print styling and Mermaid support as Kibitz. Build assets live in `scripts/pdf/`, alongside the other development tools. Install Pandoc with `brew install pandoc`; set `CHROME` to use another Chrome executable. Outputs use the source's full name (`file.md.pdf`) and unchanged PDFs are skipped. Mermaid diagrams require network access during PDF generation. Delete the PDF to rebuild after changing only an embedded image.

`just flipbook` builds and serves the production demo on an available loopback port, drives it with headless Chrome, and writes the [walkthrough](docs/flipbook/README.md), numbered screenshots, an [HTML viewer](docs/flipbook/index.html) and a manifest under `docs/flipbook/`. The viewer works from disk with Previous/Next buttons, arrow keys and Home/End. Edit [scripts/flipbook/tour.mjs](scripts/flipbook/tour.mjs) to change the acts and captions, then regenerate. The tour covers browsing, both zooms, key-map help, types, editing, the node-content popup, YAML saving, RFC comparison, Florentine families and the approved Berry/NIPS-FM examples. It uses the existing Playwright dependency and Google Chrome; no separate service needs to be running.

Use `just flipbook --output /tmp/fm4-flipbook --port 4176` to choose an output directory and port, or `--channel chromium` / `PLAYWRIGHT_CHANNEL` to select another installed Playwright browser channel. A requested busy port fails without reusing its server. Generation captures all steps before publishing; regeneration replaces its own manifest-listed files and preserves unrelated files. The command stops its local server and browser on completion or failure. Layout inputs are seeded and paused for capture; screenshots may still vary with browser/font versions.

Open the localhost address printed by Vite. Double-click a node to select and center it, or select it and choose **Focus here**. Adjust neighborhood depth and the focus + context slider. Press **E** with the graph focused, or use **Expand**, to reveal neighbors. Drag nodes to rearrange them and drag the background to pan. **Graph spacing** changes distances between node centers while keeping shapes and labels the same size. Vertical scrolling changes **graph spacing**, keeping shapes and labels the same size. Horizontal two-finger scrolling decreases/increases **focus + context** strength to the left/right; the dominant scroll axis chooses one operation for each event. Trackpad pinch (Ctrl+wheel) controls canvas zoom around the pointer. The canvas toolbar also zooms in/out; its percentage button resets canvas scale to 100%. Centering retains both zoom levels. Pinning holds a node in physical coordinates. Double-click follows the same centering/neighborhood option as Enter; plain `TGPanel` retains double-click expansion and canvas-only wheel handling.

With the graph focused, **arrows** navigate adjacent nodes and **Shift+arrows** navigate relations. One candidate selects immediately; several highlight temporary choices. Press a perpendicular arrow to cycle, the original arrow or **Enter/Space** to confirm, or the opposite arrow/**Escape** to cancel. Candidate order stays fixed while the layout moves. The default inactivity timeout is 2.5 seconds; **Navigation options** can change it or disable it with zero.

Selection retains the current neighborhood. **Enter** centers the selected node or a selected relation's anchor; **N** toggles whether this also changes the neighborhood (enabled initially). **Space** toggles selected-item details. **Escape** cancels candidates, then clears a relation back to its anchor, then clears node selection. **E/K/H** expand/collapse/hide, **0–6** set radius, **B** toggles backlinks, and **F2** opens the label editor. Radius, backlinks and degree limits also have sidebar controls. Tab moves keyboard focus normally; graph shortcuts leave editor input and browser modifier chords alone. A live status region announces candidate position and label. Plain `TGPanel` retains its original Space-to-expand behavior.

The view shortcuts are:

| Control | Action |
| --- | --- |
| **Ctrl+Shift+↑/↓** (also **Ctrl+↑/↓**) | Increase/decrease graph spacing by a factor of 1.2. |
| **Ctrl+Shift+←/→** | Decrease/increase focus + context strength by five percentage points. |
| **Ctrl+Shift+Option/Alt+↑/↓** | Increase/decrease canvas scale by a factor of 1.2, around the viewport center. |
| **Ctrl+Shift+Option/Alt+←/→** | Rotate the view counterclockwise/clockwise by 5°, keeping labels upright. |
| **Ctrl+Shift+1** | Reset canvas scale to exactly 100%, retaining the viewport center. |
| **+ / −** (also **=**) | Additional canvas zoom shortcuts. |

Graph spacing uses Ctrl+Shift+↑/↓, with Ctrl+↑/↓ retained as an alias. Canvas zoom uses Ctrl+Shift+Option/Alt+↑/↓; Option is the Alt modifier on macOS. Horizontal Ctrl+Shift arrows adjust focus/context. The Java snapshot used Alt+↑/↓ and Alt+←/→ for graph spacing and fisheye strength, Ctrl+Shift+↑/↓ for canvas zoom, and +/− for graph spacing. Canvas reset retains its Ctrl+Shift+1 binding. Both zoom levels are independent and limited to 15–500%; focus/context ranges from 0–100. Keyboard shortcuts require graph focus; loading a graph and completing navigation, motion or canvas-toolbar actions returns focus to it. Text fields and sliders retain their own input. Scrolling applies while the pointer is over the graph. Both work without a selected node and preserve selection, the neighborhood and candidate order. Holding a key repeats the adjustment; the sliders and canvas percentage follow view changes. Horizontal scrolling is continuous (20 pixel-equivalent units per percentage point, with line/page deltas normalized). Editor input and unregistered modifier chords retain their normal behavior.

The example's `window.graphBrowser` exposes its `FreshmindPanel` for experimentation, including the inherited TouchGraph API.

The complete [user key map](docs/KEYMAP.md) adapts the reference `keys.txt` to the implemented controls. Open **Key map**, press **?** with the graph focused, or press **F1** to view it in the browser. `just keymap` regenerates the Markdown reference from the same rows used by the help dialog.

Click a selected node again or click the background to clear selection. Shift-drag the background to select a node inside a rectangle; as in Java, this chooses one candidate rather than retaining a selection set. In **Edit graph** mode, double-click the background to add a node, select a source and Shift-click a target to connect them, and focus a node and press Delete/Backspace to remove it and its links.

The main browser's **Edge curves** selector switches between **Spider**, **Lens midpoint** and **Straight**. Spider curves are easiest to see between diagonally separated nodes; drag a node to change the bend. Lens midpoint follows the nonlinear viewing transform: increase **Focus + context** and look at relations between off-center nodes. Edges through the lens center can remain straight. These controls change the view without changing physical positions.

Select a node or relation and press **F2** or **Ctrl+Enter** to edit its label inline. Node labels accept multiple lines; **Ctrl/Cmd+Enter** commits, and **Enter** also commits a single-line relation label. **Escape** cancels. Inline editors follow the node body or curve-label anchor through layout, both zoom modes and resize. Clicking away retains the draft. **Ctrl+Space** opens the node annotation editor in the inspector.

The inspector edits labels, semantic types, shape/curve overrides, weights, node URLs and text/HTML annotations. Relation fields include endpoint IDs, spring length and **Reverse relation** (**R**). **Visual settings and metadata** exposes named visual overrides, supported style fields, application data and extensions as YAML mappings. **Save changes** validates the complete draft before mutation; **Cancel** discards it and restores graph focus. Drafts remain associated with their items when selection changes. Labels may repeat and IDs remain stable. Clearing a shape/curve override restores the type/view style.

**Space** opens a modeless, resizable popup for the selected node’s content; relation details remain in the inspector. The popup follows selection while open. **Escape** or **Space** in its content closes it and returns focus to the graph. **Edit content** or **Ctrl+Space** delegates to the existing annotation inspector, preserving its drafts. HTML annotation source is preserved for export and displayed through a formatting/link allowlist, with no scripts, event handlers or embedded resource loading. Annotation links of the form `#node=ID` navigate to stored nodes. **L** or **Open linked resource** explicitly opens supported web/mail URLs; unavailable legacy local paths remain editable data. **Edit graph** exposes node creation/deletion and Shift-click connection gestures.

Applications can bind the same popup through the library:

```ts
import { bindNodeDetails } from "fm4/fm/ui";
import "fm4/fm/ui/style.css";

const disposeDetails = bindNodeDetails(panel, {
  graph: graphElement,
  onNodeLink: async node => {
    const navigation = panel.getNavigation();
    const s = navigation.getState().settings;
    await panel.setLocale(node, s.radius, s.maxAddEdgeCount, s.maxExpandEdgeCount, !s.backlinks);
    panel.setSelect(node);
    await navigation.centerSelection();
  },
  onEdit: node => openAnnotationEditor(node),
});
// Call disposeDetails() before removing the graph or destroying the panel.
```

The popup reads committed node annotations and URL metadata. The application supplies editing and navigation callbacks; without a navigation callback, links select visible nodes and report hidden targets. It never owns a second editor draft or layout timer.

## Graph files and examples

Use **Open YAML** or **Ctrl/Cmd+O** to select one `.fm.yaml` graph and, when required, its companion type YAML. A failed parse or missing companion leaves the current graph intact. **Save YAML** / **Ctrl/Cmd+S** downloads the complete graph, including hidden/isolated nodes, parallel relations and loops. **Ctrl/Cmd+Shift+S** opens the filename dialog. Exports include committed model changes; editor drafts remain separate until saved.

**Export options** selects layout positions, view settings and embedded/companion type configuration. Fixed-node positions are always retained. Saved views include neighborhood filters, graph zoom, focus/context, rotation, lens pan, canvas zoom and canvas pan. Velocities, hover, selection, preselection and derived geometry are transient. The codec uses strict YAML 1.2, validates IDs/references/types, rejects aliases/merge keys/custom tags/duplicate keys and preserves metadata/extensions and unknown semantic type IDs with diagnostics.

**Load example → Freshmind 2014** offers the approved [berry](examples/fm2014/berry.fm.yaml) (21 nodes, 22 relations) and [nips-fm](examples/fm2014/nips-fm.fm.yaml) (3,777 nodes, 5,257 relations). NIPS opens a bounded neighborhood over the complete graph. Other reference datasets are proprietary and are excluded from migration, tests and distribution. The [migration report](examples/fm2014/conversion-report.json) records source hashes, counts and unavailable resource targets.

**Public networks** adds [Florentine families](examples/public/florentine.fm.yaml) (15 nodes, 20 relations), [Zachary's karate club](examples/public/karate.fm.yaml) (34 / 78) and [Les Misérables](examples/public/les-miserables.fm.yaml) (77 / 254). Their node content includes graph-derived summaries and connected-node links. The pinned NetworkX sources, BSD license, original references and conversion notes are in [examples/public/README.md](examples/public/README.md). Regenerate them offline with `just public-examples`.

```sh
just convert-fm2014                 # Only berry.xml and nips-fm.xml; never scans other datasets
just convert-fm2014 --overwrite     # Intentional regeneration of existing outputs
just validate-examples             # Native schema and complete normalized round trips
just validate-examples --source-dir ../knowceans/knowceans-freshmind-2014
```

The converter uses Python's standard XML parser and the TypeScript codec through a Node batch driver. The optional source audit compares every source ID, label, hint, URL, type, endpoint and stroke. Inputs, linked resources, backups and indexes remain untouched. See [the example notes](examples/fm2014/README.md) for details.

The storage-independent codec is available separately:

```ts
import { parseDocument, serializeDocument } from "fm4/fm/io";

const document = parseDocument(yamlSource, {
  resolveTypes: path => companionContents[path],
});
const yaml = serializeDocument(document, { includeLayout: true, includeView: true });
```

`captureDocument(panel, currentDocument?)` and `installDocument(panel, document)` are browser integration helpers exported from `fm4/fm`. The pure `fm4/fm/core` entry point keeps model/edit commands and transfer types independent of a DOM or YAML parser.

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

There are three independent parts:

1. **Graph locality.** `GraphEltSet` retains the complete graph. `VisibleLocality` holds the subset displayed and simulated. `setLocale(node, radius, maxAddEdgeCount?, maxExpandEdgeCount?, unidirectional?)` calculates graph distance from the focal node. Expanding reveals neighbors; hiding and collapsing retain the largest connected component, as in the Java library. Hidden nodes retain their coordinates and adjacency for subsequent exploration.
2. **Viewing lenses.** `TGLensSet` applies invertible transforms to physical `(x, y)` coordinates to produce `(drawx, drawy)`. `HyperLens` ports `HyperScroll`'s nonlinear radial function: nearby space expands, peripheral space compresses, and radius 250 stays fixed. Labels retain a readable size. This is the original nonlinear lens, rather than a mathematically hyperbolic embedding.
3. **Canvas transform.** An outer SVG group scales and pans the complete rendering after the lens chain, including node bodies, text, edges, badges and focus frames. Each panel owns its canvas transform. Background panning moves the drawing directly in viewport pixels, including with a nonlinear lens or rotation active.

The default view pipeline is:

```text
world → focus translation → graph zoom → lens pan → nonlinear lens → rotation → viewport origin
      → draw coordinates → canvas scale/pan → viewport pixels
```

`focusNode(node, radius)` combines neighborhood browsing with centering the lens on that node. `setLocale()` changes the visible neighborhood alone. `setHyperbolic()` changes the view alone. Lens adjustments never change the physical coordinates or the spring forces. Dragging converts screen coordinates back through the reversed lens pipeline, including when dragging the focus node itself.

`getZoom()` / `setZoom(scale)` / `zoomBy(factor)` retain TouchGraph's graph-distance semantics. `getCanvasZoom()` / `setCanvasZoom(scale)` / `canvasZoomBy(factor)` control the complete rendering independently. Programmatic canvas zoom preserves the world point beneath the viewport center; pinch/Ctrl+wheel zoom anchors at the gesture position. Ordinary vertical scrolling in Freshmind adjusts graph spacing. `drawToScreen(point)` and `screenToDraw(point)` convert between renderer coordinates and viewport pixels relative to the SVG. Node draw positions, geometry, hit tests, `getMousePos()` and `multiSelect()` use renderer coordinates before the canvas transform. `getCenter()` returns the physical point beneath the viewport center, including canvas pan and zoom.

Custom lenses can extend `TGAbstractLens`, implement `applyLens(point)` and `undoLens(point)`, and be composed in a `TGLensSet`. `panel.setLensSet(lenses)` replaces the default lens pipeline; callers own that chain's viewport origin and inverse behavior. The independent canvas transform still applies outside it.

## Freshmind extensions and source structure

```text
src/tg/                  TouchGraph model, adjacency, locality, layout, lenses and panel
src/fm/model.ts          FreshNode, FreshEdge, FreshGraph and document aggregate
src/fm/config/           Type contracts, validation, registry, YAML loader and fm2014 preset
src/fm/rendering/        Pure shape/curve geometry and SVG presentation
src/fm/navigation/       Headless candidate/controller state and graph-scoped DOM keyboard adapter
src/fm/editing/          Shared validated edit commands
src/fm/panel.ts          FreshmindPanel extension of TGPanel
config/                 Authoritative YAML type configuration
```

TouchGraph imports no Freshmind code. Freshmind extends its model/panel classes and composes the registry and presentation helpers. The package entry points `fm4` and `fm4/core` resolve directly to the TouchGraph build, alongside the explicit `fm4/tg` and `fm4/tg/core` names; no root source shims are needed. [Source dependency rules](src/README.md) describe the boundaries.

```ts
import { FreshmindPanel, FreshNode, FreshEdge } from "fm4/fm";

const panel = new FreshmindPanel(document.querySelector<HTMLElement>("#graph")!);
const person = panel.addNode(new FreshNode("person-1", "Ada", { type: "person" }));
const paper = panel.addNode(new FreshNode("paper-1", "A paper", { type: "paper" }));
panel.addEdge(new FreshEdge(person, paper, {
  id: "authored-1", type: "authored", label: "wrote"
}));
panel.focusNode(person, 1);
```

`panel.getNavigation()` exposes the shared Freshmind commands and detached state snapshots. For example, `await panel.getNavigation().configure({ moveToCenter: false, preselectionTimeoutMs: 0 })` keeps the neighborhood when centering and disables candidate expiry. Subscribe with `addListener()` (returns a disposer); use `setActions({ edit: item => ... })` to connect an application editor. `panel.getNeighborhoodFocus()` is separate from the selected node/edge and the viewing-lens focus. The controller and candidate helpers are also exported by the headless `fm4/fm/core` entry point.

Key-map help and zoom controls are reusable library bindings. Supply your own elements; their names and IDs are application choices:

```ts
import { bindKeymap, bindZoomControls } from "fm4/fm/ui";
import "fm4/fm/ui/style.css";

const disposeHelp = bindKeymap(panel, {
  button: helpButton,
  keyboardTarget: browserWrapper, // F1 scope; defaults to the document
  includeBrowserCommands: true   // when the application supplies editing and files
});
const disposeZoom = bindZoomControls(panel, {
  spacing: spacingInput, spacingValue: spacingOutput,
  canvasIn: zoomInButton, canvasOut: zoomOutButton, canvasReset: zoomResetButton
});

// When removing this browser:
disposeHelp();
disposeZoom();
panel.destroy();
```

Configure the graph-spacing range in percent (15–500). The bindings synchronize with keyboard and programmatic view changes. The key map uses the same rows as [the user reference](docs/KEYMAP.md); editing/file rows are optional. Page layout and control styling remain application concerns. `setActions()` also returns a disposer that removes only its own current handlers.

`getSemanticType()` / `setSemanticType()` operate independently of labels and TouchGraph's numeric `getType()` shape API. `FreshGraph` retains the existing adjacency implementation and adds stable node/edge IDs. Node and relation weights affect presentation; physical spring length and repulsion remain separate.

The initial palette is [config/fm2014.types.yaml](config/fm2014.types.yaml). Call `panel.loadTypeConfiguration(yamlText)` to validate and replace the registry atomically, preserving graph objects and coordinates. After editing the canonical file, run `npm run sync:fm-config` to update `src/fm/config/fm2014.ts` and the design example. Native graph loading/saving is available through `fm4/fm/io` and the browser controls described above.

Freshmind keyboard-focus frames follow the configured node shape and stay outside the focusable group, keeping hidden-link counts separate. The example palette uses dark labels for yellow/orange highlights and other light fills, with at least 4.5:1 label contrast across its interaction states. These colors remain YAML configuration; custom profiles control their own contrast.

| Import | Contents |
| --- | --- |
| `fm4`, `fm4/tg` | TouchGraph browser API; existing imports remain supported. |
| `fm4/core`, `fm4/tg/core` | TouchGraph model, layout and lenses without D3 or YAML. |
| `fm4/fm` | Freshmind model, registry, geometry, panel and YAML type loader. |
| `fm4/fm/core` | Freshmind model, registry, preset and pure geometry without D3 or YAML. |
| `fm4/fm/config` | YAML type loader for applications supplying their own configuration. |
| `fm4/fm/ui` | Reusable key-map dialog and graph/canvas zoom bindings; optional `fm4/fm/ui/style.css`. |
| `fm4/fm/rfc` | Headless single-focus reinforcement controller, focal-star and force helpers. |

## Library support

| Component | Choice | Reason |
| --- | --- | --- |
| Layout | Ported `TGLayout` | Keeps the original rubber-band force, momentum, adaptive damper, cutoff and integration order. |
| Graph and locality | Ported TypeScript classes | Keeps the Java object model, adjacency, graph-distance filtering and browsing operations. |
| Lenses | Ported `TGLensSet` and `HyperScroll` math | Keeps focus and context behavior independently of the simulation. |
| Rendering | SVG + [`d3-selection`](https://d3js.org/d3-selection) | Supports labels, per-node shapes, DOM events and inspection. |
| Pointer interaction | [`d3-drag`](https://d3js.org/d3-drag), [`d3-zoom`](https://d3js.org/d3-zoom) | Supplies drag gestures and pan/zoom state. |
| Type configuration | [`yaml`](https://eemeli.org/yaml/) | Parses validated YAML 1.2 type definitions outside the headless core. |
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

Freshmind 4 provides the core graph browsing library and browser equivalents for navigation, editing, rectangle selection and native YAML file I/O. The [compatibility audit](docs/DONE.md#compatibility-audit) describes the supported APIs. Swing controls, AWT painting hooks, and the `GLPanel`/applet wrappers are replaced by SVG, DOM events, and browser controls. Runtime legacy XML/FMG/OWL and database adapters remain outside the native file format; approved XML examples use the batch converter. Rotation is available through `setRotation(radians)` and Ctrl+Shift+Option/Alt+←/→; `getRotation()` returns the current angle. Plain TouchGraph edges retain straight segments and endpoint arrow markers; Freshmind adds labeled spider/lens curves and midpoint arrows.

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

Freshmind-specific source files carry an `Apache-2.0` notice, with copyright for Gregor Heinrich's original work (2002–2014) and the TypeScript port (2026). See [LICENSE-APACHE-2.0](LICENSE-APACHE-2.0) for the full Apache License, Version 2.0, and [LICENSE](LICENSE) for the license scope and inherited TouchGraph licenses.

This product includes software developed by TouchGraph LLC (http://www.touchgraph.com/).

This product includes software developed by TouchGraph (http://www.touchgraph.com/).

The TouchGraph compatibility reference is [the Java graphlayout source in componavt/wikokit](https://github.com/componavt/wikokit/tree/0db2310283d792abbaa57746fe9fe475fe9e6ab8/TGWikiBrowser/src/com/touchgraph/graphlayout), pinned at `0db2310283d792abbaa57746fe9fe475fe9e6ab8`. The layout is version 1.21; `HyperScroll` is version 1.06. Both full license variants are centralized in [LICENSE](LICENSE), with attribution in [NOTICE](NOTICE). Adapted TypeScript files retain short copyright headers pointing to these files; distribute both alongside the sources. Package and demo builds include both files. The unmodified Java references retain their original full headers.
