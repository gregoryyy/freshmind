# FM 2014 retrieval: scope, reconstruction and verification

Scope recorded **2026-10-24**: elasticlunr literal retrieval plus LDA semantic
retrieval with FM 2014's graph-search operations; embeddings deferred. This is a
feature/contract comparison, not a claim of identical Lucene scores, historical
binary compatibility, identical Gibbs trajectories or reproduced legacy defects.
See the [integration direction](search-module-integration.md) and
[browser guide](graph-search.md).

## Evidence examined

The owner provided `../knowceans/knowceans-freshmind-2014/` and authorized
inspection/decompilation of the missing Dirichlet implementation. Source files
under `src/org/knowceans/freshmind/ir/` include `GraphLuceneIndexer`,
`LuceneSearch`, `LuceneSimilaritySearch`, `LdaSearch`, `LdaSimilaritySearch`,
`LdaTopicSimilarities`, `LdaSimilaritiesFm` and the FM sampler/corpus adapters.
`FreshmindBrowser.properties` supplies reference settings.

The missing `org.knowceans.dirichlet.lda` classes were found in the bundled
`lib/knowceans-corpus.jar`. `javap -p -c` disassembled `LdaQueryClient`,
`LdaTopicSimilarities` and `LdaGibbsQuerySampler`; no additional decompiler was
needed. [The synthetic reference fixture](../tests/fixtures/fm2014-retrieval.json)
pins their class-byte SHA-256 hashes. No JAR, private corpus, trained legacy model
or decompiled source is redistributed here.

The supplied `knowceans-tools` source tree contains `IndexRanking`, `Conf` and
the corpus utilities; the original application's matching tools JAR provides the
runtime ranking class for the binary comparison. Legacy graph clustering source
is also available in the sibling `cluster` package, including Chinese Whispers
and Markov clustering. This retrieval change does not port or replace those
clustering algorithms.

## Feature and ownership mapping

| FM 2014 capability | Current equivalent | Evidence / boundary |
| --- | --- | --- |
| Index node label, hint and combined content; exact stable IDs/types | Shared Unicode/stop-word analysis feeds elasticlunr field indexes; exact ID/type/tag filtering remains explicit. | Hand-calculated elasticlunr scores, grammar and Unicode/opaque-ID tests. No global analyzer changes, stemming or automatic URL/file content ingestion. |
| Literal text/field/Boolean queries | `LexicalSearchIndex.search()` uses elasticlunr postings and scores plus the bounded FM grammar. | AND/OR/NOT, grouping, phrases and bounded trailing prefixes; unsupported syntax fails explicitly. Full Lucene parser/score compatibility is not promised. |
| Similarity from an existing node's term vectors | `LexicalSearchIndex.similar()` issues label/content term queries and excludes the source. | Actual engine scores, deterministic ID ties and graph tests. Does not repeat the Java path's accidental use of a document ordinal as a result score. |
| Train/index an LDA corpus | Seeded local Gibbs training with progress/cancellation and configurable minimum document frequency. | Existing Gibbs count/RNG reference, vocabulary-filter checks, real worker training. Browser default minimum document frequency 2; headless callers retain default 1 unless specified. |
| Infer query topics, then retrieve documents | `LdaQueryClient.getWords()`, `getTopics()`, `getDocResults()` and worker queries. | OOV/empty handling, fixed-model inference checks and Dirichlet matrix-ranking reference. Query inference intentionally keeps trained phi fixed. |
| Document/term similarities and term suggestions | `LdaSimilarities` exposes query→documents, query→terms, document→documents, document→terms, term→documents and term→terms. `LdaQueryClient` supplies stable-ID/word wrappers. | All six relationships checked on synthetic matrices against the original Dirichlet binary for its distance paths, plus predictive query paths. Term suggestions are headless APIs; the graph UI retrieves content nodes. |
| Choose distance or likelihood ranking | Symmetric KL in bits, predictive likelihood, and retained bounded Jensen–Shannon mode. | Explicit metric/raw value; independent equations and numerical reference. Divergence ranks ascending, likelihood descending. |
| Reuse a trained model | Separate local JSON model save/load, including vocabulary, stable row IDs, parameters and corpus snapshot. | Real download/reload plus invalid-corpus and delayed-read tests. New JSON format, not Java `.phi.zip` / `.theta.zip` / `.mcmc.zip` compatibility. |
| Query/result graph, context, rejection feedback and shortcuts | Ctrl+F/Ctrl+Shift+F creates a lexical/LDA node before retrieval, with moving query entry, Enter submission, F2/Ctrl+Enter rerun and direct query deletion/context return. Request settings scope feedback. | Worker/browser, metadata round-trip, malformed-batch atomicity and stale-job tests. No graph ownership enters IR. See [the workflow](graph-search.md). |

For a headless caller, the trained model is independent of any graph objects:

```ts
import {createSearchCorpus} from "fm4/ir/corpus";
import {trainLda, LdaQueryClient} from "fm4/ir/topics";

const corpus = createSearchCorpus(documents); // stable IDs, type, label, hint, tags
const model = trainLda(corpus, {topics: 3, minDocumentFrequency: 2, seed: 4357});
const client = new LdaQueryClient(model, {metric: "predictive"});
const documentsByQuery = client.getDocResults("graph layout");
const relatedDocuments = client.getDocSimilarities("paper-1");
const suggestedTerms = client.getTermResults("graph layout");
const relatedTerms = client.getTermSimilarities("graph");
const documentTerms = client.getDocTermSimilarities("paper-1");
const termDocuments = client.getTermDocSimilarities("graph");
```

Browser applications use `SearchSession` / `GraphSearchController` rather than
blocking the main thread for training. The model-file UI goes through those
owners; it does not create a second graph or model cache.

## npm/browser portability

Elasticlunr 0.9.5 assigns its `lunr` compatibility alias without declaring it,
which fails in strict browser modules. `scripts/elasticlunr-runtime.mjs` generates
an ES module from the installed npm package, declaring that alias locally inside
the original closure, forcing its CommonJS export and restoring the global
`this` expected by its console utility. Ambient AMD loaders and existing `lunr`
globals remain untouched. The script checks the
complete upstream source SHA-256 before the single declaration change. No
runtime evaluation or process-global alias is needed. Build/dev recipes generate
the adapter; library builds include it and browser builds ship the full MIT
notice. Updating elasticlunr requires reviewing this pinned adapter.

## Score contract and numerical corrections

For normalized topic vectors, the legacy helper called `jsDistance` computes
**symmetric KL**, not midpoint Jensen–Shannon:

`D(p,q) = 0.5 × Σₖ (pₖ − qₖ) log₂(pₖ/qₖ)`.

Identical distributions have distance 0; differing supports can have infinite
distance. Such candidates are excluded rather than producing invalid graph
metadata. Predictive document retrieval uses

`p(document | query) = Σₖ p(document | topicₖ) p(topicₖ | query)`

with `p(document | topic)` obtained by column normalization of document-topic
theta under a uniform document prior. Term retrieval uses phi directly;
term-based topic queries use its Bayes-inverted posterior. Predictive scores are
directional even where the old name says “mutual likelihood”.

Some older FM adapters index transposed matrices incorrectly; the document-based
predictive helper also reverses query and candidate roles. The new implementation
follows the stated conditional-probability equation, checks dimensions and
excludes the queried document/term from self-similarity. Dedicated tests cover
these corrections. It does not treat those defects as required behavior.

Results retain raw `value` and `metric`. For symmetric KL, the positive display
`score` is `1 / (1 + distance)`; predictive `score` is the probability itself;
Jensen–Shannon `score` is one minus its normalized divergence. `relevance` is a
relative display normalization, not a calibrated probability. Edge labels show
the selected metric and raw value. Request settings and diagnostics survive graph
serialization and participate in feedback ownership.

New FM-style queries use strict distance limits **0.6** for term queries and
**0.2** for existing-document similarity, with 100 query inference passes. An
explicit optional limit overrides them. Likelihood ranking ignores distance
limits. The model's alpha and reproducible seed are honored rather than silently
overriding priors. The prototype `LdaSearchIndex` default and old graph requests
without explicit semantic settings retain their earlier bounded-JS behavior.

The recovered query sampler resamples both training and query corpora during a
query, restoring saved training state between calls. FM4 instead uses read-only
fixed-phi fold-in; training and query RNG instances are initialized independently from recorded seeds. This
intentional inference difference means the matrix-level parity results do not
establish identical text-query rankings to every historical model/run. The local
serial trainer is checked against the separately available knowceans-ilda
reference; it is not claimed as a reproduction of every Dirichlet training mode,
burn-in/averaging schedule or hyperparameter estimator.

## Deterministic verification and remaining assurance

`just test-retrieval-java` compiles our small harness and executes the owner's
original binary on synthetic phi/theta/query matrices. It reads no graph data.
It verifies pinned class bytes, posteriors, distances and predictive query
rankings against the committed fixture. Ordinary Node tests use that fixture
without requiring the external JARs/JDK. `just test-lda-java` independently checks
10,000 RNG draws, training counts and query inference against the sampler source.

The archived prototype scorer lives only in
`tests/fixtures/lexical-v1.mjs`, outside production imports. Its old 54-run report
remains reproducible; it is not evidence about elasticlunr or the new FM-style
semantic defaults. The updated search walkthrough shows the current browser;
its synthetic examples do not establish real-world relevance or user benefit.

Against the proposed [assurance baseline in PR #36](https://github.com/gregoryyy/freshmind/pull/36),
this work supplies focused evidence for retrieval ownership (`ARC-06`), stale
work/model-file handling (`ARC-07`, `USE-07`), explicit score/query provenance
(`INT-06`, `INT-09`, `USE-09`) and local operation (`USE-01`). These are scoped
checks, not a complete privacy/security audit or approval of every baseline
interpretation. Embeddings, server retrieval, automatic linked-resource
indexing and legacy binary-model import remain outside this increment.
