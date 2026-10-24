import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root=new URL('../',import.meta.url),run=promisify(execFile);
async function files(directory,suffix) {
  const result=[];
  for(const item of await readdir(directory,{withFileTypes:true})) {
    const url=new URL(item.name+(item.isDirectory()?'/':''),directory);
    if(item.isDirectory())result.push(...await files(url,suffix));else if(item.name.endsWith(suffix))result.push(url);
  }
  return result;
}
function imports(source,filename) {
  const result=new Set(),tree=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true);
  function walk(node) {
    if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))result.add(node.moduleSpecifier.text);
    if(ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument)&&ts.isStringLiteral(node.argument.literal))result.add(node.argument.literal.text);
    if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))result.add(node.arguments[0].text);
    ts.forEachChild(node,walk);
  }
  walk(tree);return result;
}

test('all pre-refactor public entry points retain their named exports',async()=>{
  // Original API captured at 5089211, search API at db898dc before IR extraction; additions are allowed.
  const baseline=JSON.parse(await readFile(new URL('fixtures/public-exports.json',import.meta.url),'utf8'));
  for(const [name,names] of Object.entries(baseline)) {
    const exported=await import(name);
    for(const key of names)assert.ok(Object.hasOwn(exported,key),`${name} lost ${key}`);
  }
});

test('feature module entry points share the existing constructors and mutation ownership',async()=>{
  const [tg,model,graph,layout,lenses,browser,fm,fmodel,fbrowser,config,geometry,editing,nav]=await Promise.all([
    import('fm4'),import('fm4/tg/model'),import('fm4/tg/graph'),import('fm4/tg/layout'),import('fm4/tg/lenses'),import('fm4/tg/browser'),
    import('fm4/fm'),import('fm4/fm/model'),import('fm4/fm/browser'),import('fm4/fm/config/core'),import('fm4/fm/geometry'),import('fm4/fm/edit'),import('fm4/fm/navigate')]);
  for(const entry of [model,graph,layout,lenses,browser])for(const [name,value] of Object.entries(entry))assert.equal(tg[name],value,name);
  for(const name of ['FreshNode','FreshEdge','FreshGraph','FreshmindDocument'])assert.equal(fmodel[name],fm[name],name);
  assert.equal(fbrowser.FreshmindPanel,fm.FreshmindPanel);assert.equal(fbrowser.installDocument,fm.installDocument);
  assert.equal(config.TypeRegistry,fm.TypeRegistry);assert.equal(geometry.routeEdges,fm.routeEdges);
  assert.equal(editing.applyRelationEdit,fm.applyRelationEdit);assert.equal(nav.FreshmindNavigation,fm.FreshmindNavigation);
  const complete=new fmodel.FreshGraph(),plain=new graph.VisibleLocality(complete),projection=new graph.VisibleLocality(complete);
  assert.equal(fmodel.getMutationLocality(plain),plain);projection.getMutationSource=()=>plain;
  assert.equal(fmodel.getMutationLocality(projection),plain);assert.equal(fmodel.getMutationLocality(undefined),undefined);
});

test('source contracts keep IR and TouchGraph independent of other domains',async()=>{
  for(const url of await files(new URL('src/',root),'.ts')) {
    const relative=fileURLToPath(url).slice(fileURLToPath(new URL('src/',root)).length),parts=relative.split('/');
    for(const spec of imports(await readFile(url,'utf8'),relative)) {
      if(!spec.startsWith('.')){
        if(parts[0]==='ir')assert.ok(!/^fm4\/(fm|tg)(\/|$)/.test(spec),`${relative} imports another domain: ${spec}`);
        if(parts[0]==='tg')assert.ok(!/^fm4\/(fm|ir)(\/|$)/.test(spec),`${relative} imports another domain: ${spec}`);
        continue;
      }
      let target=new URL(spec.replace(/\.js$/,'.ts'),url);
      try{await access(target);}catch(error){
        if(error.code!=='ENOENT')throw error;
        // Generated third-party ESM has a checked source declaration rather than
        // a TypeScript implementation. Its declaration still obeys the boundary.
        target=new URL(spec.replace(/\.js$/,'.d.ts'),url);await access(target);
      }
      const destination=fileURLToPath(target).slice(fileURLToPath(new URL('src/',root)).length).split('/');
      if(parts[0]==='tg'||parts[0]==='ir')assert.equal(destination[0],parts[0],`${relative} imports another domain: ${spec}`);
      if(parts.length<3||destination.length<3||parts[0]===destination[0]&&parts[1]===destination[1])continue;
      assert.ok(['index.ts','core.ts'].includes(destination.at(-1)),`${relative} bypasses a module contract: ${spec}`);
    }
  }
  for(const domain of ['tg','fm','ir'])for(const item of await readdir(new URL(`src/${domain}/`,root),{withFileTypes:true}))
    if(item.isDirectory())await access(new URL(`src/${domain}/${item.name}/index.ts`,root));
  for(const former of ['tg/model.ts','tg/graph.ts','tg/layout.ts','tg/lenses.ts','tg/locality.ts','tg/panel.ts','fm/model.ts','fm/panel.ts',
    'fm/topics','fm/search','fm/rendering','fm/navigation','fm/editing','fm/structures','fm/clustering','fm/structure-view','search'])
    await assert.rejects(access(new URL(`src/${former}`,root)),{code:'ENOENT'});
});

test('every headless module remains free of browser adapters, rendering, UI, D3 and YAML dependencies',async()=>{
  const modules=['fm4/core','fm4/fm/core','fm4/tg/model','fm4/tg/graph','fm4/tg/layout','fm4/tg/lenses',
    'fm4/fm/model','fm4/fm/config/core','fm4/fm/geometry','fm4/fm/navigate','fm4/fm/edit','fm4/fm/rfc','fm4/fm/struct','fm4/fm/cluster','fm4/fm/struct-view','fm4/fm/ir',
    'fm4/ir','fm4/ir/core','fm4/ir/corpus','fm4/ir/lexical','fm4/ir/topics'];
  const visited=new Set();
  async function walk(url) {
    if(visited.has(url.href))return;visited.add(url.href);
    assert.ok(!/\/(?:browser|render|rendering|ui)\//.test(url.pathname),url.pathname);
    for(const spec of imports(await readFile(url,'utf8'),url.pathname)) {
      assert.ok(!spec.startsWith('d3-')&&spec!=='yaml',`${url.pathname}: ${spec}`);
      if(spec.startsWith('.'))await walk(new URL(spec,url));
    }
  }
  for(const name of modules)await walk(new URL(import.meta.resolve(name)));
});

test('emitted internal runtime dependencies have no import cycles',async()=>{
  const nodes=new Map();
  for(const url of await files(new URL('dist/',root),'.js'))nodes.set(url.href,[...imports(await readFile(url,'utf8'),url.pathname)]
    .filter(spec=>spec.startsWith('.')).map(spec=>new URL(spec,url).href));
  const visited=new Set(),active=new Set();
  function visit(id,chain=[]) {
    assert.ok(!active.has(id),`Runtime import cycle: ${[...chain,id].map(s=>s.slice(root.href.length)).join(' → ')}`);
    if(visited.has(id))return;active.add(id);
    for(const next of nodes.get(id)??[])visit(next,[...chain,id]);
    active.delete(id);visited.add(id);
  }
  for(const id of nodes.keys())visit(id);
});

test('short module names and legacy aliases expose the same implementations',async()=>{
  for(const [oldName,newName] of [['rendering','render'],['navigation','navigate'],['editing','edit'],['structures','struct'],['clustering','cluster'],['structure-view','struct-view'],['search','ir']]){
    const old=await import(`fm4/fm/${oldName}`),current=await import(`fm4/fm/${newName}`);
    assert.deepEqual(Object.keys(old),Object.keys(current));for(const key of Object.keys(old))assert.equal(old[key],current[key],`${oldName}.${key}`);
  }
  const [ir,core,corpus,lexical,topics,legacyTopics,fm,browser,fmBrowser]=await Promise.all([
    import('fm4/ir'),import('fm4/ir/core'),import('fm4/ir/corpus'),import('fm4/ir/lexical'),import('fm4/ir/topics'),import('fm4/fm/topics'),import('fm4/fm/core'),import('fm4/ir/browser'),import('fm4/fm/browser')]);
  for(const entry of [core,corpus,lexical,topics])for(const [key,value] of Object.entries(entry)){assert.equal(ir[key],value,key);assert.equal(fm[key],value,key);}
  for(const [key,value] of Object.entries(topics))assert.equal(legacyTopics[key],value,key);
  assert.equal(browser.SearchCancelledError,fmBrowser.SearchCancelledError);
  assert.ok(!Object.hasOwn(ir,'FreshNode'));assert.ok(!Object.hasOwn(ir,'graphSearchCorpus'));
});

test('the complete IR dependency closure, including workers, has no FM or TG imports',async()=>{
  for(const url of await files(new URL('dist/ir/',root),'.js'))for(const spec of imports(await readFile(url,'utf8'),url.pathname)){
    if(spec.startsWith('.'))assert.ok(new URL(spec,url).pathname.includes('/dist/ir/'),`${url.pathname}: ${spec}`);
    else assert.ok(!/^fm4\/(fm|tg)(\/|$)/.test(spec)&&!spec.startsWith('d3-')&&spec!=='yaml',`${url.pathname}: ${spec}`);
  }
});

test('public module declaration files type-check as an external TypeScript consumer',async()=>{
  await run(process.execPath,[fileURLToPath(new URL('node_modules/typescript/bin/tsc',root)),'--noEmit','--strict','--target','ES2022',
    '--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022,DOM','--skipLibCheck','tests/types/modules.ts'],{cwd:fileURLToPath(root)});
});

test('IR declarations work for a standalone consumer without DOM or graph types',async()=>{
  await run(process.execPath,[fileURLToPath(new URL('node_modules/typescript/bin/tsc',root)),'--noEmit','--strict','--target','ES2022',
    '--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022','--types','node','tests/types/ir.ts'],{cwd:fileURLToPath(root)});
});
