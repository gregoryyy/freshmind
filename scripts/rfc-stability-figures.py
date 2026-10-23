#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
Plot recorded RFC detector/response comparisons; requires matplotlib and numpy.
No layout simulation or invented/interpolated graph positions.
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

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/experiments/rfc-stability")
OUT = ROOT / "figures"
OUT.mkdir(parents=True, exist_ok=True)
REPORTS = {v: json.loads((ROOT / v / "results.json").read_text()) for v in ("v1", "v2")}
NAMES = list(dict.fromkeys(r["name"] for r in REPORTS["v2"]["layouts"]))
COLORS = {"off": "#64748b", "v1": "#be7420", "v2": "#148575"}
LABELS = {"off": "Damping off", "v1": "v1 detector", "v2": "v2 detector"}
TITLES = {"small-two-centers": "Four nodes, two star centers", "small-cluster-pair": "Overlapping weighted clusters",
          "leaf-connected-trees": "Two trees with leaf connections", "shared-subtree": "Shared subtree, pinned roots"}
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8, "axes.titlesize": 9,
                     "svg.hashsalt": "fm4-rfc-stability", "axes.spines.top": False, "axes.spines.right": False})


def runs(name):
    selected = {"off": next(r for r in REPORTS["v2"]["layouts"] if r["name"] == name and not r["enabled"])}
    selected.update({v: next(r for r in REPORTS[v]["layouts"] if r["name"] == name and r["enabled"]) for v in ("v1", "v2")})
    for r in selected.values():
        assert r["initialNodes"] == selected["off"]["initialNodes"], "Unmatched starting coordinates"
        assert r["edges"] == selected["off"]["edges"], "Unmatched semantic graph"
        assert r["settings"] == selected["off"]["settings"] and r["clusterSettings"] == selected["off"]["clusterSettings"]
        assert len(r["motion"]) == 400 and len(r["startupMotion"]) == 100
    return selected


def caption(fig, text):
    fig.text(.045, .025, textwrap.fill(text, 165), va="bottom", fontsize=8, linespacing=1.45)


def save(fig, name):
    fig.savefig(OUT / f"{name}.svg", metadata={"Date": None, "Creator": "Freshmind / matplotlib"})
    svg = OUT / f"{name}.svg"
    svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines()) + "\n")
    fig.savefig(OUT / f"{name}.pdf", metadata={"CreationDate": None, "ModDate": None})
    fig.savefig(OUT / f"{name}.png", dpi=180)
    plt.close(fig)
    print(f"Wrote {OUT / name} (SVG, PDF, PNG)")


def style(ax):
    ax.grid(alpha=.16)
    ax.set_axisbelow(True)


def detector_probes():
    fig, axes = plt.subplots(2, 3, figsize=(12, 6.8))
    fig.subplots_adjust(top=.86, bottom=.18, hspace=.65, wspace=.35)
    fig.suptitle("Prescribed motion exposes detector blind spots", fontsize=14, y=.97)
    for row, name in enumerate(("masked-reversal", "circulation")):
        probes = {v: next(p for p in REPORTS[v]["prescribed"] if p["name"] == name) for v in ("v1", "v2")}
        trajectory = probes["v2"]["trace"]
        a = np.array([[p["nodes"][0]["x"], p["nodes"][0]["y"]] for p in trajectory])
        if row == 0:
            axes[row, 0].plot(np.arange(21), a[:21, 0], ".-", color="#346eaa")
            axes[row, 0].set(title="Masked reversal: prescribed position", xlabel="Integration step", ylabel="Oscillating member x")
            for index, label, color in ((0, "Oscillating member", "#346eaa"), (1, "Translating member", "#8b5ea6")):
                xy = np.array([[p["nodes"][index]["x"], p["nodes"][index]["y"]] for p in trajectory])
                axes[row, 1].plot(np.arange(1, len(xy)), np.linalg.norm(np.diff(xy, axis=0), axis=1), color=color, label=label)
            axes[row, 1].set(title="Other motion dominates the v1 vote", xlabel="Integration step", ylabel="Travel per step")
            axes[row, 1].legend(fontsize=7, loc="center right")
        else:
            axes[row, 0].plot(a[:7, 0], a[:7, 1], "o-", color="#346eaa")
            for i in range(6):
                axes[row, 0].annotate(str(i), a[i], xytext=(5, 5), textcoords="offset points")
                axes[row, 0].annotate("", a[i+1], a[i], arrowprops={"arrowstyle": "->", "color": "#346eaa"})
            axes[row, 0].set(title="Circulation: six-step orbit", xlabel="Physical x", ylabel="Physical y", xlim=(-14, 14), ylim=(-14, 14))
            axes[row, 0].set_aspect("equal", adjustable="box")
            velocities = np.diff(a, axis=0)
            cosines = np.sum(velocities[1:]*velocities[:-1], axis=1) / (np.linalg.norm(velocities[1:], axis=1)*np.linalg.norm(velocities[:-1], axis=1))
            axes[row, 1].plot(np.arange(2, len(a)), np.degrees(np.arccos(np.clip(cosines, -1, 1))), color="#346eaa")
            axes[row, 1].axhline(120, color="#777777", ls="--", label="v1 requires >120°")
            axes[row, 1].set(title="No sharp reversal", xlabel="Integration step", ylabel="Direction change (degrees)", ylim=(0, 180))
            axes[row, 1].legend(fontsize=7)
        ax = axes[row, 2]
        for v, probe in probes.items():
            ax.step([p["step"] for p in probe["trace"]], [p["gain"] for p in probe["trace"]], where="post", color=COLORS[v],
                    label=f'{v}: {probe["detections"]} episodes')
            first = next((p for p in probe["trace"] if p["detections"]), None)
            if first:
                ax.scatter([first["step"]], [first["gain"]], s=30, marker="v", color=COLORS[v], zorder=4)
        ax.set(title="Detector response (positions imposed)", xlabel="Integration step", ylabel="Local gain", yscale="log", ylim=(5e-9, 1.8))
        ax.legend(fontsize=7, loc="lower left")
    for ax in axes.flat:
        style(ax)
    caption(fig, "Figure 1. v1 misses both patterns; v2 identifies individual reversals and circulating travel. Triangles mark first detection. "
            "These trajectories are imposed independently of damping: declining gain does not mean the prescribed motion has stabilized.")
    save(fig, "01-detector-probes")


def overview():
    fig, axes = plt.subplots(1, 2, figsize=(12, 5.3))
    fig.subplots_adjust(top=.83, bottom=.31, wspace=.25)
    fig.suptitle("Stability and remaining geometric error are different measures", fontsize=13, y=.96)
    xs = np.arange(len(NAMES))
    for offset, mode in enumerate(("off", "v1", "v2")):
        selected = [runs(name)[mode] for name in NAMES]
        for ax, field in zip(axes, ("largeStepCount", "finalLengthRms")):
            values = [r[field] for r in selected]
            bars = ax.bar(xs+(offset-1)*.25, values, width=.23, color=COLORS[mode], label=LABELS[mode])
            ax.bar_label(bars, labels=[str(int(v)) if field == "largeStepCount" else f"{v:.2f}" for v in values],
                         fontsize=7, padding=3, rotation=0 if field == "largeStepCount" else 90)
    labels = ["Two star\ncenters", "Overlapping\nclusters", "Leaf-linked\ntrees", "Pinned shared\nsubtree"]
    for ax in axes:
        ax.set_xticks(xs, labels)
        ax.tick_params(axis="x", labelsize=8)
        style(ax)
    axes[0].set(yscale="log", ylim=(1, 12000), ylabel="Large-step count (log scale)", title="Any movable member travels >29.9 units")
    axes[1].set(yscale="symlog", ylim=(0, 110), ylabel="Selected spring-length RMS (weighted units)", title="Final geometric residual; not total force error")
    axes[1].legend(fontsize=8, loc="upper left")
    caption(fig, "Figure 2. Identical starts/forces over 4000 integrations. Counts measure violent motion, not exact per-axis clipping. "
            "Length residual uses the soft-core radius sqrt(D²+1) and each selected edge's target (120 for stars/trees, 90 for these clusters). "
            "All enabled runs cool to zero tail motion; the pinned shared-subtree length constraints remain infeasible. No seed sweep or readability claim.")
    save(fig, "02-stability-and-residuals")


def convex_hull(points):
    points = sorted(set(points))
    if len(points) < 3:
        return points
    def half(seq):
        out = []
        for p in seq:
            while len(out) > 1 and (out[-1][0]-out[-2][0])*(p[1]-out[-2][1])-(out[-1][1]-out[-2][1])*(p[0]-out[-2][0]) <= 0:
                out.pop()
            out.append(p)
        return out
    return half(points)[:-1]+half(points[::-1])[:-1]


def graph(ax, run, nodes, limits):
    by_id = {n["id"]: n for n in nodes}
    centers = {c["focusId"] for c in run["activeCenters"]}
    active = {e for c in run["activeCenters"] for e in c["edgeIds"]}
    membership = {n: sum(n in c["memberIds"] for c in run["activeCenters"]) for n in by_id}
    for index, structure in enumerate(run["structures"]):
        if structure["kind"] == "cluster":
            hull = convex_hull([(by_id[n]["x"], by_id[n]["y"]) for n in structure["nodeIds"]])
            ax.add_patch(Polygon(hull, color=("#346eaa", "#148575")[index % 2], alpha=.08, lw=12, joinstyle="round", zorder=0))
    for edge in run["edges"]:
        a, b = by_id[edge["from"]], by_id[edge["to"]]
        ax.plot([a["x"], b["x"]], [a["y"], b["y"]], color="#39724a" if edge["id"] in active else "#9a9a9a",
                lw=1.2 if edge["id"] in active else .8, ls="-" if edge["id"] in active else "--", zorder=1)
    for n in nodes:
        color = "#c16b25" if n["id"] in centers else "#8b5ea6" if membership[n["id"]] > 1 else "#346eaa"
        ax.scatter([n["x"]], [n["y"]], color=color, marker="s" if n["fixed"] else "o", s=45 if n["id"] in centers else 24, zorder=3)
        ax.annotate(n["id"], (n["x"], n["y"]), xytext=(4, 4), textcoords="offset points", fontsize=7)
    ax.set(xlim=limits[0], ylim=limits[1], xlabel="Physical x", ylabel="Physical y")
    ax.set_aspect("equal", adjustable="box")
    ax.tick_params(labelsize=7)
    style(ax)


def limits(nodes):
    result = []
    for c in ("x", "y"):
        low, high = min(n[c] for n in nodes), max(n[c] for n in nodes)
        margin = max(4, (high-low)*.17)
        result.append((low-margin, high+margin))
    return result


def response(name, number):
    selected = runs(name)
    fig = plt.figure(figsize=(13.2, 7.9))
    grid = fig.add_gridspec(2, 1, top=.86, bottom=.18, hspace=.5)
    top, bottom = grid[0].subgridspec(1, 4, wspace=.45), grid[1].subgridspec(1, 3, wspace=.3)
    fig.suptitle(TITLES[name], fontsize=14, y=.98)
    fig.legend(handles=[Line2D([], [], color="#c16b25", marker="o", ls="", label="RFC representative/center"),
                        Line2D([], [], color="#8b5ea6", marker="o", ls="", label="Shared member"),
                        Line2D([], [], color="#346eaa", marker="s", ls="", label="Pinned node")],
               loc="upper center", bbox_to_anchor=(.5, .95), ncol=3, frameon=False, fontsize=8)
    final_limits = limits([n for r in selected.values() for n in r["nodes"]])
    initial = fig.add_subplot(top[0])
    graph(initial, selected["off"], selected["off"]["initialNodes"], limits(selected["off"]["initialNodes"]))
    initial.set_title("Initial (own scale)")
    for col, mode in enumerate(("off", "v1", "v2"), 1):
        r = selected[mode]
        ax = fig.add_subplot(top[col])
        graph(ax, r, r["nodes"], final_limits)
        ax.set_title(f'{LABELS[mode]}: step 4000\nLength RMS {r["finalLengthRms"]:.2f}')
    motion_ax, gain_ax, damper_ax = [fig.add_subplot(bottom[i]) for i in range(3)]
    inset = motion_ax.inset_axes([.50, .43, .47, .43])
    for mode, r in selected.items():
        times = [p["timeMs"]/1000 for p in r["motion"]]
        motion_ax.plot(times, [p["maxDisplacement"] for p in r["motion"]], color=COLORS[mode], lw=1.2, label=LABELS[mode])
        inset.plot([p["step"] for p in r["startupMotion"][:50]], [p["maxDisplacement"] for p in r["startupMotion"][:50]], color=COLORS[mode], lw=.9)
        gain_ax.plot([0]+times, [1]+[p["gain"] for p in r["motion"]], color=COLORS[mode], lw=1.2)
        damper_ax.plot([0]+times, [1]+[p["damper"] for p in r["motion"]], color=COLORS[mode], lw=1.2)
        first = next((e for e in r["events"] if e["detections"]), None)
        if first:
            gain_ax.scatter([first["timeMs"]/1000], [first["gain"]], marker="v", s=30, color=COLORS[mode], zorder=5)
    motion_ax.axhline(29.9, color="#999999", ls=":", lw=.8)
    motion_ax.set(xlabel="Virtual time (seconds)", ylabel="Max actual step (batch maximum)", yscale="symlog", ylim=(0, 50), title="Actual movement; startup inset")
    motion_ax.set_yscale("symlog", linthresh=.1)
    motion_ax.legend(fontsize=7, loc="lower left")
    inset.set(xlabel="Step", title="First 50 steps", ylim=(-1, 45))
    inset.tick_params(labelsize=6)
    inset.xaxis.label.set_size(6)
    inset.title.set_size(7)
    gain_ax.set(xlabel="Virtual time (seconds)", ylabel="Local gain", yscale="log", ylim=(1e-8, 1.8), title="Local damping / recovery")
    damper_ax.set(xlabel="Virtual time (seconds)", ylabel="Global damper", ylim=(-.03, 1.05), title="Inherited global cooling")
    for ax in (motion_ax, gain_ax, damper_ax):
        style(ax)
    counts = " / ".join(str(selected[m]["largeStepCount"]) for m in ("off", "v1", "v2"))
    caption(fig, f"Figure {number}. Large-step counts off/v1/v2: {counts}. Final panels share physical axes; initial uses its labelled own scale. "
            "Motion shows the maximum over each batch's ten actual integrations, not net batch displacement; inset shows individual steps. "
            "Triangles mark first detection. Straight edges and approximate cluster shading depict headless membership, not browser routing or exclusion. "
            "Final snapshots and low motion alone do not establish equilibrium or readability.")
    save(fig, f"{number:02d}-{name}")


detector_probes()
overview()
for index, name in enumerate(NAMES, 3):
    response(name, index)
