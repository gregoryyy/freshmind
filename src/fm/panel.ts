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
import type { EdgeStyle, InteractionState, NodeStyle } from "./config/types.js";
import { FreshmindPresentation } from "./rendering/presentation.js";
import { routeEdges } from "./rendering/geometry.js";
import type { EdgeGeometry } from "./rendering/geometry.js";

export interface FreshmindPanelOptions extends TGPanelOptions { types?: TypeRegistry; }
/** Freshmind extends the TouchGraph panel; graph/locality/layout/lenses remain owned by TGPanel. */
export class FreshmindPanel extends TGPanel {
  private types: TypeRegistry;
  private readonly presentation=new FreshmindPresentation();
  private selectedEdge: FreshEdge|null=null;
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
    if(container){this.mount(container);if(options.autoStart!==false)this.tgLayout.start();}
  }
  getTypeRegistry():TypeRegistry{return this.types;}
  /** Replaces a validated registry and repaints while preserving graph objects and physical positions. */
  setTypeRegistry(types:TypeRegistry):void{
    if(!(types instanceof TypeRegistry))throw new TypeError("Expected a TypeRegistry");
    this.types=types;this.repaint();
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
  /**
   * Selects a visible relation, retaining an incident selected node as the navigation anchor.
   * If necessary, selects its source through TGPanel before applying edge highlighting.
   * @param edge Relation to select, or null to clear edge selection while keeping the node anchor.
   * @throws {Error} If edge is not in the visible locality.
   */
  setSelectEdge(edge:FreshEdge|null):void {
    if(edge&&!this.getGES().contains(edge))throw new Error("Selected edge must be visible");
    if(edge&&this.getSelect()!==edge.from&&this.getSelect()!==edge.to)super.setSelect(edge.from);
    this.selectedEdge=edge;this.repaint();
  }
  /** Explicit node selection also clears edge selection and delegates callbacks to TGPanel. */
  override setSelect(node:Node|null):void{this.selectedEdge=null;super.setSelect(node);}
  /** Clears hidden edge selection/geometry after the base panel reconciles its references. */
  override localityChanged():void {
    super.localityChanged();
    if(this.selectedEdge&&!this.getGES().contains(this.selectedEdge))this.selectedEdge=null;
    for(const edge of this.getCompleteEltSet().getEdges())if(edge instanceof FreshEdge&&!this.getGES().contains(edge))edge.setGeometry(null);
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
    this.presentation.paintEdges(layer,[...this.getGES().getEdges()] as FreshEdge[],this.geometries(),e=>this.getEdgeStyle(e),this.selectedEdge,{
      hover:edge=>{this.setMouseOverE(edge);this.repaint();},
      select:edge=>this.setSelectEdge(edge===this.selectedEdge?null:edge)
    });
  }
  protected override paintDecorations(layer:SVGGElement):void {
    this.presentation.paintDecorations(layer,[...this.getGES().getNodes()] as FreshNode[],n=>this.getNodeStyle(n),this.getFocus() as FreshNode|null);
  }
}
