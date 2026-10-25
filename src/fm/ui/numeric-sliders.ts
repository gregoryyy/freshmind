/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {FreshmindPanel} from "../browser/index.js";

/** Presentation only: existing numeric controls retain validation/configuration ownership. */
export function bindNumericSliders(panel:FreshmindPanel,root:HTMLElement):()=>void {
  let disposed=false,queued=false;
  const models=[...root.querySelectorAll<HTMLInputElement>('input[type="number"]')];
  if(models.some(model=>!model.id||model.ownerDocument.getElementById(model.id)!==model||model.dataset.sliderId))throw new Error("Slider controls need unique IDs and one active binding");
  const controls=models.map(model=>{
    const document=model.ownerDocument,id=model.id,labels=[...model.labels??[]],previousHidden=model.hidden,previousStep=model.step;
    const wrapper=document.createElement("div"),range=document.createElement("input"),output=document.createElement("output");
    wrapper.className="numeric-slider";range.type="range";range.id=`${id}-slider`;range.dataset.numberInput=id;
    model.dataset.sliderId=range.id;model.hidden=true;model.step="any";
    const optional=model.dataset.sliderOptional==="true",enabled=optional?document.createElement("input"):undefined;
    if(enabled){
      enabled.type="checkbox";enabled.id=`${id}-custom`;const label=document.createElement("label");label.className="pin-control slider-custom";
      label.append(enabled,document.createTextNode(" Use custom limit"));wrapper.append(label);
    }
    output.setAttribute("for",range.id);output.className="slider-value";output.id=`${id}-value`;range.setAttribute("aria-describedby",[model.getAttribute("aria-describedby"),output.id].filter(Boolean).join(" "));
    if(model.hasAttribute("aria-label"))range.setAttribute("aria-label",model.getAttribute("aria-label")!);
    const min=model.min?Number(model.min):0,initialMax=model.max?Number(model.max):100;
    const offset=min===0?1:0;
    const logarithmic=id!=="search-seed"&&((initialMax+offset)/(min+offset)>=1000||id==="search-distance");
    const increment=previousStep==="any"||!previousStep?undefined:Number(previousStep);
    let maximum=initialMax,lastValue:string|undefined,lastError="";
    const encode=(value:number)=>logarithmic?Math.log10(value+offset):value;
    const decode=(value:number)=>{
      let result=logarithmic?10**value-offset:value;
      if(increment)result=Math.round(result/increment)*increment;
      return Math.max(min,Math.min(maximum,increment&&Number.isInteger(increment)?Math.round(result):Number(result.toPrecision(12))));
    };
    range.dataset.scale=logarithmic?"log":"linear";range.dataset.offset=String(offset);
    range.min=String(encode(min));range.step=logarithmic?"any":String(increment??(initialMax>10?1:.01));
    const sync=()=>{
      if(disposed)return;
      const value=model.value,numeric=model.valueAsNumber;
      if(!model.max&&Number.isFinite(numeric)&&numeric>maximum)maximum=numeric;
      range.max=String(encode(maximum));
      if(lastValue!==value){
        lastValue=value;
        if(enabled)enabled.checked=value!=="";
        if(Number.isFinite(numeric)&&numeric>=min)range.value=String(encode(numeric));
        else if(value==="")range.value=String(encode(.6));
      }
      const disabled=model.disabled||Boolean(enabled&&!enabled.checked);
      if(range.disabled!==disabled)range.disabled=disabled;if(enabled&&enabled.disabled!==model.disabled)enabled.disabled=model.disabled;
      const text=value===""?"Default":String(Number.isFinite(numeric)?Number(numeric.toPrecision(12)):value);
      if(output.value!==text)output.value=text;
      output.title=value===""?"Use the search engine's default distance limit":value;
      range.setAttribute("aria-valuetext",text);
      const error=model.validationMessage;
      if(error!==lastError){lastError=error;range.setCustomValidity(error);range.setAttribute("aria-invalid",String(Boolean(error)));}
    };
    const write=(value:number)=>{
      model.value=enabled&&!enabled.checked?"":String(value);
      // Commit while dragging, before a graph repaint can restore the previous configuration.
      lastValue=model.value;model.dispatchEvent(new Event("input",{bubbles:true}));model.dispatchEvent(new Event("change",{bubbles:true}));sync();
    };
    const commit=()=>write(decode(range.valueAsNumber));
    const invalid=(event:Event)=>{event.preventDefault();sync();if(!range.disabled){range.focus({preventScroll:true});range.reportValidity();}};
    const keydown=(event:KeyboardEvent)=>{
      if(!logarithmic||!increment||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(event.key))return;
      event.preventDefault();const delta=['ArrowLeft','ArrowDown'].includes(event.key)?-increment:increment;
      const value=Math.max(min,Math.min(maximum,model.valueAsNumber+delta));range.value=String(encode(value));write(value);
    };
    range.addEventListener("input",commit);range.addEventListener("keydown",keydown);enabled?.addEventListener("change",commit);
    model.addEventListener("invalid",invalid);model.addEventListener("input",sync);model.addEventListener("change",sync);
    wrapper.append(range,output);model.after(wrapper);for(const label of labels)label.htmlFor=range.id;sync();
    return {sync,dispose:()=>{
      range.removeEventListener("input",commit);range.removeEventListener("keydown",keydown);enabled?.removeEventListener("change",commit);
      model.removeEventListener("invalid",invalid);model.removeEventListener("input",sync);model.removeEventListener("change",sync);
      for(const label of labels)label.htmlFor=id;model.hidden=previousHidden;model.step=previousStep;delete model.dataset.sliderId;wrapper.remove();
    }};
  });
  const sync=()=>{for(const control of controls)control.sync();};
  const schedule=()=>{if(disposed||queued)return;queued=true;queueMicrotask(()=>{queued=false;if(!disposed)sync();});};
  const observer=new MutationObserver(schedule);observer.observe(root,{subtree:true,attributes:true,attributeFilter:["disabled"]});
  root.addEventListener("input",schedule);root.addEventListener("change",schedule);
  const listener={graphMoved:sync,graphReset:sync};panel.addGraphListener(listener);
  const removeSelection=panel.addSelectionListener(sync),removeGraph=panel.addGraphChangeListener(sync),removeRfc=panel.getRfc().addListener(sync);
  return ()=>{if(disposed)return;disposed=true;observer.disconnect();root.removeEventListener("input",schedule);root.removeEventListener("change",schedule);panel.removeGraphListener(listener);removeSelection();removeGraph();removeRfc();for(const control of controls)control.dispose();};
}
