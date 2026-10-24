#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich.
Render Experiment K's recorded motion and rebuild its report; no layout simulation.
Requires matplotlib and numpy, as do the other experiment plotting scripts.
"""
import json
import sys
import textwrap
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

root = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/experiments/layout-damping")
data = json.loads((root / "results.json").read_text())
out = root / "figures"
out.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9, "svg.hashsalt": "fm4-layout-damping",
                     "axes.spines.top": False, "axes.spines.right": False})
colors = {"off": "#64748b", "v2-general": "#be7420", "v3-general": "#148575", "v3-early-cooling": "#c24848"}
labels = {"off": "Extra damping off", "v2-general": "v2, all movable nodes", "v3-general": "v3, all movable nodes", "v3-early-cooling": "Earlier TG cooling"}


def run(name, mode="v3-general"):
    return next(r for r in data["layouts"] if r["name"] == name and r["mode"] == mode)


fig, axes = plt.subplots(2, 2, figsize=(12, 8))
fig.subplots_adjust(top=.88, bottom=.19, hspace=.5, wspace=.3)
fig.suptitle("General adaptive damping: detection, visible motion and recovery", fontsize=14)
ax = axes[0, 0]
cycles = np.linspace(0, 4, 1281)
ax.plot(cycles, .5 * np.cos(cycles * 2 * np.pi), color="#346eaa", label="Prescribed slow swing")
first = next(p["firstDetectionCycles"] for p in data["probes"] if p["name"] == "very-slow-swing" and p["detector"] == "v3")
ax.axvline(first, color=colors["v3-general"], ls="--", label=f"v3 first detection: {first:.2f} cycles")
ax.text(.03, .06, "v2: no detection in four cycles", transform=ax.transAxes)
ax.set(title="A. Slow motion can evade step windows", xlabel="Cycles (320 integration steps each)", ylabel="Imposed x coordinate")
ax.legend(fontsize=8, loc="upper right")
for ax, name, title in [(axes[0, 1], "plain-stiff-star", "B. Native TouchGraph, RFC off"),
                        (axes[1, 0], "rfc-stiff-star", "C. Stiff RFC, movable center")]:
    for mode in colors:
        trace = run(name, mode)["trace"]
        ax.plot([p["timeMs"] / 1000 for p in trace], [p["maxDisplacement"] for p in trace],
                color=colors[mode], ls="--" if mode == "v2-general" else "-", lw=2 if mode == "v2-general" else 1,
                label=labels[mode])
    ax.axhline(.1, color="#777", ls=":", lw=.8)
    ax.set(title=title, xlabel="Virtual seconds", ylabel="Batch maximum of actual step travel", yscale="symlog", ylim=(0, 60))
    ax.set_yscale("symlog", linthresh=.01)
    ax.legend(fontsize=7)
ax = axes[1, 1]
for name, color, label in [("plain-stiff-star", "#148575", "Plain TG"), ("rfc-stiff-star", "#8b5ea6", "RFC")]:
    r = run(name)
    ax.plot([p["timeMs"] / 1000 for p in r["trace"]], [p["gain"] for p in r["trace"]], color=color,
            label=f'{label}: full gain at {r["firstRestoredMs"] / 1000:.2f} s')
    ax.axvline(r["lastMovingMs"] / 1000, color=color, ls=":", lw=.8)
ax.set(title="D. Quiet motion precedes full gain recovery", xlabel="Virtual seconds", ylabel="v3 impulse gain", ylim=(0, 1.05))
ax.legend(fontsize=8)
for ax in axes.flat:
    ax.grid(alpha=.18)
caption = ("Experiment K. Synthetic matched starts, 4000 integrations, virtual 2 ms per step; no wall-clock performance claim. "
           "A imposes positions to test detection only. B–C sample actual travel on every integration, then plot batch maxima; "
           "v2/v3 curves coincide on these fast-instability fixtures. D dotted lines mark the last step above 0.1 within the 8 s horizon. "
           "Gain recovery is a separate event. Low motion is not force balance, feasibility or readability.")
fig.text(.055, .025, textwrap.fill(caption, 155), va="bottom", fontsize=8, linespacing=1.45)
def save_figure(fig, name):
  for suffix in ("svg", "pdf", "png"):
    metadata = {"Date": None} if suffix == "svg" else {"CreationDate": None, "ModDate": None} if suffix == "pdf" else None
    fig.savefig(out / f"{name}.{suffix}", dpi=180, metadata=metadata)
  svg = out / f"{name}.svg"
  svg.write_text("\n".join(line.rstrip() for line in svg.read_text().splitlines()) + "\n")
  plt.close(fig)

save_figure(fig, "general-damping")

fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
fig.subplots_adjust(top=.82, bottom=.30, wspace=.25)
fig.suptitle("Earlier use of TouchGraph’s existing cooling phase", fontsize=14)
for ax, name, title in zip(axes, ["plain-stiff-star", "rfc-stiff-star"], ["Native TouchGraph, RFC off", "Stiff RFC, movable center"]):
    for mode in ["off", "v3-general", "v3-early-cooling"]:
        r = run(name, mode)
        ax.plot([p["timeMs"] / 1000 for p in r["trace"]], [p["damper"] for p in r["trace"]], color=colors[mode], label=labels[mode])
    ax.axhline(.9, ls=":", color="#777", lw=.8)
    ax.set(title=title, xlabel="Virtual seconds", ylabel="Inherited TG damper", ylim=(0, 1.03))
    ax.legend(fontsize=8)
    ax.grid(alpha=.18)
cooling_caption = ("Experiment K, conservative response. During persistent large motion, the original rule decreases d by 0.0001 per eligible step until d<0.9, then by 0.01. "
                   "Confirmed oscillation in the early-cooling condition caps d at 0.89 and leaves the remaining TG rule intact. It applies no extra impulse gain and no annealed reheating. "
                   "Fast cooling starts at 14/12 ms in the native/RFC stress cases, versus 4000/5894 ms with extra damping off. Virtual cadence, not measured browser latency.")
fig.text(.055, .025, textwrap.fill(cooling_caption, 155), va="bottom", fontsize=8, linespacing=1.45)
save_figure(fig, "early-cooling")

lines = ["# Experiment K: general adaptive damping", "",
         "This historical checkpoint applies one shared adaptive gain to movable visible nodes, independently of RFC. It separates broader ownership, completed-swing detection and earlier activation of inherited cooling. The current browser uses independent node gains; [Experiment L](../damping-context/README.md) evaluates the context-clearing correction. These records and figures retain their original shared-gain behavior.", "",
         "Regenerate records, report and SVG/PDF/PNG figure with `just layout-damping-experiment`. Plotting needs Python 3, matplotlib and numpy, as for the other experiment recipes. [Generator](../../../scripts/layout-damping-experiment.mjs) · [Figure/report source](../../../scripts/layout-damping-figures.py) · [Recorded results](results.json) · [Paper](../../papers/rfc-revisited-draft2.md#54-general-layout-damping-and-experiment-k).", "",
         "## Protocol", "",
         "Sixteen matched runs cross four fixed synthetic graphs with extra damping off, frozen v2 detection applied to every movable node, historical v3 general impulse damping, and v3-triggered earlier TouchGraph cooling. Each receives 400 batches of ten integrations at rigidity 1, with an injected 2 ms clock. The original TG cooling rule remains active in every condition. Starts, edges and RFC parameters are identical within a graph. Fixed nodes are excluded from attenuation; the pinned-star control changes only its root flag.", "",
         "The stiff native star has six links of length parameter 1, a movable root at (0,0), and branches at (100 cos i, 100 sin i), i=0…5. This deliberately strong native attraction is a stress input, not a typical dataset. The ordinary control uses link parameter 40. The RFC case uses the existing crowded-star fixture with movable center, radial stiffness 2 and fixed context anchors. No force coefficient is reduced to obtain the damping result.", "",
         "The v2 reference is frozen from commit `43fea7a` in [rfc-stabilization-v2.mjs](../../../tests/fixtures/rfc-stabilization-v2.mjs); it is a research fixture, not a shipped compatibility mode. All enabled layout conditions watch the entire visible movable union. Consequently their difference isolates cycle tracking, while off/on comparisons isolate general damping. The native controls contain no RFC force callback. A final-coordinate diagnostic disables extra damping, clears retained momentum and holds global motion at zero while measuring the existing raw forces; this does not move the graph.", "",
         "## Detection probes", "",
         "Prescribed positions test the detector without letting attenuation alter the trajectory. Slow swings have amplitude 0.5 and periods 80/320 steps; the orbit has radius 0.5 and period 320. Each individual step is below the old 0.1 movement threshold. The frozen v2 detector misses all three throughout four cycles. The new detector confirms slow swings after 2.15 cycles and circulation after 1.90 cycles. Translation, amplitude-0.05 jitter and motion decaying by a factor 0.6 per half-cycle produce no detections in either version.", "",
         "V3 retains fast reversal/circulation windows and adds four alternating extrema per axis. An extremum needs a return greater than 0.2 physical units. Each of the last two excursions must retain at least 80% of its predecessor's amplitude, and endpoint net travel must be less than 35% of the three-leg path. Only four points per axis are retained. These are heuristic thresholds; motion below the prominence threshold, irregular motion and drift can escape detection.", "",
         "## Layout results", "",
         "A large step means any movable node travels more than 29.9 physical units. Every integration is observed, avoiding ten-step cancellation. The last movement column marks the last step above 0.1 during the fixed 8-second horizon; it is not a convergence certificate. Times use the virtual cadence and are not measured UI latency.", "",
         "| Graph | Extra damping | Large steps | First detection (s) | Last movement >0.1 (s) | Fast TG cooling (s) | First full gain recovery (s) | Final force RMS |",
         "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
for r in data["layouts"]:
    number = lambda value: "—" if value is None else f"{value / 1000:.3f}"
    lines.append(f'| {r["name"]} | {r["mode"]} | {r["largeSteps"]} | {number(r["firstDetectionMs"])} | {number(r["lastMovingMs"])} | {number(r["fastCoolingMs"])} | {number(r["firstRestoredMs"])} | {r["forceRms"]:.6g} |')
lines += ["", "![General adaptive damping, detection and recovery](figures/general-damping.svg)", "", caption, "",
          "The fast unstable stars have identical v2/v3 responses: this part of the improvement comes from applying detection generally, rather than a faster fast-motion detector. The ordinary and pinned native controls trigger neither version and retain the undamped trajectories exactly. The slow prescribed probes establish the distinct benefit of completed-swing tracking. They do not establish a settling time for a closed-loop slow oscillator.", "",
          "## Conservative alternative: earlier TouchGraph cooling", "",
          "The original TG process is already active during the apparent delay. With large motion it decreases the damper by only 0.0001 per eligible step until it falls below 0.9; it then uses 0.01 decrements. Eligible means motion ratio ≤0.001. Repeated large swings can spend seconds in the slow phase. The alternative responds to a confirmed detection by capping the inherited damper at 0.89, entering its existing faster phase. It applies no extra impulse multiplier, leaves the remaining TG cooling rule intact, respects disabled TG cooling and does not perform annealed reheating.", "",
          "![Earlier use of inherited TouchGraph cooling](figures/early-cooling.svg)", "", cooling_caption, "",
          "On the native stress case, early cooling reduces large steps from 2050 to 20 and the last substantial movement from 4.138 to 0.102 s. On the stiff RFC case those values change from 3092 to 148 and 7.416 to 1.460 s. Impulse damping has fewer large steps (6 and 5), while early cooling has a smaller final force RMS on these two starts (0.000465 and 0.0678, versus 0.00813 and 2.30). The native undamped control has an even smaller final force RMS (0.000141): quietness, transient motion and balance remain separate objectives. No response dominates every measured outcome.", "",
          "## Interpretation and limits", "",
          "Suppression and recovery are different events. Damping starts within a few observed reversals on these fast fixtures; visible motion becomes quiet much earlier than the 500 ms quiet gate plus three-second recovery finishes. Shortening recovery would restore force gain sooner and can re-excite motion; it is not the remedy for late detection.", "",
          "The general controller scales accumulated impulses after all forces, including retained momentum, without modifying force settings or coordinates directly. It shares one gain across the visible movable graph: one unstable component can therefore slow unrelated components. The graph's force-zero equations remain unchanged under a positive common multiplier in the idealized update, but finite budgets, inherited cooling and thresholds can still leave residual error or select a different arrangement. Subsequent force balance, geometry quality and perceptual evaluation remain necessary.", "",
          "These are four small deterministic inputs, including one deliberately severe native stress case. They demonstrate behavior and regression coverage, not general convergence, arbitrary-graph latency, a universal parameter choice or a readability benefit. Historical Experiments A–J are retained rather than rerun under the new browser default.", ""]
(root / "README.md").write_text("\n".join(lines))
print(f"Wrote {out}/general-damping (SVG, PDF, PNG) , early-cooling (SVG, PDF, PNG) and {root}/README.md")
