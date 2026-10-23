/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import type { FreshNode, FreshEdge } from "../model.js";
import type { Node } from "../../tg/model.js";
import type { ImmutableGraphEltSet } from "../../tg/graph.js";

export type Direction = "up" | "right" | "down" | "left";
export type CandidateKind = "node" | "edge";
export type NavigationItem = FreshNode | FreshEdge;
export interface NavigationSettings {
  radius: number;
  backlinks: boolean;
  maxAddEdgeCount: number;
  maxExpandEdgeCount: number;
  moveToCenter: boolean;
  preselectionTimeoutMs: number;
}
/** Timer injection keeps inactivity tests deterministic without depending on a DOM. */
export interface NavigationClock {
  setTimeout(callback: () => void, milliseconds: number): unknown;
  clearTimeout(handle: unknown): void;
}
export interface NavigationOptions extends Partial<NavigationSettings> { clock?: NavigationClock; }
export interface Candidate {
  item: NavigationItem;
  node: FreshNode;
  id: string;
  angle: number;
  distance: number;
  axisDistance: number;
}
/** Detached snapshot; callers cannot reorder the controller's candidate list. */
export interface Preselection {
  kind: CandidateKind;
  direction: Direction;
  anchorId: string;
  candidateIds: string[];
  activeIndex: number;
}
export interface NavigationState {
  settings: NavigationSettings;
  preselection: Preselection | null;
  detailsVisible: boolean;
  wholeGraph: boolean;
  message: string;
}
export interface NavigationKey {
  key: string;
  code?: string;
  repeat?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}
export interface NavigationActions {
  edit?(item: NavigationItem): void; editDetails?(item: NavigationItem): void;
  help?(): void; openResource?(): void; reverseRelation?(): void;
}
/** Existing panel owners supply graph, selection, view and locality operations. */
export interface NavigationHost {
  getGES(): ImmutableGraphEltSet;
  getCompleteEltSet(): ImmutableGraphEltSet;
  getSelect(): Node | null;
  getFocus(): Node | null;
  getNeighborhoodFocus(): FreshNode | null;
  getSelection(): NavigationItem | null;
  setSelect(node: Node | null): void;
  setSelectEdge(edge: FreshEdge | null): void;
  updateDrawPositions(): void;
  centerOn(node: Node, updateFocus?: boolean): void;
  getZoom(): number;
  zoomBy(factor: number): void;
  getCanvasZoom(): number;
  setCanvasZoom(scale: number): void;
  getHyperbolic(): number;
  setHyperbolic(value: number): void;
  setLocale(node: Node | null, radius: number, maxAdd?: number, maxExpand?: number, outgoingOnly?: boolean): Promise<void>;
  expandNode(node: Node): Promise<void>;
  collapseNode(node: Node): Promise<void>;
  hideNode(node: Node): Promise<void>;
  repaint(): void;
}
