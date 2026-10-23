#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
Draw recorded exclusion observations and write the companion experiment report.
"""
import json
import sys
import textwrap
from pathlib import Path
from statistics import mean
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Ellipse
import numpy as np

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else "docs/experiments/rfc-exclusion")
DATA=json.loads((ROOT/"results.json").read_text())
RUNS=[r for r in DATA["results"] if r["status"]=="ok"]
OUT=ROOT/"figures"
OUT.mkdir(parents=True,exist_ok=True)
MODES=["baseline","rfc","context","overlap","strong"]
COLORS=["#63758d","#b96720","#346eaa","#138575","#8b5ea6"]
LABELS=["TG","RFC","+ context","+ overlap","Strength 1"]
CASES=["single-region","shared-foci","overlap-pressure","cluster-regions"]
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":8,"axes.titlesize":10,"svg.hashsalt":"fm4-rfc-exclusion",
                     "axes.spines.top":False,"axes.spines.right":False})


def select(name,mode,seed=None):
    return [r for r in RUNS if r["name"]==name and r["mode"]==mode and (seed is None or r["seed"]==seed)]


def save(fig,name,caption):
    fig.text(.035,.018,textwrap.fill(caption,155),fontsize=7,va="bottom")
    fig.savefig(OUT/f"{name}.svg",metadata={"Date":None})
    path=OUT/f"{name}.svg"
    path.write_text("\n".join(line.rstrip() for line in path.read_text().splitlines())+"\n")
    fig.savefig(OUT/f"{name}.pdf",metadata={"CreationDate":None,"ModDate":None})
    fig.savefig(OUT/f"{name}.png",dpi=180)
    plt.close(fig)


fig,axes=plt.subplots(4,3,figsize=(12,11))
fig.subplots_adjust(top=.92,bottom=.16,hspace=.48,wspace=.3)
fig.suptitle("I1. Focal-region exclusion: common measures across every condition",y=.98,fontsize=13)
for row,name in enumerate(CASES):
    for col,field in enumerate(("contextDepthRms","meanNonsharedDepth","lengthRms")):
        ax=axes[row,col]
        for x,(mode,color) in enumerate(zip(MODES,COLORS)):
            values=[r[field] if field in r else r["final"][field] for r in select(name,mode)]
            ax.scatter(x+np.linspace(-.04,.04,len(values)),values,s=16,color=color,alpha=.7)
            ax.vlines(x,min(values),max(values),color=color,lw=1)
            ax.hlines(mean(values),x-.16,x+.16,color=color,lw=2)
        ax.set_xticks(range(5),LABELS,rotation=30,ha="right",fontsize=7)
        ax.set(title=name,ylabel=("Final movable-context depth RMS","Mean non-shared depth over all steps","Common focal-link RMS")[col])
        if col==1:
            ax.set_yscale("symlog",linthresh=.001)
        ax.set_ylim(bottom=0)
        ax.grid(alpha=.15);ax.set_axisbelow(True)
save(fig,"01-exclusion-comparison","I1. Five matched starts per case/mode, 4000 integrations, global rigidity 0.1 and local damping off. Points show all starts, verticals min–max and bars means, not confidence intervals. Context/focal errors use the same hypothetical region-fitting policy even for TG/RFC controls. Non-shared exposure includes every integration; final non-shared intrusion is zero in the RFC conditions here. Link objectives and region sizes remain in the records. Pinned intruders are reported separately.")


def bounds(runs,initial=False):
    nodes=[n for r in runs for n in r["initialNodes" if initial else "nodes"]]
    regions=[region for r in runs for region in r["initial" if initial else "final"]["regions"]]
    limits=[]
    for c,weight in (("x","x"),("y","y")):
        values=[n[c] for n in nodes]
        for r in regions:
            radius=r["radius"]/np.sqrt(r["coordinateWeights"][weight])
            values.extend([r["center"][c]-radius,r["center"][c]+radius])
        limits.append((min(values)-25,max(values)+25))
    return limits


def graph(ax,r,limits,initial=False):
    nodes={n["id"]:n for n in r["initialNodes" if initial else "nodes"]}
    regions=r["initial" if initial else "final"]["regions"]
    for index,region in enumerate(regions):
        ax.add_patch(Ellipse((region["center"]["x"],region["center"]["y"]),
                            2*region["radius"]/np.sqrt(region["coordinateWeights"]["x"]),
                            2*region["radius"]/np.sqrt(region["coordinateWeights"]["y"]),
                            facecolor=(COLORS[2],COLORS[4])[index%2],alpha=.05,zorder=0))
        ax.add_patch(Ellipse((region["center"]["x"],region["center"]["y"]),
                            2*region["radius"]/np.sqrt(region["coordinateWeights"]["x"]),
                            2*region["radius"]/np.sqrt(region["coordinateWeights"]["y"]),
                            fill=False,edgecolor=(COLORS[2],COLORS[4])[index%2],ls="--",lw=.8))
    selected={e for s in r["structures"] for e in s["edgeIds"]}
    for e in r["edges"]:
        a,b=nodes[e["from"]],nodes[e["to"]]
        ax.plot([a["x"],b["x"]],[a["y"],b["y"]],color="#8b8b8b",lw=.8,ls="-" if e["id"] in selected else ":",zorder=1)
    for id,n in nodes.items():
        count=sum(id in s["nodeIds"] for s in r["structures"])
        pressure=id=="pressure-anchor"
        marker="x" if pressure else "^" if not count and not n["fixed"] else "s" if n["fixed"] else "o"
        color="#b74545" if not count else COLORS[4] if count>1 else COLORS[2]
        ax.scatter(n["x"],n["y"],s=24,marker=marker,color=color,zorder=3)
        if id in ("a0","b0","shared"):
            ax.annotate(id,(n["x"],n["y"]),xytext=(3,4),textcoords="offset points",fontsize=6)
    ax.set(xlim=limits[0],ylim=limits[1],xlabel="Physical x",ylabel="Physical y")
    ax.set_aspect("equal");ax.tick_params(labelsize=6);ax.grid(alpha=.12)


fig,axes=plt.subplots(2,4,figsize=(13,7))
fig.subplots_adjust(top=.87,bottom=.18,wspace=.34,hspace=.3)
fig.suptitle("I2. Identical starts: soft clearing with explicit pinned constraints",y=.98,fontsize=13)
fig.legend(handles=[Line2D([],[],color="#b74545",marker="^",ls="",label="Movable context"),
                    Line2D([],[],color="#b74545",marker="x",ls="",label="Pinned pressure anchor"),
                    Line2D([],[],color=COLORS[4],marker="o",ls="",label="Shared member")],
           loc="upper center",bbox_to_anchor=(.5,.95),ncol=3,fontsize=8,frameon=False)
for row,name in enumerate(("single-region","overlap-pressure")):
    chosen=[select(name,mode,DATA["seeds"][0])[0] for mode in MODES[1:]]
    limits=bounds(chosen)
    for ax,r,label in zip(axes[row],chosen,LABELS[1:]):
        graph(ax,r,limits)
        ax.set_title(f'{label}: context depth {r["final"]["contextDepthRms"]:.2f}\nFocal link RMS {r["final"]["lengthRms"]:.2f}',fontsize=8)
save(fig,"02-exclusion-layouts","I2. First seed 0x1234abcd, final layouts with shared physical axes within each row. Ellipses are measured reference areas in every panel, even with exclusion off. Upper row keeps all focal members fixed; lower row has pinned roots and shared membership. Triangles are movable context; squares are pinned nodes, and the red cross is a pinned non-focal pressure anchor. A soft force cannot expel that anchor. Physical points/straight semantic edges do not measure rendered labels.")


chosen=[select("overlap-pressure",mode,DATA["seeds"][0])[0] for mode in MODES[1:]]
fig,axes=plt.subplots(1,3,figsize=(12.4,4.8))
fig.subplots_adjust(top=.84,bottom=.24,wspace=.32)
fig.suptitle("I3. Overlap policy and its limited additional effect on these starts",y=.98,fontsize=13)
graph(axes[0],chosen[2],bounds([chosen[2]],initial=True),initial=True)
base={n["id"]:n for n in chosen[0]["initialImpulses"]}
points={n["id"]:n for n in chosen[2]["initialNodes"]}
diff=[(points[f["id"]],(f["x"]-base[f["id"]]["x"])/.1,(f["y"]-base[f["id"]]["y"])/.1) for f in chosen[2]["initialImpulses"]]
scale=30/max(np.hypot(x,y) for _,x,y in diff)
for p,x,y in diff:
    if np.hypot(x,y)>1e-7:
        axes[0].annotate("",xy=(p["x"]+x*scale,p["y"]+y*scale),xytext=(p["x"],p["y"]),arrowprops={"arrowstyle":"->","color":"#b74545","lw":.8})
axes[0].set_title("Initial extra exclusion forces\nCommon scale, max arrow 30 units",fontsize=9)
for r,color,label in zip(chosen,COLORS[1:],LABELS[1:]):
    axes[1].plot([0]+[p["step"] for p in r["startup"]],[r["initial"]["nonsharedDepthRms"]]+[p["nonsharedDepthRms"] for p in r["startup"]],color=color,label=label)
    axes[2].plot([0]+[p["batch"] for p in r["trace"]],[r["initial"]["contextDepthRms"]]+[p["contextDepthRms"] for p in r["trace"]],color=color,label=label)
axes[1].set(xlabel="Individual integration step",ylabel="Non-shared movable-focal depth RMS",title="First forty integrations")
axes[2].set(xlabel="Batch (10 integrations)",ylabel="Movable-context depth RMS",title="Full run: context clearing")
axes[1].set_ylim(bottom=0);axes[2].set_ylim(bottom=0)
for ax in axes[1:]:ax.grid(alpha=.15)
axes[2].legend(fontsize=7)
save(fig,"03-overlap-response","I3. First seed of the added cross-pressure fixture, all modes retained. Arrows subtract initial RFC-only impulses from overlap-mode impulses, before any integration, and normalize by rigidity; centroid reactions are included. Shared nodes are exempt from direct exclusion but may receive reactions. The existing RFC forces already clear the final non-shared overlap here. Additional exclusion mainly changes the initial response; these data do not establish a general overlap-quality improvement.")


def figlink(name,caption):
    return f'![{caption}](figures/{name}.svg)\n\n*{caption}* [PDF](figures/{name}.pdf) · [PNG](figures/{name}.png)\n\n'

single={r["mode"]:r for r in DATA["summary"] if r["name"]=="single-region"}
cluster={r["mode"]:r for r in DATA["summary"] if r["name"]=="cluster-regions"}
text=f"""# Experiment I: focal-region and overlap exclusion

**{len(DATA['results'])} matched runs; {DATA['failed']} failures.** Four synthetic cases × five fixed seeds × five modes. Each run observes all 4000 integrations, with global rigidity 0.1 from the first step and experimental local damping off. Initial coordinates, graph relations, pinned nodes and focal definitions are identical across modes; the runner audits {DATA['matchedStarts']} matched starts.

## Cases and controls

- **single-region:** a fixed four-branch focal tree and three movable context nodes. A pinned interior pressure anchor pulls context inward through ordinary relations; it cannot itself be expelled.
- **shared-foci:** two three-branch trees with one shared member and pinned roots. Non-shared branches initially enter foreign focal regions.
- **overlap-pressure:** retains that shared-foci graph and adds three ordinary relations: a root bridge and short cross-pressure links. This added stress case is retained alongside the simpler control; no seed is discarded. It still does not maintain final non-shared intrusion under the chosen RFC preset.
- **cluster-regions:** two square cliques sharing an edge, with ordinary boundary links and the same interior-pressure setup. The force regions are ellipses, distinct from the browser's rounded cluster enclosures.

**baseline** has plain TG forces; **rfc** reinforces the stored memberships with exclusion off; **context** adds exclusion but globally exempts focal members; **overlap** additionally excludes non-shared members from foreign regions; **strong** uses that full policy at strength 1 instead of 0.25. Padding is 20, coordinate weights (1,1), tree length 120 and the standard tree/cluster settings. No mode changes or deletes semantic relations. Identical hypothetical ellipses are measured from the current member coordinates in every mode, including TG/RFC controls.

## Results

Single-region mean movable-context penetration falls from **{single['rfc']['contextDepthRms']['mean']:.2f}** with RFC only to **{single['context']['contextDepthRms']['mean']:.2f}** at exclusion strength 0.25 and **{single['strong']['contextDepthRms']['mean']:.2f}** at strength 1. The fixed focal geometry keeps radius 140 in every mode. The pinned non-focal anchor remains an intruder in all runs; this is a deliberate feasibility limit, not a failed expulsion test.

Cluster-region mean penetration is **{cluster['rfc']['contextDepthRms']['mean']:.2f}** under RFC alone, **{cluster['overlap']['contextDepthRms']['mean']:.2f}** with the default exclusion setting, and **{cluster['strong']['contextDepthRms']['mean']:.2f}** with strength 1. Stronger exclusion is therefore not uniformly better in the finite-budget coupled layout. Common link error, region radii, tail motion and a final undamped force diagnostic are retained alongside occupancy.

"""
text+=figlink("01-exclusion-comparison","I1. Final context penetration, all-step non-shared exposure and common link error across every seed and condition.")
text+="The overlap rule has direct analytical/force tests, but these layouts provide limited comparative evidence for its added benefit: RFC alone already gives zero final movable non-shared intrusion. All-step exposure and first-forty-step records retain the small transient differences rather than claiming a final-quality improvement. Larger or differently constrained cases remain future evaluation.\n\n"
text+=figlink("02-exclusion-layouts","I2. Matched final layouts with fitted reference ellipses and explicit fixed/context/shared markers.")
text+=figlink("03-overlap-response","I3. Initial added force directions, individual startup steps and full-run context observations.")
text+="""## Measurements and limits

Penetration is `max(0, -regionClearance)` in weighted physical units, taking the greatest applicable foreign-region depth for each node. RMS includes zero-depth candidates, so the denominator is unchanged. Movable context, movable non-shared focal nodes and fixed intruders are separate. Shared members are exempt from their own regions; reactions from forces on other nodes may still move them. All-step exposure averages depth RMS over every integration, not ten-step net displacement. Tail motion uses the last hundred integrations. The final force probe clears momentum, prevents motion and evaluates existing callbacks, divided by global rigidity; it never changes saved coordinates or motion totals.

Fitted regions change with the layout. Radius and common focal-link error are therefore reported so apparent clearing cannot be assessed without its geometric cost. Region fitting measures point centers, and the drawings use straight physical relations; neither measures browser body/label collision, human readability, general convergence or large-graph performance. The approximate escape direction and refitted maximum radius are not a conservative energy gradient or a hard non-overlap constraint. Cooling and opposing context forces can retain penetration; fixed nodes cannot be expelled. See the [force contract](../../rfc-exclusion.md).

## Load and reproduce

Run `just rfc-exclusion-experiment` to rebuild records, all four native YAML inputs and the report/diagrams. `just rfc-exclusion-figures` redraws the existing records without rerunning layout. Python plotting requires Matplotlib/NumPy. [results.json](results.json) retains all conditions/failures, per-step startup observations, initial impulses and geometry; [summary.md](summary.md) gives complete condition means, with min/max in JSON. Exact replay is checked in the recorded Node/platform/architecture; other environments check repeated local runs.

The main browser offers **RFC → Focal-region exclusion**. Pause motion, load it, then under **Substructures** reinforce **A tree** followed by **B tree**. Open **RFC → Focal regions** and enable **Keep context outside focal regions**. Toggle the overlap option and adjust strength/padding; dashed outlines show the physical regions through the current lenses. Enable experimental damping separately if desired. To match the research force scale programmatically, set `panel.tgLayout.setRigidity(0.1)`; the ordinary TG API queues it until the next batch. The research runner primes it before measured motion. YAML stores geometry/membership, not these transient activation/settings.

Other native inputs: [single region](single-region.fm.yaml), [shared foci](shared-foci.fm.yaml), [overlap pressure](overlap-pressure.fm.yaml) and [cluster regions](cluster-regions.fm.yaml). All are synthetic. The [fixture/observer](../../../scripts/lib/rfc-exclusion-fixture.mjs), [runner](../../../scripts/rfc-exclusion-experiment.mjs) and [plot/report source](../../../scripts/rfc-exclusion-figures.py) define the reproducible protocol. Earlier experiments remain unchanged with exclusion disabled.
"""
(ROOT/"README.md").write_text(text)
print(f"Wrote three SVG/PDF/PNG diagrams and the exclusion report to {ROOT}")
