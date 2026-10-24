# 1. System intent

Part of the [assurance baseline](README.md), version 0.1, 2026-10-24. This states
the intended system from the outset. It does not infer requirements from current
source code or assert that the following behavior has been implemented.

## Purpose and audience

Freshmind is an interactive **browser for graphs**. It helps a person find an
item, understand its relationships, follow useful connections and retain what
they learn. It should make meaningful local structure understandable within a
larger graph while preserving the underlying information.

The starting setting is a person working with a graph on their own device. They
may explore an existing graph, annotate and edit it, save it, and return later.
Research, knowledge exploration and other domain applications can supply data;
the browser should not assume that one domain's meanings apply universally.

Later, an application may use server-held graphs, retrieval services or shared
work. That extension must make the changed data handling and authority explicit.
It must not make a server a prerequisite for the original local workflow.

## Intent requirements

**INT-01 — Understand and navigate relationships.** A user can identify a center
of attention, inspect nearby nodes and their relations, read their meaning and
details, and move to another center without unnecessary interaction. Direction,
type, labels and weights remain interpretable where the graph supplies them.

**INT-02 — Preserve information.** Exploration preserves the complete graph,
including information outside the current view. Identity, relation endpoints,
labels, metadata, annotations, types and declared weights survive ordinary
browsing and supported save/load cycles. A change to data is intentional and
distinguishable from a change to its presentation.

**INT-03 — Provide useful focus and context.** A user can obtain a readable local
view without needing to display every node and edge at once. Focusing,
reinforcing local structures, filtering, aggregation and alternative views serve
understanding. The interface explains what is hidden, aggregated or unavailable
so that a partial view is not mistaken for the whole graph.

**INT-04 — Maintain orientation and interaction ownership.** Selection, center,
navigation history and pending actions have consistent meanings across views.
Graph shortcuts act on the intended graph target; explicit text/control focus
takes priority. Pointer and keyboard navigation support the same conceptual
operations. Layout motion must not make reading or editing impractical.

**INT-05 — Support deliberate authoring.** A user can edit node and relation
information, including labels, details and weights, without accidentally changing
identity or unrelated data. Draft, accepted, rejected and saved states are
distinguishable. Editing modes, including moving in-place text where selected,
serve that workflow without changing the meaning of the document.

**INT-06 — Combine retrieval and exploration.** A user can search for content or
start from an item and retrieve related items, then explore their ordinary graph
context. A query and its result associations can be represented explicitly in
the graph. Query/context/result relations, source evidence, scores and user
feedback remain distinguishable from pre-existing semantic relations. Literal
and supplied semantic approaches may differ internally; no topic model or
specific ranking algorithm defines this intent.

**INT-07 — Keep local use self-contained.** Once the application and required
local resources are available, the local workflow can browse, edit, retrieve
locally where configured, and save supported graphs without sending their
content to a service. Users know what is held in memory, stored durably or
transferred. Remote retrieval is a separately declared capability.

**INT-08 — Allow future server-backed use.** Persistence and retrieval can later
be supplied remotely through explicit contracts while preserving stable identity,
clear authority, access scope, provenance and failure behavior. Supporting that
possibility does not promise collaboration, offline synchronization or a hosted
service in the initial system.

**INT-09 — Make results inspectable.** A user can distinguish source facts,
derived presentation, retrieved associations and personal annotations. Exported
findings retain enough identity, relationship meaning and source context to be
checked. A visual connection or search score is not automatically a verified
claim about the world.

## Representative acceptance stories

These are future acceptance cases, not a description of current test coverage.

| Story | Observable success | Requirements |
| --- | --- | --- |
| Open a private graph, explore it, save and reopen it | The complete semantic document is preserved; view operations do not delete hidden records; local content is not transmitted. | INT-02, INT-03, INT-07 |
| Understand an unfamiliar local neighborhood | The user can identify the center, relation direction/meaning, shared neighbors and omitted information, then pivot and return. | INT-01, INT-03, INT-04 |
| Edit a label, relation weight or annotation | Only the accepted fields change; invalid or canceled edits retain the prior document; the user can tell whether the result is durably saved. | INT-02, INT-05 |
| Search, inspect a result and reject an irrelevant association | Query and result provenance remain inspectable; ordinary graph relations survive; feedback has an explicit, bounded effect. | INT-06, INT-09 |
| Use a later remote provider that fails or returns stale data | The user sees failure or incompleteness; unrelated/local data is preserved; stale results do not overwrite the active document. | INT-02, INT-08 |

## Scope and unresolved product choices

The explicit starting direction is the graph browser, local information
preservation, later server extensibility, and the RFC/visual-search ideas developed
in the conversation. The requirements above elaborate that direction and remain
reviewable interpretations. They do not require a particular rendering toolkit,
solver, file format, framework, worker implementation or deployment platform.

The system is not promised to display an arbitrary whole graph legibly, prove
facts from visual proximity, infer domain truth from weights, or make automatic
semantic edits through layout. Exact reproduction of historical figures is
outside scope. Specific application markets are hypotheses, not fixed product
requirements; see the [research roadmap](../ROAD.md).

Decisions still needed include the first supported user/domain tasks, required
editing recovery/undo depth, durable local storage policy, supported environments
and workloads, and the scope of any first server extension. These must be made
explicit before claiming acceptance for those capabilities.
