/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../LICENSE and ../../NOTICE.
 * Redistribute this source with those files.
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
  private scene?: Selection<SVGGElement, unknown, null, undefined>;
  private canvasTransform = zoomIdentity;
  private nodeLayer?: Selection<SVGGElement, unknown, null, undefined>;
  private badgeLayer?: Selection<SVGGElement, unknown, null, undefined>;
  private edgeLayer?: Selection<SVGGElement, unknown, null, undefined>;
  private decorationLayer?: Selection<SVGGElement, unknown, null, undefined>;
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

  /**
   * Creates a panel with the standard focus/zoom/pan/hyperbolic/rotation lens chain.
   * @param container SVG host; omit for graph, locality and lens operations without a DOM.
   * @param options Controls layout startup, locality animation and interaction callbacks.
   */
  constructor(protected container?: HTMLElement, private readonly options: TGPanelOptions = {}) {
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

  /** Factory hook for addNode overloads and edit gestures; does not insert the new node. */
  protected createNode(id: string | null, label: string | null): Node { return new Node(id, label); }
  /** Factory hook for endpoint-based creation; existing edge objects bypass this hook. */
  protected createEdge(from: Node, to: Node, length?: number): Edge { return new Edge(from, to, length); }

  /** Returns the visible subset used by the layout and renderer. */
  getGES(): VisibleLocality { return this.visibleLocality; }
  /** Returns stored graph membership, including elements hidden from the current view. */
  getCompleteEltSet(): GraphEltSet { return this.completeEltSet; }
  getLocalityUtils(): LocalityUtils { return this.localityUtils; }
  getLensSet(): TGLensSet { return this.lensSet; }
  getAdjustOriginLens(): TranslateLens { return this.originLens; }
  /** Stops the old layout, transfers drag state, and starts the replacement if enabled. */
  setTGLayout(layout: TGLayout): void {
    this.tgLayout.stop(); this.tgLayout = layout; this.tgLayout.setDragNode(this.dragNode);
    this.resetDamper();
    if (this.container && this.options.autoStart !== false && !this.destroyed) layout.start();
  }
  /**
   * Replaces the complete transform chain and refreshes draw positions.
   * Callers own the replacement's viewport transforms and inverse behavior.
   */
  setLensSet(lenses: TGLensSet): void { this.lensSet = lenses; this.repaintAfterMove(); }
  getSize(): { width: number; height: number } { return { width: this.width, height: this.height }; }
  setBackColor(color: string): void { this.svg?.style("background-color", color); }
  getNodeCount(): number { return this.completeEltSet.nodeCount(); }
  getEdgeCount(): number { return this.completeEltSet.edgeCount(); }
  edgeNum(): number { return this.visibleEdgeCount(); }
  visibleEdgeCount(): number { return this.getGES().edgeCount(); }
  visibleNodeCount(): number { return this.getGES().nodeCount(); }
  nodeNum(): number { return this.visibleNodeCount(); }
  getAllNodes(): IterableIterator<Node> { return this.completeEltSet.getNodes(); }
  getAllEdges(): IterableIterator<Edge> { return this.completeEltSet.getEdges(); }
  findNode(id: string): Node | null { return this.completeEltSet.findNode(id); }
  findNodesByLabel(label: string): Node[] { return this.completeEltSet.findNodesByLabel(label); }
  findNodeLabelContaining(substring: string): Node | null { return this.completeEltSet.findNodeLabelContaining(substring); }
  findEdge(from: Node, to: Node): Edge | null { return this.completeEltSet.findEdge(from, to); }
  /**
   * Replaces the stored graph and installs an initially empty visible locality.
   * Cancels old locality work and clears focus, selection, hover and drag references.
   * Use setLocale or setLocaleAll to reveal the replacement's elements.
   */
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
  /** Creates or inserts a visible node, then wakes the layout and repaints. */
  addNode(): Node;
  addNode(node: Node): Node;
  addNode(label: string): Node;
  addNode(id: string | null, label: string | null): Node;
  addNode(nodeOrId: Node | string | null = null, label?: string | null): Node {
    const node = nodeOrId instanceof Node ? nodeOrId : label === undefined ? this.createNode(null, nodeOrId) : this.createNode(nodeOrId, label);
    this.visibleLocality.addNode(node);
    this.resetDamper(); this.repaint();
    return node;
  }
  /** Inserts a visible edge whose endpoints are visible; endpoint overloads use createEdge. */
  addEdge(edge: Edge): Edge;
  addEdge(from: Node, to: Node, length?: number): Edge;
  addEdge(edgeOrFrom: Edge | Node, to?: Node, length?: number): Edge {
    const edge = edgeOrFrom instanceof Edge ? edgeOrFrom : this.createEdge(edgeOrFrom, to!, length);
    this.visibleLocality.addEdge(edge);
    this.resetDamper(); this.repaint();
    return edge;
  }
  /** Permanently deletes a node and incident edges, clearing stale panel references. */
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
  /** Removes an edge from the view while preserving its stored identity and adjacency. */
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
  /** Returns the last pointer position in renderer coordinates, before canvas scaling/pan. */
  getMousePos(): TGPoint2D { return new TGPoint2D(this.mousePos); }
  /** Picks one node inside a box in renderer coordinates, retaining Java's one-candidate semantics. */
  multiSelect(from: TGPoint2D, to: TGPoint2D): void {
    const candidates = [...this.getGES().getNodes()].filter(node =>
      node.drawx > Math.min(from.x, to.x) && node.drawx < Math.max(from.x, to.x)
      && node.drawy > Math.min(from.y, to.y) && node.drawy < Math.max(from.y, to.y));
    this.setSelect(candidates[Math.trunc(Math.random() * candidates.length)] ?? null);
  }
  /** Clear references after removals, without selecting a new node during an animation. */
  localityChanged(): void {
    if (this.selected && !this.getGES().contains(this.selected)) this.clearSelect();
    if (this.focus && !this.getGES().contains(this.focus)) this.focus = null;
    if (this.dragNode && !this.getGES().contains(this.dragNode)) this.setDragNode(null);
    if (this.mouseOverN && !this.getGES().contains(this.mouseOverN)) this.mouseOverN = null;
    if (this.mouseOverE && !this.getGES().contains(this.mouseOverE)) this.mouseOverE = null;
  }
  updateLocalityFromVisibility(): void {
    this.getGES().updateLocalityFromVisibility(); this.localityChanged(); this.resetDamper(); this.repaint();
  }
  clearSelect(): void { this.setSelect(null); }
  setSelect(node: Node | null): void {
    this.selected = node;
    this.options.onSelect?.(node);
    this.repaint();
  }
  selectFirstNode(): void { this.setSelect(this.getGES().getFirstNode()); }
  getDragNode(): Node | null { return this.dragNode; }
  /**
   * Transfers drag ownership to the layout, freezing lens focus while its node is dragged.
   * Releasing a dragged focus adjusts pan so the node does not jump back on screen.
   */
  setDragNode(node: Node | null): void {
    if (node && node === this.focus) this.dragFocusOrigin = { x: node.x, y: node.y };
    if (!node && this.dragFocusOrigin && this.focus) {
      this.panLens.x += (this.focus.x - this.dragFocusOrigin.x) * this.zoomLens.scale;
      this.panLens.y += (this.focus.y - this.dragFocusOrigin.y) * this.zoomLens.scale;
      this.dragFocusOrigin = null;
    }
    if (!node) this.dragFocusOrigin = null;
    this.dragNode = node; this.tgLayout.setDragNode(node);
  }
  setRigidity(value: number): void { this.tgLayout.setRigidity(value); }
  startDamper(): void { this.tgLayout.startDamper(); }
  stopDamper(): void { this.tgLayout.stopDamper(); }
  resetDamper(): void { this.tgLayout.resetDamper(); }
  stopMotion(): void { this.tgLayout.stopMotion(); }
  /**
   * Queues a hop/degree-limited neighborhood update without recentering the viewing lens.
   * @returns Completion of visibility changes and any enabled locality animation.
   * @see LocalityUtils.setLocale
   */
  setLocale(node: Node | null, radius: number, maxAddEdgeCount = 1000, maxExpandEdgeCount = 1000, unidirectional = false): Promise<void> {
    return this.localityUtils.setLocale(node, radius, maxAddEdgeCount, maxExpandEdgeCount, unidirectional);
  }
  expandNode(node: Node): Promise<void> { return this.localityUtils.expandNode(node); }
  hideNode(node: Node): Promise<void> { return this.localityUtils.hideNode(node); }
  collapseNode(node: Node): Promise<void> { return this.localityUtils.collapseNode(node); }
  fastFinishAnimation(): void { this.localityUtils.fastFinishAnimation(); }
  /**
   * Selects a stored node, centers the viewing lens on it and reveals its neighborhood.
   * Physical positions and force equations remain unchanged by recentering.
   * @param radius Inclusive graph-hop radius, defaulting to two.
   * @throws {Error} If node is absent from the complete graph.
   * @returns Completion of the queued neighborhood change.
   */
  focusNode(node: Node, radius = 2): Promise<void> {
    if (!this.completeEltSet.contains(node)) throw new Error("Focus node must belong to the graph");
    this.focus = node;
    this.setSelect(node);
    this.centerView();
    return this.setLocale(node, radius);
  }
  getFocus(): Node | null { return this.focus; }
  /**
   * Centers a stored node in the default lens chain without changing selection or visibility.
   * @param node Stored node to place at the viewing origin, including a currently hidden node.
   * @param updateFocus Also makes the node the lens focus; locality remains a separate operation.
   * @remarks Like centerView, custom lens chains own their viewport/interaction transforms.
   */
  centerOn(node: Node, updateFocus = false): void {
    if (!this.completeEltSet.contains(node)) throw new Error("Centered node must belong to the graph");
    if (updateFocus) this.focus = node;
    const focus = this.dragFocusOrigin ?? this.focus;
    const x = -(node.x - (focus?.x ?? 0)) * this.zoomLens.scale;
    const y = -(node.y - (focus?.y ?? 0)) * this.zoomLens.scale;
    this.panLens.x = x; this.panLens.y = y;
    this.centerCanvas();
  }
  showAll(): void { this.localityUtils.fastFinishAnimation(); void this.setLocaleAll(); }
  async setLocaleAll(): Promise<void> {
    const first = this.completeEltSet.getFirstNode();
    if (first) await this.setLocale(first, LocalityUtils.INFINITE_LOCALITY_RADIUS);
  }
  /** Sets viewing-lens strength from 0 to 100 without altering physical coordinates. */
  setHyperbolic(value: number): void { this.hyperLens.setValue(value); this.repaintAfterMove(); }
  /** Returns the current focus/context lens strength, from 0 to 100. */
  getHyperbolic(): number { return this.hyperLens.getValue(); }
  /** Rotates the viewing transform in radians without rotating physical coordinates. */
  setRotation(radians: number): void { this.rotateLens.angle = radians; this.repaintAfterMove(); }
  /** Returns the viewing rotation in radians. */
  getRotation(): number { return this.rotateLens.angle; }
  /** Returns keyboard focus to the mounted graph after an application action; headless panels do nothing. */
  focusGraph(): void { this.svg?.node()?.focus({preventScroll: true}); }
  addGraphListener(listener: GraphListener): void { this.listeners.add(listener); }
  removeGraphListener(listener: GraphListener): void { this.listeners.delete(listener); }
  fireResetEvent(): void { for (const listener of this.listeners) listener.graphReset?.(); }
  /** Returns the viewport midpoint in SVG pixels; screenToDraw maps it into renderer coordinates. */
  getDrawCenter(): TGPoint2D { return new TGPoint2D(this.width / 2, this.height / 2); }
  /** Returns the physical point beneath the viewport center through both inverse transforms. */
  getCenter(): TGPoint2D { return this.lensSet.convDrawToReal(this.screenToDraw(this.getDrawCenter())); }
  /** Converts renderer coordinates to viewport pixels, including canvas scale and pan. */
  drawToScreen(point: { x: number; y: number }): TGPoint2D {
    return new TGPoint2D(this.canvasTransform.applyX(point.x), this.canvasTransform.applyY(point.y));
  }
  /** Converts viewport pixels to renderer coordinates before applying the inverse lens chain. */
  screenToDraw(point: { x: number; y: number }): TGPoint2D {
    return new TGPoint2D(this.canvasTransform.invertX(point.x), this.canvasTransform.invertY(point.y));
  }
  getTopLeftDraw(): TGPoint2D { return new TGPoint2D(this.topLeftDraw); }
  getBottomRightDraw(): TGPoint2D { return new TGPoint2D(this.bottomRightDraw); }
  updateGraphSize(): void {
    const nodes = [...this.getGES().getNodes()];
    this.topLeftDraw.setLocation(nodes.length ? Math.min(...nodes.map(node => node.drawx)) : 0,
      nodes.length ? Math.min(...nodes.map(node => node.drawy)) : 0);
    this.bottomRightDraw.setLocation(nodes.length ? Math.max(...nodes.map(node => node.drawx)) : 0,
      nodes.length ? Math.max(...nodes.map(node => node.drawy)) : 0);
  }
  updateDrawPositions(): void { this.getGES().forAllNodes(node => this.updateDrawPos(node)); }
  processGraphMove(): void { this.updateDrawPositions(); this.updateGraphSize(); }
  /** Refreshes renderer coordinates through the lens chain; canvas scaling is applied separately. */
  updateDrawPos(node: Node): void {
    const point = this.lensSet.convRealToDraw(node.x, node.y); node.drawx = point.x; node.drawy = point.y;
  }
  /** Converts renderer coordinates back into physical coordinates using the inverse lens chain. */
  updatePosFromDraw(node: Node): void {
    const point = this.lensSet.convDrawToReal(node.drawx, node.drawy); node.x = point.x; node.y = point.y;
  }
  repaintAfterMove(): void {
    this.repaint();
    for (const listener of this.listeners) listener.graphMoved?.();
  }
  /** Centers the viewing origin while retaining both graph and canvas zoom. */
  centerView(): void { this.panLens.x = 0; this.panLens.y = 0; this.centerCanvas(); }
  private centerCanvas(): void {
    const k = this.getCanvasZoom();
    const transform = zoomIdentity.translate(this.width / 2 * (1 - k), this.height / 2 * (1 - k)).scale(k);
    if (this.svg && this.zoomBehavior) this.svg.call(this.zoomBehavior.transform, transform);
    else { this.canvasTransform = transform; this.repaintAfterMove(); }
  }
  /** Returns graph-distance zoom. Node bodies, labels and strokes retain their renderer sizes. */
  getZoom(): number { return this.zoomLens.scale; }
  /** Returns translation inside the viewing-lens chain, before its nonlinear/rotation stages. */
  getLensPan(): TGPoint2D { return new TGPoint2D(this.panLens.x, this.panLens.y); }
  /** Restores lens pan separately from canvas pan; used when restoring a saved view. */
  setLensPan(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError("Lens pan must be finite");
    this.panLens.x = x; this.panLens.y = y; this.repaintAfterMove();
  }
  /**
   * Sets graph-distance zoom before the focus/context lens, clamped to 0.15–5.
   * Changes node spacing without scaling graphical objects or physical coordinates.
   * Lens pan scales with it to retain the world point at the viewing-lens origin.
   * @throws {RangeError} If scale is not finite and strictly positive.
   */
  setZoom(scale: number): void {
    if (!Number.isFinite(scale) || scale <= 0) throw new RangeError("Zoom must be a positive finite scale");
    scale = Math.max(.15, Math.min(5, scale));
    const ratio = scale / this.zoomLens.scale;
    this.panLens.x *= ratio; this.panLens.y *= ratio;
    this.zoomLens.scale = scale; this.repaintAfterMove();
  }
  zoomBy(factor: number): void { this.setZoom(this.zoomLens.scale * factor); }
  /** Returns the independent scale of the complete drawing, including text, shapes and strokes. */
  getCanvasZoom(): number { return this.canvasTransform.k; }
  /** Returns canvas translation in viewport pixels relative to a centered drawing at the current scale. */
  getCanvasPan(): TGPoint2D {
    const center = this.getDrawCenter(), point = this.drawToScreen(center);
    return new TGPoint2D(point.x - center.x, point.y - center.y);
  }
  /** Restores canvas pan independently of scale, for saved views and viewport controls. */
  setCanvasPan(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError("Canvas pan must be finite");
    const k = this.getCanvasZoom(), center = this.getDrawCenter();
    const transform = zoomIdentity.translate(center.x * (1 - k) + x, center.y * (1 - k) + y).scale(k);
    if (this.svg && this.zoomBehavior) this.svg.call(this.zoomBehavior.transform, transform);
    else { this.canvasTransform = transform; this.repaintAfterMove(); }
  }
  /**
   * Scales the complete drawing around the viewport center, clamped to 0.15–5.
   * Preserves graph-distance zoom and the world point beneath the viewport center.
   * @throws {RangeError} If scale is not finite and strictly positive.
   */
  setCanvasZoom(scale: number): void {
    if (!Number.isFinite(scale) || scale <= 0) throw new RangeError("Canvas zoom must be a positive finite scale");
    scale = Math.max(.15, Math.min(5, scale));
    if (this.svg && this.zoomBehavior) this.svg.call(this.zoomBehavior.scaleTo, scale);
    else {
      const center = this.getDrawCenter(), draw = this.screenToDraw(center);
      this.canvasTransform = zoomIdentity.translate(center.x - draw.x * scale, center.y - draw.y * scale).scale(scale);
      this.repaintAfterMove();
    }
  }
  /** Multiplies canvas scale, using the same limits and center anchor as setCanvasZoom. */
  canvasZoomBy(factor: number): void { this.setCanvasZoom(this.getCanvasZoom() * factor); }

  /**
   * Installs SVG layers, input gestures and resize handling on a fresh panel.
   * Subclasses may defer mounting until their fields are ready for virtual paint hooks.
   */
  protected mount(container: HTMLElement): void {
    this.container = container;
    this.svg = select(container).append("svg").attr("class", "tg-panel")
      .attr("data-interaction-mode", this.interactionMode)
      .attr("role", "group").attr("aria-label", "Interactive graph browser")
      .style("display", "block").style("width", "100%").style("height", "100%")
      .style("touch-action", "none").style("user-select", "none");
    this.svg.append("defs").append("marker").attr("id", this.arrowId).attr("viewBox", "0 0 10 10")
      .attr("refX", 9).attr("refY", 5).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M 0 0 L 10 5 L 0 10 Z").attr("fill", "context-stroke");
    this.scene = this.svg.append("g").attr("class", "tg-scene");
    this.edgeLayer = this.scene.append("g").attr("class", "tg-edges");
    this.decorationLayer = this.scene.append("g").attr("class", "tg-decorations").attr("aria-hidden", "true").style("pointer-events", "none");
    this.nodeLayer = this.scene.append("g").attr("class", "tg-nodes");
    this.badgeLayer = this.scene.append("g").attr("class", "tg-hidden-counts").attr("aria-hidden", "true")
      .style("pointer-events", "none");
    this.zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 5])
      .filter(event => !event.shiftKey && (!event.ctrlKey || event.type === "wheel") && !event.button).on("zoom", event => {
      this.canvasTransform = event.transform;
      this.repaintAfterMove();
    });
    this.svg.call(this.zoomBehavior).on("dblclick.zoom", null);
    this.svg.on("mousemove.position", event => {
      const [x, y] = pointer(event, this.scene!.node()); this.mousePos.setLocation(x, y);
    }).on("click.selection", event => { if (event.target === this.svg!.node()) this.clearSelect(); });
    this.svg.on("dblclick.edit", event => {
      if (this.interactionMode !== "edit" || event.target !== this.svg!.node()) return;
      const [x, y] = pointer(event, this.scene!.node());
      const position = this.lensSet.convDrawToReal(x, y);
      const node = this.addNode("New node");
      node.setLocation(position); this.setSelect(node); this.resetDamper();
    });
    let boxStart = new TGPoint2D();
    let box: Selection<SVGRectElement, unknown, null, undefined> | undefined;
    this.svg.call(drag<SVGSVGElement, unknown>().container(this.scene.node()!)
      .subject(event => ({ x: event.x, y: event.y }))
      .filter(event => event.shiftKey && !event.button && event.target === this.svg!.node())
      .on("start", event => {
        boxStart = new TGPoint2D(event.x, event.y);
        box = this.scene!.append("rect").attr("class", "tg-selection-box").attr("fill", "#42674a22")
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
    // Keep the canvas pan relative to the viewport center when the host changes size.
    if (this.zoomBehavior && (oldWidth !== this.width || oldHeight !== this.height)) {
      const previous = this.canvasTransform, k = previous.k;
      const transform = zoomIdentity.translate(previous.x + (this.width - oldWidth) / 2 * (1 - k),
        previous.y + (this.height - oldHeight) / 2 * (1 - k)).scale(k);
      this.svg.call(this.zoomBehavior.transform, transform);
    }
    this.repaint();
  }
  /**
   * Refreshes draw coordinates and renders visible elements through presentation hooks.
   * Measures node bodies before edge geometry; annotations occupy separate SVG layers
   * so hidden-link counts cannot enlarge keyboard focus bounds. Headless panels only
   * refresh draw positions and graph bounds.
   */
  repaint(): void {
    if (this.destroyed) return;
    this.processGraphMove();
    if (!this.nodeLayer || !this.edgeLayer || !this.svg) return;
    this.scene!.attr("transform", this.canvasTransform.toString());
    if (this.focus && !this.completeEltSet.contains(this.focus)) this.focus = null;
    const nodes = this.nodeLayer.selectAll<SVGGElement, Node>("g.tg-node").data([...this.getGES().getNodes()], node => node.getID()!)
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
      .on("click", (event: MouseEvent, node) => this.handleNodeClick(event, node))
      .on("dblclick", (event: MouseEvent, node) => this.handleNodeDoubleClick(event, node))
      .on("keydown", (event: KeyboardEvent, node) => this.handleNodeKeyDown(event, node));
    nodes.each((node, index, elements) => this.paintNode(elements[index], node));
    // Keep annotations outside the focusable group's SVG bounds. Browser outlines
    // otherwise enclose the count as well as the node body. The extra gap also
    // clears the demo's keyboard focus outline and its offset.
    this.badgeLayer?.selectAll<SVGTextElement, Node>("text")
      .data([...this.getGES().getNodes()].filter(node => node.visibleEdgeCount() < node.edgeCount()), node => node.getID()!)
      .join("text").attr("class", "tg-hidden-count").attr("data-for-node", node => node.getID())
      .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "#52645c")
      .attr("x", node => node.drawx).attr("y", node => node.drawy + node.getHeight() / 2 + 18)
      .attr("opacity", node => node.markedForRemoval ? .2 : 1)
      .text(node => `+${node.edgeCount() - node.visibleEdgeCount()}`);
    this.paintEdges(this.edgeLayer.node()!);
    if (this.decorationLayer) this.paintDecorations(this.decorationLayer.node()!);
    nodes.select("title").text(node => this.getNodeTitle(node));
    const behavior = drag<SVGGElement, Node, DragSubject>().container(this.scene!.node()!)
      .subject((_event, node) => ({ x: node.drawx, y: node.drawy, node }))
      .on("start", event => { this.setDragNode(event.subject.node); this.stopDamper(); })
      .on("drag", event => {
        const node = event.subject.node;
        node.drawx = event.x; node.drawy = event.y;
        this.updatePosFromDraw(node);
        this.repaintAfterMove();
      })
      .on("end", () => { this.setDragNode(null); this.resetDamper(); this.repaintAfterMove(); });
    nodes.call(behavior);
  }
  /** Override presentation without replacing the panel's input, dragging or lifecycle. */
  protected paintNode(element: SVGGElement, node: Node): void {
    const group = select(element);
    group.select<SVGTextElement>(".tg-label").text(node.getLabel())
      .attr("fill", node === this.selected ? "#193b2d" : node.getTextColor()).style("font", node.getFont());
    const label = element.querySelector<SVGTextElement>(".tg-label")!;
    const width = Math.max(30, label.getComputedTextLength() + 20);
    const circle = node.getType() === Node.TYPE_CIRCLE;
    const round = circle || node.getType() === Node.TYPE_ELLIPSE;
    const height = circle ? width : 28;
    node.setDimensions(width, height);
    group.select(".tg-shape").attr("display", round ? "none" : null)
      .attr("x", -width / 2).attr("y", -height / 2).attr("width", width).attr("height", height)
      .attr("rx", node.getType() === Node.TYPE_ROUNDRECT ? 8 : 0);
    group.select(".tg-round-shape").attr("display", round ? null : "none").attr("rx", width / 2).attr("ry", height / 2);
    group.selectAll<SVGElement, Node>(".tg-shape, .tg-round-shape")
      .attr("fill", node === this.selected ? Node.BACK_SELECT_COLOR : node.fixed ? Node.BACK_FIXED_COLOR : node.getBackColor())
      .attr("stroke", node === this.dragNode ? Node.BORDER_DRAG_COLOR : node === this.mouseOverN
        ? Node.BORDER_MOUSE_OVER_COLOR : node === this.focus ? "#183b2b" : Node.BORDER_INACTIVE_COLOR)
      .attr("stroke-width", node === this.focus ? 2 : 1);
  }
  /** Draws ordinary TouchGraph segments with endpoint arrows; extensions may supply curves. */
  protected paintEdges(layer: SVGGElement): void {
    const endpoint = (edge: Edge) => {
      const dx = edge.from.drawx - edge.to.drawx, dy = edge.from.drawy - edge.to.drawy;
      const rx = edge.to.getWidth() / 2 + 4, ry = edge.to.getHeight() / 2 + 4;
      const round = edge.to.getType() === Node.TYPE_CIRCLE || edge.to.getType() === Node.TYPE_ELLIPSE;
      const scale = Math.min(1, round ? 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
        : Math.min(rx / Math.abs(dx), ry / Math.abs(dy)));
      return { x: edge.to.drawx + dx * scale, y: edge.to.drawy + dy * scale };
    };
    select(layer).selectAll<SVGLineElement, Edge>("line").data([...this.getGES().getEdges()]).join("line")
      .attr("x1", edge => edge.from.drawx).attr("y1", edge => edge.from.drawy)
      .attr("x2", edge => endpoint(edge).x).attr("y2", edge => endpoint(edge).y)
      .attr("marker-end", `url(#${this.arrowId})`)
      .attr("stroke", edge => edge === this.mouseOverE ? Edge.MOUSE_OVER_COLOR : edge.getColor()).attr("stroke-width", 1.2)
      .attr("opacity", edge => edge.from.markedForRemoval || edge.to.markedForRemoval ? 0.15 : 0.65)
      .on("mouseenter", (_event, edge) => { this.setMouseOverE(edge); this.repaint(); })
      .on("mouseleave", () => { this.setMouseOverE(null); this.repaint(); });
  }
  /** Optional noninteractive sibling layer for marks that must stay outside node focus bounds. */
  protected paintDecorations(_layer: SVGGElement): void {}
  /** Supplies node tooltips; extensions can describe their own keyboard/mouse profile. */
  protected getNodeTitle(node: Node): string {
    return `${node.getLabel()}${node.fixed ? " (pinned)" : ""}\nDouble-click or press Space to expand`;
  }
  /** Default node double-click expands in navigation mode; edit-mode node clicks are left alone. */
  protected handleNodeDoubleClick(event: MouseEvent, node: Node): void {
    event.stopPropagation();
    if (this.interactionMode === "navigate") void this.expandNode(node);
  }
  /** Default click selection and Shift-click edge creation; reusable by interaction extensions. */
  protected handleNodeClick(event: MouseEvent, node: Node): void {
    event.stopPropagation();
    if (this.interactionMode === "edit" && event.shiftKey && this.selected && this.selected !== node
      && this.getGES().contains(this.selected) && !this.findEdge(this.selected, node)) this.addEdge(this.selected, node);
    this.setSelect(node === this.selected ? null : node);
  }
  /** Dispatches node-local selection, expansion and edit deletion shortcuts. */
  protected handleNodeKeyDown(event: KeyboardEvent, node: Node): void {
    if (event.key === "Enter") { event.preventDefault(); this.setSelect(node); }
    if (event.key === " ") { event.preventDefault(); void this.expandNode(node); }
    if (event.key === "Escape") { event.preventDefault(); this.clearSelect(); }
    if (this.interactionMode === "edit" && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault(); this.deleteNode(node);
    }
  }
  /** Stops layout/locality work, disconnects resize handling and removes the mounted SVG. */
  destroy(): void {
    this.destroyed = true; this.localityUtils.dispose(); this.tgLayout.stop(); this.resizeObserver?.disconnect();
    this.svg?.on(".zoom", null).on(".drag", null).on(".position", null).on(".selection", null).on(".edit", null).remove(); this.listeners.clear();
  }
}
