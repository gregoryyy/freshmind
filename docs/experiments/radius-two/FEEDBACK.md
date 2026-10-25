# Initial maintainer feedback and revised direction

2026-10-25, conversation with the project maintainer. This is qualitative feedback
on the interaction concept and terminology, not a completed timed task session.

After an explanation of the package-node labels, the maintainer understood the
example but judged the UX unsatisfactory. The intended interaction was a graph
reinforced to radius two directly, without moving to another display. The
maintainer requested that the separate representation remain as a study, marked
experimental, and that an **r=2 tree RFC option** be added to the normal graph UI.

## Decision and implementation

- The primary interaction is **View → Reinforced neighborhood → r=2 tree** in the
  existing graph. It exposes the already implemented automatic two-level RFC
  tree. Its activation/removal controls and live status are visible alongside it.
- Existing graph selection, keyboard navigation, lenses, layout, editing and
  semantic edges retain their owners. Reinforcement operates on the visible
  locality; neighborhood depth and explicit filters remain separate controls.
- The neighbor-table display remains under **View → Experimental studies →
  Neighbor table (experimental)**, with an experimental heading while active.
  The detached projection, occurrence semantics, tests, example and historical
  comparisons are retained.
- This records a change in product direction rather than claiming the table is
  validated, or that a new force algorithm has been introduced.

## Evidence and next pilot

No task answers, completion times, error rates or comparative benefit were
reported. TODO **6.7 remains open**. The next session should prioritize the r=2
RFC graph workflow on the public dependency graph: discover and activate it,
interpret direction/sharing, pivot and return, and edit without losing place.
Check whether the separate visibility-depth control causes confusion or hides
expected grandchildren. The table may be compared explicitly as an experimental
condition if useful; it is no longer a required primary workflow.

The [original pilot tasks](PILOT.md) remain available with this revised emphasis.
The [software report](README.md) describes the earlier pinned implementation and
comparison costs; it does not supply the missing human evidence. Application
adapter decisions remain after task validation rather than being inferred from
this feedback alone.
