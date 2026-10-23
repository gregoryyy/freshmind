# RFC follow-up experiments F–H

These comparisons complete roadmap **3.4.6–3.4.8** for the implemented tree/importance/cluster mechanisms. They retain the original experiments and add **780 declared runs**, each 4000 integrations, across five deterministic starts. All runs completed without nonfinite failures. Eight diagrams are provided as SVG, PDF and PNG.

| Experiment | Question | Runs | Report |
| --- | --- | ---: | --- |
| F | Adaptive damping versus lower global rigidity, with free/pinned roots | 240 | [Damping and rigidity](damping/README.md) |
| G | Nonuniform importance, saturation, zero transitions and matched wake controls | 300 | [Node and relation weights](weights/README.md) |
| H | Clusters versus TG and perimeter trees, with rigidity/overlap/external-load comparisons | 240 | [Cluster reinforcement](clusters/README.md) |

Three findings recur. Stopping movement is distinct from reaching force balance, and a force-balanced compromise can retain infeasible target error. Weighting can improve selected links while hiding large errors if low-weight terms are omitted from evaluation. Dense internal constraints preserve shape better than a tree projection here, while sparse clusters remain deformable and do not become rigid bodies simply by increasing spring strength.

`just rfc-followup-experiment` regenerates all records, condition tables, reports and figures. `just rfc-followup-figures` redraws existing records; `just rfc-followup-report` rebuilds reports from their numeric inputs. Plotting uses Matplotlib/NumPy. All inputs are synthetic, and all conditions, seed ranges and failures are retained. Headless physical drawings do not measure browser label overlap or human readability. No production force, default or renderer changed in this follow-up.

The present experimental round is complete; RFC itself remains partial. Region exclusion and hybrid filtering await implementation and their own comparisons. DAG evaluation, broader datasets, label geometry and user studies remain outside this round. See [TODO](../../TODO.md), the [earlier detector comparison](../rfc-stability/README.md) and the [second draft paper](../../papers/rfc-revisited-draft2.md). The [recording protocol](../../../scripts/lib/rfc-comparison.mjs), [runner](../../../scripts/rfc-followup-experiment.mjs), [report source](../../../scripts/rfc-followup-report.py) and [plotting source](../../../scripts/rfc-followup-figures.py) define the reproducible workflow.
