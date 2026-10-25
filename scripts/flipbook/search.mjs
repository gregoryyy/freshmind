import {fillNumeric,selectChoice} from "../browser-controls.mjs";
/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich. */
async function fit(page,section='search'){await page.evaluate(section=>{
  const p=window.graphBrowser,nodes=[...p.getGES().getNodes()];p.setCanvasZoom(1);p.setCanvasPan(0,0);p.repaint();
  const left=Math.min(...nodes.map(n=>n.drawx-n.getWidth()/2-25)),right=Math.max(...nodes.map(n=>n.drawx+n.getWidth()/2+25)),top=Math.min(...nodes.map(n=>n.drawy-n.getHeight()/2-25)),bottom=Math.max(...nodes.map(n=>n.drawy+n.getHeight()/2+25));
  const size=p.getSize(),center=p.getDrawCenter(),z=Math.min(1,(size.width-70)/(right-left),(size.height-70)/(bottom-top));p.setCanvasZoom(z);p.setCanvasPan((center.x-(left+right)/2)*z,(center.y-(top+bottom)/2)*z);document.activeElement?.blur();
  const aside=document.querySelector('.sidebar'),target=document.querySelector(section==='training'?'#search-section .control-subsection':section==='files'?'#files-section':'#search-section');aside.scrollTop+=target.getBoundingClientRect().top-aside.getBoundingClientRect().top-16;
},section);}
const select=(page,id)=>page.evaluate(id=>{const p=window.graphBrowser;p.setSelect(p.findNode(id));},id);
const linked=page=>page.waitForFunction(()=>/\d+ results? linked/.test(document.querySelector('#search-status').textContent));
async function neighborhood(page,id){
  await page.evaluate(async id=>{
    const p=window.graphBrowser,node=id?p.findNode(id):p.getSelect();
    if(p.getRfc().getState().focusId!==node.getID())throw new Error('Search did not reinforce its source');
    p.fastFinishAnimation();await p.setLocale(node,2);
  },id);
}
let semanticSnapshot, semanticQueryId;
// Search may add provenance to a source node, but must retain its authored content
// and every original relation. Positions are expected to change during layout.
const semantics=page=>page.evaluate(()=>{
  const p=window.graphBrowser;
  return {
    nodes:[...p.getAllNodes()].filter(n=>n.getData().search?.role!=='query').map(n=>({id:n.getID(),label:n.getLabel(),hint:n.getHint(),type:n.getSemanticType(),weight:n.getWeight(),tags:n.getData().tags})),
    edges:[...p.getAllEdges()].filter(e=>!e.getData().search).map(e=>({id:e.getID(),from:e.from.getID(),to:e.to.getID(),label:e.getLabel(),weight:e.getWeight()}))
  };
});
export const tour=[
  {id:'library',title:'A searchable research library',caption:'This fictional graph contains 24 nodes and 28 semantic relations: three researchers, eighteen papers, two bridge papers and a collection. Labels, annotations and exact tags are searchable, including hidden items. The library starts without reinforcement; successful searches activate RFC around their query or similarity source.',async run({page,open,advance}){
    await open('/');await page.locator('.sidebar > details').evaluateAll(items=>items.forEach(e=>e.open=['files-section','search-section'].includes(e.id)));await page.locator('#example-graph').selectOption('graph-search');await page.waitForFunction(()=>document.querySelector('#file-status').textContent.includes('24 nodes, 28 relations'));
    // Start with a plain library; the search UI subsequently activates RFC itself.
    await page.locator('#rfc-section').evaluate(e=>e.open=true);await page.locator('#rfc-clear').click();await page.locator('#rfc-section').evaluate(e=>e.open=false);
    await advance(160);await fit(page,'files');semanticSnapshot=await semantics(page);
  }},
  {id:'query-draft',title:'Start a search directly on the graph',caption:'Select Mira Vega and press Ctrl+F. A query node appears immediately, linked to Mira as context, with its text editor on the graph. Type spring layout and press Enter to retrieve. The empty draft is excluded from the search corpus; ordinary typing and text deletion keep their normal meaning.',async run({page}){
    await page.locator('#files-section').evaluate(e=>e.open=false);await select(page,'mira');await fit(page);
    await page.locator('#graph svg').focus();await page.keyboard.press('Control+f');
    const field=page.getByRole('textbox',{name:'Lexical query on graph',exact:true});await field.fill('spring layout');
    if(!await field.evaluate(e=>e===document.activeElement))throw new Error('Query draft did not retain graph input focus');
    const valid=await page.evaluate(()=>{const q=window.graphBrowser.getSelect();return q.getData().search?.draft&&[...q.getEdges()].some(e=>e.from.getID()==='mira'&&e.getData().search?.role==='context');});
    if(!valid)throw new Error('Query draft is missing its context relation');
  }},
  {id:'lexical-query',title:'A term query joins its context',caption:'Enter runs the literal query and reinforces its neighborhood around the query node. Solid green links show compact ranks (#1, #2, …); the dashed green link identifies context. Blue semantic relations remain. Hover a result for the exact engine/score. F2 edits and reruns the query without duplicating it.',async run({page,advance}){
    await page.getByRole('textbox',{name:'Lexical query on graph',exact:true}).press('Enter');await linked(page);await neighborhood(page);await advance(120);await fit(page);
  }},
  {id:'exact-tags',title:'Whole-tag retrieval',caption:'The same query node now retrieves exact visual search tags. Tags are explicit metadata and work without topic training. The query replaces its earlier result links while retaining context and manual semantic relations.',async run({page,advance}){
    await selectChoice(page.locator('#search-kind'),'tags');await page.locator('#search-query').fill('visual search');await page.locator('#search-run').click();await linked(page);await neighborhood(page);await advance(80);await fit(page);
  }},
  {id:'topic-model',title:'Train and inspect topics',caption:'Three topics are trained locally for 200 serial Gibbs passes with seed 4357, alpha 0.1, beta 0.01 and minimum document frequency 2. Separate local JSON files can save/reload the model and its corpus. The most probable words make the fitted topics inspectable. This deliberately separated synthetic corpus does not establish general retrieval quality.',async run({page}){
    await selectChoice(page.locator('#search-engine'),'lda');await selectChoice(page.locator('#search-kind'),'terms');await page.locator('#search-query').fill('geometry repulsion');await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);
    await fillNumeric(page.locator('#search-topics'),'3');await fillNumeric(page.locator('#search-iterations'),'200');await page.locator('#search-train').click();await page.waitForFunction(()=>document.querySelector('#search-status').textContent.includes('Topic model ready'));
    await fit(page,'training');
  }},
  {id:'topical-query',title:'Retrieve by inferred topics',caption:'Ctrl+Shift+F starts a separate LDA query. Enter submits geometry repulsion and moves RFC to this query. Green rank labels stay short; hovering reveals symmetric KL distance in bits (lower is better, default limit 0.6). The earlier tag query stays available. Relevance does not change node importance or RFC stiffness.',async run({page,advance}){
    await page.locator('#search-section .control-subsection').evaluate(e=>e.open=false);await select(page,'mira');await page.locator('#graph svg').focus();await page.keyboard.press('Control+Shift+f');
    const field=page.getByRole('textbox',{name:'LDA query on graph',exact:true});await field.fill('geometry repulsion');await field.press('Enter');await linked(page);
    semanticQueryId=await page.evaluate(()=>window.graphBrowser.getSelect().getID());await neighborhood(page,semanticQueryId);await advance(120);await fit(page);
  }},
  {id:'node-similarity',title:'Use an existing paper as the query',caption:'Select Spring neighborhoods and press Ctrl+Shift+R to retrieve topic similarities and reinforce a neighborhood around this paper. Ctrl+R provides literal similarity. Compact green ranked links stay distinct from existing blue authored/citation relations. No separate results page is needed.',async run({page,advance}){
    await select(page,'layout-1');await page.locator('#graph svg').focus();await page.keyboard.press('Control+Shift+r');await linked(page);await neighborhood(page,'layout-1');await advance(100);await fit(page);
  }},
  {id:'rejected-result',title:'Retain a negative judgment',caption:'Rejecting a selected green result relation removes that link and saves its source, target, query, engine and corpus provenance. Repeating the same query omits that item. Native YAML saves queries, remaining links and feedback; model JSON is saved separately through the training controls. Feedback learning remains future work.',async run({page}){
    await page.evaluate(()=>{const p=window.graphBrowser,e=[...p.getCompleteEltSet().getEdges()].find(e=>e.from.getID()==='layout-1'&&e.getData().search?.role==='result');if(!e)throw new Error('Expected a similarity result');p.setSelectEdge(e);});await page.locator('#search-reject').click();await page.waitForFunction(()=>document.querySelector('#search-status').textContent.includes('Result rejected'));await fit(page);
  }},
  {id:'delete-query',title:'Remove a query and keep the source graph',caption:'Select the LDA text-query node and press Ctrl+Backspace (or Ctrl+Delete) while graph focus is active. Only that query and its incident associations disappear; retrieved papers, original semantic relations, the earlier tag query and the paper-based similarity search remain. Native YAML can retain the queries and rejection judgments you choose to keep.',async run({page}){
    const before=await page.evaluate(()=>window.graphBrowser.getNodeCount());await select(page,semanticQueryId);await page.locator('#graph svg').focus();await page.keyboard.press('Control+Backspace');
    const valid=await page.evaluate(({id,count})=>{const p=window.graphBrowser;return !p.findNode(id)&&p.getNodeCount()===count-1&&[...p.getAllNodes()].some(n=>n.getData().search?.role==='query');},{id:semanticQueryId,count:before});
    if(!valid)throw new Error('Query deletion did not preserve the remaining graph query');
    if(JSON.stringify(await semantics(page))!==JSON.stringify(semanticSnapshot))throw new Error('Search changed original semantic content');
    await fit(page);
  }}
];
