# Control panel

**Controls** in the header hides or reopens the panel. Settings, open sections
and the panel's scroll position remain in the current session. Collapsing changes
the available viewport, retaining the graph and physical positions; normal
running layout can continue. On narrow screens the button remains outside the
panel. Quick search (`/`) reopens its field; graph-native Ctrl+F/Ctrl+Shift+F
query editing can keep the panel closed.

![RFC sliders and horizontal choices](control-panel/01-layout.png)

All numeric sidebar settings use sliders with live readouts, including result
count, topics, training passes, random seed, frequency and priors. Large magnitude
ranges use logarithmic scales. Integer arrow keys preserve exact increments;
the seed uses ordinary integer steps across its existing unsigned range.
Readouts use up to twelve significant digits; hovering shows the full scalar.
Moving a slider commits through the existing setting owner while dragging.

**Use custom limit** enables a semantic-distance override. Leaving it unchecked
retains the [retrieval engine's defaults](graph-search.md), rather than imposing
an empty or zero distance. Disabled search controls also disable their visible
slider/radio presentations.

Short single-choice settings use horizontal radio groups, wrapping as needed.
Long example/substructure inventories retain menus; multiple-type choices retain
native multiple-selection lists with Ctrl/Command for additive selection.
Radio arrow keys, slider arrow keys and Tab retain native control behavior and
explicit panel focus. Radio choices rejected by validation return to the
accepted setting, such as when an invalid label draft prevents a mode change.

![Local topic-model controls](control-panel/03-training.png)

The structural multiple-selection repair synchronizes options when settings or
the option inventory change. Motion repaint no longer rewrites a tentative native
selection between pointer-down/input and the change event. This applies to
aggregation and node/relation type filters, without changing graph membership
ownership or the existing filtering rules.

[Open the four-view production preview](control-panel/index.html). Regenerate it
with `just controls-showcase`; the weighted-tree graph is paused, separated with
the shipped readability command and framed for these views. This is an
interaction demonstration, not a numerical RFC comparison.

## Binding and verification

The optional `bindNumericSliders`, `bindChoiceRadios` and `bindPanelToggle`
bindings are composed by the main demo. Existing caller-owned numeric/select
controls carry scalar values and validation; visible controls forward changes
to their existing owners. They do not create a second configuration, graph or
retrieval authority. Numeric IDs remain available; visible slider IDs append
`-slider`. An unbounded numeric setting initially displays up to 100 and expands
to retain an already configured higher value; backend validation remains
separate from this presentation range. Direct library hosts retain their own UI.

Bindings track external configuration, graph replacement, choice inventories
and disabled state. Dispose before removing controls/panel: observers, listeners
and queued synchronization are released, original controls/labels are restored,
and retired sliders/radios stop issuing commands. Panel visibility is not written
to graph files, browser storage or a server. The search UI's optional
`showControls` callback lets its host reveal a retracted panel.

Browser checks cover scalar readouts and logarithmic mapping, integer increments,
optional/default limits, live dragging through repaint, radio keyboard movement,
dynamic RFC centers, narrow screens, viewport-only retraction, quick-search
reopening and disposal. The native structural click regression was also run
against the old synchronization code: it fails there and passes with the fix.
Invalid host drafts continue through the existing configuration validators;
ordinary range gestures cannot produce out-of-range drafts. These checks support
proposed INT-03/04/06 and ARC-04/07; they are not a general usability or assurance
conformance verdict.
