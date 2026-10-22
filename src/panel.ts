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

import { select } from "d3-selection";
import type { Selection } from "d3-selection";
import { drag } from "d3-drag";
import { zoom, zoomIdentity } from "d3-zoom";
import type { ZoomBehavior } from "d3-zoom";
import { Edge, Node } from "./model.js";
import { GraphEltSet, VisibleLocality } from "./graph.js";
import { TGLayout } from "./layout.js";
import { LocalityUtils } from "./locality.js";
import { HyperLens, RotateLens, TGAbstractLens, TGLensSet, TranslateLens, ZoomLens } from "./lenses.js";
import type { TGPoint2D } from "./lenses.js";

export interface GraphListener { graphMoved?(): void; graphReset?(): void; }
export interface TGPanelOptions {
  autoStart?: boolean;
  animateLocality?: boolean;
  hyperbolic?: number;
  onSelect?: (node: Node | null) => void;
}
type SvgSelection = Selection<SVGSVGElement, unknown, null, undefined>;
type DragSubject = { x: number; y: number; node: Node };

/** SVG replaces Swing. Physics, locality and the invertible lens chain stay separate. */
export class TGPanel {
  readonly tgLayout: TGLayout;
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
  private edgeLayer?: Selection<SVGGElement, unknown, null, undefined>;
  private zoomBehavior?: ZoomBehavior<SVGSVGElement, unknown>;
  private resizeObserver?: ResizeObserver;
  private width = 800;
  private height = 600;
  private destroyed = false;

  constructor(private readonly container?: HTMLElement, private readonly options: TGPanelOptions = {}) {
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
  setLensSet(lenses: TGLensSet): void { this.lensSet = lenses; this.repaintAfterMove(); }
  getNodeCount(): number { return this.completeEltSet.nodeCount(); }
  visibleNodeCount(): number { return this.visibleLocality.nodeCount(); }
  nodeNum(): number { return this.visibleNodeCount(); }
  getAllNodes(): IterableIterator<Node> { return this.completeEltSet.getNodes(); }
  getAllEdges(): IterableIterator<Edge> { return this.completeEltSet.getEdges(); }
  findNode(id: string): Node | null { return this.completeEltSet.findNode(id); }
  findEdge(from: Node, to: Node): Edge | null { return this.completeEltSet.findEdge(from, to); }
  setGraphEltSet(graph: GraphEltSet): void {
    this.localityUtils.dispose();
    this.visibleLocality.removeAll();
    this.completeEltSet = graph;
    this.visibleLocality = new VisibleLocality(graph);
    this.localityUtils = new LocalityUtils(this.visibleLocality, this, this.options.animateLocality ?? Boolean(this.container));
    this.focus = null;
    this.setSelect(null);
    this.setDragNode(null);
    this.resetDamper();
    this.repaint();
  }
  addNode(node: Node): Node;
  addNode(label: string): Node;
  addNode(id: string | null, label: string | null): Node;
  addNode(nodeOrId: Node | string | null, label?: string | null): Node {
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
    this.resetDamper(); this.repaint();
    return deleted;
  }
  deleteNodeById(id: string): boolean { const node = this.findNode(id); return node ? this.deleteNode(node) : false; }
  deleteEdge(edge: Edge): boolean {
    const deleted = this.visibleLocality.deleteEdge(edge); this.resetDamper(); this.repaint(); return deleted;
  }
  hideEdge(edge: Edge): void { this.visibleLocality.removeEdge(edge); this.resetDamper(); this.repaint(); }
  clearAll(): void {
    this.localityUtils.dispose();
    this.visibleLocality.clearAll();
    this.localityUtils = new LocalityUtils(this.visibleLocality, this, this.options.animateLocality ?? Boolean(this.container));
    this.focus = null; this.clearSelect(); this.setDragNode(null); this.resetDamper(); this.repaint();
    for (const listener of this.listeners) listener.graphReset?.();
  }
  getSelect(): Node | null { return this.selected; }
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
  zoomBy(factor: number): void { if (this.svg && this.zoomBehavior) this.svg.call(this.zoomBehavior.scaleBy, factor); }

  private mount(container: HTMLElement): void {
    this.svg = select(container).append("svg").attr("class", "tg-panel")
      .attr("role", "group").attr("aria-label", "Interactive graph browser")
      .style("display", "block").style("width", "100%").style("height", "100%")
      .style("touch-action", "none").style("user-select", "none");
    this.edgeLayer = this.svg.append("g").attr("class", "tg-edges");
    this.nodeLayer = this.svg.append("g").attr("class", "tg-nodes");
    this.zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 5]).on("zoom", event => {
      this.zoomLens.scale = event.transform.k;
      this.panLens.x = event.transform.x - this.width / 2;
      this.panLens.y = event.transform.y - this.height / 2;
      this.repaintAfterMove();
    });
    this.svg.call(this.zoomBehavior).on("dblclick.zoom", null);
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
    this.visibleLocality.forAllNodes(node => this.updateDrawPos(node));
    if (!this.nodeLayer || !this.edgeLayer || !this.svg) return;
    if (this.focus && !this.completeEltSet.contains(this.focus)) this.focus = null;
    const edges = this.edgeLayer.selectAll<SVGLineElement, Edge>("line").data([...this.visibleLocality.getEdges()]).join("line");
    edges.attr("x1", edge => edge.from.drawx).attr("y1", edge => edge.from.drawy)
      .attr("x2", edge => edge.to.drawx).attr("y2", edge => edge.to.drawy)
      .attr("stroke", edge => edge.getColor()).attr("stroke-width", 1.2)
      .attr("opacity", edge => edge.from.markedForRemoval || edge.to.markedForRemoval ? 0.15 : 0.65);
    const nodes = this.nodeLayer.selectAll<SVGGElement, Node>("g.tg-node").data([...this.visibleLocality.getNodes()], node => node.getID()!)
      .join(enter => {
        const group = enter.append("g").attr("class", "tg-node").attr("tabindex", 0).attr("role", "button");
        group.append("rect").attr("class", "tg-shape");
        group.append("ellipse").attr("class", "tg-round-shape");
        group.append("text").attr("class", "tg-label").attr("text-anchor", "middle").attr("dominant-baseline", "central").style("pointer-events", "none");
        group.append("text").attr("class", "tg-hidden-count").attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#52645c");
        group.append("title");
        return group;
      });
    nodes.attr("data-node-id", node => node.getID()).attr("aria-label", node => `${node.getLabel()}, ${node.edgeCount()} connections`)
      .attr("aria-pressed", node => String(node === this.selected)).attr("transform", node => `translate(${node.drawx},${node.drawy})`)
      .attr("opacity", node => node.markedForRemoval ? 0.2 : 1).style("cursor", "grab")
      .on("click", (event: MouseEvent, node) => { event.stopPropagation(); this.setSelect(node); })
      .on("dblclick", (event: MouseEvent, node) => { event.stopPropagation(); void this.expandNode(node); })
      .on("keydown", (event: KeyboardEvent, node) => {
        if (event.key === "Enter") { event.preventDefault(); this.setSelect(node); }
        if (event.key === " ") { event.preventDefault(); void this.expandNode(node); }
      });
    nodes.select<SVGTextElement>(".tg-label").text(node => node.getLabel()).attr("fill", node => node === this.selected ? "#193b2d" : node.getTextColor()).style("font", node => node.getFont());
    nodes.each(function(node) {
      const group = select(this);
      const label = this.querySelector<SVGTextElement>(".tg-label")!;
      const width = Math.max(30, label.getComputedTextLength() + 20);
      const circle = node.getType() === Node.TYPE_CIRCLE;
      const round = circle || node.getType() === Node.TYPE_ELLIPSE;
      const height = circle ? width : 28;
      group.select(".tg-shape").attr("display", round ? "none" : null)
        .attr("x", -width / 2).attr("y", -height / 2).attr("width", width).attr("height", height)
        .attr("rx", node.getType() === Node.TYPE_ROUNDRECT ? 8 : 0);
      group.select(".tg-round-shape").attr("display", round ? null : "none").attr("rx", width / 2).attr("ry", height / 2);
      const hidden = node.edgeCount() - node.visibleEdgeCount();
      group.select(".tg-hidden-count").attr("y", height / 2 + 13).text(hidden > 0 ? `+${hidden}` : "");
    });
    nodes.selectAll<SVGElement, Node>(".tg-shape, .tg-round-shape")
      .attr("fill", node => node === this.selected ? Node.BACK_SELECT_COLOR : node.fixed ? Node.BACK_FIXED_COLOR : node.getBackColor())
      .attr("stroke", node => node === this.focus ? "#183b2b" : "#ffffff").attr("stroke-width", node => node === this.focus ? 2 : 1);
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
    this.svg?.on(".zoom", null).remove(); this.listeners.clear();
  }
}
