/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {preview} from 'vite';
import {chromium} from '@playwright/test';
import {FreshGraph,FreshNode,FreshEdge,FreshmindDocument,TypeRegistry,freshmind2014Configuration} from 'fm4/fm/core';
import {serializeDocument} from 'fm4/fm/io';
import {automaticRfcFixture} from '../tests/fixtures/automatic-rfc.mjs';
const folder=fileURLToPath(new URL('../docs/automatic-rfc/',import.meta.url));
await mkdir(folder,{recursive:true});
const graph=automaticRfcFixture({FreshGraph,FreshNode,FreshEdge});
for(const [id,label] of Object.entries({r:'Graph browser',a:'Rendering',b:'Navigation',s:'Shared labels',t:'Interaction',z:'Zero weight',f:'Context',x:'Editing'}))graph.findNode(id).setLabel(label);
for(const edge of graph.getEdges())edge.setLabel(['as','bs'].includes(edge.getID())?'uses':'');
const document=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph);
document.title='Automatic RFC neighborhoods — synthetic example';document.initialFocus='r';
document.data={provenance:'Original synthetic fixture; no external graph data.'};
document.view={focus:'r',wholeGraph:true,radius:3,lenses:{zoom:1,hyperbolic:0,rotation:0},canvas:{zoom:1}};
await writeFile(folder+'example.fm.yaml',serializeDocument(document));
let server,browser;
try {
  server=await preview({preview:{host:'127.0.0.1',port:0,open:false}});
  const port=server.httpServer.address().port;
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL??'chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>Boolean(window.graphBrowser));
  await page.locator('#motion').click();await page.locator('#open-graph-files').setInputFiles(folder+'example.fm.yaml');
  await page.waitForFunction(()=>document.querySelector('#file-status').textContent.includes('8 nodes, 11 relations'));
  await page.evaluate(async()=>{
    const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();p.setHyperbolic(0);p.setZoom(2);
    p.getRfc().setNeighborhoodDepth(2);p.getRfc().setFocus(p.findNode('r'));p.getRfc().addFocus(p.findNode('x'));
    p.tgLayout.tick(80);p.repaint();
    for(const section of document.querySelectorAll('.sidebar > details'))section.open=Boolean(section.querySelector('#rfc-status'));
    document.querySelector('#separate-labels').click();
  });
  await page.evaluate(async()=>{
    const p=window.graphBrowser;p.setCanvasZoom(1);p.setCanvasPan(0,0);p.repaint();
    const nodes=[...p.getGES().getNodes()],size=p.getSize(),center=p.getDrawCenter();
    const left=Math.min(...nodes.map(n=>n.drawx-n.getWidth()/2)),right=Math.max(...nodes.map(n=>n.drawx+n.getWidth()/2));
    const top=Math.min(...nodes.map(n=>n.drawy-n.getHeight()/2)),bottom=Math.max(...nodes.map(n=>n.drawy+n.getHeight()/2));
    const zoom=Math.min(1,(size.width-130)/(right-left),(size.height-130)/(bottom-top));
    p.setCanvasZoom(zoom);p.setCanvasPan((center.x-(left+right)/2)*zoom,(center.y-(top+bottom)/2)*zoom);
    await document.fonts.ready;document.activeElement?.blur();
    await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
  });
  const counts=await page.evaluate(()=>({nodes:document.querySelectorAll('.fm-rfc-node-halo').length,edges:document.querySelectorAll('.fm-rfc-edge-halo').length}));
  if(counts.nodes!==7||counts.edges!==6||errors.length)throw new Error(JSON.stringify({counts,errors}));
  await page.screenshot({path:folder+'two-centers.png'});
  console.log('Captured automatic RFC: 7 reinforced nodes, 6 tree relations; 8 semantic nodes and 11 relations retained.');
} finally {
  await browser?.close();
  if(server)await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));
}
