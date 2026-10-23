# Source boundaries

`tg/` owns the TouchGraph API, model, complete/visible graph, locality, spring layout, lens pipeline and browser panel. It must not import `fm/`. The root TypeScript modules re-export these implementations for source compatibility; there is only one set of TouchGraph class constructors.

TouchGraph source headers retain copyright notices and point to the full original terms in the root [LICENSE](../LICENSE) and attribution in [NOTICE](../NOTICE). Both files must accompany redistribution. The Java reference sources keep their original headers; Freshmind-specific files use their separate Apache 2.0 notices.

`fm/` adds Freshmind behavior through subclasses and composed helpers:

- `model.ts` extends TouchGraph nodes, edges and graph invariants. Metadata remains independent of layout forces. Geometry and registry imports here are types only.
- `config/types.ts`, `validation.ts` and `registry.ts` define and resolve semantic/visual types without browser or YAML dependencies. `fm2014.ts` is the generated preset.
- `config/yaml.ts` alone owns YAML parsing. Validation produces a registry before a panel replaces its existing configuration.
- `rendering/shapes.ts` and `geometry.ts` are pure helpers shared by drawing, picking and editor anchors. They do not import D3 or a DOM renderer.
- `rendering/presentation.ts` owns SVG/D3 presentation. It receives resolved styles and geometry; it does not own graph membership or physics.
- `panel.ts` connects factories, presentation and selection to `TGPanel`. TouchGraph retains mounting, dragging, locality, lenses, layout and destruction.

`tg/core.ts` and `fm/core.ts` expose the headless dependency closures. `tg/index.ts` and `fm/index.ts` add browser integration. Tests enforce class identity, one-way dependencies and parser/renderer-free core imports.

Navigation controllers, editors, persistence and search should be added under `fm/` as their milestones are implemented. They should delegate to the existing model and panel owners rather than copying live adjacency, visibility or node-selection state.
