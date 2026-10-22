# Freshmind 4 milestones

Develop the browser in stages: establish a plain TouchGraph baseline, restore Freshmind functionality, then add reinforcement and graph visual search.

## Source material

- [Reinforcement Focus+Context (2005)](literature/rfc@3ia05compact.pdf): RFC layout mechanism, equations (1)–(2), and single-focus, multiple-focus, and hybrid examples.
- [Freshmind community browser (2011), thesis excerpt, pp. 212–213](literature/gheinrich-phd-thesis_p212.pdf): Figure 10.17 and the accompanying description of typed relations, neighborhood navigation, annotations, and visual queries.

## 1. Port plain TouchGraph

- [ ] 1.1 Complete the TypeScript port.
  - [x] 1.1.1 Port the core graph model, spring layout, locality browsing, and lens pipeline.
  - [x] 1.1.2 Validate layout and lens behavior against the Java reference.
  - [ ] 1.1.3 Audit remaining API and interaction gaps against the Java reference.
  - [ ] 1.1.4 Complete the remaining compatibility work within the plain TouchGraph scope.

## 2. Port Freshmind functionality from FM 2014

Use FM 2014 as the source baseline; it is essentially the version of Freshmind developed through 2011.
Use the thesis excerpt as a reference for browser behavior and presentation.

- [ ] 2.1 Review the FM 2014 source and identify the components and dependencies to port.
- [ ] 2.2 Port the typed graph model.
  - [ ] 2.2.1 Support typed nodes and labeled relations, including the authoring and citation relations illustrated in Figure 10.17.
- [ ] 2.3 Port Freshmind navigation behavior and integrate it with the browser interactions.
  - [ ] 2.3.1 Verify radius-based neighborhoods, changing the center node, and collapsing irrelevant items against the documented behavior.
- [ ] 2.4 Port labeling and the associated editors.
  - [ ] 2.4.1 Restore node details, annotations, relation labels, and hidden-link counts shown in the thesis example.
- [ ] 2.5 Port file I/O for the original Freshmind formats.
  - [ ] 2.5.1 Verify loading representative existing files.
  - [ ] 2.5.2 Verify import/export round trips preserve the supported model and labels.

## 3. Add Reinforcement Focus + Context

Base this milestone on GH's 2005 paper. RFC reinforces recognizable local structures through additional layout forces; it can be combined with the viewing lens and structural filtering.

- [x] 3.1 Add the paper reference and extract the mechanism's implementation requirements into the tasks below.
- [ ] 3.2 Implement the Reinforcement Focus + Context mechanism.
  - [ ] 3.2.1 Identify the focal tree around each center node and strengthen its edge springs.
  - [ ] 3.2.2 Reinforce even branch spacing using the angular constraint or its pairwise-force approximation in equations (1)–(2).
  - [ ] 3.2.3 Support weighted coordinate distances to accommodate horizontally extended labels.
  - [ ] 3.2.4 Repel non-focal nodes from the elliptical focal region.
  - [ ] 3.2.5 Handle multiple foci, shared branches, and overlapping focal regions.
  - [ ] 3.2.6 Combine RFC with the viewing lens and type-based structural aggregation/filtering.
- [ ] 3.3 Assemble representative test data and document how to load it.
  - [ ] 3.3.1 Recreate the single-focus, two-focus, and hybrid examples in Figures 1–3.
- [ ] 3.4 Create reproducible experiments comparing the mechanism with the plain TouchGraph baseline.
- [ ] 3.5 Record experiment settings, results, and observations.

## 4. Add graph visual search with LDA

Use the thesis excerpt as the interaction reference. Its community browser uses ETT models; this milestone introduces LDA-based retrieval with the same style of graph interaction.

- [ ] 4.1 Identify the Lucene functionality and `knowceans` dependencies required for graph visual search.
- [ ] 4.2 Port the required Lucene search functionality and integration points.
- [ ] 4.3 Port the `knowceans.lda.simple` framework.
- [ ] 4.4 Port the required utilities from `knowceans.util.*`.
- [ ] 4.5 Integrate LDA-based graph visual search methods with the browser.
  - [ ] 4.5.1 Represent term and tag queries as graph nodes linked to retrieved results.
  - [ ] 4.5.2 Allow similarity queries from existing nodes and add links to the retrieved items.
  - [ ] 4.5.3 Allow removal of irrelevant result links and retain that interaction as input for future relevance feedback.
- [ ] 4.6 Add example data and reproducible search experiments.
