# Fictional topic library

[topic-library.fm.yaml](topic-library.fm.yaml) is newly authored demonstration data
for graph visual search. All researchers, papers, annotations and relations are
fictional; no legacy dataset, paper figure or external resource was imported.

The graph contains 24 nodes and 28 semantic relations: one collection, three
researchers, six papers each on graph layout, probabilistic topic modeling and
forest ecology, and two layout/topic bridge papers. Citations connect the themes.
Labels and annotations provide the text corpus; `data.tags` provides exact whole
tag values (`visual search`, `topic models`, `forest ecology`). Authors have short
research descriptions so they can also be retrieved as graph items.

Load **Graph search → Fictional topic library** in **Load example**, then follow
the [search guide](../../docs/graph-search.md) or
[production walkthrough](../../docs/search-walkthrough/index.html). Try lexical
`spring layout`, exact tag `visual search`, or train three LDA topics for 200
passes with seed 4357 before searching. Select a paper for similarity retrieval.

`just search-example` regenerates the native file from
[search-example.mjs](../../scripts/search-example.mjs). The same import-safe
fixture defines explicit relevance sets for the
[reproducible experiment](../../docs/experiments/search/README.md). Those judgments
and deliberately separated topics are test assumptions, not human relevance
annotations or evidence of general search quality. Text and generator are
Apache-2.0; the LDA implementation retains its separately documented GPL license.
