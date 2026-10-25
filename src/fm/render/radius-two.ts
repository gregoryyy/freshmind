/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {RadiusProjection,RadiusRow,RadiusPage,RadiusWing} from "../struct-view/index.js";
export interface RadiusRenderActions {
  selectNode(id: string, occurrence: string): void; pivot(id: string): void; selectEdge(id: string): void;
  pageRows(offset: number): void; pageCells(row: string, wing: RadiusWing, offset: number): void;
  pageOther(offset: number): void; jumpRow(id: string): void;
}
const clip=(value:string)=>value.length>150?value.slice(0,149)+"…":value;
/** HTML projection only: callbacks retain all graph, command and navigation ownership. */
export class RadiusTwoRenderer {
  constructor(private readonly container: HTMLElement) {}
  private element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
    const el=this.container.ownerDocument.createElement(tag);if(text!==undefined)el.textContent=text;return el;
  }
  private button(text:string,action:()=>void,label=text):HTMLButtonElement {
    const button=this.element("button",text);button.type="button";button.setAttribute("aria-label",label);button.addEventListener("click",action);return button;
  }
  select(nodeId:string|null,occurrence?:string):void {
    const cards=[...this.container.querySelectorAll<HTMLButtonElement>(".r2-card")];
    for(const card of cards){const selected=card.dataset.radiusNodeId===nodeId;card.classList.toggle("r2-selected",selected);card.setAttribute("aria-pressed",String(selected));card.tabIndex=-1;}
    const focused=cards.find(card=>card.dataset.occurrence===occurrence)??cards.find(card=>card.dataset.radiusNodeId===nodeId)??cards.find(card=>card.dataset.center==="true");
    if(focused)focused.tabIndex=0;
  }
  focus(nodeId?:string|null,occurrence?:string):void {
    const cards=[...this.container.querySelectorAll<HTMLButtonElement>(".r2-card")];
    const card=cards.find(c=>occurrence&&c.dataset.occurrence===occurrence)??cards.find(c=>nodeId&&c.dataset.radiusNodeId===nodeId)??cards.find(c=>c.tabIndex===0);
    card?.focus({preventScroll:true});card?.scrollIntoView({block:"nearest",inline:"nearest"});
  }
  render(p:RadiusProjection,actions:RadiusRenderActions,selected:string|null,occurrence?:string):void {
    const nodes=new Map(p.nodes.map(n=>[n.id,n])),edges=new Map(p.edgeRecords.map(e=>[e.id,e]));
    const nodeName=(id:string)=>`${nodes.get(id)!.label || "(empty label)"} [${id}]`;
    const describe=(id:string)=>{const e=edges.get(id)!;return `${clip(nodeName(e.from))} ${e.direction==="undirected"?"— undirected —":"→"} ${clip(nodeName(e.to))} · ${clip(e.label || e.type)} · type ${clip(e.type)} · weight ${e.weight} · relation ${clip(e.id)}`;};
    const boundedList=(ids:readonly string[],build:(id:string)=>HTMLElement)=>{
      const list=this.element("div"),items=this.element("div"),controls=this.element("div");let offset=0;
      const show=()=>{items.replaceChildren(...ids.slice(offset,offset+8).map(build));controls.replaceChildren();
        if(offset)controls.append(this.button("Previous records",()=>{offset=Math.max(0,offset-8);show();}));
        controls.append(this.element("small",`${offset+1}–${Math.min(offset+8,ids.length)} / ${ids.length}`));
        if(offset+8<ids.length)controls.append(this.button("Next records",()=>{offset+=8;show();}));};
      show();list.append(items,controls);return list;
    };
    const relationList=(ids:string[],label:string)=>{
      const details=this.element("details"),summary=this.element("summary",`${label}: ${ids.length}`);details.append(summary,
        boundedList(ids,id=>this.button(clip(describe(id)),()=>actions.selectEdge(id),describe(id))));return details;
    };
    const card=(id:string,key:string,relationIds:string[]=[],center=false)=>{
      const box=this.element("div");box.className="r2-cell";
      const n=nodes.get(id)!,button=this.button(clip(n.label || "(empty label)"),()=>actions.selectNode(id,key),`${clip(nodeName(id))} · node importance ${n.weight}${relationIds.length?" · "+relationIds.slice(0,3).map(describe).join("; ")+(relationIds.length>3?` · ${relationIds.length} records; inspect paged relations`:""):""}`);
      button.className="r2-card";button.dataset.radiusNodeId=id;button.dataset.occurrence=key;button.dataset.center=String(center);button.addEventListener("dblclick",()=>actions.pivot(id));box.append(button,this.element("small",clip(id)));
      if(relationIds.length===1){const e=edges.get(relationIds[0])!;box.append(this.button(`${clip(e.label||e.type)} · ${e.direction==="undirected"?"—":"→"} weight ${e.weight}`,()=>actions.selectEdge(e.id),describe(e.id)));}
      else if(relationIds.length)box.append(relationList(relationIds,"Relations"));
      return box;
    };
    const pager=<T>(data:RadiusPage<T>,change:(offset:number)=>void,label:string)=>{
      const nav=this.element("div");nav.className="r2-page";
      if(data.offset){const prev=this.button("‹",()=>change(Math.max(0,data.offset-data.limit)),`Previous ${label}`);nav.append(prev);}
      nav.append(this.element("small",`${data.items.length?data.offset+1:0}–${data.offset+data.items.length} / ${data.total??`${data.knownItems} loaded`}${data.complete?"":" · incomplete"}`));
      if(data.nextOffset!==undefined)nav.append(this.button("›",()=>change(data.nextOffset!),`Next ${label}`));
      return nav;
    };
    const content=this.element("div");content.className="r2-content";
    const headings=this.element("div");headings.className="r2-row r2-headings";headings.append(this.element("span","Incoming to row node"),this.element("span","Direct neighbors"),this.element("span","Outgoing from row node"));content.append(headings);
    const wing=(row:RadiusRow,name:RadiusWing)=>{
      const holder=this.element("div");holder.className=`r2-wing r2-${name}`;
      const cells=this.element("div");cells.className="r2-cells";
      for(const item of row[name].items){const cell=card(item.nodeId,item.id,item.edgeIds);if(item.level==="second-step-candidate")cell.append(this.element("small","Second-step candidate; center adjacency incomplete"));
        const rowIds=p.witnesses[item.nodeId];
        if(rowIds.length>1){const witnesses=this.element("details");witnesses.append(this.element("summary",`Via ${rowIds.length}${p.counts.complete?"":" loaded"} rows`),
          boundedList(rowIds,rowId=>this.button(clip(nodeName(rowId)),()=>actions.jumpRow(rowId),`Show witness row ${clip(nodeName(rowId))}`)));cell.append(witnesses);}
        cells.append(cell);}
      holder.append(cells);if(row[name].knownItems || !row[name].complete)holder.append(pager(row[name],(offset)=>actions.pageCells(row.nodeId,name,offset),`${name} neighbors of ${nodeName(row.nodeId)}`));return holder;
    };
    const center=this.element("div");center.className="r2-row r2-center-row";center.append(this.element("div"),card(p.centerId,JSON.stringify(["center",p.centerId]),p.centerSelfEdgeIds,true),this.element("div"));
    const split=Math.ceil(p.rows.items.length/2);
    p.rows.items.forEach((row,index)=>{
      if(index===split)content.append(center);
      const line=this.element("section");line.className="r2-row";line.dataset.rowId=row.nodeId;line.setAttribute("aria-label",`Via ${nodeName(row.nodeId)}`);
      const middle=card(row.nodeId,row.id,row.centerEdgeIds);if(row.selfEdgeIds.length)middle.append(relationList(row.selfEdgeIds,"Self relations"));if(row.crossEdgeIds.length)middle.append(relationList(row.crossEdgeIds,"Links to other direct neighbors"));
      line.append(wing(row,"incoming"),middle,wing(row,"outgoing"));
      if(row.undirected.knownItems){const undirected=wing(row,"undirected");undirected.classList.add("r2-undirected-group");undirected.prepend(this.element("strong","Undirected relations — side has no direction meaning"));line.append(undirected);}
      content.append(line);
    });
    if(p.rows.items.length<=split)content.append(center);
    if(!p.rows.knownItems)content.append(this.element("p",p.rows.complete?"No direct neighbors under this policy.":"No direct neighbors loaded; adjacency is incomplete."));
    const other=this.element("section");other.className="r2-other";other.append(this.element("h3","Other neighborhood relations"),this.element("p","Includes second-hop cross-links, loops and any records outside the displayed traversal witnesses. These are real relations, not links between adjacent cells."));
    for(const id of p.otherRelations.items)other.append(this.button(clip(describe(id)),()=>actions.selectEdge(id),describe(id)));
    other.append(pager(p.otherRelations,actions.pageOther,"other relations"));
    const scope=this.element("p");scope.className="r2-counts";scope.textContent=`${p.counts.directNodes} direct nodes · ${p.counts.secondStepNodes} ${p.confirmedSecondHop?"unique second-hop nodes":"unique second-step candidates"} · ${p.counts.occurrences} row occurrences · ${p.counts.edgeRecords} relation records${p.counts.complete?"":" · known records only; scope incomplete"}`;
    this.container.replaceChildren(scope,pager(p.rows,actions.pageRows,"direct-neighbor rows"),content,other);
    this.select(selected,occurrence);
  }
  /** Roving node focus: screen position is an occurrence; semantic selection remains canonical. */
  moveFocus(event:KeyboardEvent):boolean {
    const active=this.container.ownerDocument.activeElement;
    if(!(active instanceof HTMLButtonElement)||!active.matches(".r2-card"))return false;
    const rows=[...this.container.querySelectorAll<HTMLElement>(".r2-row:not(.r2-headings)")],row=active.closest<HTMLElement>(".r2-row")!;
    const cards=[...row.querySelectorAll<HTMLButtonElement>(".r2-card")],column=cards.indexOf(active),index=rows.indexOf(row);
    let target:HTMLButtonElement|undefined;
    if(event.key==="ArrowLeft"||event.key==="ArrowRight")target=cards[column+(event.key==="ArrowLeft"?-1:1)];
    else if(event.key==="ArrowUp"||event.key==="ArrowDown"){const next=rows[index+(event.key==="ArrowUp"?-1:1)],nextCards=next?[...next.querySelectorAll<HTMLButtonElement>(".r2-card")]:[];target=nextCards[Math.min(column,nextCards.length-1)];}
    else return false;
    if(target){active.tabIndex=-1;target.tabIndex=0;target.focus();}return true;
  }
}
