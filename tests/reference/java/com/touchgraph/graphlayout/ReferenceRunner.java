package com.touchgraph.graphlayout;
import com.touchgraph.graphlayout.graphelements.GraphEltSet;
import com.touchgraph.graphlayout.interaction.HyperScroll;
import java.lang.reflect.*;
import java.util.*;

/** Drives the UNMODIFIED Java engine and lens with data supplied by Node. */
public class ReferenceRunner {
    static double field(TGLayout layout, String name) throws Exception {
        Field field = TGLayout.class.getDeclaredField(name);
        field.setAccessible(true);
        return field.getDouble(layout);
    }
    static String snapshot(TGLayout layout, GraphEltSet graph) throws Exception {
        StringJoiner nodes = new StringJoiner(",", "[", "]");
        for (Node n : graph.nodes) nodes.add("[" + n.x + "," + n.y + "," + n.dx + "," + n.dy + "]");
        StringJoiner state = new StringJoiner(",", "[", "]");
        for (String name : new String[]{"damper", "maxMotion", "lastMaxMotion", "motionRatio", "rigidity"}) state.add("" + field(layout, name));
        return "{\"nodes\":" + nodes + ",\"state\":" + state + "}";
    }
    public static void main(String[] args) throws Exception {
        Locale.setDefault(Locale.US);
        Scanner in = new Scanner(System.in);
        Method relax = TGLayout.class.getDeclaredMethod("relax");
        relax.setAccessible(true);
        StringJoiner scenarios = new StringJoiner(",", "[", "]");
        int count = in.nextInt();
        for (int s = 0; s < count; s++) {
            GraphEltSet graph = new GraphEltSet();
            int nodeCount = in.nextInt(), edgeCount = in.nextInt(), commandCount = in.nextInt();
            for (int i = 0; i < nodeCount; i++) {
                Node node = new Node();
                node.x = in.nextDouble(); node.y = in.nextDouble(); node.dx = in.nextDouble(); node.dy = in.nextDouble();
                node.repulsion = in.nextInt(); node.fixed = in.nextInt() == 1; node.justMadeLocal = in.nextInt() == 1;
                graph.nodes.add(node);
            }
            for (int i = 0; i < edgeCount; i++) graph.edges.add(new Edge(graph.nodes.get(in.nextInt()), graph.nodes.get(in.nextInt()), in.nextInt()));
            TGLayout layout = new TGLayout(new TGPanel(graph));
            StringJoiner frames = new StringJoiner(",", "[", "]");
            for (int c = 0; c < commandCount; c++) {
                String command = in.next();
                switch (command) {
                    case "resetDamper": layout.resetDamper(); break;
                    case "stopDamper": layout.stopDamper(); break;
                    case "startDamper": layout.startDamper(); break;
                    case "stopMotion": layout.stopMotion(); break;
                    case "setRigidity": layout.setRigidity(in.nextDouble()); break;
                    case "setDragNode": int index = in.nextInt(); layout.setDragNode(index < 0 ? null : graph.nodes.get(index)); break;
                    case "justMadeLocal": graph.nodes.get(in.nextInt()).justMadeLocal = in.nextInt() == 1; break;
                    case "relax":
                        int batches = in.nextInt();
                        for (int b = 0; b < batches; b++) { relax.invoke(layout); frames.add(snapshot(layout, graph)); }
                        break;
                    default: throw new IllegalArgumentException(command);
                }
            }
            scenarios.add(frames.toString());
        }
        StringJoiner lenses = new StringJoiner(",", "[", "]");
        int lensCount = in.nextInt();
        for (int i = 0; i < lensCount; i++) {
            int value = in.nextInt();
            double x = in.nextDouble(), y = in.nextDouble();
            HyperScroll scroll = new HyperScroll(new TGPanel(new GraphEltSet()));
            scroll.getHyperSB().setValue(value);
            TGLensSet set = new TGLensSet();
            set.addLens(scroll.getLens());
            TGPoint2D draw = set.convRealToDraw(x, y);
            TGPoint2D real = set.convDrawToReal(draw);
            lenses.add("[" + draw.x + "," + draw.y + "," + real.x + "," + real.y + "]");
        }
        System.out.println("{\"scenarios\":" + scenarios + ",\"lenses\":" + lenses + "}");
    }
}
