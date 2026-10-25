# Radius-two dependency-analysis evaluation

TODO **6.6**, 2026-10-25. This is a software correctness/cost comparison and an
analytical task walkthrough. **No participant has completed the maintainer pilot.**
The human usefulness question remains **6.7**, with its [protocol](PILOT.md).
[Open the five-view gallery](index.html).

## Application and public source

Application under test: [PR51](https://github.com/gregoryyy/freshmind/pull/51),
commit `e45c48a`, on the main baseline containing merged PRs 48–50. The
[evidence record](evidence.json) pins its full commit, production JS/CSS hashes,
Chrome/Node versions, viewport, raw timings and preservation checks. This report
is a separate PR directly against main; it does not require stacking branches.
Reproduction requires the built radius-two application, rather than the older
main application before PR51 is merged.

The input is this repository's public
[package-lock.json at 0657e40](https://github.com/gregoryyy/freshmind/blob/0657e40/package-lock.json),
retained [verbatim](package-lock.json). SHA-256:
`ac301d8fea3412c3c0365c9a2b84cb822a8ff16bea6a7b26c10bfa1de2ae3523`.
This is attributed public dependency metadata from the Freshmind project; package
code, archives and third-party source are not redistributed or executed here.

The fixture follows the root's declared runtime dependencies and their installed
dependency/peer targets. It excludes development-only roots, and keeps installation
paths as identities, versions, requirement ranges, package licence identifiers
and integrity strings. This pinned lockfile needs no registry access. The
[npm lockfile specification](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)
explains installed package entries; the
[package specification](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/)
distinguishes dependencies from peer requirements. The converter is scoped to
this pinned input; it is not a general dependency-provider adapter or an analysis
of actual runtime calls, vulnerability exposure, version compatibility or failure.

The [native graph](dependency.fm.yaml) contains **22 installed-package nodes and
38 declared relations: 32 dependencies and six peers**. Its package weight is the
FM default 1 and relation weight the FM default 10, with no dependency-strength
or domain-unit interpretation. The relation label is the source requirement range;
its type/metadata distinguishes peer from dependency.

## Correctness and task oracles

Literal expected answers are specified independently of the projection. The
[runner](../../../scripts/radius-two-evaluation.mjs) asserts exact identities,
14 induced edge IDs, peer retention, sharing witnesses and shortest-hop counts.
A deliberately dropped peer record must fail the edge oracle. These assertions
validate this small case, not arbitrary package-management semantics.

| Investigation | Center / traversal | Exact answer and interpretation |
|---|---|---|
| Which installed packages directly declare dependence on dispatch? | d3-dispatch / incoming | d3-drag, d3-transition and d3-zoom. Direction is consumer → requirement. |
| Which additional package is reached at the second incoming hop? | d3-dispatch / incoming | fm4, through d3-drag and d3-zoom: one canonical package, two witnesses. |
| Is color one dependency or two, and through whom? | d3-zoom / outgoing | One d3-color package through d3-interpolate and d3-transition. Overall: five direct packages, three unique second-hop packages, four occurrences. |
| Does absence imply the root is unaffected? | d3-color / incoming | No. fm4 is three hops away, outside this view; radius-two absence proves no global impact claim. |

All comparison pictures use the **d3-zoom outgoing neighborhood**: nine canonical
packages and fourteen induced relations. Ordinary ego node-link and RFC keep
exactly this visible source subgraph. Radius two derives that scope from the full
22-package graph, displays bounded occurrence pages, and retains additional
relation records. The simple list/tree and matrix are comparison prototypes built
from lockfile relations and the literal task scope, independently of projection
edge output. They are not additional product modes.

| Representation | Task information available | Remaining burden to test with a person |
|---|---|---|
| Ordinary ego node-link | All nine canonical packages and fourteen real links | Trace direction through crossings and inspect peer semantics. |
| RFC, ordinary one-level center | Same graph; five center neighbors reinforced | Read unreinforced second-hop structure and distinguish shared nodes. |
| Radius two | Ordered first-hop rows, direction, shared occurrences/witnesses and supplementary records | Discover paging; avoid treating occurrences as distinct packages or unseen pages as absence. |
| Simple list/tree plus relation list | Explicit paths, repeated color child, full fourteen-record list | Reconcile duplicate paths with canonical identity and inspect cross-links separately. |
| Matrix | Rows are sources, columns targets; all scoped records including peer | Match a shared target column and follow a second hop across rows. |

This is an information-availability analysis, not observed task accuracy or time.
All scoped semantic records survive every measured operation. Radius/list/matrix
inspection also preserves physical positions and force-view membership. Layout
baselines deliberately move positions; that is not information loss.

## Browser and projection costs

[Recorded cost table](costs.md) and [raw samples](evidence.json). One warm-up and
five measured operations per view, in one installed Chrome process at 1440×1000.
Each sample resets the same positions. Ego and RFC include 100 synchronous layout
batches; this is a fixed work allowance, **not convergence**. Radius two includes
snapshot capture, mounting and choosing outgoing traversal. List/tree and matrix
measure mounting their simpler comparison DOM. Two animation-frame callbacks
finish each observation; these are not continuous frame-rate or memory measures.

**The operations differ, so their times are not a speed ranking.** Layout work
and representation mounting must not be conflated. DOM counts include collapsed
subtrees; radius two shows only the first page (three of five direct rows in this
viewport), while list/matrix materialize this small neighborhood. Reported node
cards are occurrences currently mounted, not unique source-node totals.

Separate Node projection probes use 100, 300, 1,000 and 5,000 direct neighbors
sharing one second-hop package (twice as many relations as direct neighbors).
Five raw timing samples per size follow a warm-up, with exact counts asserted.
They measure projection only, not browser interaction, layout, full text payloads
or the 50,000-node work limit. Existing PR51 browser regressions cover bounded
paging of 300 direct neighbors and 100 extra parallel relations; no large-graph
usability claim follows from either check.

Limitations include one machine/process, fixed baseline order, JIT/GC and load
noise, no counterbalanced participants, no retrieval-quality judgments and no
continuous interaction or remote provider. Layout screenshots are raw fixed-work
setups without manual label separation; they do not establish a quality ranking.
The warm process retains solver/display caches: resetting positions and velocities
does not make this a force-state-matched numerical experiment.
The task that requires three hops remains deliberately outside the local view.

## Reproduce

Build a checkout containing PR51 (or its merged equivalent):

```sh
just check
just build-demo
```

From a checkout containing this evaluation runner, use that built application:

```sh
PLAYWRIGHT_CHANNEL=chrome just radius-two-evaluation /path/to/built/freshmind
```

After both PRs are merged, the same-checkout form is:

```sh
PLAYWRIGHT_CHANNEL=chrome just radius-two-evaluation
```

The recipe does not rebuild or alter the target checkout. It serves the existing
production build on loopback and launches Chrome, uses the local pinned Git blob,
and publishes the known generated files after a successful run. Nonempty output directories require
this evaluation's manifest format. The authored README and pilot protocol are
retained. Timings and browser hashes change when the environment/build changes.

**Next required evidence:** actual maintainer observations from [the pilot](PILOT.md).
The application adapter in **6.8** remains after that decision, rather than treating
this fixture-specific converter as the delivered adapter.
