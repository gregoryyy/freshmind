# Graph retrieval direction and integration

Scope revision from Gregor Heinrich, **2026-10-24**: use the npm package
**elasticlunr** for literal retrieval and implement LDA-based semantic retrieval
with the graph-search functionality of FM 2014. **Embedding retrieval is
deferred.** This supersedes the earlier conditional-library and supplied-semantic-
module plans; it does not change the graph-browser purpose.

## Implemented retrieval boundary

Information retrieval remains in `src/ir/`, independent of FM and TG. It owns
corpus snapshots, elasticlunr indexing/ranking, topic training/inference,
document/term similarity, workers and model lifecycle. FM owns graph extraction,
query/context/result relations, feedback and source/document freshness checks.
See the [module map](../src/README.md).

- `LexicalSearchIndex` now uses **elasticlunr 0.9.5**. A bounded compatibility
  grammar supplies Boolean expressions, phrases, prefixes and exact metadata
  filters. It does not claim Lucene syntax, score or binary-index compatibility.
- `LdaQueryClient` provides semantic query and document retrieval, term
  suggestions and document/term similarity operations. It supports accurately
  named symmetric-KL distance and predictive likelihood. The former prototype's
  true Jensen–Shannon mode remains available for compatibility.
- Training supports seeded local Gibbs sampling and minimum document frequency;
  the main browser starts at FM's minimum frequency of 2. Models can be saved and
  loaded as separate local JSON files, with exact corpus-content validation.
- Results retain backend, metric, raw value, rank and corpus provenance. Query
  settings participate in persisted rejection feedback. No embedding dependency,
  server or automatic linked-resource fetch is introduced.

The [FM 2014 parity record](fm2014-retrieval-parity.md) specifies the examined
sources/binaries, feature mapping, corrected legacy defects and deliberate
differences. The [browser guide](graph-search.md) explains controls and limits.

## Compatibility and evidence

Existing public import paths and the `lexical` / `lda` persisted engine names
remain. Requests without explicit semantic settings retain prototype scoring;
new browser requests explicitly select the FM-style metric. The standalone
`LdaSearchIndex` default also preserves historical Jensen–Shannon experiments.
Legacy Java/Lucene binary index/model formats are not loaded by the browser.

The earlier 54-run [prototype comparison](experiments/search/README.md) remains
historical evidence. Its lexical scorer is frozen for replay, and its results
are not silently regenerated with elasticlunr. Current library/binary reference
checks, real-worker tests and the updated walkthrough provide separate evidence
for the implemented behavior. Small synthetic tests do not establish general
retrieval relevance or usability.

Tasks **4.15–4.18** in [TODO.md](TODO.md#4-graph-visual-search) record this scope.
The previous supplied-module replacement tasks **4.8–4.12** are superseded rather
than asserted complete. RFC and search implement the historical ideas; exact
figure reproduction remains outside scope.
