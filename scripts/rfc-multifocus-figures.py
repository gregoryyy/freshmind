#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
Draw recorded tree-only multiple-focus experiments; no new layout simulation.
"""
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/papers/figures/rfc"
REPORT = json.loads((ROOT / "docs/experiments/rfc-multifocus/results.json").read_text())
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({"font.size": 9, "font.family": "DejaVu Sans", "svg.hashsalt": "fm4-rfc-multifocus"})
MODES = ["baseline", "left", "right", "both"]
COLORS = {"baseline": "#777777", "left": "#26734b", "right": "#346eaa", "both": "#ad6a2a"}
TITLES = {"joined-trees": "C: two trees joined by context", "leaf-connected-trees": "D: trees with ordinary leaf links", "shared-subtree": "E: trees sharing a branch and two leaves"}


def save(fig, name):
    fig.savefig(OUT / f"{name}.svg", metadata={"Date": None})
    path = OUT / f"{name}.svg"
    path.write_text("\n".join(line.rstrip() for line in path.read_text().splitlines()) + "\n")
    fig.savefig(OUT / f"{name}.pdf", metadata={"CreationDate": None, "ModDate": None})
    fig.savefig(OUT / f"{name}.png", dpi=180)
    plt.close(fig)


for number, name in enumerate(TITLES, 8):
    runs = [r for r in REPORT["results"] if r["name"] == name and not r["fixedRoots"] and r["seed"] == REPORT["seeds"][0]]
    selected = [next(r for r in runs if r["mode"] == mode) for mode in ["baseline", "left", "both"]]
    limits = [(min(n[c] for r in selected for n in r["nodes"]) - 55, max(n[c] for r in selected for n in r["nodes"]) + 55) for c in ("x", "y")]
    fig = plt.figure(figsize=(11, 7), layout="constrained")
    outer = fig.add_gridspec(2, 1, height_ratios=[1.35, 1])
    top, bottom = outer[0].subgridspec(1, 3), outer[1].subgridspec(1, 2)
    for col, r in enumerate(selected):
        ax = fig.add_subplot(top[col])
        nodes = {n["id"]: n for n in r["nodes"]}
        membership = {n: {s["id"] for s in r["structures"] if n in s["nodeIds"]} for n in nodes}
        active = {e for c in r["activeCenters"] for e in c["edgeIds"]}
        roots = {c["focusId"] for c in r["activeCenters"]}
        for edge in r["edges"]:
            a, b = nodes[edge["from"]], nodes[edge["to"]]
            xs, ys = [a["x"], b["x"]], [a["y"], b["y"]]
            if edge["id"] in active:
                for width, alpha in [(12, .04), (8, .09), (5, .16)]:
                    ax.plot(xs, ys, color="#ffcc20", lw=width, alpha=alpha, zorder=0)
            context = edge["id"].startswith(("context", "leaf-link"))
            ax.plot(xs, ys, color="#af584e" if context else "#808c86", lw=1.1, ls="--" if context else "-", zorder=1)
        for id, node in nodes.items():
            color = "#976699" if len(membership[id]) > 1 else "#26734b" if "a-tree" in membership[id] else "#346eaa"
            ax.scatter(node["x"], node["y"], s=75 if id in roots else 35, marker="*" if id in roots else "o", color=color, zorder=3)
            ax.annotate(id, (node["x"], node["y"]), xytext=(4, 4), textcoords="offset points", fontsize=7)
        angles = [t["angularGapRms"] for t in r["final"]["trees"]]
        ax.set(xlim=limits[0], ylim=limits[1], xlabel="Physical x", ylabel="Physical y",
               title=f'{r["mode"]}: left/right angle {angles[0]:.3f}/{angles[1]:.3f}\nunion length RMS {r["final"]["unionLengthRms"]:.2f}')
        ax.set_aspect("equal")
    for col, metric in enumerate(["unionAngularGapRms", "unionLengthRms"]):
        ax = fig.add_subplot(bottom[col])
        for r in runs:
            ax.plot([p["batch"] for p in r["trace"]], [p[metric] for p in r["trace"]], color=COLORS[r["mode"]], label=r["mode"])
        ax.set(xlabel="Batch (10 steps)", ylabel="Union gap RMS (radians)" if col == 0 else "Union length RMS (target 120)")
        ax.grid(alpha=.15); ax.legend(fontsize=8)
    fig.suptitle(TITLES[name] + " — movable roots, seed 0x1234abcd", fontsize=12)
    save(fig, f"{number:02d}-{name}")

fig, axes = plt.subplots(2, 3, figsize=(11, 6.8), layout="constrained")
seed_colors = ["#346eaa", "#26734b", "#ad6a2a", "#a24a69", "#8566b5"]
for row, fixed in enumerate([False, True]):
    for col, name in enumerate(TITLES):
        ax = axes[row, col]
        for i, mode in enumerate(MODES):
            values = []
            for index, seed in enumerate(REPORT["seeds"]):
                run = next(r for r in REPORT["results"] if r["name"] == name and r["fixedRoots"] == fixed and r["mode"] == mode and r["seed"] == seed)
                values.append(run["tailStepRms"])
                ax.scatter(i + (index - 2) * .045, max(run["tailStepRms"], 1e-6), s=24, color=seed_colors[index], zorder=3)
            ax.plot([i, i], [max(min(values), 1e-6), max(max(values), 1e-6)], color="#aaaaaa", lw=1, zorder=0)
            ax.plot([i - .13, i + .13], [max(float(np.mean(values)), 1e-6)] * 2, color="#222222", lw=1.2, zorder=2)
        ax.set_yscale("log")
        ax.set_xticks(range(4), MODES, rotation=15)
        ax.set(title=name + (" — pinned roots" if fixed else " — movable roots"), ylabel="Tail per-step motion RMS", ylim=(5e-7, 100))
        ax.grid(axis="y", alpha=.2)
handles = [plt.Line2D([], [], marker="o", ls="", color=color, label=hex(seed)) for seed, color in zip(REPORT["seeds"], seed_colors)]
fig.legend(handles=handles, loc="outside lower center", ncol=5, fontsize=8)
fig.suptitle("Five initial layouts: every run retained; bars mark means, motion floored at 10⁻⁶", fontsize=12)
save(fig, "11-multifocus-motion")
print(f"Wrote Figures 8–11 (SVG/PDF/PNG) to {OUT}")
