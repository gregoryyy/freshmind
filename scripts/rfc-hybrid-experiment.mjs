/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
 * Prepared by Gregor Heinrich using Codex GPT-6.1. */
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {serializeDocument} from "fm4/fm/io";
import {seeds} from "./lib/rfc-comparison.mjs";
import {hybridDocument,hybridSpecs,hybridViews,runHybrid,matchHybrid} from "./lib/rfc-hybrid-fixture.mjs";

const output=resolve(process.argv[2]??"docs/experiments/rfc-hybrid"),results=[];
for(const spec of hybridSpecs()) {
  try{results.push(runHybrid(spec));}catch(error){results.push({...spec,status:"failed",error:String(error)});}
}
const starts=new Map(),twins=new Map(),memberships=new Map();
for(const r of results)if(r.status==="ok") {
  const start=JSON.stringify([r.initialNodes,r.edges,r.structures]),startKey=r.seed;
  if(starts.has(startKey)&&starts.get(startKey)!==start)throw new Error(`Unmatched physical start ${startKey}`);starts.set(startKey,start);
  const key=JSON.stringify([r.focus,r.view,r.seed,r.reinforcement]);
  const physical=JSON.stringify([r.nodes,r.trace,r.tailStepRms,r.unitRigidityForceRms]);
  if(twins.has(key)&&twins.get(key)!==physical)throw new Error(`Lens affected physics ${key}`);twins.set(key,physical);
  const viewKey=JSON.stringify([r.focus,r.view,r.seed]),membership=JSON.stringify(r.inventory);
  if(memberships.has(viewKey)&&memberships.get(viewKey)!==membership)throw new Error(`Unmatched protection ${viewKey}`);memberships.set(viewKey,membership);
}
matchHybrid(results);
const metadata={description:"Experiment J: matched TG/RFC × lens × structural views, on the documented synthetic 13-node hybrid input.",
  seeds,batches:400,stepsPerBatch:10,rigidity:.1,stabilizationEnabled:false,exclusionEnabled:false,views:hybridViews,
  runtime:{node:process.version,platform:process.platform,arch:process.arch},
  definitions:{protection:"Both TG and RFC controls preserve the nominated focal members using production source-neighborhood projection. Only the RFC force callback differs. Explicit filters still override protection; this isolates force from view membership.",
    matching:"Each reduced view is paired with the full control at the same seed/focus/force/lens. Both are scored on the reduced view's retained radial IDs, branch sets, visible node pairs and semantic edges. Hidden coordinates never enter these scores.",
    angular:"Angular RMS uses 2pi/N for each retained branch set. These are common-subset scores, not the full graph's original angular objective when degrees differ. Each recorded inventory preserves nominal and retained branch sets.",
    radial:"Distance minus the explicit RFC target 120, isotropic coordinates. The ordinary TG edge length parameter 90 is an attraction denominator, not a rest-length target.",
    display:"HyperLens 0 or 60 about the moving Project A center, unit graph/canvas scale, zero pan/rotation. Physical integrations must be identical across lens twins. Point pairs below 30 and proper straight-segment intersections are proxies, not label/body/routed-edge readability.",
    motion:"Every actual integration is sampled, including the tenth in every batch. Trace points show batch 1/every tenth/final batch; their motion covers that batch, not the skipped interval. Large means >29.9 Euclidean units; clipped means at least one axis reaches 30.",
    force:"Post-run net impulse RMS on visible nodes, with retained momentum cleared and global movement stopped; divide by rigidity. Probe cannot move saved coordinates and is excluded from motion totals.",
    scope:"One small synthetic semantic graph, two focal choices, five jittered starts, four view rules. No figure reproduction, general convergence, human readability or large-graph claim."},
  runCount:results.length,failed:results.filter(r=>r.status!=="ok").length,matchedStarts:starts.size,lensPairs:twins.size,matchedMemberships:memberships.size};
await mkdir(output,{recursive:true});
await writeFile(join(output,"results.json"),JSON.stringify(metadata,null,2).slice(0,-1)+',\n"results": [\n'+results.map(r=>JSON.stringify(r)).join(",\n")+'\n]}\n');
await writeFile(join(output,"matched-start.fm.yaml"),serializeDocument(hybridDocument()));
console.log(`Recorded ${results.length} runs, ${twins.size} exact lens pairs and ${metadata.failed} failures in ${output}`);
if(metadata.failed)process.exitCode=1;
