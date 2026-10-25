# Dependency-impact pilot protocol

TODO **6.7**. Initial [maintainer feedback](FEEDBACK.md) found the separate-view UX
unsatisfactory and prefers an r=2 tree reinforced directly in the existing graph.
The table remains an experimental study. **A full task session is still pending**;
no task answers, timings or accuracy results have been collected. The user chose
dependency impact
analysis using a public dependency graph; the [evaluation](README.md) supplies
that graph and exact answer oracles. Automated checks cannot supply human errors,
confidence, discoverability or whether this investigation is useful repeatedly.

## Session setup

Use the normal graph with **View → Reinforced neighborhood → r=2 tree** and this
evaluation's [native graph](dependency.fm.yaml). `just dev` serves the application;
open this YAML file. Use **Reinforce selected node** to activate a selected center;
set **Neighborhood depth** to at least two to show its neighbors' neighbors.
Use **Show whole graph** when the investigation needs context beyond that locality.
The automatic tree uses both directions for layout; original semantic arrows
retain dependency direction. Record whether that distinction causes confusion.
Optionally use the
[five comparison pictures](index.html) for the shared-neighbor baseline exercise.
The list/tree and matrix are static comparison prototypes, not equally developed
interactive applications; do not compare their interaction times with the product.

Keep all work local. Use this public fixture rather than a private organization
lockfile. Record application commit, browser, viewport, prior graph experience
and whether the task resembles a real investigation. No analytics or background
submission is added. Share only the requested observations voluntarily; no private
URLs, source code, screen recording or identifying participant information is needed.

The facilitator should retain the answer key in README/evidence.json until after
the initial tasks. If the participant already read it, mark the run **informed**;
it can assess navigation/discoverability, not uncued task accuracy.

## Tasks

1. In the full graph, identify d3-dispatch. Determine which installed packages
   depend on it directly and which additional package depends on it in two hops.
   State the direction convention and what evidence supports the answer.
2. Reinforce d3-zoom as an r=2 tree and inspect its outgoing relations. Find a
   package shared by multiple direct neighbors, identify each shared package once
   and name its direct-neighbor routes. Inspect the relation involving
   a peer requirement and explain how its meaning differs from a normal dependency.
3. Change the reinforced center to d3-color and inspect incoming paths. Does its
   two-hop focal tree establish whether fm4 might be affected? Inspect wider,
   unreinforced context or expand the visible neighborhood as needed to explain
   the limit, rather than concluding from focal membership alone.
4. Optionally compare the historical d3-zoom screenshots in ego, RFC, experimental
   table, list/tree and matrix.
   Describe which makes sharing/direction clearest, what was hard to locate,
   and one investigation you would repeat with this representation.

For the main workflow, pause motion if useful, select a node and use **Reinforce
selected node**; **r=2 tree** keeps the graph visible. Use normal graph navigation,
centering, details and editing, checking whether the intended center and original
relations remain understandable. If comparing the table, explicitly open
**View → Experimental studies → Neighbor table (experimental)**; its paging,
witness lists and traversal controls apply only to that study.

For more than one participant, rotate which representation is shown first and
record the order. This narrow pilot identifies errors and needed changes; it is
not powered for a general superiority claim. If a facilitator helps or a package
is difficult to select, record the intervention rather than silently skipping it.

## Observation form

- Build / browser / viewport; informed or uncued; representation order:
- Familiarity and relevance to a repeated investigation:
- Task 1 answer, direction explanation, help/missteps, confidence:
- Task 2 answer, shared-package explanation, peer interpretation, graph navigation and visibility-depth problems; table occurrences/paging only if tested:
- Task 3 conclusion and evidence; any false inference from missing context:
- Task 4 preference with reasons and a concrete repeated task:
- Lost place, wrong item edited, stale selection or unexpected source changes:
- Suggested revision and anything blocking adoption:

Elapsed task times may be noted as descriptive observations only, with assistance,
prior answer exposure and static-vs-interactive differences recorded.

## Decision and exit criteria

Any direction inversion, duplicate-node interpretation, false no-impact conclusion,
lost source information or unintended edit requires investigation and a recorded
revision/retest before claiming the task supported. A positive pilot needs a
participant to complete the investigation, explain its scope and identify an
actual repeated use; subjective preference alone is insufficient.

Record observations and resulting changes as a separate PR for **6.7**, keeping
failures visible. Then decide whether **6.8** should provide an npm dependency
adapter, another source, or no adapter yet. The current runner is a pinned study
fixture converter, not that architectural or product decision.
