/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import type { FreshmindPanel } from "../src/fm/index.js";

/** Binds independent graph-spacing and canvas-scale controls on either demo page. */
export function bindZoomControls(panel: FreshmindPanel): void {
  const spacing = document.getElementById("graph-zoom") as HTMLInputElement;
  const value = document.getElementById("graph-zoom-value")!;
  const reset = document.getElementById("zoom-reset")!;
  const navigation = panel.getNavigation();
  const update = () => {
    const percent = Math.round(panel.getZoom() * 100);
    spacing.value = String(percent); value.textContent = `${percent}%`;
    reset.textContent = `${Math.round(panel.getCanvasZoom() * 100)}%`;
  };
  spacing.addEventListener("input", () => navigation.zoomBy(Number(spacing.value) / 100 / panel.getZoom()));
  document.getElementById("zoom-in")!.addEventListener("click", () => navigation.canvasZoomBy(1.2));
  document.getElementById("zoom-out")!.addEventListener("click", () => navigation.canvasZoomBy(1 / 1.2));
  reset.addEventListener("click", () => navigation.setCanvasZoom(1));
  panel.addGraphListener({ graphMoved: update });
  update();
}
