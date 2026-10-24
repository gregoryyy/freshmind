# Graph visual search: source audit and implementation contract

**Historical prototype audit (2026-10-24):** the numerical contracts below
record the earlier lexical/LDA implementation. The latest user direction adds
elasticlunr and FM 2014-style LDA retrieval; embeddings remain deferred. See the
[current integration plan](search-module-integration.md) and
[parity record](fm2014-retrieval-parity.md) for the replacement and its evidence.

Task **4.1**, audited 2026-10-24. The goal is equivalent graph exploration with
current browser technology: queries become nodes, results become removable
relations, and an existing node can retrieve similar items. The [thesis
excerpt](literature/gheinrich-phd-thesis_p212.pdf) demonstrates these interactions
with an ETT community model. Our text model is LDA; this is not an ETT port or a
reconstruction of its figures. Semantic relations, RFC, structural filtering and
the viewing lens continue to provide the surrounding context.

## Reachable reference code

Paths below are relative to `../knowceans/knowceans-freshmind-2014/src/org/knowceans/freshmind/`.
The [earlier source analysis](fm2014_analysis.md) gives the wider migration context.

| Reference | Required behavior | Browser replacement |
| --- | --- | --- |
| `ir/index/GraphLuceneIndexer.java` | Stable node IDs; exact ID/type fields; analyzed label, hint and combined content; content term vectors | Immutable in-memory corpus and field postings, rebuilt from the complete graph |
| `ir/search/LuceneSearch.java` | Parse a query and rank matching nodes | Headless lexical index with an explicit supported grammar |
| `ir/search/LuceneSimilaritySearch.java` | Retrieve by an existing node's term vector, excluding itself | TF–IDF cosine over content vectors, stable ID tie breaking |
| `ir/search/LdaSearch.java` | Map query words into a vocabulary, fold in topics and rank documents | Fixed-topic query Gibbs inference using the trained vocabulary |
| `ir/search/LdaSimilaritySearch.java` | Compare existing document topic distributions | Normalized Jensen–Shannon similarity |
| `ir/search/NodeQueryAdapter.java` | Query/context/result graph relations, relevance styling and repeat searches | Structured provenance and owned result replacement; no label parsing |
| `FreshCommands.java` query and similarity commands | Create query nodes, run node similarity, remove result links | Shared headless commands and browser controls |
| `ir/semantic/LdaSimilaritiesFm.java`, `ir/search/LdaTopicSimilarities.java` | Topic/document/term matrix orientation and ranking | Explicit `theta[document][topic]`, `phi[topic][term]` contracts |

The old graph-to-LDA index client calls `org.knowceans.dirichlet.lda`, whereas the
available simple samplers live in `org.knowceans.topics.simple`. These are different
API generations. Port the required behavior, not Java serialized model files or
binary API compatibility. No Lucene JVM, server, filesystem index or new package
dependency is required in a user's browser.

Linked-resource extraction through `knowceans-indexing` is optional in Java and
is outside the initial browser corpus: do not fetch arbitrary node URLs or import
legacy binary indexes. The corpus includes labels, annotation text and explicit
`node.data.tags: string[]`. Tags are exact normalized metadata values, not an ETT
latent tag model. HTML annotation extraction must discard markup, script/style
content and decode common/numeric entities without importing a DOM into core.

## Lexical functionality (4.2)

The parser/browser-free retrieval entry is `fm4/ir`; `fm4/fm/ir` adapts graph nodes. Index complete-graph nodes,
including currently hidden items; exclude generated query nodes. Preserve IDs as
strings throughout. Reject duplicate IDs and invalid inputs before mutation.

Text analysis uses Unicode letters/numbers, lowercase and NFKC normalization with
a fixed documented English stop list. Supported queries include terms, quoted
phrases, trailing-prefix expansion, parentheses, `AND`, `OR`, `NOT`, and
`content:`, `label:`, `hint:`, `id:`, `type:`, `tag:` fields. Adjacent clauses use OR,
matching the reference parser's default. Exact fields use normalized whole values
(ID is case sensitive). Unsupported fuzzy, range, boost and wildcard forms report
an error instead of quietly changing the query. Bound query length, nesting and
prefix expansion. Phrase matching retains token positions before stop removal.

Rank lexical matches with explicitly specified TF–IDF weights
`sqrt(tf) * (1 + log((N + 1)/(df + 1)))`, length-normalized per field. Similarity
uses cosine between content term vectors. This supplies the reference's required
lexical functionality; it does not promise Lucene 3's norm quantization, Boolean
coordination, query normalization or byte-identical scores. Return actual finite
scores, descending rank and deterministic ID ties; provide bounded relevance
separately for display. Empty/OOV queries return no results. A parsed pure-negative
query returns no results, matching the positive retrieval contract.

The lexical contract above is implemented in `fm4/ir/lexical` (4.2), with graph commands in `fm4/fm/ir`. A minimal
headless use is:

```ts
import {LexicalSearchIndex} from "fm4/ir/lexical";
import {graphSearchCorpus, createGraphQuery,
  applyGraphSearchResults} from "fm4/fm/ir";

const corpus = graphSearchCorpus(graph);
const index = new LexicalSearchIndex(corpus);
const request = {engine: "lexical", kind: "terms", query: "graph AND layout"} as const;
const queryNode = createGraphQuery(graph, request, selectedNode);
applyGraphSearchResults(graph, queryNode, request, index.search(request.query), corpus);
```

`index.tags(["visual search"])` intersects whole normalized tag values;
`index.similar(nodeId)` excludes the source. `getCorpus()` returns detached values.
Exact `corpus.key` comparison protects stale work; compact `fingerprint` values in
result metadata are provenance only. Query-node reruns replace all that query's
owned result links; existing-content similarity replaces that source's results
for the selected engine. These graph commands operate on the complete graph;
browser locality/repaint integration belongs to 4.5. Phrase positions include stop
words, but an all-stop phrase has no searchable terms and yields no results.

## LDA and utility subset (4.3–4.4)

Select the serial `LdaGibbs` implementation, not the parallel/generated/HDP/ETT
variants. Preserve training, fixed-phi fold-in and predictive perplexity. The two
audited source snapshots are:

| Source under `../knowceans/` | SHA-256 |
| --- | --- |
| `knowceans-lda-simple/src/org/knowceans/topics/simple/LdaGibbs.java` | `9b2809e4d3a307d00d5ed14d462457832b528f8c5c42d44b3fa26436ac89da12` |
| `knowceans-ilda/src/org/knowceans/topics/simple/LdaGibbs.java` | `8d098e7377840203ec757c5b926ca6ee4aa3243e933e0b2a4d642ec56a5460ed` |

The latter carries GPL-3.0-or-later headers; its `readme.txt` explicitly says GPL
v3. Preserve that license and attribution for derived sampler code, include the
license text and describe its scope in the repository licensing documents. Do not
silently put derived code under the existing Freshmind Apache header.

The required training conditional, after removing a token's current assignment,
is `(nmk[m][k]+alpha)*(nkt[k][t]+beta)/(nk[k]+V*beta)`. Fold-in uses
`(nmkq[m][k]+alpha)*phi[k][t]` without changing training counts. Posterior means
are `(nmk+alpha)/(documentLength+K*alpha)` and
`(nkt+beta)/(nk+V*beta)`. Require positive finite priors, valid integer token IDs,
bounded dimensions and explicit iteration budgets. Empty documents have the prior
topic distribution but are excluded from retrieval; an empty vocabulary/model or
OOV-only query cannot yield topical results. Perplexity is unavailable for zero
known query tokens, rather than NaN/Infinity presented as a measurement.

Only numeric arrays, seeded randomness and categorical sampling are needed in the
sampler loop. `StopWatch`, Swing `TopicMatrixPanel`, `Vectors.print`, corpus file
readers, `LdaTeaLeaves`, demo random permutations, configuration singletons and
Java collection wrappers are not required runtime dependencies. Port the needed
`CokusRandom` generator with the upstream Cokus/MT19937 notice and fixed-vector tests; use
ordinary TypeScript arrays/Map and explicit small numerical helpers for the rest.
The generator comes from Shawn Cokus's 1998 recoding of MT19937 (Makoto Matsumoto
and Takuji Nishimura, 1997), via [David Blei's lda-c](https://github.com/blei-lab/lda-c/blob/d8fbd6bc9adc3fc32d3d47af1460158d44c789d0/cokus.c)
and Gregor Heinrich's Java adaptation. The upstream generator uses GNU Library
GPL version 2 or later; [NOTICE](../NOTICE) records the source hashes and original
notice, and [LICENSE-LGPL-2.0](../LICENSE-LGPL-2.0) contains the full license.

The audited `CokusRandom` overrides both `nextInt(n)` and `nextDouble`: bounded
integers use `floor(n*uniform)` and uniforms use one unsigned draw divided by
2^32. The port preserves this mapping. `just test-lda-java` checks 10,000 draws,
serial training counts/assignments and independently seeded query fold-in against
the pinned source. Reproducibility records seed, corpus order, vocabulary and
implementation version; this bounded check does not assert equivalence for all
legacy models or sampler variants.

Train on a stable sorted-ID corpus/vocabulary. Store IDs alongside rows, never
infer graph identities from ordinal scores. Return detached model snapshots,
topic words and diagnostics. Query inference gets its own seeded chain. Similarity
is `1 - JSD(p,q)/log(2)` with midpoint `m=(p+q)/2`, bounded to [0,1]. The Java method
named Jensen–Shannon actually averages `KL(p||q)` and `KL(q||p)`; preserve neither
that misnaming nor its unbounded scale. Predictive query likelihood can be reported
separately; do not confuse a distribution over words with one over documents.

## Graph and browser contract (4.5)

The sampler/utilities contract is implemented in `fm4/ir/topics` (4.3–4.4):

```ts
import {trainLda, LdaSearchIndex} from "fm4/ir/topics";
const model = trainLda(corpus, {topics: 6, alpha: .1, beta: .01,
  iterations: 100, seed: 4357});
const topical = new LdaSearchIndex(model);
const terms = topical.search("graph layout");
const neighbors = topical.similar(nodeId);
const topicWords = topical.topicWords(10);
```

`trainLdaSteps` yields progress after initialization and each sweep. `LdaGibbs`
exposes incremental stepping and detached diagnostic snapshots; `foldInLda` never
writes to phi. A model retains ordered IDs/vocabulary, exact corpus key, lengths,
settings, version and posterior matrices. Runtime models are not automatically
embedded into native graph files. Limits are 256 topics, 100,000 vocabulary terms,
two million topic/term or document/topic cells and tokens, 10,000 sweeps and priors
from 1e-9 to 1e6. Browser work must use the worker adapter in 4.5.

Search operates on a corpus snapshot with an exact content fingerprint. Node
position, visibility, RFC weights and layout ticks do not invalidate that corpus;
text, tags, IDs and types do. Query/result additions must not recursively index
themselves. Recheck the corpus and graph identity before applying asynchronous
results. Training and inference run in a worker in the browser. Expose progress,
cancellation, failure and disposal; replacing a document or starting a new job
terminates stale work. Keep headless APIs synchronous/iterable and DOM-free.

Term/tag query nodes use structured `data.search` metadata, including version,
engine and query. Result edges store owner/source, target ID, raw score, bounded
relevance, rank and corpus provenance. A context edge is a separate role. Repeat
searches replace only that owner's result edges; unrelated/manual/parallel
relations remain. Similarity queries attach to the existing source node, exclude
the source itself and use the same ownership rules. Labels are presentation only.
Result relevance may style a relation but must not rewrite semantic node importance
or turn on RFC. Reveal retrieved nodes through existing locality/navigation APIs.

Rejecting a result removes the owned edge and appends a persisted feedback record
to the source/query node metadata, containing target, query, engine and provenance.
Repeat searches omit rejected items for that query. This collects feedback for
future learning; do not claim that a trained feedback model already exists.
Ordinary hide/collapse/delete remains a distinct action. Native YAML's existing
JSON metadata support carries query/results/feedback without a second graph store.

Browser controls provide lexical/LDA selection, term/tag query creation, similarity
from the selected node, training settings/status/cancel and explicit rejection of
a selected result relation. Preserve text input, graph selection, ordinary editing,
RFC/lens/structural controls and complete-graph saving.

## Acceptance and reproducible examples (4.6)

Completed by the [fictional topic library](../examples/search/README.md),
[54-run report and records](experiments/search/README.md) and
[seven-step production walkthrough](search-walkthrough/index.html). Regenerate
with `just search-example`, `just search-experiment` and `just search-flipbook`.

Use new fictional documents and, optionally, only the approved Berry/NIPS-FM Java
data. Do not inspect or distribute other legacy corpora. Record analyzer/model
version, ordered corpus, seed, priors, iterations and relevance judgments. Compare
lexical and LDA ranking with explicit per-query precision/recall and limitations;
synthetic topic separation is not a claim of general retrieval quality. Include a
loadable native graph and browser walkthrough of query/context/result relations,
node similarity, rejection, repeated searches and save/reload.

Meaningful checks cover parser precedence/errors, exact and phrase fields,
TF–IDF/cosine hand calculations, graph identity and ownership, sampler count
conservation, normalized matrices, deterministic seeded replay, fixed-phi fold-in,
known JSD cases, finite perplexity, worker cancellation/stale results and persisted
feedback. Retain module-boundary checks and the existing browser workflow. Run
`just check` and relevant Chrome tests for implementation; documentation-only
changes use link/source review and `just pdf` rendering.

## Defects deliberately corrected

- `LuceneSimilaritySearch` constructs results with `.doc` (internal document
  ordinal) instead of `.score`. Stable IDs and relevance scores are separate.
- `NodeQueryAdapter.startSearch` repeatedly registers a listener; unlinking clears
  unrelated edges. Structured ownership and a disposable job lifecycle avoid both.
- Reusing `Thread.start()` in the asynchronous Java search path fails on a second
  query. Browser jobs are independent and cancellable.
- The topical predictive helper contains an explicit wrong-indexing FIXME;
  matrix axes and probability formulas above are the implementation contract.
- `SimpleSearch` has case/partial-match state defects and does not replace a real
  lexical index. It is not the specification for the port.
