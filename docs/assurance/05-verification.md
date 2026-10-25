# Prioritized deterministic verification

TODO **7.5**. The initial scope is the desktop, single-user local-file workflow
accepted by the maintainer on 2026-10-25. Requirements remain in the [baseline](README.md).
These checks provide bounded evidence, not a system conformance verdict.

## Consequential paths and independent expectations

| Check | Requirements | Independent expectation and controlled effects |
| --- | --- | --- |
| ASSURE-01: composed view/save preservation | INT-02, USE-03, ARC-01/03/04 | A literal semantic document specifies Unicode, isolated membership, loop and parallel records, zero weight, annotations and nested metadata. Install → radius-zero locality → RFC → lenses/pan → one layout step → complete capture → YAML → reopen preserves those records. Presentation fields are excluded explicitly, not silently normalized away. Initial coordinates are fixed and distinct; adaptive clock effects are disabled for the one checked step, whose movement is asserted. Layout is otherwise stopped and animation drained. |
| ASSURE-02: rejected edits | INT-05, USE-04, ARC-02/09 | Drafts with changed labels and invalid later weights, lengths, endpoints or metadata must throw without changing any native record or incidence. Both entire records and adjacency are compared. |
| ASSURE-03: already-queued worker callbacks | USE-07, ARC-07 | Save actual handler functions before cancellation, supersede the job, then deliver old progress/success/error callbacks directly. No stale progress, premature completion or termination of the new worker is allowed. No timer sleeps. |
| ASSURE-04: deferred model reads | USE-07, ARC-06/07 | A controlled promise resolves an old model read after a newer seeded model is accepted. The old promise rejects and the newer model remains exact. Seeds, corpus and iteration counts are literal fixtures. |
| ASSURE-05: assembled local data handling | INT-02/05/06/07, USE-01/02/03/05/07, ARC-06/08/09/12 | A synthetic canary passes through real file import, hostile annotation display, accepted overlay edit, lexical worker, seeded LDA training/search, graph/model downloads and invalid replacement. A separately written static-asset request allowlist rejects graph/query data in URLs, bodies or headers and unexpected origins/routes/methods. Inspect console, WebSockets, storage calls, local/session storage, IndexedDB, caches and service-worker registrations. Check retained source records in the downloaded file. |
| ASSURE-06: privacy observer sensitivity | USE-01, ARC-08 | Deliberately attempt same-origin GET and external POST canary transfers. Both must be observed and blocked; neither reaches an external service. This validates the observer rather than assuming a quiet log proves observation worked. |

The production browser checks live separately from the development-server suite.
They load only the already built distribution, never `/src` modules. The ordinary
suite remains necessary for detailed interaction regressions. Canary data is
fictional and intentionally appears in explicit user exports; such exports are
not network leaks. Blocking a request still fails ASSURE-05: an attempted leak is
a failure even when the harness prevents its delivery.

## Fault sensitivity and coverage

Run `just assurance-sensitivity` after the library build, or pass an output path.
The runner makes disposable copies of the compiled library and critical tests;
it never edits repository source or live build files. The unmodified baseline
must pass before three specified faults are introduced separately:

1. Mutate the live node label before validating the rest of the edit (ASSURE-02).
2. Remove active-worker ownership guards (ASSURE-03).
3. Remove the model-read generation guard (ASSURE-04).

Each fault must fail its intended assertion. Syntax/import/time-out failures do
not count as detected faults. Retain original/mutated file hashes, test hash,
runtime, base commit and the scoped V8 coverage report. A changed mutation site
fails explicitly and requires experiment review. The recorded [checkpoint](evidence/7.5-sensitivity.json)
detects **3/3 specified faults**, with four baseline scenarios passing.

For those four new scenarios alone, compiled commands/session/worker-client line
coverage is **62.22% / 56.18% / 82.93%** and branch coverage is
**52.17% / 71.43% / 75.00%**. The existing suites exercise additional paths;
these figures are not whole-project coverage or an acceptance threshold.
Uncovered positive label/reconnection, training/index/search and transport-error
branches point to the existing label, persistence, IR and structural-edit suites;
their existence does not establish equivalent fault sensitivity. Expanding those
negative controls remains a follow-up, prioritized by consequence.

## Reproduction and evidence limits

Use `just check`, `just assurance-sensitivity` and
`PLAYWRIGHT_CHANNEL=chrome just test-assurance-browser` sequentially. Browser
tests require a free local port (`PLAYWRIGHT_PORT`, default 4189), a production
build and an installed browser. Never build or edit source while a browser run
is consuming the distribution. The browser attaches `local-effects.json` with
actual browser version, observed requests, storage and limitations. The retained [browser checkpoint](evidence/7.5-browser.json) identifies both passed scenarios and input hashes.

No general graph-size, latency, settling, relevance, accessibility, crash
recovery or server-security claim follows. The fixture has three original nodes
and three original relations. It does not cover extensions, OS/browser services,
all exfiltration channels, every input sequence or all persistence metadata.
Global parser/resource-limit assessment, wider interleavings, additional
security review, undo and actual user-task adequacy remain gaps. These limits
must travel with the results; a test count or partial coverage total is not proof.
