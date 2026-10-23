/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {FreshmindDocument,TypeRegistry,freshmind2014Configuration} from "fm4/fm/core";
import {serializeDocument} from "fm4/fm/io";
import {seeds,stats} from "./lib/rfc-comparison.mjs";
import {exclusionGraph,exclusionModes,exclusionCases,runExclusion} from "./lib/rfc-exclusion-fixture.mjs";

const output=resolve(process.argv[2]??"docs/experiments/rfc-exclusion"),results=[];
for(const name of exclusionCases)for(const seed of seeds)for(const mode of exclusionModes) {
  try {results.push({status:"ok",...runExclusion(name,seed,mode)});}catch(error){results.push({status:"failed",name,seed,mode,error:String(error)});}
}
const groups=new Map();for(const r of results)if(r.status==="ok") {
  const id=`${r.name}:${r.seed}`,start=JSON.stringify([r.initialNodes,r.edges]);
  if(groups.has(id)&&groups.get(id)!==start)throw new Error(`Unmatched starting graph ${id}`);groups.set(id,start);
}
const summary=exclusionCases.flatMap(name=>exclusionModes.map(mode=>{
  const group=results.filter(r=>r.name===name&&r.mode===mode),ok=group.filter(r=>r.status==="ok"),values={};
  for(const key of ["contextDepthRms","contextIntruders","nonsharedDepthRms","nonsharedIntruders","fixedContextIntruders","fixedNonsharedIntruders","lengthRms","meanRegionRadius"])
    values[key]=ok.length?stats(ok.map(r=>r.final[key])):null;
  for(const key of ["largeSteps","tailStepRms","unitRigidityForceRms","meanContextDepth","meanNonsharedDepth","nonsharedIntrusionSteps"])values[key]=ok.length?stats(ok.map(r=>r[key])):null;
  return {name,mode,count:group.length,failed:group.length-ok.length,...values};
}));
const metadata={description:"Matched physical exclusion comparisons. All inputs synthetic; all modes retain the same semantic graph and focal definitions.",
  seeds,batches:400,stepsPerBatch:10,rigidity:.1,stabilizationEnabled:false,runtime:{node:process.version,platform:process.platform,arch:process.arch},
  definitions:{depth:"Weighted radial penetration, max over foreign ellipses for each node; RMS includes non-intruders as zero. Context and non-shared focal members are separate, with fixed intruders counted independently.",
    regions:"Identical fitting/padding policy is measured in all modes, including baseline and RFC-only. Region size and link error are retained to expose changing geometry.",
    motion:"All actual integrations observed. Traces sample batch 1/every tenth batch; their maxima/RMS cover that batch, not the skipped interval. Large means >29.9 Euclidean units.",
    startup:"Every integration in the first forty steps. Initial impulses are captured after the first TG+RFC force evaluation, before any integration or retained momentum.",
    force:"Final-coordinate undamped net-force RMS on movable nodes, with momentum cleared, zero global motion and rigidity divided out. Probe cannot move saved positions and does not enter motion totals."},
  failed:results.filter(r=>r.status!=="ok").length,matchedStarts:groups.size,summary};
await mkdir(output,{recursive:true});
await writeFile(join(output,"results.json"),JSON.stringify(metadata,null,2).slice(0,-1)+',\n"results": [\n'+results.map(r=>JSON.stringify(r)).join(",\n")+'\n]}\n');
let table="| Case | Mode | Context depth RMS | Non-shared depth RMS | Fixed context / focal intruders | Link RMS | Mean region radius | Large steps | Tail motion RMS |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n";
for(const s of summary) {
  const n=key=>s[key]?.mean.toFixed(3)??"failed";
  table+=`| ${s.name} | ${s.mode} | ${n("contextDepthRms")} | ${n("nonsharedDepthRms")} | ${n("fixedContextIntruders")} / ${n("fixedNonsharedIntruders")} | ${n("lengthRms")} | ${n("meanRegionRadius")} | ${n("largeSteps")} | ${n("tailStepRms")} |\n`;
}
await writeFile(join(output,"summary.md"),"# Focal-region exclusion: complete comparison means\n\nFive matched starts per row; see results.json for min/max ranges and all failures.\n\n"+table);
for(const name of exclusionCases) {
  const graph=exclusionGraph(name,seeds[0]),doc=new FreshmindDocument(new TypeRegistry(freshmind2014Configuration),graph);
  doc.title=`RFC exclusion: ${name} (synthetic)`;doc.view={focus:graph.getSubstructures()[0].rootId,radius:3,wholeGraph:true,lenses:{zoom:1,hyperbolic:0,rotation:0},canvas:{zoom:.8}};
  await writeFile(join(output,`${name}.fm.yaml`),serializeDocument(doc));
}
console.log(`Recorded ${results.length} runs, ${groups.size} matched starts and ${metadata.failed} failures in ${output}`);
if(metadata.failed)process.exitCode=1;
