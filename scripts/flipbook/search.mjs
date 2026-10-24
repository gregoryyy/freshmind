/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich. */
async function fit(page,section='search'){await page.evaluate(section=>{
  const p=window.graphBrowser,nodes=[...p.getGES().getNodes()];p.setCanvasZoom(1);p.setCanvasPan(0,0);p.repaint();
  const left=Math.min(...nodes.map(n=>n.drawx-n.getWidth()/2-25)),right=Math.max(...nodes.map(n=>n.drawx+n.getWidth()/2+25)),top=Math.min(...nodes.map(n=>n.drawy-n.getHeight()/2-25)),bottom=Math.max(...nodes.map(n=>n.drawy+n.getHeight()/2+25));
  const size=p.getSize(),center=p.getDrawCenter(),z=Math.min(1,(size.width-70)/(right-left),(size.height-70)/(bottom-top));p.setCanvasZoom(z);p.setCanvasPan((center.x-(left+right)/2)*z,(center.y-(top+bottom)/2)*z);document.activeElement?.blur();
  const aside=document.querySelector('.sidebar'),target=document.querySelector(section==='training'?'#search-section .control-subsection':section==='files'?'#files-section':'#search-section');aside.scrollTop+=target.getBoundingClientRect().top-aside.getBoundingClientRect().top-16;
},section);}
const select=(page,id)=>page.evaluate(id=>{const p=window.graphBrowser;p.setSelect(p.findNode(id));},id);
const linked=page=>page.waitForFunction(()=>/\d+ results? linked/.test(document.querySelector('#search-status').textContent));
export const tour=[
  {id:'library',title:'A searchable research library',caption:'This new fictional graph contains 24 nodes and 28 semantic relations: three researchers, eighteen papers, two bridge papers and a collection. Labels, annotations and exact tags are searchable, including currently hidden items. RFC and the viewing lens remain independent controls.',async run({page,open,advance}){
    await open('/');await page.locator('.sidebar > details').evaluateAll(items=>items.forEach(e=>e.open=['files-section','search-section'].includes(e.id)));await page.locator('#example-graph').selectOption('graph-search');await page.waitForFunction(()=>document.querySelector('#file-status').textContent.includes('24 nodes, 28 relations'));
    // Clear the default RFC through its ordinary control for an uncluttered search walkthrough.
    await page.locator('#rfc-section').evaluate(e=>e.open=true);await page.locator('#rfc-clear').click();await page.locator('#rfc-section').evaluate(e=>e.open=false);
    await advance(160);await fit(page,'files');
  }},
  {id:'lexical-query',title:'A term query joins its context',caption:'An elasticlunr literal query for spring layout is attached to Mira Vega as context. Green relations carry ranked relevance; existing authored and citation relations remain. The query node can be selected and rerun without duplicating it.',async run({page,advance}){
    await page.locator('#files-section').evaluate(e=>e.open=false);await select(page,'mira');await page.locator('#search-query').fill('spring layout');await page.locator('#search-run').click();await linked(page);await advance(120);await fit(page);
  }},
  {id:'exact-tags',title:'Whole-tag retrieval',caption:'The same query node now retrieves exact visual search tags. Tags are explicit metadata and work without topic training. The query replaces its earlier result links while retaining context and manual semantic relations.',async run({page,advance}){
    await page.locator('#search-kind').selectOption('tags');await page.locator('#search-query').fill('visual search');await page.locator('#search-run').click();await linked(page);await advance(80);await fit(page);
  }},
  {id:'topic-model',title:'Train and inspect topics',caption:'Three topics are trained locally for 200 serial Gibbs passes with seed 4357, alpha 0.1, beta 0.01 and minimum document frequency 2. Separate local JSON files can save/reload the model and its corpus. The most probable words make the fitted topics inspectable. This deliberately separated synthetic corpus does not establish general retrieval quality.',async run({page}){
    await page.locator('#search-engine').selectOption('lda');await page.locator('#search-kind').selectOption('terms');await page.locator('#search-query').fill('geometry repulsion');await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);
    await page.locator('#search-topics').fill('3');await page.locator('#search-iterations').fill('200');await page.locator('#search-train').click();await page.waitForFunction(()=>document.querySelector('#search-status').textContent.includes('Topic model ready'));
    await fit(page,'training');
  }},
  {id:'topical-query',title:'Retrieve by inferred topics',caption:'The text query geometry repulsion is folded into the fixed topic model. Document topic distributions determine symmetric KL distance in bits, with a strict default distance limit of 0.6. Raw distances are labeled; lower values are better. Switching the selected query to LDA replaces its prior links and updates its query type; scores are separate from node importance and RFC physics.',async run({page,advance}){
    await page.locator('#search-section .control-subsection').evaluate(e=>e.open=false);await page.locator('#search-run').click();await linked(page);await advance(120);await fit(page);
  }},
  {id:'node-similarity',title:'Use an existing paper as the query',caption:'Spring neighborhoods retrieves similar graph items directly from its own topic mixture, excluding itself. Existing authored/citation relations remain. The result links expand ordinary graph browsing without requiring a separate results page.',async run({page,advance}){
    await select(page,'layout-1');await page.locator('#search-similar').click();await linked(page);await advance(100);await fit(page);
  }},
  {id:'rejected-result',title:'Retain a negative judgment',caption:'Rejecting a selected green result relation removes that link and saves its source, target, query, engine and corpus provenance. Repeating the same query omits that item. Native YAML saves queries, remaining links and feedback; model JSON is saved separately through the training controls. Feedback learning remains future work.',async run({page}){
    await page.evaluate(()=>{const p=window.graphBrowser,e=[...p.getCompleteEltSet().getEdges()].find(e=>e.from.getID()==='layout-1'&&e.getData().search?.role==='result');if(!e)throw new Error('Expected a similarity result');p.setSelectEdge(e);});await page.locator('#search-reject').click();await page.waitForFunction(()=>document.querySelector('#search-status').textContent.includes('Result rejected'));await fit(page);
  }}
];
