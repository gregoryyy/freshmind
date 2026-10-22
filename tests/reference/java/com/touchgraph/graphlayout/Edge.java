package com.touchgraph.graphlayout;

/** Headless field carrier for the original TGLayout. */
public class Edge {
    public Node from, to;
    private int length;
    public Edge(Node from, Node to, int length) { this.from = from; this.to = to; this.length = length; }
    public int getLength() { return length; }
}
