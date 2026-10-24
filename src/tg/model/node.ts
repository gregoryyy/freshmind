/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import type {Edge} from "./edge.js";

/**
 * TouchGraph node shared by the complete graph and its visible locality.
 * `x`/`y` are physical coordinates, `dx`/`dy` carry layout momentum, and
 * `drawx`/`drawy` are lens-transformed renderer coordinates before canvas scale/pan.
 * Colors and fonts use CSS strings.
 */
export class Node {
  static readonly TYPE_RECTANGLE = 1;
  static readonly TYPE_ROUNDRECT = 2;
  static readonly TYPE_ELLIPSE = 3;
  static readonly TYPE_CIRCLE = 4;
  static DEFAULT_TYPE = Node.TYPE_RECTANGLE;
  static BACK_DEFAULT_COLOR = "#d06000";
  static BACK_FIXED_COLOR = "#dc4545";
  static BACK_SELECT_COLOR = "#ffe000";
  static BACK_HILIGHT_COLOR = "#ffb200";
  static BORDER_DRAG_COLOR = "#000000";
  static BORDER_MOUSE_OVER_COLOR = "#a0a0a0";
  static BORDER_INACTIVE_COLOR = "#ffffff";
  static TEXT_COLOR = "#ffffff";
  static TEXT_FONT = "12px monospace";

  static setNodeBackDefaultColor(color: string): void { this.BACK_DEFAULT_COLOR = color; }
  static setNodeBackFixedColor(color: string): void { this.BACK_FIXED_COLOR = color; }
  static setNodeBackSelectColor(color: string): void { this.BACK_SELECT_COLOR = color; }
  static setNodeBackHilightColor(color: string): void { this.BACK_HILIGHT_COLOR = color; }
  static setNodeBorderDragColor(color: string): void { this.BORDER_DRAG_COLOR = color; }
  static setNodeBorderMouseOverColor(color: string): void { this.BORDER_MOUSE_OVER_COLOR = color; }
  static setNodeBorderInactiveColor(color: string): void { this.BORDER_INACTIVE_COLOR = color; }
  static setNodeTextColor(color: string): void { this.TEXT_COLOR = color; }
  static setNodeTextFont(font: string): void { this.TEXT_FONT = font; }
  static setNodeType(type: number): void { this.DEFAULT_TYPE = type; }

  x = Math.random() * 2 - 1;
  y = Math.random() * 2 - 1;
  dx = 0;
  dy = 0;
  drawx = 0;
  drawy = 0;
  fixed = false;
  repulsion = 100;
  visibleEdgeCnt = 0;
  justMadeLocal = false;
  markedForRemoval = false;
  private visible = false;
  private edges: Edge[] = [];
  private id: string | null;
  private label: string;
  private type = Node.DEFAULT_TYPE;
  private backColor = Node.BACK_DEFAULT_COLOR;
  private textColor = Node.TEXT_COLOR;
  private font = Node.TEXT_FONT;
  private width = 10;
  private height = 6;

  /**
   * Creates a detached node; graph insertion assigns an ID when it is null.
   * Initial physical coordinates are randomized near the origin, as in Java.
   * @param id Identity independent of the displayed label.
   */
  constructor(id?: string | null, label?: string | null);
  constructor(id: string | null, type: number, color: string, label: string | null);
  constructor(id: string | null = null, labelOrType?: string | number | null, color?: string, label?: string | null) {
    this.id = id;
    if (typeof labelOrType === "number") {
      this.type = labelOrType;
      this.backColor = color ?? Node.BACK_DEFAULT_COLOR;
      this.label = label ?? id ?? "";
    } else {
      this.label = labelOrType ?? id ?? "";
    }
  }

  getID(): string | null { return this.id; }
  setID(id: string): void { this.id = id; }
  getLabel(): string { return this.label; }
  setLabel(label: string): void { this.label = label; }
  getType(): number { return this.type; }
  setType(type: number): void { this.type = type; }
  getBackColor(): string { return this.backColor; }
  setBackColor(color: string): void { this.backColor = color; }
  getTextColor(): string { return this.textColor; }
  setTextColor(color: string): void { this.textColor = color; }
  getFont(): string { return this.font; }
  setFont(font: string): void { this.font = font; }
  /** Returns a new integer coordinate pair, retaining Java Point truncation. */
  getLocation(): { x: number; y: number } { return { x: Math.trunc(this.x), y: Math.trunc(this.y) }; }
  /** Sets physical coordinates without changing momentum or refreshing draw coordinates. */
  setLocation(point: { x: number; y: number }): void { this.x = point.x; this.y = point.y; }
  isVisible(): boolean { return this.visible; }
  /** Sets the flag only; reconcile locality membership through the graph/panel API. */
  setVisible(visible: boolean): void { this.visible = visible; }
  isFixed(): boolean { return this.fixed; }
  getFixed(): boolean { return this.fixed; }
  setFixed(fixed: boolean): void { this.fixed = fixed; }
  getRepulsion(): number { return this.repulsion; }
  /** Stores a signed int32 repulsion value for Java-compatible force arithmetic. */
  setRepulsion(repulsion: number): void { this.repulsion = repulsion | 0; }
  edgeCount(): number { return this.edges.length; }
  edgeNum(): number { return this.edgeCount(); }
  visibleEdgeCount(): number { return this.visibleEdgeCnt; }
  edgeAt(index: number): Edge {
    const edge = this.edges[index];
    if (!edge) throw new RangeError(`No edge at index ${index}`);
    return edge;
  }
  getEdges(): IterableIterator<Edge> { return this.edges.values(); }
  addEdge(edge: Edge): void { this.edges.push(edge); }
  removeEdge(edge: Edge): void {
    const index = this.edges.indexOf(edge);
    if (index >= 0) this.edges.splice(index, 1);
  }
  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }
  /** SVG text measurement replaces AWT FontMetrics; layout continues to use point forces. */
  setDimensions(width: number, height: number): void { this.width = width; this.height = height; }
  intersects(size: { width: number; height: number }): boolean {
    return this.drawx > 0 && this.drawx < size.width && this.drawy > 0 && this.drawy < size.height;
  }
  /** Tests the open rectangular body bounds in draw pixels, regardless of shape type. */
  containsPoint(point: { x: number; y: number }): boolean;
  containsPoint(x: number, y: number): boolean;
  containsPoint(pointOrX: { x: number; y: number } | number, y = 0): boolean {
    const x = typeof pointOrX === "number" ? pointOrX : pointOrX.x;
    const py = typeof pointOrX === "number" ? y : pointOrX.y;
    return x > this.drawx - this.width / 2 && x < this.drawx + this.width / 2
      && py > this.drawy - this.height / 2 && py < this.drawy + this.height / 2;
  }
}
