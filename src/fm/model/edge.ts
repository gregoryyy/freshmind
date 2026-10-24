/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import {Edge} from "../../tg/model/index.js";
import {FreshNode} from "./node.js";
import {clone,number,text,validateVisualOverride} from "../config/core.js";
import type {EdgeStyle,VisualOverride} from "../config/core.js";
import type {EdgeGeometry} from "../geometry/index.js";
import {metadata} from "./metadata.js";
import type {Metadata,FreshEdgeOptions} from "./types.js";

/** Directed TouchGraph relation with stable identity, independent label/type and cached draw geometry. */
export class FreshEdge extends Edge {
  declare from: FreshNode;
  declare to: FreshNode;
  private label = "";
  private semanticType = "default";
  private visual: VisualOverride<EdgeStyle> = {};
  private weight = 10;
  private data: Metadata = {};
  private extensions: Metadata = {};
  private preselected = false;
  private keyselected = false;
  private geometry: EdgeGeometry | null = null;
  /**
   * Creates a detached relation; graph insertion assigns an edge ID if omitted.
   * @param from Source FreshNode; both endpoints must be inserted before the relation.
   * @param to Target FreshNode, which may equal from for a self-loop.
   * @param options Semantic/visual metadata, plus the independent physical spring length.
   * @throws {TypeError} For non-FreshNode endpoints or invalid metadata/style values.
   * @throws {RangeError} If physical length is not a positive integer.
   */
  constructor(from: FreshNode, to: FreshNode, options: FreshEdgeOptions = {}) {
    if (!(from instanceof FreshNode) || !(to instanceof FreshNode)) throw new TypeError("FreshEdge requires FreshNode endpoints");
    super(from, to, options.length ?? 40);
    if (options.id !== undefined) this.setID(options.id);
    this.setLabel(options.label ?? ""); this.setSemanticType(options.type ?? "default"); this.setVisual(options.visual ?? {});
    this.setWeight(options.weight ?? 10); this.setData(options.data ?? {}); this.setExtensions(options.extensions ?? {});
  }
  /** Assigns an unset ID or accepts the same ID; changing an assigned identity throws. */
  override setID(id: string): void {
    text(id, "edge.id"); if (this.getID() !== null && this.getID() !== id) throw new Error("Freshmind edge IDs are stable"); super.setID(id);
  }
  getLabel(): string { return this.label; }
  /** Changes display text, including an empty label, without changing identity or relation type. */
  setLabel(label: string): void { if (typeof label !== "string") throw new TypeError("Expected relation label string"); this.label = label; }
  getSemanticType(): string { return this.semanticType; }
  /** Stores a nonempty relation category independently of label text and physical length. */
  setSemanticType(type: string): void { text(type, "edge.type"); this.semanticType = type; }
  getVisual(): VisualOverride<EdgeStyle> { return clone(this.visual); }
  /** Copies validated style overrides; the next repaint resolves and redraws the curve. */
  setVisual(visual: VisualOverride<EdgeStyle>): void { this.visual = validateVisualOverride(visual, "edge"); }
  getWeight(): number { return this.weight; }
  /** Sets nonnegative stroke/RFC importance; ordinary TouchGraph spring attraction remains unchanged. */
  setWeight(weight: number): void { number(weight, "edge.weight"); this.weight = weight; }
  getData(): Metadata { return clone(this.data); }
  setData(data: Metadata): void { this.data = metadata(data); }
  getExtensions(): Metadata { return clone(this.extensions); }
  setExtensions(data: Metadata): void { this.extensions = metadata(data); }
  isPreselected(): boolean { return this.preselected; }
  setPreselected(value: boolean): void { this.preselected = value; }
  isKeyselected(): boolean { return this.keyselected; }
  setKeyselected(value: boolean): void { this.keyselected = value; }
  /**
   * Stores transient geometry shared by picking, labels and future inline editors.
   * Repaint/getEdgeGeometry refresh it after position, lens or visual changes; null clears it.
   */
  setGeometry(geometry: EdgeGeometry | null): void { this.geometry = geometry; }
  getGeometry(): EdgeGeometry | null { return this.geometry; }
  /** Reverses endpoints and discards cached geometry until the next geometry update. */
  override reverse(): void { super.reverse(); this.geometry = null; }
  /** Uses sampled distance to the last visible curve, or the base chord approximation if unset. */
  override distFromPoint(x: number, y: number): number { return this.geometry?.distanceFrom({ x, y }) ?? super.distFromPoint(x, y); }
  /** Returns the last curve midpoint in draw pixels, falling back to the endpoint chord midpoint. */
  getMiddle(): { x: number; y: number } { return this.geometry?.midpoint ?? { x: (this.from.drawx + this.to.drawx) / 2, y: (this.from.drawy + this.to.drawy) / 2 }; }
  /** Returns the last label/editor anchor including its offset, or getMiddle before geometry exists. */
  getLabelAnchor(): { x: number; y: number } { return this.geometry?.labelAnchor ?? this.getMiddle(); }
}
