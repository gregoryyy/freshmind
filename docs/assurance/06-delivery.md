# Assembled delivery evidence and independent review

TODO **7.6**. Automated delivery infrastructure is implemented; independent review
of the final integrated candidate remains pending. Passing this workflow does
not complete that review or the dependency-impact human pilot.

## Reproduce the assembled candidate

After `just install`, run `just assurance-delivery`. Use an installed Chrome via
`PLAYWRIGHT_CHANNEL=chrome`, or install the Playwright Chromium matching the
lockfile. A JDK and `tar` are required. An optional output-directory argument
must name a new directory outside the checkout. The runner records:

- Exact checked-out commit, working-tree status, all tracked/non-ignored input
  hashes, lockfile, Node/npm/Java versions and platform. A dirty worktree is
  explicit; a commit name alone does not identify its inputs.
- Strict type checks, library/core checks and the pinned Java reference.
- Two fresh library and production-demo output builds in the same installed
  environment, plus two `npm pack --ignore-scripts` archives. Compare every
  output path, byte count and SHA-256; compare package bytes and original
  packaged LICENSE/NOTICE texts. A missing/added/same-length-changed file fails.
- A smoke check of the actual production bundle: local import, emitted literal
  worker and explicit export retaining original/isolated records and zero weight.
  No `/src` module may substitute for the delivered code.
- The complete ordinary browser suite after all builds finish. If present in the
  checkout, the traceability validator, fault-sensitivity experiment and separate
  production-canary suite also run. Capability flags explicitly identify absent
  increments; absence is not evidence that a requirement passed. PR55–57 supply
  these separately reviewed increments before full integration assessment.
- Command logs/digests, original/mutated hashes where applicable, browser versions,
  per-file artifact inventories, repeated-build results and failed checks. Check
  input/build hashes again after consumers finish to detect changes during a run.

All operations are sequential: no rebuild clears files a browser is consuming.
Evidence is written outside the checkout, so it cannot recursively change the
input/package being measured. `evidence.json` defaults to **review pending**.
Two matching rebuilds establish repeatability in that environment, not hermetic
or cross-machine reproducibility. Hosted runner images and Node24 patch versions
can change; each run records actual versions rather than pretending they are
fixed. File hashes establish identity, not correctness or supply-chain trust.

## CI and distribution boundary

The [GitHub workflow](../../.github/workflows/assurance.yml) runs for PRs, main
pushes and manual dispatch, with read-only contents permission, no persisted
checkout credentials, pinned official action commits and lockfile installation.
It uploads evidence/logs/packages for 14 days, including failed-run evidence when
available. Only public/synthetic repository fixtures belong in these jobs;
private imported graphs, credentials and developer storage do not. Installation
uses the package registry/browser distribution and is distinct from application
runtime privacy. CI calls the same underlying scripts as the `just` recipes;
the documented local workflow remains `just`.

The read-only token and action pins follow GitHub's
[workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)
and [secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use).
These controls do not audit dependencies or certify the hosted runner.

## Independent review protocol

An implementation agent cannot independently approve its own reasoning. Before
declaring a consequential change accepted, a separate person must inspect the
exact final candidate and retained evidence:

1. Compare purpose and acceptance examples with the requirement source/decision
   record; identify any silently changed meaning or accepted assumption.
2. Review canonical-data mutation, rejection/recovery, source/async ownership,
   privacy/trust boundaries and architectural dependencies relevant to the change.
3. Check that independent expected outcomes would reject plausible incorrect
   implementations; examine fault/coverage gaps instead of counting tests.
4. Inspect actual assembled artifacts and failed/omitted cases. Assess user-task
   usefulness separately; browser automation cannot supply participant evidence.
5. Record reviewer identity/role, candidate commit and input/artifact digests,
   requirements reviewed, outcome, findings, accepted limitations and required
   retests in the PR. An approval of an older commit does not review later changes.

The PR template requests that record. It is a process requirement, **not a claim
that GitHub currently enforces it**. Read-only inspection on 2026-10-25 found
`main` unprotected. This change does not silently modify repository settings or
invent a reviewer. A maintainer can later enable required checks and reviews
under an agreed reviewer policy; a GitHub approval alone is not the assurance
argument. Review by the maintainer of AI implementation may be recorded in the
conversation/PR even when GitHub disallows approving a PR created under the same
account; the evidence record must state who actually did the review.

## Remaining acceptance boundary

Keep 7.6 open until the integrated evidence has been reviewed independently.
No `milestone7` completion tag is justified yet. Broader browser/device support,
graph-size budgets, threat review, relevance/usability, crash recovery and future
server authorization remain separately scoped decisions/evidence. Historical
experiments keep their own inputs and claims.
