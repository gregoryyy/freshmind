# FM 2014 keyboard editing comparison

Reviewed **2026-10-24**, against main commit
`3b316c645bb2d2cef399d9485cbb43fc7ea73544`. The comparison tables below preserve
that snapshot; they are not a statement that every recorded gap is still open.

**Follow-up implemented in this PR:** selected-item deletion now has relation
precedence and works from graph-root and item focus. Query nodes can be deleted
while browsing; other structural deletion retains the Edit-mode gate. Ctrl+D,
Ctrl+Backspace/Ctrl+Delete and plain Backspace/Delete are graph-scoped aliases;
text inputs retain native deletion. Ctrl+F/Ctrl+Shift+F now creates a lexical/LDA
node **before** retrieval, with moving query entry, Enter submission and
F2/Ctrl+Enter editing/rerun. See [the current workflow](graph-search.md) and the
[implementation/verification record](DONE.md). The maintainer's clarification
supplies the Ctrl+Backspace/Delete aliases; the supplied Java key handler lists
Ctrl+D and plain Delete. Creation/linking/clipboard gaps remain in TODO 2.6.

## Sources and scope

Reference root: `../knowceans/knowceans-freshmind-2014/`, relative to this project.
Read `keys.txt`, `src/org/knowceans/freshmind/keyboard/FreshKeys.java`,
`FreshCommands.java`, `FreshmindBrowser.java`, `TransferableTGPanel.java` and
`io/ClipboardHandler.java` / `io/ATransferHandler.java`; the search follow-up also
traces `ir/search/NodeQueryAdapter.java`. The reference was not
changed. Java findings below are source traces, not a new Java GUI execution.

The port comparison follows [the dispatcher](../src/fm/navigate/controller.ts),
[DOM routing](../src/fm/browser/navigation.ts),
[inherited node handling](../src/tg/browser/panel.ts),
[application actions](../demo/main.ts),
[the selection editor](../demo/selection-editor.ts),
[file commands](../demo/file-controls.ts) and [label commands](../src/fm/edit/commands.ts).
The [user key map](KEYMAP.md) lists available actions; it is not a parity checklist.

Reference SHA-256 identifiers (raw file bytes):

| File | SHA-256 |
| --- | --- |
| `keys.txt` | `7ab33a796b0f6ac858a700e6044bfb569ddc39e6658ade0c3e0bc3caaebd0e09` |
| `keyboard/FreshKeys.java` | `a4812fbb79f59ca0f883b6e51f9912ccffa2f11f3d5232df0d279e6d86deb349` |
| `FreshCommands.java` | `e11427ea99f05d15f9e712e34d670b5854db5c85a4296194a8039e18dcd43e08` |

## Editing commands at the audited commit

Ctrl means **Control**, including on macOS. Command is additionally accepted for
file operations and editor commits; it is not a general graph-command alias.

| Original binding | Reference behavior | Current behavior / finding |
| --- | --- | --- |
| Ctrl+N / Ctrl+Insert | Add a linked node, select it, open its label editor. | **Missing.** Add node creates an isolated node through a button; background double-click also creates an isolated node in Edit mode. Neither restores this keyboard workflow. |
| Ctrl+M | Add a linked node with the reverse relation direction. | **Missing.** |
| Ctrl+Shift+N / Ctrl+Shift+Insert, Ctrl+Shift+M | Add from the selected node's sole incident relation's other endpoint; reverse variant for M. Requires exactly one incident edge. | **Missing.** The legacy condition is one edge, not one distinct neighbor or one parent. |
| Ctrl+L | Link the selected node to the graph center. | **Missing.** Shift-click in Edit mode connects the selected source to the clicked target; it uses a different target and requires the mouse. |
| Ctrl+C | Copy selected node's unary data via platform clipboard. | **Missing as a graph operation.** Native text copying is retained. |
| Ctrl+V | Paste a distinct node with copied unary data and a new relation from the selection; also accepts external content. | **Missing as a graph operation.** Native editor paste is retained. |
| Ctrl+B | Link the selected node to the copied node, reusing its identity. | **Missing.** Distinct from pasting a clone. |
| Ctrl+D / Delete | Delete the selected edge preferentially, otherwise the selected node. | **Ctrl+D missing; Delete incomplete and inconsistent.** Delete/Backspace reaches an inherited node-only handler in Edit mode. Edge selection is not handled. See the destructive targeting case below. |
| Ctrl+Enter / F2 | Edit selected edge label preferentially, otherwise selected node label. | **Implemented.** On-demand inline overlay or moving in-place label component, according to the configured mode. |
| Ctrl+Space | Edit node hint. | **Implemented with the requested adaptation:** full details overlay. Shift+F2 is an additional binding. |
| Ctrl+G / Ctrl+H | Change selected node weight immediately by 0.1, edge weight by 1. | **Changed:** modify a draft, with minimum zero; Save/commit applies it, Escape cancels. In-place labels also commit on blur. This matches the current editing design rather than Java's immediate mutation. |
| Label suffix `=number` | Weight as part of the legacy formatting syntax. | **Implemented numeric subset**, removed on save. Other legacy `~type` and shape/stroke/color suffixes are not parsed as commands; use explicit fields/YAML. |
| R | Reverse selected edge. | **Implemented** through the validated relation editor command. |
| Escape / U | Clear selected edge. | **Escape implemented**, with additional candidate cancellation/node deselection stages. **U missing.** |
| Ctrl+J | Set the first node used on reopening the graph. | **Missing.** Saved YAML view focus is a different persistence mechanism, not this command. |
| Ctrl+A | New graph/model. | **Missing.** Do not mistake native Select All for graph creation. |
| Ctrl+O / Ctrl+S / Ctrl+Shift+S | Open / save / save as. | **Adapted:** open local YAML, download YAML / choose a download filename. Command aliases also work. Save exports committed values, not editor drafts. |
| Ctrl+Q | Described as quit without saving. | **Inactive in Java:** the exit call is commented out. No browser equivalent is required to reproduce that active implementation. |

### Reproduced defect at the audited commit: Delete used DOM focus

On a two-node graph `a → b` with relation `ab`, in **Edit mode**:

1. Select relation `ab` and focus its SVG group.
2. Press **Tab**. Focus moves to node `a`; the selected item remains `ab`.
3. Press **Delete**. Node `a` and relation `ab` disappear; only `b` remains.

This was reproduced with real Tab/Delete input in Chrome **155.0.8059.85**, with
no page errors. It differs from both Java's selected-edge precedence and the
port's label/reversal commands, which operate on committed selection. Merely
focusing the graph root or the selected edge and pressing Delete does nothing.

The cause spans two owners: `FreshmindNavigation.handleKey()` does not handle
deletion, so the event can reach `TGPanel.handleNodeKeyDown(event, node)`, which
deletes the DOM-focused node. Tab deliberately changes focus without selecting.
This needs a Freshmind selected-item command and interception at its DOM adapter;
changing the plain TouchGraph behavior globally would affect another API.

| Mode | DOM target | Selected item | Delete outcome observed |
| --- | --- | --- | --- |
| Navigate | Graph root / node / relation | Node / relation | No deletion. |
| Edit | Graph root | Node | No deletion. |
| Edit | Selected node | Node | Node and its incident relations removed. |
| Edit | Selected relation | Relation | No deletion. |
| Edit | Node reached by Tab | Relation | Focused node and its incident relations removed. |

## Reference details that need an explicit port decision

`keys.txt` is cumulative documentation, not a consistent final specification:

- Its early child/parent descriptions mention `[new child]` / `[child of]`.
  Later `FreshCommands.addNode(false/true)` passes `[new]` / `[new parent]` and
  an empty relation label. `FreshmindBrowser.addNode()` supplies `sub` / `super`.
  Its actual endpoint order is **new → selected** for Ctrl+N (`sub`), and
  **selected → new** for Ctrl+M (`super`). Decide the intended child/parent
  convention before implementing and test endpoint IDs explicitly.
- Ctrl+L's actual call uses selected → center with label `[child of]`.
  Ctrl+B is the later copy/link alternative, not the same operation.
- Clipboard linking delegates to `importNode()`, which attempts `addNode()`
  even for an existing copied node before adding the edge. That path may reject
  a duplicate ID; source wiring is not proof it succeeds in the Java GUI.
  Preserve the reuse-versus-clone intent without copying that defect.
- Copy/paste requires a local graph payload contract: fields retained, fresh IDs
  for clones, source identity/revision for links, and no unexpected external
  clipboard reads. No graph clipboard implementation currently exists to verify.

## Other shortcut differences encountered

| Original binding / behavior | Current state |
| --- | --- |
| Arrows, Shift+arrows, Enter/Space | Implemented navigation/preselection. Perpendicular arrows cycle; pressing Shift alone does not rotate candidates as the old help describes. |
| E / K / H, 0–6, B, N | Implemented expansion/collapse/hiding, radius, backlinks and centering policy. Java N also falls through into centering; the port toggles the setting only. |
| Z / X | Separate normal/fast center shortcuts missing; Enter provides centering. |
| O / P | Lens-strength aliases missing; Ctrl+Shift+left/right provides the current controls. |
| Ctrl arrows, Alt arrows, Ctrl+Alt arrows, Ctrl+Shift arrows, +/− | Current spacing/lens/canvas mappings intentionally differ; [the key map](KEYMAP.md) records them. Retain the user's later Shift+Option/Alt rotation/zoom direction. |
| C | Implemented edge-form cycling. W is a port alias; Java W toggles cluster tags. |
| M / T | Layout pause / control-panel toggle shortcuts missing; motion has a button. |
| Alt+R / Alt+Shift+R | Java RFC activation/undo shortcuts absent; current RFC controls and Enter/Shift+Enter provide different activation/center operations. |
| Alt+Shift+S | Java handler dispatches SVG export with Shift; `keys.txt` says Alt+S. No current SVG export shortcut. |
| /, Ctrl+F/R/I and shifted variants | Bindings were present, but Ctrl+F/Ctrl+Shift+F only focused side-pane fields; a query node appeared after successful retrieval. The Java shortcut created the node first, and accepting its label ran retrieval. This graph-entry gap is repaired in the follow-up above. See [retrieval parity](fm2014-retrieval-parity.md) for backend/metric limits. |
| Q, D, Ctrl+Shift+D, Alt+Shift+F | Legacy query/similarity visibility/removal shortcuts absent. The current search UI has scoped rejection controls, not the same command set. Java Alt+Shift+F also falls through to undo RFC. |
| Ctrl+W / Ctrl+Shift+W / Ctrl+E | Legacy clustering shortcuts absent; current clustering controls implement different algorithms. |

These differences are classified here; this audit does not adopt every old
binding as a requirement or silently change the requested modern mappings.

## Verification and remaining work

`just build` passed. **26 headless navigation tests** and **33 Chrome tests**
passed across `editor-shortcuts`, `editing-io`, `navigation`, `hover-keyboard`
and `label-editing-mode`, using two workers and a 60-second per-test budget.
The tests establish their stated paths; they do not establish editing parity.

A separate controlled browser probe used two synthetic nodes and one relation.
Twelve legacy chords (Ctrl+N/Insert/M, Ctrl+Shift+N/M, Ctrl+L/A/C/V/B/D/J)
were unhandled (`defaultPrevented === false`) with unchanged membership and
selection. Those probes dispatched cancelable DOM events to inspect application
routing; they do **not** establish what each operating system/browser does with
native reserved chords. The deletion table was probed separately, and the
Tab/Delete failure was additionally confirmed with real keyboard input.

The audit proposed these priorities under **2.6** in [TODO.md](TODO.md).
The first is now implemented; the remaining structural commands are still open:

1. Selected-item deletion, edge precedence and consistent routing, including
   graph-root focus, Tab focus, empty graphs, in-place editors and IME. Preserve
   text deletion and plain TouchGraph behavior. Decide whether Navigate mode
   permits structural mutations or retains the current Edit-mode gate.
2. Atomic linked-node creation and sibling creation, with independently specified
   endpoint/default-label expectations, stable IDs, ambiguity rejection and
   immediate label editing. Decide native reserved-key fallbacks explicitly.
3. Linking and clipboard clone/reuse semantics, then new-document and initial
   focus commands with explicit unsaved-work handling.

For each restored command, verify complete graph membership and adjacency after
success, complete preservation after rejection/cancellation, and the same
selection policy from mouse, graph focus and keyboard traversal. Tests should
derive expected records from small fixtures and the agreed intent, not merely
assert the implementation's own command return value. This is scoped gap
evidence for proposed assurance requirements `INT-05`, `USE-03`, `USE-04`,
`USE-07`, `ARC-02` and `ARC-07`, not general conformance evidence.
