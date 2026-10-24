# 2. Usage constraints

Part of the [assurance baseline](README.md), version 0.1, 2026-10-24. These
constraints derive from the [system intent](01-intent.md), not from a survey of
the current implementation. They describe intended operating conditions and
safety/privacy properties; implementation conformance has not been assessed.

## Local operation and privacy

**USE-01 — Explicit data boundaries.** In local mode, opening a document, viewing
annotations, editing, layout, indexing and local retrieval must not transmit graph
content, labels, queries, metadata, derived indexes or embeddings. Remote
providers, synchronization, diagnostics and telemetry require an explicit,
understandable policy before activation: destination, data categories, purpose,
retention where known, and how to stop using the service. Choosing remote
persistence does not implicitly authorize an unrelated retrieval service.

Fetching the application itself is distinct from transferring document content.
Static hosting does not by itself make the application server-backed. External
links/resources can disclose data or browsing activity; render imported URLs as
data and require an explicit allowed action before fetching them. Do not load
tracking images or remote fonts specified by imported content automatically.

**USE-02 — Honest storage and confidentiality claims.** State what is only in
memory, what is durably saved and what remains in local storage, caches or
exports. A successful command is not proof of a durable save. User-requested
deletion/cleanup must cover application-controlled copies within its stated
scope. Browser eviction, device backups and copies outside application control
must not be described as securely erased. Encryption at rest, shared-device
protection and offline installation are open deployment choices, not implied
guarantees of the words “local-first”. Development fixtures, logs, screenshots
and review artifacts must also respect the data's permitted use.

## Information integrity and editing

**USE-03 — Lossless supported operations.** Preserve the complete supported
semantic document through view changes and supported persistence operations.
Distinguish isolated nodes, self-loops and parallel relations through stable
identity. Preserve direction, declared values, annotations and metadata according
to an explicit format contract. Unknown or unsupported information must be
preserved where supported or reported before a lossy operation is accepted;
silent dropping or coercion is unacceptable. Optional view state has a separate
declared persistence contract.

**USE-04 — Controlled changes and failures.** Validate imported documents and
edits before accepting them. A rejected operation must leave the prior document
intact; compound changes must not expose an accepted half-state. Warn before
discarding unsaved work, provide an explicit way to cancel a draft, and do not
silently replace a changed source with an older edit. Required undo/recovery
depth and crash-safe storage guarantees still need agreement.

## Untrusted inputs and bounded work

**USE-05 — Imported content is data.** Labels, annotations, metadata,
configuration, URLs, files and service responses are untrusted, even when loaded
locally. They must not execute script, inject application markup/commands, alter
security policy or access arbitrary device resources. Rich content needs an
explicit safe subset; a URL needs a declared protocol/action policy. Validate
structure, references, numeric values and configured size/depth limits before
expensive or stateful processing. Errors should be useful without leaking
sensitive document content into logs or services.

**USE-06 — Explicit readability and workload limits.** Node bodies and labels
have dimensions; point separation alone does not establish readable layout.
Support meaningful local views and make incomplete, aggregated or bounded
results visible. Pinned/actively edited/dragged objects need an explicit movement
policy. Configured limits must bound imports, expansion, layout, search and
rendering work; a limit is not permission to truncate saved information silently.
Use progress/cancellation or a clear rejection for expensive operations. Supported
graph sizes, label sizes, frame/interaction budgets, settling criteria and browser
targets remain to be measured and agreed. There is no promise of collision-free
layout for arbitrary or infeasible constraints.

**USE-07 — Predictable lifecycle and input ownership.** Cancellation, document
replacement and disposal must prevent old work from changing active state.
Long-running operations must not block basic input indefinitely. Explicit text
editing owns typing, selection and composition; graph commands must not consume
that input. Moving the pointer over a graph must not steal an explicitly focused
control. Repeated actions, multiple mounted views and resumed operations must not
duplicate commands or leak listeners, workers or timers.

**USE-08 — Accessible meaning.** Provide keyboard routes for core exploration
and editing tasks, visible focus, readable labels and non-color-only indications
of important state. Hover must not be the only route to relation meaning or
details. Announce errors and distinguish missing data from empty results.
The target accessibility standard, assistive technologies and touch/mobile
support are open acceptance decisions; their conformance is not asserted here.

## Retrieval and later server usage

**USE-09 — Bounded retrieval claims.** Identify query scope, provider, source
snapshot/version, score meaning, result limits and incomplete results. Preserve
the distinction between stored relations, retrieval associations and user
judgments. A similarity score is not automatically an edge weight or a probability
of truth. Query/result additions must not recursively pollute the source corpus
unless explicitly requested by a declared feature. Real-world relevance requires
judged queries and task evidence beyond deterministic adapter checks.

**USE-10 — Explicit server authority.** Before enabling a server-backed mode,
define authentication, authorization, document/tenant boundaries, transport
protection, storage/retention and revision/conflict policy. Enforce access control
at the server, including retrieval and background jobs; hiding controls in a
browser is insufficient. Handle unavailable services, denied operations, stale
versions and partial neighborhoods explicitly. Local edits and queued transfers
must not be silently lost or duplicated. Collaboration, conflict merging and
offline synchronization require separate specifications before being claimed.

## Evidence and distribution

**USE-11 — Reproducible, scoped claims.** Record input, configuration, seeds,
versions, operation budgets and numerical tolerances for deterministic checks.
Report failed and omitted cases. Quiet motion, a screenshot, a test count or a
synthetic retrieval example does not establish general correctness, usefulness
or performance. User-purpose evaluation and implementation verification need
separate evidence.

**USE-12 — Attribution travels with distribution.** Retain applicable license
texts, notices, source headers and source/data provenance in distributed
artifacts. Moving files must preserve their content and discoverability through
the root licensing index and packaging. No change of license or ownership follows
from reorganizing files. Third-party and imported-dataset terms remain distinct
from the application's own terms.

## Assumptions requiring review

The initial baseline assumes one person controls a local document, a supported
browser/device and an application obtained from a trusted distribution. It does
not assume that imported content is trustworthy. Hosting the application,
connecting a service, sharing a device or processing regulated/sensitive domain
data can change the risk assessment. Domain-specific validation and operational
policies need explicit requirements; a generic graph browser cannot supply them
by implication.
