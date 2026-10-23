#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
Draw the recorded RFC follow-up comparisons; no layout simulation or retuning.
"""
import json
import sys
import textwrap
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Polygon
import numpy as np

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/experiments/rfc-followup")
OUT = ROOT / "figures"
OUT.mkdir(parents=True, exist_ok=True)
DATA = {f: json.loads((ROOT / f / "results.json").read_text()) for f in ("damping", "weights", "clusters")}
RUNS = {f: [r for r in d["results"] if r["status"] == "ok"] for f, d in DATA.items()}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8, "axes.titlesize": 10,
                     "svg.hashsalt": "fm4-rfc-followup", "axes.spines.top": False, "axes.spines.right": False})
COLORS = ["#63758d", "#b96720", "#138575", "#8b5ea6"]
LABELS = {"baseline": "TouchGraph", "both": "RFC, damping off", "damped": "RFC + damping"}


def select(family, **conditions):
    return [r for r in RUNS[family] if all(r.get(k) == v for k, v in conditions.items())]


def value(run, field):
    return run.get(field, run["final"].get(field))


def style(ax):
    ax.grid(alpha=.15)
    ax.set_axisbelow(True)


def save(fig, name, caption):
    fig.text(.035, .02, textwrap.fill(caption, 155), fontsize=7, va="bottom")
    fig.savefig(OUT / f"{name}.svg", metadata={"Date": None})
    path = OUT / f"{name}.svg"
    path.write_text("\n".join(line.rstrip() for line in path.read_text().splitlines()) + "\n")
    fig.savefig(OUT / f"{name}.pdf", metadata={"CreationDate": None, "ModDate": None})
    fig.savefig(OUT / f"{name}.png", dpi=180)
    plt.close(fig)


def distribution(ax, x, values, color, marker="o", floor=None):
    values = np.asarray(values)
    if floor is not None:
        values = np.maximum(floor, values)
    ax.vlines(x, values.min(), values.max(), color=color, lw=1, alpha=.65)
    ax.scatter(x + np.linspace(-.018, .018, len(values)), values, s=16, color=color, marker=marker, alpha=.75)
    return float(np.mean(values))


def damping_sweep():
    fig, axes = plt.subplots(2, 3, figsize=(12, 7.2))
    fig.subplots_adjust(top=.86, bottom=.18, hspace=.38, wspace=.32)
    fig.suptitle("F1. Lower rigidity versus adaptive damping: leaf-linked trees", y=.98, fontsize=13)
    for row, fixed in enumerate((False, True)):
        for col, field in enumerate(("largeSteps", "lengthRms", "unitRigidityForceRms")):
            ax = axes[row, col]
            for enabled, color in ((False, COLORS[1]), (True, COLORS[2])):
                means = []
                for x, rigidity in enumerate((.1, .25, .5, 1)):
                    runs = select("damping", topology="leaf-connected-trees", fixedRoots=fixed, rigidity=rigidity, damping=enabled)
                    means.append(distribution(ax, x + (.07 if enabled else -.07), [value(r, field) for r in runs], color,
                                              floor=1e-6 if col == 2 else None))
                ax.plot(np.arange(4) + (.07 if enabled else -.07), means, color=color, label="Damping on" if enabled else "Damping off")
            ax.set_xticks(range(4), ["0.1", "0.25", "0.5", "1"])
            ax.set(xlabel="Global rigidity", ylabel=("Large-step count", "Final common length RMS", "Final unit-rigidity force RMS")[col],
                   title=("Pinned roots" if fixed else "Movable roots"))
            if col == 0:
                ax.set_yscale("symlog", linthresh=1)
                ax.set_ylim(bottom=0)
            if col == 2:
                ax.set_yscale("log")
            if row == col == 0:
                ax.legend(fontsize=7)
            style(ax)
    save(fig, "01-damping-rigidity", "F1. Five identical seeded starts per condition, 4000 integrations. Points are individual starts, lines are means and verticals span min–max, not confidence intervals. Lower rigidity changes all force magnitudes from the first integration. Force is probed without momentum/local attenuation and divided by rigidity; values below 1e-6 are floored for display. Quiet motion does not imply force balance or accurate lengths.")


def hull(points):
    points = sorted(set(points))
    if len(points) < 3:
        return points
    def half(seq):
        out = []
        for p in seq:
            while len(out) > 1 and np.cross(np.subtract(out[-1], out[-2]), np.subtract(p, out[-2])) <= 0:
                out.pop()
            out.append(p)
        return out
    return half(points)[:-1] + half(points[::-1])[:-1]


def graph(ax, run, bounds, encode_weights=False):
    nodes = {n["id"]: n for n in run["nodes"]}
    communities = run.get("communities") or run["structures"]
    for index, c in enumerate(communities):
        polygon = hull([(nodes[n]["x"], nodes[n]["y"]) for n in c["nodeIds"]])
        if len(polygon) >= 3:
            ax.add_patch(Polygon(polygon, color=(COLORS[2], COLORS[3])[index % 2], alpha=.07, zorder=0))
    active = {e for c in run["activeCenters"] for e in c["edgeIds"]}
    roots = {s["rootId"] for s in run["structures"]}
    for e in run["edges"]:
        a, b = nodes[e["from"]], nodes[e["to"]]
        factor = 2 * e["weight"] / (e["weight"] + 10)
        ax.plot([a["x"], b["x"]], [a["y"], b["y"]], color=COLORS[1] if e["id"] in active else "#8a8a8a",
                lw=.35 + 1.2 * factor if encode_weights else 1, ls=":" if e["weight"] == 0 else "-", zorder=1)
    for id, n in nodes.items():
        factor = 2 * n["weight"] / (n["weight"] + 1)
        special = encode_weights and id in ("a1", "b1")
        color = COLORS[1] if id in roots else COLORS[3] if sum(id in c["nodeIds"] for c in communities) > 1 else COLORS[2]
        ax.scatter(n["x"], n["y"], marker="s" if n["fixed"] else "o", s=12 + 20 * factor if encode_weights else 25,
                   facecolor="white" if n["weight"] == 0 else color, edgecolor="#222222" if special else color, zorder=3)
        if id in roots or special:
            label = f'{id}: w={n["weight"]:g}' if special else id
            ax.annotate(label, (n["x"], n["y"]), xytext=(3, 5), textcoords="offset points", fontsize=6)
    ax.set(xlim=bounds[0], ylim=bounds[1], xlabel="Physical x", ylabel="Physical y")
    ax.set_aspect("equal", adjustable="box")
    ax.tick_params(labelsize=6)
    style(ax)


def bounds(runs):
    return [(min(n[c] for r in runs for n in r["nodes"]) - 45, max(n[c] for r in runs for n in r["nodes"]) + 45) for c in ("x", "y")]


def shared_layouts():
    conditions = [(1, False), (.25, False), (1, True), (.25, True)]
    selected = [select("damping", topology="shared-subtree", fixedRoots=True, seed=0x9e3779b9, rigidity=q, damping=d)[0] for q, d in conditions]
    fig = plt.figure(figsize=(12, 7))
    outer = fig.add_gridspec(2, 1, top=.87, bottom=.19, hspace=.42)
    top, bottom = outer[0].subgridspec(1, 4, wspace=.4), outer[1].subgridspec(1, 3, wspace=.3)
    fig.suptitle("F2. Pinned shared subtree: balance and infeasible lengths", y=.98, fontsize=13)
    for i, r in enumerate(selected):
        ax = fig.add_subplot(top[i]);graph(ax, r, bounds(selected))
        ax.set_title(f'Rigidity {r["rigidity"]}, damping {"on" if r["damping"] else "off"}\nLength {r["final"]["lengthRms"]:.2f}; force {r["unitRigidityForceRms"]:.3g}', fontsize=8)
    for col, field in enumerate(("maxDisplacement", "lengthRms", "gain")):
        ax = fig.add_subplot(bottom[col])
        for color, r in zip(COLORS, selected):
            ax.plot([t["timeMs"]/1000 for t in r["trace"]], [t[field] for t in r["trace"]], color=color,
                    label=f'q={r["rigidity"]}, {"on" if r["damping"] else "off"}')
        if field == "lengthRms":
            ax.axhline(selected[0]["final"]["lengthLowerBound"], color="black", ls=":", label="Feasibility lower bound")
        if field == "maxDisplacement":
            ax.set_yscale("symlog", linthresh=.1)
            ax.set_ylim(bottom=0)
        if field == "gain":
            ax.set_yscale("log");ax.legend(fontsize=6)
        ax.set(xlabel="Virtual time (seconds)", ylabel={"maxDisplacement": "Actual step (batch max)", "lengthRms": "Common length RMS", "gain": "Local gain"}[field]);style(ax)
    save(fig, "02-shared-subtree", "F2. Recorded seed 0x9e3779b9; fixed roots are squares, shared members purple. All final panels share physical axes. Shading denotes membership; orange lines are active constraints. The pinned root distance prevents all targets being satisfied. A near-zero undamped force can coexist with length error. Traces sample selected batches; the force labels are separate final-coordinate probes.")


def weight_sweep():
    profiles = ["neutral", "nodes", "edges", "coupled", "saturated", "extreme", "epsilon", "zero"]
    labels = ["Neutral", "Node 9", "Edge 30", "Both", "10⁶", "10¹²", "ε", "Zero"]
    fig, axes = plt.subplots(2, 3, figsize=(12.5, 7.5))
    fig.subplots_adjust(top=.86, bottom=.2, hspace=.48, wspace=.3)
    fig.suptitle("F3. Nonuniform node and link importance", y=.98, fontsize=13)
    for row, topology in enumerate(("joined-trees", "leaf-connected-trees")):
        for col, field in enumerate(("priorityLengthRms", "lengthRms", "largeSteps")):
            ax = axes[row, col]
            for mode, color in zip(("baseline", "both", "damped"), COLORS):
                means = []
                for x, profile in enumerate(profiles):
                    rs = select("weights", topology=topology, mode=mode, profile=profile)
                    means.append(distribution(ax, x, [value(r, field) for r in rs], color))
                ax.plot(range(len(profiles)), means, color=color, label=LABELS[mode])
            ax.set_xticks(range(len(profiles)), labels, rotation=35, ha="right", fontsize=7)
            ax.set(title=topology, ylabel=("Selected weighted-sector length RMS", "Common length RMS (all tree links)", "Large-step count")[col])
            if col == 2:
                ax.set_yscale("symlog", linthresh=1)
                ax.set_ylim(bottom=0)
            if row == col == 0:
                ax.legend(fontsize=6)
            style(ax)
    save(fig, "03-weight-sweep", "F3. Five movable-root starts per profile and mode. Weighted nodes are a1/b1; weighted relations are a0:a1/b0:b1. The two length columns keep the same links in their denominators, including disabled links. Only priority, not geometry targets, changes. ε is 1e-6; large weights saturate the force mapping but need not give identical trajectories in a nonlinear clipped/cooling layout. Grey baselines coincide across profiles by exact coordinate audit.")


def weight_transitions():
    fig, axes = plt.subplots(2, 2, figsize=(11, 7.3))
    fig.subplots_adjust(top=.88, bottom=.18, hspace=.34, wspace=.28)
    fig.suptitle("F4. Zero transitions and a matched wake-only control", y=.98, fontsize=13)
    conditions = [("transition", "both"), ("transition", "damped"), ("sham", "both"), ("sham", "damped")]
    for ax, field in zip(axes.flat, ("lengthRms", "eligibleEdges", "maxDisplacement", "gain")):
        for color, (profile, mode) in zip(COLORS, conditions):
            r = select("weights", topology="leaf-connected-trees", seed=0xdecafbad, profile=profile, mode=mode)[0]
            points = [(t["timeMs"]/1000, t[field]) for t in r["trace"]]
            if field == "eligibleEdges":
                points += [(t["timeMs"]/1000, t["after"]["metrics"][field]) for t in r["transitions"]]
                points.sort(key=lambda p: p[0])
                ax.step(*zip(*points), where="post", color=color, ls="--" if profile == "sham" else "-",
                        label=f'{profile}, {"damping on" if mode == "damped" else "damping off"}')
            else:
                ax.plot(*zip(*points), color=color, ls="--" if profile == "sham" else "-",
                        label=f'{profile}, {"damping on" if mode == "damped" else "damping off"}')
        for x in (2, 4):
            ax.axvline(x, color="black", ls=":", lw=.8)
        ax.set(xlabel="Virtual time (seconds)", ylabel={"lengthRms": "Common length RMS", "eligibleEdges": "Positive-strength tree links", "maxDisplacement": "Actual step (batch max)", "gain": "Local gain"}[field])
        if field == "maxDisplacement":
            ax.set_yscale("symlog", linthresh=.1)
            ax.set_ylim(bottom=0)
        if field == "gain":
            ax.set_yscale("log")
        style(ax)
    axes[0, 0].legend(fontsize=7)
    axes[0, 1].set_title("Neutral → zero at 2 s → ε at 4 s", fontsize=10)
    save(fig, "04-weight-transitions", "F4. Seed 0xdecafbad, movable leaf-linked trees. Weights change only after batches 100 and 200; both events wake global cooling. The sham keeps neutral weights with identical wakes, isolating weight changes from reheating. Positive ε restores branch participation even when its force is tiny. The membership plot includes exact change events; movement/gain are sampled batches. All integration steps contribute to totals.")


def weight_layouts():
    profiles = ["neutral", "coupled", "zero", "epsilon"]
    selected = [select("weights", topology="leaf-connected-trees", seed=0xdecafbad, profile=p, mode="damped")[0] for p in profiles]
    fig, axes = plt.subplots(1, 4, figsize=(13, 4.8))
    fig.subplots_adjust(top=.8, bottom=.28, wspace=.35)
    fig.suptitle("F5. Weight-encoded final layouts: the same graph and start", y=.97, fontsize=13)
    for ax, r in zip(axes, selected):
        graph(ax, r, bounds(selected), encode_weights=True)
        profile = DATA["weights"]["weightProfiles"][r["profile"]]
        ax.set_title(f'{r["profile"]}: node {profile["node"]:g}, edge {profile["edge"]:g}\nCommon length RMS {r["final"]["lengthRms"]:.2f}', fontsize=8)
    save(fig, "05-weight-layouts", "F5. All panels use damping and shared physical axes; seed 0xdecafbad. Node area and edge width encode bounded importance, not mass. Weighted members a1/b1 are labelled; zero nodes are hollow and zero links dotted. Orange edges show actual active reinforcement; the remaining graph is retained. Membership shading is a physical hull, not the browser renderer. This visual encoding is for the report and does not change browser node sizing.")


CLUSTER_CONDITIONS = [("baseline", None, False), ("tree", None, False), ("cluster", 0, False), ("cluster", .25, False),
                      ("cluster", 1, False), ("cluster", 2, False), ("cluster", 1, True), ("cluster", 2, True)]
CLUSTER_LABELS = ["TG", "Tree", "C0", "C.25", "C1", "C2", "C1+d", "C2+d"]


def cluster_sweep():
    fig, axes = plt.subplots(3, 3, figsize=(12, 9.5))
    fig.subplots_adjust(top=.9, bottom=.16, hspace=.45, wspace=.3)
    fig.suptitle("F6. Cluster rigidity, external load and dynamic cost", y=.98, fontsize=13)
    for row, topology in enumerate(("dense-squares", "overlapping-squares", "sparse-rings")):
        for col, field in enumerate(("deformationRms", "largeSteps", "unitRigidityForceRms")):
            ax = axes[row, col]
            for load, color in (("weak", COLORS[0]), ("strong", COLORS[1])):
                means = []
                for x, (mode, rigidity, damping) in enumerate(CLUSTER_CONDITIONS):
                    rs = select("clusters", topology=topology, load=load, mode=mode, damping=damping)
                    rs = [r for r in rs if r.get("clusterRigidity") == rigidity]
                    means.append(distribution(ax, x, [value(r, field) for r in rs], color, floor=1e-6 if col == 2 else None))
                ax.plot(range(8), means, color=color, label=f"{load.capitalize()} load")
            ax.set_xticks(range(8), CLUSTER_LABELS, rotation=35, ha="right", fontsize=7)
            ax.set(title=topology, ylabel=("All-pairs deformation RMS", "Large-step count", "Unit-rigidity force RMS")[col])
            if col == 1:
                ax.set_yscale("symlog", linthresh=1)
                ax.set_ylim(bottom=0)
            if col == 2:
                ax.set_yscale("log")
            if row == col == 0:
                ax.legend(fontsize=7)
            style(ax)
    save(fig, "06-cluster-sweep", "F6. Five matched starts per topology/load/condition. C is cluster rigidity; +d enables adaptive damping. C0 retains soft caps and compactness. Tree projection uses perimeter edges at target 120; every semantic relation remains in every simulation. All-pairs deformation uses the same unjittered shape, including unconstrained pairs. High stiffness can reduce link error while worsening sparse-shape preservation. Force values below 1e-6 are floored for display.")


def cluster_layouts():
    fig, axes = plt.subplots(2, 4, figsize=(13, 7))
    fig.subplots_adjust(top=.89, bottom=.18, hspace=.35, wspace=.35)
    fig.suptitle("F7. Dense and overlapping clusters under strong boundary load", y=.98, fontsize=13)
    for row, topology in enumerate(("dense-squares", "overlapping-squares")):
        selected = []
        for mode, rigidity, damping in [("baseline", None, False), ("tree", None, False), ("cluster", 2, False), ("cluster", 2, True)]:
            rs = select("clusters", topology=topology, load="strong", seed=DATA["clusters"]["seeds"][0], mode=mode, damping=damping)
            selected.append(next(r for r in rs if r.get("clusterRigidity") == rigidity))
        for ax, r, title in zip(axes[row], selected, ("TouchGraph", "Perimeter tree", "Cluster rigidity 2", "Cluster 2 + damping")):
            graph(ax, r, bounds(selected))
            ax.set_title(f'{title}\nDeformation {r["final"]["deformationRms"]:.1f}', fontsize=8)
    save(fig, "07-cluster-layouts", "F7. First declared seed 0x1234abcd; upper row disjoint cliques, lower row cliques sharing two members. Final axes match within each row. Squares are pinned context anchors. Convex shading denotes the same memberships in every condition, independently of activation. Cluster reinforcement retains diagonals and shared links; tree projection retains them as ordinary context. Straight physical geometry, not a browser screenshot or measured label layout.")


def cluster_extent():
    fig, axes = plt.subplots(2, 3, figsize=(12.5, 7))
    fig.subplots_adjust(top=.88, bottom=.19, hspace=.35, wspace=.3)
    fig.suptitle("F8. Extent and overlap do not establish readability", y=.98, fontsize=13)
    for col, topology in enumerate(("dense-squares", "overlapping-squares", "sparse-rings")):
        for x, (mode, rigidity, damping) in enumerate(CLUSTER_CONDITIONS):
            rs = [r for r in select("clusters", topology=topology, load="strong", mode=mode, damping=damping) if r.get("clusterRigidity") == rigidity]
            distribution(axes[0, col], x, [np.mean([c["extentRms"] for c in r["final"]["perCommunity"]]) for r in rs], COLORS[2])
            distribution(axes[1, col], x, [r["final"]["overlapArea"] for r in rs], COLORS[3])
        for row in range(2):
            ax = axes[row, col];ax.set_xticks(range(8), CLUSTER_LABELS, rotation=35, ha="right", fontsize=7);style(ax)
        axes[0, col].set(title=topology, ylabel="Mean community extent RMS")
        axes[1, col].set(ylabel="Physical hull intersection area")
        axes[1, col].set_yscale("symlog", linthresh=1)
        axes[1, col].set_ylim(0, 10000)
    save(fig, "08-cluster-extent", "F8. Strong load, all five starts. Extent is the RMS member radius about each unweighted physical centroid, then averaged across communities. Overlap is convex member-center intersection area; shared nodes/edges may have zero intersection area. These are geometric observations, not the displayed rounded enclosure or an implemented exclusion force. Crossings and near-node counts are retained separately; no label-collision or human-readability claim.")


damping_sweep()
shared_layouts()
weight_sweep()
weight_transitions()
weight_layouts()
cluster_sweep()
cluster_layouts()
cluster_extent()
print(f"Wrote eight SVG/PDF/PNG follow-up diagrams to {OUT}")
