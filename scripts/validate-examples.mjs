/* Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
 * TypeScript port by Gregor Heinrich using Codex GPT-6.1. */
import { readFile } from "node:fs/promises";
import { deepStrictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { parseDocument, serializeDocument, documentToRecord } from "fm4/fm/io";
const sourceIndex=process.argv.indexOf("--source-dir"),sourceDir=sourceIndex<0?null:process.argv[sourceIndex+1];
// Independent, deliberately narrower source projection for the two approved original datasets.
// Fail on extra fields rather than ignoring something a newer source file might have introduced.
const projection=`import json, sys, re
import xml.etree.ElementTree as E
root=E.parse(sys.argv[1]).getroot()
nodes=[]; edges=[]
for n in root.findall('node'):
    assert all(c.tag in ['id','label','hint','url','type','relation'] for c in n), 'Review new source node fields'
    ident=n.findtext('id') or n.findtext('label')
    hint=n.findtext('hint') or ''
    nodes.append([ident,n.findtext('label') or '',hint,n.findtext('url') or '',n.findtext('type') or 'default'])
    for r in n.findall('relation'):
        assert all(c.tag in ['destination','type','stroke'] for c in r), 'Review new source relation fields'
        edges.append([ident,r.findtext('destination'),r.findtext('type') or '',r.findtext('stroke') or '1'])
print(json.dumps({'nodes':nodes,'edges':edges},ensure_ascii=False))`;
const types=await readFile(new URL("../examples/fm2014/fm2014.types.yaml",import.meta.url),"utf8");
for(const name of ["berry","nips-fm"]) {
  const source=await readFile(new URL("../examples/fm2014/"+name+".fm.yaml",import.meta.url),"utf8"),options={resolveTypes:path=>{if(path!=="fm2014.types.yaml")throw new Error("Unknown companion");return types;}};
  const document=parseDocument(source,options),save={includeLayout:false,typesFile:"fm2014.types.yaml"};
  deepStrictEqual(documentToRecord(parseDocument(serializeDocument(document,save),options),save),documentToRecord(document,save));
  if(sourceDir) {
    const result=spawnSync("python3",["-c",projection,join(sourceDir,name+".xml")],{encoding:"utf8",maxBuffer:64*1024*1024});
    if(result.status!==0)throw new Error(result.stderr);
    const expected=JSON.parse(result.stdout),strokes=["none","solid","dashed","long-dashed","dash-dotted","dash-double-dotted","dotted"];
    const actual={nodes:[...document.graph.getNodes()].map(n=>[n.getID(),n.getLabel(),n.getAnnotation().text,n.getURL(),n.getSemanticType()]),
      edges:[...document.graph.getEdges()].map(e=>[e.from.getID(),e.to.getID(),e.getLabel(),String(strokes.indexOf(e.getVisual().style?.stroke?.dash??"solid"))])};
    deepStrictEqual(actual,expected);console.log(name+": every source ID, label, hint, URL, type, endpoint and stroke matches");
  }
  console.log(name+": valid, complete normalized round trip");
}
