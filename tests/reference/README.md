# Java compatibility reference

The files below are unmodified upstream Java, pinned at commit
`0db2310283d792abbaa57746fe9fe475fe9e6ab8` in
[componavt/wikokit](https://github.com/componavt/wikokit/tree/0db2310283d792abbaa57746fe9fe475fe9e6ab8/TGWikiBrowser/src/com/touchgraph/graphlayout):

- `TGLayout.java` (1.21)
- `TGAbstractLens.java`, `TGLensSet.java`, `TGPoint2D.java`
- `interaction/HyperScroll.java` (1.06)
- `graphelements/TGForEachNode.java`, `TGForEachEdge.java`, `TGForEachNodePair.java`

`ReferenceRunner` drives the originals. `Node`, `Edge`, `TGPanel`,
`GraphListener` and `graphelements/GraphEltSet` are minimal headless test
hosts written for this port. Graph traversal order follows the original
ordered node/edge/pair loops. No physics or lens equations are replicated
inside those hosts.

`npm run test:java` compiles these files into a temporary directory and
compares the running Java code against TypeScript and the committed
`snapshots.json`. `node scripts/java-reference.mjs --write` regenerates
the snapshots after first verifying TypeScript parity. Ordinary
`npm test` uses the snapshots without requiring a JDK.

Scenario definitions and the textual input protocol are in
`../scenarios.mjs`. Exact coincidences are excluded from Java parity
because Java's `Math.random()` is not seeded by the test harness. The
TypeScript tests exercise that case separately with a controlled source.

This product includes software developed by TouchGraph LLC
(http://www.touchgraph.com/).

This product includes software developed by TouchGraph
(http://www.touchgraph.com/).


## FM 2014 retrieval binary reference

`fm2014/RetrievalReference.java` is our synthetic harness, not decompiled source.
`just test-retrieval-java` compiles it against the owner's local FM 2014
`lib/knowceans-corpus.jar` and `lib/knowceans-tools.jar`, pins class hashes and
executes posteriors/distance/predictive query rankings. No legacy corpus or JAR
is copied. Ordinary tests compare against `../fixtures/fm2014-retrieval.json`
without a JDK or external project. See the
[scope and corrections](../../docs/fm2014-retrieval-parity.md).
