/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import type {FreshmindDocument,FreshmindPanel} from "../src/fm/index.js";
import {rfcForcePresets} from "../src/fm/rfc/index.js";

const modes={
  plain:{foci:0,lens:0,aggregate:false,caption:"Ordinary layout keeps the whole community: six projects, three groups, seven people and eighteen notes."},
  lens:{foci:0,lens:60,aggregate:false,caption:"The viewing lens allocates more display space around Graph Atlas. It changes displayed coordinates independently of the physical layout."},
  single:{foci:1,lens:0,aggregate:false,caption:"Graph Atlas and its five immediate branches are reinforced. Focal-region exclusion pushes context away while keeping its relations."},
  two:{foci:2,lens:0,aggregate:false,caption:"Graph Atlas and Topic Lens have independent focal neighborhoods. Semantic Methods belongs to both; focal-region exclusion separates non-shared detail."},
  hybrid:{foci:2,lens:0,aggregate:true,caption:"Two foci retain their detail while remote leaf people and papers aggregate into typed counts. Maya and citation-bearing papers stay visible as bridges."},
  "hybrid-lens":{foci:2,lens:60,aggregate:true,caption:"The same hybrid rules compose with the viewing lens. Reveal a group's leaves to inspect detail, then continue browsing with the normal controls."}
} as const;
export interface RfcShowcaseElements {container:HTMLElement;mode:HTMLSelectElement;fit:HTMLButtonElement;caption:HTMLElement;}

/** Demo-owned comparisons on one example; file persistence and library defaults retain their owners. */
export function bindRfcShowcase(panel:FreshmindPanel,e:RfcShowcaseElements):{loaded:(doc:FreshmindDocument,example:string)=>void;dispose:()=>void} {
  let current:FreshmindDocument|undefined,revision=0,disposed=false;
  let initial=new Map<string,{x:number;y:number}>(),frame={zoom:.65,pan:{x:0,y:0}};
  const active=()=>!disposed&&current?.graph===panel.getCompleteEltSet();
  const fit=()=>{
    if(!active())return;
    const nodes=[...panel.getGES().getNodes()];if(!nodes.length)return;
    panel.setCanvasZoom(1);panel.setCanvasPan(0,0);panel.repaint();
    // Include body bounds, halos and the typed-count decoration below each parent.
    const left=Math.min(...nodes.map(n=>n.drawx-n.getWidth()/2-28)),right=Math.max(...nodes.map(n=>n.drawx+n.getWidth()/2+28));
    const top=Math.min(...nodes.map(n=>n.drawy-n.getHeight()/2-28)),bottom=Math.max(...nodes.map(n=>n.drawy+n.getHeight()/2+56));
    const size=panel.getSize(),center=panel.getDrawCenter();
    const zoom=Math.max(.15,Math.min(1,(size.width-60)/(right-left),(size.height-60)/(bottom-top)));
    panel.setCanvasZoom(zoom);panel.setCanvasPan((center.x-(left+right)/2)*zoom,(center.y-(top+bottom)/2)*zoom);
  };
  const choose=async()=>{
    const name=e.mode.value,mode=modes[name as keyof typeof modes];e.mode.value="";
    if(!mode||!active())return;
    const doc=current!,request=++revision,atlas=doc.graph.findNode("atlas"),topics=doc.graph.findNode("topics");
    if(!atlas||!topics){e.caption.textContent="A focus project was deleted. Reload the research community to use its comparison views.";return;}
    const locality=panel.setLocaleAll();panel.fastFinishAnimation();await locality;
    if(request!==revision||current!==doc||!active())return;
    if(!doc.graph.contains(atlas)||!doc.graph.contains(topics)){e.caption.textContent="A focus project was deleted. Reload the research community to use its comparison views.";return;}
    panel.getRfc().setFocus(null);panel.getStructuralView().reset();
    panel.setSelect(atlas);panel.centerOn(atlas,true);panel.setDragNode(null);
    const rfc=panel.getRfc();
    rfc.setStabilizationEnabled(false);rfc.configureExclusion({enabled:false});
    rfc.configure({...rfcForcePresets.tree,radialLength:160,coordinateWeights:{x:.25,y:1}});
    // Prime TG's queued rigidity without moving nodes. Clear momentum, then restore common starts.
    panel.tgLayout.setRigidity(.1);panel.tgLayout.stopMotion();panel.tgLayout.stopMotion();panel.tgLayout.tick();
    for(const node of doc.graph.getNodes()) {
      const position=initial.get(node.getID()!);if(position){node.x=position.x;node.y=position.y;}
      node.dx=node.dy=0;node.justMadeLocal=false;
    }
    if(mode.foci)rfc.setFocus(atlas);if(mode.foci===2)rfc.addFocus(topics);
    rfc.configureExclusion({enabled:mode.foci>0,overlap:true,strength:1,padding:50});
    panel.getStructuralView().configure({enabled:mode.aggregate,aggregateTypes:mode.aggregate?["person","paper"]:[],detailRadius:1});
    panel.setZoom(1);panel.setLensPan(0,0);panel.setRotation(0);panel.setHyperbolic(mode.lens);
    panel.setCanvasZoom(frame.zoom);panel.setCanvasPan(frame.pan.x,frame.pan.y);
    panel.resetDamper();panel.repaintAfterMove();e.caption.textContent=mode.caption;
  };
  const changed=()=>{void choose();};
  const graphChanged=()=>{if(current&&!active()){revision++;current=undefined;initial.clear();e.container.hidden=true;}};
  const listener={graphReset:graphChanged,graphMoved:graphChanged};panel.addGraphListener(listener);
  e.mode.addEventListener("change",changed);e.fit.addEventListener("click",fit);
  return {
    loaded:(doc,example)=>{
      revision++;current=doc.data.example==="rfc-showcase"?doc:undefined;e.container.hidden=!current;e.mode.value="";
      initial=new Map(current?[...doc.graph.getNodes()].map(n=>[n.getID()!,{x:n.x,y:n.y}]):[]);
      if(current){
        if(example==="rfc-showcase")fit();
        frame={zoom:panel.getCanvasZoom(),pan:panel.getCanvasPan()};
        e.caption.textContent="Compare the community's focus and context using the views below. You can also use every normal browser control.";
        // The built-in showcase opens ready to explore; ordinary file loads retain their saved view.
        if(example==="rfc-showcase"){e.mode.value=panel.getRfc().getState().enabled?"two":"plain";void choose();}
      }
    },
    dispose:()=>{disposed=true;revision++;current=undefined;initial.clear();panel.removeGraphListener(listener);e.mode.removeEventListener("change",changed);e.fit.removeEventListener("click",fit);}
  };
}
