# Overall graph aspect

Choose **View → Graph aspect**:

| Choice | Horizontal position factor / nominal width:height |
| --- | --- |
| Original | 1:1, unchanged positions |
| 3:5 | 0.6:1, portrait ellipse |
| 16:9 | Approximately 1.778:1, landscape ellipse |
| Canvas | Current graph viewport width divided by height |

The setting uses the **original FM display-lens approach**. It immediately scales
horizontal node positions about the viewport origin, while label text, node
bodies and physical layout retain their proportions and coordinates. It applies
to the entire displayed graph with RFC either on or off. Canvas mode updates
when the graph viewport changes, including when a retractable panel changes its
width. The readout reports the applied factor.

The width:height choices describe the stretch of an initially circular extent.
An arbitrary graph need not have an exact elliptical bounding box. The viewing
lens, rotation and starting topology still determine its silhouette. Returning
to Original restores the unscaled display positions for the current layout.
Graph spacing and canvas zoom remain independent size controls.

## Original implementation and extension

In the supplied `../knowceans/knowceans-freshmind-2014/` source,
`src/org/knowceans/freshmind/FreshmindBrowser.java:333–351` defines
`HorizontalStretchLens`:

```text
apply: x = x × 1.5
undo:  x = x / 1.5
```

It installs that lens after the viewing/hyperbolic lenses and before
`getAdjustOriginLens()`. Y is unchanged; this scales positions rather than the
Java2D node components. The browser port uses the same forward/inverse approach
at that stage of its existing standard lens chain, replacing fixed 1.5 with the
requested factor. The other lens ordering remains as implemented by the port.
The legacy 1.5 transform has a literal forward/inverse test oracle.

`HorizontalStretchLens` exposes a validated factor in 0.01–100.
`TGPanel.setGraphAspectMode(mode)` owns the session policy (`original`, `3:5`,
`16:9`, `canvas`); `getGraphAspectState()` returns a detached mode/factor snapshot.
Library hosts can use the `graphAspect` constructor option. Canvas mode clamps
extreme viewport ratios to those numerical bounds and uses the panel's existing
size fallback when hidden or zero-sized. Document or layout replacement retains
the panel's aspect preference. A host replacing the entire lens chain owns its
custom transforms, including any desired stretch.

The setting leaves physical positions, forces, damping, pinned/dragged state,
semantic data, RFC weights and other view settings with their existing owners.
Node dragging and background navigation use the inverse composed lens chain;
Ctrl-drag retains whole-canvas translation. Curves are routed against the
undistorted measured node bodies at their stretched positions. The preference
is session-only and creates no graph records, storage or network requests.
Dispose `bindGraphAspectControls` before destroying a custom host's controls.

## Evidence

Headless cases check the legacy fixed factor, other ratios, inverse arithmetic,
validation and standard-chain placement. They also verify unchanged physical
positions/damping, reversible display positions, independent layout/document
replacement and detached state. Browser checks cover control choices, label
measurements, serialized data, actual node dragging through the inverse,
background and Ctrl-drag under different aspect factors, viewport resizing,
external updates and retired controls. The pinned Java suite checks the original
default lens/layout path. These are scoped functional checks, without a claim
of an exact final graph ellipse or perceptual benefit.
