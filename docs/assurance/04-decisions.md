# Initial acceptance scope and decision record

TODO **7.3**, reviewed 2026-10-25. Read alongside the [baseline](README.md).
This records requirements and acceptance boundaries, not implementation success.
The maintainer explicitly accepted the proposed initial scope in conversation:
desktop browser, single-user local files, explicit save/export, no promised
autosave or crash recovery, no telemetry or remote graph transfer, and no
graph-size guarantee beyond measured fixtures.

## Decisions

| ID | Decision and source | Acceptance consequence |
| --- | --- | --- |
| DEC-01 | **Accepted:** one person works on a local graph in a desktop browser. Maintainer's scope answer, 2026-10-25. | Test the desktop local workflow. Report touch/mobile, assistive-technology and other-browser coverage separately; desktop scope does not waive keyboard or text-focus requirements. |
| DEC-02 | **Accepted:** save/export is explicit. Autosave and crash recovery are not promised initially. Same answer. | An edit changes memory. Download initiation is not durable-storage confirmation. Test cancel/rejection and file round trips. Undo remains a separate milestone. |
| DEC-03 | **Accepted:** no telemetry or remote graph transfer in the local workflow. Same answer and original local-preservation instruction. | Check network, storage and logging with synthetic canaries. Application assets are distinct from graph data. Imported resources must not load themselves; external links need a declared action policy. |
| DEC-04 | **Accepted:** no general size guarantee beyond measured fixtures. Same answer. | Retain fixture sizes, environment, budgets and limits with evidence. This does not permit silent truncation or unbounded input processing; unmeasured cases remain unassessed. |
| DEC-05 | **Explicit direction:** elasticlunr and FM2014-style LDA; embeddings deferred. Earlier maintainer instructions. | INT-06 / ARC-06 retain algorithm-independent intent. Corrected legacy defects and scoped numerical checks remain explicit. |
| DEC-06 | **Explicit direction:** reinforce radius two in the ordinary graph; retain the neighbor table as experimental. Maintainer direction delivered in PR54. | The table's software evaluation is not validation of the preferred interaction. The dependency-impact pilot remains pending under TODO6.7. |
| DEC-07 | **Explicit direction:** local-first browser, possible later server use. Original assurance instruction. | No initial server acceptance claim. Specify authority, remote storage, synchronization and retention before enabling that mode. USE-10 / ARC-10 remain future requirements. |

## Requirement source and review status

The baseline's INT, USE and ARC IDs are unchanged. The graph-browser purpose,
local preservation, future server direction, independent IR ownership and
clarified interactions have explicit maintainer sources. Their detailed
formulations, atomicity/security rules and logical architecture are derived
interpretations. Scope acceptance does **not** claim line-by-line approval of
every derived statement or implementation conformance. Retain that distinction
in traceability and surface contradictions.

This resolves operating scope without weakening USE-03/04 (preservation and
validation), USE-05 (untrusted content), USE-07 (lifecycle) or ARC-11 (boundaries).
A missing implementation remains a gap rather than an accepted limitation merely
because it already exists.

## Evidence boundaries and remaining decisions

- Chrome is the currently available browser-check environment, an implementation
  observation rather than a requirement excluding other browsers. Record its
  actual version per run. Broader browser/accessibility claims need scoped evidence.
- No numerical node limit, interaction-time target, minimum hardware or universal
  readability/convergence claim is approved. Experiment sizes are evidence points,
  not product maxima. Set explicit limits before expanding claims.
- Persistent caches, autosave, encryption, secure deletion and shared-device
  protection need a decision before being offered as guarantees. Graph/model
  exports are user-controlled files subject to device policies.
- Undo coverage/retention remains milestone8. Explicit save does not settle it.
- A real dependency-impact task session remains necessary for application
  adequacy; architectural possibilities do not establish a useful adapter.

## Changes of direction

Keep DEC IDs stable. Add a dated decision with its source, superseded IDs,
rationale and affected checks/claims. Do not rewrite old evidence to imply it
tested the new scope. Autosave changes recovery/durability acceptance; a remote
provider changes data boundaries even if the UI looks identical.
