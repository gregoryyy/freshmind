/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {FreshmindPanel} from "../browser/index.js";

/** Horizontal radios for short single-choice menus; long inventories and multiple-choice lists retain their native control. */
export function bindChoiceRadios(panel:FreshmindPanel,root:HTMLElement):()=>void {
  let disposed=false,queued=false;
  const models=[...root.querySelectorAll<HTMLSelectElement>('select:not([multiple])')];
  if(models.some(model=>!model.id||model.dataset.choiceGroup))throw new Error("Radio choices need IDs and one active binding");
  const controls=models.map(model=>{
    const document=model.ownerDocument,labels=[...model.labels],hidden=model.hidden,labelHidden=labels.map(label=>label.hidden);
    const fieldset=document.createElement("fieldset");fieldset.id=`${model.id}-choices`;fieldset.dataset.choiceSource=model.id;fieldset.className="choice-control";fieldset.hidden=true;if(model.hasAttribute("aria-describedby"))fieldset.setAttribute("aria-describedby",model.getAttribute("aria-describedby")!);model.after(fieldset);
    let signature="",selection:string|undefined,active=false;
    const choose=(event:Event)=>{
      const input=event.target;if(!(input instanceof HTMLInputElement)||input.type!=="radio"||!input.checked||fieldset.disabled)return;
      model.value=input.value;model.dispatchEvent(new Event("input",{bubbles:true}));model.dispatchEvent(new Event("change",{bubbles:true}));sync();
    };
    const sync=()=>{
      if(disposed)return;
      const options=[...model.options],short=options.length>0&&options.length<=5&&!model.dataset.nativeSelect;
      const wasFocused=fieldset.contains(document.activeElement);
      if(short!==active){
        active=short;model.hidden=short||hidden;fieldset.hidden=!short;
        labels.forEach((label,i)=>{label.hidden=short||labelHidden[i]!;});
        if(short)model.dataset.choiceGroup=fieldset.id;else {delete model.dataset.choiceGroup;if(wasFocused&&!model.disabled)model.focus({preventScroll:true});}
      }
      if(!short)return;
      const next=JSON.stringify(options.map(option=>[option.value,option.text,option.disabled,option.dataset.shortLabel]));
      let rebuilt=false;
      if(next!==signature){
        signature=next;rebuilt=true;const focused=wasFocused?(document.activeElement as HTMLInputElement).value:undefined;
        const legend=document.createElement("legend");legend.textContent=labels.map(label=>label.textContent?.trim()).join(" ")||model.getAttribute("aria-label")||model.id;
        const choices=document.createElement("div");choices.className="choice-options";
        options.forEach((option,i)=>{
          const label=document.createElement("label"),radio=document.createElement("input"),text=document.createElement("span");
          label.className="choice-option";radio.type="radio";radio.name=`${model.id}-choice`;radio.id=`${model.id}-choice-${i}`;radio.value=option.value;radio.disabled=option.disabled;
          text.textContent=option.dataset.shortLabel??option.text;if(option.dataset.shortLabel)radio.setAttribute("aria-label",option.text);
          label.title=option.text;label.append(radio,text);choices.append(label);
        });
        fieldset.replaceChildren(legend,choices);
        if(focused!==undefined){const replacement=[...fieldset.querySelectorAll("input")].find(input=>input.value===focused);replacement?.focus({preventScroll:true});}
      }
      if(fieldset.disabled!==model.disabled)fieldset.disabled=model.disabled;
      // Preserve a native tentative click until change; synchronize only actual model changes.
      if(rebuilt||selection!==model.value){selection=model.value;for(const radio of fieldset.querySelectorAll("input"))if(radio.checked!==(radio.value===selection))radio.checked=radio.value===selection;}
    };
    fieldset.addEventListener("change",choose);model.addEventListener("input",sync);model.addEventListener("change",sync);sync();
    return {sync,dispose:()=>{fieldset.removeEventListener("change",choose);model.removeEventListener("input",sync);model.removeEventListener("change",sync);model.hidden=hidden;labels.forEach((label,i)=>{label.hidden=labelHidden[i]!;});delete model.dataset.choiceGroup;fieldset.remove();}};
  });
  const sync=()=>{for(const control of controls)control.sync();};
  const schedule=()=>{if(disposed||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(!disposed)sync();});};
  const observer=new MutationObserver(schedule);observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["disabled","label"]});
  root.addEventListener("change",schedule);
  const listener={graphMoved:sync,graphReset:sync};panel.addGraphListener(listener);
  const removeSelection=panel.addSelectionListener(sync),removeGraph=panel.addGraphChangeListener(sync),removeRfc=panel.getRfc().addListener(sync);
  return ()=>{if(disposed)return;disposed=true;observer.disconnect();root.removeEventListener("change",schedule);panel.removeGraphListener(listener);removeSelection();removeGraph();removeRfc();for(const control of controls)control.dispose();};
}
