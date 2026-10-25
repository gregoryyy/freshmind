# Dependency-impact pilot protocol

TODO **6.7**. **Blocked pending a maintainer/researcher session and observations.**
No participant results have been collected. The user chose dependency impact
analysis using a public dependency graph; the [evaluation](README.md) supplies
that graph and exact answer oracles. Automated checks cannot supply human errors,
confidence, discoverability or whether this investigation is useful repeatedly.

## Session setup

Use the radius-two browser from [PR51](https://github.com/gregoryyy/freshmind/pull/51)
and this evaluation's [native graph](dependency.fm.yaml). After both PRs are
merged, `just dev` opens the normal application; open this YAML file. Use the
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
2. Inspect d3-zoom's outgoing radius-two neighborhood. Find a package shared by
   multiple direct neighbors, name the witnesses and count unique second-hop
   packages separately from their occurrences. Inspect the relation involving
   a peer requirement and explain how its meaning differs from a normal dependency.
3. Change center to d3-color and inspect incoming paths. Can this local view
   determine whether fm4 might be affected? Find enough additional context to
   explain the limit, rather than concluding from absence.
4. Compare the d3-zoom screenshots in ego, RFC, radius-two, list/tree and matrix.
   Describe which makes sharing/direction clearest, what was hard to locate,
   and one investigation you would repeat with this representation.

For the product, pause motion if useful, select a node, and choose
**View → Exploration view → Radius two**. **Use selected node** adopts a newly
selected center. Choose incoming/outgoing traversal; use page controls, witness
lists, Enter pivot, Back and the details overlay as needed. On returning to the
graph, inspect whether its original context and selection remain intelligible.

For more than one participant, rotate which representation is shown first and
record the order. This narrow pilot identifies errors and needed changes; it is
not powered for a general superiority claim. If a facilitator helps or a package
is difficult to select, record the intervention rather than silently skipping it.

## Observation form

- Build / browser / viewport; informed or uncued; representation order:
- Familiarity and relevance to a repeated investigation:
- Task 1 answer, direction explanation, help/missteps, confidence:
- Task 2 answer, unique-vs-occurrence explanation, peer interpretation, paging/sharing problems:
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
