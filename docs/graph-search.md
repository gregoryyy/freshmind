# Graph visual search

Literal retrieval uses **elasticlunr 0.9.5**; local **LDA** retrieval restores
FM 2014's document/term search operations. Embeddings are deferred. See the
[integration plan](search-module-integration.md) and the
[feature mapping and numerical limits](fm2014-retrieval-parity.md).

Open **Graph search** in the main browser. Search covers the complete stored
graph, including items outside the current neighborhood. Results join the current
view, so their ordinary semantic connections remain available for exploration.
Explicit structural type filters still apply; remove a filter to inspect a
result of a hidden type.

With the graph focused, FM2014's shortcuts reveal the controls even when
collapsed: `/` clears and focuses literal search; **Ctrl+F** focuses literal
terms and **Ctrl+Shift+F** selects the topic-model method. Enter in the
query field runs it with the selected graph context. **Ctrl+R** and
**Ctrl+Shift+R** retrieve literal/topic similarities for the selected content
node. **Ctrl+I** builds and checks a literal index snapshot in a worker, reporting
the document count without creating graph items. The engine indexes current
text automatically for every literal query, so this is an explicit check rather
than a prerequisite or persistent index. **Ctrl+Shift+I** trains the current
topic model using the configured settings. Busy work ignores repeated shortcut
requests; cancellation and graph/text freshness checks remain authoritative.
These shortcuts apply to the graph, leaving normal text and browser shortcuts
available in editors. See the [key map](KEYMAP.md).

1. Choose **Lexical**, enter terms such as `graph AND layout`, and press **Run
   query** or Enter. A query node appears beside the selected context node, with
   relevance-labeled links to results. Select an existing query and run again to
   replace its links; manual and context relations remain. Switching its method
   also updates its node type and replaces its earlier result links.
2. For exact metadata lookup choose **Tags (exact)**. Enter whole tag values,
   separated by commas; all listed tags are required. Tags live in each node's
   `data.tags` string array, editable through the full item overlay. Exact tag
   retrieval works with either search method and does not need a trained model.
3. For topical retrieval choose **LDA topics**, open **Topic model training** and
   press **Train topic model**. The status reports passes and the resulting topic
   words. Then enter ordinary words and run a query. Topic count, priors, passes
   and seed control training. Minimum document frequency defaults to 2 in the
   browser; it filters the topic vocabulary, without removing literal-search
   documents. Retrain after changing graph text or tags.
4. Select a content node and press **Find similar nodes** to attach neighbors
   directly to it. The source is excluded. Lexical similarity queries the source label/content terms;
   LDA compares document topic distributions. Neither changes node importance or
   turns RFC on. The existing lens, RFC and structural controls remain independent.
5. Select a green result relation and press **Reject selected result**. Its link
   disappears and the negative judgment is retained. Future runs of that query
   omit the rejected item. Ordinary hide/collapse actions do not record feedback.
   This collects input for future learning; it does not train a feedback model.

Lexical queries support `AND`, `OR`, `NOT`, grouping, quoted phrases, trailing
prefixes and the `content:`, `label:`, `hint:`, `id:`, `type:` and `tag:` fields.
Adjacent terms use OR; adjacent NOT excludes. `id:` is case sensitive; type/tag
values are normalized whole values. For example `tag:"visual search" AND
type:paper`. Unsupported fuzzy/range/boost/wildcard forms report an error.
All-stop/OOV text produces no results. LDA accepts ordinary query words, not the
lexical Boolean grammar. Maximum displayed results is 1–100 (default 5).

For LDA, choose **FM 2014 symmetric KL distance**, **Predictive likelihood** or
**Bounded Jensen–Shannon distance**. Labels and metadata record the metric and
raw value. Lower distances are better; higher likelihoods are better. The optional
strict distance limit defaults to 0.6 for text queries and 0.2 for node similarity;
likelihood ranking ignores it. Display relevance is relative, not calibrated.
Old saved requests without an explicit metric retain the prototype JS behavior.

Training and retrieval run in browser workers. **Cancel search or training** stops
the active job. A new job supersedes the previous one; replacing a graph cancels
it and clears its in-memory model. Changed corpus text, deleted sources and edits
to a running query prevent stale results from attaching. Bindings and controllers
have explicit disposers for embedding applications.

**Save** retains query/context/result relations and rejection judgments through
the existing YAML metadata format, including currently hidden items. Trained
models can be exported/imported separately with **Save topic model** / **Load
topic model** in the training controls. These local JSON files include corpus
text and must be handled accordingly; files over 64 MiB are rejected. Loading
validates the model and current corpus before installation, and late reads after
graph replacement or disposal are ignored. This format does not import Java
binary models. Result metadata
records raw score, bounded display relevance, rank, query and corpus provenance;
ownership uses these structured values, never the relation label. Removing or
editing a result label does not silently change its ownership.

Load **Graph search → Fictional topic library** in the example selector for a
24-node demonstration. The [seven-step walkthrough](search-walkthrough/index.html)
shows current interactions; the archived prototype [54-run comparison](experiments/search/README.md) records
rankings, synthetic judgments, seeds and limits for the earlier scorer, not the
new backends. Its frozen scorer preserves historical replay. Regenerate with
`just search-example`, `just search-experiment` and `just search-flipbook`.

The [historical source audit](visual-search-design.md) and
[current parity record](fm2014-retrieval-parity.md) document
Lucene functionality/scoring differences, sampler provenance, licenses, limits
and headless APIs. This is an LDA text model with exact tags, distinct from the
thesis's ETT community model. Original-paper figures remain outside scope.
