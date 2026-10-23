/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
/** User reference adapted from FM2014 keys.txt; only implemented port actions are listed. */
export const keymap = [
  {group: "Navigation", keys: "Arrow keys", action: "Select a neighbor in that direction; several neighbors start preselection."},
  {group: "Navigation", keys: "Shift + arrows", action: "Preselect relations rather than nodes, including parallel/incoming relations."},
  {group: "Navigation", keys: "Perpendicular arrows", action: "Cycle ambiguous candidates; the original direction or Enter/Space confirms, the opposite cancels."},
  {group: "Navigation", keys: "Enter", action: "Confirm candidates, otherwise center selection. N chooses whether centering also changes the neighborhood."},
  {group: "Navigation", keys: "Space", action: "Confirm candidates, otherwise show/hide the node content popup or relation details."},
  {group: "Navigation", keys: "Escape", action: "Cancel candidates, then clear a selected relation back to its anchor, then clear node selection."},
  {group: "Navigation", keys: "E / K / H", action: "Expand / collapse / hide the selected node."},
  {group: "Navigation", keys: "0–6", action: "Set neighborhood radius in graph hops."},
  {group: "Navigation", keys: "B / N", action: "Toggle backlinks / whether centering changes the neighborhood."},
  {group: "View", keys: "Ctrl + Shift + ↑ / ↓ (also Ctrl + ↑ / ↓)", action: "Increase/decrease graph spacing; object sizes remain fixed."},
  {group: "View", keys: "Ctrl + Shift + ← / →", action: "Decrease/increase focus + context strength."},
  {group: "View", keys: "Ctrl + Shift + Option/Alt + ↑ / ↓", action: "Increase/decrease canvas zoom around the viewport center."},
  {group: "View", keys: "Ctrl + Shift + Option/Alt + ← / →", action: "Rotate the view counterclockwise/clockwise by 5°, keeping labels upright."},
  {group: "View", keys: "Ctrl + Shift + 1", action: "Reset canvas zoom to 100%, keeping the viewport center."},
  {group: "View", keys: "+ / − (also =)", action: "Additional canvas zoom controls."},
  {group: "Pointer", keys: "Vertical scroll", action: "Increase/decrease graph spacing, keeping labels and shapes the same size."},
  {group: "Pointer", keys: "Pinch / Ctrl + wheel", action: "Scale the complete canvas around the pointer."},
  {group: "Pointer", keys: "Horizontal two-finger scroll", action: "Adjust focus + context. Diagonal wheel events use their dominant axis."},
  {group: "Pointer", keys: "Drag node / background", action: "Move a node through the viewing lenses / pan the canvas."},
  {group: "Pointer", keys: "Double-click node", action: "Select and center it, using the same neighborhood option as Enter."},
  {group: "Editing", keys: "F2 / Ctrl + Enter", action: "Edit the selected node/relation label inline.", browser: true},
  {group: "Editing", keys: "Ctrl + Space", action: "Edit the node annotation in the inspector, including from the content popup.", browser: true},
  {group: "Editing", keys: "Escape / Space in node content", action: "Close the content popup and return focus to the graph; links and controls retain normal activation.", browser: true},
  {group: "Editing", keys: "Ctrl/Cmd + Enter", action: "Commit the current editor. Enter also commits a single-line relation edit.", browser: true},
  {group: "Editing", keys: "Escape in an editor", action: "Cancel the draft and return focus to the graph. Clicking away retains the draft.", browser: true},
  {group: "Editing", keys: "R", action: "Reverse the selected relation through the validated editor command.", browser: true},
  {group: "Editing", keys: "L", action: "Open the selected node's linked resource explicitly.", browser: true},
  {group: "Editing", keys: "Edit mode: background double-click", action: "Create a node at that position.", browser: true},
  {group: "Editing", keys: "Edit mode: Shift-click target", action: "Connect the selected source node to that target.", browser: true},
  {group: "Editing", keys: "Edit mode: Delete / Backspace", action: "Delete the focused node. Text inputs retain normal deletion.", browser: true},
  {group: "Files", keys: "Ctrl/Cmd + O", action: "Open a .fm.yaml graph; select its companion type YAML too when required.", browser: true},
  {group: "Files", keys: "Ctrl/Cmd + S / Ctrl/Cmd + Shift + S", action: "Download the complete graph as YAML / save it under a chosen download name.", browser: true},
  {group: "Help", keys: "? in graph / F1 / Key map button", action: "Show this key map. Escape closes the dialog; Tab retains normal focus traversal."}
] as const;
