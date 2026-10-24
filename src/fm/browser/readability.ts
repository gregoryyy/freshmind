/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {countNodeOverlaps,separateNodeOverlaps} from "../geometry/index.js";
import type {OverlapBox,OverlapOptions} from "../geometry/index.js";
import type {FreshmindPanel} from "./panel.js";
import {FreshNode} from "../model/index.js";

function bounds(panel:FreshmindPanel):OverlapBox[] {
  return [...panel.getGES().getNodes()].map(node=>{
    if(!(node instanceof FreshNode))throw new TypeError("Freshmind label arrangement requires FreshNode");
    const stroke=panel.getNodeStyle(node).stroke.width;
    return {id:node.getID()!,x:node.drawx,y:node.drawy,width:node.getWidth()+stroke,height:node.getHeight()+stroke,
      fixed:node.fixed||node===panel.getFocus()||node===panel.getDragNode()};
  });
}
export interface LabelSeparationResult {before:number;after:number;moved:number;passes:number}
/**
 * Separates visible measured bodies in draw coordinates, then uses the existing inverse lenses.
 * Pauses the layout when positions change. The application can synchronize its motion control.
 * Pinned, lens-focus and dragged nodes stay put; semantic data and hidden positions are retained.
 */
export function separateNodeLabels(panel:FreshmindPanel,options:OverlapOptions={}):LabelSeparationResult {
  panel.repaint();
  const result=separateNodeOverlaps(bounds(panel),options),positions=[];
  for(const box of result.boxes){
    const node=panel.getCompleteEltSet().findNode(box.id)!;
    if(box.x===node.drawx&&box.y===node.drawy)continue;
    const point=panel.getLensSet().convDrawToReal(box.x,box.y);
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw new RangeError("Cannot separate labels through this viewing transform");
    positions.push({node,point});
  }
  if(positions.length){
    panel.tgLayout.stop();
    for(const {node,point} of positions){node.setLocation(point);node.dx=0;node.dy=0;}
    panel.resetDamper();
    panel.repaintAfterMove();
  }
  return {before:result.before,after:countNodeOverlaps(bounds(panel)),moved:positions.length,passes:result.passes};
}
