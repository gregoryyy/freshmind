#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
Draw Experiment J and write its report from recorded inputs, without rerunning layout.
"""
import csv
import json
import sys
import textwrap
from pathlib import Path
from statistics import mean

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/experiments/rfc-hybrid")
DATA = json.loads((ROOT / "results.json").read_text())
RUNS = [r for r in DATA["results"] if r["status"] == "ok"]
OUT = ROOT / "figures"
OUT.mkdir(parents=True, exist_ok=True)
FOCI = ["star", "stored-tree"]
VIEWS = list(DATA["views"])
LABELS = {"full": "Full", "aggregate": "Aggregate", "filter-person": "Hide person", "filter-authored": "Hide authored"}
COLORS = ["#687a90", "#2274a5", "#bc7430", "#29816b"]
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8, "axes.titlesize": 10,
                     "svg.hashsalt": "fm4-rfc-hybrid", "axes.spines.top": False, "axes.spines.right": False})


def select(focus, view, force, lens=0):
    return [r for r in RUNS if r["focus"] == focus and r["view"] == view
            and r["reinforcement"] == force and r["lens"] == lens]


def average(focus, view, force, field, lens=0):
    return mean(field(r) for r in select(focus, view, force, lens))


def save(fig, name, caption):
    fig.text(.035, .018, textwrap.fill(caption, 155), fontsize=7, va="bottom")
    for ext in ("svg", "pdf", "png"):
        metadata = {"Date": None} if ext == "svg" else {"CreationDate": None, "ModDate": None} if ext == "pdf" else None
        fig.savefig(OUT / f"{name}.{ext}", dpi=180, metadata=metadata)
    path = OUT / f"{name}.svg"
    path.write_text("\n".join(line.rstrip() for line in path.read_text().splitlines()) + "\n")
    plt.close(fig)


fig, axes = plt.subplots(2, 3, figsize=(12, 7.8))
fig.subplots_adjust(top=.87, bottom=.19, hspace=.45, wspace=.27)
fig.suptitle("J1. Full and reduced layouts scored on identical retained focal links", y=.98, fontsize=13)
for row, focus in enumerate(FOCI):
    for col, view in enumerate(VIEWS[1:]):
        ax = axes[row, col]
        for x, (force, scope) in enumerate(((False, "full"), (False, "view"), (True, "full"), (True, "view"))):
            values = [r["matched"][scope]["radialRms"] for r in select(focus, view, force)]
            ax.scatter(x + np.linspace(-.06, .06, len(values)), values, s=20, color=COLORS[x], alpha=.8)
            ax.vlines(x, min(values), max(values), color=COLORS[x], lw=1)
            ax.hlines(mean(values), x-.17, x+.17, color=COLORS[x], lw=2)
        r = select(focus, view, True)[0]
        count, nominal = r["final"]["radialCount"], len(r["inventory"]["nominalRadialIds"])
        ax.set(title=f"{focus}: {LABELS[view]}\n{count}/{nominal} focal links retained", ylabel="Common-link target RMS (units)")
        ax.set_xticks(range(4), ["TG full", "TG view", "RFC full", "RFC view"], rotation=25, ha="right")
        ax.set_ylim(bottom=0); ax.grid(alpha=.15); ax.set_axisbelow(True)
save(fig, "01-common-constraints", "J1. Five starts, 4000 integrations each, rigidity 0.1, local damping and exclusion off. Within each panel, the full layout and reduced view are measured on the same retained radial IDs and target 120. Points show every start, bars means and verticals min–max, not confidence intervals. Target subsets differ across panels; no all-graph quality ranking follows from their errors. Angular branch sets and changed degrees are recorded separately. Lens off/on gives exactly identical physical results.")


chosen = [select("stored-tree", view, True, lens)[0] for lens in (0, 60) for view in VIEWS]
points = [p for r in chosen for p in r["final"]["displayNodes"]]
limits = [(min(p[c] for p in points)-45, max(p[c] for p in points)+45) for c in ("x", "y")]
fig, axes = plt.subplots(2, 4, figsize=(13, 7.8))
fig.subplots_adjust(top=.88, bottom=.19, hspace=.28, wspace=.15)
fig.suptitle("J2. Stored focal detail, structural rules and a separate viewing lens", y=.98, fontsize=13)
short = {"project-a": "A", "project-b": "B", "alpha": "Alpha", "beta": "Beta", "shared": "Shared"}
for ax, r in zip(axes.flat, chosen):
    points = {p["id"]: p for p in r["final"]["displayNodes"]}
    focal = set(r["inventory"]["retainedMemberIds"])
    radial = set(r["inventory"]["retainedRadialIds"])
    for e in r["edges"]:
        if e["id"] not in r["inventory"]["edgeIds"]: continue
        a, b = points[e["from"]], points[e["to"]]
        ax.plot([a["x"], b["x"]], [a["y"], b["y"]], lw=1.3 if e["id"] in radial else .8,
                color=COLORS[2] if e["id"] in radial else "#a5a5a5", zorder=1)
    for id, p in points.items():
        ax.scatter(p["x"], p["y"], s=28, color=COLORS[2] if id in focal else COLORS[0], zorder=3)
        if id in short:
            offset = (-2, -14) if id == "shared" else (7, 15) if id == "beta" else (7, 5)
            ax.annotate(short[id], (p["x"], p["y"]), xytext=offset, textcoords="offset points", fontsize=7,
                        ha="center" if id == "shared" else "left")
    grouped = {}
    for g in r["inventory"]["groups"]:
        grouped.setdefault(g["parentId"], []).append(f'+{g["type"]}: {len(g["nodeIds"])}')
    for id, labels in grouped.items():
        p = points[id]
        ax.annotate("\n".join(labels), (p["x"], p["y"]), xytext=(16, 26) if id == "project-b" else (16, -16),
                    textcoords="offset points", va="top", fontsize=6, color=COLORS[3],
                    bbox={"facecolor": "white", "edgecolor": "none", "alpha": .9, "pad": 1.5},
                    arrowprops={"arrowstyle": "-", "color": COLORS[3], "lw": .5})
    ax.set(xlim=limits[0], ylim=limits[1], xlabel="Displayed x", ylabel="Displayed y",
           title=f'{LABELS[r["view"]]}, lens {r["lens"]}\n{len(points)} nodes / {len(r["inventory"]["edgeIds"])} relations')
    ax.invert_yaxis(); ax.set_aspect("equal"); ax.tick_params(labelsize=6); ax.grid(alpha=.12)
save(fig, "02-hybrid-layouts", "J2. First seed 0x1234abcd, stored A detail with RFC. All panels share displayed axes, unit spacing/canvas scale and the moving A lens origin. The two rows have identical physical coordinates; only HyperLens strength changes. Orange denotes retained focal members/links, gray context and green typed aggregation counts. Hidden people can remove focal constraints despite protection. Hiding authored relations keeps their paper endpoints visible and isolated. These point/straight-edge drawings omit browser bodies and routed labels; they are synthetic mechanism examples, not reproductions of the 2005 figures.")


fig, axes = plt.subplots(2, 3, figsize=(12.5, 7.8))
fig.subplots_adjust(top=.86, bottom=.19, hspace=.45, wspace=.3)
fig.suptitle("J3. Lens separation, remaining net force and transient movement", y=.98, fontsize=13)
for row, focus in enumerate(FOCI):
    for col in range(3):
        ax = axes[row, col]
        conditions = [(False, 0), (False, 60), (True, 0), (True, 60)] if col == 0 else [(False, 0), (True, 0)]
        for index, (force, lens) in enumerate(conditions):
            color = COLORS[index] if col == 0 else COLORS[2 if force else 0]
            x = np.arange(len(VIEWS)) + (index-(len(conditions)-1)/2)*.11
            field = (lambda r: r["final"]["displayed"]["minDistance"]) if col == 0 else (lambda r: r["unitRigidityForceRms"]) if col == 1 else (lambda r: r["largeSteps"])
            values = [[field(r) for r in select(focus, view, force, lens)] for view in VIEWS]
            label = ("RFC" if force else "TG") + (f" + lens {lens}" if col == 0 else "")
            ax.errorbar(x, [mean(v) for v in values],
                        yerr=[[mean(v)-min(v) for v in values], [max(v)-mean(v) for v in values]],
                        color=color, marker="o", ms=3, lw=1, capsize=2, label=label)
        ax.set_xticks(range(len(VIEWS)), [LABELS[v] for v in VIEWS], rotation=25, ha="right")
        ax.set(title=focus, ylabel=("Min displayed point separation", "Final force RMS / rigidity", "Steps with displacement >29.9")[col])
        if col == 1: ax.set_yscale("symlog", linthresh=.005)
        ax.set_ylim(bottom=0); ax.grid(alpha=.15); ax.set_axisbelow(True)
        if row == 0: ax.legend(fontsize=6, frameon=False)
save(fig, "03-display-force-motion", "J3. Means and min–max across five starts; physical metrics use lens-zero runs once, while the left column includes both lens twins. Point separation is measured on each visible view, with node/edge/pair denominators in the report; it is not a readability score or a common-subset ranking. All runs have zero last-100-step motion after TG global cooling, yet force imbalance remains, especially when authored-link filtering leaves four isolated paper nodes. Large steps are counted over every integration and are distinct from per-axis clipping. Sparse straight-line and close-pair proxies are zero at the end of every condition here and cannot discriminate quality.")


rows = []
for r in RUNS:
    row = {k: r[k] for k in ("focus", "view", "seed", "reinforcement", "lens", "sampledSteps", "largeSteps", "clippedSteps", "tailStepRms", "unitRigidityForceRms")}
    row.update(nodes=len(r["inventory"]["nodeIds"]), edges=len(r["inventory"]["edgeIds"]),
               nominalRadial=len(r["inventory"]["nominalRadialIds"]), retainedRadial=r["final"]["radialCount"],
               commonFullRadialRms=r["matched"]["full"]["radialRms"], viewRadialRms=r["final"]["radialRms"],
               commonFullAngularRms=r["matched"]["full"]["angularRms"], viewAngularRms=r["final"]["angularRms"])
    row.update(r["final"]["displayed"])
    rows.append(row)
with (ROOT / "runs.csv").open("w", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(rows[0]), lineterminator="\n"); writer.writeheader(); writer.writerows(rows)

inventory_table = "| Focus | Rule | Nodes / relations | Aggregated | Filtered nodes / relations | Focal links retained | Focal members retained | Angular degrees, source → view |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |\n"
for focus in FOCI:
    for view in VIEWS:
        r = select(focus, view, True)[0]; inv = r["inventory"]
        degree = lambda stars: ", ".join(f'{s["center"]}: {len(s["branches"])}' for s in stars) or "none"
        inventory_table += f'| {focus} | {LABELS[view]} | {len(inv["nodeIds"])} / {len(inv["edgeIds"])} | {len(inv["aggregatedNodeIds"])} | {len(inv["filteredNodeIds"])} / {len(inv["filteredEdgeIds"])} | {len(inv["retainedRadialIds"])}/{len(inv["nominalRadialIds"])} | {len(inv["retainedMemberIds"])}/{len(inv["nominalMemberIds"])} | {degree(inv["nominalStars"])} → {degree(inv["retainedStars"])} |\n'

physical_table = "| Focus | Rule | Force | Common full radial RMS | View radial RMS | Common full angular RMS | View angular RMS | Large steps | Final force / rigidity |\n| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |\n"
range_value = lambda values: f"{mean(values):.3f} [{min(values):.3f}, {max(values):.3f}]"
for focus in FOCI:
    for view in VIEWS:
        for force in (False, True):
            group = select(focus, view, force)
            values = [[r["matched"][scope][field] for r in group] for scope, field in
                      (("full", "radialRms"), ("view", "radialRms"), ("full", "angularRms"), ("view", "angularRms"))]
            values += [[r[field] for r in group] for field in ("largeSteps", "unitRigidityForceRms")]
            physical_table += f'| {focus} | {LABELS[view]} | {"RFC" if force else "TG"} | ' + " | ".join(range_value(v) for v in values) + " |\n"

display_table = "| Focus | Rule | Force | Lens | Visible point pairs / disjoint edge pairs | Min displayed separation |\n| --- | --- | --- | ---: | ---: | ---: |\n"
for focus in FOCI:
    for view in VIEWS:
        for force in (False, True):
            for lens in (0, 60):
                group = select(focus, view, force, lens); d = group[0]["final"]["displayed"]
                display_table += f'| {focus} | {LABELS[view]} | {"RFC" if force else "TG"} | {lens} | {d["pairCount"]} / {d["crossingCandidates"]} | {range_value([r["final"]["displayed"]["minDistance"] for r in group])} |\n'

(ROOT / "summary.md").write_text("# Hybrid comparison: complete condition tables\n\nMeans [min, max] across all five starts, not confidence intervals. Physical lens twins are counted once. Angular errors are radians. Each full/view pair uses the same retained constraint set; subsets differ between rules.\n\n" + inventory_table + "\n" + physical_table + "\n" + display_table)

number = lambda focus, view, force, field, lens=0: f"{average(focus, view, force, field, lens):.2f}"
star_full = number("star", "full", True, lambda r: r["final"]["radialRms"])
star_aggregate = number("star", "aggregate", True, lambda r: r["final"]["radialRms"])
tree_full = number("stored-tree", "aggregate", True, lambda r: r["matched"]["full"]["radialRms"])
tree_aggregate = number("stored-tree", "aggregate", True, lambda r: r["final"]["radialRms"])
force_full = f'{average("stored-tree", "full", True, lambda r: r["unitRigidityForceRms"]):.3f}'
force_filtered = f'{average("stored-tree", "filter-authored", True, lambda r: r["unitRigidityForceRms"]):.3f}'
report = f"""# Experiment J: matched hybrid focus + context

Task **3.4.2**, 24 October 2026. This compares reversible structural rules with TG, RFC and the viewing lens on the existing synthetic typed example. It completes the planned hybrid comparison; reproducing the 2005 paper's figures is outside the agreed scope.

## Reproduce and inspect

```sh
just rfc-hybrid-experiment
just rfc-hybrid-figures  # Redraw/report from recorded JSON only.
```

The first recipe builds the library, runs all 160 conditions and generates this report, the tables, CSV, native input and three SVG/PDF/PNG figures. Python 3 with matplotlib/numpy is needed for drawing. The [protocol]({{protocol}}) uses production structural/RFC controllers; [the runner]({{runner}}) declares and audits the matrix. [results.json](results.json) includes every condition and runtime, all starting/final coordinates, complete semantic topology and stored definitions, settings, visible/filtered/aggregated IDs, typed groups, nominal/retained constraints, traces and common-subset scores. [runs.csv](runs.csv) and [complete mean/range tables](summary.md) expose all conditions and denominators. There are **{DATA['failed']} failed runs**.

Load **RFC → Structural focus + context** in the browser for the unjittered graph, or open [matched-start.fm.yaml](matched-start.fm.yaml) for the first recorded start. Pause before comparing membership. Choose the Project A star, or reinforce **A: stored detail**. In **Structural focus + context**, choose Person and Paper for aggregation, hide Person nodes, or hide Authored relations as separate conditions. Enable rules with detail radius 1. RFC uses the tree preset; the lens is 0 or 60, graph/canvas scale one and pan/rotation zero. Native YAML preserves the complete graph and definitions, while rules/RFC activation are transient. Browser layout timing and its coincidence RNG are interactive; the headless recipe specifies exact batch counts, initial rigidity and seeded randomness for replay. The matched TG controls deliberately retain the nominated RFC detail even with the added force omitted; simply switching RFC off in the browser also releases that protection and is a different condition.

## Protocol and retained detail

The declared matrix is **two focal structures × four structural views × TG/RFC × lens off/on × five starts = 160 runs**. Every run retains the same 13-node/13-relation complete graph, two saved trees and unit/default importance. Starts jitter the documented coordinates by ±20 units per axis with five fixed seeds. Each layout receives 400 batches of ten integrations with rigidity 0.1 active from the first measured step. Local experimental damping and focal-region exclusion are off; ordinary TG global cooling remains on. Every actual integration is observed, including the tenth step of each batch. The force probe clears momentum and stops global movement at the final coordinates; it is excluded from observations.

TG controls use the same source-based focal protection as RFC controls, while omitting the RFC force callback. This holds membership constant when testing the force factor. Explicit filters still take precedence. All **{DATA['lensPairs']} lens pairs have exactly identical physical coordinates, motion traces and final force diagnostics**. All {DATA['matchedMemberships']} TG/RFC membership pairs match. Five common starting states are shared across every condition. Hidden nodes receive no integration and remain at their stored coordinates; they do not follow moving parents or supply aggregate mass/repulsion.

{inventory_table}
Aggregation is a conservative leaf pass: the shared collaborator remains a bridge. Nominated focal detail remains visible. Filtering Person explicitly removes Alice/Amir and other people even when they are focal members. Filtering Authored keeps every node but drops four attachment relations; the four paper nodes become isolated and remain visible. Complete graph data and saved membership IDs are preserved in all cases.

For each rule, the full control and reduced layout are evaluated on **the same retained radial edge IDs, angular branch sets, visible node pairs and semantic edges**. These subsets and their denominators are recorded; hidden frozen coordinates never enter the scores. Radial error uses the added RFC target of 120; the ordinary TG length parameter 90 is an attraction denominator, not a rest length. Angular RMS uses equal gaps for the retained degree. If filtering changes that degree, the common-subset score on the full layout differs from its original full-star objective. It is a comparison on a defined subset, not a claim that deleted constraints were satisfied. The complete tables retain both nominal and retained branch sets.

## Results

![Common retained-constraint comparisons](figures/01-common-constraints.png)

RFC has lower retained focal-length error than TG in these conditions. Aggregating seven context leaves around the star changes mean RFC error from **{star_full} to {star_aggregate}**, retaining all three focal links. For the stored tree, aggregation keeps all five focal links but removes four context leaves; mean error changes only **{tree_full} → {tree_aggregate}**. Neither result establishes a general benefit of reduction. Node or relation filtering removes two of the stored tree's five focal links and changes angular degrees. Figure J1 and the tables compare each full control on exactly the remaining subset, instead of comparing incompatible all-link scores.

![Recorded hybrid views with and without the lens](figures/02-hybrid-layouts.png)

The lens changes only displayed point positions. It does not regularize physical focal geometry or alter the force/motion results. Minimum displayed point separation can increase or decrease, depending on spatial allocation. All final conditions have zero point pairs below 30 and zero proper intersections of nonincident straight semantic edges, so those sparse proxies do not discriminate quality here. The tables record pair/intersection denominators and minimum separation, including lens twins. Figure J2 uses shared displayed axes without per-panel fitting, and draws typed counts separately from retained focal links.

![Display, force and motion observations](figures/03-display-force-motion.png)

Every condition has zero motion over its final 100 integrations after global cooling. Remaining net force is not necessarily zero: for stored-tree RFC, the mean unit-rigidity force diagnostic is **{force_full}** with all relations and **{force_filtered}** after authored-link filtering. Removing those links leaves four isolated repelling papers. A cooled, motionless graph is not evidence of force equilibrium or convergence. Some RFC starts contain transient movements above 29.9 units, despite the low rigidity; all starts and per-axis clipping counts remain in the records.

## Limits

This is one small synthetic semantic graph, two nominated focal structures and five jittered starts, not a dataset population or human evaluation. It isolates discrete membership, reinforcement and display transforms. It does not test changing rules during motion, recursive/community aggregation, aggregate-force roll-up, inferred type priorities, multiple simultaneous RFC centers, exclusion/damping interactions or large-graph performance. Explicit filtering may discard useful detail; typed aggregation counts do not preserve its physical effect. Common-subset errors cannot quantify the value of omitted information. Point centers and straight segments omit browser body/label extents, routed curves and picking. Neither lower target error nor zero point-proxy conflicts establishes readability, perceptual benefit or general convergence.
"""
report = report.replace("{protocol}", "../../../scripts/lib/rfc-hybrid-fixture.mjs").replace("{runner}", "../../../scripts/rfc-hybrid-experiment.mjs")
(ROOT / "README.md").write_text(report)
print(f"Wrote three hybrid diagrams, report, condition tables and CSV in {ROOT}")
