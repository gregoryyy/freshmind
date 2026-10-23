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

export interface EdgeInteraction {
  hover(edge: FreshEdge | null): void;
  select(edge: FreshEdge): void;
}
/** SVG extension only: registry/model/geometry remain usable without DOM or D3. */
export class FreshmindPresentation {
  /**
   * Paints a node inside TGPanel's existing focusable group, retaining its input handlers.
   * Measures/wraps SVG text, updates body dimensions and caches the matching local hit outline.
   * Labels are text content; annotation HTML is not rendered here.
   * @param element Mounted node group containing the base .tg-label element.
   */
  paintNode(element: SVGGElement, node: FreshNode, style: NodeStyle): void {
    const group=select(element);
    group.classed("fm-node",true).attr("data-semantic-type",node.getSemanticType());
    const hidden=node.edgeCount()-node.visibleEdgeCount();
    group.attr("aria-label",`${node.getLabel()}, ${node.getSemanticType()}, ${node.edgeCount()} connections${hidden?`, ${hidden} hidden`:""}${node.fixed?", pinned":""}`);
    group.selectAll(".tg-shape, .tg-round-shape").attr("display","none");
    const label=element.querySelector<SVGTextElement>(".tg-label")!;
    label.style.font=style.text.font; label.setAttribute("fill",style.text.color);
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
    node.setDimensions(width,height);
    label.textContent="";
    lines.forEach((line,index)=>{
      const span=document.createElementNS("http://www.w3.org/2000/svg","tspan");
      span.setAttribute("x","0");span.setAttribute("y",String((index-(lines.length-1)/2)*lineHeight));span.textContent=line;label.append(span);
    });
    const outline=createNodeOutline(style.shape,width,height);node.setOutline(outline);
    group.selectAll<SVGPathElement,FreshNode>("path.fm-shape").data([node]).join("path").attr("class","fm-shape")
      .attr("d",outline.path).attr("fill",style.fill).attr("stroke",style.stroke.color)
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
    groups.attr("data-edge-id",edge=>edge.getID()).attr("data-semantic-type",edge=>edge.getSemanticType())
      .attr("aria-pressed",edge=>String(edge===selected))
      .attr("aria-label",edge=>`${edge.from.getLabel()} → ${edge.to.getLabel()}, ${edge.getLabel()||edge.getSemanticType()}`)
      .attr("opacity",edge=>(edge.from.markedForRemoval||edge.to.markedForRemoval)?0.15:1)
      .on("mouseenter",(_event,edge)=>interaction.hover(edge)).on("mouseleave",()=>interaction.hover(null))
      .on("click",(event:MouseEvent,edge)=>{event.stopPropagation();interaction.select(edge);})
      .on("keydown",(event:KeyboardEvent,edge)=>{if(event.key==="Enter"){event.preventDefault();interaction.select(edge);}});
    groups.each((edge,index,elements)=>{
      const group=select(elements[index]),style=styleOf(edge),geometry=geometries.get(edge)!;
      edge.setGeometry(geometry);
      const width=style.stroke.width*Math.max(.5,edge.getWeight()/10),size=style.arrow.size;
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
   * Paints weighted halos, focus outlines and pin marks in the panel's noninteractive sibling layer.
   * Keeping decorations outside node groups preserves body-only keyboard focus bounds.
   */
  paintDecorations(layer: SVGGElement, nodes: FreshNode[], styleOf:(node:FreshNode)=>NodeStyle, focus:FreshNode|null):void {
    const root=select(layer);
    root.selectAll<SVGEllipseElement,FreshNode>("ellipse.fm-halo").data(nodes.filter(n=>styleOf(n).halo.enabled),n=>n.getID()!).join("ellipse")
      .attr("class","fm-halo").attr("cx",n=>n.drawx).attr("cy",n=>n.drawy)
      .attr("rx",n=>n.getWidth()/2*Math.sqrt(Math.max(n.getWeight(),10)/10))
      .attr("ry",n=>n.getHeight()/2*Math.max(n.getWeight(),10)/10)
      .attr("fill",n=>styleOf(n).fill).attr("opacity",n=>n.markedForRemoval?0.1:styleOf(n).halo.opacity);
    root.selectAll<SVGPathElement,FreshNode>("path.fm-focus").data(focus?[focus]:[]).join("path").attr("class","fm-focus")
      .attr("d",n=>createNodeOutline(styleOf(n).shape,n.getWidth()+6,n.getHeight()+6).path)
      .attr("transform",n=>`translate(${n.drawx},${n.drawy})`).attr("fill","none").attr("stroke","#183b2b").attr("stroke-width",2);
    root.selectAll<SVGTextElement,FreshNode>("text.fm-pin").data(nodes.filter(n=>n.fixed),n=>n.getID()!).join("text")
      .attr("class","fm-pin").attr("x",n=>n.drawx+n.getWidth()/2+4).attr("y",n=>n.drawy-n.getHeight()/2)
      .attr("font-size",12).text("⌖");
  }
}
