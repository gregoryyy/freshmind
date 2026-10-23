# Freshmind 4 key map

Adapted from the Java reference's `keys.txt` (2003–2012) and checked against the implemented port. Open **Key map**, press **?** with the graph focused, or press **F1** for the same reference in the browser.

Graph commands require graph focus. Text editors keep normal typing, caret movement and clipboard shortcuts. Ctrl means Control, including on macOS; Option is the Alt modifier. File and editor commit shortcuts also accept Command. Editing and file controls below apply to the main graph browser; the palette page supplies navigation/view/help.

## Navigation

| Key or gesture | Action |
| --- | --- |
| Arrow keys | Select a neighbor in that direction; several neighbors start preselection. |
| Shift + arrows | Preselect relations rather than nodes, including parallel/incoming relations. |
| Perpendicular arrows | Cycle ambiguous candidates; the original direction or Enter/Space confirms, the opposite cancels. |
| Enter | Confirm candidates, otherwise center selection. N chooses whether centering also changes the neighborhood. |
| Space | Confirm candidates, otherwise show/hide item details. |
| Escape | Cancel candidates, then clear a selected relation back to its anchor, then clear node selection. |
| E / K / H | Expand / collapse / hide the selected node. |
| 0–6 | Set neighborhood radius in graph hops. |
| B / N | Toggle backlinks / whether centering changes the neighborhood. |

## View

| Key or gesture | Action |
| --- | --- |
| Ctrl + Shift + ↑ / ↓ (also Ctrl + ↑ / ↓) | Increase/decrease graph spacing; object sizes remain fixed. |
| Ctrl + Shift + ← / → | Decrease/increase focus + context strength. |
| Ctrl + Shift + Option/Alt + ↑ / ↓ | Increase/decrease canvas zoom around the viewport center. |
| Ctrl + Shift + 1 | Reset canvas zoom to 100%, keeping the viewport center. |
| + / − (also =) | Additional canvas zoom controls. |

## Pointer

| Key or gesture | Action |
| --- | --- |
| Vertical scroll / pinch | Scale the complete canvas around the pointer. |
| Horizontal two-finger scroll | Adjust focus + context. Diagonal wheel events use their dominant axis. |
| Drag node / background | Move a node through the viewing lenses / pan the canvas. |
| Double-click node | Select and center it, using the same neighborhood option as Enter. |

## Editing

| Key or gesture | Action |
| --- | --- |
| F2 / Ctrl + Enter | Edit the selected node/relation label inline. |
| Ctrl + Space | Edit the node annotation in the inspector. |
| Ctrl/Cmd + Enter | Commit the current editor. Enter also commits a single-line relation edit. |
| Escape in an editor | Cancel the draft and return focus to the graph. Clicking away retains the draft. |
| R | Reverse the selected relation through the validated editor command. |
| L | Open the selected node's linked resource explicitly. |
| Edit mode: background double-click | Create a node at that position. |
| Edit mode: Shift-click target | Connect the selected source node to that target. |
| Edit mode: Delete / Backspace | Delete the focused node. Text inputs retain normal deletion. |

## Files

| Key or gesture | Action |
| --- | --- |
| Ctrl/Cmd + O | Open a .fm.yaml graph; select its companion type YAML too when required. |
| Ctrl/Cmd + S / Ctrl/Cmd + Shift + S | Download the complete graph as YAML / save it under a chosen download name. |

## Help

| Key or gesture | Action |
| --- | --- |
| ? in graph / F1 / Key map button | Show this key map. Escape closes the dialog; Tab retains normal focus traversal. |

## Differences from the Java key map

Graph spacing uses Ctrl+Shift+↑/↓ (also Ctrl+↑/↓), canvas zoom uses Ctrl+Shift+Option/Alt+↑/↓, and focus/context uses Ctrl+Shift+←/→. Canvas reset retains Ctrl+Shift+1. FM2014 used Ctrl+Shift+↑/↓ for canvas zoom; the old map also used Alt arrows and Ctrl arrows for panning. +/− now scales the canvas, whereas Java used it for graph spacing. Drag the background to pan. Ordinary selection keeps the neighborhood; Enter/double-click and N control centering.

Historical search/index commands (/, Ctrl+F, Ctrl+Shift+F, Ctrl+I and similarity search), clipboard graph operations, parent/child/sibling creation shortcuts, rotation chords, 3D controls, control-panel toggles and SVG export are not implemented shortcuts. Search belongs to milestone 4. File saving downloads YAML rather than overwriting a selected local file; Ctrl/Cmd+Shift+S opens the filename field. Legacy type/style label suffixes are replaced by explicit fields and YAML visual settings.

Exports include committed changes, not editor drafts. HTML annotations retain their source but display through a formatting/link allowlist. Legacy local resource paths remain data; the browser opens only supported web/mail links on an explicit action.
