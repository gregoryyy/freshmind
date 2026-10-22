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

import { pointer, select } from "d3-selection";
import type { Selection } from "d3-selection";
import { drag } from "d3-drag";
import { zoom, zoomIdentity } from "d3-zoom";
import type { ZoomBehavior } from "d3-zoom";
import { Edge, Node } from "./model.js";
import { GraphEltSet, VisibleLocality } from "./graph.js";
import { TGLayout } from "./layout.js";
import { LocalityUtils } from "./locality.js";
import { HyperLens, RotateLens, TGAbstractLens, TGLensSet, TranslateLens, ZoomLens } from "./lenses.js";
import { TGPoint2D } from "./lenses.js";

export interface GraphListener { graphMoved?(): void; graphReset?(): void; }
export type TGInteractionMode = "navigate" | "edit";
export interface TGPanelOptions {
  autoStart?: boolean;
  animateLocality?: boolean;
  hyperbolic?: number;
  onSelect?: (node: Node | null) => void;
  interactionMode?: TGInteractionMode;
}
type SvgSelection = Selection<SVGSVGElement, unknown, null, undefined>;
type DragSubject = { x: number; y: number; node: Node };

/** SVG replaces Swing. Physics, locality and the invertible lens chain stay separate. */
export class TGPanel {
  private static nextId = 0;
  private readonly arrowId = `tg-arrow-${TGPanel.nextId++}`;
  tgLayout: TGLayout;
  readonly hyperLens: HyperLens;
  readonly rotateLens = new RotateLens();
  private completeEltSet = new GraphEltSet();
  private visibleLocality = new VisibleLocality(this.completeEltSet);
  private localityUtils: LocalityUtils;
  private lensSet = new TGLensSet();
  private zoomLens = new ZoomLens();
  private panLens = new TranslateLens();
  private originLens = new TranslateLens();
  private focus: Node | null = null;
  private selected: Node | null = null;
  private dragNode: Node | null = null;
  private dragFocusOrigin: { x: number; y: number } | null = null;
  private listeners = new Set<GraphListener>();
  private svg?: SvgSelection;
  private nodeLayer?: Selection<SVGGElement, unknown, null, undefined>;
  private badgeLayer?: Selection<SVGGElement, unknown, null, undefined>;
  private edgeLayer?: Selection<SVGGElement, unknown, null, undefined>;
  private zoomBehavior?: ZoomBehavior<SVGSVGElement, unknown>;
  private resizeObserver?: ResizeObserver;
  private width = 800;
  private height = 600;
  private destroyed = false;
  private mouseOverN: Node | null = null;
  private mouseOverE: Edge | null = null;
  private maintainMouseOver = false;
  private mousePos = new TGPoint2D();
  private topLeftDraw = new TGPoint2D();
  private bottomRightDraw = new TGPoint2D();
  private interactionMode: TGInteractionMode;

  constructor(private readonly container?: HTMLElement, private readonly options: TGPanelOptions = {}) {
    this.interactionMode = options.interactionMode ?? "navigate";
    this.hyperLens = new HyperLens(options.hyperbolic ?? 0);
    this.localityUtils = new LocalityUtils(this.visibleLocality, this, options.animateLocality ?? Boolean(container));
    this.tgLayout = new TGLayout(this);
    const focusLens = new class extends TGAbstractLens {
      constructor(private panel: TGPanel) { super(); }
      override applyLens(point: TGPoint2D): void {
        const focus = this.panel.dragFocusOrigin ?? this.panel.focus;
        point.x -= focus?.x ?? 0; point.y -= focus?.y ?? 0;
      }
      override undoLens(point: TGPoint2D): void {
        const focus = this.panel.dragFocusOrigin ?? this.panel.focus;
        point.x += focus?.x ?? 0; point.y += focus?.y ?? 0;
      }
    }(this);
    for (const lens of [focusLens, this.zoomLens, this.panLens, this.hyperLens, this.rotateLens, this.originLens]) this.lensSet.addLens(lens);
    if (container) { this.mount(container); if (options.autoStart !== false) this.tgLayout.start(); }
  }

  getGES(): VisibleLocality { return this.visibleLocality; }
  getCompleteEltSet(): GraphEltSet { return this.completeEltSet; }
  getLocalityUtils(): LocalityUtils { return this.localityUtils; }
  getLensSet(): TGLensSet { return this.lensSet; }
  getAdjustOriginLens(): TranslateLens { return this.originLens; }
  setTGLayout(layout: TGLayout): void {
    this.tgLayout.stop(); this.tgLayout = layout; this.tgLayout.setDragNode(this.dragNode);
    this.resetDamper();
    if (this.container && this.options.autoStart !== false && !this.destroyed) layout.start();
  }
  setLensSet(lenses: TGLensSet): void { this.lensSet = lenses; this.repaintAfterMove(); }
  getSize(): { width: number; height: number } { return { width: this.width, height: this.height }; }
  setBackColor(color: string): void { this.svg?.style("background-color", color); }
  getNodeCount(): number { return this.completeEltSet.nodeCount(); }
  getEdgeCount(): number { return this.completeEltSet.edgeCount(); }
  edgeNum(): number { return this.visibleEdgeCount(); }
  visibleEdgeCount(): number { return this.visibleLocality.edgeCount(); }
  visibleNodeCount(): number { return this.visibleLocality.nodeCount(); }
  nodeNum(): number { return this.visibleNodeCount(); }
  getAllNodes(): IterableIterator<Node> { return this.completeEltSet.getNodes(); }
  getAllEdges(): IterableIterator<Edge> { return this.completeEltSet.getEdges(); }
  findNode(id: string): Node | null { return this.completeEltSet.findNode(id); }
  findNodesByLabel(label: string): Node[] { return this.completeEltSet.findNodesByLabel(label); }
  findNodeLabelContaining(substring: string): Node | null { return this.completeEltSet.findNodeLabelContaining(substring); }
  findEdge(from: Node, to: Node): Edge | null { return this.completeEltSet.findEdge(from, to); }
  setGraphEltSet(graph: GraphEltSet): void {
    this.localityUtils.dispose();
    this.visibleLocality.removeAll();
    this.completeEltSet = graph;
    this.visibleLocality = new VisibleLocality(graph);
    this.localityUtils = new LocalityUtils(this.visibleLocality, this, this.options.animateLocality ?? Boolean(this.container));
    this.focus = null;
    this.mouseOverN = null; this.mouseOverE = null;
    this.setSelect(null);
    this.setDragNode(null);
    this.resetDamper();
    this.repaint();
  }
  addNode(): Node;
  addNode(node: Node): Node;
  addNode(label: string): Node;
  addNode(id: string | null, label: string | null): Node;
  addNode(nodeOrId: Node | string | null = null, label?: string | null): Node {
    const node = nodeOrId instanceof Node ? nodeOrId : label === undefined ? new Node(null, nodeOrId) : new Node(nodeOrId, label);
    this.visibleLocality.addNode(node);
    this.resetDamper(); this.repaint();
    return node;
  }
  addEdge(edge: Edge): Edge;
  addEdge(from: Node, to: Node, length?: number): Edge;
  addEdge(edgeOrFrom: Edge | Node, to?: Node, length?: number): Edge {
    const edge = edgeOrFrom instanceof Edge ? edgeOrFrom : new Edge(edgeOrFrom, to!, length);
    this.visibleLocality.addEdge(edge);
    this.resetDamper(); this.repaint();
    return edge;
  }
  deleteNode(node: Node): boolean {
    if (this.selected === node) this.clearSelect();
    if (this.focus === node) this.focus = null;
    if (this.dragNode === node) this.setDragNode(null);
    const deleted = this.visibleLocality.deleteNode(node);
    this.localityChanged();
    this.resetDamper(); this.repaint();
    return deleted;
  }
  deleteNodeById(id: string): boolean { const node = this.findNode(id); return node ? this.deleteNode(node) : false; }
  deleteEdge(edge: Edge): boolean;
  deleteEdge(from: Node, to: Node): boolean;
  deleteEdge(edgeOrFrom: Edge | Node, to?: Node): boolean {
    const edge = edgeOrFrom instanceof Edge ? edgeOrFrom : (to ? this.findEdge(edgeOrFrom, to) : null);
    const deleted = this.visibleLocality.deleteEdge(edge); this.localityChanged(); this.resetDamper(); this.repaint(); return deleted;
  }
  hideEdge(edge: Edge): void { this.visibleLocality.removeEdge(edge); this.localityChanged(); this.resetDamper(); this.repaint(); }
  clearAll(): void {
    this.localityUtils.dispose();
    this.visibleLocality.clearAll();
    this.localityUtils = new LocalityUtils(this.visibleLocality, this, this.options.animateLocality ?? Boolean(this.container));
    this.focus = null; this.clearSelect(); this.setDragNode(null); this.resetDamper(); this.repaint();
    this.localityChanged(); this.fireResetEvent();
  }
  getSelect(): Node | null { return this.selected; }
  getInteractionMode(): TGInteractionMode { return this.interactionMode; }
  setInteractionMode(mode: TGInteractionMode): void {
    this.interactionMode = mode;
    this.svg?.attr("data-interaction-mode", mode);
  }
  getMouseOverN(): Node | null { return this.mouseOverN; }
  getMouseOverE(): Edge | null { return this.mouseOverE; }
  setMouseOverN(node: Node | null): void {
    if (this.dragNode || this.maintainMouseOver) return;
    this.mouseOverN = node;
    if (node) this.mouseOverE = null;
  }
  setMouseOverE(edge: Edge | null): void {
    if (this.dragNode || this.maintainMouseOver) return;
    this.mouseOverE = this.mouseOverN ? null : edge;
  }
  setMaintainMouseOver(maintain: boolean): void { this.maintainMouseOver = maintain; }
  getMousePos(): TGPoint2D { return new TGPoint2D(this.mousePos); }
  /** The Java API picks one candidate in the box; it does not retain a selection set. */
  multiSelect(from: TGPoint2D, to: TGPoint2D): void {
    const candidates = [...this.visibleLocality.getNodes()].filter(node =>
      node.drawx > Math.min(from.x, to.x) && node.drawx < Math.max(from.x, to.x)
      && node.drawy > Math.min(from.y, to.y) && node.drawy < Math.max(from.y, to.y));
    this.setSelect(candidates[Math.trunc(Math.random() * candidates.length)] ?? null);
  }
  /** Clear references after removals, without selecting a new node during an animation. */
  localityChanged(): void {
    if (this.selected && !this.visibleLocality.contains(this.selected)) this.clearSelect();
    if (this.focus && !this.visibleLocality.contains(this.focus)) this.focus = null;
    if (this.dragNode && !this.visibleLocality.contains(this.dragNode)) this.setDragNode(null);
    if (this.mouseOverN && !this.visibleLocality.contains(this.mouseOverN)) this.mouseOverN = null;
    if (this.mouseOverE && !this.visibleLocality.contains(this.mouseOverE)) this.mouseOverE = null;
  }
  updateLocalityFromVisibility(): void {
    this.visibleLocality.updateLocalityFromVisibility(); this.localityChanged(); this.resetDamper(); this.repaint();
  }
  clearSelect(): void { this.setSelect(null); }
  setSelect(node: Node | null): void {
    this.selected = node;
    this.options.onSelect?.(node);
    this.repaint();
  }
  selectFirstNode(): void { this.setSelect(this.visibleLocality.getFirstNode()); }
  getDragNode(): Node | null { return this.dragNode; }
  setDragNode(node: Node | null): void {
    if (node && node === this.focus) this.dragFocusOrigin = { x: node.x, y: node.y };
    if (!node && this.dragFocusOrigin && this.focus) {
      this.panLens.x += (this.focus.x - this.dragFocusOrigin.x) * this.zoomLens.scale;
      this.panLens.y += (this.focus.y - this.dragFocusOrigin.y) * this.zoomLens.scale;
      this.dragFocusOrigin = null;
      if (this.svg && this.zoomBehavior) this.svg.call(this.zoomBehavior.transform,
        zoomIdentity.translate(this.width / 2 + this.panLens.x, this.height / 2 + this.panLens.y).scale(this.zoomLens.scale));
    }
    if (!node) this.dragFocusOrigin = null;
    this.dragNode = node; this.tgLayout.setDragNode(node);
  }
  setRigidity(value: number): void { this.tgLayout.setRigidity(value); }
  startDamper(): void { this.tgLayout.startDamper(); }
  stopDamper(): void { this.tgLayout.stopDamper(); }
  resetDamper(): void { this.tgLayout.resetDamper(); }
  stopMotion(): void { this.tgLayout.stopMotion(); }
  setLocale(node: Node | null, radius: number, maxAddEdgeCount = 1000, maxExpandEdgeCount = 1000, unidirectional = false): Promise<void> {
    return this.localityUtils.setLocale(node, radius, maxAddEdgeCount, maxExpandEdgeCount, unidirectional);
  }
  expandNode(node: Node): Promise<void> { return this.localityUtils.expandNode(node); }
  hideNode(node: Node): Promise<void> { return this.localityUtils.hideNode(node); }
  collapseNode(node: Node): Promise<void> { return this.localityUtils.collapseNode(node); }
  fastFinishAnimation(): void { this.localityUtils.fastFinishAnimation(); }
  /** Center the lens on a node while revealing its graph neighborhood. */
  focusNode(node: Node, radius = 2): Promise<void> {
    if (!this.completeEltSet.contains(node)) throw new Error("Focus node must belong to the graph");
    this.focus = node;
    this.setSelect(node);
    this.centerView();
    return this.setLocale(node, radius);
  }
  getFocus(): Node | null { return this.focus; }
  showAll(): void { this.localityUtils.fastFinishAnimation(); void this.setLocaleAll(); }
  async setLocaleAll(): Promise<void> {
    const first = this.completeEltSet.getFirstNode();
    if (first) await this.setLocale(first, LocalityUtils.INFINITE_LOCALITY_RADIUS);
  }
  setHyperbolic(value: number): void { this.hyperLens.setValue(value); this.repaintAfterMove(); }
  setRotation(radians: number): void { this.rotateLens.angle = radians; this.repaintAfterMove(); }
  addGraphListener(listener: GraphListener): void { this.listeners.add(listener); }
  removeGraphListener(listener: GraphListener): void { this.listeners.delete(listener); }
  fireResetEvent(): void { for (const listener of this.listeners) listener.graphReset?.(); }
  getDrawCenter(): TGPoint2D { return new TGPoint2D(this.width / 2, this.height / 2); }
  getCenter(): TGPoint2D { return this.lensSet.convDrawToReal(this.getDrawCenter()); }
  getTopLeftDraw(): TGPoint2D { return new TGPoint2D(this.topLeftDraw); }
  getBottomRightDraw(): TGPoint2D { return new TGPoint2D(this.bottomRightDraw); }
  updateGraphSize(): void {
    const nodes = [...this.visibleLocality.getNodes()];
    this.topLeftDraw.setLocation(nodes.length ? Math.min(...nodes.map(node => node.drawx)) : 0,
      nodes.length ? Math.min(...nodes.map(node => node.drawy)) : 0);
    this.bottomRightDraw.setLocation(nodes.length ? Math.max(...nodes.map(node => node.drawx)) : 0,
      nodes.length ? Math.max(...nodes.map(node => node.drawy)) : 0);
  }
  updateDrawPositions(): void { this.visibleLocality.forAllNodes(node => this.updateDrawPos(node)); }
  processGraphMove(): void { this.updateDrawPositions(); this.updateGraphSize(); }
  updateDrawPos(node: Node): void {
    const point = this.lensSet.convRealToDraw(node.x, node.y); node.drawx = point.x; node.drawy = point.y;
  }
  updatePosFromDraw(node: Node): void {
    const point = this.lensSet.convDrawToReal(node.drawx, node.drawy); node.x = point.x; node.y = point.y;
  }
  repaintAfterMove(): void {
    this.repaint();
    for (const listener of this.listeners) listener.graphMoved?.();
  }
  centerView(): void {
    if (this.svg && this.zoomBehavior) this.svg.call(this.zoomBehavior.transform, zoomIdentity.translate(this.width / 2, this.height / 2).scale(this.zoomLens.scale));
    else { this.panLens.x = 0; this.panLens.y = 0; this.repaintAfterMove(); }
  }
  getZoom(): number { return this.zoomLens.scale; }
  setZoom(scale: number): void {
    if (!Number.isFinite(scale) || scale <= 0) throw new RangeError("Zoom must be a positive finite scale");
    scale = Math.max(.15, Math.min(5, scale));
    if (this.svg && this.zoomBehavior) this.svg.call(this.zoomBehavior.scaleTo, scale);
    else { this.zoomLens.scale = scale; this.repaintAfterMove(); }
  }
  zoomBy(factor: number): void { this.setZoom(this.zoomLens.scale * factor); }

  private mount(container: HTMLElement): void {
    this.svg = select(container).append("svg").attr("class", "tg-panel")
      .attr("data-interaction-mode", this.interactionMode)
      .attr("role", "group").attr("aria-label", "Interactive graph browser")
      .style("display", "block").style("width", "100%").style("height", "100%")
      .style("touch-action", "none").style("user-select", "none");
    this.svg.append("defs").append("marker").attr("id", this.arrowId).attr("viewBox", "0 0 10 10")
      .attr("refX", 9).attr("refY", 5).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M 0 0 L 10 5 L 0 10 Z").attr("fill", "context-stroke");
    this.edgeLayer = this.svg.append("g").attr("class", "tg-edges");
    this.nodeLayer = this.svg.append("g").attr("class", "tg-nodes");
    this.badgeLayer = this.svg.append("g").attr("class", "tg-hidden-counts").attr("aria-hidden", "true")
      .style("pointer-events", "none");
    this.zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 5])
      .filter(event => !event.shiftKey && (!event.ctrlKey || event.type === "wheel") && !event.button).on("zoom", event => {
      this.zoomLens.scale = event.transform.k;
      this.panLens.x = event.transform.x - this.width / 2;
      this.panLens.y = event.transform.y - this.height / 2;
      this.repaintAfterMove();
    });
    this.svg.call(this.zoomBehavior).on("dblclick.zoom", null);
    this.svg.on("mousemove.position", event => {
      const [x, y] = pointer(event, this.svg!.node()); this.mousePos.setLocation(x, y);
    }).on("click.selection", event => { if (event.target === this.svg!.node()) this.clearSelect(); });
    this.svg.on("dblclick.edit", event => {
      if (this.interactionMode !== "edit" || event.target !== this.svg!.node()) return;
      const [x, y] = pointer(event, this.svg!.node());
      const position = this.lensSet.convDrawToReal(x, y);
      const node = this.addNode("New node");
      node.setLocation(position); this.setSelect(node); this.resetDamper();
    });
    let boxStart = new TGPoint2D();
    let box: Selection<SVGRectElement, unknown, null, undefined> | undefined;
    this.svg.call(drag<SVGSVGElement, unknown>().container(this.svg.node()!)
      .filter(event => event.shiftKey && !event.button && event.target === this.svg!.node())
      .on("start", event => {
        boxStart = new TGPoint2D(event.x, event.y);
        box = this.svg!.append("rect").attr("class", "tg-selection-box").attr("fill", "#42674a22")
          .attr("stroke", "#42674a").style("pointer-events", "none");
      }).on("drag", event => {
        box?.attr("x", Math.min(boxStart.x, event.x)).attr("y", Math.min(boxStart.y, event.y))
          .attr("width", Math.abs(event.x - boxStart.x)).attr("height", Math.abs(event.y - boxStart.y));
      }).on("end", event => { box?.remove(); this.multiSelect(boxStart, new TGPoint2D(event.x, event.y)); }));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.centerView();
  }
  private resize(): void {
    if (!this.container || !this.svg) return;
    const oldWidth = this.width;
    const oldHeight = this.height;
    this.width = this.container.clientWidth || 800;
    this.height = this.container.clientHeight || 600;
    this.originLens.x = this.width / 2; this.originLens.y = this.height / 2;
    this.svg.attr("viewBox", `0 0 ${this.width} ${this.height}`);
    // Keep d3's translation and the origin lens consistent after a resize.
    if (this.zoomBehavior && (oldWidth !== this.width || oldHeight !== this.height)) {
      const transform = zoomIdentity.translate(this.width / 2 + this.panLens.x, this.height / 2 + this.panLens.y).scale(this.zoomLens.scale);
      this.svg.call(this.zoomBehavior.transform, transform);
    }
    this.repaint();
  }
  repaint(): void {
    if (this.destroyed) return;
    this.processGraphMove();
    if (!this.nodeLayer || !this.edgeLayer || !this.svg) return;
    if (this.focus && !this.completeEltSet.contains(this.focus)) this.focus = null;
    const nodes = this.nodeLayer.selectAll<SVGGElement, Node>("g.tg-node").data([...this.visibleLocality.getNodes()], node => node.getID()!)
      .join(enter => {
        const group = enter.append("g").attr("class", "tg-node").attr("tabindex", 0).attr("role", "button");
        group.append("rect").attr("class", "tg-shape");
        group.append("ellipse").attr("class", "tg-round-shape");
        group.append("text").attr("class", "tg-label").attr("text-anchor", "middle").attr("dominant-baseline", "central").style("pointer-events", "none");
        group.append("title");
        return group;
      });
    nodes.attr("data-node-id", node => node.getID()).attr("aria-label", node => {
      const hidden = node.edgeCount() - node.visibleEdgeCount();
      return `${node.getLabel()}, ${node.edgeCount()} connections${hidden > 0 ? `, ${hidden} hidden` : ""}`;
    })
      .attr("aria-pressed", node => String(node === this.selected)).attr("transform", node => `translate(${node.drawx},${node.drawy})`)
      .attr("opacity", node => node.markedForRemoval ? 0.2 : 1).style("cursor", "grab")
      .on("mouseenter", (_event, node) => { this.setMouseOverN(node); this.repaint(); })
      .on("mouseleave", () => { this.setMouseOverN(null); this.repaint(); })
      .on("click", (event: MouseEvent, node) => {
        event.stopPropagation();
        if (this.interactionMode === "edit" && event.shiftKey && this.selected && this.selected !== node
          && this.visibleLocality.contains(this.selected) && !this.findEdge(this.selected, node)) this.addEdge(this.selected, node);
        this.setSelect(node === this.selected ? null : node);
      })
      .on("dblclick", (event: MouseEvent, node) => { event.stopPropagation(); if (this.interactionMode === "navigate") void this.expandNode(node); })
      .on("keydown", (event: KeyboardEvent, node) => {
        if (event.key === "Enter") { event.preventDefault(); this.setSelect(node); }
        if (event.key === " ") { event.preventDefault(); void this.expandNode(node); }
        if (event.key === "Escape") { event.preventDefault(); this.clearSelect(); }
        if (this.interactionMode === "edit" && (event.key === "Delete" || event.key === "Backspace")) {
          event.preventDefault(); this.deleteNode(node);
        }
      });
    nodes.select<SVGTextElement>(".tg-label").text(node => node.getLabel()).attr("fill", node => node === this.selected ? "#193b2d" : node.getTextColor()).style("font", node => node.getFont());
    nodes.each(function(node) {
      const group = select(this);
      const label = this.querySelector<SVGTextElement>(".tg-label")!;
      const width = Math.max(30, label.getComputedTextLength() + 20);
      const circle = node.getType() === Node.TYPE_CIRCLE;
      const round = circle || node.getType() === Node.TYPE_ELLIPSE;
      const height = circle ? width : 28;
      node.setDimensions(width, height);
      group.select(".tg-shape").attr("display", round ? "none" : null)
        .attr("x", -width / 2).attr("y", -height / 2).attr("width", width).attr("height", height)
        .attr("rx", node.getType() === Node.TYPE_ROUNDRECT ? 8 : 0);
      group.select(".tg-round-shape").attr("display", round ? null : "none").attr("rx", width / 2).attr("ry", height / 2);
    });
    // Keep annotations outside the focusable group's SVG bounds. Browser outlines
    // otherwise enclose the count as well as the node body. The extra gap also
    // clears the demo's keyboard focus outline and its offset.
    this.badgeLayer?.selectAll<SVGTextElement, Node>("text")
      .data([...this.visibleLocality.getNodes()].filter(node => node.visibleEdgeCount() < node.edgeCount()), node => node.getID()!)
      .join("text").attr("class", "tg-hidden-count").attr("data-for-node", node => node.getID())
      .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#52645c")
      .attr("x", node => node.drawx).attr("y", node => node.drawy + node.getHeight() / 2 + 18)
      .attr("opacity", node => node.markedForRemoval ? .2 : 1)
      .text(node => `+${node.edgeCount() - node.visibleEdgeCount()}`);
    nodes.selectAll<SVGElement, Node>(".tg-shape, .tg-round-shape")
      .attr("fill", node => node === this.selected ? Node.BACK_SELECT_COLOR : node.fixed ? Node.BACK_FIXED_COLOR : node.getBackColor())
      .attr("stroke", node => node === this.dragNode ? Node.BORDER_DRAG_COLOR : node === this.mouseOverN
        ? Node.BORDER_MOUSE_OVER_COLOR : node === this.focus ? "#183b2b" : Node.BORDER_INACTIVE_COLOR)
      .attr("stroke-width", node => node === this.focus ? 2 : 1);
    const endpoint = (edge: Edge) => {
      const dx = edge.from.drawx - edge.to.drawx, dy = edge.from.drawy - edge.to.drawy;
      const rx = edge.to.getWidth() / 2 + 4, ry = edge.to.getHeight() / 2 + 4;
      const round = edge.to.getType() === Node.TYPE_CIRCLE || edge.to.getType() === Node.TYPE_ELLIPSE;
      const scale = Math.min(1, round ? 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
        : Math.min(rx / Math.abs(dx), ry / Math.abs(dy)));
      return { x: edge.to.drawx + dx * scale, y: edge.to.drawy + dy * scale };
    };
    this.edgeLayer.selectAll<SVGLineElement, Edge>("line").data([...this.visibleLocality.getEdges()]).join("line")
      .attr("x1", edge => edge.from.drawx).attr("y1", edge => edge.from.drawy)
      .attr("x2", edge => endpoint(edge).x).attr("y2", edge => endpoint(edge).y)
      .attr("marker-end", `url(#${this.arrowId})`)
      .attr("stroke", edge => edge === this.mouseOverE ? Edge.MOUSE_OVER_COLOR : edge.getColor()).attr("stroke-width", 1.2)
      .attr("opacity", edge => edge.from.markedForRemoval || edge.to.markedForRemoval ? 0.15 : 0.65)
      .on("mouseenter", (_event, edge) => { this.setMouseOverE(edge); this.repaint(); })
      .on("mouseleave", () => { this.setMouseOverE(null); this.repaint(); });
    nodes.select("title").text(node => `${node.getLabel()}${node.fixed ? " (pinned)" : ""}\nDouble-click or press Space to expand`);
    const behavior = drag<SVGGElement, Node, DragSubject>().container(this.svg.node()!)
      .subject((_event, node) => ({ x: node.drawx, y: node.drawy, node }))
      .on("start", event => { this.setDragNode(event.subject.node); this.stopDamper(); })
      .on("drag", event => {
        const node = event.subject.node;
        node.drawx = event.x; node.drawy = event.y;
        this.updatePosFromDraw(node);
        this.repaintAfterMove();
      })
      .on("end", () => { this.setDragNode(null); this.resetDamper(); });
    nodes.call(behavior);
  }
  destroy(): void {
    this.destroyed = true; this.localityUtils.dispose(); this.tgLayout.stop(); this.resizeObserver?.disconnect();
    this.svg?.on(".zoom", null).on(".drag", null).on(".position", null).on(".selection", null).on(".edit", null).remove(); this.listeners.clear();
  }
}
