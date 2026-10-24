# Research community: RFC and hybrid showcase

The goal is a current, capability-equivalent demonstration of the [2005 paper's](literature/rfc@3ia05compact.pdf) focal and hybrid browsing tasks, with room to improve the implementation and interaction. The new synthetic research community provides single and multiple focal neighborhoods, shared membership, surrounding semantic relations and reversible detail reduction. Its six comparison views make those mechanisms directly accessible in the browser. Original-figure reproduction remains outside scope.

[Open the six-view flipbook](rfc-showcase/index.html) or [browse its screenshots and captions](rfc-showcase/README.md).

## Explore the working example

Run `just dev`, then choose **RFC → Research community showcase** under **Load example**. The built-in example opens with two foci if RFC is currently enabled, or the plain view if it is off. Loading its YAML through **Open YAML** instead retains the saved view and the browser's current RFC on/off choice.

Use **Apply comparison view** in Graph files:

| View | RFC centers | Viewing lens | Visible nodes / relations | What to inspect |
| --- | ---: | ---: | ---: | --- |
| Plain graph | 0 | 0 | 34 / 37 | The complete typed community and ordinary spring layout. |
| Viewing lens | 0 | 60 | 34 / 37 | Screen-space emphasis around Graph Atlas, independent of physical layout. |
| One RFC focus | 1 | 0 | 34 / 37 | Graph Atlas with five reinforced branches; context remains connected. |
| Two RFC foci | 2 | 0 | 34 / 37 | Graph Atlas and Topic Lens share the Semantic Methods group. |
| Hybrid aggregation | 2 | 0 | 18 / 21 | Sixteen remote leaf people/papers collapse into typed parent counts; focal detail and bridges remain explicit. |
| Hybrid + viewing lens | 2 | 60 | 18 / 21 | Reinforcement, reversible structural rules and a separate geometric viewing transform compose. |

Each choice restores the loaded file's starting positions, clears retained momentum/temporary locality mobility and restores the same initial canvas framing. Motion follows the normal pause/resume control. **Fit visible graph** changes canvas scaling/translation without moving physical points. The dropdown applies a setup; subsequent edits to the regular controls remain available.

Live browsing retains the general damping preference. The recorded fixed-batch showcase and its repeatability check disable extra general damping to retain their original comparison protocol; adaptive recovery otherwise uses elapsed time. Restoring a live showcase start clears learned damping without changing the preference.

Select a group and press **E**, or use **Reveal selected parent's leaves** in Structural focus + context, to recover its aggregated detail. The shared Semantic Methods group is part of both foci. Maya connects two groups, and two context papers are connected by a citation; these remain semantic bridges rather than becoming leaf aggregates. Other project collaboration, team and membership relations also remain present. Explicit node/relation type filters still take precedence, including inside a focus.

Use **Shift+Enter** to toggle other RFC centers or inspect the two stored focal definitions under Substructures. Edit labels, annotations or relation roles with the usual editors. Save YAML at any point: the complete 34-node/37-relation graph, extended type definitions, content and both stored memberships survive, including currently aggregated nodes. Structural rules and active RFC centers remain transient.

## Equivalence and current implementation

| Original capability | Current demonstration |
| --- | --- |
| Geometric focus + context | A standalone viewing-lens comparison leaves physical integration unchanged. |
| Recognizable reinforced local structure | One- and two-focus views use separate radial/angular forces and weighted coordinates. |
| Shared focal content | Semantic Methods belongs to both focal neighborhoods, with deduplicated display and shared-membership handling. |
| Focal-region/context separation | RFC comparison setups enable soft context and non-shared overlap exclusion, with visible region boundaries. |
| Lower-detail context | Typed leaf aggregation exposes counts without changing parent labels or deleting graph records; reveal restores detail. |
| Continued graph exploration | The example uses the normal navigation, filtering, editing and YAML operations. |

The current design also keeps reinforcement constraints separate from semantic relations, stores editable tree memberships, validates typed rules and protects source-based focal detail before aggregation. The comparison setup and file lifecycle are owned by the demo; library defaults and the native format are unchanged. A pending comparison cannot apply to a replacement graph. Loading an ordinary file preserves its saved lens/canvas settings.

This showcase demonstrates capability on one designed graph. The [matched hybrid experiment](experiments/rfc-hybrid/README.md) remains the separate numerical comparison on its original 13-node fixture. Showcase views use soft forces and point-based layout; body/label clearance, readability and general convergence are not guaranteed. Visual benefit should be assessed in the working browser and future evaluations.

## Data and reproduction

All projects, people, notes and relations are fictional. The [native graph](../examples/rfc/research-community.fm.yaml) contains six projects, three groups, seven people and eighteen papers. Team, member, project-content and project-collaboration types extend the existing configuration locally. Two saved stars have six members each and share one group.

```sh
just rfc-showcase-example  # Regenerate the native graph from its source.
just rfc-showcase          # Build and capture the six-view production walkthrough.
```

[The graph source](../scripts/rfc-showcase-example.mjs), [comparison controller](../demo/rfc-showcase.ts) and [tour](../scripts/flipbook/rfc-showcase.mjs) specify the example. Captures restore identical starts, advance 160 batches at rigidity 0.1, and fit each visible view separately. RFC setups use target length 160, coordinate weights `(0.25, 1)`, local experimental damping off and soft exclusion strength 1/padding 50. Each screenshot shows the actual browser with its controls and current counts. The default 21-step flipbook remains available through `just flipbook`.
