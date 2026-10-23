#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
TypeScript port by Gregor Heinrich using Codex GPT-6.1.
Render the recorded single-focus experiments; requires matplotlib.
"""
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

root = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/experiments/rfc-single-focus")
report = json.loads((root / "results.json").read_text())
names = list(dict.fromkeys(result["name"] for result in report["results"]))
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "svg.hashsalt": "fm4-rfc-single-focus"})
fig, axes = plt.subplots(len(names), 5, figsize=(19, 3.8 * len(names)), squeeze=False, layout="constrained")
labels = {"baseline": "TouchGraph", "attraction": "Attraction RFC", "tree": "Tree RFC"}
for row, name in enumerate(names):
    results = [result for result in report["results"] if result["name"] == name]
    nodes = [node for result in results for node in result["nodes"]]
    xmin, xmax = min(node["x"] for node in nodes) - 35, max(node["x"] for node in nodes) + 35
    ymin, ymax = min(node["y"] for node in nodes) - 35, max(node["y"] for node in nodes) + 35
    for col, result in enumerate(results):
        ax = axes[row, col]
        by_id = {node["id"]: node for node in result["nodes"]}
        for edge in result["edges"]:
            a, b = by_id[edge["from"]], by_id[edge["to"]]
            ax.plot([a["x"], b["x"]], [a["y"], b["y"]], color="#486b55" if edge["from"] == "center" else "#b8b8b8", linewidth=1, zorder=1)
        for node in result["nodes"]:
            color = "#d17c29" if node["id"] == "center" else "#345c85" if node["fixed"] else "#39724a"
            ax.scatter([node["x"]], [node["y"]], c=color, marker="s" if node["fixed"] else "o", s=42, zorder=2)
            ax.annotate(node["label"], (node["x"], node["y"]), xytext=(4, 5), textcoords="offset points", fontsize=7)
        ax.set(xlim=(xmin, xmax), ylim=(ymax, ymin), xlabel="Physical x", ylabel="Physical y",
               title=f'{name}: {labels[result["profile"]]}\nweighted gap RMS {result["final"]["angularGapRms"]:.3f} rad')
        ax.set_aspect("equal", adjustable="box")
        axes[row, 3].plot([point["batch"] for point in result["trace"]], [point["angularGapRms"] for point in result["trace"]], label=labels[result["profile"]])
        axes[row, 4].plot([point["batch"] for point in result["trace"]], [point["radialLengthRms"] for point in result["trace"]], label=labels[result["profile"]])
    axes[row, 3].set(xlabel="Layout batches (10 steps each)", ylabel="Weighted angular-gap RMS (rad)", title="Even branch spacing in the configured metric")
    axes[row, 3].legend()
    axes[row, 4].set(xlabel="Layout batches (10 steps each)", ylabel="Target-length RMS", title="Focal length error (target 120)")
    axes[row, 4].legend()
fig.savefig(root / "comparison.svg", metadata={"Date": None, "Creator": "Freshmind RFC experiment / matplotlib"})
svg = root / "comparison.svg"
svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines()) + "\n")
print(f'Wrote {svg}')
