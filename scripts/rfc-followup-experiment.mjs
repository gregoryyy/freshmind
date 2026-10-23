/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {comparisonSpecs,runComparison,seeds,stats,weightProfiles} from "./lib/rfc-comparison.mjs";

if(process.argv.length>4)throw new Error("Usage: node scripts/rfc-followup-experiment.mjs [output-root] [damping|weights|clusters]");
const output=resolve(process.argv[2]??"docs/experiments/rfc-followup"),families=process.argv[3]?[process.argv[3]]:["damping","weights","clusters"];
const batches=400;
const definitions={
  motion:"Actual movements over every integration, including all ten within each batch. Tail is the last 100 integrations; zero motion alone is not convergence.",
  largeSteps:"Integrations in which any movable node travels >29.9 units (Euclidean).",
  clippedSteps:"Integrations in which any movable node moves >=30-1e-9 along either axis; counted independently of Euclidean large steps.",
  trace:"Batch 1 and every tenth batch: max/RMS cover that ten-integration batch, not the entire interval between trace records. Cumulative totals cover every integration.",
  force:"At final coordinates, zero momentum, local damping disabled, global damper zero: measure the first ordinary TG+RFC force evaluation on movable nodes. RMS vector magnitude divided by global rigidity. Probe does not move nodes and is excluded from motion totals; this is a net force-balance diagnostic, not an energy or stability proof.",
  treeErrors:"Physical lengths and merged angular gaps on the complete original selected-tree union, including zero-weight branches. Same geometry observables in every condition; individual tree errors and shared-root length lower bounds retained.",
  weightedErrors:"q-weighted RMS on the original tree-edge union, alongside common unweighted errors. Zero contributions excluded from its denominator; never used alone to claim improvement.",
  clusterErrors:"All internal semantic links vs their integer spring-length targets; all-pairs deformation vs analytic unjittered square/ring geometry, independent of activation/projection. Deformation combines per-community pair RMS values with equal community weight.",
  drawing:"Strict straight-segment crossings between nonincident semantic edges and movable-node pairs closer than 30. Physical centers only, not curved browser paths or measured labels; these are limited geometry proxies, not human readability.",
  overlap:"Intersection area of convex physical member-center hulls. Shared-membership overlap is expected; no exclusion constraint or displayed rounded hull is measured.",
};
function key(run) {
  return run.family==="damping"?[run.topology,run.fixedRoots,run.rigidity,run.damping]:run.family==="weights"?
    [run.topology,run.profile,run.mode]:[run.topology,run.load,run.mode,run.clusterRigidity??null,run.damping];
}
function summarize(results) {
  const groups=new Map();for(const run of results){const id=JSON.stringify(key(run));if(!groups.has(id))groups.set(id,[]);groups.get(id).push(run);}
  return [...groups.values()].map(group=>{
    const first=group[0],ok=group.filter(r=>r.status==="ok"),fields={};
    for(const field of ["largeSteps","clippedSteps","tailStepRms","unitRigidityForceRms"])
      fields[field]=ok.length?stats(ok.map(r=>r[field])):null;
    for(const field of ["lengthRms","angleRms","weightedLengthRms","priorityLengthRms","deformationRms","boundaryLengthRms","overlapArea","straightCrossings","nearPairs"])
      if(ok.some(r=>typeof r.final[field]==="number"))fields[field]=stats(ok.map(r=>r.final[field]).filter(x=>typeof x==="number"));
    return {condition:key(first),count:group.length,failed:group.length-ok.length,...fields};
  });
}
function tabulate(summary,family) {
  const fields=["largeSteps","clippedSteps","tailStepRms","unitRigidityForceRms","lengthRms",...(family==="clusters"?
    ["deformationRms","boundaryLengthRms","overlapArea"]:["angleRms"]),...(family==="weights"?["priorityLengthRms","weightedLengthRms"]:[]),"straightCrossings","nearPairs"];
  let text="# Complete condition summary\n\nGenerated from all declared runs. Each value is **mean [min, max]** across five fixed starts, not a confidence interval. Numbers are rounded to three decimals; consult CSV/JSON for full precision, especially small force residuals. Failures remain in the count and are excluded only from numeric aggregates. Read the parent report for definitions and limits.\n\n";
  text+="| Condition | Runs / failed | "+fields.join(" | ")+" |\n| --- | --- | "+fields.map(()=>"---:").join(" | ")+" |\n";
  const format=v=>!v?"—":`${v.mean.toFixed(3)} [${v.min.toFixed(3)}, ${v.max.toFixed(3)}]`;
  for(const s of summary)text+=`| ${s.condition.map(x=>x===null?"—":String(x)).join(" / ")} | ${s.count} / ${s.failed} | ${fields.map(f=>format(s[f])).join(" | ")} |\n`;
  const columns=["condition","count","failed",...fields.flatMap(f=>[`${f}.mean`,`${f}.min`,`${f}.max`])];
  const csv=[columns.join(","),...summary.map(s=>[JSON.stringify(s.condition.join(" / ")),s.count,s.failed,...fields.flatMap(f=>s[f]?[s[f].mean,s[f].min,s[f].max]:["","",""])].join(","))].join("\n")+"\n";
  return {text,csv};
}
function audit(results) {
  const starts=new Map(),baselines=new Map();
  const coords=nodes=>nodes.map(({id,x,y,fixed})=>({id,x,y,fixed}));
  for(const r of results)if(r.status==="ok") {
    const id=JSON.stringify([r.topology,r.seed,r.fixedRoots??false,r.load??null]);
    const start=JSON.stringify([coords(r.initialNodes),r.initialEdges.map(({weight,...e})=>e)]);
    if(starts.has(id)&&starts.get(id)!==start)throw new Error(`Unmatched initial state: ${id}`);starts.set(id,start);
    if(r.family==="weights"&&r.mode==="baseline") {
      const schedule=["transition","sham"].includes(r.profile)?"wake-control":"static";
      const baselineId=id+schedule,final=JSON.stringify(coords(r.nodes));
      if(baselines.has(baselineId)&&baselines.get(baselineId)!==final)throw new Error(`Weight changed plain TG: ${baselineId}`);
      baselines.set(baselineId,final);
    }
    if(r.sampledSteps!==batches*10)throw new Error("Incorrect sampling budget");
  }
  return {matchedStartGroups:starts.size,baselineEquivalenceGroups:baselines.size,failed:results.filter(r=>r.status!=="ok").length};
}
for(const family of families) {
  const specs=comparisonSpecs(family),results=[];
  for(const [index,spec] of specs.entries()) {
    try {results.push(runComparison(spec,{batches}));}
    catch(error){results.push({...spec,status:"failed",error:String(error)});}
    if((index+1)%30===0)console.log(`${family}: ${index+1}/${specs.length}`);
  }
  const summary=summarize(results),checks=audit(results),metadata={family,batches,stepsPerBatch:10,virtualStepMs:2,seeds,
    runtime:{node:process.version,platform:process.platform,arch:process.arch},
    description:"Predeclared matched RFC extension comparisons; synthetic data only; fixed budget, all conditions and failures retained.",
    rng:"Initial tree jitter retains original fixture seeds. New layouts use an independent seeded LCG (seed xor 0x00c0ffee) solely for exact coincidences.",
    rigidity:"Queued TG rigidity is primed on an empty graph before registering forces. Every measured integration uses the declared rigidity; no graph warm-up.",
    definitions,weightProfiles:family==="weights"?weightProfiles:undefined,
    weights:family==="weights"?{nodes:["a1","b1"],edges:["a0:a1","b0:b1"],transitionAfterBatches:[100,200],
      transition:"neutral -> exact zero -> epsilon. Both transitions explicitly wake TG. Sham profile retains neutral weights with identical wakes. Baseline equality is audited within wake schedules."}:undefined,
    checks,summary};
  const folder=join(output,family);await mkdir(folder,{recursive:true});
  // One complete run per line keeps regenerated condition diffs reviewable.
  const prefix=JSON.stringify(metadata,null,2).trimEnd().slice(0,-1);
  await writeFile(join(folder,"results.json"),prefix+',\n"results": [\n'+results.map(r=>JSON.stringify(r)).join(",\n")+'\n]}\n');
  const {text,csv}=tabulate(summary,family);await writeFile(join(folder,"summary.md"),text);await writeFile(join(folder,"summary.csv"),csv);
  console.log(`${family}: wrote ${results.length} runs; ${checks.failed} failed; ${checks.matchedStartGroups} matched starts`);
  if(checks.failed)process.exitCode=1;
}
