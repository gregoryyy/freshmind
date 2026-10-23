/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { Node, Edge } from "../tg/model.js";
import { GraphEltSet } from "../tg/graph.js";
import type { EdgeStyle, NodeStyle, VisualOverride } from "./config/types.js";
import { clone, jsonData, number, record, text, validateVisualOverride } from "./config/validation.js";
import type { TypeRegistry } from "./config/registry.js";
import type { EdgeGeometry } from "./rendering/geometry.js";
import type { NodeOutline } from "./rendering/shapes.js";

/** Retained annotation source; an HTML format flag does not itself render or sanitize HTML. */
export interface Annotation { format: "text" | "html"; text: string; }
export type JsonValue = null | string | number | boolean | JsonValue[] | { [key: string]: JsonValue };
export type Metadata = Record<string, JsonValue>;
export interface FreshNodeOptions {
  type?: string; visual?: VisualOverride<NodeStyle>; annotation?: Annotation; url?: string;
  weight?: number; position?: { x: number; y: number }; fixed?: boolean; data?: Metadata; extensions?: Metadata;
}
export interface FreshEdgeOptions {
  id?: string; label?: string; type?: string; visual?: VisualOverride<EdgeStyle>;
  weight?: number; length?: number; data?: Metadata; extensions?: Metadata;
}
function metadata(value: unknown): Metadata { record(value, "metadata"); jsonData(value); return clone(value) as Metadata; }

/**
 * TouchGraph node extended with semantic metadata and transient presentation state.
 * Semantic type remains separate from the inherited numeric getType shape contract.
 * Metadata/visual values are copied at API boundaries; weights affect halos, not forces.
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
  /** Sets nonnegative visual halo weight, independently of the inherited physical repulsion. */
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
  /** Sets nonnegative stroke weight; it does not multiply spring attraction. */
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

/** Adds Freshmind identity/type invariants while retaining TouchGraph adjacency and traversal. */
export class FreshGraph extends GraphEltSet {
  override nodeAt(index:number):FreshNode{return super.nodeAt(index) as FreshNode;}
  override edgeAt(index:number):FreshEdge{return super.edgeAt(index) as FreshEdge;}
  override findNode(id:string|null):FreshNode|null{return super.findNode(id) as FreshNode|null;}
  override getNodes():IterableIterator<FreshNode>{return super.getNodes() as IterableIterator<FreshNode>;}
  override getEdges():IterableIterator<FreshEdge>{return super.getEdges() as IterableIterator<FreshEdge>;}
  /** Inserts only FreshNode instances, preserving base ID uniqueness and adjacency ownership. */
  override addNode(node: Node): void {
    if (!(node instanceof FreshNode)) throw new TypeError("FreshGraph requires FreshNode objects");
    super.addNode(node);
  }
  /**
   * Inserts/creates a FreshEdge without duplicating base graph membership or adjacency.
   * Assigns an unused eN ID when absent; duplicate explicit IDs are rejected.
   * @throws {TypeError} If the edge/endpoints are not Freshmind objects.
   * @throws {Error} If endpoints are absent or another edge has the same ID.
   */
  override addEdge(edge: Edge): FreshEdge;
  override addEdge(from: Node, to: Node, length?: number): FreshEdge;
  override addEdge(edgeOrFrom: Edge | Node, to?: Node, length?: number): FreshEdge {
    const edge = edgeOrFrom instanceof Edge ? edgeOrFrom : new FreshEdge(edgeOrFrom as FreshNode, to as FreshNode, { length });
    if (!(edge instanceof FreshEdge)) throw new TypeError("FreshGraph requires FreshEdge objects");
    if (!this.contains(edge.from) || !this.contains(edge.to)) throw new Error("Both endpoints must belong to the graph");
    if (this.contains(edge)) return edge;
    if (edge.getID() === null) {
      let id = 1; while ([...this.getEdges()].some(e => e.getID() === `e${id}`)) id++;
      edge.setID(`e${id}`);
    }
    if ([...this.getEdges()].some(e => e.getID() === edge.getID())) throw new Error(`Duplicate edge ID: ${edge.getID()}`);
    super.addEdge(edge); return edge;
  }
  /** Permanently removes a relation and clears its transient geometry when deletion succeeds. */
  override deleteEdge(edge:Edge|null):boolean;
  override deleteEdge(from:Node,to:Node):boolean;
  override deleteEdge(edgeOrFrom:Edge|Node|null,to?:Node):boolean {
    const edge=edgeOrFrom instanceof Node?(to?this.findEdge(edgeOrFrom,to):null):edgeOrFrom;
    const deleted=super.deleteEdge(edge);
    if(deleted&&edge instanceof FreshEdge)edge.setGeometry(null);
    return deleted;
  }
}
/** Document metadata aggregates the existing graph; it never duplicates live adjacency. */
export class FreshmindDocument {
  readonly graph = new FreshGraph();
  title = "";
  constructor(public types: TypeRegistry) {}
}
