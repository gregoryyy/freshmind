/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {FreshNode,FreshEdge} from "../model/index.js";
import {applyLabelEdit,parseWeightedLabel} from "../edit/index.js";
import type {FreshmindPanel} from "./panel.js";

type Item=FreshNode|FreshEdge;
/** Native controls normalize line endings; preserve the canonical source string until an actual edit. */
const controlText=(item:Item)=>item instanceof FreshNode?item.getLabel().replace(/\r\n?/g,"\n"):item.getLabel().replace(/\r\n?|\n/g," ");
interface Entry {
  item:Item;group:SVGGElement;text:SVGTextElement;box:SVGForeignObjectElement;
  field:HTMLTextAreaElement|HTMLInputElement;label:string;value:string;weight:number;
  dirty:boolean;composing:boolean;hint:string;key:string;width:number;height:number;offsetX:number;offsetY:number;
}
/** Persistent HTML text components move inside the existing SVG groups; the graph owns all positions. */
export class InPlaceLabels {
  private readonly entries=new Map<Item,Entry>();
  private readonly status:HTMLDivElement;
  constructor(private readonly svg:SVGSVGElement,private readonly panel:FreshmindPanel,private readonly changed:(item:Item)=>void) {
    this.status=svg.ownerDocument.createElement("div");this.status.className="fm-label-edit-status";
    this.status.setAttribute("role","status");this.status.setAttribute("aria-live","polite");
    this.status.style.cssText="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);";
    svg.parentElement!.append(this.status);
    // Navigation's capture handler protects native text input from inherited graph handlers.
    // Handle our own commit/cancel keys on that same SVG, before the target/bubbling handlers.
    svg.addEventListener("keydown",this.keydown,true);
  }
  labelOf=(item:Item):string=>this.entries.get(item)?.dirty?this.entries.get(item)!.field.value:item.getLabel();
  /** Drop drafts when a source item leaves the visible graph; never commit from detached controls. */
  reconcile():void {
    for(const entry of this.entries.values())if(!this.panel.getGES().contains(entry.item))this.remove(entry);
  }
  render():void {
    const groups=new Map([...this.svg.querySelectorAll<SVGGElement>(".fm-node,.fm-edge")].map(group=>[
      `${group.classList.contains("fm-node")?"node":"edge"}:${group.dataset.nodeId??group.dataset.edgeId}`,group]));
    for(const item of [...this.panel.getGES().getNodes(),...this.panel.getGES().getEdges()] as Item[]) {
      const node=item instanceof FreshNode,group=groups.get(`${node?"node":"edge"}:${item.getID()}`);
      if(!group)continue;
      let entry=this.entries.get(item);
      if(entry?.group!==group){if(entry)this.remove(entry);entry=this.create(item,group);}
      if(!entry.dirty&&!entry.composing) {
        const value=controlText(item);if(entry.field.value!==value)entry.field.value=value;
        entry.label=item.getLabel();entry.value=value;entry.weight=item.getWeight();
        entry.field.setAttribute("aria-label",`${node?"Node":"Relation"} label: ${item.getLabel()||item.getID()}`);
      }
      entry.text.style.visibility="hidden";entry.text.setAttribute("aria-hidden","true");
      group.setAttribute("tabindex","-1");group.setAttribute("role","group");group.removeAttribute("aria-pressed");this.position(entry);
    }
  }
  focus(item:Item,selectAll=true):boolean {
    const entry=this.entries.get(item);if(!entry)return false;
    entry.field.focus({preventScroll:true});if(selectAll)entry.field.select();return true;
  }
  adjustWeight(item:Item,direction:1|-1):boolean {
    const entry=this.entries.get(item);if(!entry)return false;
    this.focus(item,false);
    try {
      const input=entry.field.value,parsed=input===controlText(item)?{label:input}:parseWeightedLabel(input);
      const current=parsed.weight??item.getWeight(),next=Math.max(0,current+direction*(item instanceof FreshNode ? .1 : 1));
      if(!Number.isFinite(next))throw new RangeError("Weight must be finite");
      const weight=Number(next.toPrecision(15));
      entry.field.value=`${parsed.label} =${Number.isFinite(weight)?weight:next}`;this.input(entry);
      entry.field.setSelectionRange(entry.field.value.length,entry.field.value.length);
    }catch(error){this.error(entry,error);}
    return true;
  }
  /** A failed mode change leaves editable components and their invalid drafts available for correction. */
  finish():void {this.reconcile();for(const entry of this.entries.values())this.commit(entry);}
  reset():void {for(const entry of this.entries.values())this.remove(entry);}
  destroy():void {this.reset();this.svg.removeEventListener("keydown",this.keydown,true);this.status.remove();}

  private create(item:Item,group:SVGGElement):Entry {
    const owner=this.svg.ownerDocument,node=item instanceof FreshNode;
    const text=group.querySelector<SVGTextElement>(node?".tg-label":".fm-edge-label")!;
    const box=owner.createElementNS("http://www.w3.org/2000/svg","foreignObject");box.setAttribute("class","fm-editable-label");
    const field=owner.createElement(node?"textarea":"input");
    if(field instanceof HTMLTextAreaElement){field.rows=1;field.wrap="soft";}else field.type="text";
    field.className="fm-label-editor";field.value=controlText(item);field.spellcheck=false;
    field.setAttribute("aria-label",`${node?"Node":"Relation"} label: ${item.getLabel()||item.getID()}`);
    field.setAttribute("aria-keyshortcuts",node?"Control+Enter Meta+Enter Escape":"Enter Escape");
    field.title=node?"Edit label in place. Ctrl/Cmd+Enter or leaving saves; Escape cancels.":"Edit relation in place. Enter or leaving saves; Escape cancels.";
    if(!node)field.placeholder="label";
    // Inline styles keep library-only hosts usable without importing the optional UI stylesheet.
    field.style.cssText="display:block;box-sizing:border-box;margin:0;padding:0 2px;border:0;border-radius:2px;outline-offset:1px;background:transparent;min-width:0;min-height:0;max-width:none;resize:none;overflow:hidden;user-select:text;touch-action:auto;cursor:text;";
    box.style.overflow="visible";box.append(field);group.append(box);
    const entry:Entry={item,group,text,box,field,label:item.getLabel(),value:field.value,weight:item.getWeight(),dirty:false,composing:false,hint:field.title,key:"",width:0,height:0,offsetX:0,offsetY:0};
    this.entries.set(item,entry);
    for(const event of ["mousedown","pointerdown","touchstart","click","dblclick"])field.addEventListener(event,e=>e.stopPropagation());
    field.addEventListener("focus",()=>{
      if(!entry.dirty){entry.label=item.getLabel();entry.weight=item.getWeight();}
      if(node){if(this.panel.getSelection()!==item)this.panel.setSelect(item);}
      else if(this.panel.getSelectEdge()!==item)this.panel.setSelectEdge(item);
      this.status.textContent=field.title;
    });
    field.addEventListener("input",()=>this.input(entry));
    field.addEventListener("compositionstart",()=>{entry.composing=true;});
    field.addEventListener("compositionend",()=>{entry.composing=false;this.input(entry);if(owner.activeElement!==field)this.tryCommit(entry);});
    field.addEventListener("blur",()=>{if(!entry.composing)this.tryCommit(entry);});
    return entry;
  }
  private input(entry:Entry):void {
    entry.dirty=entry.field.value!==entry.value;entry.field.removeAttribute("aria-invalid");entry.field.title=entry.hint;
    this.panel.repaint();
  }
  private commit(entry:Entry):void {
    if(!this.entries.has(entry.item))return;
    try {
      if(entry.composing)throw new Error("Finish text composition before changing editing mode.");
      if(!entry.dirty)return;
      if(!this.panel.getGES().contains(entry.item)||!entry.box.isConnected)throw new Error("This item is no longer visible.");
      if(entry.item.getLabel()!==entry.label||entry.item.getWeight()!==entry.weight)throw new Error("The label or weight changed elsewhere. Escape reloads the current value.");
      applyLabelEdit(entry.item,entry.field.value);
      if(entry.item.getWeight()!==entry.weight)this.panel.resetDamper();
      entry.dirty=false;entry.label=entry.item.getLabel();entry.weight=entry.item.getWeight();entry.field.value=entry.value=controlText(entry.item);
      entry.field.removeAttribute("aria-invalid");entry.field.title=entry.hint;this.status.textContent="Label saved.";
      this.panel.repaintAfterMove();this.changed(entry.item);
    }catch(error){this.error(entry,error);throw error;}
  }
  private tryCommit(entry:Entry):void {try{this.commit(entry);}catch{/* Keep the draft visible and announce validation failure. */}}
  private error(entry:Entry,error:unknown):void {
    const message=error instanceof Error?error.message:String(error);entry.field.setAttribute("aria-invalid","true");
    entry.field.title=message;this.status.textContent=message;
  }
  private cancel(entry:Entry):void {
    entry.dirty=false;entry.label=entry.item.getLabel();entry.weight=entry.item.getWeight();entry.field.value=entry.value=controlText(entry.item);
    entry.field.removeAttribute("aria-invalid");entry.field.title=entry.hint;this.panel.repaint();this.status.textContent="Label edit canceled.";
  }
  private keydown=(event:KeyboardEvent):void=>{
    const entry=[...this.entries.values()].find(e=>e.field===event.target);if(!entry)return;
    event.stopPropagation();if(event.isComposing||entry.composing)return;
    if(event.key==="Escape") {event.preventDefault();this.cancel(entry);entry.group.focus({preventScroll:true});}
    else if(event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&["g","h"].includes(event.key.toLowerCase())) {
      event.preventDefault();this.adjustWeight(entry.item,event.key.toLowerCase()==="g"?1:-1);
    }else if(event.key==="Enter"&&(entry.item instanceof FreshEdge||event.ctrlKey||event.metaKey)) {
      event.preventDefault();try{this.commit(entry);entry.group.focus({preventScroll:true});}catch{/* Retain focus for correction. */}
    }
  };
  private position(entry:Entry):void {
    const {item,text,box,field}=entry,node=item instanceof FreshNode;
    let font:string,color:string,wrapping:unknown;
    if(item instanceof FreshNode){const style=this.panel.getNodeStyle(item);font=style.text.font;color=style.text.color;wrapping=style.label;}
    else {const style=this.panel.getEdgeStyle(item);font=style.label.font;color=style.label.color;}
    const scale=node?Number(entry.group.dataset.importanceScale)||1:1;
    const key=JSON.stringify([this.labelOf(item),font,wrapping,scale,text.ownerDocument.fonts?.status]);
    if(key!==entry.key) {
      const bounds=text.getBBox(),lines=node?text.querySelectorAll("tspan"):null;
      const typography=getComputedStyle(text);
      field.style.letterSpacing=typography.letterSpacing;field.style.wordSpacing=typography.wordSpacing;
      const lineHeight=lines&&lines.length>1?Number(lines[1].getAttribute("y"))-Number(lines[0].getAttribute("y")):Math.max(12,bounds.height*1.3);
      // Leave room for the native caret and fractional glyph metrics without rewrapping a fitted SVG line.
      entry.width=Math.max(node?16:44,bounds.width+6);entry.height=Math.ceil(Math.max(16,lineHeight*(lines?.length??1)))+2;
      entry.offsetX=node?-entry.width/2:bounds.width?bounds.x-Number(text.getAttribute("x"))-2:-2;
      entry.offsetY=node?-entry.height/2:bounds.height?bounds.y-Number(text.getAttribute("y"))-(entry.height-bounds.height)/2:-entry.height*.8;
      field.style.font=font;field.style.lineHeight=`${lineHeight}px`;field.style.width=`${entry.width}px`;field.style.height=`${entry.height}px`;
      field.style.textAlign=node?"center":"left";field.style.transform=`scale(${scale})`;field.style.transformOrigin="0 0";
      box.setAttribute("width",String(entry.width*scale));box.setAttribute("height",String(entry.height*scale));entry.key=key;
    }
    field.style.color=color;
    const anchor=node?{x:0,y:0}:item.getGeometry()?.labelAnchor;if(!anchor)return;
    box.setAttribute("x",String(anchor.x+entry.offsetX*scale));box.setAttribute("y",String(anchor.y+entry.offsetY*scale));
  }
  private remove(entry:Entry):void {
    this.entries.delete(entry.item);entry.dirty=false;
    entry.text.style.removeProperty("visibility");entry.text.removeAttribute("aria-hidden");
    entry.group.setAttribute("tabindex","0");entry.group.setAttribute("role","button");entry.box.remove();
  }
}
