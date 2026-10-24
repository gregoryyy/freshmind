# Graph search: current baseline and future integration

Latest scope decision from Gregor Heinrich, **2026-10-24**: keep the current
search implementation for now. If an external literal-search library becomes
necessary, use **elasticlunr**. This is a conditional library choice, not an
instruction to install it or replace the working index now.

## Current baseline

The lexical index, exact tags, current LDA topic prototype, node similarity,
query/context/result relations, rejection feedback and search walkthrough remain
available. The [browser guide](graph-search.md) describes their actual behavior.
LDA remains a prototype rather than the long-term semantic direction; keeping it
now does not reopen the earlier LDA development plan.

Information retrieval lives in `src/ir/` alongside `src/fm/` and `src/tg/`.
IR owns plain corpus/request/result contracts, lexical retrieval, `ir/topics`,
worker execution and search session/model lifecycle. IR imports neither graph
domain. `fm4/ir` is headless; `fm4/ir/browser` exposes worker/session adapters.

`fm4/fm/ir` adapts graph content and applies query/context/result relations and
feedback. Freshmind's browser controller owns graph replacement/source-edit guards,
status and visibility. The [module map](../src/README.md) lists canonical imports
and preserved public aliases.

## Deferred backend work

Tasks **4.8–4.12** in [TODO.md](TODO.md#4-graph-visual-search) concern future
backend replacement and are deferred. They do not block unrelated browser work.
A semantic module may still be supplied by Gregor and may use embeddings; its
API, provider, vector format and scoring behavior remain open.

When replacement is needed, inspect the actual module's API, indexing lifecycle,
query capabilities, stable result identities/scores and execution requirements.
Use elasticlunr if a literal-search library is required. Verify its actual query
behavior rather than assuming Lucene syntax or score compatibility. Adapt the
browser boundary and retire LDA-specific controls/lifecycle as appropriate to the
replacement. No dependency or backend API is selected beyond that conditional
literal-library preference.

Preserve graph query/context/result links, supported existing-node similarity,
rejection feedback, persistence, cancellation and stale-result guards. Keep the
existing RFC, viewing-lens and structural-view owners. Examples, walkthroughs and
comparisons must describe the backend actually running; earlier LDA measurements
remain evidence about that prototype.

RFC and visual search should fulfil the ideas described in the reference text.
Exact figure layouts, crosshairs and labels remain outside scope.
