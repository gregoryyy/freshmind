/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { TGPanel } from "../tg/panel.js";
import type { TGPanelOptions } from "../tg/panel.js";
import { Node, Edge } from "../tg/model.js";
import { GraphEltSet } from "../tg/graph.js";
import { FreshNode, FreshEdge, FreshGraph } from "./model.js";
import { TypeRegistry } from "./config/registry.js";
import { freshmind2014Configuration } from "./config/fm2014.js";
import { parseTypeConfiguration } from "./config/yaml.js";
import type { CurveMode, EdgeStyle, InteractionState, NodeStyle } from "./config/types.js";
import { FreshmindPresentation } from "./rendering/presentation.js";
import { routeEdges } from "./rendering/geometry.js";
import type { EdgeGeometry } from "./rendering/geometry.js";
import { FreshmindNavigation } from "./navigation/controller.js";
import { bindNavigation } from "./navigation/keyboard.js";
import type { NavigationOptions } from "./navigation/types.js";
import { RfcController } from "./rfc/controller.js";
import type { RfcSettings } from "./rfc/types.js";
import type { RfcStabilizationOptions } from "./rfc/stabilization.js";
import type { TGLayout } from "../tg/layout.js";

export interface FreshmindPanelOptions extends TGPanelOptions {
  types?: TypeRegistry;
  navigation?: NavigationOptions;
  navigationStatus?: HTMLElement;
  rfc?: Partial<RfcSettings>;
  rfcStabilization?: RfcStabilizationOptions;
}
export type FreshmindSelection = FreshNode | FreshEdge | null;
export type SelectionListener = (selection: FreshmindSelection) => void;
/** Freshmind extends the TouchGraph panel; graph/locality/layout/lenses remain owned by TGPanel. */
export class FreshmindPanel extends TGPanel {
  private types: TypeRegistry;
  private readonly presentation=new FreshmindPresentation();
  private selectedEdge: FreshEdge|null=null;
  private readonly selectionListeners = new Set<SelectionListener>();
  private navigation?: FreshmindNavigation;
  private neighborhoodFocus: FreshNode | null = null;
  private neighborhoodRevision = 0;
  private changingNeighborhood = false;
  private unbindNavigation?: () => void;
  private readonly navigationStatus?: HTMLElement;
  private rfc?: RfcController;
  private removeRfcForce?: () => void;
  private removeRfcPaint?: () => void;
  private rfcPaintRevision = 0;
  /**
   * Creates an empty FreshGraph with the FM 2014 profile unless a registry is supplied.
   * Mounting is deferred until extension fields exist because painting uses virtual hooks.
   * @param container SVG host; omit for headless model/locality/lens operations.
   */
  constructor(container?:HTMLElement,options:FreshmindPanelOptions={}) {
    // Mount after extension fields are initialized: base mounting calls virtual paint hooks.
    super(undefined,{...options,animateLocality:options.animateLocality??Boolean(container)});
    this.types=options.types??new TypeRegistry(freshmind2014Configuration);
    this.setGraphEltSet(new FreshGraph());
    this.navigation = new FreshmindNavigation(this, options.navigation);
    this.navigationStatus = options.navigationStatus;
    this.rfc = new RfcController(this, options.rfc, options.rfcStabilization);
    this.removeRfcForce = this.tgLayout.addForce(this.rfc.apply);
    this.removeRfcPaint = this.rfc.addListener(() => {
      const revision = ++this.rfcPaintRevision;
      // Render paused/headless updates without reentering an in-progress SVG join.
      queueMicrotask(() => { if (revision === this.rfcPaintRevision) this.repaint(); });
    });
    if(container){this.mount(container);if(options.autoStart!==false)this.tgLayout.start();}
  }
  getTypeRegistry():TypeRegistry{return this.types;}
  /** Returns the inherited default edge form, independently of relation-specific overrides. */
  getEdgeCurve(): CurveMode {
    return this.types.getDefaultEdgeStyle().curve;
  }
  /** Changes the default edge form without modifying explicit visual overrides or layout coordinates. */
  setEdgeCurve(curve: CurveMode): void {
    const config = this.types.getConfiguration();
    config.edgeVisuals[config.defaults.edgeVisual].curve = curve;
    this.setTypeRegistry(new TypeRegistry(config));
  }
  /** Cycles the available edge forms in the same order as the browser selector. */
  cycleEdgeCurve(): CurveMode {
    const curves: CurveMode[] = ["spider", "lens", "straight"];
    const next = curves[(curves.indexOf(this.getEdgeCurve()) + 1) % curves.length];
    this.setEdgeCurve(next);
    return next;
  }
  /** Returns the composed navigation controller used by both DOM input and application controls. */
  getNavigation(): FreshmindNavigation { return this.navigation!; }
  /** Returns the reinforcement controller, disabled until a center is chosen. */
  getRfc(): RfcController { return this.rfc!; }
  /** Adds a second or subsequent focal center without replacing locality or existing activation. */
  addRfcCenter(node:FreshNode):void {this.rfc!.addFocus(node);}
  /** Toggles a focal center independently of selection/locality and returns its new activation state. */
  toggleRfcCenter(node:FreshNode):boolean {return this.rfc!.toggleFocus(node);}
  /** Repeated Return/double-click on the center replaces all enabled RFC centers with this one. */
  reinforceCenteredNode(node: FreshNode): void {
    if (this.rfc?.getState().enabled) {
      this.rfc.setFocus(node);
      this.resetDamper();
    }
  }
  /** Transfers the RFC force registration while retaining TouchGraph layout replacement behavior. */
  override setTGLayout(layout: TGLayout): void {
    this.removeRfcForce?.();
    super.setTGLayout(layout);
    if (this.rfc) this.removeRfcForce = layout.addForce(this.rfc.apply);
  }
  /** Neighborhood origin can differ from both committed selection and the viewing-lens focus. */
  getNeighborhoodFocus(): FreshNode | null { return this.neighborhoodFocus; }
  protected override mount(container: HTMLElement): void {
    super.mount(container);
    const svg = [...container.querySelectorAll<SVGSVGElement>(":scope > svg.tg-panel")].at(-1)!;
    this.unbindNavigation = bindNavigation(svg, this, this.navigation!, this.navigationStatus);
  }
  override repaint(): void { this.rfc?.reconcile(); this.navigation?.reconcile(false); super.repaint(); }
  /** Records the requested neighborhood separately from selection; superseded async requests cannot reset it. */
  override setLocale(node: Node | null, radius: number, maxAdd = 1000, maxExpand = 1000, outgoingOnly = false): Promise<void> {
    if (!(node instanceof FreshNode) || radius < 0 || !this.getCompleteEltSet().contains(node))
      return super.setLocale(node, radius, maxAdd, maxExpand, outgoingOnly);
    const revision = ++this.neighborhoodRevision;
    this.changingNeighborhood = true; this.neighborhoodFocus = node;
    this.navigation?.neighborhoodChanged(radius, maxAdd, maxExpand, outgoingOnly);
    return super.setLocale(node, radius, maxAdd, maxExpand, outgoingOnly).finally(() => {
      if (revision !== this.neighborhoodRevision) return;
      this.changingNeighborhood = false;
      this.neighborhoodFocus = this.getGES().contains(node) ? node : null;
      this.navigation?.localityChanged();
    });
  }
  /** Replaces a validated registry and repaints while preserving graph objects and physical positions. */
  setTypeRegistry(types:TypeRegistry):void{
    if(!(types instanceof TypeRegistry))throw new TypeError("Expected a TypeRegistry");
    this.types=types;this.repaintAfterMove();
  }
  /**
   * Parses and applies YAML type configuration atomically; failures leave the current registry intact.
   * @throws {TypeError} For invalid YAML or type definitions.
   * @see parseTypeConfiguration
   */
  loadTypeConfiguration(source:string):void{const types=parseTypeConfiguration(source);this.setTypeRegistry(types);}
  override getCompleteEltSet():FreshGraph{return super.getCompleteEltSet() as FreshGraph;}
  /**
   * Installs a FreshGraph through the base lifecycle and clears old relations' draw geometry.
   * @throws {TypeError} If graph is not a FreshGraph.
   */
  override setGraphEltSet(graph:GraphEltSet):void {
    if(!(graph instanceof FreshGraph))throw new TypeError("FreshmindPanel requires a FreshGraph");
    this.rfc?.setFocus(null);
    this.navigation?.graphChanged(); this.neighborhoodFocus = null;
    this.neighborhoodRevision++; this.changingNeighborhood = false;
    for(const edge of this.getCompleteEltSet().getEdges())if(edge instanceof FreshEdge)edge.setGeometry(null);
    super.setGraphEltSet(graph);
  }
  /** Supplies the configured default semantic type for panel creation and edit gestures. */
  protected override createNode(id:string|null,label:string|null):FreshNode {
    return new FreshNode(id,label??id??"",{type:this.types.getConfiguration().defaults.nodeType});
  }
  /** Creates a FreshEdge using the configured default relation type and supplied spring length. */
  protected override createEdge(from:Node,to:Node,length?:number):FreshEdge {
    return new FreshEdge(from as FreshNode,to as FreshNode,{length,type:this.types.getConfiguration().defaults.relationType});
  }
  override addNode():FreshNode;
  override addNode(node:Node):FreshNode;
  override addNode(label:string):FreshNode;
  override addNode(id:string|null,label:string|null):FreshNode;
  override addNode(nodeOrId:Node|string|null=null,label?:string|null):FreshNode {
    if(nodeOrId instanceof Node)return super.addNode(nodeOrId) as FreshNode;
    if(label!==undefined)return super.addNode(nodeOrId,label) as FreshNode;
    return (nodeOrId===null?super.addNode():super.addNode(nodeOrId)) as FreshNode;
  }
  override addEdge(edge:Edge):FreshEdge;
  override addEdge(from:Node,to:Node,length?:number):FreshEdge;
  override addEdge(edgeOrFrom:Edge|Node,to?:Node,length?:number):FreshEdge {
    return (edgeOrFrom instanceof Edge?super.addEdge(edgeOrFrom):super.addEdge(edgeOrFrom,to!,length)) as FreshEdge;
  }
  getSelectEdge():FreshEdge|null{return this.selectedEdge;}
  /** Returns the selected relation or node, keeping the inherited node navigation anchor separate. */
  getSelection(): FreshmindSelection { return this.selectedEdge ?? this.getSelect() as FreshNode | null; }
  /** Subscribes to committed node/edge selection changes; returns a disposer for UI controllers. */
  addSelectionListener(listener: SelectionListener): () => void {
    this.selectionListeners.add(listener);
    return () => this.selectionListeners.delete(listener);
  }
  private selectionChanged(): void {
    for (const listener of this.selectionListeners) listener(this.getSelection());
    this.navigation?.selectionChanged();
  }
  /**
   * Selects a visible relation, retaining an incident selected node as the navigation anchor.
   * If necessary, selects its source through TGPanel before applying edge highlighting.
   * @param edge Relation to select, or null to clear edge selection while keeping the node anchor.
   * @throws {Error} If edge is not in the visible locality.
   */
  setSelectEdge(edge:FreshEdge|null):void {
    if(edge&&!this.getGES().contains(edge))throw new Error("Selected edge must be visible");
    this.navigation?.cancel(undefined, false);
    if(edge&&this.getSelect()!==edge.from&&this.getSelect()!==edge.to)super.setSelect(edge.from);
    this.selectedEdge=edge;this.repaint();this.selectionChanged();
  }
  /** Explicit node selection also clears edge selection and delegates callbacks to TGPanel. */
  override setSelect(node:Node|null):void{this.navigation?.cancel(undefined,false);this.selectedEdge=null;super.setSelect(node);this.selectionChanged();}
  /** Clears hidden edge selection/geometry after the base panel reconciles its references. */
  override localityChanged():void {
    super.localityChanged();
    if(this.selectedEdge&&!this.getGES().contains(this.selectedEdge)){
      this.selectedEdge=null;this.selectionChanged();
    }
    for(const edge of this.getCompleteEltSet().getEdges())if(edge instanceof FreshEdge&&!this.getGES().contains(edge))edge.setGeometry(null);
    if (!this.changingNeighborhood && this.neighborhoodFocus && !this.getGES().contains(this.neighborhoodFocus)) this.neighborhoodFocus = null;
    this.navigation?.localityChanged();
  }
  /** Resolves current node interaction styles; an edge anchor is not highlighted as node selection. */
  getNodeStyle(node:FreshNode):NodeStyle {
    const states:InteractionState[]=[];
    if(node.fixed)states.push("fixed");if(node===this.getMouseOverN())states.push("hover");
    if(node===this.getSelect()&&!this.selectedEdge)states.push("selected");
    if(node.isPreselected())states.push("preselected");if(node.isKeyselected())states.push("activeCandidate");
    return this.types.resolveNode(node,states);
  }
  /** Resolves relation hover, selection and externally managed preselection/candidate flags. */
  getEdgeStyle(edge:FreshEdge):EdgeStyle {
    const states:InteractionState[]=[];
    if(edge===this.getMouseOverE())states.push("hover");if(edge===this.selectedEdge)states.push("selected");
    if(edge.isPreselected())states.push("preselected");if(edge.isKeyselected())states.push("activeCandidate");
    return this.types.resolveEdge(edge,states);
  }
  private geometries():Map<FreshEdge,EdgeGeometry> {
    const edges=[...this.getGES().getEdges()] as FreshEdge[];
    return routeEdges(edges,(x,y)=>this.getLensSet().convRealToDraw(x,y),e=>this.getEdgeStyle(e),n=>this.getNodeStyle(n));
  }
  /**
   * Recomputes visible routes under the current lenses and caches the requested edge's result.
   * Body dimensions come from the latest paint, or caller-supplied headless measurements.
   * Coordinates precede canvas scaling/pan; drawToScreen maps them into viewport pixels.
   * @returns Shared drawing/picking/editor geometry, or null for a hidden/nonmember edge.
   */
  getEdgeGeometry(edge:FreshEdge):EdgeGeometry|null {
    const geometry=this.geometries().get(edge)??null;edge.setGeometry(geometry);return geometry;
  }
  protected override paintNode(element:SVGGElement,node:Node):void {
    if(!(node instanceof FreshNode))throw new TypeError("Freshmind rendering requires FreshNode");
    this.presentation.paintNode(element,node,this.getNodeStyle(node));
    element.setAttribute("aria-pressed",String(node===this.getSelect()&&!this.selectedEdge));
  }
  protected override paintEdges(layer:SVGGElement):void {
    const edges = [...this.getGES().getEdges()] as FreshEdge[], geometries = this.geometries(), state = this.rfc?.getState();
    const nodeIds = new Set(state?.active ? state.memberIds : []);
    const edgeIds = new Set(state?.active ? state.radialEdgeIds : []);
    this.presentation.paintRfcHalos(layer, [...this.getGES().getNodes()].filter(node => nodeIds.has(node.getID()!)) as FreshNode[],
      edges.filter(edge => edgeIds.has(edge.getID()!)), geometries, node => this.getNodeStyle(node), edge => this.getEdgeStyle(edge));
    this.presentation.paintEdges(layer,edges,geometries,e=>this.getEdgeStyle(e),this.selectedEdge,{
      hover:edge=>{this.setMouseOverE(edge);this.repaint();},
      select:edge=>this.setSelectEdge(edge===this.selectedEdge?null:edge)
    });
  }
  protected override paintDecorations(layer:SVGGElement):void {
    this.presentation.paintDecorations(layer,[...this.getGES().getNodes()] as FreshNode[],n=>this.getNodeStyle(n),this.getFocus() as FreshNode|null);
  }
  /** Freshmind double-click selects and centers through the same command/settings as Enter. */
  protected override handleNodeDoubleClick(event: MouseEvent, node: Node): void {
    event.stopPropagation();
    if (this.getInteractionMode() !== "navigate") return;
    event.preventDefault(); this.setSelect(node);
    if(event.shiftKey&&!event.ctrlKey&&!event.altKey&&!event.metaKey){this.getNavigation().toggleRfcCenter();return;}
    void this.getNavigation().centerSelection();
  }
  protected override getNodeTitle(node: Node): string {
    return `${node.getLabel()}${node.fixed ? " (pinned)" : ""}\nDouble-click or press Enter to center; E to expand; Space for details`;
  }
  override clearAll(): void {
    this.rfc?.setFocus(null);
    this.navigation?.graphChanged(); this.neighborhoodFocus = null;
    this.neighborhoodRevision++; this.changingNeighborhood = false; super.clearAll();
  }
  override destroy(): void {
    this.rfcPaintRevision++; this.removeRfcPaint?.();
    this.removeRfcForce?.(); this.rfc?.destroy();
    this.unbindNavigation?.(); this.navigation?.destroy(); this.selectionListeners.clear(); super.destroy();
  }
}
