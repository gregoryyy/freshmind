# Reinforcement Focus+Context revisited: local structure, radial constraints and stable interaction

**Gregor Heinrich** · Freshmind 4 · 23 October 2026

**Second draft — implementation study and analytical extensions; not peer reviewed**

## Abstract

Reinforcement Focus+Context (RFC), introduced in 2005, makes selected graph neighborhoods resemble recognizable structural primitives while retaining their connections to the surrounding graph. This draft reviews that proposal and examines its re-implementation in Freshmind 4, a TypeScript port and extension of concepts developed in Java Freshmind between 2002 and 2014. We distinguish increased attraction, direct angular reinforcement, the original longitudinal approximation, and an added spring with an explicit preferred focal radius. Three deterministic synthetic examples and controlled ablations show that angular regularity and radial regularity require separate controls. We derive the discrepancy of the 2005 chord approximation for unequal radii and analyze oscillation using the actual TouchGraph integration equations. A movable six-branch center introduces a radial mode four times stiffer than the corresponding pinned-center mode. Recorded runs illustrate how lowering force rigidity suppresses a persistent large-amplitude oscillation. A separate opt-in experiment detects repeated movement reversals, applies local damping and gradually restores motion after a quiet interval. Three further experiments compare multiple depth-two tree foci, additional leaf relations and shared subtrees across 120 matched runs. They expose context costs, clipped-motion outliers and infeasible pinned-root length targets. These are mechanism tests and local stability calculations; they do not establish perceptual benefit, general convergence or performance on large graphs.

## 1. Reviewing the 2005 proposal

The original [Reinforcement Focus+Context paper](../literature/rfc@3ia05compact.pdf), especially Section 2.2 and Figures 1–3, separates three ways of emphasizing graph content: selecting or aggregating structure, distorting displayed geometry, and reinforcing a recognizable local arrangement. RFC belongs to the third category. Its focal tree remains embedded in a graph whose other relations continue to exert layout forces. A viewing lens can subsequently magnify the region, and structural aggregation can simplify its surroundings.

This distinction remains useful in a modern interactive environment. Canvas zoom changes all displayed objects together; graph spacing changes displayed distances; a fisheye lens changes the spatial allocation of screen area. None of these operations alone regularizes the underlying physical arrangement of a focal neighborhood. RFC does so by modifying the embedding forces.

The paper proposes stronger focal springs and an angular moment between cyclically neighboring branches. Its equation (1) makes the moment proportional to the difference between the current gap and $2\pi/N$. Equation (2) offers a longitudinal neighbor-to-neighbor approximation, using a weighted distance to accommodate horizontally extended labels. It also discusses exclusion of non-focal vertices from an elliptical region, multiple foci, reduced reinforcement for shared branches, and combinations with structural aggregation. Its observations for moderate degree, approximately $2<N<15$, are qualitative. The figures demonstrate the concept but do not supply a controlled numerical comparison, convergence study, force constants or user study.

The initial numerical reconstruction uses one visible, depth-one focal star. Experiments C–E below extend the comparison to two depth-two tree foci, ordinary leaf links and shared subtrees. The software also supports DAG memberships and clustering, but these are outside the new numerical comparisons. Exclusion of overlapping regions and aggregation remain future work. The Java implementation was experimental and developed under time pressure; it is useful evidence of intended features, rather than a complete algorithmic specification. This draft therefore separates the original concepts, explicit reconstruction choices, and new extensions.

Force-directed drawing provides the broader setting: Fruchterman and Reingold describe a spring-embedding heuristic seeking regular edge lengths ([1991](https://doi.org/10.1002/spe.4380211102)). The actual TouchGraph equations used here are specified below; they should not be inferred from that general description. Label geometry is a separate issue. Harel and Koren examine the difficulties of treating non-uniform vertices as points and propose shape-aware extensions ([2002](https://www.weizmann.ac.il/math/harel/sites/math.harel/files/users/user56/non_uniform_avi_acm.pdf)). A weighted coordinate metric alone is a weaker provision than explicit shape collision avoidance.

## 2. Reconstructing the forces

Let $v_i=x_i-x_0$ be the displacement from focal center $x_0$ to branch $i$. Define

$$
W=\operatorname{diag}(\lambda_x,\lambda_y),\qquad
D_i=\sqrt{v_i^T Wv_i},\qquad
\theta_i=\operatorname{atan2}(\sqrt{\lambda_y}v_{iy},\sqrt{\lambda_x}v_{ix}).
$$

Weights are positive metric coefficients. The configuration $(0.25,1)$ stretches an ideal equal-radius arrangement horizontally by two relative to its vertical radius. Viewing transforms do not enter these expressions. Node and link importance weights are independent quantities. The recorded experiments use their neutral defaults. A subsequent [implementation extension](../rfc-importance.md) scales added constraint stiffness through bounded importance factors while retaining those default results; it is functionally tested rather than evaluated as another experiment here.

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

![Figure 1](figures/rfc/01-layout-approaches.svg)

*Figure 1. Recorded layouts of the same crowded star after 250 batches. F is the fixed focus, R1–R6 its branches, and C1–C2 fixed context anchors. All panels share physical axes; the dotted circle has radius 120. Yellow shading denotes reinforced membership, independently of selection.*

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

![Figure 2](figures/rfc/02-force-and-chord.svg)

*Figure 2. Left: total focal attraction for m=3, physical edge parameter 60 and rigidity 1, compared with the added length spring k=1, L=120. These are individual force components; repulsion and other graph forces are omitted. Right: exact and approximate chords for N=6, including the feasibility lower bound.*

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

![Figure 3](figures/rfc/03-ablation.svg)

*Figure 3. Five-method ablation on the three fixtures. Separate panels avoid combining quantities with different units. Length regularity alone does not produce evenly spaced branches.*

A 48-run sweep crosses radial stiffness $0.25,0.5,1,2$ with angular stiffness $300,3000,10000,30000$. At angular stiffness 10000, increasing radial stiffness lowers length error in all three pinned-center examples. This does not justify choosing the stiffest setting: releasing the focal center changes both the available geometry and the numerical modes.

![Figure 4](figures/rfc/04-stiffness-sweep.svg)

*Figure 4. Pinned-center stiffness sweep; the yellow square marks the default. Color scales are shared within each metric, with distinct scales for angle and length. These are final errors at a fixed computation budget, not convergence guarantees.*

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

![Figure 5](figures/rfc/05-oscillation-and-damping.svg)

*Figure 5. Left: exact scalar recurrence without clipping or adaptive damping, illustrating stable oscillation, instability and stabilization by a smaller damper. Right: measured net movement per sampled batch in the full movable-center graph. Lower rigidity reduces the stiff run's motion. The two panels use different measures and are not fitted to each other.*

### 4.4 Practical damping choices

First, choose length, angular stiffness and force scale separately. Increasing all strengths can make a pattern visually convincing while undermining integration. Reducing global rigidity scales ordinary and RFC forces together, preserving their relative strength and, outside regularization/discrete effects, their equilibrium. Reducing only radial stiffness changes the competing equilibrium. A smaller damper reduces both force response and retained momentum. It can stabilize a stiff mode, but may freeze an inaccurate intermediate layout if driven to zero prematurely.

Second, distinguish force residual, actual displacement, clipping frequency and kinetic-like state. TouchGraph's `maxMotion` includes uncapped accumulated displacement even for pinned nodes. It is therefore not the maximum actual movement of movable vertices. Its adaptive rule only decreases the damper under certain motion-ratio conditions; persistent alternating motion can keep it high. The experiment reports actual net position changes across ten-step batches, which can still alias rapid oscillations. Future diagnostics should sample every integration step, track velocity sign changes and count clipped updates.

Third, stiffness-aware scaling could estimate a local Hessian bound $\Lambda$ and choose force scale $s$ with a safety margin under $ds\Lambda<2+d$. A row-sum bound or a small focal-block eigensolve could be practical, but it must include context coupling and weighted geometry. A changing branch order, a repulsion cutoff and newly-local mobility weights limit the applicability of smooth Hessian analysis. This proposal is not yet implemented or validated.

Finally, an optional solver with explicit timestep and consistent velocity damping could subdivide stiff steps or use an implicit treatment of the length constraints. Merely repeating the current loop or dividing forces without rescaling momentum is not equivalent to integrating smaller physical timesteps. Likewise, reducing the retained-momentum fraction is not by itself a stability guarantee: for retention $\beta$, the same derivation gives $d\kappa<2+2\beta d$. Solver experiments should live behind an extension, preserving the faithful TouchGraph baseline.

### 4.5 Weighted geometry

Coordinate weights also affect physical geometry and the curvatures encountered by the integrator. Equal angles in weighted coordinates produce an ellipse in physical coordinates. Figure 6 illustrates the ideal geometry, rather than a simulated equilibrium; it does not establish stability or label separation.

![Figure 6](figures/rfc/06-weighted-geometry.svg)

*Figure 6. Ideal weighted stars with L=120. The second metric doubles horizontal radius while retaining equal angles in transformed coordinates. This analytical drawing is not an experimental layout or a guarantee against overlapping labels.*

## 5. Experiment B: adaptive damping and annealed recovery

The force and rigidity comparisons above explicitly disable adaptive RFC damping. This second experiment retains the chosen force model and adds a local controller that responds to observed movement. It is opt-in in the browser and library, rather than a new default or a replacement for TouchGraph's integrator.

At each force callback, the detector compares the current positions with those observed at the preceding integration step. Fixed vertices are excluded. A reversal requires displacement vectors separated by more than 120°, both longer than 0.5 physical layout units, with current magnitude at least 80% of the previous magnitude. A step votes for oscillation when such reversals account for more than half the movable focal members' displacement energy. Three votes within eight steps trigger damping. These heuristic thresholds reject steady translation, negligible jitter and rapidly decaying reversals in regression tests; they are not a spectral classifier and can miss slower or smaller oscillations.

Each detection halves local gain $g$, down to $1/256$. After RFC forces have been accumulated, this gain multiplies the movable focal members' accumulated impulses, including retained momentum and previously accumulated ordinary forces. Thus configured angular/radial constants remain unchanged. Scaling only added RFC forces would instead change their competition with the rest of the graph. In an isolated focal mode the effective damper becomes $d'=dg$, giving the local condition $0<dg\kappa<2+dg$. The complete graph includes undamped context modes and nonlinear coupling, so this remains an explanation rather than a guarantee.

Recovery requires every sampled movable focal member to move at most 0.1 layout units per step for 500 ms of observed integration. It then follows a three-second cubic easing:

$$
g(t)=g_0+(1-g_0)(3u^2-2u^3),\qquad u=\min\left(1,\frac{t}{3000\,\mathrm{ms}}\right).
$$

The gain has zero slope at both ends of an uninterrupted recovery. Larger movement interrupts recovery and requires another quiet interval; new oscillation halves the current gain again. Dragging a focal member bypasses damping and discards detector history. Each sample contributes at most 50 ms to the recovery clock. A gap longer than 250 ms discards quiet/recovery history while preserving the current gain, so pausing cannot complete an anneal. An optional extension-activity hook keeps the existing runner sampling until recovery finishes, even if global cooling would otherwise make it sleep; it never restarts an explicitly stopped layout. No separate timers run. Focus changes/removal and suspension clear learned damping; configuration/topology changes start a fresh observation window. The detector is physical-coordinate based and independent of zoom or the viewing lens.

For reproducibility, each off/on pair uses the same initial graph, movable center, fixed context anchors, radial stiffness 2, angular stiffness 10000 and global rigidity 1. Runs last 400 ten-step batches. An injected monotonic clock advances two milliseconds per integration step, corresponding to eight simulated seconds. This convention models the normal 20 ms batch cadence without requiring wall-clock delays; it is not a performance measurement. Browser recovery uses actual monotonic time observed during integration. Records are in [adaptive-damping.json](../experiments/rfc-single-focus/adaptive-damping.json).

| Fixture | Damping | Tail motion RMS | Final angular RMS | Final length RMS | Detections | Final local gain |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Crowded star | off | 6.69492 | 0.01463 | 0.833 | 0 | 1.000 |
| Crowded star | on | 0.00591 | 0.01476 | 0.836 | 5 | 0.713 |
| Unequal radii | off | 0.92606 | 0.00610 | 1.623 | 0 | 1.000 |
| Unequal radii | on | 0.29569 | 0.00847 | 1.548 | 4 | 1.000 |
| Wide labels | off | 0.15915 | 0.02786 | 5.656 | 0 | 1.000 |
| Wide labels | on | 0.00000 | 0.02089 | 6.405 | 4 | 0.978 |

Tail motion is RMS of the ten sampled net batch displacements at batches 310–400; it is not the last batch alone. The detector samples each integration step, while the report retains its last observed per-step maximum at each recorded point. Off runs can also cool eventually under the inherited global damper. The on runs reduce tail movement in all three fixtures; the unequal-radii case gains less than the crowded star. Angular and length errors do not improve uniformly. At the cutoff, crowded-star and wide-labels are still recovering their local gain; only unequal-radii has fully restored it. The inherited global damper can already have frozen positions during that recovery.

![Figure 7](figures/rfc/07-adaptive-damping.svg)

*Figure 7. Separate damping experiment. Left: net sampled batch movement, floored at 10⁻⁶ for the logarithmic display. Right: local impulse gain with detection backoffs and gradual recovery. Identical force settings are used within each off/on pair; all centers are movable.*

This experiment supports adaptive suppression of visible oscillation on these fixtures, not general convergence. A positive gain preserves the underlying zero-force equations in the local idealization, but changes the trajectory and can select a different local arrangement. The finite gain floor, movement thresholds, context coupling, observation cadence and inherited cooling remain limitations. Future comparisons should include per-step spectra, clipping counts, alternative recovery durations and larger/multiple focal structures. Hessian-based stiffness control remains a separate, unimplemented alternative.

## 6. Experiments C–E: multiple tree foci

### 6.1 Matched protocol and observables

We now examine stored trees with descendants, retaining the same force laws and integration scheme. Each tree has one root, two intermediate vertices and four leaves. Angular constraints apply at every tree vertex of degree at least two, including the parent relation at intermediate vertices. All selected tree edges receive the length spring. An ordinary semantic relation outside a definition continues to exert its original embedding force, without becoming a reinforcement constraint.

Three topology families are crossed with four activation conditions (neither tree, left only, right only, both), two root conditions (movable or pinned), and five starting layouts: **120 runs of 250 ten-step batches**. Each starting layout perturbs nominal coordinates independently by uniform offsets in $[-40,40)$ using a recorded seeded LCG. Conditions share the same initial positions; pinning changes only the roots' fixed flags. All runs use unit coordinate weights, target length 120, radial stiffness 1, angular stiffness 10000 and attraction multiplier 1. Experimental adaptive RFC damping is **off**; the inherited TouchGraph damper remains active. These runs test the existing multiple-center mechanism rather than a new solver or tuned parameter search.

We score both stored trees in every condition, even when one or both are inactive. Tree angle RMS includes every cyclic gap at every degree-two-or-higher vertex, weighted by the number of gaps. Tree length RMS measures endpoint-distance errors against 120 on its six selected edges. The union metrics deduplicate shared edges and use the combined local neighborhoods, giving a fixed comparison observable across activation conditions. They need separate interpretation where trees overlap. Tail motion is measured across the **last 100 individual integration steps**, over movable vertices, rather than across net ten-step batches. A passive observer reads positions before integration and at each batch end; no force or integration hook is changed. Full coordinates, per-tree measurements, min/max summaries, traces and seeds are in the [multi-focus records](../experiments/rfc-multifocus/results.json).

The table reports means across five initializations for movable roots. Means are descriptive; five designed perturbations do not support population confidence claims. Figures 8–10 show the first recorded seed, 0x1234abcd, rather than a selected best run. Complete pinned-root comparisons and the right-only controls remain in the [experiment report](../experiments/rfc-multifocus/README.md).

| Topology | Active foci | Left angle RMS | Right angle RMS | Union angle RMS | Union length RMS |
| --- | --- | ---: | ---: | ---: | ---: |
| Joined trees | Neither | 0.8610 | 0.8611 | 0.8610 | 43.36 |
| Joined trees | Left | 0.0134 | 0.9751 | 0.6896 | 36.69 |
| Joined trees | Both | 0.0254 | 0.0253 | 0.0254 | 2.42 |
| Leaf-connected trees | Neither | 0.6872 | 0.6872 | 0.6872 | 47.72 |
| Leaf-connected trees | Left | 0.0379 | 0.7328 | 0.5189 | 38.52 |
| Leaf-connected trees | Both | 0.1852 | 0.0861 | 0.1466 | 15.97 |
| Shared subtree | Neither | 0.7714 | 0.7714 | 0.3934 | 39.88 |
| Shared subtree | Left | 0.0035 | 0.9624 | 0.3731 | 34.47 |
| Shared subtree | Both | 0.4707 | 0.4707 | 0.0214 | 3.41 |

### 6.2 Experiment C: two trees joined by context

Two disjoint seven-member trees are joined by one ordinary root-to-root relation, giving a complete graph with 14 vertices and 13 edges. Thus the entire graph, as well as each focal definition, is a tree. A single focus substantially reduces its own angular error while increasing the other tree's error. With movable roots, left-only changes left/right RMS from 0.8610/0.8611 to 0.0134/0.9751. Right-only gives the corresponding reversed pattern. This is a measurable context cost that would disappear in a metric restricted to the active tree.

Activating both makes both trees regular while retaining the connecting context edge: mean union angle RMS becomes 0.0254 and length RMS 2.42. Pinned roots also permit a regular result in this topology, with mean union angle RMS 0.0181 and length RMS 2.25. Movable-root tail step RMS ranges from zero to 0.1446; low shape error is therefore not synonymous with a stationary embedding. Neither condition imposes separation of the two focal regions.

![Figure 8](figures/rfc/08-joined-trees.svg)

*Figure 8. Experiment C, one fixed recorded initialization with movable roots. Green/blue denote tree membership; stars mark active roots and yellow bands identify reinforced edges. The dashed red relation is ordinary context. The three layouts use common physical axes. Lower plots include all four activation conditions and measure the union of the two stored trees. Links are drawn as straight endpoint segments to expose physical geometry, independently of the SVG edge-form setting.*

### 6.3 Experiment D: trees with additional leaf connections

The same two definitions are retained, adding one leaf-to-leaf relation within each tree and two between trees: 14 vertices and 17 semantic edges. These four relations remain ordinary context. This is a graph containing reinforced trees, without forcing its additional cycles into a tree representation.

For movable roots, baseline union length RMS is 47.72; with both foci it is 15.97. Mean union angle RMS falls from 0.6872 to 0.1466. However, these averages include a persistent large-motion case. Four both-focus runs have tail step RMS between 0.0249 and 0.0871; seed 0xdecafbad reaches **42.0850**, with maximum displacement $30\sqrt{2}\approx42.4264$, the inherited per-axis clipping limit. Its eligible displacement reversal fraction is 0.518. We retain this run rather than presenting only the four quieter layouts. The sign statistic detects substantial reversals but is not a spectral estimate.

All five pinned-root, both-focus runs have tail step RMS below 0.004. Their mean angle/length RMS values are 0.0766/10.81. Pinning changes the feasible geometry and coupled modes as well as dynamics, so this does not isolate a damping effect. Additional leaf links can make the default multi-focus configuration sensitive to starting layout even where four nearby starts appear satisfactory. Experiment B's adaptive damping is not enabled as an unreported remedy.

![Figure 9](figures/rfc/09-leaf-connected-trees.svg)

*Figure 9. Experiment D uses the same two stored trees, with four added ordinary leaf relations shown dashed red. This first-seed layout is one of the quieter runs; it must be read with Figure 11, which retains the oscillatory initialization. The bottom traces measure union gap and length errors under each activation condition.*

### 6.4 Experiment E: overlapping tree membership and feasibility

The trees now share one intermediate vertex and its two leaves. Their union has 11 vertices and 10 edges and remains a tree. Each definition still has seven vertices and six edges. The controller applies shared radial constraints once, merges local angular neighborhoods and attenuates angular moments according to shared membership. Purple vertices in Figure 10 belong to both trees.

With movable roots and both foci, mean union gap RMS is 0.0214 and length RMS 3.41. Individual-tree gap RMS remains approximately 0.4707. This is not contradictory: the shared vertex has degree four in the union but degree three in either stored tree. Four equal union gaps are 90°; removing one neighbor leaves gaps of 90°, 90° and 180°, rather than the individual tree's 120°. Their local RMS deviation from 120° is $\pi/(3\sqrt{2})$. In a seven-member tree there are eight scored gaps (two at the root and three at each intermediate vertex). If all other local gaps were exact, this single merged vertex would contribute

$$
\sqrt{\frac{3}{8}}\,\frac{\pi}{3\sqrt{2}}=\frac{\pi}{4\sqrt{3}}\approx0.4534
$$

to that tree's overall RMS. This calculation explains why demanding a zero individual-tree score would misjudge a regular merged neighborhood. It is an ideal geometric reference, not a bound on arbitrary layouts or proof of the controller's optimality.

Pinning adds a distinct obstruction. The two roots reach the shared vertex through two selected edges of preferred length $L=120$. If their fixed separation is $D>2L$, triangle inequality prevents both edges from attaining their target. More generally, for a path of $q$ selected edges among $M$ unique tree edges, triangle inequality and Cauchy–Schwarz imply

$$
\mathrm{RMS}_{\mathrm{length,union}}\ \geq\ \frac{\max(0,D-qL)}{\sqrt{qM}}.
$$

Here $q=2$, $M=10$, so the bound is $\max(0,D-240)/\sqrt{20}$. Each run records this feasibility bound. With roots pinned, both-focus mean union length RMS is 48.96, compared with 3.41 when roots can move. Four pinned runs cool to negligible movement despite substantial geometric residuals; the fifth, seed 0x9e3779b9, has tail step RMS 36.0468 and reversal fraction 0.833. Cooling, feasibility and dynamic instability are separate issues. The first cannot certify success, and the geometric lower bound cannot explain away a persistent clipped oscillation.

![Figure 10](figures/rfc/10-shared-subtree.svg)

*Figure 10. Experiment E, movable roots and a shared subtree. Purple vertices belong to both stored trees. Shared radial edges are reinforced once. The both-focus union approaches a regular degree-four shared neighborhood while either individual tree retains a nonzero angle score. The first-seed traces also show that the finite-budget evolution need not be smooth or monotonic.*

### 6.5 What these additional experiments establish

The comparisons support coexistence of multiple reinforced trees, show a context cost under a single focus, and expose two constraints on extensions: added leaf relations can excite persistent motion, and overlapping memberships change local angular targets. Shared pinned roots can make preferred lengths infeasible before any solver is considered. Multiple centers therefore require observables for each member structure, their union and actual per-step motion.

![Figure 11](figures/rfc/11-multifocus-motion.svg)

*Figure 11. Tail motion across all 120 runs: five initializations per topology, root condition and activation mode. Points identify seeds, vertical lines span the observed range and horizontal bars mark arithmetic means. Actual per-step RMS is measured over the final 100 steps; values below 10⁻⁶ are floored for display. The clipped-motion outliers remain visible. Zero motion may reflect inherited cooling with residual geometric error.*

These are small, synthetic tree experiments, with additional semantic leaf links in Experiment D. DAG layouts, cluster selection quality, exclusion regions, label collisions, perceptual readability, crossing reduction and large graphs are not evaluated. No setting was retuned after seeing a failed seed. Comparing adaptive damping, lower rigidity or other solvers on these same recorded starts is a separate next experiment.

## 7. Interaction and implementation boundaries

Freshmind's RFC module registers additional forces through a generic TouchGraph hook before integration. Semantic graph data never gains artificial constraint edges. A focal star deduplicates parallel/reciprocal relations using stable IDs, while the baseline still simulates every semantic edge. This policy is deterministic but introduces dependence on the chosen representative edge's physical parameter when attraction reinforcement is used.

RFC focus is separate from selection, viewing-lens focus and neighborhood origin. Once RFC is enabled, a second Return or double-click on an already centered node replaces all RFC centers with that node and wakes the layout. Shift+Enter or Shift+double-click instead toggles one center while keeping the others; removing the last turns RFC off. The first such command on another node centers it normally. Hidden centers suspend reinforcement; graph replacement clears it. Soft yellow halos behind focal nodes and their reinforced relations identify active membership without obscuring labels or changing picking. This visual cue is an interface choice whose perceptual benefit remains untested.

Weighted geometry is complementary to these interaction rules. Equal weighted angles produce an ellipse, not equal physical angles. Neither an ellipse nor a target radius guarantees separation of labels of varying dimensions. Focal-region exclusion is still absent, so context nodes may enter the same area.

## 8. Discussion and next experiments

The reconstruction supports a narrower, reproducible reading of the original proposal: a locally regular structural primitive can coexist with competing ordinary graph forces. The extension makes two objectives explicit. Angular reinforcement distributes branches; a preferred-length spring keeps them near a chosen focal radius. Their interaction depends on context, metric and solver dynamics. The unequal-radius chord calculation and discrete stability bound provide explanations that were absent from the original presentation.

The single-star evidence uses degree six and three designed starting configurations. The additional tree experiments vary initialization over five seeded perturbations, activation and root constraints, but retain small, designed topologies and a fixed computation budget. We have not measured task completion, comprehension, edge crossings, label overlap, mental-map preservation or large-graph performance. Moving-center runs also change the layout's orientation and position, so lower errors are not solely evidence of a better solver. Clipped-motion outliers and the shared-root feasibility calculation further limit any universal claim for the default preset.

Next steps are focal-region exclusion, broader multiple-center/shared-membership tests, then structural aggregation. The subsequent node/link importance extension uses bounded stiffness coefficients with neutral defaults; comparative evaluation of nonuniform importance remains future work. Importance, mass and spring strength should be separate concepts: changing mass changes dynamics, while changing force weights changes equilibrium and curvature. The multi-focus clipped-motion cases motivate per-step diagnostics and a controlled damping/solver comparison on the same starts. Further evaluation should vary degree, label dimensions and context strength, and compare direct angular moments with both original and corrected chord constraints. A user study is needed before treating numerical regularity as evidence of intelligibility.

The accompanying implementation stores overlapping tree/DAG memberships, reinforces deeper tree neighborhoods and layered DAG templates, and supports center toggling through Shift+Enter/Shift+double-click. Connected components and Louvain communities can be converted into stored spanning-tree definitions. These additions do not alter the single-star numerical path used above. Their [companion design and functional example](../rfc-substructures.md) specify ownership, shared-constraint normalization and lifecycle. Experiments C–E evaluate the tree/multiple-center part; DAG templates and clustering have functional checks only. Region exclusion and label collision handling remain incomplete.

## Reproducibility and references

Run `just rfc-experiment`, `just rfc-multifocus-experiment`, `just rfc-plot`, and `just rfc-figures` from the repository root. `just rfc-paper` regenerates those artifacts and renders this draft to PDF. The scripts use only synthetic graphs and analytical equations. The original force comparisons and the multi-focus experiments keep the separate adaptive-damping experiment disabled. No proprietary example data or reconstructed screenshots from the 2005 paper are used. Figures are supplied as SVG, PDF and PNG; [stability-calculations.json](figures/rfc/stability-calculations.json) records eigenvalue checks. The [main figure source](../../scripts/rfc-paper-figures.py), [multi-focus figures](../../scripts/rfc-multifocus-figures.py), [single-star fixture](../../tests/fixtures/rfc.mjs), [multi-focus fixture](../../tests/fixtures/rfc-multifocus.mjs), and [implementation design](../rfc-design.md) specify the remaining details. The pre-extension implementation was checkpointed as `8414b9a`; the recorded results describe the revised sources supplied with this draft.

1. Gregor Heinrich. **Reinforcement Focus+Context.** 2005. [Original six-page paper](../literature/rfc@3ia05compact.pdf).
2. Thomas M. J. Fruchterman and Edward M. Reingold. **Graph drawing by force-directed placement.** *Software: Practice and Experience* 21(11), 1129–1164, 1991. [DOI](https://doi.org/10.1002/spe.4380211102).
3. David Harel and Yehuda Koren. **Drawing Graphs with Non-Uniform Vertices.** *AVI 2002*. [Author-hosted paper](https://www.weizmann.ac.il/math/harel/sites/math.harel/files/users/user56/non_uniform_avi_acm.pdf).

This draft and its drawings were prepared by Gregor Heinrich with assistance from Codex GPT-6.1. Analytical extensions and experimental conclusions require author review before publication.
