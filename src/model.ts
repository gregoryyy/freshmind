/*
 * TouchGraph LLC. Apache-Style Software License
 *
 *
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer. 
 *
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *
 * 3. The end-user documentation included with the redistribution,
 *    if any, must include the following acknowledgment:  
 *       "This product includes software developed by 
 *        TouchGraph LLC (http://www.touchgraph.com/)."
 *    Alternately, this acknowledgment may appear in the software itself,
 *    if and wherever such third-party acknowledgments normally appear.
 *
 * 4. The names "TouchGraph" or "TouchGraph LLC" must not be used to endorse 
 *    or promote products derived from this software without prior written 
 *    permission.  For written permission, please contact 
 *    alex@touchgraph.com
 *
 * 5. Products derived from this software may not be called "TouchGraph",
 *    nor may "TouchGraph" appear in their name, without prior written
 *    permission of alex@touchgraph.com.
 *
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL TOUCHGRAPH OR ITS CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR 
 * BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, 
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE 
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, 
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * ====================================================================
 *
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

/** Core objects retain the Java names. Browser colors and fonts use CSS strings. */
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
  getLocation(): { x: number; y: number } { return { x: Math.trunc(this.x), y: Math.trunc(this.y) }; }
  setLocation(point: { x: number; y: number }): void { this.x = point.x; this.y = point.y; }
  isVisible(): boolean { return this.visible; }
  setVisible(visible: boolean): void { this.visible = visible; }
  isFixed(): boolean { return this.fixed; }
  getFixed(): boolean { return this.fixed; }
  setFixed(fixed: boolean): void { this.fixed = fixed; }
  getRepulsion(): number { return this.repulsion; }
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
  containsPoint(point: { x: number; y: number }): boolean;
  containsPoint(x: number, y: number): boolean;
  containsPoint(pointOrX: { x: number; y: number } | number, y = 0): boolean {
    const x = typeof pointOrX === "number" ? pointOrX : pointOrX.x;
    const py = typeof pointOrX === "number" ? y : pointOrX.y;
    return x > this.drawx - this.width / 2 && x < this.drawx + this.width / 2
      && py > this.drawy - this.height / 2 && py < this.drawy + this.height / 2;
  }
}

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
  setLength(length: number): void {
    if (!Number.isInteger(length) || length <= 0) throw new RangeError("Edge length must be a positive integer");
    this.length = length;
  }
  isVisible(): boolean { return this.visible; }
  setVisible(visible: boolean): void { this.visible = visible; }
  getOtherEndpt(node: Node): Node { return this.to !== node ? this.to : this.from; }
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
