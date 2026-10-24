/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { select } from "d3-selection";
import { FreshNode, FreshEdge } from "../model.js";
import type { NodeStyle, EdgeStyle } from "../config/types.js";
import type { EdgeGeometry } from "./geometry.js";
import { createNodeOutline, dashArray } from "./shapes.js";
import type { NodeOutline } from "./shapes.js";
import {createClusterBoundary} from "./cluster-boundary.js";
import type {RfcRegionState} from "../rfc/types.js";
import {nodeImportanceScale} from "./importance.js";

export interface ClusterRegion {id:string;nodes:FreshNode[];edges:FreshEdge[];}

export interface EdgeInteraction {
  hover(edge: FreshEdge | null): void;
  select(edge: FreshEdge): void;
}
let nextHaloId = 0;
/** SVG extension only: registry/model/geometry remain usable without DOM or D3. */
export class FreshmindPresentation {
  private readonly haloFilterId = `fm-rfc-glow-${++nextHaloId}`;
  private readonly measurements = new WeakMap<SVGGElement, { key: string; width: number; height: number; outline: NodeOutline }>();
  /** Draws the physical exclusion boundary through all current lenses, rather than a screen-space ellipse. */
  paintRfcRegions(layer:SVGGElement,regions:readonly RfcRegionState[],project:(x:number,y:number)=>{x:number;y:number}):void {
    const root=select(layer).selectAll<SVGGElement,null>("g.fm-exclusion-regions").data(regions.length?[null]:[])
      .join("g").attr("class","fm-exclusion-regions").attr("aria-hidden","true").style("pointer-events","none").lower();
    root.selectAll<SVGPathElement,RfcRegionState>("path.fm-exclusion-region").data(regions,r=>r.id).join("path")
      .attr("class","fm-exclusion-region").attr("data-region-id",r=>r.id)
      .attr("d",r=>Array.from({length:97},(_,i)=>{
        const angle=i*Math.PI/48,p=project(r.center.x+r.radius/Math.sqrt(r.coordinateWeights.x)*Math.cos(angle),
          r.center.y+r.radius/Math.sqrt(r.coordinateWeights.y)*Math.sin(angle));
        return `${i?"L":"M"}${p.x},${p.y}`;
      }).join(" ")+" Z")
      .attr("fill","none").attr("stroke","#61758a").attr("stroke-width",1).attr("stroke-opacity",.65).attr("stroke-dasharray","5 5");
  }
  /** Draws translucent rounded enclosures behind halos/edges, without owning interaction or physical forces. */
  paintClusterRegions(layer:SVGGElement,clusters:ClusterRegion[],geometries:Map<FreshEdge,EdgeGeometry>,nodeStyle:(node:FreshNode)=>NodeStyle):void {
    const root=select(layer).selectAll<SVGGElement,null>("g.fm-cluster-regions").data(clusters.length?[null]:[])
      .join("g").attr("class","fm-cluster-regions").attr("aria-hidden","true").style("pointer-events","none").lower();
    const colors=["#b58a21","#268b83","#7766a5","#ba6e4d","#628847","#5d85aa"];
    const color=(id:string)=>{let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return colors[hash%colors.length];};
    root.selectAll<SVGPathElement,ClusterRegion>("path.fm-cluster-boundary").data(clusters,c=>c.id).join("path")
      .attr("class","fm-cluster-boundary").attr("data-structure-id",c=>c.id)
      .attr("d",c=>createClusterBoundary(c.nodes.map(node=>{const stroke=nodeStyle(node).stroke.width;return {x:node.drawx,y:node.drawy,width:node.getWidth()+stroke,height:node.getHeight()+stroke};}),
        c.edges.flatMap(edge=>{const geometry=geometries.get(edge);return geometry?[geometry.start,geometry.control,geometry.end]:[];})))
      .attr("fill",c=>color(c.id)).attr("fill-opacity",.1).attr("stroke",c=>color(c.id)).attr("stroke-opacity",.65)
      .attr("stroke-width",1.5).attr("stroke-linejoin","round");
  }
  /** Paints transient RFC membership beneath semantic edges/nodes, reusing their exact geometry. */
  paintRfcHalos(layer: SVGGElement, nodes: FreshNode[], edges: FreshEdge[], geometries: Map<FreshEdge, EdgeGeometry>,
    nodeStyle: (node: FreshNode) => NodeStyle, edgeStyle: (edge: FreshEdge) => EdgeStyle): void {
    const background = select(layer).selectAll<SVGGElement, null>("g.fm-rfc-halos").data(nodes.length ? [null] : [])
      .join(enter => enter.insert("g", ":first-child").attr("class", "fm-rfc-halos")
        .attr("aria-hidden", "true").style("pointer-events", "none"));
    // Blur the combined silhouette: yellow fades out instead of forming an outline.
    // A group bounding box remains nonzero even for a horizontal/vertical edge.
    background.attr("filter", `url(#${this.haloFilterId})`);
    const filter = background.selectAll("defs").data([null]).join("defs")
      .selectAll("filter").data([null]).join("filter").attr("id", this.haloFilterId)
      .attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%");
    filter.selectAll("feGaussianBlur").data([null]).join("feGaussianBlur").attr("stdDeviation", 5);
    background.selectAll<SVGPathElement, FreshEdge>("path.fm-rfc-edge-halo").data(edges, edge => edge.getID()!).join("path")
      .attr("class", "fm-rfc-edge-halo").attr("data-rfc-edge-id", edge => edge.getID())
      .attr("d", edge => geometries.get(edge)!.path).attr("fill", "none").attr("stroke", "#ffda35")
      .attr("stroke-width", edge => edgeStyle(edge).stroke.width * Math.max(.5, edge.getWeight() / 10) + 14)
      .attr("stroke-opacity", .55).attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
    background.selectAll<SVGPathElement, FreshNode>("path.fm-rfc-node-halo").data(nodes, node => node.getID()!).join("path")
      .attr("class", "fm-rfc-node-halo").attr("data-rfc-node-id", node => node.getID())
      .attr("d", node => createNodeOutline(nodeStyle(node).shape, node.getWidth() + 20, node.getHeight() + 20).path)
      .attr("transform", node => `translate(${node.drawx},${node.drawy})`)
      .attr("fill", "#ffda35").attr("fill-opacity", .45).attr("stroke", "none");
  }
  /**
   * Paints a node inside TGPanel's existing focusable group, retaining its input handlers.
   * Measures/wraps SVG text, updates body dimensions and caches the matching local hit outline.
   * Labels are text content; annotation HTML is not rendered here.
   * @param element Mounted node group containing the base .tg-label element.
   */
  paintNode(element: SVGGElement, node: FreshNode, style: NodeStyle): void {
    const group=select(element),scale=nodeImportanceScale(node.getWeight(),style.importance);
    // Native SVG outlines enclose a bounding box rather than this node's actual shape.
    group.classed("fm-node",true).attr("data-semantic-type",node.getSemanticType()).attr("data-importance-scale",scale).style("outline","none");
    const hidden=node.edgeCount()-node.visibleEdgeCount();
    group.attr("aria-label",`${node.getLabel()}, ${node.getSemanticType()}, weight ${node.getWeight()}, ${node.edgeCount()} connections${hidden?`, ${hidden} hidden`:""}${node.fixed?", pinned":""}`);
    group.selectAll(".tg-shape, .tg-round-shape").attr("display","none");
    const label=element.querySelector<SVGTextElement>(".tg-label")!;
    label.style.font=style.text.font; label.setAttribute("fill",style.text.color);
    // Layout animation changes position/colors, not text metrics. Measure only when
    // label, font loading, wrapping, padding or shape changes to avoid forced reflow each frame.
    const key=JSON.stringify([node.getLabel(),style.text.font,style.label,style.shape,scale,document.fonts?.status]);
    let layout=this.measurements.get(element);
    if(!layout || layout.key!==key) {
      // Measure intrinsic text before applying its display scale. Browser hinting can
      // otherwise slightly change the measured base width between importance values.
      label.removeAttribute("transform");
      const measure=(text:string)=>{label.textContent=text;return label.getComputedTextLength();};
      const lines:string[]=[];
      for(const paragraph of node.getLabel().split(/\r?\n/)) {
        let line="";
        for(const character of Array.from(paragraph)) {
          if(line && measure(line+character)>style.label.maxWidth) {
            const split=line.lastIndexOf(" ");
            if(split>0){lines.push(line.slice(0,split));line=line.slice(split+1)+character;}
            else {lines.push(line);line=character;}
          }else line+=character;
        }
        lines.push(line);
      }
      const textWidth=Math.max(0,...lines.map(measure));
      measure("Mg");
      const lineHeight=Math.max(12,label.getBBox().height*1.3);
      let width=Math.max(30,textWidth+style.label.paddingX*2),height=Math.max(28,lines.length*lineHeight+style.label.paddingY*2);
      if(!["rectangle","rounded-rectangle"].includes(style.shape))width+=24;
      if(style.shape==="circle")width=height=Math.max(width,height);
      width*=scale;height*=scale;
      label.textContent="";
      lines.forEach((line,index)=>{
        const span=document.createElementNS("http://www.w3.org/2000/svg","tspan");
        span.setAttribute("x","0");span.setAttribute("y",String((index-(lines.length-1)/2)*lineHeight));span.textContent=line;label.append(span);
      });
      layout={key,width,height,outline:createNodeOutline(style.shape,width,height)};
      this.measurements.set(element,layout);
    }
    label.setAttribute("transform",`scale(${scale})`);
    node.setDimensions(layout.width,layout.height);node.setOutline(layout.outline);
    group.selectAll<SVGPathElement,FreshNode>("path.fm-shape").data([node]).join("path").attr("class","fm-shape")
      .attr("d",layout.outline.path).attr("fill",style.fill).attr("stroke",style.stroke.color)
      .attr("stroke-width",style.stroke.width).attr("stroke-dasharray",dashArray(style.stroke.dash)).lower();
  }
  /**
   * Joins relation groups by stable ID and draws paths, transparent hit strokes, arrows and labels.
   * The supplied geometry is also cached on each edge for programmatic picking.
   * @param geometries Complete geometry map for the visible edges being painted.
   * @param interaction Panel-owned hover/selection callbacks; presentation owns no selection state.
   */
  paintEdges(layer: SVGGElement, edges: FreshEdge[], geometries: Map<FreshEdge,EdgeGeometry>,
    styleOf:(edge:FreshEdge)=>EdgeStyle, selected:FreshEdge|null, interaction:EdgeInteraction):void {
    const groups=select(layer).selectAll<SVGGElement,FreshEdge>("g.fm-edge").data(edges,edge=>edge.getID()!).join(enter=>{
      const group=enter.append("g").attr("class","fm-edge").attr("tabindex",0).attr("role","button");
      group.append("path").attr("class","fm-edge-path").attr("fill","none").style("pointer-events","none");
      group.append("path").attr("class","fm-edge-hit").attr("fill","none").attr("stroke","transparent").style("pointer-events","stroke");
      group.append("path").attr("class","fm-edge-arrow").style("pointer-events","none");
      group.append("text").attr("class","fm-edge-label").style("pointer-events","none");
      return group;
    });
    // Native SVG focus outlines enclose the whole curve/label bounding box.
    // Keyboard focus is shown on the routed stroke below, alongside selection color.
    groups.style("outline","none").attr("data-edge-id",edge=>edge.getID()).attr("data-semantic-type",edge=>edge.getSemanticType())
      .attr("aria-pressed",edge=>String(edge===selected))
      .attr("aria-label",edge=>`${edge.from.getLabel()} → ${edge.to.getLabel()}, ${edge.getLabel()||"Unlabeled relation"}, ${edge.getSemanticType()}`)
      .attr("opacity",edge=>(edge.from.markedForRemoval||edge.to.markedForRemoval)?0.15:1)
      .on("mouseenter",(_event,edge)=>interaction.hover(edge)).on("mouseleave",()=>interaction.hover(null))
      .on("click",(event:MouseEvent,edge)=>{event.stopPropagation();interaction.select(edge);})
      .on("keydown",(event:KeyboardEvent,edge)=>{if(event.key==="Enter"){event.preventDefault();interaction.select(edge);}});
    groups.each((edge,index,elements)=>{
      const group=select(elements[index]),style=styleOf(edge),geometry=geometries.get(edge)!;
      edge.setGeometry(geometry);
      const width=style.stroke.width*Math.max(.5,edge.getWeight()/10)+(elements[index].matches(":focus-visible")?2:0),size=style.arrow.size;
      group.select(".fm-edge-path").attr("d",geometry.path).attr("stroke",style.stroke.color)
        .attr("stroke-width",width).attr("stroke-dasharray",dashArray(style.stroke.dash));
      group.select(".fm-edge-hit").attr("d",geometry.path).attr("stroke-width",Math.max(12,width+8));
      group.select(".fm-edge-arrow").attr("display",style.arrow.placement==="none"?"none":null)
        .attr("d",`M ${-size} ${-size/2} L ${size} 0 L ${-size} ${size/2} Z`)
        .attr("fill",style.stroke.color).attr("transform",`translate(${geometry.arrowPoint.x},${geometry.arrowPoint.y}) rotate(${geometry.arrowAngle})`);
      group.select(".fm-edge-label").text(edge.getLabel()).attr("x",geometry.labelAnchor.x).attr("y",geometry.labelAnchor.y)
        .attr("fill",style.label.color).style("font",style.label.font);
    });
  }
  /**
   * Paints weighted halos, lens/keyboard focus outlines and pin marks in a noninteractive sibling layer.
   * Keeping decorations outside node groups preserves body-only keyboard focus bounds.
   */
  paintDecorations(layer: SVGGElement, nodes: FreshNode[], styleOf:(node:FreshNode)=>NodeStyle, focus:FreshNode|null):void {
    const root=select(layer);
    root.selectAll<SVGEllipseElement,FreshNode>("ellipse.fm-halo").data(nodes.filter(n=>styleOf(n).importance.mode==="legacy"&&styleOf(n).halo.enabled),n=>n.getID()!).join("ellipse")
      .attr("class","fm-halo").attr("cx",n=>n.drawx).attr("cy",n=>n.drawy)
      .attr("rx",n=>n.getWidth()/2*Math.sqrt(Math.min(1000,Math.max(n.getWeight(),10)/10)))
      .attr("ry",n=>n.getHeight()/2*Math.min(1000,Math.max(n.getWeight(),10)/10))
      .attr("fill",n=>styleOf(n).fill).attr("opacity",n=>n.markedForRemoval?0.1:styleOf(n).halo.opacity);
    root.selectAll<SVGPathElement,FreshNode>("path.fm-focus").data(focus?[focus]:[]).join("path").attr("class","fm-focus")
      .attr("d",n=>createNodeOutline(styleOf(n).shape,n.getWidth()+6,n.getHeight()+6).path)
      .attr("transform",n=>`translate(${n.drawx},${n.drawy})`).attr("fill","none").attr("stroke","#183b2b").attr("stroke-width",2);
    const focusedId=layer.ownerSVGElement?.querySelector<SVGGElement>(".fm-node:focus-visible")?.dataset.nodeId;
    const keyboardFocus=nodes.filter(n=>n.getID()===focusedId);
    root.selectAll<SVGPathElement,FreshNode>("path.fm-keyboard-focus").data(keyboardFocus,n=>n.getID()!).join("path")
      .attr("class","fm-keyboard-focus").attr("data-focus-node",n=>n.getID()!)
      .attr("d",n=>createNodeOutline(styleOf(n).shape,n.getWidth()+8,n.getHeight()+8).path)
      .attr("transform",n=>`translate(${n.drawx},${n.drawy})`).attr("fill","none").attr("stroke","#24472e")
      .attr("stroke-width",2).attr("aria-hidden","true");
    root.selectAll<SVGTextElement,FreshNode>("text.fm-pin").data(nodes.filter(n=>n.fixed),n=>n.getID()!).join("text")
      .attr("class","fm-pin").attr("x",n=>n.drawx+n.getWidth()/2+4).attr("y",n=>n.drawy-n.getHeight()/2)
      .attr("font-size",12).text("⌖");
  }
  /** Counts aggregated nodes by semantic type without modifying labels or node focus bounds. */
  paintAggregation(layer:SVGGElement,groups:readonly import("../structure-view/projection.js").AggregationGroup[],nodeOf:(id:string)=>FreshNode|null):void {
    const parents=[...new Set(groups.map(g=>g.parentId))].map(id=>({node:nodeOf(id)!,groups:groups.filter(g=>g.parentId===id)}));
    select(layer).selectAll<SVGTextElement,typeof parents[number]>("text.fm-aggregation-count").data(parents,p=>p.node.getID()!).join("text")
      .attr("class","fm-aggregation-count").attr("data-for-node",p=>p.node.getID()).attr("x",p=>p.node.drawx)
      .attr("y",p=>p.node.drawy+p.node.getHeight()/2+32).attr("text-anchor","middle").attr("font-size",10)
      .attr("fill","#284e3a").attr("pointer-events","none").text(p=>p.groups.map(g=>`+${g.type}: ${g.nodeIds.length}`).join(" · "));
  }
  /** Optional exact values are sibling decorations, keeping node body focus and hit bounds intact. */
  paintNodeWeights(layer:SVGGElement,nodes:FreshNode[],enabled:boolean):void {
    select(layer).selectAll<SVGTextElement,FreshNode>("text.fm-node-weight").data(enabled?nodes:[],n=>n.getID()!).join("text")
      .attr("class","fm-node-weight").attr("data-weight-node",n=>n.getID()).attr("x",n=>n.drawx).attr("y",n=>n.drawy-n.getHeight()/2-9)
      .attr("text-anchor","middle").attr("font-size",10).attr("fill","#39483b").attr("pointer-events","none").text(n=>`w: ${n.getWeight()}`);
  }
}
