/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import type { NodeShape, DashStyle } from "../config/core.js";
export interface Point { x: number; y: number; }
/** SVG outline and containment in node-local pixels, centered at (0, 0). */
export interface NodeOutline { path: string; contains(point: Point): boolean; }
/** Converts a named stroke pattern to SVG dash lengths; null selects the solid-stroke default. */
export function dashArray(dash: DashStyle): string | null {
  return ({ none: "0 1000", solid: null, dashed: "4 3", "long-dashed": "8 4", "dash-dotted": "6 3 1 3",
    "dash-double-dotted": "6 3 1 3 1 3", dotted: "1 3" } as const)[dash];
}
function polygonContains(points: Point[], p: Point): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
/**
 * Builds an origin-centered body outline shared by rendering, clipping and node picking.
 * Curved convex/concave sides use sampled polygons for containment.
 * @param shape Resolved visual shape; a circle requires equal supplied dimensions.
 * @param width Positive measured body width in draw pixels, excluding halos/counts.
 * @param height Positive measured body height in draw pixels, excluding halos/counts.
 */
export function createNodeOutline(shape: NodeShape, width: number, height: number): NodeOutline {
  const x = width / 2, y = height / 2, d = Math.min(width * .2, height * .45);
  const bounds = (p: Point) => Math.abs(p.x) <= x && Math.abs(p.y) <= y;
  if (shape === "ellipse" || shape === "circle") return {
    path: `M ${-x} 0 A ${x} ${y} 0 1 0 ${x} 0 A ${x} ${y} 0 1 0 ${-x} 0 Z`,
    contains: p => (p.x / x) ** 2 + (p.y / y) ** 2 <= 1
  };
  if (shape === "rounded-rectangle") {
    const r = Math.min(8, x, y);
    return {
      path: `M ${-x+r} ${-y} H ${x-r} A ${r} ${r} 0 0 1 ${x} ${-y+r} V ${y-r} A ${r} ${r} 0 0 1 ${x-r} ${y} H ${-x+r} A ${r} ${r} 0 0 1 ${-x} ${y-r} V ${-y+r} A ${r} ${r} 0 0 1 ${-x+r} ${-y} Z`,
      contains: p => bounds(p) && (Math.abs(p.x) <= x-r || Math.abs(p.y) <= y-r || (Math.abs(p.x)-x+r)**2 + (Math.abs(p.y)-y+r)**2 <= r*r)
    };
  }
  let points: Point[];
  const xy = (values: number[][]) => values.map(([x,y]) => ({x,y}));
  switch (shape) {
    case "parallelogram-right": points = xy([[-x+d,-y],[x,-y],[x-d,y],[-x,y]]); break;
    case "parallelogram-left": points = xy([[-x,-y],[x-d,-y],[x,y],[-x+d,y]]); break;
    case "double-trapezoid-horizontal": points = xy([[-x+d,-y],[x-d,-y],[x,0],[x-d,y],[-x+d,y],[-x,0]]); break;
    case "double-trapezoid-vertical": points = xy([[-x,-y+d],[0,-y],[x,-y+d],[x,y-d],[0,y],[-x,y-d]]); break;
    case "trapezoid": points = xy([[-x+d,-y],[x-d,-y],[x,y],[-x,y]]); break;
    case "inverted-trapezoid": points = xy([[-x,-y],[x,-y],[x-d,y],[-x+d,y]]); break;
    case "convex-rectangle": case "concave-rectangle": {
      const convex = shape === "convex-rectangle", end = convex ? x-d : x, control = convex ? x+d : x-2*d;
      const path = `M ${-end} ${-y} H ${end} Q ${control} 0 ${end} ${y} H ${-end} Q ${-control} 0 ${-end} ${-y} Z`;
      points = [{x:-end,y:-y},{x:end,y:-y}];
      for (let i=1;i<=24;i++) { const t=i/24; points.push({x:(1-t)**2*end+2*(1-t)*t*control+t*t*end,y:-y*(1-t)**2+y*t*t}); }
      points.push({x:-end,y});
      for (let i=1;i<=24;i++) { const t=i/24; points.push({x:-((1-t)**2)*end-2*(1-t)*t*control-t*t*end,y:y*(1-t)**2-y*t*t}); }
      return {path,contains:p=>polygonContains(points,p)};
    }
    default: points = xy([[-x,-y],[x,-y],[x,y],[-x,y]]);
  }
  return {path: `M ${points.map(p=>`${p.x} ${p.y}`).join(" L ")} Z`, contains:p=>polygonContains(points,p)};
}
