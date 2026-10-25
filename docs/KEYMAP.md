# Freshmind 4 key map

Adapted from the Java reference's `keys.txt` (2003–2012) and checked against the implemented port. Open **Key map**, press **?** with the graph focused, or press **F1** for the same reference in the browser.

Point at the graph to give its centered node keyboard control without a click when page focus is passive. Explicit side-pane controls and editors retain focus; click or Tab into the graph to leave them. Arrow navigation then follows the selected node as usual. Text editors keep normal typing, caret movement and clipboard shortcuts. Ctrl means Control, including on macOS; Option is the Alt modifier. File and editor commit shortcuts also accept Command. Editing and file controls below apply to the main graph browser; the palette page supplies navigation/view/help.

## Navigation

| Key or gesture | Action |
| --- | --- |
| Arrow keys | Select a neighbor in that direction; several neighbors start preselection. |
| Shift + arrows | Preselect relations rather than nodes, including parallel/incoming relations. |
| Perpendicular arrows | Cycle ambiguous candidates; the original direction or Enter/Space confirms, the opposite cancels. |
| Enter | Confirm candidates, otherwise center selection. Repeat on the center to replace all enabled RFC centers with this node. N chooses whether centering changes the neighborhood. |
| Shift + Enter | Toggle the selected node's RFC center, keeping other centers and the visible neighborhood. |
| Space | Confirm candidates, otherwise show/hide the node content popup or relation details. |
| Escape | Cancel candidates, then clear a selected relation back to its anchor, then clear node selection. |
| E / K / H | Expand / collapse / hide the selected node. |
| 0–6 | Set neighborhood radius in graph hops. |
| B / N | Toggle backlinks / whether centering changes the neighborhood. |

## View

| Key or gesture | Action |
| --- | --- |
| Ctrl + Shift + ↑ / ↓ (also Ctrl + ↑ / ↓) | Increase/decrease graph spacing; object sizes remain fixed. |
| Ctrl + Shift + ← / → | Decrease/increase focus + context strength. |
| Shift + Option/Alt + ↑ / ↓ | Increase/decrease canvas zoom around the viewport center. |
| Shift + Option/Alt + ← / → | Rotate the view counterclockwise/clockwise by 5°, keeping labels upright. |
| Ctrl + Shift + 1 | Reset canvas zoom to 100%, keeping the viewport center. |
| + / − (also =) | Additional canvas zoom controls. |
| C / W | Cycle default edge forms: Spider → Lens midpoint → Straight. Explicit relation overrides are preserved. C matches FM2014. |

## Pointer

| Key or gesture | Action |
| --- | --- |
| Vertical scroll | Increase/decrease graph spacing, keeping labels and shapes the same size. |
| Pointer over graph | Resume keyboard control at the centered node without a click when page focus is passive. Explicit side-pane controls and editors retain focus; click or Tab into the graph to leave them. |
| Pinch / Ctrl + wheel | Scale the complete canvas around the pointer. |
| Horizontal two-finger scroll | Adjust focus + context. Diagonal wheel events use their dominant axis. |
| Drag node / background | Move a node through the viewing lenses / pan the canvas. |
| Double-click node | Select and center it, using the same neighborhood option as Enter. Repeat on the center to replace all enabled RFC centers with this node. |
| Shift + double-click node | Toggle the node's RFC center, keeping other centers and the visible neighborhood. |

## Editing

| Key or gesture | Action |
| --- | --- |
| F2 / Ctrl + Enter | Edit the selected node/relation label; on a search query, reopen its in-graph query input. |
| Ctrl + Space / Shift + F2 | Edit node details in the overlay. Ctrl+Space also opens it from the content popup. |
| Ctrl + G / Ctrl + H | Increase/decrease draft weight: node steps 0.1, relation steps 1, minimum 0. Save applies it; Escape cancels. |
| Label suffix: =number | Set absolute node/relation weight when saving, e.g. Topic =3. The numeric command is removed from the stored label. |
| Escape / Space in node content | Close the content popup and return focus to the graph; links and controls retain normal activation. |
| Ctrl/Cmd + Enter | Commit the current editor. Enter also commits a single-line relation edit. |
| Escape in an editor | Cancel the draft and return focus to the graph. In-place labels save valid changes on blur; overlays retain drafts. |
| Edit mode: Ctrl + N / Ctrl + Insert; Ctrl + M | Create new → selected (sub, [new]) / selected → new (super, [new parent]) and edit its label. Use the New → selected / Selected → new buttons when the browser reserves a chord. |
| Edit mode: Ctrl + Shift + N / Ctrl + Shift + Insert; Ctrl + Shift + M | Create at the sole incident edge's other endpoint. Reject ambiguous complete-graph incidence. Sibling buttons are keyboard-accessible fallbacks. |
| Edit mode: Ctrl + L | Link selected → focused center, labeled [child of]. The Link to center button avoids the browser address-bar shortcut. |
| Ctrl + C; Edit mode: Ctrl + V / Ctrl + B | Copy a content-node snapshot locally; paste a fresh-ID clone / link the original node in the same live document. Native text editing is preserved. Buttons provide fallbacks; the system clipboard is never accessed. |
| Edit mode: Ctrl + J | Use the selected node when reopening a saved graph, independently of the last view. The reopening-focus button avoids the browser downloads shortcut. |
| U | Clear relation selection, retaining its node navigation anchor. |
| R | Reverse the selected relation through the validated editor command. |
| L | Open the selected node's linked resource explicitly. |
| Edit mode: background double-click | Create a node at that position. |
| Edit mode: Shift-click target | Connect the selected source node to that target. |
| Delete / Backspace / Ctrl + Delete / Ctrl + Backspace / Ctrl + D | Delete the selected query and its links, returning to a visible context. Other selected nodes/relations require Edit mode; a selected relation takes precedence over its node anchor. Text inputs retain native deletion. |

**View → Label editing → In place** makes every visible node and relation label
an editable component that follows the moving graph. Click text to place the
caret; drag a node by its body. F2 focuses the selected moving label in the main
browser. Node labels accept newlines; Ctrl/Cmd+Enter commits. Enter also commits
relation labels. Leaving a label commits a valid draft; invalid drafts remain
marked for correction, and Escape cancels. Native text selection, clipboard,
caret and deletion keys stay with the label. Full details remain in the overlay.
The palette page also offers in-place labels; its default labels are read-only.

## Files

| Key or gesture | Action |
| --- | --- |
| Ctrl + A in graph / New graph button | Open a download/discard/cancel dialog before replacing the document. Text fields retain Select All; Ctrl+A is graph-scoped. |
| Ctrl/Cmd + O | Open a .fm.yaml graph; select its companion type YAML too when required. |
| Ctrl/Cmd + S / Ctrl/Cmd + Shift + S | Download the complete graph as YAML / save it under a chosen download name. |

## Search

| Key or gesture | Action |
| --- | --- |
| / | Reveal literal search, clear the query and focus its input. |
| Ctrl + F / Ctrl + Shift + F | Create a lexical / LDA query node beside the selected context and type on the node. Enter searches; Escape cancels editing. F2 reopens the query. The side pane can stay collapsed. |
| Ctrl + R / Ctrl + Shift + R | Retrieve literal / topic-model similarities for the selected content node. |
| Ctrl + I / Ctrl + Shift + I | Check the current literal index / train the current topic model with the configured settings. Literal queries also index automatically. |

## Help

| Key or gesture | Action |
| --- | --- |
| ? in graph / F1 / Key map button | Show this key map. Escape closes the dialog; Tab retains normal focus traversal. |

## Differences from the Java key map

Graph spacing uses Ctrl+Shift+↑/↓ (also Ctrl+↑/↓), canvas zoom uses Shift+Option/Alt+↑/↓, and focus/context uses Ctrl+Shift+←/→. Shift+Option/Alt+←/→ rotates the view by 5° per press while keeping labels upright. Canvas reset retains Ctrl+Shift+1. FM2014 used Ctrl+Shift+↑/↓ for canvas zoom; the old map also used Alt arrows and Ctrl arrows for panning. +/− now scales the canvas, whereas Java used it for graph spacing. Drag the background to pan. Ordinary selection keeps the neighborhood; Enter/double-click and N control centering.

Linked-node/sibling creation, selected-to-center linking, local graph copy/clone/reuse, new-document confirmation and explicit reopening focus are restored under TODO 2.6. Endpoint/default-label semantics follow the active Java source; structural mutations require Edit mode. Keyboard-accessible command buttons provide fallbacks for browser/OS-reserved chords. The graph clipboard stays in this application and never accesses the platform clipboard. Deletion now targets the selected item with relation precedence. Query nodes are removable in Navigate mode; other structural deletion requires Edit mode. Ctrl+Backspace/Delete and Ctrl+D are additional aliases, with native text deletion preserved. Ctrl+F/Ctrl+Shift+F creates a graph query before retrieval and opens its moving input; Enter searches and F2 reopens it. See [the FM2014 comparison and reproduction](fm2014-keyboard-audit.md) and TODO 2.6. Legacy layout/control-panel toggles and SVG export are not implemented shortcuts. Search shortcuts follow FM2014 with elasticlunr literal retrieval and LDA semantics; Ctrl+I checks the current literal index, and literal queries automatically index current text. See [the search guide](graph-search.md) and [retrieval parity](fm2014-retrieval-parity.md). File saving downloads YAML rather than overwriting a selected local file; Ctrl/Cmd+Shift+S opens the filename field. The numeric =weight suffix is supported in label editors. Other legacy type/style suffixes use explicit fields and YAML visual settings. Ctrl+G/H adjusts a draft and requires Save; details editing uses an overlay rather than the side pane.

Exports include committed changes, not editor drafts. HTML annotations retain their source but display through a formatting/link allowlist. Legacy local resource paths remain data; the browser opens only supported web/mail links on an explicit action.
