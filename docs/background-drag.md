# Background dragging through the viewing lens

Restores the mouse behavior of FM2014, while retaining the previous browser
canvas pan as **Ctrl-drag**. This changes viewing coordinates; it does not drag
all nodes in the physical layout.

| Gesture | Behavior |
| --- | --- |
| Drag background | Scroll the graph through the current focus/context lens. Its distortion stays in the viewing pipeline as graph positions pass through it. |
| Ctrl-drag background | Translate the finished drawing, including its distortion, labels and shapes, by the pointer displacement. |
| Drag node | Existing inverse-lens node dragging, including dragging/releasing the focal node. |
| Shift-drag background | Existing rectangle selection in renderer coordinates. |

Pinch and touch pan retain D3's existing handling. Ctrl-drag is the explicit
alternate supported here; an OS-configured three-finger trackpad drag may arrive
as ordinary mouse input, without finger-count information. No three-finger
recognizer is claimed.

## Comparison with the original

Read-only source: `../knowceans/knowceans-freshmind-2014/`.

- `FreshNavigateUI.java:117–127` activates `hvDragUI` on unmodified background
  mouse press, and node dragging over a node.
- `tg/interaction/HVScroll.java:298–302` maps the previous and next draw points
  back through the lens chain and changes its pre-distortion offset by their
  physical-coordinate difference. `HVDragUI:428–432` applies this on every step.
- The previous TypeScript background gesture used D3's final SVG canvas
  translation. With a nonlinear lens, translating the finished drawing moves
  its distortion along with the graph; this explains the perceptible difference.

SHA-256 of those inspected source files:

```text
FreshNavigateUI.java b83ef2c5fc8b7cd8981c75233d11999fddb504de35229ec93fc885af6e64d178
HVScroll.java        5ab668b95b259b9d2911aec3807fd235aa79dd26afa02c0830fb1d81a277770d
```

The port retains its current lens ordering and uses both inverse canvas and
viewing transforms to derive the offset. Because its pan lens is after graph
zoom and uses addition, the update is `pan += (worldTo − worldFrom) * graphZoom`.
It does not change the original hyperbolic formulas or sampled inverse. That
inverse is approximate; tests use subpixel tolerances rather than claim an exact
analytic inverse.

## Ownership and compatibility

`FreshmindPanel` defaults to `{backgroundPan: "lens"}`. Plain `TGPanel` keeps its
existing `"canvas"` default. Passing `{backgroundPan: "canvas"}` explicitly to a
Freshmind host retains that default for integrations. Custom lens chains remain
responsible for their input transforms, as with the existing centering APIs.
`panGraphBetween(from, to)` accepts viewport points for the standard chain,
validates before changing the lens offset, and preserves physical positions,
complete/local graph membership, semantic fields and canvas state. A background
gesture started on an older graph cannot scroll a replacement graph.

The focused checks cover independent quarter-turn/scale arithmetic, nonlinear
pointer anchoring, hidden-position preservation and atomic invalid/overflow
rejection. Real-browser checks cover default and alternate pan, unchanged TG and
opt-out FM hosts, combined zoom/rotation, node dragging, rectangle selection,
pinch and resize. Routine and Java compatibility checks are recorded in
[DONE](DONE.md). Proposed assurance relevance: **INT-04**, **USE-03/07**,
**ARC-04**; these checks do not establish all device/OS gesture behavior.
