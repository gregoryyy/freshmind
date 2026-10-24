# AGENTS.md

Freshmind 4 demonstrates and extends the original Freshmind graph-browser concepts in a modern browser, preserving TouchGraph's layout and lenses. The motivation is in [README.md](README.md), the plan in [TODO.md](docs/TODO.md), and implementation notes, verification and limits in [DONE.md](docs/DONE.md).

## Layout

One npm ESM package, with three source domains. See the [module map](src/README.md) for contracts and public imports.

- `src/tg/`: TouchGraph model, graph/locality, layout, lenses and browser panel. Imports neither FM nor IR.
- `src/fm/`: Freshmind model, configuration, geometry, `render`, `navigate`, `edit`, I/O, `struct`, RFC, `cluster`, `struct-view`, graph-search adapters, browser composition and UI.
- `src/ir/`: independent information retrieval: corpus contracts, elasticlunr literal retrieval, `topics` and worker/session lifecycle. Imports neither FM nor TG. Freshmind adapts graph content and applies results through `fm/ir`.
- `demo/`: application pages, controls, file pickers and example loading. `tests/` uses Node tests and Playwright; `tests/reference/` contains pinned Java compatibility sources.
- `scripts/`: conversion, reproducible experiments, walkthrough capture and PDF tooling. `config/fm2014.types.yaml` is the canonical type profile; use `just sync-fm-config` to regenerate its outputs.
- `docs/`, `examples/`, `assets/`: designs, reports, attributed data and artwork. `dist/` and `demo-dist/` are generated; never edit them.

## Stack and boundaries

Strict TypeScript, native ES modules, Node and Vite. SVG/D3 provides presentation and interaction; TouchGraph owns physics. YAML handles native persistence; Graphology supplies detached clustering proposals. Preserve component licences in [LICENSE](LICENSE) and [NOTICE](NOTICE) when moving or adding code and dependencies.

- Cross-feature imports use `index.ts` contracts or parser-free `core.ts` entries. Keep runtime imports acyclic and browser/DOM/D3/YAML dependencies outside headless entry points.
- Preserve public exports, compatibility aliases and constructor identity. Keep graph membership, locality, coordinates, selection and lifecycle with their existing owners; extend through narrow hooks and composition.
- Use the short canonical module names above. Topics belong to IR. Retrieval takes document snapshots and returns stable-ID results; graph and panel objects stay in FM/TG.

## Process

- Never commit to `main`. Work on a feature branch and open a PR directly against `main`; avoid stacked branch chains. Merge through the PR after checks pass when merging is requested.
- Keep one TODO item per branch where practical. Reference its number in the PR, mark completed work in `docs/TODO.md` and record implementation notes, deviations and verification in `docs/DONE.md`.
- Preserve the README's motivation and overview; link to existing detailed documents for specifics. Keep `just` recipes as the documented workflow rather than replacing them with npm commands.
- Keep changes scoped. Do not overwrite unrelated work or regenerate historical experiment records merely because source paths changed.
- Consult [the assurance baseline](docs/assurance/README.md) for intended purpose, usage constraints and architectural requirements. Keep its requirement IDs and explicit open decisions distinct from implementation/completion claims; reconcile changes of direction and report evidence gaps rather than inferring requirements from existing code.

## Verification

- Use `just --list` to find recipes. `just install`, `just dev`, `just build` and `just build-demo` cover installation, development and builds.
- Run `just check` for code changes: type checking, library build, Node tests and production demo build. Add meaningful logic tests and regression coverage for changed behavior; documentation-only changes need link and whitespace checks.
- Run `just test-browser` for browser behavior and worker/bundler changes. Installed Chrome can be selected with `PLAYWRIGHT_CHANNEL=chrome`; `PLAYWRIGHT_PORT` selects a free port.
- Run `just test-java` when changing graph/layout/lens compatibility; it requires a JDK. `just check-all` combines routine, Java and browser checks. `just test-lda-java` checks the optional pinned prototype sampler reference.
- Build recipes clear `dist/`; do not overlap builds with tests that consume it. Python 3 is needed for conversion checks; plotting requires the dependencies described in the relevant experiment guide.
- Use `just flipbook`, `just rfc-showcase` or `just search-flipbook` for the relevant production walkthrough. Use `just pdf` / `just pdfs` for requested PDF rendering. Report actual checks and limitations.

## Data, async work and research scope

- Treat imported YAML, metadata, annotations and URLs as untrusted. Keep validation atomic and use existing safe annotation/resource handling. Preserve stable IDs, complete graph data and persistence compatibility.
- Async jobs must check document identity/generation and corpus/source validity before applying results. Cancellation, replacement and disposal must clean up workers, listeners and timers and ignore late callbacks.
- Preserve original source headers, pinned references, dataset provenance and licence notices. Use approved conversion inputs; do not import proprietary reference datasets into the repository.
- RFC and visual search should fulfil the ideas described in the reference text, with room to improve the implementation. Exact 2005 figure layouts, crosshairs and labels are outside scope. Keep experiments reproducible and distinguish synthetic observations from general quality claims.
- Use elasticlunr for literal retrieval and LDA-based semantics for FM 2014 graph-search feature parity, per the latest user direction. Embedding retrieval is deferred. Preserve independent IR ownership, local data handling and model/source freshness. Follow the [integration plan](docs/search-module-integration.md) and [parity record](docs/fm2014-retrieval-parity.md); distinguish corrected legacy defects and scoped numerical checks from exact historical behavior or general retrieval-quality claims.
