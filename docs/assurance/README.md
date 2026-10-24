# Assurance approach

Baseline version **0.1**, written **2026-10-24**. This is the author's current
interpretation of the requested system, prepared for review. It starts from a
**local-first graph browser that preserves information and can later support
server-based use**. It is not a description of the current implementation, a
completion report, or a claim that the requirements below have been verified.

Read the baseline in this order:

1. [System intent](01-intent.md): whose problem the browser solves and what
   successful use means.
2. [Usage constraints](02-usage-constraints.md): the conditions under which it
   must operate, including privacy, security, data preservation and limits.
3. [Architectural requirements](03-architecture.md): the responsibilities and
   boundaries needed to support that intent and those constraints.

The [delivery roadmap](../TODO.md), [implementation record](../DONE.md) and
[source module map](../../src/README.md) describe delivery and implementation.
They are evidence to examine against this baseline, not its specification.

## What we want to establish

An assurance argument connects **a claim → its assumptions → a check → the
observed evidence → remaining uncertainty**. For each feature, distinguish:

- **Purpose:** do we still agree on the problem and the intended behavior?
- **Conformance:** does the implementation satisfy that behavior and its
  architectural/security constraints?
- **Adequacy:** is the evidence strong enough for the consequences of failure?

Passing tests can support conformance to a specification. They cannot, by
themselves, establish that the specification reflects the user's purpose.
Likewise, deterministic tests can repeat the same mistake. Expected results
must be justified independently of the implementation under test.

## Preventing drift as the project evolves

Use stable requirement IDs (`INT-`, `USE-`, `ARC-`) from the three documents.
Treat their statements as proposed requirements until reviewed; distinguish
explicit user direction from derived interpretations and open decisions.
Existing behavior does not become a requirement merely because it is present.

For a change of purpose or constraint, record the old requirement, the new
requirement, the originating instruction/decision, rationale and affected
acceptance cases. Keep the old ID as superseded rather than silently reusing it
for a different meaning. A conversation can change direction; reconcile that
change into the baseline before using it as a new completion criterion.

Each task/PR should identify the requirement IDs it implements, its observable
acceptance cases and its assumptions. Surface changes to purpose, data handling,
architectural ownership or external dependencies explicitly. Routine internal
implementation choices can proceed within the recorded scope. Agreement on a
requirement is separate from evidence that it has been implemented.

## Finding what is missing

For each intended workflow, examine these questions before counting tests:

1. What must a person accomplish, and how can they recognize success?
2. What happens with empty, malformed, unfamiliar, very large or partially
   available data?
3. What happens after failure, cancellation, replacement, interruption, repeated
   commands and out-of-order completion?
4. What information enters, leaves, persists or reaches logs and development
   artifacts? Who is allowed to do each operation?
5. Which responsibilities, identities and architectural boundaries must remain
   intact?
6. Which assumptions change between a local browser and a future server-backed
   deployment?

Classify each uncovered point as a missing requirement, missing implementation,
missing evidence, accepted limitation or unresolved decision. An untested
requirement is not necessarily a bug; an unspecified behavior is not silently
accepted just because a test passes. Prioritize by failure consequence,
exposure, reversibility and how difficult the failure is to notice.

## Assurance proportional to risk

The following are proposed project categories, not certification levels or OWASP
ASVS levels. The same feature can contain requirements in several categories.

| Scope / failure consequence | Required form of evidence |
| --- | --- |
| Reversible presentation changes | Focused behavior checks, visual inspection, keyboard/input checks and an explicit user task. |
| Layout, lenses and navigation correctness | Invariants, independently calculated geometry/topology expectations, fixed seeds and boundary fixtures, interaction sequences, measured work/resource bounds. |
| Information loss, corrupt edits or stale asynchronous application | High assurance: canonical round trips, preservation properties, atomic rejection, fault injection and cancellation/replacement sequences, plus focused review. |
| Disclosure, execution of imported content or unauthorized server access | High assurance: data-flow/threat analysis, adversarial fixtures, network/storage observations and focused security review. Server authorization requires checks at the server boundary. |
| Architectural ownership and isolation | Baseline for every change: dependency checks and review of mutation ownership, lifecycle and side effects, with behavioral checks where static imports are insufficient. |

These categories apply even to apparently small changes. A label-edit command
can lose information; a renderer can load an external resource; a search adapter
can disclose a private corpus. Conversely, a purely cosmetic change need not
trigger every numerical or server test.

Use [NIST SSDF](https://csrc.nist.gov/projects/ssdf) as a reference for a
risk-based secure development process and applicable
[OWASP ASVS requirements](https://asvs.owasp.org/) for web security verification.
Record the exact version and applicable requirement IDs when adopting checks.
Neither reference establishes compliance, privacy or security for this project.

## Designing deterministic implementation checks

Determinism means that a recorded input, operation sequence and controlled
environment have an explicit, repeatable expected outcome. It does not require
byte-identical screenshots or floating-point output across all platforms.

| Claim / requirement IDs | Proposed deterministic check | Independent expectation and limits |
| --- | --- | --- |
| Preserve the complete graph (`INT-02`, `USE-03`, `ARC-01`) | Import → navigate/filter/layout/edit view → export → reimport; compare canonical records by stable IDs. Include isolated nodes, parallel edges, loops, Unicode, metadata and weights. | A hand-authored semantic fixture defines every record. Normalize only representation differences declared by the format; compare full membership, endpoints, values and multiplicity. Rendering is not an export oracle. |
| Reject invalid edits atomically (`INT-05`, `USE-04`, `ARC-02`) | Snapshot state, issue invalid commands and inject declared failures; compare the entire document and revision afterward. | Independently specified validity rules; no accepted mutation or false saved state on failure. Test edits concurrent with external changes as separate cases. |
| Views preserve semantics (`INT-03`, `ARC-03`, `ARC-04`) | Run a fixed view-operation sequence, including focal reinforcement, aggregation and pivot/history. Check source records and visible/hidden membership separately. | An explicit small adjacency table and visibility policy define the result; selected screenshots alone cannot establish completeness. |
| Geometry and layout respect contracts (`USE-06`, `ARC-05`) | Fixed graph/order, seed, initial coordinates, parameter set and integration-step budget; test transforms/inverses and protected nodes. | Analytic fixtures or an independent reference with declared numerical tolerances. Low motion does not prove force equilibrium, separation, readability or convergence on arbitrary graphs. |
| Retrieval stays within its role (`INT-06`, `ARC-06`) | Supply a deterministic fake search provider; verify query/result/provenance records and graph effects for fixed responses. | Provider contract and hand-authored expected records. Evaluate the real provider's relevance independently on judged queries; this check does not validate ranking quality. |
| Old work cannot affect a new document (`USE-07`, `ARC-07`) | Use a controlled scheduler and fake workers/transports; deliver replies out of order, after cancellation, replacement and disposal. | Only replies for the active source/revision/job may apply. Test lifecycle transitions rather than relying on wall-clock sleeps. |
| Local data stays local (`USE-01`, `USE-02`, `ARC-08`) | In a controlled production-browser run, observe/intercept network requests, storage and logs while importing, searching, editing and viewing hostile content. Use identifiable synthetic canaries. | An explicit request/storage allowlist and expected events; allowlisted requests must also have allowed payloads. Application assets are separate from graph-data transfer. This is bounded evidence for the tested paths, not proof against every leak. |
| Untrusted content remains data (`USE-05`, `ARC-09`) | Exercise script-like labels, unsafe annotations/URLs, malformed documents and limit violations in the real browser. | No execution, unexpected resource request or accepted partial document; declared size limits bound processing. Sanitizer round trips alone are insufficient. |
| Future server isolation (`USE-10`, `ARC-10`) | Contract tests with versioned fake storage plus server-side tests of denied reads/writes, partial responses, conflicts and failures. | Explicit authorization/version policy, with both allowed and denied cases. A fake or client-side test cannot establish real server authorization. |
| Distribution retains its notices (`USE-12`, `ARC-12`) | Inspect the actual packaged and browser-build artifacts for required license texts, notices and source/provenance material. | Compare texts with retained originals and a documented component inventory; a successful build alone is insufficient. |

Inject clocks, randomness and scheduling where they influence results. Record
runtime/browser versions, fonts/viewport where relevant, input ordering, fixtures,
settings, seeds, tolerances and operation budgets. Generated operation sequences
must retain failing seeds and reduce failures to small regression cases. Tolerances
and budgets need a reason; do not widen them just to make a failure pass.

Measure branch coverage to find unexercised paths and use targeted mutation or
negative controls to test whether assertions detect plausible faults. Review
surviving mutations: some are equivalent; others reveal missing checks. Coverage
percentages and test counts are supporting evidence, not completeness criteria.

## Evidence and release decisions

For each requirement, keep a row containing its source/status, assumptions,
failure consequence, verification method, test/artifact reference, exact commit
and build, result and unresolved limitations. Use statuses such as **not
assessed**, **evidence missing**, **passes in stated scope** or **fails**. Record
exceptions and their owner/reason; do not silently call them passes.

Check the assembled deliverable, including its configuration, dependencies and
integrated features. Passing isolated branches does not establish the behavior of
the version actually delivered. Replays with changed timeouts or execution modes
must be distinguished from a clean full run under the agreed release settings.

Use review independent of the implementation author for consequential claims;
review the requirement and oracle as well as the code. A second automated opinion
is additional evidence, not a substitute for independence or domain judgment.
Purpose and usability require user task evaluation. Real operating-system IME,
assistive technology and deployment behavior may need checks beyond a fully
deterministic harness. Report those limits explicitly.

## Initial assurance work still to do

This baseline creates **no implementation conformance verdict**. Next:

1. Review the intent, derived constraints and open decisions with the maintainer.
2. Map implementation and existing tests to the stable requirement IDs; identify
   absent behavior, weak oracles and uncovered boundaries.
3. Set supported workload/environment budgets and numerical acceptance criteria.
4. Add prioritized deterministic checks and independent review, then preserve
   reproducible evidence in the delivery workflow.
5. Revisit risk and requirements when network services, new data types or new
   capabilities change the system's trust boundaries.
