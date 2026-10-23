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
import florentineURL from "../examples/public/florentine.fm.yaml?url";
import karateURL from "../examples/public/karate.fm.yaml?url";
import lesMiserablesURL from "../examples/public/les-miserables.fm.yaml?url";
import substructuresURL from "../docs/experiments/rfc-substructures/trees-and-dag.fm.yaml?url";
import clustersURL from "../docs/experiments/rfc-substructures/clusters.fm.yaml?url";
import weightedTreeURL from "../docs/experiments/rfc-substructures/weighted-tree.fm.yaml?url";
import joinedTreesURL from "../docs/experiments/rfc-multifocus/joined-trees.fm.yaml?url";
import leafTreesURL from "../docs/experiments/rfc-multifocus/leaf-connected-trees.fm.yaml?url";
import sharedTreesURL from "../docs/experiments/rfc-multifocus/shared-subtree.fm.yaml?url";

const examples: Record<string, {url: string; companion?: string}> = {
  berry: {url: berryURL, companion: typesURL}, "nips-fm": {url: nipsURL, companion: typesURL},
  florentine: {url: florentineURL}, karate: {url: karateURL}, "les-miserables": {url: lesMiserablesURL},substructures:{url:substructuresURL},
  "joined-trees": {url: joinedTreesURL}, "leaf-connected-trees": {url: leafTreesURL}, "shared-subtree": {url: sharedTreesURL}, "weighted-tree": {url: weightedTreeURL}, clusters: {url: clustersURL}
};

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Browser file I/O owns only file selection/downloads; the codec remains independent of DOM and storage. */
export function bindFileControls(panel: FreshmindPanel): void {
  let current: FreshmindDocument | undefined, filename = "freshmind.fm.yaml", revision = 0;
  const input = get<HTMLInputElement>("open-graph-files"), status = get("file-status");
  const message = (value: string, error = false) => {status.textContent = value; status.dataset.error = String(error);};
  const load = async (source: string, name: string, resolver: (path: string) => string, request: number, example = "") => {
    const loaded = parseDocument(source, {resolveTypes: resolver});
    if (request !== revision) return;
    const focusBeforeInstall = document.activeElement;
    await installDocument(panel, loaded, {reinforceFocus: panel.getRfc().getState().enabled});
    if (request !== revision) return;
    current = loaded; filename = name; get<HTMLInputElement>("save-name").value = filename;
    get<HTMLSelectElement>("example-graph").value = example;
    const warnings = loaded.types.getDiagnostics();
    message(name + ": " + loaded.graph.nodeCount() + " nodes, " + loaded.graph.edgeCount() + " relations"
      + (warnings.length ? " · " + warnings.length + " type warnings: " + warnings.slice(0, 3).join("; ") : ""));
    // Loading is a graph action. Preserve any editor/control the user entered while it was pending.
    // Graph replacement temporarily disables the inspector, which can move its focus to body.
    if (document.activeElement === document.body && focusBeforeInstall instanceof HTMLElement && focusBeforeInstall.isConnected
      && focusBeforeInstall.matches("input,textarea,select,[contenteditable]") && !focusBeforeInstall.matches(":disabled"))
      focusBeforeInstall.focus({preventScroll: true});
    if ([input, get("open-graph"), get("example-graph"), document.body].includes(document.activeElement as HTMLElement)) panel.focusGraph();
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
    const example = examples[selected];
    if (!example) return; message("Loading " + selected + "…");
    try {
      const [graph, types] = await Promise.all([fetch(example.url), example.companion ? fetch(example.companion) : undefined]);
      if (!graph.ok || (types && !types.ok)) throw new Error("Could not load example files");
      const [source, config] = await Promise.all([graph.text(), types?.text()]);
      await load(source, selected + ".fm.yaml", path => {
        if (path !== "fm2014.types.yaml" || config === undefined) throw new Error("Unknown example companion"); return config;
      }, request, selected);
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
