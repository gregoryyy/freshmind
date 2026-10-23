/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import { stringify } from "yaml";
import type { FreshmindPanel, FreshmindDocument } from "../src/fm/index.js";
import { parseDocument, serializeDocument } from "../src/fm/io/codec.js";
import { captureDocument, installDocument } from "../src/fm/io/panel.js";
import berryURL from "../examples/fm2014/berry.fm.yaml?url";
import nipsURL from "../examples/fm2014/nips-fm.fm.yaml?url";
import typesURL from "../examples/fm2014/fm2014.types.yaml?url";

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Browser file I/O owns only file selection/downloads; the codec remains independent of DOM and storage. */
export function bindFileControls(panel: FreshmindPanel): void {
  let current: FreshmindDocument | undefined, filename = "freshmind.fm.yaml", revision = 0;
  const input = get<HTMLInputElement>("open-graph-files"), status = get("file-status");
  const message = (value: string, error = false) => {status.textContent = value; status.dataset.error = String(error);};
  const load = async (source: string, name: string, resolver: (path: string) => string, request: number) => {
    const document = parseDocument(source, {resolveTypes: resolver});
    if (request !== revision) return;
    await installDocument(panel, document);
    if (request !== revision) return;
    current = document; filename = name; get<HTMLInputElement>("save-name").value = filename;
    const warnings = document.types.getDiagnostics();
    message(name + ": " + document.graph.nodeCount() + " nodes, " + document.graph.edgeCount() + " relations"
      + (warnings.length ? " · " + warnings.length + " type warnings: " + warnings.slice(0, 3).join("; ") : ""));
  };
  input.addEventListener("change", async () => {
    const files = [...input.files ?? []], request = ++revision;
    try {
      const documents = files.filter(file => /\.fm\.ya?ml$/i.test(file.name));
      if (documents.length !== 1) throw new Error("Select one .fm.yaml graph and any required companion type YAML.");
      const entries = await Promise.all(files.map(async file => [file.name, await file.text()] as const)), sources = new Map(entries);
      if (sources.size !== entries.length) throw new Error("Selected files have ambiguous duplicate names");
      await load(sources.get(documents[0].name)!, documents[0].name, path => {
        const source = sources.get(path) ?? sources.get(path.split("/").at(-1)!);
        if (source === undefined) throw new Error("Select the companion file too: " + path); return source;
      }, request);
    } catch (error) {if (request === revision) message((error as Error).message, true);} finally {input.value = "";}
  });
  get("open-graph").addEventListener("click", () => input.click());
  get<HTMLSelectElement>("example-graph").addEventListener("change", async event => {
    const selected = (event.target as HTMLSelectElement).value, request = ++revision;
    const url = selected === "berry" ? berryURL : selected === "nips-fm" ? nipsURL : null;
    if (!url) return; message("Loading " + selected + "…");
    try {
      const [graph, types] = await Promise.all([fetch(url), fetch(typesURL)]);
      if (!graph.ok || !types.ok) throw new Error("Could not load example files");
      const [source, config] = await Promise.all([graph.text(), types.text()]);
      await load(source, selected + ".fm.yaml", path => {if (path !== "fm2014.types.yaml") throw new Error("Unknown example companion"); return config;}, request);
    } catch (error) {if (request === revision) message((error as Error).message, true);}
  });
  const dialog = document.createElement("dialog"); dialog.className = "save-dialog"; dialog.setAttribute("aria-label", "Save graph as");
  const label = document.createElement("label"); label.textContent = "Filename ";
  const name = document.createElement("input"); name.id = "save-name"; name.value = filename; name.setAttribute("aria-label", "Save filename"); label.append(name);
  const saveButton = document.createElement("button"), cancel = document.createElement("button"); saveButton.textContent = "Download YAML"; cancel.textContent = "Cancel";
  dialog.append(label, saveButton, cancel); document.body.append(dialog); cancel.addEventListener("click", () => dialog.close());
  const download = (name: string, source: string) => {
    const url = URL.createObjectURL(new Blob([source], {type: "application/yaml;charset=utf-8"})), anchor = document.createElement("a");
    anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const save = () => {
    try {
      const snapshot = captureDocument(panel, current), companion = get<HTMLInputElement>("save-companion").checked;
      const options = {includeLayout: get<HTMLInputElement>("save-layout").checked, includeView: get<HTMLInputElement>("save-view").checked,
        ...(companion ? {typesFile: "fm2014.types.yaml"} : {})};
      const source = serializeDocument(snapshot, options);
      filename = name.value.trim() || filename; if (!/\.fm\.ya?ml$/i.test(filename)) filename += ".fm.yaml";
      download(filename, source); if (companion) download("fm2014.types.yaml", stringify(snapshot.types.getConfiguration()));
      message("Saved " + snapshot.graph.nodeCount() + " nodes and " + snapshot.graph.edgeCount() + " relations to " + filename); dialog.close();
    } catch (error) {message((error as Error).message, true);}
  };
  saveButton.addEventListener("click", save); get("save-graph").addEventListener("click", save);
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.isComposing || !(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "o") {event.preventDefault(); input.click();}
    else if (event.key.toLowerCase() === "s") {event.preventDefault(); if (event.shiftKey) {name.value = filename; if (!dialog.open) dialog.showModal(); name.focus(); name.select();} else save();}
  };
  document.addEventListener("keydown", keydown, true);
  window.addEventListener("pagehide", () => {revision++; document.removeEventListener("keydown", keydown, true); dialog.remove();}, {once: true});
}
