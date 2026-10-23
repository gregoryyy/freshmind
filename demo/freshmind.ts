/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { FreshNode, FreshEdge, FreshGraph, FreshmindPanel, TypeRegistry } from "../src/fm/index.js";
import type { CurveMode } from "../src/fm/config/types.js";
import source from "../config/fm2014.types.yaml?raw";
import { bindZoomControls, bindKeymap } from "../src/fm/ui/index.js";
import "../src/fm/ui/style.css";
import "./style.css";
import "./freshmind.css";

const get=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const panel=new FreshmindPanel(get("graph"),{autoStart:false,animateLocality:false});
const disposeZoom = bindZoomControls(panel, {
  spacing: get<HTMLInputElement>("graph-zoom"), spacingValue: get("graph-zoom-value"),
  canvasIn: get("zoom-in"), canvasOut: get("zoom-out"), canvasReset: get("zoom-reset")
});
const disposeKeymap = bindKeymap(panel, {button: get("keymap-help")});
panel.addGraphListener({graphMoved:()=>{get<HTMLInputElement>("hyper").value=String(panel.getHyperbolic());}});
const graph=new FreshGraph();
const entries=Object.entries(panel.getTypeRegistry().getConfiguration().nodeTypes);
entries.forEach(([type,definition],index)=>{
  const node=new FreshNode(type,definition.label,{type,position:{x:(index%5-2)*180,y:(Math.floor(index/5)-2)*140+(index%5%2?70:0)}});
  graph.addNode(node);
});
const person=graph.findNode("person") as FreshNode,paper=graph.findNode("paper") as FreshNode;
graph.addEdge(new FreshEdge(person,paper,{id:"authored",type:"authored",label:"authored"}));
graph.addEdge(new FreshEdge(paper,graph.findNode("idea") as FreshNode,{id:"cites",type:"cites",label:"develops"}));
graph.addEdge(new FreshEdge(person,paper,{id:"reviewed",label:"reviewed",visual:{style:{stroke:{dash:"dashed"}}}}));
graph.addEdge(new FreshEdge(graph.findNode("software") as FreshNode,graph.findNode("project") as FreshNode,{id:"supports",label:"supports"}));
graph.addEdge(new FreshEdge(graph.findNode("topic") as FreshNode,graph.findNode("topic") as FreshNode,{id:"loop",label:"related to"}));
panel.setGraphEltSet(graph);panel.getGES().addAll();panel.setZoom(.85);panel.repaint();
get<HTMLTextAreaElement>("types").value=source;
get("apply-types").addEventListener("click",()=>{
  try{panel.loadTypeConfiguration(get<HTMLTextAreaElement>("types").value);get("config-status").textContent="Configuration applied";}
  catch(error){get("config-status").textContent=error instanceof Error?error.message:String(error);}
});
get<HTMLSelectElement>("curve").addEventListener("change",event=>{
  const config=panel.getTypeRegistry().getConfiguration();config.edgeVisuals.default.curve=(event.target as HTMLSelectElement).value as CurveMode;
  panel.setTypeRegistry(new TypeRegistry(config));
});
get<HTMLInputElement>("hyper").addEventListener("input",event=>panel.setHyperbolic(Number((event.target as HTMLInputElement).value)));
let running=false;
get("motion").addEventListener("click",()=>{running=!running;if(running){panel.resetDamper();panel.tgLayout.start();}else panel.tgLayout.stop();get("motion").textContent=running?"Pause layout":"Run layout";panel.focusGraph();});
get("show-all").addEventListener("click",()=>{panel.getGES().addAll();panel.repaint();panel.focusGraph();});
declare global { interface Window { freshmindBrowser: FreshmindPanel; } }
window.freshmindBrowser=panel;
window.addEventListener("pagehide",()=>{disposeKeymap();disposeZoom();panel.destroy();});
