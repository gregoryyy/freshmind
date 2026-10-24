/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import type { FreshmindPanel } from "../browser/index.js";

/** Application-owned elements; graph spacing is a percentage-valued range input. */
export interface ZoomControlElements {
  spacing: HTMLInputElement;
  spacingValue: HTMLElement;
  canvasIn: HTMLElement;
  canvasOut: HTMLElement;
  canvasReset: HTMLElement;
}

/** Binds both zoom levels to supplied controls. Dispose before removing the controls or panel. */
export function bindZoomControls(panel: FreshmindPanel, elements: ZoomControlElements): () => void {
  const {spacing, spacingValue, canvasIn, canvasOut, canvasReset} = elements;
  const navigation = panel.getNavigation();
  const update = () => {
    const percent = Math.round(panel.getZoom() * 100);
    spacing.value = String(percent);
    spacingValue.textContent = `${percent}%`;
    canvasReset.textContent = `${Math.round(panel.getCanvasZoom() * 100)}%`;
  };
  const changeSpacing = () => navigation.zoomBy(Number(spacing.value) / 100 / panel.getZoom());
  const zoomIn = () => { navigation.canvasZoomBy(1.2); panel.focusGraph(); };
  const zoomOut = () => { navigation.canvasZoomBy(1 / 1.2); panel.focusGraph(); };
  const reset = () => { navigation.setCanvasZoom(1); panel.focusGraph(); };
  spacing.addEventListener("input", changeSpacing);
  canvasIn.addEventListener("click", zoomIn);
  canvasOut.addEventListener("click", zoomOut);
  canvasReset.addEventListener("click", reset);
  const listener = {graphMoved: update};
  panel.addGraphListener(listener);
  update();
  return () => {
    spacing.removeEventListener("input", changeSpacing);
    canvasIn.removeEventListener("click", zoomIn);
    canvasOut.removeEventListener("click", zoomOut);
    canvasReset.removeEventListener("click", reset);
    panel.removeGraphListener(listener);
  };
}
