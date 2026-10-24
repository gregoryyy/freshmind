/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import { FreshmindDocument } from "../model/index.js";
import type { FreshmindPanel } from "./panel.js";

/** Captures the complete graph and effective types while retaining document metadata from the open file. */
export function captureDocument(panel: FreshmindPanel, current?: FreshmindDocument): FreshmindDocument {
  const snapshot = new FreshmindDocument(panel.getTypeRegistry(), panel.getCompleteEltSet());
  snapshot.title = current?.title ?? "Freshmind graph";
  snapshot.data = structuredClone(current?.data ?? {}); snapshot.extensions = structuredClone(current?.extensions ?? {});
  const settings = panel.getNavigation().getState().settings, focus = panel.getNeighborhoodFocus() ?? panel.getFocus();
  const {radius, backlinks, moveToCenter, maxAddEdgeCount, maxExpandEdgeCount} = settings;
  snapshot.view = { ...(focus ? {focus: focus.getID()!} : {}), radius, backlinks, moveToCenter, maxAddEdgeCount, maxExpandEdgeCount,
    wholeGraph: panel.getNavigation().getState().wholeGraph,
    lenses: {zoom: panel.getZoom(), hyperbolic: panel.getHyperbolic(), rotation: panel.rotateLens.angle, pan: panel.getLensPan()},
    canvas: {zoom: panel.getCanvasZoom(), pan: panel.getCanvasPan()}};
  return snapshot;
}

export interface InstallDocumentOptions {
  /** Reinforce the document's initial focus. Activation is application policy, never restored from file data. */
  reinforceFocus?: boolean;
}
/** Installs a validated document and view, optionally reinforcing its initial focus for browser applications. */
export async function installDocument(panel: FreshmindPanel, document: FreshmindDocument, options: InstallDocumentOptions = {}): Promise<void> {
  panel.fastFinishAnimation(); await panel.getLocalityUtils().whenIdle();
  panel.setGraphEltSet(document.graph); panel.setTypeRegistry(document.types);
  const view = document.view, nav = panel.getNavigation();
  await nav.configure({radius: view?.radius ?? 2, backlinks: view?.backlinks ?? true, moveToCenter: view?.moveToCenter ?? true,
    maxAddEdgeCount: view?.maxAddEdgeCount ?? 1000, maxExpandEdgeCount: view?.maxExpandEdgeCount ?? 1000});
  panel.setZoom(view?.lenses?.zoom ?? 1); panel.setHyperbolic(view?.lenses?.hyperbolic ?? 0); panel.setRotation(view?.lenses?.rotation ?? 0);
  const focus = (view?.focus ? document.graph.findNode(view.focus) : null) ?? (document.graph.nodeCount() ? document.graph.nodeAt(0) : null);
  if (focus) {
    if (!view?.wholeGraph && (view?.focus || document.graph.nodeCount() > 100)) {
      const settings = nav.getState().settings;
      panel.setSelect(focus); panel.centerOn(focus, true);
      const pending = panel.setLocale(focus, settings.radius, settings.maxAddEdgeCount, settings.maxExpandEdgeCount, !settings.backlinks);
      panel.fastFinishAnimation(); await pending;
      panel.fastFinishAnimation(); await panel.getLocalityUtils().whenIdle();
    } else {
      panel.getGES().addAll(); panel.setSelect(focus); panel.centerOn(focus, true);
      if (view?.wholeGraph) nav.neighborhoodChanged(2147483647, 1000, 1000, false);
    }
  } else panel.centerView();
  if (view?.lenses?.pan) panel.setLensPan(view.lenses.pan.x, view.lenses.pan.y);
  panel.setCanvasZoom(view?.canvas?.zoom ?? 1); panel.setCanvasPan(view?.canvas?.pan?.x ?? 0, view?.canvas?.pan?.y ?? 0);
  if (options.reinforceFocus && focus && panel.getGES().contains(focus)) panel.getRfc().setFocus(focus);
  panel.resetDamper(); panel.repaintAfterMove();
}
