/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {FreshNode} from "../model/index.js";
import type {FreshmindPanel} from "./panel.js";

/** A feature-owned query input inside its node group; Enter submits, blur retains a draft, Escape cancels. */
export class GraphQueryEditor {
  private active?:{node:FreshNode;group:SVGGElement;box:SVGForeignObjectElement;field:HTMLInputElement;svg:SVGSVGElement;source:string;composing:boolean};
  private readonly drafts=new WeakMap<FreshNode,{text:string;source:string}>();
  private readonly graphListener={graphMoved:()=>this.reconcile(),graphReset:()=>this.close()};
  private readonly removeGraphChange:()=>void;
  private readonly removeSelection:()=>void;
  constructor(private readonly panel:FreshmindPanel,private readonly submit:(node:FreshNode,text:string)=>void) {
    panel.addGraphListener(this.graphListener);
    this.removeGraphChange=panel.addGraphChangeListener(()=>this.close());
    this.removeSelection=panel.addSelectionListener(item=>{if(this.active&&item!==this.active.node)this.close();});
  }
  open(node:FreshNode,text:string):boolean {
    this.close();const group=this.panel.getNodeElement(node),svg=group?.ownerSVGElement;if(!group||!svg)return false;
    const owner=group.ownerDocument,box=owner.createElementNS("http://www.w3.org/2000/svg","foreignObject"),field=owner.createElement("input");
    box.classList.add("fm-query-editor");box.setAttribute("x","-120");box.setAttribute("y","-16");box.setAttribute("width","240");box.setAttribute("height","32");
    const draft=this.drafts.get(node);
    field.type="text";field.maxLength=4096;field.value=draft?.text??text;field.placeholder="Type a query";
    field.setAttribute("aria-label",node.getSemanticType()==="ldaquery"?"LDA query on graph":"Lexical query on graph");
    field.setAttribute("aria-keyshortcuts","Enter Escape");field.title="Enter searches; Escape cancels editing. After leaving the input, Ctrl+Backspace/Delete removes this query.";
    field.style.cssText="box-sizing:border-box;width:240px;height:32px;padding:3px 6px;border:2px solid #42674a;border-radius:5px;background:#fff;color:#172c22;font:16px sans-serif;user-select:text;cursor:text;";
    box.append(field);group.append(box);const entry=this.active={node,group,box,field,svg,source:draft?.source??JSON.stringify([node.getLabel(),node.getData().search]),composing:false};
    group.classList.add("fm-query-editing");
    for(const name of ["pointerdown","mousedown","touchstart","click","dblclick"])field.addEventListener(name,event=>event.stopPropagation());
    field.addEventListener("input",()=>{this.drafts.set(node,{text:field.value,source:entry.source});field.removeAttribute("aria-invalid");});
    field.addEventListener("compositionstart",()=>{if(this.active)this.active.composing=true;});
    field.addEventListener("compositionend",()=>{if(this.active)this.active.composing=false;});
    field.addEventListener("blur",()=>{if(this.active?.field===field)this.close();});
    // Navigation protects native text on this same SVG capture phase, so target key listeners cannot run.
    svg.addEventListener("keydown",this.keydown,true);
    field.focus({preventScroll:true});field.select();return true;
  }
  private reconcile():void {
    const entry=this.active;if(entry&&(!entry.box.isConnected||!this.panel.getGES().contains(entry.node)))this.close();
  }
  private keydown=(event:KeyboardEvent):void=>{
    const entry=this.active;if(!entry||event.target!==entry.field)return;
    event.stopPropagation();if(event.isComposing||entry.composing)return;
    if(event.key==="Escape"){
      event.preventDefault();this.drafts.delete(entry.node);this.close();entry.group.focus({preventScroll:true});
    }else if(event.key==="Enter"){
      event.preventDefault();if(event.repeat)return;
      try{
        if(!this.panel.getCompleteEltSet().contains(entry.node)||JSON.stringify([entry.node.getLabel(),entry.node.getData().search])!==entry.source)throw new Error("Query changed elsewhere. Escape reloads it.");
        this.submit(entry.node,entry.field.value);this.drafts.delete(entry.node);this.close();entry.group.focus({preventScroll:true});
      }catch(error){entry.field.setAttribute("aria-invalid","true");entry.field.title=error instanceof Error?error.message:String(error);}
    }
  };
  private close():void {
    const entry=this.active;if(!entry)return;this.active=undefined;
    entry.svg.removeEventListener("keydown",this.keydown,true);entry.group.classList.remove("fm-query-editing");entry.box.remove();
  }
  dispose():void {this.close();this.removeGraphChange();this.removeSelection();this.panel.removeGraphListener(this.graphListener);}
}
