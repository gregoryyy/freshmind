/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import type { FreshmindPanel } from "../browser/index.js";
import { keymap } from "../navigate/index.js";

export interface KeymapOptions {
  /** Optional application-owned help button. */
  button?: HTMLElement;
  /** Owns the generated dialog; defaults to the button's document body. */
  container?: HTMLElement;
  /** Include editing/file commands when the application supplies those features. */
  includeBrowserCommands?: boolean;
  /** F1 scope; defaults to the owner document. Use a panel wrapper for multiple browsers. */
  keyboardTarget?: HTMLElement | Document;
}

let nextTitleId = 0;

/** Builds reusable keyboard help. The disposer removes the dialog, listeners and owned help action. */
export function bindKeymap(panel: FreshmindPanel, options: KeymapOptions = {}): () => void {
  const owner = options.container?.ownerDocument ?? options.button?.ownerDocument ?? document;
  const container = options.container ?? owner.body;
  const keyboardTarget = options.keyboardTarget ?? owner;
  const dialog = owner.createElement("dialog");
  dialog.className = "fm-keymap-dialog";
  const title = owner.createElement("h2");
  title.id = `fm-keymap-title-${++nextTitleId}`;
  title.textContent = "Freshmind key map";
  dialog.setAttribute("aria-labelledby", title.id);
  const close = owner.createElement("button");
  close.type = "button";
  close.textContent = "Close key map";
  close.addEventListener("click", () => dialog.close());
  const note = owner.createElement("p");
  note.textContent = "Point at the graph to use its keys. Explicit control/editor focus takes priority; click or Tab into the graph to leave it. Adapted from FM2014 keys.txt.";
  dialog.append(title, close, note);
  const rows = keymap.filter(row => options.includeBrowserCommands || !("browser" in row));
  for (const group of new Set(rows.map(row => row.group))) {
    const heading = owner.createElement("h3");
    heading.textContent = group;
    const table = owner.createElement("table");
    for (const row of rows.filter(row => row.group === group)) {
      const tr = owner.createElement("tr"), key = owner.createElement("th"), action = owner.createElement("td");
      key.scope = "row";
      key.textContent = row.keys;
      action.textContent = row.action;
      tr.append(key, action);
      table.append(tr);
    }
    dialog.append(heading, table);
  }
  container.append(dialog);
  let disposed = false;
  const show = () => { if (!disposed && !dialog.open) dialog.showModal(); };
  options.button?.addEventListener("click", show);
  const removeHelp = panel.getNavigation().setActions({help: show});
  const keydown = (event: Event) => {
    const key = event as KeyboardEvent;
    if (key.key === "F1" && !key.isComposing && !key.altKey && !key.ctrlKey && !key.metaKey && !key.shiftKey) {
      key.preventDefault();
      show();
    }
  };
  keyboardTarget.addEventListener("keydown", keydown, true);
  return () => {
    if (disposed) return;
    disposed = true;
    options.button?.removeEventListener("click", show);
    keyboardTarget.removeEventListener("keydown", keydown, true);
    removeHelp();
    if (dialog.open) dialog.close();
    dialog.remove();
  };
}
