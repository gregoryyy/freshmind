/* Apache-2.0. Copyright (c) 2026 Gregor Heinrich. */
/** Capture/test helper: set a visible slider in its declared scale; exercise its actual input bridge. */
export async function fillNumeric(locator,value) {
  const info=await locator.evaluate(element=>{
    const model=element.dataset.numberInput?element.ownerDocument.getElementById(element.dataset.numberInput):element;
    const slider=model.dataset.sliderId?element.ownerDocument.getElementById(model.dataset.sliderId):null;
    return {id:model.id,sliderId:slider?.id,scale:slider?.dataset.scale,offset:Number(slider?.dataset.offset??0),optional:element.ownerDocument.getElementById(`${model.id}-custom`)?.id,min:Number(model.min||'-Infinity'),max:Number(model.max||'Infinity')};
  });
  if(!info.sliderId){await locator.fill(value);return;}
  // Invalid host drafts deliberately test the unchanged configuration validators; range gestures cannot create them.
  if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<info.min||Number(value)>info.max)){
    await locator.evaluate((element,{id,value})=>{const model=element.ownerDocument.getElementById(id);model.value=value;model.dispatchEvent(new Event('input',{bubbles:true}));model.dispatchEvent(new Event('change',{bubbles:true}));},{id:info.id,value});return;
  }
  const page=locator.page();
  if(info.optional){const enabled=page.locator(`#${info.optional}`);await enabled.setChecked(value!=='');if(value==='')return;}
  const slider=page.locator(`#${info.sliderId}`);await slider.waitFor({state:'visible'});
  if(!await slider.isEnabled())throw new Error(`Slider ${info.sliderId} is disabled`);
  await slider.evaluate((element,value)=>{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));},String(info.scale==='log'?Math.log10(Number(value)+info.offset):Number(value)));
}

/** Use a visible radio when the single-choice menu is presented as a group. */
export async function selectChoice(locator,value) {
  const info=await locator.evaluate((element,value)=>{
    const model=element.dataset.choiceSource?element.ownerDocument.getElementById(element.dataset.choiceSource):element;
    const group=model.dataset.choiceGroup?element.ownerDocument.getElementById(model.dataset.choiceGroup):null;
    return {group:group?.id,radio:group?[...group.querySelectorAll('input[type=radio]')].find(input=>input.value===value)?.id:null};
  },value);
  if(!info.group)return locator.selectOption(value);
  if(!info.radio)throw new Error(`Radio choice ${String(value)} is unavailable in ${info.group}`);
  await locator.page().locator(`#${info.radio}`).click();return [value];
}
