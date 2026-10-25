/** Minimal independent production smoke; detailed canary scenarios are a separate capability. */
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {parseDocument} from '../dist/fm/io/index.js';
import {previewReady} from './lib/assurance-artifacts.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PLAYWRIGHT_PORT??4190);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PLAYWRIGHT_PORT');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',c=>output+=c);server.stderr.on('data',c=>output+=c);
let browser;
try{
  const base=`http://127.0.0.1:${port}`;
  // Wait for this owned server's readiness, never attach silently to another process.
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Preview readiness timed out: '+output)),15000);
    const ready=()=>{if(previewReady(output,base)){clearTimeout(timeout);resolve();}};
    server.stdout.on('data',ready);ready();server.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Preview exited (${code}): ${output}`));});
  });
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const page=await browser.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(base);await page.waitForFunction(()=>window.graphBrowser);
  const source={format:'freshmind',version:1,nodes:[{id:'a',label:'graph layout'},{id:'b',label:'graph spring'},{id:'isolated',label:'hidden context'}],edges:[{id:'ab',from:'a',to:'b',label:'uses',weight:0}]};
  await page.locator('#open-graph-files').setInputFiles({name:'smoke.fm.yaml',mimeType:'application/yaml',buffer:Buffer.from(JSON.stringify(source))});
  await expect(page.locator('#file-status')).toContainText('3 nodes, 1 relations');
  await page.locator('#search-section').evaluate(e=>e.open=true);await page.locator('#search-query').fill('graph');await page.locator('#search-run').click();
  await expect(page.locator('#search-status')).toContainText(/results? linked/);
  const pending=page.waitForEvent('download');await page.locator('#save-graph').click();
  const saved=parseDocument(await readFile(await (await pending).path(),'utf8'));
  for(const node of source.nodes)if(saved.graph.findNode(node.id)?.getLabel()!==node.label)throw new Error('Production export lost original node '+node.id);
  const edge=[...saved.graph.getEdges()].find(e=>e.getID()==='ab');
  if(!edge||edge.from.getID()!=='a'||edge.to.getID()!=='b'||edge.getWeight()!==0)throw new Error('Production export lost original relation');
  if(errors.length)throw new Error(errors.join('\n'));
  if(requests.some(url=>new URL(url).pathname.startsWith('/src/')))throw new Error('Production smoke used source modules');
  if(!requests.some(url=>/\/assets\/worker-.*\.js$/.test(url)))throw new Error('Production worker was not exercised');
  const result={browser:browser.version(),status:'passed',fixture:{nodes:3,edges:1},requests,limits:'Local import, literal worker and explicit semantic export smoke; not a security, relevance or usability review.'};
  if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
  console.log('Production smoke passed:',result.browser);
}finally{
  await browser?.close();
  if(server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}
}
