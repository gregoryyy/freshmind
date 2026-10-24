/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import {Node} from "../../tg/model/index.js";
import {clone,number,text,validateVisualOverride} from "../config/core.js";
import type {NodeStyle,VisualOverride} from "../config/core.js";
import type {NodeOutline} from "../geometry/index.js";
import {metadata} from "./metadata.js";
import type {Annotation,Metadata,FreshNodeOptions} from "./types.js";

/**
 * TouchGraph node extended with semantic metadata and transient presentation state.
 * Semantic type remains separate from the inherited numeric getType shape contract.
 * Metadata/visual values are copied at API boundaries; weights affect presentation and added RFC stiffness.
 */
export class FreshNode extends Node {
  private semanticType = "default";
  private visual: VisualOverride<NodeStyle> = {};
  private annotation: Annotation = { format: "text", text: "" };
  private url = "";
  private weight = 1;
  private data: Metadata = {};
  private extensions: Metadata = {};
  private preselected = false;
  private keyselected = false;
  private outline: NodeOutline | null = null;
  /**
   * Creates a detached Freshmind node without changing TouchGraph's physics defaults.
   * @param id Stable nonempty identity, or null for assignment on graph insertion.
   * @param label Display text, independent of identity and semantic category.
   * @param options Metadata and visual overrides; a fixed node requires an explicit position.
   * @throws {TypeError} For invalid metadata/style values or missing fixed-node position.
   */
  constructor(id: string | null = null, label: string = id ?? "", options: FreshNodeOptions = {}) {
    if (id !== null) text(id, "node.id");
    super(id, label);
    this.setSemanticType(options.type ?? "default"); this.setVisual(options.visual ?? {});
    this.setAnnotation(options.annotation ?? { format: "text", text: "" }); this.setURL(options.url ?? "");
    this.setWeight(options.weight ?? 1); this.setData(options.data ?? {}); this.setExtensions(options.extensions ?? {});
    if (options.position) {
      number(options.position.x, "position.x", -Infinity); number(options.position.y, "position.y", -Infinity);
      this.setLocation(options.position);
    }
    if (options.fixed && !options.position) throw new TypeError("A fixed node requires a position");
    this.setFixed(options.fixed ?? false);
  }
  /** Assigns an unset ID or accepts the same ID; changing an assigned identity throws. */
  override setID(id: string): void {
    text(id, "node.id"); if (this.getID() !== null && this.getID() !== id) throw new Error("Freshmind node IDs are stable"); super.setID(id);
  }
  getSemanticType(): string { return this.semanticType; }
  /** Stores a nonempty category ID; unknown IDs remain valid and use registry fallback styles. */
  setSemanticType(type: string): void { text(type, "node.type"); this.semanticType = type; }
  getVisual(): VisualOverride<NodeStyle> { return clone(this.visual); }
  /** Copies a validated named visual/partial override; repaint the panel to refresh presentation. */
  setVisual(visual: VisualOverride<NodeStyle>): void { this.visual = validateVisualOverride(visual, "node"); }
  getAnnotation(): Annotation { return clone(this.annotation); }
  /** Retains a copy of text or HTML source without inserting it into the DOM. */
  setAnnotation(annotation: Annotation): void {
    if (!["text", "html"].includes(annotation.format) || typeof annotation.text !== "string") throw new TypeError("Invalid annotation");
    this.annotation = clone(annotation);
  }
  getHint(): string { return this.annotation.text; }
  setHint(hint: string): void { this.setAnnotation({ format: "text", text: hint }); }
  getURL(): string { return this.url; }
  setURL(url: string): void { if (typeof url !== "string") throw new TypeError("Expected URL string"); this.url = url; }
  getWeight(): number { return this.weight; }
  /** Sets nonnegative visual/RFC importance, independently of inherited TouchGraph repulsion and mass. */
  setWeight(weight: number): void { number(weight, "node.weight"); this.weight = weight; }
  getData(): Metadata { return clone(this.data); }
  /** Validates and copies JSON-compatible application metadata; getters return detached copies. */
  setData(data: Metadata): void { this.data = metadata(data); }
  getExtensions(): Metadata { return clone(this.extensions); }
  /** Copies JSON-compatible extension/provenance fields without interpreting their contents. */
  setExtensions(data: Metadata): void { this.extensions = metadata(data); }
  isPreselected(): boolean { return this.preselected; }
  setPreselected(value: boolean): void { this.preselected = value; }
  isKeyselected(): boolean { return this.keyselected; }
  setKeyselected(value: boolean): void { this.keyselected = value; }
  /** Installs the latest measured node-local outline for draw-space picking. */
  setOutline(outline: NodeOutline): void { this.outline = outline; }
  /** Tests the last rendered shape in draw pixels; before painting, uses base rectangular bounds. */
  override containsPoint(point: { x: number; y: number }): boolean;
  override containsPoint(x: number, y: number): boolean;
  override containsPoint(pointOrX: { x: number; y: number } | number, y = 0): boolean {
    const p = typeof pointOrX === "number" ? { x: pointOrX, y } : pointOrX;
    return this.outline ? this.outline.contains({ x: p.x - this.drawx, y: p.y - this.drawy }) : super.containsPoint(p);
  }
}
