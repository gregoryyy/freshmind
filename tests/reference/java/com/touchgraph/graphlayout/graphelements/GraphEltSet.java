package com.touchgraph.graphlayout.graphelements;
import com.touchgraph.graphlayout.*;
import java.util.*;

/** Same ordered node, edge and pair traversal as the original GraphEltSet. */
public class GraphEltSet {
    public final List<Node> nodes = new ArrayList<>();
    public final List<Edge> edges = new ArrayList<>();
    public void forAllNodes(TGForEachNode visitor) { for (Node node : nodes) visitor.forEachNode(node); }
    public void forAllEdges(TGForEachEdge visitor) { for (Edge edge : edges) visitor.forEachEdge(edge); }
    public void forAllNodePairs(TGForEachNodePair visitor) {
        for (int i = 0; i < nodes.size(); i++) {
            Node node = nodes.get(i);
            visitor.beforeInnerLoop(node);
            for (int j = i + 1; j < nodes.size(); j++) visitor.forEachNodePair(node, nodes.get(j));
            visitor.afterInnerLoop(node);
        }
    }
}
