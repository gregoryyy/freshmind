/* Apache-2.0. Copyright (c) 2026 Gregor Heinrich. */
import {selectChoice} from '../browser-controls.mjs';
async function sections(page,...ids){await page.locator('.sidebar > details').evaluateAll((items,ids)=>items.forEach(e=>e.open=ids.includes(e.id)),ids);await page.locator('.sidebar').evaluate(e=>e.scrollTop=0);}
async function fit(page){await page.evaluate(()=>{
  const p=window.graphBrowser;p.setCanvasZoom(1);p.repaint();const nodes=[...p.getGES().getNodes()],size=p.getSize(),center=p.getDrawCenter();
  const left=Math.min(...nodes.map(n=>n.drawx-n.getWidth()/2)),right=Math.max(...nodes.map(n=>n.drawx+n.getWidth()/2)),top=Math.min(...nodes.map(n=>n.drawy-n.getHeight()/2)),bottom=Math.max(...nodes.map(n=>n.drawy+n.getHeight()/2));
  const zoom=Math.min(1,(size.width-130)/(right-left),(size.height-130)/(bottom-top));p.setCanvasZoom(zoom);p.setCanvasPan((center.x-(left+right)/2)*zoom,(center.y-(top+bottom)/2)*zoom);document.activeElement?.blur();
});}
export const tour=[
  {id:'layout',title:'Layout controls as sliders and horizontal choices',caption:'The weighted-tree example is paused and its measured labels separated with the shipped readability command. RFC settings use sliders with live values. Short choices use horizontal radio groups; large example/substructure inventories keep menus. These are presentation controls over the existing graph and configuration owners.',async run({page,open,advance}){
    await open('/');await page.locator('#example-graph').selectOption('weighted-tree');await page.waitForFunction(()=>window.graphBrowser.getNodeCount()===7&&window.graphBrowser.getCompleteEltSet().getSubstructure('weighted-tree'));
    await page.evaluate(()=>{const p=window.graphBrowser;p.getRfc().activateSubstructure('weighted-tree');p.centerOn(p.findNode('root'),true);p.setHyperbolic(0);p.setZoom(2);});await advance(100);
    await sections(page,'view-section');await page.locator('#readability-section').evaluate(e=>e.open=true);await page.locator('#separate-labels').click();await fit(page);await sections(page,'rfc-section');
  }},
  {id:'search',title:'Search methods, metrics and result limits',caption:'Lexical/LDA and term/tag choices are directly visible. The LDA metric names remain available to assistive technology and on hover. An unchecked custom-distance limit retains the engine defaults; selecting a metric or moving a slider keeps the existing retrieval boundary.',async run({page}){
    await sections(page,'search-section');await selectChoice(page.locator('#search-engine'),'lda');await page.evaluate(()=>document.activeElement?.blur());
  }},
  {id:'training',title:'Topic-model settings remain local and inspectable',caption:'Topics, passes, random seed, vocabulary frequency and priors use sliders and live values. Wide magnitude ranges use logarithmic scales; integer arrows retain exact increments, including the random seed. The graph is not searched or retrained for this control demonstration.',async run({page}){
    await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);await page.locator('#search-section .control-subsection').scrollIntoViewIfNeeded();await page.locator('.sidebar').evaluate(e=>{const target=document.querySelector('#search-section .control-subsection');e.scrollTop+=target.getBoundingClientRect().top-e.getBoundingClientRect().top-15;});
  }},
  {id:'retracted',title:'Retract the controls and keep the document',caption:'Controls hides the panel and gives the graph its width. Settings, open sections and scroll position remain available when it reopens; quick search reveals its query field. Collapsing changes viewport geometry, preserving physical node coordinates and semantic data. The preference is session-only.',async run({page}){
    await page.getByRole('button',{name:'Hide controls',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.sidebar').hidden);await fit(page);
  }}
];
