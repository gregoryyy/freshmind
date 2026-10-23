# Public example graphs

These small social networks complement the approved Freshmind 2014 examples. Select them under **Load example → Public networks**. Press **Space** on a selected node to open its content, then follow a connected-node link to browse.

| Example | Nodes / relations | Useful for |
| --- | --- | --- |
| [Florentine families](florentine.fm.yaml) | 15 / 20 | Compact graph with named families and marriage links; starts at Medici, with six neighbors. Good for labels, content links and an initial RFC comparison. |
| [Zachary's karate club](karate.fm.yaml) | 34 / 78 | Two post-split club memberships, interaction weights, and a high-degree center. Starts at Member 1, with 16 neighbors; membership controls the node fill. |
| [Les Misérables](les-miserables.fm.yaml) | 77 / 254 | Named characters and weighted coappearance links. Starts with Myriel's one-hop neighborhood rather than displaying every character. Useful for focus/context navigation and hidden-neighbor counts. |

Each node has HTML content containing the dataset description, graph-derived degree/weight information, and links to connected nodes. These summaries are generated for Freshmind; they are not imported biographies or historical accounts. A marriage, observed social tie or character coappearance has its stated dataset meaning; it does not imply a general semantic relation.

## Sources and attribution

The graph representations come from the unchanged [NetworkX 3.4.2 social graph generators](https://github.com/networkx/networkx/blob/networkx-3.4.2/networkx/generators/social.py), retained as [sources/networkx-social.py](sources/networkx-social.py). NetworkX is distributed under the [BSD 3-clause license](sources/LICENSE-NETWORKX.txt); its full notice accompanies the source, native graphs and production demo. The root [NOTICE](../../NOTICE) records this dependency.

The generator documentation identifies these original references:

- Florentine families: R. L. Breiger and P. E. Pattison, *Cumulated social roles: The duality of persons and their algebras*, Social Networks 8(3), 1986, pp. 215–256. See the [NetworkX dataset documentation](https://networkx.org/documentation/stable/reference/generated/networkx.generators.social.florentine_families_graph.html).
- Karate club: W. W. Zachary, *An Information Flow Model for Conflict and Fission in Small Groups*, Journal of Anthropological Research 33, 1977, pp. 452–473. See the [NetworkX dataset documentation](https://networkx.org/documentation/stable/reference/generated/networkx.generators.social.karate_club_graph.html).
- Les Misérables: D. E. Knuth, *The Stanford GraphBase: A Platform for Combinatorial Computing*, 1993, pp. 74–87. See the [NetworkX dataset documentation](https://networkx.org/documentation/stable/reference/generated/networkx.generators.social.les_miserables_graph.html).

[provenance.json](provenance.json) records the pinned source URL, release, SHA-256, generator names and counts. Each native document also retains source, license and reference metadata. The pinned source hash is `2145605953149916941b6f14d0acc1fbed03b4a2dd0850f3e78b6427af56e26b`.

## Conversion notes

Run `just public-examples` to regenerate all three graphs from the local pinned source. It builds the TypeScript library, extracts literal data with Python's standard-library AST parser, and writes graphs through the native YAML codec. It requires no NetworkX installation or network access and never executes the vendored Python module.

- Each undirected pair becomes one Freshmind relation, with arrows disabled, backlinks enabled and `data.directed: false`. Source weights and karate-club membership survive conversion. Spring length is uniformly 70; no distance transform is inferred from source weights.
- Karate indices 0–33 become IDs `member-1`–`member-34` and labels Member 1–34. The original index remains in node metadata. The pinned adjacency matrix has asymmetric weights: extraction reproduces NetworkX's row-by-row undirected insertion, where a later nonzero reverse entry overwrites the earlier weight. Assuming a symmetric upper triangle would change this graph.
- Initial coordinates are deterministic, with the initial focus at the origin. Florentine and karate open the whole graph; Les Misérables retains all 77 nodes but initially shows only Myriel and its neighbors. These are browsing examples, not measured layout-quality benchmarks.
- Tests compare every source endpoint and weight, node identity/membership, derived degrees, internal content links and complete YAML round trips.

These public datasets are independent of the Java reference. Legacy conversion remains restricted to `berry` and `nips-fm`; the other Java datasets remain excluded.
