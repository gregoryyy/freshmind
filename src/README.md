# Source boundaries

`tg/` owns the TouchGraph API, model, complete/visible graph, locality, spring layout, lens pipeline and browser panel. It must not import `fm/`. Package exports map `fm4` / `fm4/tg` to its browser entry point and `fm4/core` / `fm4/tg/core` to its headless entry point. There are no root TypeScript shims and only one set of TouchGraph constructors.

TouchGraph source headers retain copyright notices and point to the full original terms in the root [LICENSE](../LICENSE) and attribution in [NOTICE](../NOTICE). Both files must accompany redistribution. The Java reference sources keep their original headers; Freshmind-specific files use their separate Apache 2.0 notices.

`fm/` adds Freshmind behavior through subclasses and composed helpers:

- `model.ts` extends TouchGraph nodes, edges and graph invariants. Metadata remains independent of layout forces. Geometry and registry imports here are types only.
- `config/types.ts`, `validation.ts` and `registry.ts` define and resolve semantic/visual types without browser or YAML dependencies. `fm2014.ts` is the generated preset.
- `config/yaml.ts` parses type profiles; `io/yaml-value.ts` supplies strict graph/editor YAML parsing. Validation produces a registry before a panel replaces its existing configuration.
- `rendering/shapes.ts` and `geometry.ts` are pure helpers shared by drawing, picking and editor anchors. They do not import D3 or a DOM renderer.
- `rendering/presentation.ts` owns SVG/D3 presentation. It receives resolved styles and geometry; it does not own graph membership or physics. Shape-based viewing/keyboard focus paths occupy the noninteractive decoration layer, keeping them outside node focus bounds and hidden-link counts.
- `panel.ts` connects factories, presentation and selection to `TGPanel`, overriding its narrow node double-click/tooltip hooks for Freshmind centering. TouchGraph retains mounting, dragging, locality, lenses, layout and destruction, including its original double-click expansion default.
- `editing/commands.ts` validates basic label/type/shape/curve edits before applying them to existing model objects. These commands remain headless; demo forms own their drafts and delegate model mutation here.
- `navigation/types.ts`, `candidates.ts` and `controller.ts` own temporary candidate order, timeout and shared navigation commands without DOM, D3 or YAML imports. The controller reads live membership, draw coordinates and committed selection from its panel host, and delegates locality and centering to that host. The clock is injectable for deterministic tests.
- `navigation/keyboard.ts` scopes DOM input to the mounted SVG and supplies accessible status updates. It excludes text entry and unregistered browser modifier chords while dispatching Ctrl+↑/↓ graph zoom, Ctrl+Shift+←/→ focus/context and Ctrl+Shift+↑/↓ / Ctrl+Shift+1 canvas controls. Horizontal-dominant wheel input adjusts focus/context; vertical/pinch input reaches the independent canvas transform. It retains normal Tab navigation and disposes its listeners with the panel. Focus redraws are coalesced after DOM mutation so blur during deletion cannot reenter a D3 join. Application editors connect through controller actions.
- `ui/` supplies reusable key-map help and graph/canvas zoom bindings through `fm4/fm/ui` and `fm4/fm`. Callers supply elements rather than global IDs, and dispose bindings before removing their controls or panel. Key-map F1 handling can be scoped to a wrapper for multiple browsers. `fm4/fm/ui/style.css` is an optional stylesheet; the headless entry points never import UI modules.

`tg/core.ts` and `fm/core.ts` expose the headless dependency closures. `tg/index.ts` and `fm/index.ts` add browser integration. Tests enforce class identity, one-way dependencies and parser/renderer-free core imports.

`editing/commands.ts` validates complete edits with detached candidates before mutation. Endpoint changes update the existing complete adjacency and optional visible incidence counts, preserving relation identity/order. `editing/details.ts` owns browser annotation/resource presentation; retained HTML never enters the model as executable DOM.

`io/types.ts` holds parser-free transfer/view contracts. `io/codec.ts` is the optional YAML graph codec (`fm4/fm/io`); `io/panel.ts` captures/restores complete documents through the panel API. File pickers/downloads and inline/inspector UI live in `demo/`, and the XML migration tools live in `scripts/`. The `examples/fm2014/` assets are restricted to the two approved datasets. `navigation/keymap.ts` supplies browser help and generated `docs/KEYMAP.md`.

Further search features should be added under `fm/` as their milestones are implemented. They should delegate to the existing model and panel owners rather than copying live adjacency, visibility or node-selection state. Freshmind selection listeners expose committed node/edge selection to inspectors while retaining the base panel's node navigation anchor. `FreshmindPanel` also records the neighborhood origin, independently of committed selection and viewing-lens focus; queued locality changes retain the latest requested origin.
