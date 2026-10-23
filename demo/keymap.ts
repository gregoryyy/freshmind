/* Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
 * TypeScript port by Gregor Heinrich using Codex GPT-6.1. */
import type { FreshmindPanel } from "../src/fm/index.js";
import { keymap } from "../src/fm/navigation/keymap.js";

/** Builds accessible help from the same rows as docs/KEYMAP.md, filtering application-only commands. */
export function bindKeymap(panel: FreshmindPanel, browser = false): void {
  const dialog = document.createElement("dialog"); dialog.className = "keymap-dialog";
  dialog.setAttribute("aria-labelledby", "keymap-title");
  const title = document.createElement("h2"); title.id = "keymap-title"; title.textContent = "Freshmind key map";
  const close = document.createElement("button"); close.textContent = "Close key map"; close.addEventListener("click", () => dialog.close());
  const note = document.createElement("p"); note.textContent = "Graph keys apply while the graph has focus. Editor keys apply inside the active editor. Adapted from FM2014 keys.txt.";
  dialog.append(title, close, note);
  for (const group of new Set(keymap.map(row => row.group))) {
    const heading = document.createElement("h3"); heading.textContent = group;
    const table = document.createElement("table");
    for (const row of keymap.filter(row => row.group === group && (browser || !("browser" in row)))) {
      const tr = document.createElement("tr"), key = document.createElement("th"), action = document.createElement("td");
      key.scope = "row"; key.textContent = row.keys; action.textContent = row.action; tr.append(key, action); table.append(tr);
    }
    if (table.childElementCount) dialog.append(heading, table);
  }
  document.body.append(dialog);
  const show = () => {if (!dialog.open) dialog.showModal();};
  document.getElementById("keymap-help")!.addEventListener("click", show); panel.getNavigation().setActions({help: show});
  const keydown = (event: KeyboardEvent) => {if (event.key === "F1") {event.preventDefault(); show();}};
  document.addEventListener("keydown", keydown, true);
  window.addEventListener("pagehide", () => {document.removeEventListener("keydown", keydown, true); dialog.remove();}, {once: true});
}
