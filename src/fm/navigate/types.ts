/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import type { FreshNode, FreshEdge } from "../model/index.js";
import type { Node } from "../../tg/model/index.js";
import type { ImmutableGraphEltSet } from "../../tg/graph/index.js";
import type { CurveMode } from "../config/core.js";

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
  /** Optional feature editor gets first refusal before the generic label editor. */
  editQuery?(item:NavigationItem):boolean;
  help?(): void; openResource?(): void; reverseRelation?(): void;
  quickSearch?():void; search?(semantic:boolean):void; similar?(semantic:boolean):void; index?(semantic:boolean):void;
  structural?(command: "add" | "parent" | "sibling" | "sibling-parent" | "link-center" | "copy" | "paste" | "link-copy" | "initial-focus" | "new-document"): string | void;
  adjustWeight?(item:NavigationItem,direction:1|-1):void;
}
/** Existing panel owners supply graph, selection, view and locality operations. */
export interface NavigationHost {
  getGES(): ImmutableGraphEltSet;
  getCompleteEltSet(): ImmutableGraphEltSet;
  getSelect(): Node | null;
  getFocus(): Node | null;
  /** Visible node nearest the viewport center, including canvas pan/zoom; optional for custom hosts. */
  getCenteredNode?():FreshNode|null;
  getNeighborhoodFocus(): FreshNode | null;
  getSelection(): NavigationItem | null;
  deleteSelection?():boolean;
  setSelect(node: Node | null): void;
  setSelectEdge(edge: FreshEdge | null): void;
  updateDrawPositions(): void;
  centerOn(node: Node, updateFocus?: boolean): void;
  /** Optional extension invoked by a repeated center command on the current focal node. */
  reinforceCenteredNode?(node: FreshNode): void;
  /** Adds an independent RFC center without changing locality or the viewing-lens focus. */
  addRfcCenter?(node: FreshNode): void;
  /** Toggles one RFC center, retaining all others; returns whether it is now enabled. */
  toggleRfcCenter?(node: FreshNode): boolean;
  /** Optional Freshmind presentation extension; explicit per-relation forms remain authoritative. */
  cycleEdgeCurve?(): CurveMode;
  getZoom(): number;
  zoomBy(factor: number): void;
  getCanvasZoom(): number;
  setCanvasZoom(scale: number): void;
  getRotation(): number;
  setRotation(radians: number): void;
  getHyperbolic(): number;
  setHyperbolic(value: number): void;
  setLocale(node: Node | null, radius: number, maxAdd?: number, maxExpand?: number, outgoingOnly?: boolean): Promise<void>;
  expandNode(node: Node): Promise<void>;
  collapseNode(node: Node): Promise<void>;
  hideNode(node: Node): Promise<void>;
  repaint(): void;
}
