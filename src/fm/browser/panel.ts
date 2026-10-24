/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { TGPanel } from "../../tg/browser/index.js";
import type { TGPanelOptions } from "../../tg/browser/index.js";
import { Node, Edge } from "../../tg/model/index.js";
import { GraphEltSet } from "../../tg/graph/index.js";
import type {VisibleLocality,ImmutableGraphEltSet} from "../../tg/graph/index.js";
import { FreshNode, FreshEdge, FreshGraph } from "../model/index.js";
import { TypeRegistry } from "../config/core.js";
import { freshmind2014Configuration } from "../config/core.js";
import { parseTypeConfiguration } from "../config/index.js";
import type { CurveMode, EdgeStyle, InteractionState, NodeStyle } from "../config/core.js";
import { FreshmindPresentation } from "../render/index.js";
import { routeEdges } from "../geometry/index.js";
import type { EdgeGeometry } from "../geometry/index.js";
import { FreshmindNavigation } from "../navigate/index.js";
import { bindNavigation } from "./navigation.js";
import type { NavigationOptions } from "../navigate/index.js";
import { RfcController } from "../rfc/index.js";
import type { RfcSettings,RfcExclusionSettings } from "../rfc/index.js";
import type { RfcStabilizationOptions } from "../rfc/index.js";
import type { TGLayout } from "../../tg/layout/index.js";
import {StructuralViewController} from "../struct-view/index.js";
import {projectRfcStructure} from "../rfc/index.js";
import {validateNodeImportanceView} from "../geometry/index.js";
import type {NodeImportanceViewSettings} from "../geometry/index.js";
import type {RelationLabelPlacement,OverlapBox} from "../geometry/index.js";

export interface FreshmindPanelOptions extends TGPanelOptions {
  types?: TypeRegistry;
  navigation?: NavigationOptions;
  navigationStatus?: HTMLElement;
  rfc?: Partial<RfcSettings>;
  rfcStabilization?: RfcStabilizationOptions;
  rfcExclusion?:Partial<RfcExclusionSettings>;
  nodeImportance?:Partial<NodeImportanceViewSettings>;
  relationLabelPlacement?:RelationLabelPlacement;
}
export type FreshmindSelection = FreshNode | FreshEdge | null;
export type SelectionListener = (selection: FreshmindSelection) => void;
/** Freshmind extends the TouchGraph panel; graph/locality/layout/lenses remain owned by TGPanel. */
export class FreshmindPanel extends TGPanel {
  private types: TypeRegistry;
  private readonly presentation=new FreshmindPresentation();
  private selectedEdge: FreshEdge|null=null;
  private readonly selectionListeners = new Set<SelectionListener>();
  private readonly graphChangeListeners=new Set<()=>void>();
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
  private structuralView?:StructuralViewController;
  private nodeImportance:NodeImportanceViewSettings={mode:"configured",showValues:false};
  private relationLabelPlacement:RelationLabelPlacement="original";
  /**
   * Creates an empty FreshGraph with the FM 2014 profile unless a registry is supplied.
   * Mounting is deferred until extension fields exist because painting uses virtual hooks.
   * @param container SVG host; omit for headless model/locality/lens operations.
   */
  constructor(container?:HTMLElement,options:FreshmindPanelOptions={}) {
    // Mount after extension fields are initialized: base mounting calls virtual paint hooks.
    super(undefined,{...options,animateLocality:options.animateLocality??Boolean(container)});
    this.types=options.types??new TypeRegistry(freshmind2014Configuration);
    this.nodeImportance=validateNodeImportanceView({...this.nodeImportance,...options.nodeImportance});
    if(options.relationLabelPlacement!==undefined){
      if(!["original","avoid-overlap"].includes(options.relationLabelPlacement))throw new TypeError("Invalid relation-label placement");
      this.relationLabelPlacement=options.relationLabelPlacement;
    }
    this.setGraphEltSet(new FreshGraph());
    this.navigation = new FreshmindNavigation(this, options.navigation);
    this.navigationStatus = options.navigationStatus;
    this.rfc = new RfcController(this, options.rfc, options.rfcStabilization,options.rfcExclusion);
    this.removeRfcForce = this.tgLayout.addForce(this.rfc.apply);
    this.removeRfcPaint = this.rfc.addListener(() => {
      this.refreshStructuralView();
      const revision = ++this.rfcPaintRevision;
      // Render paused/headless updates without reentering an in-progress SVG join.
      queueMicrotask(() => { if (revision === this.rfcPaintRevision) this.repaint(); });
    });
    this.structuralView=new StructuralViewController({getSource:()=>super.getGES(),getComplete:()=>this.getCompleteEltSet(),
      getContext:()=>this.structuralContext(),changed:()=>{this.localityChanged();this.resetDamper();this.repaintAfterMove();}});
    this.structuralView.refresh();
    if(container){this.mount(container);if(options.autoStart!==false)this.tgLayout.start();}
  }
  getTypeRegistry():TypeRegistry{return this.types;}
  /** Transient importance display preferences; configured mode reads inherited YAML/item styles. */
  getNodeImportance():NodeImportanceViewSettings{return {...this.nodeImportance};}
  /** Transient label placement preference; graph styles, positions and physics are unchanged. */
  getRelationLabelPlacement():RelationLabelPlacement{return this.relationLabelPlacement;}
  setRelationLabelPlacement(mode:RelationLabelPlacement):void {
    if(!["original","avoid-overlap"].includes(mode))throw new TypeError("Invalid relation-label placement");
    if(mode===this.relationLabelPlacement)return;this.relationLabelPlacement=mode;this.repaintAfterMove();
  }
  /** Applies a validated display update atomically; does not wake layout or mutate document styles/weights. */
  configureNodeImportance(changes:Partial<NodeImportanceViewSettings>):void {
    const next=validateNodeImportanceView({...this.nodeImportance,...changes});
    if(next.mode===this.nodeImportance.mode&&next.showValues===this.nodeImportance.showValues)return;
    this.nodeImportance=next;this.repaintAfterMove();
  }
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
  /** Reversible type filtering/leaf aggregation, independent of graph ownership and lens geometry. */
  getStructuralView():StructuralViewController{return this.structuralView!;}
  /** Current neighborhood before structural rules; this read-only view does not reveal the complete graph. */
  getUnfilteredLocality():ImmutableGraphEltSet{return super.getGES();}
  /** Expanding an aggregated parent reveals its retained leaf detail as well as ordinary neighbors. */
  override expandNode(node:Node):Promise<void>{this.structuralView?.reveal(node.getID()!);return super.expandNode(node);}
  override getGES():VisibleLocality{return this.structuralView?.getLocality()??super.getGES();}
  private structuralContext():{centers:string[];protectedIds:Set<string>} {
    const source=super.getGES(),graph=this.getCompleteEltSet(),protectedIds=new Set<string>(),centers:string[]=[];
    for(const node of [this.getFocus(),this.getSelect(),this.neighborhoodFocus,this.selectedEdge?.from,this.selectedEdge?.to])
      if(node&&source.contains(node))protectedIds.add(node.getID()!);
    if(this.getFocus()&&source.contains(this.getFocus()!))centers.push(this.getFocus()!.getID()!);
    const state=this.rfc?.getState();
    for(const activation of state?.centers??[]) {
      const root=graph.findNode(activation.focusId);if(!root||!source.contains(root))continue;
      centers.push(activation.focusId);
      const definition=activation.structureId?graph.getSubstructure(activation.structureId):null;
      const projection=projectRfcStructure(graph,source,root,definition,state!.settings.coordinateWeights);
      for(const node of projection.nodes)protectedIds.add(node.getID()!);
    }
    return {centers,protectedIds};
  }
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
  /** Default keyboard target in the current view; does not pan, select, or change locality. */
  getCenteredNode():FreshNode|null {
    this.updateDrawPositions();
    const center=this.getDrawCenter(),focus=this.getFocus();let best:FreshNode|null=null,distance=Infinity;
    for(const node of this.getGES().getNodes()){
      if(!(node instanceof FreshNode))continue;
      const p=this.drawToScreen({x:node.drawx,y:node.drawy}),d=Math.hypot(p.x-center.x,p.y-center.y);
      if(!Number.isFinite(d))continue;
      if(d<distance-1e-8||Math.abs(d-distance)<1e-8&&(node===focus||best!==focus&&node.getID()!<(best?.getID()??""))){best=node;distance=d;}
    }
    return best;
  }
  protected override mount(container: HTMLElement): void {
    super.mount(container);
    const svg = [...container.querySelectorAll<SVGSVGElement>(":scope > svg.tg-panel")].at(-1)!;
    this.unbindNavigation = bindNavigation(svg, this, this.navigation!, this.navigationStatus);
  }
  private refreshStructuralView():void {
    const changed=this.structuralView?.refresh(),selected=this.getSelect();
    // Navigation can select a complete-graph target before its queued neighborhood arrives.
    // Retain the original locality queue's cleanup timing for that pending target.
    if(changed&&!this.changingNeighborhood&&(!selected||super.getGES().contains(selected)))this.localityChanged();
  }
  override repaint(): void {
    this.refreshStructuralView();
    this.rfc?.reconcile(); this.navigation?.reconcile(false); super.repaint();
  }
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
  /** Subscribes to complete-graph replacement, independently of layout/repaint activity. */
  addGraphChangeListener(listener:()=>void):()=>void {this.graphChangeListeners.add(listener);return ()=>this.graphChangeListeners.delete(listener);}
  /**
   * Installs a FreshGraph through the base lifecycle and clears old relations' draw geometry.
   * @throws {TypeError} If graph is not a FreshGraph.
   */
  override setGraphEltSet(graph:GraphEltSet):void {
    if(!(graph instanceof FreshGraph))throw new TypeError("FreshmindPanel requires a FreshGraph");
    this.structuralView?.reset();
    this.rfc?.setFocus(null);
    this.navigation?.graphChanged(); this.neighborhoodFocus = null;
    this.neighborhoodRevision++; this.changingNeighborhood = false;
    for(const edge of this.getCompleteEltSet().getEdges())if(edge instanceof FreshEdge)edge.setGeometry(null);
    super.setGraphEltSet(graph);
    for(const listener of this.graphChangeListeners)listener();
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
    this.structuralView?.refresh();
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
    const style=this.types.resolveNode(node,states);
    if(this.nodeImportance.mode!=="configured")style.importance.mode=this.nodeImportance.mode;
    return style;
  }
  /** Resolves relation hover, selection and externally managed preselection/candidate flags. */
  getEdgeStyle(edge:FreshEdge):EdgeStyle {
    const states:InteractionState[]=[];
    if(edge===this.getMouseOverE())states.push("hover");if(edge===this.selectedEdge)states.push("selected");
    if(edge.isPreselected())states.push("preselected");if(edge.isKeyselected())states.push("activeCandidate");
    return this.types.resolveEdge(edge,states);
  }
  private geometries(arrangeLabels=true):Map<FreshEdge,EdgeGeometry> {
    const edges=[...this.getGES().getEdges()] as FreshEdge[];
    const result=routeEdges(edges,(x,y)=>this.getLensSet().convRealToDraw(x,y),e=>this.getEdgeStyle(e),n=>this.getNodeStyle(n));
    if(arrangeLabels&&this.relationLabelPlacement==="avoid-overlap")this.presentation.arrangeEdgeLabels(result,edges,this.labelObstacles(),e=>this.getEdgeStyle(e));
    return result;
  }
  private labelObstacles():OverlapBox[] {
    return [...this.getGES().getNodes()].map(node=>{
      const point=this.getLensSet().convRealToDraw(node.x,node.y);
      return {id:node.getID()!,x:point.x,y:point.y,width:node.getWidth()+4,height:node.getHeight()+4};
    });
  }
  /**
   * Recomputes visible routes under the current lenses and caches the requested edge's result.
   * Body dimensions come from the latest paint, or caller-supplied headless measurements.
   * Enabled label placement reuses the latest text measurements and the same candidates as painting.
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
    const edges = [...this.getGES().getEdges()] as FreshEdge[], geometries = this.geometries(false), state = this.rfc?.getState();
    const nodeIds = new Set(state?.active ? state.memberIds : []);
    const edgeIds = new Set(state?.active ? state.radialEdgeIds : []);
    this.presentation.paintRfcHalos(layer, [...this.getGES().getNodes()].filter(node => nodeIds.has(node.getID()!)) as FreshNode[],
      edges.filter(edge => edgeIds.has(edge.getID()!)), geometries, node => this.getNodeStyle(node), edge => this.getEdgeStyle(edge));
    const nodes=new Map([...this.getGES().getNodes()].map(node=>[node.getID()!,node as FreshNode])),byId=new Map(edges.map(edge=>[edge.getID()!,edge]));
    this.presentation.paintClusterRegions(layer,(state?.centers??[]).filter(c=>c.active&&c.kind==="cluster"&&c.memberIds.length)
      .map(c=>({id:c.structureId!,nodes:c.memberIds.map(id=>nodes.get(id)!),edges:c.edgeIds.map(id=>byId.get(id)!)})),geometries,node=>this.getNodeStyle(node));
    this.presentation.paintRfcRegions(layer,state?.regions??[],(x,y)=>this.getLensSet().convRealToDraw(x,y));
    this.presentation.paintEdges(layer,edges,geometries,e=>this.getEdgeStyle(e),this.selectedEdge,{
      hover:edge=>{this.setMouseOverE(edge);this.repaint();},
      select:edge=>this.setSelectEdge(edge===this.selectedEdge?null:edge)
    },this.relationLabelPlacement==="avoid-overlap"?this.labelObstacles():undefined);
  }
  protected override paintDecorations(layer:SVGGElement):void {
    this.presentation.paintDecorations(layer,[...this.getGES().getNodes()] as FreshNode[],n=>this.getNodeStyle(n),this.getFocus() as FreshNode|null);
    this.presentation.paintAggregation(layer,this.structuralView?.getState().groups??[],id=>this.getCompleteEltSet().findNode(id));
    this.presentation.paintNodeWeights(layer,[...this.getGES().getNodes()] as FreshNode[],this.nodeImportance.showValues);
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
    return `${node.getLabel()}${node.fixed ? " (pinned)" : ""}${node instanceof FreshNode?`\nWeight: ${node.getWeight()}`:""}\nDouble-click or press Enter to center; E to expand; Space for details`;
  }
  override clearAll(): void {
    this.structuralView?.reset();
    this.rfc?.setFocus(null);
    this.navigation?.graphChanged(); this.neighborhoodFocus = null;
    this.neighborhoodRevision++; this.changingNeighborhood = false; super.clearAll();
  }
  override destroy(): void {
    this.structuralView?.destroy();
    this.rfcPaintRevision++; this.removeRfcPaint?.();
    this.removeRfcForce?.(); this.rfc?.destroy();
    this.unbindNavigation?.(); this.navigation?.destroy(); this.selectionListeners.clear(); super.destroy();
  }
}
