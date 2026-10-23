/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode } from "../model.js";
import type { FreshmindPanel } from "../panel.js";
import type { RfcSettings } from "../rfc/types.js";

export interface RfcControlElements {
  activate: HTMLButtonElement;
  clear: HTMLButtonElement;
  springMultiplier: HTMLInputElement;
  angularStiffness: HTMLInputElement;
  xWeight?: HTMLInputElement;
  yWeight?: HTMLInputElement;
  status: HTMLElement;
}

/** Binds application-owned controls to transient reinforcement; dispose before removing the panel. */
export function bindRfcControls(panel: FreshmindPanel, elements: RfcControlElements): () => void {
  const rfc = panel.getRfc();
  const fields = ["springMultiplier", "angularStiffness", "xWeight", "yWeight"] as const;
  const update = () => {
    const state = rfc.getState(), selected = panel.getSelection();
    elements.activate.disabled = !(selected instanceof FreshNode) || !panel.getGES().contains(selected);
    elements.clear.disabled = !state.enabled;
    for (const key of fields) {
      const input = elements[key];
      if (input && input.ownerDocument.activeElement !== input)
        input.value = String(key === "xWeight" ? state.settings.coordinateWeights.x : key === "yWeight" ? state.settings.coordinateWeights.y : state.settings[key]);
    }
    const label = state.focusId ? panel.findNode(state.focusId)?.getLabel() || state.focusId : "";
    const message = !state.enabled ? "RFC off." : !state.active
      ? `RFC paused: ${label} is outside the visible neighborhood.`
      : `RFC: ${label} · ${state.branchIds.length} visible ${state.branchIds.length === 1 ? "branch" : "branches"}.`;
    if (elements.status.textContent !== message) elements.status.textContent = message;
  };
  const activate = () => { const node = panel.getSelection(); if (node instanceof FreshNode) rfc.setFocus(node); panel.focusGraph(); };
  const clear = () => { rfc.setFocus(null); panel.focusGraph(); };
  elements.activate.addEventListener("click", activate);
  elements.clear.addEventListener("click", clear);
  const removers: (() => void)[] = [];
  for (const key of fields) {
    const input = elements[key];
    if (!input) continue;
    const resetValidity = () => input.setCustomValidity("");
    const change = () => {
      resetValidity();
      try {
        const changes: Partial<RfcSettings> = key === "xWeight" || key === "yWeight"
          ? {coordinateWeights: {...rfc.getState().settings.coordinateWeights, [key === "xWeight" ? "x" : "y"]: input.valueAsNumber}}
          : {[key]: input.valueAsNumber};
        rfc.configure(changes);
      }
      catch (error) { input.setCustomValidity(error instanceof Error ? error.message : String(error)); input.reportValidity(); }
    };
    input.addEventListener("input", resetValidity); input.addEventListener("change", change);
    removers.push(() => { input.removeEventListener("input", resetValidity); input.removeEventListener("change", change); input.setCustomValidity(""); });
  }
  const listener = {graphMoved: update, graphReset: update};
  panel.addGraphListener(listener);
  const removeSelection = panel.addSelectionListener(update), removeRfc = rfc.addListener(update);
  update();
  return () => {
    elements.activate.removeEventListener("click", activate); elements.clear.removeEventListener("click", clear);
    for (const remove of removers) remove();
    removeSelection(); removeRfc(); panel.removeGraphListener(listener);
  };
}
