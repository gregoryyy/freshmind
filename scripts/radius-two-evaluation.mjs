/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {copyFile,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=process.cwd(),app=resolve(process.argv[2]??root),output=resolve(process.argv[3]??'docs/experiments/radius-two');
if(process.argv.length>4)throw Error('Usage: node scripts/radius-two-evaluation.mjs [built application checkout] [output directory]');
const prior=await readdir(output).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
if(prior.length){const manifest=JSON.parse(await readFile(join(output,'evidence.json'),'utf8'));assert.equal(manifest.format,'fm4-radius-two-evaluation','Refusing unrelated output directory');assert.equal(manifest.version,1);}
const require=createRequire(join(root,'package.json'));
const {FreshGraph,FreshNode,FreshEdge,FreshmindDocument}=await import(pathToFileURL(join(app,'dist/fm/model/index.js')));
const {captureRadiusSnapshot,projectRadiusTwo}=await import(pathToFileURL(join(app,'dist/fm/struct-view/index.js')));
assert.equal(typeof projectRadiusTwo,'function','Build the radius-two implementation (PR51 or later) before evaluation');
const {TypeRegistry,freshmind2014Configuration}=await import(pathToFileURL(join(app,'dist/fm/config/core.js')));
const {serializeDocument}=await import(pathToFileURL(join(app,'dist/fm/io/index.js')));
const pin='0657e40',bytes=execFileSync('git',['show',`${pin}:package-lock.json`],{cwd:root});
const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,'ac301d8fea3412c3c0365c9a2b84cb822a8ff16bea6a7b26c10bfa1de2ae3523');
const lock=JSON.parse(bytes),packages=lock.packages;
function installed(from,name){let cursor=from;for(;;){const candidate=(cursor?cursor+'/':'')+'node_modules/'+name;if(Object.hasOwn(packages,candidate))return candidate;if(!cursor)throw Error(`Unresolved ${name} from ${from}`);const i=cursor.lastIndexOf('/node_modules/');cursor=i<0?'':cursor.slice(0,i);}}
const found=new Set(['']),relations=[];
for(const path of found)for(const kind of ['dependencies','peerDependencies'])for(const [name,range]of Object.entries(packages[path][kind]??{})){const target=installed(path,name);found.add(target);relations.push({id:`${path||'fm4'}:${kind}:${name}`,from:path||'fm4',to:target,kind,range});}
assert.equal(found.size,22);assert.equal(relations.length,38);assert.equal(relations.filter(e=>e.kind==='peerDependencies').length,6);
const graph=new FreshGraph(),paths=[...found].sort();
for(const [i,path]of paths.entries()){const p=packages[path],name=path?path.split('node_modules/').at(-1):'fm4';graph.addNode(new FreshNode(path||'fm4',`${name} ${p.version}`,{type:'package',position:{x:230*Math.cos(2*Math.PI*i/paths.length),y:230*Math.sin(2*Math.PI*i/paths.length)},data:{package:{name,version:p.version,path,license:p.license??'',integrity:p.integrity??''}}}));}
for(const e of relations)graph.addEdge(new FreshEdge(graph.findNode(e.from),graph.findNode(e.to),{id:e.id,label:e.range,type:e.kind==='dependencies'?'dependency':'peer',weight:10,data:{requirement:e.range,sourceKind:e.kind}}));
const snapshot=captureRadiusSnapshot(graph,'pinned-public-lock');
const zoom='node_modules/d3-zoom',dispatch='node_modules/d3-dispatch',color='node_modules/d3-color';
const nodeIds=projectRadiusTwo(snapshot,zoom,{direction:'outgoing'}).nodes.map(n=>n.id).sort();
const expectedFirst=['d3-dispatch','d3-drag','d3-interpolate','d3-selection','d3-transition'].map(n=>'node_modules/'+n).sort();
const expectedSecond=['d3-color','d3-ease','d3-timer'].map(n=>'node_modules/'+n).sort();
const incoming=projectRadiusTwo(snapshot,dispatch,{direction:'incoming'}),projection=projectRadiusTwo(snapshot,zoom,{direction:'outgoing'});
assert.deepEqual([...incoming.directNodeIds].sort(),['d3-drag','d3-transition','d3-zoom'].map(n=>'node_modules/'+n).sort());
assert.deepEqual(incoming.nodes.map(n=>n.id).filter(id=>id!==dispatch&&!incoming.directNodeIds.includes(id)),['fm4']);
assert.deepEqual([...incoming.witnesses.fm4].sort(),['node_modules/d3-drag','node_modules/d3-zoom']);
assert.deepEqual([...projection.directNodeIds].sort(),expectedFirst);
assert.deepEqual(projection.nodes.map(n=>n.id).filter(id=>id!==zoom&&!expectedFirst.includes(id)).sort(),expectedSecond);
assert.deepEqual([...projection.witnesses[color]].sort(),['node_modules/d3-interpolate','node_modules/d3-transition']);
assert.equal(projection.counts.edgeRecords,14);assert.equal(projection.counts.occurrences,4);assert.equal(projection.counts.secondStepNodes,3);
const expectedPairs=[['d3-drag','d3-dispatch'],['d3-drag','d3-selection'],['d3-interpolate','d3-color'],['d3-transition','d3-color'],['d3-transition','d3-dispatch'],['d3-transition','d3-ease'],['d3-transition','d3-interpolate'],['d3-transition','d3-timer'],...expectedFirst.map(id=>['d3-zoom',id.slice('node_modules/'.length)])];
const expectedEdgeIds=[...expectedPairs.map(([from,to])=>`node_modules/${from}:dependencies:${to}`),'node_modules/d3-transition:peerDependencies:d3-selection'].sort();
const checkEdges=p=>assert.deepEqual(p.edgeRecords.map(e=>e.id).sort(),expectedEdgeIds);
checkEdges(projection);assert.throws(()=>checkEdges({...projection,edgeRecords:projection.edgeRecords.filter(e=>e.type!=='peer')}));
// Baselines come from lockfile relations and literal task scope, not projection output.
const baseline={centerId:zoom,directNodeIds:expectedFirst,nodes:[...graph.getNodes()].filter(n=>nodeIds.includes(n.getID())).map(n=>({id:n.getID(),label:n.getLabel()})),edgeRecords:relations.filter(e=>nodeIds.includes(e.from)&&nodeIds.includes(e.to)).map(e=>({id:e.id,from:e.from,to:e.to,type:e.kind==='dependencies'?'dependency':'peer',label:e.range}))};
assert.deepEqual(baseline.edgeRecords.map(e=>e.id).sort(),expectedEdgeIds);
const colorIncoming=projectRadiusTwo(snapshot,color,{direction:'incoming'});assert(!colorIncoming.nodes.some(n=>n.id==='fm4'));assert(relations.some(e=>e.from==='fm4'&&e.to===zoom));
// Independent literal-path task oracle: not computed by the projection under test.
const tasks=[{id:'direct-dependants',center:dispatch,direction:'incoming',answer:['d3-drag','d3-transition','d3-zoom'],limit:'Names installed packages declaring a direct dependency; does not prove a runtime failure.'},{id:'transitive-impact',center:dispatch,direction:'incoming',answer:['fm4'],limit:'One distinct second-hop dependant reached through two first-hop witnesses: d3-drag and d3-zoom.'},{id:'shared-dependency',center:zoom,direction:'outgoing',answer:['d3-color via d3-interpolate','d3-color via d3-transition'],limit:'Two occurrences are one installed package. A peer relation is a distinct relation kind.'},{id:'missing-context',center:color,direction:'incoming',answer:['fm4 is three hops away; absent from this view'],limit:'Radius-two absence cannot establish no transitive impact.'}];
const out=await mkdtemp(join(tmpdir(),'fm4-radius-evaluation-'));
await writeFile(join(out,'package-lock.json'),bytes);await writeFile(join(out,'dependency.fm.yaml'),serializeDocument(new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph)));
const synthetic=[];
for(const degree of [100,300,1000,5000]){
  const nodes=[{id:'hub',label:'Hub',type:'package',weight:1},{id:'shared',label:'Shared',type:'package',weight:1}],edges=[];
  for(let i=0;i<degree;i++){const id=`n${i}`;nodes.push({id,label:id,type:'package',weight:1});edges.push({id:`a${i}`,from:'hub',to:id,label:'requires',type:'dependency',weight:10,direction:'directed'},{id:`b${i}`,from:id,to:'shared',label:'requires',type:'dependency',weight:10,direction:'directed'});}
  const source={generation:'synthetic-cost-probe',complete:true,nodes,edges},samples=[];
  for(let trial=0;trial<6;trial++){const start=performance.now(),p=projectRadiusTwo(source,'hub',{direction:'outgoing',rowLimit:3,cellLimit:1});assert.equal(p.counts.directNodes,degree);assert.equal(p.counts.secondStepNodes,1);assert.equal(p.counts.occurrences,degree);assert.equal(p.counts.edgeRecords,2*degree);if(trial)samples.push(performance.now()-start);}
  synthetic.push({degree,nodes:nodes.length,edges:edges.length,samplesMs:samples});
}
const record={format:'fm4-radius-two-evaluation',version:1,source:{repository:'https://github.com/gregoryyy/freshmind',commit:execFileSync('git',['rev-parse',pin],{cwd:root,encoding:'utf8'}).trim(),path:'package-lock.json',sha256:hash,scope:'Root dependencies and their installed dependencies/peers; dev-only roots excluded. No package code executed.'},counts:{nodes:22,relations:38,dependency:32,peer:6},scope:{nodes:nodeIds,relations:projection.edgeRecords.map(e=>e.id),uniqueSecondHop:projection.counts.secondStepNodes,occurrences:projection.counts.occurrences},tasks,projection,synthetic};
await writeFile(join(out,'evidence.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify({out,counts:record.counts,scope:record.scope},null,2));
const {preview}=await import(pathToFileURL(require.resolve('vite'))),{chromium}=require('@playwright/test');
let server,browser;
try {
  server=await preview({root:app,configFile:false,logLevel:'error',build:{outDir:'demo-dist'},preview:{host:'127.0.0.1',port:0,strictPort:true}});
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL??'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let seed=0x1234abcd;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);await page.waitForFunction(()=>window.radiusTwoView&&window.graphBrowser?.getRfc().getState().active);
  await page.locator('#open-graph-files').setInputFiles(join(out,'dependency.fm.yaml'));await page.waitForFunction(()=>window.graphBrowser.getNodeCount()===22);
  await page.evaluate(async({nodeIds,zoom})=>{const p=window.graphBrowser;p.fastFinishAnimation();await p.getLocalityUtils().whenIdle();p.tgLayout.stop();p.getRfc().setFocus(null);p.getGES().addAll();for(const n of p.getAllNodes())if(!nodeIds.includes(n.getID()))p.getGES().removeNode(n);p.localityChanged();p.setSelect(p.findNode(zoom));p.setHyperbolic(0);p.setZoom(1);p.setRotation(0);p.setCanvasZoom(.9);p.setCanvasPan(0,0);p.centerOn(p.findNode(zoom),true);p.repaintAfterMove();window.benchPositions=[...p.getAllNodes()].map(n=>[n.getID(),n.x,n.y]);for(const section of document.querySelectorAll('.sidebar > details'))section.open=false;}, {nodeIds,zoom});
  const measurements=[];
  for(const mode of ['ego','rfc','radius-two','list-tree','matrix']){
    const samples=[];let shape;
    for(let trial=0;trial<6;trial++){
      const sample=await page.evaluate(async({mode,zoom,projection})=>{
        const p=window.graphBrowser,view=window.radiusTwoView,graph=document.querySelector('#graph');view.setEnabled(false);p.tgLayout.stop();p.getRfc().setFocus(null);document.querySelector('#comparison-baseline')?.remove();graph.style.visibility='';
        for(const [id,x,y]of window.benchPositions){const n=p.findNode(id);n.x=x;n.y=y;n.dx=n.dy=0;}p.resetDamper();p.repaintAfterMove();
        const positions=()=>JSON.stringify([...p.getAllNodes()].map(n=>[n.getID(),n.x,n.y]));
        const semantics=()=>JSON.stringify({nodes:[...p.getAllNodes()].map(n=>[n.getID(),n.getLabel(),n.getSemanticType(),n.getWeight(),n.getData()]),edges:[...p.getCompleteEltSet().getEdges()].map(e=>[e.getID(),e.from.getID(),e.to.getID(),e.getLabel(),e.getSemanticType(),e.getWeight(),e.getData()])});
        const beforePositions=positions(),beforeSemantics=semantics();
        const start=performance.now();let target,layoutMs=null;
        if(mode==='ego'||mode==='rfc'){
          if(mode==='rfc'){p.getRfc().setNeighborhoodDepth(1);p.getRfc().setFocus(p.findNode(zoom));}
          const beforeLayout=performance.now();p.tgLayout.tick(100);layoutMs=performance.now()-beforeLayout;p.repaintAfterMove();target=graph;
        }else if(mode==='radius-two'){
          view.setEnabled(true);const direction=document.querySelector('[aria-label="Radius-two traversal"]');direction.value='outgoing';direction.dispatchEvent(new Event('change'));target=document.querySelector('#radius-two-view');
        }else{
          graph.style.visibility='hidden';const host=document.createElement('section');host.id='comparison-baseline';host.style.cssText='position:absolute;inset:16px;background:#f4f5f0;overflow:auto;padding:16px;font:14px system-ui';document.querySelector('.workspace').append(host);target=host;
          const names=new Map(projection.nodes.map(n=>[n.id,n.label])),element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
          host.append(element('h2',mode==='matrix'?'Shared-neighbor matrix':'Simple two-level list/tree'),element('p','Same 9 installed packages and 14 declared relations. Dependency and peer records are distinct; no measured weights.'));
          if(mode==='matrix'){
            const table=element('table');table.style.cssText='border-collapse:collapse;font-size:11px';const header=element('tr');header.append(element('th','from → to'));for(const n of projection.nodes)header.append(element('th',n.label));table.append(header);
            for(const from of projection.nodes){const row=element('tr');row.append(element('th',from.label));for(const to of projection.nodes){const es=projection.edgeRecords.filter(e=>e.from===from.id&&e.to===to.id),cell=element('td',es.map(e=>`${e.type}: ${e.label}`).join('; '));cell.style.cssText='border:1px solid #a8b5a3;padding:5px';row.append(cell);}table.append(row);}host.append(table);
          }else{
            const list=element('ul');for(const id of projection.directNodeIds){const item=element('li',names.get(id)),children=element('ul');for(const e of projection.edgeRecords.filter(e=>e.from===id&&!projection.directNodeIds.includes(e.to)&&e.to!==zoom))children.append(element('li',`${names.get(e.to)} · ${e.type}: ${e.label}`));item.append(children);list.append(item);}host.append(element('h3',names.get(zoom)),list,element('h3','All scoped relation records'));
            const records=element('ul');for(const e of projection.edgeRecords)records.append(element('li',`${names.get(e.from)} → ${names.get(e.to)} · ${e.type}: ${e.label}`));host.append(records);
          }
        }
        await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
        return {elapsedMs:performance.now()-start,layoutMs,elements:target.querySelectorAll('*').length,nodeCards:target.querySelectorAll('.r2-card,.tg-node').length,visibleNodes:p.getGES().nodeCount(),visibleEdges:p.getGES().edgeCount(),semanticPreservation:beforeSemantics===semantics(),positionPreservation:beforePositions===positions()};
      },{mode,zoom,projection:baseline});
      assert.equal(sample.visibleNodes,9);assert.equal(sample.visibleEdges,14);assert(sample.semanticPreservation);if(!['ego','rfc'].includes(mode))assert(sample.positionPreservation);if(trial)samples.push(sample);shape=sample;
    }
    await page.screenshot({path:join(out,`${mode}.png`)});measurements.push({mode,warmup:1,samples,shape});
  }
  assert.deepEqual(errors,[]);
  const buildFiles=['index.html',...(await readdir(join(app,'demo-dist/assets'))).filter(n=>n.endsWith('.js')||n.endsWith('.css')).sort().map(n=>'assets/'+n)];
  const buildHashes=await Promise.all(buildFiles.map(async file=>({file,sha256:createHash('sha256').update(await readFile(join(app,'demo-dist',file))).digest('hex')})));
  record.browser={version:browser.version(),viewport:{width:1440,height:1000},platform:process.platform,arch:process.arch,node:process.version,applicationCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:app,encoding:'utf8'}).trim(),applicationDirty:execFileSync('git',['status','--porcelain','--','src','demo','index.html','package.json','package-lock.json'],{cwd:app,encoding:'utf8'}).trim().length>0,buildHashes,method:'One warm-up and five measured operations in one Chrome process; two requestAnimationFrame callbacks. Ego/RFC include 100 synchronous layout batches, not a convergence criterion. Radius mode includes complete-snapshot capture and traversal selection. DOM is representation subtree, including collapsed descendants. List/matrix are comparison prototypes, not product views. These are different operations, not a speed ranking.',measurements};
  await writeFile(join(out,'evidence.json'),JSON.stringify(record,null,2)+'\n');
  const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return [sorted[0],sorted[Math.floor(sorted.length/2)],sorted.at(-1)].map(n=>n.toFixed(2)).join(' / ');};
  await writeFile(join(out,'costs.md'),['| View | operation ms min / median / max | included 100 layout batches ms min / median / max | subtree elements | node cards |','|---|---:|---:|---:|---:|',...measurements.map(m=>`| ${m.mode} | ${stats(m.samples.map(s=>s.elapsedMs))} | ${m.samples[0].layoutMs===null?'n/a':stats(m.samples.map(s=>s.layoutMs))} | ${m.shape.elements} | ${m.shape.nodeCards} |`),'','Different operations; these values are not a speed ranking. See the evaluation report for scope and limitations.',''].join('\n'));
  const captions={'ego':'Ordinary ego node-link: nine installed packages, fourteen real relations; 100 fixed layout batches.','rfc':'Same source and start, with ordinary one-level RFC; 100 fixed batches.','radius-two':'Outgoing radius two: five direct packages, three unique second-hop packages, four occurrences; only the first bounded page is shown.','list-tree':'Comparison prototype: a two-level list/tree plus every scoped relation record. Repeated children are occurrences, not separate packages.','matrix':'Comparison prototype: source packages on rows and targets on columns; dependency and peer requirements remain distinct.'};
  await writeFile(join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Radius-two dependency comparison</title><style>body{font:16px/1.5 system-ui;margin:24px auto;max-width:1440px;padding:0 16px;color:#263e33;background:#f4f5f0}img{max-width:100%;height:auto;border:1px solid #a8b5a3}figure{margin:32px 0}nav{display:flex;gap:18px;flex-wrap:wrap}a{color:inherit}</style><h1>Dependency-analysis comparison</h1><p>Public pinned lockfile. Software correctness/cost observations; no human benefit or speed ranking. All views retain the same nine-package, fourteen-relation scope; radius two pages its visible occurrences.</p><p><a href="README.md">Methods and evidence</a> · <a href="PILOT.md">Maintainer pilot protocol</a></p><nav>${measurements.map(m=>`<a href="#${m.mode}">${m.mode}</a>`).join('')}</nav>${measurements.map(m=>`<figure id="${m.mode}"><h2>${m.mode}</h2><img src="${m.mode}.png" width="1440" height="1000" alt="${captions[m.mode]}"><figcaption>${captions[m.mode]}</figcaption></figure>`).join('')}</html>\n`);
  // Publish only a completed run. Never replace authored notes or remove unrelated files.
  await mkdir(output,{recursive:true});
  for(const file of ['package-lock.json','dependency.fm.yaml','costs.md','index.html',...measurements.map(m=>m.mode+'.png'),'evidence.json'])await copyFile(join(out,file),join(output,file));
  console.log('Browser costs and five comparison images recorded; no human timings or benefit claims.');
}finally{try{await browser?.close();if(server)await new Promise((done,reject)=>server.httpServer.close(error=>error?reject(error):done()));}finally{await rm(out,{recursive:true,force:true});}}
