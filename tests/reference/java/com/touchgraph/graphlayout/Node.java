package com.touchgraph.graphlayout;

/** Headless field carrier for the original TGLayout; not the upstream Swing Node. */
public class Node {
    public double x, y, dx, dy;
    public int repulsion = 100;
    public boolean fixed, justMadeLocal;
}
