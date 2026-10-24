# Graph search: supplied-module direction

Scope decision from Gregor Heinrich, **2026-10-24**. This supersedes the LDA-based
implementation plan in the [earlier source audit](visual-search-design.md).

Gregor will provide the search module. The intended capabilities are:

- A literal search engine equivalent in purpose to Lucene.
- Semantic retrieval, potentially based on embeddings. Its implementation remains
  open until the supplied module and its capabilities can be reviewed.
- Graph exploration that realizes the ideas and interactions described in the
  reference text. Original figure layouts, crosshairs and labels are outside scope,
  for both RFC and visual search.

LDA is excluded from the intended search implementation. The existing LDA code,
controls, experiments and walkthrough document an earlier prototype. They remain
in the checkout for now; this scope update changes documentation only and does
not claim that the prototype has been removed or replaced.

## Integration work

Once the module is available, inspect its actual API, indexing lifecycle, literal
query behavior, semantic capabilities, result identities/scores and execution
requirements. Derive the adapter from those findings; no engine, embedding model,
provider, vector format or scoring contract is selected by this document.

Freshmind owns the graph interaction around retrieval: query/context nodes,
result relations, stable node identities, existing-node similarity where supported,
explicit rejection feedback, native persistence and navigation through surrounding
semantic relations. Preserve the existing RFC, viewing-lens and structural-view
owners when adapting those interactions.

Replace the prototype's LDA-specific backend assumptions, training controls,
model lifecycle and dependencies as part of that integration. Reassess which
existing graph commands, cancellation/stale-result guards and fixtures remain
useful. Verify the actual supplied engine rather than treating the homemade
lexical index or LDA scores as its specification.

Examples, walkthroughs and reproducible comparisons must then describe the supplied
module's literal and semantic behavior. The earlier LDA measurements remain
historical evidence about that prototype, not acceptance results for the new
direction. [TODO.md](TODO.md#4-graph-visual-search-with-the-supplied-search-module)
tracks the pending work; it depends on receiving the module.
