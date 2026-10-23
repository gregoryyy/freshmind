# Reinforcement Focus+Context revisited: local structure, radial constraints and stable interaction

**Gregor Heinrich** · Freshmind 4 · 23 October 2026

**Second draft — implementation study and analytical extensions; not peer reviewed**

## Abstract

Reinforcement Focus+Context (RFC), introduced in 2005, makes selected graph neighborhoods resemble recognizable structural primitives while retaining their connections to the surrounding graph. This draft reviews that proposal and examines its re-implementation in Freshmind 4, a TypeScript port and extension of concepts developed in Java Freshmind between 2002 and 2014. We distinguish increased attraction, direct angular reinforcement, the original longitudinal approximation, and an added spring with an explicit preferred focal radius. Three deterministic synthetic examples and controlled ablations show that angular regularity and radial regularity require separate controls. We derive the discrepancy of the 2005 chord approximation for unequal radii and analyze oscillation using the actual TouchGraph integration equations. A movable six-branch center introduces a radial mode four times stiffer than the corresponding pinned-center mode. Recorded runs illustrate how lowering force rigidity suppresses a persistent large-amplitude oscillation. These are mechanism tests and local stability calculations; they do not establish perceptual benefit, general convergence or performance on large graphs.

## 1. Reviewing the 2005 proposal

The original [Reinforcement Focus+Context paper](../literature/rfc@3ia05compact.pdf), especially Section 2.2 and Figures 1–3, separates three ways of emphasizing graph content: selecting or aggregating structure, distorting displayed geometry, and reinforcing a recognizable local arrangement. RFC belongs to the third category. Its focal tree remains embedded in a graph whose other relations continue to exert layout forces. A viewing lens can subsequently magnify the region, and structural aggregation can simplify its surroundings.

This distinction remains useful in a modern interactive environment. Canvas zoom changes all displayed objects together; graph spacing changes displayed distances; a fisheye lens changes the spatial allocation of screen area. None of these operations alone regularizes the underlying physical arrangement of a focal neighborhood. RFC does so by modifying the embedding forces.

The paper proposes stronger focal springs and an angular moment between cyclically neighboring branches. Its equation (1) makes the moment proportional to the difference between the current gap and $2\pi/N$. Equation (2) offers a longitudinal neighbor-to-neighbor approximation, using a weighted distance to accommodate horizontally extended labels. It also discusses exclusion of non-focal vertices from an elliptical region, multiple foci, reduced reinforcement for shared branches, and combinations with structural aggregation. Its observations for moderate degree, approximately $2<N<15$, are qualitative. The figures demonstrate the concept but do not supply a controlled numerical comparison, convergence study, force constants or user study.

Freshmind 4 currently implements one visible, depth-one focal star. Exclusion, multiple foci and aggregation remain future work. The Java implementation was experimental and developed under time pressure; it is useful evidence of intended features, rather than a complete algorithmic specification. This draft therefore separates the original concepts, explicit reconstruction choices, and new extensions.

Force-directed drawing provides the broader setting: Fruchterman and Reingold describe a spring-embedding heuristic seeking regular edge lengths ([1991](https://doi.org/10.1002/spe.4380211102)). The actual TouchGraph equations used here are specified below; they should not be inferred from that general description. Label geometry is a separate issue. Harel and Koren examine the difficulties of treating non-uniform vertices as points and propose shape-aware extensions ([2002](https://www.weizmann.ac.il/math/harel/sites/math.harel/files/users/user56/non_uniform_avi_acm.pdf)). A weighted coordinate metric alone is a weaker provision than explicit shape collision avoidance.

## 2. Reconstructing the forces

Let $v_i=x_i-x_0$ be the displacement from focal center $x_0$ to branch $i$. Define

$$
W=\operatorname{diag}(\lambda_x,\lambda_y),\qquad
D_i=\sqrt{v_i^T Wv_i},\qquad
\theta_i=\operatorname{atan2}(\sqrt{\lambda_y}v_{iy},\sqrt{\lambda_x}v_{ix}).
$$

Weights are positive metric coefficients. The configuration $(0.25,1)$ stretches an ideal equal-radius arrangement horizontally by two relative to its vertical radius. Viewing transforms do not enter these expressions. Node and link importance weights are independent quantities; they are stored and styled, but do not yet modify RFC forces.

### 2.1 Increased attraction is not a preferred length

For unit weights, TouchGraph's ordinary edge force on a branch is

$$
F_{\mathrm{TG}}=-\frac{q}{100\ell}r v,\qquad r=\|v\|,
$$

where $q$ is layout rigidity and $\ell$ is the edge's physical length parameter. Despite its name, $\ell$ is a denominator controlling attraction, not a Hookean rest length. The vector force grows quadratically in radius. Increasing its multiplier therefore pulls more strongly toward zero radius; it does not hold a selected nonzero radius more firmly. For an isolated pair with repulsion magnitude $qQ/r$, equilibrium gives $r^3=100\ell Q/m$: the common rigidity factor cancels. Increasing attraction multiplier $m$ therefore changes radius proportionally to $m^{-1/3}$. This pair calculation illustrates shrinkage, rather than predicting the equilibrium of a complete star.

The earlier Freshmind 4 preset adds

$$
F_{\mathrm{extra}}=-\frac{(m-1)q}{100\ell}D Wv.
$$

This is the negative gradient of $(m-1)qD^3/(300\ell)$. With unit weights the representative focal edge has total attraction multiplier $m$. Ordinary semantic edges keep their original forces, including parallel relations.

### 2.2 Direct angular reinforcement

Sort branches cyclically by weighted angle. Let $g_i$ be their successive gaps, including the wraparound gap, and let $t=2\pi/N$. Away from a small central soft core, use

$$
E_\theta=\frac{a q}{2}\sum_i(g_i-t)^2.
$$

The resulting pair moments have magnitude $a q(g_i-t)$, following the 2005 equation (1). Conversion of a moment $M$ to physical force uses the derivative of the weighted angle:

$$
F_\theta=M\sqrt{\lambda_x\lambda_y}
\frac{(-v_y,v_x)}{\max(1,D^2)}.
$$

The determinant factor is required; applying an unweighted tangent to a weighted angle would implement a different force. Each branch contribution has an opposite reaction on the center, before TouchGraph's established/newly-visible mobility weighting. Fixed or dragged nodes retain their positions through the existing integrator. Branch order is recomputed each step; tie breaking uses stable node IDs. A regular star can have unequal radii and still have zero angular force.

### 2.3 Extension: an explicit focal length

To make the tree primitive more prominent, introduce a separate preferred weighted radius $L$, radial stiffness $k$, and soft radius $\rho=\sqrt{D^2+\varepsilon^2}$, with $\varepsilon=1$ layout unit:

$$
E_r=\frac{kq}{2}(\rho-L)^2,\qquad
F_r=-kq\frac{\rho-L}{\rho}Wv.
$$

Unlike increased attraction, this spring pushes a compressed branch outward and pulls an extended branch inward. The isolated zero-force metric radius is $\sqrt{L^2-1}$, about $119.996$ for $L=120$. Context, repulsion and other edges shift the final balance. Exactly coincident points have zero gradient; the original randomized repulsion separates them.

The default **Tree structure** preset uses $m=1$, $k=1$, $L=120$, $a=10000$. **Attraction only** retains the previous $m=3$, $k=0$, $a=300$; its name distinguishes the radial mechanism, and it still includes angular reinforcement. Strong-angle and length-only ablations below separate these effects. These parameter values are tuning choices, not recovered constants from 2005.

![Figure 1. Recorded layouts of the same crowded star after 250 batches. F is the fixed focus, R1–R6 its branches, and C1–C2 fixed context anchors. All panels share physical axes; the dotted circle has radius 120. Yellow shading denotes reinforced membership, independently of selection.](figures/rfc/01-layout-approaches.svg)

### 2.4 Reviewing the longitudinal approximation

In the weighted plane, the 2005 equation (2) uses target neighbor distance

$$
c_{05}=(r_i+r_j)\sin(\pi/N).
$$

The exact chord at desired angle $2\pi/N$ is

$$
c_*^2=(r_i-r_j)^2+4r_i r_j\sin^2(\pi/N).
$$

Subtracting the squared expressions yields the analytical extension

$$
c_*^2-c_{05}^2=(r_i-r_j)^2\cos^2(\pi/N)\geq0.
$$

Thus the approximation is exact for equal radii, and for $N=2$, but otherwise requests a shorter chord than equal angles require. For $N=6$, $r_i/r_j=4$, and $r_j=1$, the original target is $2.5$, below the geometrically feasible minimum chord $|r_i-r_j|=3$; the equal-angle chord is $\sqrt{13}\approx3.606$. Fixed radii cannot satisfy that target. Movable radii can respond by deforming the star. This derivation identifies a limitation, without asserting that every use of the approximation fails. An explicit length constraint makes equal-radius assumptions more plausible. Freshmind 4 currently uses direct angular moments, rather than implementing equation (2).

![Figure 2. Left: total focal attraction for m=3, physical edge parameter 60 and rigidity 1, compared with the added length spring k=1, L=120. These are individual force components; repulsion and other graph forces are omitted. Right: exact and approximate chords for N=6, including the feasibility lower bound.](figures/rfc/02-force-and-chord.svg)

## 3. Controlled implementation experiments

Three synthetic graphs each contain nine nodes, twelve semantic relations, six focal branches, and two competing context anchors. The crowded-star example has mildly unequal initial radii; unequal-radii also varies physical focal edge parameters from 20 to 120. Wide-labels stretches the initial geometry and context horizontally, uses long labels, and sets coordinate weights to $(0.25,1)$. Physics still treats vertices as points: the long text itself adds no collision force.

Each method starts from identical coordinates within its fixture. The seeded random source is `0x1234abcd`; it is used only for coincident-node separation. Each run executes 250 batches of ten TouchGraph integration steps. Main comparisons fix the center and context anchors; separate runs release the center. Baseline forces use unweighted physical coordinates, while reported RFC gap and length errors use each fixture's stated metric. The baseline's metric is only a measurement convention. These three configurations are examples, not independent statistical replications.

Angular error is RMS deviation of cyclic weighted gaps from $2\pi/6$. Length error is RMS deviation of weighted focal radius from 120. Coordinates, traces, semantic endpoints and settings are retained in [the experiment records](../experiments/rfc-single-focus/results.json). The controlled ablations keep $m=1$: strong angles use $(k,a)=(0,10000)$; length only uses $(1,0)$; the combined tree uses $(1,10000)$.

| Fixture | Earlier attraction + angles: angle / length RMS | Strong angles: angle / length RMS | Length + angles: angle / length RMS |
| --- | ---: | ---: | ---: |
| Crowded star | 0.2793 / 53.07 | 0.0488 / 15.08 | 0.0309 / 5.56 |
| Unequal radii | 0.2903 / 54.31 | 0.0324 / 59.25 | 0.0310 / 6.97 |
| Wide labels | 1.3571 / 12.13 | 0.1777 / 70.89 | 0.1973 / 27.68 |

Angles are in radians; lengths are weighted layout units. The combined method has much lower angular error than the earlier preset in all three examples. The ablation prevents attributing this change entirely to radial stiffness: stronger angular reinforcement alone already explains much of it. Adding the length spring mainly controls radial irregularity, particularly in unequal-radii. Length-only reinforcement keeps radii close to target but leaves angular errors of approximately 1.17, 1.17 and 1.54 radians. Both controls matter.

The wide-label result preserves a tradeoff. The earlier layout's low length error accompanies tightly bunched branches. Spreading them around the center increases competition with fixed context anchors, so its combined length error increases relative to that earlier preset, while remaining lower than the strong-angle ablation. Smaller error in one metric is not a complete quality ranking.

![Figure 3. Five-method ablation on the three fixtures. Separate panels avoid combining quantities with different units. Length regularity alone does not produce evenly spaced branches.](figures/rfc/03-ablation.svg)

A 48-run sweep crosses radial stiffness $0.25,0.5,1,2$ with angular stiffness $300,3000,10000,30000$. At angular stiffness 10000, increasing radial stiffness lowers length error in all three pinned-center examples. This does not justify choosing the stiffest setting: releasing the focal center changes both the available geometry and the numerical modes.

![Figure 4. Pinned-center stiffness sweep; the yellow square marks the default. Color scales are shared within each metric, with distinct scales for angle and length. These are final errors at a fixed computation budget, not convergence guarantees.](figures/rfc/04-stiffness-sweep.svg)

## 4. Oscillations and damping

### 4.1 The actual discrete update

Oscillation depends on the solver as well as the force model. TouchGraph retains half the last damped displacement as momentum, adds new forces, multiplies by an adaptive damper, and caps each coordinate's displacement to 30. Its stored quantity is not a velocity with an explicit physical timestep.

Consider a smooth scalar mode near equilibrium, with error $e_t$, force $-\kappa e_t$, retained momentum $p_t$, constant damper $0<d\leq1$, no cap, and an unfixed coordinate. One actual integration step becomes

$$
\begin{pmatrix}e_{t+1}\\p_{t+1}\end{pmatrix}=
\begin{pmatrix}1-d\kappa&d\\-d\kappa/2&d/2\end{pmatrix}
\begin{pmatrix}e_t\\p_t\end{pmatrix}.
$$

The determinant is $d/2$ and the trace is $1+d/2-d\kappa$. Requiring both eigenvalues to lie inside the unit circle gives

$$
0<d\kappa<2+d.
$$

This is a local stability condition for a positive-curvature mode, not a proof for the nonlinear graph. At full damper, stability requires $\kappa<3$. Complex roots occur when $(1+d/2-d\kappa)^2<2d$; their modulus is $\sqrt{d/2}$. At $d=1$, the oscillatory interval is approximately $0.0858<\kappa<2.9142$. Oscillation is therefore compatible with decay. The problematic case is a root whose magnitude exceeds one, producing growth or, after clipping, a persistent bounded cycle.

### 4.2 Why a movable center changes the result

For an ideal regular star with unit metric and no other forces, ignore the negligible one-unit soft core. With a pinned center, the radial spring's branch curvature is $kq$. With a freely moving center, form the matrix of radial edge derivatives $B$, with one row per branch. For six equally spaced unit directions collected in $U$, $BB^T=I+UU^T$, and $U^TU=3I$. The nonzero radial Hessian eigenvalues are therefore $kq$ four times and $4kq$ twice. Translation and other unconstrained modes remain zero. Releasing the center introduces coupled modes with four times the curvature.

At $k=2$, $q=1$, a curvature estimate of 8 exceeds the full-damper bound of 3. The scalar condition requires $d<2/7\approx0.286$. At $k=1$, the corresponding estimate is 4 and requires $d<2/3$. These estimates omit ordinary attraction, repulsion, angular coupling and unequal geometry, but explain why pinned-center tuning can hide a numerical problem. For angular reinforcement alone on a pinned regular equal-radius star, nonzero tangent-mode curvatures are

$$
\kappa_j=\frac{4aq}{L^2}\sin^2(\pi j/N).
$$

At $N=6$, $L=120$, $a=10000$, the largest is about 2.778; raising $a$ to 30000 yields about 8.333. Shorter radii increase this stiffness quadratically. Anisotropic metric coefficients and center coupling change the spectrum further.

### 4.3 Recorded oscillation and a conservative remedy

The movable-center crowded-star runs retain the original adaptive damping and all ordinary forces. Only radial stiffness and, in one case, overall rigidity change:

| Radial k | Rigidity q | Final angle RMS | Final length RMS | Maximum net displacement in final batch | Final damper |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 0.00745 | 1.307 | 0.5921 | 0.2605 |
| 2 | 1 | 0.22670 | 33.576 | 29.3014 | 0.9149 |
| 2 | 0.25 | 0.01475 | 0.837 | 0.0229 | 0.7786 |

The stiff run retains large movement. Lowering rigidity to 0.25 reduces the isolated radial curvature estimate from 8 to 2, inside the full-damper bound, and substantially reduces observed movement. `setRigidity()` applies after the first ten-step batch, so the low-rigidity run shares the initial full-rigidity batch. This is a recorded experiment, not a new default damping algorithm or an RFC control exposed in the UI. The existing default instead uses moderate radial stiffness 1.

![Figure 5. Left: exact scalar recurrence without clipping or adaptive damping, illustrating stable oscillation, instability and stabilization by a smaller damper. Right: measured net movement per sampled batch in the full movable-center graph. Lower rigidity reduces the stiff run's motion. The two panels use different measures and are not fitted to each other.](figures/rfc/05-oscillation-and-damping.svg)

### 4.4 Practical damping choices

First, choose length, angular stiffness and force scale separately. Increasing all strengths can make a pattern visually convincing while undermining integration. Reducing global rigidity scales ordinary and RFC forces together, preserving their relative strength and, outside regularization/discrete effects, their equilibrium. Reducing only radial stiffness changes the competing equilibrium. A smaller damper reduces both force response and retained momentum. It can stabilize a stiff mode, but may freeze an inaccurate intermediate layout if driven to zero prematurely.

Second, distinguish force residual, actual displacement, clipping frequency and kinetic-like state. TouchGraph's `maxMotion` includes uncapped accumulated displacement even for pinned nodes. It is therefore not the maximum actual movement of movable vertices. Its adaptive rule only decreases the damper under certain motion-ratio conditions; persistent alternating motion can keep it high. The experiment reports actual net position changes across ten-step batches, which can still alias rapid oscillations. Future diagnostics should sample every integration step, track velocity sign changes and count clipped updates.

Third, stiffness-aware scaling could estimate a local Hessian bound $\Lambda$ and choose force scale $s$ with a safety margin under $ds\Lambda<2+d$. A row-sum bound or a small focal-block eigensolve could be practical, but it must include context coupling and weighted geometry. A changing branch order, a repulsion cutoff and newly-local mobility weights limit the applicability of smooth Hessian analysis. This proposal is not yet implemented or validated.

Finally, an optional solver with explicit timestep and consistent velocity damping could subdivide stiff steps or use an implicit treatment of the length constraints. Merely repeating the current loop or dividing forces without rescaling momentum is not equivalent to integrating smaller physical timesteps. Likewise, reducing the retained-momentum fraction is not by itself a stability guarantee: for retention $\beta$, the same derivation gives $d\kappa<2+2\beta d$. Solver experiments should live behind an extension, preserving the faithful TouchGraph baseline.

## 5. Interaction and implementation boundaries

Freshmind's RFC module registers additional forces through a generic TouchGraph hook before integration. Semantic graph data never gains artificial constraint edges. A focal star deduplicates parallel/reciprocal relations using stable IDs, while the baseline still simulates every semantic edge. This policy is deterministic but introduces dependence on the chosen representative edge's physical parameter when attraction reinforcement is used.

RFC focus is separate from selection, viewing-lens focus and neighborhood origin. Once RFC is enabled, a second Return or double-click on an already centered node transfers reinforcement to it and wakes the layout. The first such command on another node centers it normally. Hidden centers suspend reinforcement; graph replacement clears it. Soft yellow halos behind focal nodes and their reinforced relations identify active membership without obscuring labels or changing picking. This visual cue is an interface choice whose perceptual benefit remains untested.

Weighted geometry is complementary to these interaction rules. Equal weighted angles produce an ellipse, not equal physical angles. Neither an ellipse nor a target radius guarantees separation of labels of varying dimensions. Focal-region exclusion is still absent, so context nodes may enter the same area.

![Figure 6. Ideal weighted stars with L=120. The second metric doubles horizontal radius while retaining equal angles in transformed coordinates. This analytical drawing is not an experimental layout or a guarantee against overlapping labels.](figures/rfc/06-weighted-geometry.svg)

## 6. Discussion and next experiments

The reconstruction supports a narrower, reproducible reading of the original proposal: a locally regular structural primitive can coexist with competing ordinary graph forces. The extension makes two objectives explicit. Angular reinforcement distributes branches; a preferred-length spring keeps them near a chosen focal radius. Their interaction depends on context, metric and solver dynamics. The unequal-radius chord calculation and discrete stability bound provide explanations that were absent from the original presentation.

The evidence remains limited to degree six, three hand-designed starting configurations, a fixed computation budget and one deterministic random stream. We have not measured task completion, comprehension, edge crossings, label overlap, mental-map preservation or large-graph performance. Moving-center runs also change the layout's orientation and position, so lower errors are not solely evidence of a better solver. The results should motivate broader testing rather than a claim that one preset is universally optimal.

Next steps are explicit node/link force-weight semantics, focal-region exclusion, multiple centers and shared branches, then structural aggregation. Importance, mass and spring strength should be separate concepts: changing mass changes dynamics, while changing force weights changes equilibrium and curvature. Multi-focus constraints will add further coupled stiff modes, making per-step diagnostics and a solver comparison especially valuable. An evaluation should vary degree, initialization, label dimensions and context strength, and compare direct angular moments with both original and corrected chord constraints. A user study is needed before treating numerical regularity as evidence of intelligibility.

## Reproducibility and references

Run `just rfc-experiment`, `just rfc-plot`, and `just rfc-figures` from the repository root. `just rfc-paper` regenerates those artifacts and renders this draft to PDF. The scripts use only synthetic graphs and analytical equations. No proprietary example data or reconstructed screenshots from the 2005 paper are used. Figures are supplied as SVG, PDF and PNG; [stability-calculations.json](figures/rfc/stability-calculations.json) records eigenvalue checks. The [figure source](../../scripts/rfc-paper-figures.py), [fixture source](../../tests/fixtures/rfc.mjs), and [implementation design](../rfc-design.md) specify the remaining details. The pre-extension implementation was checkpointed as `8414b9a`; the recorded results describe the revised sources supplied with this draft.

1. Gregor Heinrich. **Reinforcement Focus+Context.** 2005. [Original six-page paper](../literature/rfc@3ia05compact.pdf).
2. Thomas M. J. Fruchterman and Edward M. Reingold. **Graph drawing by force-directed placement.** *Software: Practice and Experience* 21(11), 1129–1164, 1991. [DOI](https://doi.org/10.1002/spe.4380211102).
3. David Harel and Yehuda Koren. **Drawing Graphs with Non-Uniform Vertices.** *AVI 2002*. [Author-hosted paper](https://www.weizmann.ac.il/math/harel/sites/math.harel/files/users/user56/non_uniform_avi_acm.pdf).

This draft and its drawings were prepared by Gregor Heinrich with assistance from Codex GPT-6.1. Analytical extensions and experimental conclusions require author review before publication.
