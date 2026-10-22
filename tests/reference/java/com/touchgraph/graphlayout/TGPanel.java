package com.touchgraph.graphlayout;
import com.touchgraph.graphlayout.graphelements.GraphEltSet;

/** Headless host, so the original layout and lens classes need no Swing window. */
public class TGPanel {
    private final GraphEltSet graph;
    public TGPanel(GraphEltSet graph) { this.graph = graph; }
    public GraphEltSet getGES() { return graph; }
    public void repaintAfterMove() {}
    public void addGraphListener(GraphListener listener) {}
}
