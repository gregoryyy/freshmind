#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
Generate the second RFC draft's vector figures from recorded runs and stated equations.
Requires Python 3, matplotlib and numpy; no external data or services.
"""
import json
import runpy
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/papers/figures/rfc"
OUT.mkdir(parents=True, exist_ok=True)
report = json.loads((ROOT / "docs/experiments/rfc-single-focus/results.json").read_text())
sweep = json.loads((ROOT / "docs/experiments/rfc-single-focus/stiffness-sweep.json").read_text())["results"]
plt.rcParams.update({"font.size": 10, "font.family": "DejaVu Sans", "svg.hashsalt": "fm4-rfc-draft2"})
COLORS = ["#777777", "#a56730", "#4482ba", "#a2679f", "#26734b"]
methods = ["baseline", "attraction", "angles", "length", "tree"]
titles = ["TouchGraph", "Attraction + angles", "Strong angles", "Length spring", "Length + angles"]
names = ["crowded-star", "unequal-radii", "wide-labels"]

def save(fig, name):
    fig.savefig(OUT / f"{name}.svg", metadata={"Date": None})
    path = OUT / f"{name}.svg"
    path.write_text("\n".join(line.rstrip() for line in path.read_text().splitlines()) + "\n")
    fig.savefig(OUT / f"{name}.pdf", metadata={"CreationDate": None, "ModDate": None})
    fig.savefig(OUT / f"{name}.png", dpi=180)
    plt.close(fig)

def result(name, method):
    source = report["ablations"] if method in ("angles", "length") else report["results"]
    return next(r for r in source if r["name"] == name and r.get("method", r["profile"]) == method)

# Actual layouts, common physical axes; golden bands illustrate RFC membership.
fig, axes = plt.subplots(2, 2, figsize=(9, 8), layout="constrained")
chosen = ["baseline", "attraction", "angles", "tree"]
all_nodes = [n for method in chosen for n in result("crowded-star", method)["nodes"]]
limits = [(min(n[c] for n in all_nodes)-35, max(n[c] for n in all_nodes)+35) for c in ("x", "y")]
for ax, method in zip(axes.flat, chosen):
    r = result("crowded-star", method)
    nodes = {n["id"]: n for n in r["nodes"]}
    for edge in r["edges"]:
        a, b = nodes[edge["from"]], nodes[edge["to"]]
        focal = edge["from"] == "center"
        if focal and method != "baseline":
            for width, alpha in [(14,.035),(10,.07),(6,.13)]:
                ax.plot([a["x"],b["x"]],[a["y"],b["y"]],color="#ffcf20",lw=width,alpha=alpha,zorder=0)
        ax.plot([a["x"],b["x"]],[a["y"],b["y"]],color="#47735d" if focal else "#b4b4b4",lw=1,zorder=1)
    for id, n in nodes.items():
        if not id.startswith("context") and method != "baseline":
            for size, alpha in [(420,.06),(260,.12),(150,.2)]:
                ax.scatter(n["x"],n["y"],s=size,c="#ffcf20",alpha=alpha,zorder=2,edgecolors="none")
        ax.scatter(n["x"],n["y"],s=55,marker="s" if n["fixed"] else "o",c="#b57332" if id=="center" else "#386451",zorder=3)
        label = "F" if id=="center" else "R"+str(int(id.split("-")[1])+1) if id.startswith("branch") else "C"+str(int(id.split("-")[1])+1)
        ax.annotate(label,(n["x"],n["y"]),xytext=(5,5),textcoords="offset points",fontsize=9)
    ax.add_patch(plt.Circle((0,0),120,fill=False,ls=":",color="#b8b8b8",lw=.7))
    ax.set(xlim=limits[0],ylim=limits[1],xlabel="Physical x",ylabel="Physical y",
           title=f'{titles[methods.index(method)]}\nangle RMS {r["final"]["angularGapRms"]:.3f}; length RMS {r["final"]["radialLengthRms"]:.1f}')
    ax.set_aspect("equal")
save(fig,"01-layout-approaches")

fig, axes = plt.subplots(1,2,figsize=(10,4),layout="constrained")
x=np.arange(len(names)); width=.15
for i, method in enumerate(methods):
    for ax, metric in zip(axes,["angularGapRms","radialLengthRms"]):
        ax.bar(x+(i-2)*width,[result(name,method)["final"][metric] for name in names],width,color=COLORS[i],label=titles[i])
for ax in axes:
    ax.set_xticks(x,names,rotation=12);ax.grid(axis="y",alpha=.2);ax.set_axisbelow(True)
axes[0].set_ylabel("Weighted gap RMS (radians)");axes[1].set_ylabel("Weighted length RMS (target 120)")
axes[0].legend(fontsize=8)
save(fig,"03-ablation")

fig, axes=plt.subplots(1,2,figsize=(9,3.6),layout="constrained")
r=np.linspace(1,240,500); length=120; radial=1
axes[0].plot(r,-3*r*r/6000,label="Total focal attraction, m=3")
axes[0].plot(r,-radial*(np.sqrt(r*r+1)-length)*r/np.sqrt(r*r+1),label="Added length spring, k=1")
axes[0].axhline(0,color="gray",lw=.7);axes[0].axvline(length,color="gray",ls=":")
axes[0].set(xlabel="Radius",ylabel="Signed outward force",title="Two distinct force components")
axes[0].legend(fontsize=8)
ratio=np.linspace(.05,4,400); a=ratio; b=1; s=np.sin(np.pi/6)
exact=np.sqrt((a-b)**2+4*a*b*s*s);approx=(a+b)*s
assert np.allclose(exact**2-approx**2,(a-b)**2*np.cos(np.pi/6)**2)
axes[1].plot(ratio,exact,label="Exact chord for 60°")
axes[1].plot(ratio,approx,label="2005 Eq. (2) target")
axes[1].plot(ratio,np.abs(a-b),":",label="Minimum feasible chord")
axes[1].set(xlabel="Radius ratio (rᵢ/rⱼ)",ylabel="Chord / rⱼ",title="Unequal radii, N=6")
axes[1].legend(fontsize=8)
save(fig,"02-force-and-chord")

fig, axes=plt.subplots(2,3,figsize=(10,6),layout="constrained")
for col,name in enumerate(names):
    for row,metric in enumerate(["angularGapRms","radialLengthRms"]):
        values=np.array([[next(r for r in sweep if r["name"]==name and r["settings"]["radialStiffness"]==k and r["settings"]["angularStiffness"]==a)["final"][metric] for a in [300,3000,10000,30000]] for k in [.25,.5,1,2]])
        ax=axes[row,col]; im=ax.imshow(values,origin="lower",cmap="viridis_r",aspect="auto",vmin=0,vmax=1.5 if row==0 else 100)
        ax.set_xticks(range(4),["300","3000","10000","30000"],rotation=35)
        ax.set_yticks(range(4),[".25",".5","1","2"]);ax.set(xlabel="Angular stiffness",ylabel="Radial stiffness",title=name+(" — angle RMS" if row==0 else " — length RMS"))
        ax.plot(2,2,"s",mfc="none",mec="#ffbf00",ms=20,mew=2)
        for y in range(4):
            for x in range(4):ax.text(x,y,f"{values[y,x]:.2f}" if row==0 else f"{values[y,x]:.1f}",ha="center",va="center",fontsize=7,color="white" if values[y,x]>(.7 if row==0 else 50) else "black")
        if col==2:fig.colorbar(im,ax=axes[row,:].tolist(),shrink=.8)
save(fig,"04-stiffness-sweep")

# Linearization of the actual retained-momentum update, without caps or adaptive d.
def matrix(k,d):return np.array([[1-d*k,d],[-d*k/2,d/2]])
diagnostics=[]
directions=np.column_stack((np.cos(np.arange(6)*np.pi/3),np.sin(np.arange(6)*np.pi/3)))
radial_spectrum=np.linalg.eigvalsh(np.eye(6)+directions@directions.T)
assert np.allclose(radial_spectrum,[1,1,1,1,4,4])
fig, axes=plt.subplots(1,2,figsize=(10,4),layout="constrained")
for k,d in [(1,1),(4,1),(8,1),(8,.25)]:
    state=np.array([1.,0.]);trace=[]
    for step in range(30):trace.append(np.linalg.norm(state));state=matrix(k,d)@state
    radius=float(max(abs(np.linalg.eigvals(matrix(k,d)))))
    diagnostics.append({"curvature":k,"damper":d,"spectralRadius":radius})
    axes[0].semilogy(range(30),trace,label=f"κ={k}, d={d}; ρ={radius:.2f}")
axes[0].set(xlabel="Integration step",ylabel="State norm (initial e=1, p=0)",title="Unclipped scalar modes");axes[0].legend(fontsize=8)
for run in report["oscillations"]:
    points=run["trace"][1:]
    axes[1].semilogy([p["batch"] for p in points],[max(p["displacement"],1e-12) for p in points],label=f'k={run["settings"]["radialStiffness"]}, rigidity={run["rigidity"]}')
axes[1].set(xlabel="Batch (10 steps)",ylabel="Maximum net displacement / batch",title="Movable-center graph, original adaptive damping");axes[1].legend(fontsize=8)
save(fig,"05-oscillation-and-damping")
(OUT/"stability-calculations.json").write_text(json.dumps({"update":"[[1-d*k,d],[-d*k/2,d/2]]","stability":"0 < d*k < 2+d, for 0<d<=1","scalarModes":diagnostics,"sixBranchRadialCurvature":{"fixedCenter":"k","movableCenter":"4*k","eigenvaluesPerUnitStiffness":radial_spectrum.tolist()},"rigidityNote":"Graph rigidity changes apply after the first ten-step batch."},indent=2)+"\n")

fig, axes=plt.subplots(1,2,figsize=(9,3.6),layout="constrained")
theta=np.linspace(0,2*np.pi,300)
for ax,wx in zip(axes,[1,.25]):
    ax.plot(120*np.cos(theta)/np.sqrt(wx),120*np.sin(theta),color="#708c7a")
    for t in np.arange(6)*np.pi/3:
        x=120*np.cos(t)/np.sqrt(wx);y=120*np.sin(t)
        ax.plot([0,x],[0,y],color="#708c7a",lw=.8)
        ax.text(x,y,"long label",ha="center",va="center",fontsize=8,bbox={"facecolor":"white","edgecolor":"#47735d","boxstyle":"round,pad=.2"})
    ax.set_aspect("equal");ax.set(xlim=(-280,280),ylim=(-150,150),title=f"λx={wx}, λy=1",xlabel="Physical x",ylabel="Physical y")
save(fig,"06-weighted-geometry")

adaptive=json.loads((ROOT / "docs/experiments/rfc-single-focus/adaptive-damping.json").read_text())
fig, axes=plt.subplots(3,2,figsize=(10,8),layout="constrained")
for row,name in enumerate(names):
    for enabled in [False,True]:
        run=next(r for r in adaptive["results"] if r["name"]==name and r["enabled"]==enabled)
        seconds=[p["time"]/1000 for p in run["trace"]]
        axes[row,0].semilogy(seconds,[max(p["movement"],1e-6) for p in run["trace"]],label="Damping on" if enabled else "Damping off")
        if enabled:axes[row,1].plot(seconds,[p["gain"] for p in run["trace"]],color="#26734b",label="Local impulse gain")
    axes[row,0].set(title=name,xlabel="Simulated seconds",ylabel="Net batch motion (floor 10⁻⁶)")
    axes[row,1].set(title=name+" — recovery",xlabel="Simulated seconds",ylabel="Local gain",ylim=(0,1.05))
    axes[row,0].legend(fontsize=8);axes[row,1].legend(fontsize=8)
save(fig,"07-adaptive-damping")
print(f"Wrote Figures 1–7 and stability calculations to {OUT}")
runpy.run_path(str(ROOT / "scripts/rfc-multifocus-figures.py"), run_name="__main__")
