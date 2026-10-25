/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {FreshNode,FreshEdge} from "../model/index.js";
import type {FreshGraph} from "../model/index.js";
import {captureRadiusSnapshot,projectRadiusTwo} from "../struct-view/index.js";
import type {RadiusOptions,RadiusProjection,RadiusSnapshot} from "../struct-view/index.js";
import {RadiusTwoRenderer} from "../render/index.js";
import {graphSearchViewSeeds} from "../ir/index.js";
import type {GraphSearchSeed} from "../ir/index.js";
import type {FreshmindPanel,FreshmindSelection} from "./panel.js";
export interface RadiusTwoViewOptions {
  container:HTMLElement; graphContainer:HTMLElement; toggle:HTMLSelectElement;
  nodeLinkElements?:HTMLElement[]; editLabel():void; editDetails():void;
}
interface Inspection {center:string;options:RadiusOptions;selected:{kind:"node"|"edge";id:string}|null;occurrence?:string;seed?:GraphSearchSeed;}
/** Detached screen-space inspection. TG retains coordinates/locality; panel retains semantic selection. */
export class RadiusTwoView {
  private graph:FreshGraph;
  private snapshot?:RadiusSnapshot;
  private projection?:RadiusProjection;
  private nodes=new Map<string,FreshNode>();
  private edges=new Map<string,FreshEdge>();
  private active=false;private disposed=false;private wasRunning=false;private revision=0;private renderRevision=0;
  private center="";private settings:RadiusOptions={};private occurrence?:string;private history:Inspection[]=[];private future:Inspection[]=[];
  private previous:FreshmindSelection=null;private previousAnchor:FreshNode|null=null;
  private readonly root:HTMLElement;private readonly body:HTMLElement;private readonly title:HTMLElement;private readonly status:HTMLElement;
  private readonly renderer:RadiusTwoRenderer;private readonly direction:HTMLSelectElement;private readonly back:HTMLButtonElement;private readonly forward:HTMLButtonElement;
  private readonly seeds:HTMLSelectElement;private readonly seedStatus:HTMLElement;private readonly provenance:HTMLElement;
  private seedPage:GraphSearchSeed[]=[];private seedOffset=0;private seedTotal=0;private seed?:GraphSearchSeed;
  private readonly removers:(()=>void)[]=[];private readonly observer:ResizeObserver;
  private frame=0;private readonly savedHidden=new Map<HTMLElement,boolean>();
  private savedGraph={visibility:"",inert:false,aria:null as string|null};
  private rowLimit=6;private cellLimit=2;
  constructor(private readonly panel:FreshmindPanel,private readonly options:RadiusTwoViewOptions) {
    this.graph=panel.getCompleteEltSet();this.root=options.container;this.root.classList.add("radius-two-view");this.root.hidden=true;this.root.tabIndex=0;this.root.setAttribute("aria-label","Experimental neighbor table");
    const doc=this.root.ownerDocument,element=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
    const listen=(target:EventTarget,name:string,listener:EventListener)=>{target.addEventListener(name,listener);this.removers.push(()=>target.removeEventListener(name,listener));};
    const button=(text:string,action:()=>void)=>{const b=element("button",text);b.type="button";listen(b,"click",()=>this.attempt(action));return b;};
    const header=element("header");header.className="r2-header";this.title=element("h2","Experimental neighbor table");
    const controls=element("div");controls.className="r2-controls";
    this.back=button("Back",()=>this.goBack());this.forward=button("Forward",()=>this.goForward());
    this.direction=element("select");this.direction.setAttribute("aria-label","Radius-two traversal");
    for(const [value,label] of [["both","Both directions"],["outgoing","Outgoing paths"],["incoming","Incoming paths"]]){const opt=element("option",label);opt.value=value;this.direction.append(opt);}
    listen(this.direction,"change",()=>this.attempt(()=>{this.pushHistory();this.settings={direction:this.direction.value as RadiusOptions["direction"]};this.seed=undefined;this.render();this.focusSelection();}));
    controls.append(this.back,this.forward,button("Use selected node",()=>this.useSelected()),button("Refresh snapshot",()=>this.refresh()),this.direction,button("Return to graph",()=>this.setEnabled(false)));
    this.status=element("p");this.status.setAttribute("role","status");
    const help=element("p","Experimental study of the complete stored graph; graph filters are independent. Arrows move focus, Space selects, Enter pivots. F2 edits; refresh after changes.");help.className="r2-help";
    const search=element("details"),summary=element("summary","Search result seeds");this.seeds=element("select");this.seeds.setAttribute("aria-label","Search result seed");
    this.seedStatus=element("span");this.provenance=element("p");
    search.append(summary,this.seeds,button("Previous seeds",()=>this.seedPaging(-50)),button("Next seeds",()=>this.seedPaging(50)),this.seedStatus,this.provenance);
    listen(this.seeds,"change",()=>this.attempt(()=>{if(this.seeds.value==="")return;const seed=this.seedPage[Number(this.seeds.value)];if(!seed)return;
      // Capture a fresh generation before adopting a result, never graft a stale source onto an older snapshot.
      const valid=graphSearchViewSeeds(this.panel.getCompleteEltSet(),this.seedOffset).items.find(s=>s.edgeId===seed.edgeId&&JSON.stringify(s)===JSON.stringify(seed));
      if(!valid)throw new Error("Search seed changed or became stale; refresh the results");
      this.refresh(seed.nodeId);this.seed=valid;const index=this.seedPage.findIndex(item=>item.edgeId===valid.edgeId);this.seeds.value=index<0?"":String(index);this.selectNode(seed.nodeId,JSON.stringify(["center",seed.nodeId]));this.showProvenance();this.focusSelection();}));
    header.append(this.title,controls,this.status,help,search);this.body=element("div");this.body.className="r2-body";this.renderer=new RadiusTwoRenderer(this.body);this.root.replaceChildren(header,this.body);
    listen(options.toggle,"change",()=>this.attempt(()=>this.setEnabled(options.toggle.value==="radius-two")));
    listen(this.root,"focusin",event=>{const target=event.target;if(target instanceof HTMLElement&&target.matches(".r2-card"))this.occurrence=target.dataset.occurrence;});
    listen(this.root,"keydown",event=>this.keydown(event as KeyboardEvent));
    listen(this.root,"mousedown",event=>{if(!(event.target instanceof Element)||!event.target.closest("button,input,textarea,select,summary,a"))this.root.focus({preventScroll:true});});
    this.removers.push(panel.addGraphChangeListener(()=>this.graphChanged()),panel.addSelectionListener(()=>this.reflectSelection()));
    const graphListener={graphMoved:()=>{if(this.active)this.markChanged();}};panel.addGraphListener(graphListener);this.removers.push(()=>panel.removeGraphListener(graphListener));
    this.observer=new ResizeObserver(()=>{if(!this.active)return;this.schedule(()=>{const old=[this.rowLimit,this.cellLimit];this.measure();if(old[0]!==this.rowLimit||old[1]!==this.cellLimit){this.settings={...this.settings,rowOffset:0,cellOffsets:{}};this.render();}});});this.observer.observe(this.root);
  }
  isEnabled():boolean{return this.active;}
  private attempt(action:()=>void):void {if(this.disposed)return;try{action();}catch(error){this.status.textContent=error instanceof Error?error.message:String(error);}}
  private schedule(action:()=>void):void {cancelAnimationFrame(this.frame);const graph=this.panel.getCompleteEltSet();this.frame=requestAnimationFrame(()=>{this.frame=0;if(!this.disposed&&this.active&&graph===this.panel.getCompleteEltSet())this.attempt(()=>{if(!this.snapshot)this.refresh();else action();});});}
  private measure():void {
    const row=this.body.querySelector<HTMLElement>(".r2-row:not(.r2-headings):not(.r2-center-row)");
    const height=Math.max(105,row?.getBoundingClientRect().height??105);
    this.rowLimit=Math.max(2,Math.min(12,Math.floor((this.root.clientHeight-this.root.querySelector("header")!.clientHeight-70)/height)-1));
    this.cellLimit=Math.max(1,Math.min(4,Math.floor(((this.root.clientWidth-200)/2-35)/150)));
  }
  setEnabled(enabled:boolean):void {
    if(this.disposed||enabled===this.active)return;
    this.active=enabled;this.options.toggle.value=enabled?"radius-two":"node-link";this.root.hidden=!enabled;
    const host=this.options.graphContainer;
    if(enabled) {
      this.wasRunning=this.panel.tgLayout.isRunning();this.panel.tgLayout.stop();this.previous=this.panel.getSelection();this.previousAnchor=this.panel.getSelect() as FreshNode|null;
      this.savedGraph={visibility:host.style.visibility,inert:host.inert,aria:host.getAttribute("aria-hidden")};host.style.visibility="hidden";host.inert=true;host.setAttribute("aria-hidden","true");
      for(const element of this.options.nodeLinkElements??[]){this.savedHidden.set(element,element.hidden);element.hidden=true;}
      this.center="";this.measure();this.refresh();this.focusSelection();
    } else {
      cancelAnimationFrame(this.frame);this.frame=0;this.renderRevision++;
      host.style.visibility=this.savedGraph.visibility;host.inert=this.savedGraph.inert;if(this.savedGraph.aria===null)host.removeAttribute("aria-hidden");else host.setAttribute("aria-hidden",this.savedGraph.aria);
      for(const [element,hidden] of this.savedHidden)element.hidden=hidden;this.savedHidden.clear();
      const current=this.panel.getSelection();
      if(current&&!this.panel.getGES().contains(current)) {
        const anchor=this.previousAnchor&&this.panel.getGES().contains(this.previousAnchor)?this.previousAnchor:null;this.panel.setSelect(anchor);
        if(this.previous instanceof FreshEdge&&this.panel.getGES().contains(this.previous))this.panel.setSelectEdge(this.previous);
      } else if(current instanceof FreshEdge)this.panel.setSelectEdge(current);
      else this.panel.setSelect(current);
      if(this.wasRunning)this.panel.tgLayout.start();this.panel.focusGraph();
    }
  }
  /** Indicates that an accepted edit/job may have changed the frozen snapshot; never rearranges a target. */
  markChanged():void {if(this.active){this.status.textContent="Graph/view changed. Refresh to update this frozen snapshot.";}}
  private graphChanged():void {
    if(this.active&&this.body.contains(this.root.ownerDocument.activeElement))this.root.focus({preventScroll:true});
    this.graph=this.panel.getCompleteEltSet();this.snapshot=undefined;this.projection=undefined;this.history=[];this.future=[];this.nodes.clear();this.edges.clear();this.previous=null;this.previousAnchor=null;this.seed=undefined;this.seedPage=[];this.seeds.replaceChildren();this.seeds.disabled=true;this.provenance.textContent="";this.renderRevision++;
    if(this.active){this.panel.tgLayout.stop();this.body.replaceChildren();this.status.textContent="Document replaced; preparing its neighborhood.";this.schedule(()=>this.refresh());}
  }
  refresh(centerId?:string):void {
    if(!this.active||this.disposed)return;
    const focused=this.root.ownerDocument.activeElement,restoreFocus=focused===this.root||this.body.contains(focused);
    this.renderRevision++;this.body.replaceChildren();this.snapshot=undefined;this.projection=undefined;
    this.graph=this.panel.getCompleteEltSet();this.snapshot=captureRadiusSnapshot(this.graph,`radius:${++this.revision}`);
    this.nodes=new Map([...this.graph.getNodes()].map(n=>[n.getID()!,n]));this.edges=new Map([...this.graph.getEdges()].map(e=>[e.getID()!,e]));
    const selected=this.panel.getSelection(),fallback=selected instanceof FreshNode?selected.getID():this.panel.getSelect()?.getID();
    this.center=centerId??(this.nodes.has(this.center)?this.center:fallback??this.graph.getFirstNode()?.getID()??"");
    this.settings={direction:this.direction.value as RadiusOptions["direction"]};this.history=[];this.future=[];this.occurrence=undefined;this.seed=undefined;this.seedOffset=0;
    this.render();this.updateSeeds();this.showProvenance();if(restoreFocus)this.focusSelection();
  }
  private inspection():Inspection {const item=this.panel.getSelection();return {center:this.center,options:structuredClone(this.settings),selected:item?{kind:item instanceof FreshNode?"node":"edge",id:item.getID()!}:null,occurrence:this.occurrence,seed:this.seed?structuredClone(this.seed):undefined};}
  private pushHistory():void {this.history.push(this.inspection());if(this.history.length>100)this.history.shift();this.future=[];}
  private restore(entry:Inspection):void {
    if(!this.liveNode(entry.center))throw new Error("History target changed; refresh the snapshot");
    this.center=entry.center;this.settings=entry.options;this.direction.value=this.settings.direction??"both";this.occurrence=entry.occurrence;this.seed=entry.seed;this.render();
    if(entry.selected?.kind==="node")this.selectNode(entry.selected.id,entry.occurrence);
    else if(entry.selected?.kind==="edge")this.selectEdge(entry.selected.id);
    else this.panel.setSelect(null);
    this.focusSelection();this.showProvenance();
  }
  goBack():void {const entry=this.history.pop();if(!entry)return;this.future.push(this.inspection());this.restore(entry);}
  goForward():void {const entry=this.future.pop();if(!entry)return;this.history.push(this.inspection());this.restore(entry);}
  private liveNode(id:string):FreshNode|undefined {const node=this.nodes.get(id);return node&&this.graph===this.panel.getCompleteEltSet()&&this.graph.contains(node)?node:undefined;}
  private selectNode(id:string,occurrence?:string):void {const node=this.liveNode(id);if(!node)throw new Error("Node identity changed; refresh this snapshot");this.occurrence=occurrence;this.panel.setSelect(node,{allowHidden:true});this.renderer.select(id,occurrence);}
  private selectEdge(id:string):void {const edge=this.edges.get(id);if(!edge||this.graph!==this.panel.getCompleteEltSet()||!this.graph.contains(edge))throw new Error("Relation identity changed; refresh this snapshot");this.panel.setSelectEdge(edge,{allowHidden:true});this.status.textContent=`Selected relation ${id}. F2 edits its details in the overlay.`;}
  pivot(id:string):void {if(!this.liveNode(id))throw new Error("Node identity changed; refresh this snapshot");this.pushHistory();this.center=id;this.settings={direction:this.settings.direction};this.occurrence=undefined;this.seed=undefined;this.render();this.selectNode(id,JSON.stringify(["center",id]));this.focusSelection();this.showProvenance();}
  useSelected():void {const selected=this.panel.getSelection();if(!(selected instanceof FreshNode))throw new Error("Select a node first");if(!this.snapshot||!this.nodes.has(selected.getID()!))this.refresh(selected.getID()!);else this.pivot(selected.getID()!);}
  private render():void {
    if(!this.active||!this.snapshot)return;
    this.back.disabled=!this.history.length;this.forward.disabled=!this.future.length;
    if(!this.center){this.title.textContent="Experimental neighbor table — empty graph";this.body.textContent="No graph nodes. Return to graph to create or open a document.";this.status.textContent="Empty document.";return;}
    this.projection=projectRadiusTwo(this.snapshot,this.center,{...this.settings,rowLimit:this.rowLimit,cellLimit:this.cellLimit});
    this.title.textContent=`Experimental neighbor table · ${this.nodes.get(this.center)?.getLabel()||this.center}`;this.status.textContent=`Snapshot of the complete stored graph · ${this.projection.direction} paths.`;
    const graph=this.graph,revision=++this.renderRevision;
    const guard=<T extends unknown[]>(action:(...args:T)=>void)=>(...args:T)=>{if(!this.disposed&&this.active&&graph===this.panel.getCompleteEltSet()&&revision===this.renderRevision)this.attempt(()=>action(...args));};
    const selected=this.panel.getSelection();
    this.renderer.render(this.projection,{
      selectNode:guard((id,key)=>this.selectNode(id,key)),pivot:guard(id=>this.pivot(id)),selectEdge:guard(id=>this.selectEdge(id)),
      pageRows:guard(offset=>{this.settings={...this.settings,rowOffset:offset};this.render();this.focusSelection();}),
      pageCells:guard((row,wing,offset)=>{this.settings={...this.settings,cellOffsets:{...this.settings.cellOffsets,[row]:{...this.settings.cellOffsets?.[row],[wing]:offset}}};this.render();this.focusSelection();}),
      pageOther:guard(offset=>{this.settings={...this.settings,otherOffset:offset};this.render();}),
      jumpRow:guard(id=>{const index=this.projection!.directNodeIds.indexOf(id);if(index<0)return;this.settings={...this.settings,rowOffset:Math.floor(index/this.rowLimit)*this.rowLimit};this.render();this.renderer.focus(id);})
    },selected instanceof FreshNode?selected.getID():null,this.occurrence);
  }
  private reflectSelection():void {if(this.active){const item=this.panel.getSelection();this.renderer.select(item instanceof FreshNode?item.getID():null,this.occurrence);}}
  focusSelection():boolean {if(!this.active||this.disposed)return false;const item=this.panel.getSelection();this.renderer.focus(item instanceof FreshNode?item.getID():null,this.occurrence);if(!this.root.contains(this.root.ownerDocument.activeElement))this.root.focus({preventScroll:true});return true;}
  private updateSeeds():void {
    const page=graphSearchViewSeeds(this.graph,this.seedOffset);this.seedPage=page.items;this.seedTotal=page.total;this.seeds.replaceChildren();
    const placeholder=this.root.ownerDocument.createElement("option");placeholder.value="";placeholder.textContent="Choose an accepted lexical/LDA result…";this.seeds.append(placeholder);
    this.seedPage.forEach((seed,i)=>{const option=this.root.ownerDocument.createElement("option");option.value=String(i);option.textContent=`${seed.request.engine} · ${seed.request.query.slice(0,60)} · #${seed.rank} ${this.graph.findNode(seed.nodeId)!.getLabel().slice(0,80)}`;this.seeds.append(option);});this.seeds.disabled=!page.items.length;
    this.seedStatus.textContent=page.total?`${page.items.length?this.seedOffset+1:0}–${this.seedOffset+page.items.length} / ${page.total} verified results.`:"Run a search for verified result seeds. Saved results remain browsable in the graph.";
  }
  private seedPaging(delta:number):void {if(delta<0)this.seedOffset=Math.max(0,this.seedOffset+delta);else if(this.seedOffset+delta<this.seedTotal)this.seedOffset+=delta;this.updateSeeds();}
  private showProvenance():void {this.provenance.textContent=this.seed?`${this.seed.request.engine} · ${this.seed.request.kind} “${this.seed.request.query}” · source ${this.seed.sourceId} · result ${this.seed.nodeId} · rank ${this.seed.rank} · raw score ${this.seed.score}${this.seed.metric?` · ${this.seed.metric} ${this.seed.value}`:""} · corpus ${this.seed.corpus}`:"No retrieval seed selected. A query node can also be used directly as the center.";}
  private keydown(event:KeyboardEvent):void {
    if(event.defaultPrevented||event.isComposing||event.target instanceof Element&&event.target.closest("input,textarea,select,[contenteditable]"))return;
    const card=event.target instanceof HTMLElement?event.target.closest<HTMLButtonElement>(".r2-card"):null;
    if(!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey&&this.renderer.moveFocus(event)){event.preventDefault();return;}
    if(event.key==="Home"&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey){event.preventDefault();this.renderer.focus(this.center,JSON.stringify(["center",this.center]));return;}
    if((event.key==="PageDown"||event.key==="PageUp")&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey){event.preventDefault();this.attempt(()=>{const current=this.settings.rowOffset??0,offset=event.key==="PageUp"?Math.max(0,current-this.rowLimit):this.projection?.rows.nextOffset;if(offset!==undefined){this.settings={...this.settings,rowOffset:offset};this.render();this.focusSelection();}});return;}
    if(card&&event.key==="Enter"&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey){event.preventDefault();this.attempt(()=>this.pivot(card.dataset.radiusNodeId!));return;}
    if(event.key==="F2"&&!event.ctrlKey&&!event.metaKey&&!event.altKey||event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&(event.key==="Enter"||event.key===" ")){event.preventDefault();this.attempt(()=>event.shiftKey||event.key===" "?this.options.editDetails():this.options.editLabel());return;}
    if(event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&["ArrowLeft","ArrowRight"].includes(event.key)){event.preventDefault();this.attempt(()=>event.key==="ArrowLeft"?this.goBack():this.goForward());}
  }
  dispose():void {if(this.disposed)return;if(this.active)this.setEnabled(false);this.disposed=true;cancelAnimationFrame(this.frame);this.observer.disconnect();this.renderer.dispose();for(const remove of this.removers)remove();this.nodes.clear();this.edges.clear();this.snapshot=undefined;this.projection=undefined;this.history=[];this.future=[];this.previous=null;this.previousAnchor=null;this.seed=undefined;this.seedPage=[];this.seedOffset=0;this.seedTotal=0;this.center="";this.occurrence=undefined;this.settings={};this.renderRevision++;this.root.replaceChildren();}
}
