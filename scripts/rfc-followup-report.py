#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
Build companion reports from the declared RFC follow-up records.
"""
import json
import sys
from pathlib import Path
from statistics import mean

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/experiments/rfc-followup")
DATA = {f: json.loads((ROOT/f/"results.json").read_text()) for f in ("damping", "weights", "clusters")}


def runs(family, **filters):
    return [r for r in DATA[family]["results"] if r["status"] == "ok" and all(r.get(k) == v for k, v in filters.items())]


def measure(rs, field):
    return mean(r.get(field, r["final"].get(field)) for r in rs)


def table(headers, rows):
    return "| "+" | ".join(headers)+" |\n| "+" | ".join("---" for _ in headers)+" |\n"+"".join("| "+" | ".join(str(v) for v in row)+" |\n" for row in rows)+"\n"


def figure(name, caption):
    return f"![{caption}](../figures/{name}.svg)\n\n*{caption}* [PDF](../figures/{name}.pdf) · [PNG](../figures/{name}.png)\n\n"


COMMON = """## Measurement and reproducibility

Each condition runs 400 batches × 10 integrations, with a deterministic virtual clock of 2 ms per integration. The five seeds are `0x1234abcd`, `0x05eeda11`, `0x00c0ffee`, `0xdecafbad` and `0x9e3779b9`. No seed is discarded or retuned. All data is synthetic; no proprietary graph is used. Every integration is observed, including movements that cancel over a batch.

**Large steps** count integrations with any movable node travelling more than 29.9 units. **Clipped steps** independently count an axis movement of at least 30−1e-9. Tail motion covers the last 100 integrations. Trace records describe batch 1 and each tenth batch; their motion maxima/RMS cover that particular ten-step batch, while cumulative counts cover the entire run. The full records retain initial/final coordinates, all semantic edges, memberships, settings, detector states/events, transition observations and per-structure metrics.

**Unit-rigidity force RMS** probes the final coordinates after clearing momentum, disabling local attenuation and setting global motion to zero. It uses the existing TG+RFC callbacks, divides force by global rigidity and excludes pinned-node reactions from the RMS. No probe movement or integration is included in the reported run. This separates cooling from force balance; a small force residual does not imply feasible target geometry, a minimum, or stability after a disturbance.

Straight-segment crossings and movable-node pairs closer than 30 are retained as limited geometry proxies. They do not measure the browser's curved edges, actual label dimensions, task performance or human readability. Means and min/max ranges describe five designed starts, not confidence intervals or population estimates. Exact archived replay is checked in the recorded Node/platform/architecture; other runtimes check repeated local runs rather than assuming identical nonlinear floating-point trajectories. No convergence, performance or universal parameter recommendation follows from this finite study.

Run `just rfc-followup-experiment` for all three comparisons and figures. `just rfc-followup-figures` redraws recorded data; `just rfc-followup-report` rebuilds this narrative and its numeric tables. See [results.json](results.json), the [complete condition summary](summary.md) and [CSV](summary.csv). Matplotlib and NumPy are required for plotting. Previous Experiments A–E and the historical detector comparison remain separate and unchanged.
"""


def damping_report():
    d=DATA["damping"]
    text=f"""# Experiment F: damping versus lower rigidity

**{len(d['results'])} runs; {d['checks']['failed']} failures.** Three recorded two-tree topologies × movable/pinned roots × five starts × global rigidity `1`, `0.5`, `0.25`, `0.1` × local damping off/on. Both trees are reinforced throughout; tree force settings, topology and initial coordinates are matched. The original fixed-force [120-run comparison](../../rfc-multifocus/README.md) is retained.

## Protocol

The tree preset remains target 120, radial stiffness 1, angular stiffness 10000 and attraction multiplier 1, with coordinate weights (1, 1). Lower **global rigidity** scales ordinary TG and RFC forces together, changing integration dynamics without changing their relative strengths. This differs from reducing only RFC spring strength. TG's queued rigidity is primed on an empty graph, so the first measured integration already uses the declared value. No measured graph is warmed up.

Each matched condition retains the same roots, even where pinned roots make lengths infeasible. The controller's v2 detector is used when damping is enabled; the inherited global cooler remains on in every run. The independent coincidence RNG is also seeded. Identical starting coordinates/semantic edges are audited across all conditions, producing **{d['checks']['matchedStartGroups']} matched start groups**.

## Leaf-linked trees: motion, geometry and balance

The table reports means across the five movable-root starts. Geometric length error always includes the same original tree-edge union, with target 120. A zero-motion tail is reported separately from the final force diagnostic.

"""
    rows=[]
    for rigidity in (1,.5,.25,.1):
        for damping in (False,True):
            rs=runs("damping",topology="leaf-connected-trees",fixedRoots=False,rigidity=rigidity,damping=damping)
            rows.append([rigidity,"on" if damping else "off",f'{measure(rs,"largeSteps"):.1f}',f'{measure(rs,"tailStepRms"):.4f}',f'{measure(rs,"lengthRms"):.3f}',f'{measure(rs,"unitRigidityForceRms"):.4f}'])
    text+=table(["Global rigidity","Local damping","Large steps","Tail step RMS","Common length RMS","Unit-rigidity force RMS"],rows)
    high=runs("damping",topology="leaf-connected-trees",fixedRoots=False,rigidity=1,damping=True)
    low=runs("damping",topology="leaf-connected-trees",fixedRoots=False,rigidity=.1,damping=False)
    text+=f"At rigidity 1, adaptive damping limits mean large steps to **{measure(high,'largeSteps'):.1f}**, but leaves mean length RMS **{measure(high,'lengthRms'):.2f}** and force RMS **{measure(high,'unitRigidityForceRms'):.2f}**. Rigidity 0.1 without local damping yields **{measure(low,'largeSteps'):.1f}** large steps, length RMS **{measure(low,'lengthRms'):.2f}** and force RMS **{measure(low,'unitRigidityForceRms'):.3f}**. This supports lowering force scale as a useful separate control on these starts. It does not establish one optimum: rigidity 0.25 has an even smaller final force residual but many more transient large steps. Suppressing motion quickly and reaching force balance within the budget are different objectives.\n\n"
    text+=figure("01-damping-rigidity","F1. All five leaf-linked starts, with root constraints separated; motion, geometric residual and force balance.")
    r=runs("damping",topology="shared-subtree",fixedRoots=True,seed=0x9e3779b9,rigidity=.25,damping=False)[0]
    text+=f"""## Shared subtree: infeasibility survives successful balancing

For the previously oscillating pinned-root seed `0x9e3779b9`, rigidity 0.25 without local damping has **{r['largeSteps']}** large steps and force RMS **{r['unitRigidityForceRms']:.2g}**, but length RMS remains **{r['final']['lengthRms']:.2f}**. The root-distance lower bound is **{r['final']['lengthLowerBound']:.2f}**. This is a force-balanced compromise with incompatible targets, not a failure of detection or evidence that the length objective has been achieved. Per-tree and merged-neighborhood angular errors are retained because shared angular targets can also conflict.

"""
    text+=figure("02-shared-subtree","F2. The recorded pinned shared-subtree start under matched rigidity/damping conditions.")
    text+="## Finding and limits\n\nLocal damping remains useful for stopping violent transient motion, but recovery of local gain cannot undo global cooling. Lower rigidity often improves the resulting balance; it also changes the finite-time route through a nonlinear, clipped system. The current experiment does not implement a timestep-aware integrator, automatically select rigidity, reopen cooling during recovery, or establish general stability. No production force or default was changed.\n\n"+COMMON
    return text


def weights_report():
    d=DATA["weights"]
    text=f"""# Experiment G: nonuniform node and relation importance

**{len(d['results'])} runs; {d['checks']['failed']} failures.** Joined and leaf-linked trees × five movable-root starts × ten weight profiles × plain TG / RFC with damping off / RFC with damping on. Profiles and conditions are declared before running; identical physical starts and semantic topology are audited.

## Protocol

Only nodes **a1 and b1**, and relations **a0:a1 and b0:b1**, receive the profile values below. Every other node/edge retains its default (1/10). Their own non-root incident RFC links also depend on node importance. The model, tree definitions, preferred length 120 and global rigidity 1 remain fixed. The weight mapping is the implemented [bounded importance contract](../../../rfc-importance.md): `s(w;d)=2w/(w+d)` and `q(e)=sqrt(s(u;1))*sqrt(s(v;1))*s(e;10)`.

"""
    text+=table(["Profile","Node weight","Relation weight"],[[name,p["node"],p["edge"]] for name,p in d["weightProfiles"].items()])
    text+="Saturated/extreme values apply to both listed nodes and relations. With the other endpoint at default importance, the selected relation coefficient approaches `2 sqrt(2)`, rather than growing without limit. Zero removes eligible branches; epsilon retains their angular slots. No semantic IDs are deleted. Transition begins neutral, changes to zero after batch 100 (2 seconds), and to epsilon after batch 200 (4 seconds). Both changes explicitly wake TG. **Sham** retains neutral weights with identical wakes, so reheating is a controlled factor.\n\nAll static-profile plain-TG final coordinates are exactly identical per start; transition/sham baselines are also exactly identical under their shared wake schedule. These audits verify that importance does not change ordinary TG forces. Numeric geometry is compared on all original selected-tree links, including disabled links. A separate q-weighted RMS is reported alongside it.\n\n## Weighted-sector accuracy and common error\n\nMeans below use the five leaf-linked starts with local damping off. The priority column uses only the two explicitly weighted relations; the common column retains all twelve original tree links.\n\n"
    rows=[]
    for profile in ("neutral","nodes","edges","coupled","saturated","extreme","epsilon","zero"):
        rs=runs("weights",topology="leaf-connected-trees",profile=profile,mode="both")
        rows.append([profile,f'{measure(rs,"priorityLengthRms"):.3f}',f'{measure(rs,"lengthRms"):.3f}',f'{measure(rs,"weightedLengthRms"):.3f}',f'{measure(rs,"largeSteps"):.1f}'])
    text+=table(["Profile","Priority-link RMS","Common length RMS","q-weighted length RMS","Large steps"],rows)
    text+="Stronger selected constraints improve those links on these starts, but not monotonically across every seed or metric. The saturated and extreme mappings are close, while fixed-budget trajectories can differ because clipping, branch ordering and global cooling are nonlinear. Saturation bounds a coefficient; it does not bound total coupled curvature or guarantee matching layouts.\n\nThe zero/epsilon rows show the measurement trap: q-weighted error can be small while the common error and disabled-sector distortion remain large. Dropping low-weight terms from the denominator would hide that cost.\n\n"
    text+=figure("03-weight-sweep","F3. Profile responses across both topologies, all starts and all three simulation modes.")
    text+="## Zero transitions and the wake-only control\n\nThe neutral-to-zero change reduces the positive-strength tree union from twelve to six links; epsilon restores twelve without restoring full force strength. The complete saved memberships remain unchanged. Per-transition records retain metrics and projected center membership immediately before and after each edit. This exposes the discrete eligibility change rather than treating epsilon as equivalent to zero.\n\n"
    rows=[]
    for profile in ("transition","sham"):
        for mode in ("baseline","both","damped"):
            rs=runs("weights",topology="leaf-connected-trees",profile=profile,mode=mode)
            rows.append([profile,mode,f'{measure(rs,"largeSteps"):.1f}',f'{measure(rs,"tailStepRms"):.3f}',f'{measure(rs,"lengthRms"):.3f}'])
    text+=table(["Schedule","Mode","Large steps","Tail step RMS","Common length RMS"],rows)
    text+="The wake-only control itself can sustain large movement when damping is off. Weight-transition outcomes therefore cannot be attributed solely to zero eligibility. The paired records separate an edit's force/topology effect from the explicit reheat used by the application.\n\n"
    text+=figure("04-weight-transitions","F4. The recorded leaf-linked seed with exact membership-change events and matched wake schedules.")
    text+=figure("05-weight-layouts","F5. Matched final layouts explicitly encode node and relation importance in the report.")
    text+="## Finding and limits\n\nWeights provide local priority, with finite saturation and a discrete zero boundary. They can improve selected constraints and shift error to other parts of the graph. The figures encode importance for evaluation; the browser's node-size/weight visualization remains a separate UI gap. This study does not change mass, preferred lengths, ordinary forces or production rendering. It covers two small tree topologies, not DAGs, clusters, all weighting patterns or perceptual benefit.\n\n"+COMMON
    return text


def clusters_report():
    d=DATA["clusters"]
    text=f"""# Experiment H: compact clusters versus tree projections

**{len(d['results'])} runs; {d['checks']['failed']} failures.** Three community geometries × five starts × weak/strong external load × eight reinforcement conditions. Every condition retains the complete semantic graph, identical initial coordinates and the same pinned context anchors. Node/relation importance stays at its neutral defaults.

## Fixtures and comparable objectives

- **Dense squares:** two separate four-node cliques, with one ordinary bridge.
- **Overlapping squares:** two cliques sharing two members and their connecting relation. Shared constraints are retained once by the existing controller.
- **Sparse rings:** two six-member rings with one diameter chord each, plus an ordinary bridge. These are deformable subgraphs with fewer constraints on shape.

The unjittered reference shapes have perimeter sides 120. Actual starts add uniform coordinate jitter in [-20,20), using the declared seeds. Internal semantic lengths are their analytic reference distances rounded to positive integers, as required by TG (square diagonals round to 170). The deformation reference retains the exact analytic distances; therefore link and pair-distance metrics differ slightly even on a perfect reference. Four pinned anchors create two outward loads per community. Weak/strong load changes only the boundary attraction denominator from 180 to 30; those ordinary links remain active in every condition.

The conditions are **plain TG**, **perimeter spanning-tree RFC**, and **cluster rigidity 0, 0.25, 1, 2**, plus **cluster 1/2 with local damping**. C0 retains cluster caps and centroid compactness. The tree projection selects only perimeter relations, whose preferred lengths are 120, while remaining internal relations still exert ordinary forces. Its angular targets favor tree regularity. Clusters reinforce all internal relations toward semantic-length-scaled targets and have no angular template. These objectives differ deliberately; common observables always evaluate the same full community geometry.

The existing one-sided internal-link cap at focal length **120 remains active at every cluster rigidity**, alongside the semantic-length springs. Thus a diagonal targeted at 170 or diameter targeted at 240 is also pulled toward the shorter cap while extended. The analytic reference does not minimize every active term simultaneously, even before context/repulsion is considered. These are comparisons of the complete implemented cluster primitive, not isolated rigid-bar constraints; residual deformation can reflect this competing objective as well as sparse flexibility and solver dynamics.

**All-pairs deformation RMS** compares every member pair's distance to the unjittered reference, including pairs without reinforced links, and combines equal-weight community RMS values. This is invariant to translation/rotation/reflection but measures the selected reference shape, not a universal ideal drawing. **Common link error** includes all unique internal relations in every mode. Extent, boundary-link error, convex hull area/intersection, crossings and near-node counts are also retained.

## Strong-load results

Means across five starts. Damping is off except in rows marked +d.

"""
    rows=[]
    conditions=[("TG","baseline",None,False),("Tree","tree",None,False),("C0","cluster",0,False),("C0.25","cluster",.25,False),
                ("C1","cluster",1,False),("C2","cluster",2,False),("C1+d","cluster",1,True),("C2+d","cluster",2,True)]
    for topology in ("dense-squares","overlapping-squares","sparse-rings"):
        for label,mode,rigidity,damping in conditions:
            rs=[r for r in runs("clusters",topology=topology,load="strong",mode=mode,damping=damping) if r.get("clusterRigidity")==rigidity]
            rows.append([topology,label,f'{measure(rs,"lengthRms"):.2f}',f'{measure(rs,"deformationRms"):.2f}',f'{measure(rs,"largeSteps"):.1f}',f'{measure(rs,"unitRigidityForceRms"):.3g}'])
    text+=table(["Topology","Mode","Common link RMS","Pair deformation RMS","Large steps","Force RMS"],rows)
    text+="Dense clique geometry is preserved much better by stronger cluster springs than by the tree projection in these fixtures. This comes with stiffness costs: C2 without damping produces many transient large steps. Damping often suppresses them with similar dense-clique error, but does not uniformly preserve sparse shape. On the strongly loaded rings, C2 reduces selected-link error relative to C1 while **increasing all-pairs deformation**; adding damping increases deformation further. A sparse spring graph is not a rigid body.\n\n"
    text+=figure("06-cluster-sweep","F6. Both boundary loads and every condition, including seed ranges and final force balance.")
    text+=figure("07-cluster-layouts","F7. Dense and shared cliques retain their semantic diagonals across all conditions.")
    text+="## Extent, overlap and drawing proxies\n\n"
    rows=[]
    for topology in ("dense-squares","overlapping-squares","sparse-rings"):
        for label,mode,rigidity,damping in (conditions[0],conditions[1],conditions[4],conditions[5]):
            rs=[r for r in runs("clusters",topology=topology,load="strong",mode=mode,damping=damping) if r.get("clusterRigidity")==rigidity]
            extent=mean(mean(c["extentRms"] for c in r["final"]["perCommunity"]) for r in rs)
            rows.append([topology,label,f'{extent:.2f}',f'{measure(rs,"overlapArea"):.1f}',f'{measure(rs,"straightCrossings"):.1f}',f'{measure(rs,"nearPairs"):.1f}'])
    text+=table(["Topology","Mode","Mean extent RMS","Hull overlap area","Straight crossings","Pairs <30"],rows)
    text+="The prescribed square with both diagonals has one straight crossing per clique. Returning toward that reference can increase the crossing count even while deformation improves. This is a concrete reason not to equate the regularity metric with readability. Physical hull intersection may be zero for communities sharing only an edge. Zero area does not mean no shared membership, no label overlap or an implemented exclusion force.\n\n"
    text+=figure("08-cluster-extent","F8. Member extent and physical hull intersection under strong load, all five starts.")
    text+="## Finding and limits\n\nRetaining cyclic internal links gives a materially different reinforcement primitive from a spanning tree. Independent rigidity improves dense shape preservation in these tests; sparse subgraphs can still flex or fold while keeping selected lengths. External forces, inherited cooling and competing constraints remain relevant. These are manually specified communities: Louvain detection quality, arbitrary graphs, perceptual readability and boundary exclusion have not been evaluated here. Smooth displayed enclosures remain a rendering feature, independent of these physical hull measurements.\n\n"+COMMON
    return text


for family,report in (("damping",damping_report()),("weights",weights_report()),("clusters",clusters_report())):
    (ROOT/family/"README.md").write_text(report)
(ROOT/"README.md").write_text("""# RFC follow-up experiments F–H

These comparisons complete roadmap **3.4.6–3.4.8** for the implemented tree/importance/cluster mechanisms. They retain the original experiments and add **780 declared runs**, each 4000 integrations, across five deterministic starts. All runs completed without nonfinite failures. Eight diagrams are provided as SVG, PDF and PNG.

| Experiment | Question | Runs | Report |
| --- | --- | ---: | --- |
| F | Adaptive damping versus lower global rigidity, with free/pinned roots | 240 | [Damping and rigidity](damping/README.md) |
| G | Nonuniform importance, saturation, zero transitions and matched wake controls | 300 | [Node and relation weights](weights/README.md) |
| H | Clusters versus TG and perimeter trees, with rigidity/overlap/external-load comparisons | 240 | [Cluster reinforcement](clusters/README.md) |

Three findings recur. Stopping movement is distinct from reaching force balance, and a force-balanced compromise can retain infeasible target error. Weighting can improve selected links while hiding large errors if low-weight terms are omitted from evaluation. Dense internal constraints preserve shape better than a tree projection here, while sparse clusters remain deformable and do not become rigid bodies simply by increasing spring strength.

`just rfc-followup-experiment` regenerates all records, condition tables, reports and figures. `just rfc-followup-figures` redraws existing records; `just rfc-followup-report` rebuilds reports from their numeric inputs. Plotting uses Matplotlib/NumPy. All inputs are synthetic, and all conditions, seed ranges and failures are retained. Headless physical drawings do not measure browser label overlap or human readability. No production force, default or renderer changed in this follow-up.

The present experimental round is complete; RFC itself remains partial. Region exclusion and hybrid filtering await implementation and their own comparisons. DAG evaluation, broader datasets, label geometry and user studies remain outside this round. See [TODO](../../TODO.md), the [earlier detector comparison](../rfc-stability/README.md) and the [second draft paper](../../papers/rfc-revisited-draft2.md). The [recording protocol](../../../scripts/lib/rfc-comparison.mjs), [runner](../../../scripts/rfc-followup-experiment.mjs), [report source](../../../scripts/rfc-followup-report.py) and [plotting source](../../../scripts/rfc-followup-figures.py) define the reproducible workflow.
""")
print(f"Wrote three experiment reports and index to {ROOT}")
