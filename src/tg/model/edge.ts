/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import type {Node} from "./node.js";

/** Directed relation whose physical length controls the TouchGraph spring attraction. */
export class Edge {
  static DEFAULT_LENGTH = 40;
  static DEFAULT_COLOR = "#8c9690";
  static MOUSE_OVER_COLOR = "#ffb200";
  static setEdgeDefaultLength(length: number): void { this.DEFAULT_LENGTH = length; }
  static setEdgeDefaultColor(color: string): void { this.DEFAULT_COLOR = color; }
  static setEdgeMouseOverColor(color: string): void { this.MOUSE_OVER_COLOR = color; }
  private id: string | null = null;
  private color = Edge.DEFAULT_COLOR;
  private visible = false;
  private length: number;

  /** Creates a detached edge; graph insertion maintains the endpoints' adjacency lists. */
  constructor(public from: Node, public to: Node, length = Edge.DEFAULT_LENGTH) {
    this.length = 0;
    this.setLength(length);
  }

  getFrom(): Node { return this.from; }
  getTo(): Node { return this.to; }
  getID(): string | null { return this.id; }
  setID(id: string): void { this.id = id; }
  getColor(): string { return this.color; }
  setColor(color: string): void { this.color = color; }
  getLength(): number { return this.length; }
  /**
   * Sets the physical spring parameter, independently of the rendered edge length.
   * @throws {RangeError} If length is not a positive integer.
   */
  setLength(length: number): void {
    if (!Number.isInteger(length) || length <= 0) throw new RangeError("Edge length must be a positive integer");
    this.length = length;
  }
  isVisible(): boolean { return this.visible; }
  setVisible(visible: boolean): void { this.visible = visible; }
  /** Returns the other endpoint; callers must supply an endpoint of this edge. */
  getOtherEndpt(node: Node): Node { return this.to !== node ? this.to : this.from; }
  /** Reverses direction without changing graph membership, adjacency order or length. */
  reverse(): void { [this.from, this.to] = [this.to, this.from]; }
  intersects(size: { width: number; height: number }): boolean {
    return (this.from.drawx > 0 || this.to.drawx > 0) && (this.from.drawx < size.width || this.to.drawx < size.width)
      && (this.from.drawy > 0 || this.to.drawy > 0) && (this.from.drawy < size.height || this.to.drawy < size.height);
  }
  /** Preserve Java's axis-based hit-distance approximation and 8-pixel bounding margin. */
  distFromPoint(x: number, y: number): number {
    const x1 = this.from.drawx, y1 = this.from.drawy, x2 = this.to.drawx, y2 = this.to.drawy;
    if (x < Math.min(x1, x2) - 8 || x > Math.max(x1, x2) + 8 || y < Math.min(y1, y2) - 8 || y > Math.max(y1, y2) + 8) return 1000;
    let distance = 1000;
    if (x1 !== x2) distance = Math.abs((y2 - y1) / (x2 - x1) * (x - x1) + (y1 - y));
    if (y1 !== y2) distance = Math.min(distance, Math.abs((x2 - x1) / (y2 - y1) * (y - y1) + (x1 - x)));
    return distance;
  }
  containsPoint(x: number, y: number): boolean { return this.distFromPoint(x, y) < 10; }
}
