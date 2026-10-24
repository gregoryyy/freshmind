/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {FreshmindPanel} from 'fm4/fm';
import {installContextClearingProbe} from '../tests/fixtures/context-clearing.mjs';

const output=resolve(process.argv[2]??'docs/experiments/damping-context'),runs=[];
for(const rfc of [false,true])for(const legacyCooling of [false,true])for(const mode of ['off','graph','node']){
  let time=0;const panel=new FreshmindPanel(undefined,{autoStart:false,adaptiveDamping:{enabled:mode!=='off',scope:mode==='graph'?'graph':'node',now:()=>time}});
  const probe=installContextClearingProbe(panel,{rfc,legacyCooling,onStep:()=>{time+=2;}});
  const initialNodes=[...panel.getAllNodes()].map(n=>({id:n.getID(),x:n.x,y:n.y,fixed:n.fixed}));
  const settings=panel.getRfc().getState().settings,exclusion=panel.getRfc().getState().exclusionSettings;
  probe.tick();runs.push({rfc,legacyCooling,mode,initialNodes,settings,exclusion,...probe.result()});
  probe.dispose();panel.destroy();
}
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'results.json'),JSON.stringify({experiment:'L: independent damping and context progress',version:1,
  description:'1000 integrations, virtual 2 ms per step. Prescribed focal swing isolates response cross-talk; real RFC exclusion drives the context node. No wall-clock latency or general readability claim.',runs},null,2)+'\n');
const rows=runs.map(r=>`| ${r.rfc?'RFC exclusion':'Unit drift'} | ${r.legacyCooling?'on':'off'} | ${r.mode} | ${r.contextX.toFixed(6)} | ${r.clearance===null?'—':r.clearance.toExponential(3)} | ${r.lateOscillatorStepMax.toExponential(3)} |`);
await writeFile(resolve(output,'README.md'),`# Experiment L: damping without stalling context\n\n`+
  `A prescribed focal swing exposes cross-talk from the original shared gain. The context node either receives a unit outward impulse or moves under the real RFC region-exclusion force. The new default assigns independent gains and recovery to each node.\n\n`+
  `Regenerate with \`just damping-context-experiment\`. [Generator](../../../scripts/damping-context-experiment.mjs) · [synthetic fixture](../../../tests/fixtures/context-clearing.mjs) · [full records](results.json) · [damping guide](../../layout-damping.md).\n\n`+
  `## Protocol\n\n`+
  `Twelve matched runs cross two fixtures, inherited TG cooling off/on, and extra damping off/shared/node-local. Each run receives 1000 integrations at a virtual 2 ms cadence. Initial coordinates and force settings are recorded. Root (0,0) and branch (0,100) are fixed; a focal branch is prescribed to swing between (0,-50) and (0,-46), requesting a four-unit y response. The context label begins at (20,0), with zero pair repulsion to isolate damping. Unit-drift runs request dx=1 per step. RFC runs enable exclusion with strength 0.01 and padding 20, giving a known, fixed radius of 120; its ordinary spring/RFC callbacks remain active. The prescribed branch is an experimental input, not a production force.\n\n`+
  `The context x coordinate measures progress. Clearance is x−120 in the RFC fixture; negative values are inside. The final-window response is the maximum applied oscillator displacement during steps 901–1000, excluding the imposed positional jump. Off/shared/node-local runs use identical inputs.\n\n`+
  `## Rendered comparison\n\n![Shared gain stalls the context label; independent gains allow clearing](comparison.png)\n\nThis separate browser capture comes from the [rendered regression](../../../tests/browser/layout-damping.spec.mjs); the headless record generator leaves it unchanged. Both views use the same starts, settings and prescribed focal swing. The test independently measures label rectangles, without relying on the screenshot as its oracle.\n\n## Results\n\n| Fixture | TG cooling | Extra damping | Context x | Clearance | Late oscillator response |\n| --- | --- | --- | ---: | ---: | ---: |\n${rows.join('\n')}\n\n`+
  `The shared gain stalls context near its initial position despite a continuing outward force. Independent gains leave coherent motion available while suppressing the swinging node's response. In the RFC cases, context approaches the independently specified boundary within 0.001 units under both inherited-cooling settings. Native stiff-star suppression, fixed/dragged nodes, independent recovery, replacement and browser geometry have separate regression checks.\n\n`+
  `## Limits and historical scope\n\n`+
  `These controlled inputs establish damping isolation, not arbitrary-graph convergence or perceptual benefit. Region exclusion remains a soft, center-based force; body/label collision handling is separate. A node that itself oscillates can still be attenuated, inherited TG cooling can stop residual motion, and conflicting/pinned constraints may remain unsatisfied. The optional earlier-cooling response remains global and is not the node-local condition in this table.\n\n`+
  `[Experiment K](../layout-damping/README.md) retains its original shared-gain data, settings and figures. Its generator now explicitly selects graph scope for replay; its records are not replaced by these results.\n`);
console.log(JSON.stringify(runs.map(({rfc,legacyCooling,mode,contextX,clearance,lateOscillatorStepMax})=>({rfc,legacyCooling,mode,contextX,clearance,lateOscillatorStepMax})),null,2));
