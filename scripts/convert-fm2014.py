#!/usr/bin/env python3
"""Read one approved FM2014 XML graph; emit transfer records and migration diagnostics as JSON.

Freshmind. Licensed under the Apache License, Version 2.0.
Copyright (c) 2002-2014 Gregor Heinrich.
Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ALLOWED = {"berry.xml", "nips-fm.xml"}
SHAPES = {1: "rectangle", 2: "rounded-rectangle", 3: "ellipse", 4: "circle", 5: "parallelogram-right", 6: "parallelogram-left", 7: "double-trapezoid-horizontal", 8: "double-trapezoid-vertical", 9: "convex-rectangle", 10: "concave-rectangle", 11: "trapezoid", 12: "inverted-trapezoid"}
STROKES = {0: "none", 1: "solid", 2: "dashed", 3: "long-dashed", 4: "dash-dotted", 5: "dash-double-dotted", 6: "dotted"}


def convert(path, recover=False):
    """Two-pass conversion; never scans the input directory or opens linked resources."""
    if path.name not in ALLOWED:
        raise ValueError("Only berry.xml and nips-fm.xml are approved migration inputs")
    raw = path.read_bytes()
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("DTD/entity declarations are not supported")
    root = ET.fromstring(raw)
    if root.tag != "graph":
        raise ValueError("Expected graph root")
    report = {"input": path.name, "sha256": hashlib.sha256(raw).hexdigest(), "warnings": [], "recoveries": [], "placeholders": [], "unresolvedResources": []}
    nodes, edges, identifiers = [], [], set()

    def value(element, name, default=None):
        items = element.findall(name)
        return (items[0].text or "") if items else default

    def extra(element, known):
        unknown = [ET.tostring(c, encoding="unicode") for c in element if c.tag not in known]
        duplicates = [c.tag for c in element if len(element.findall(c.tag)) > 1 and c.tag != "relation"]
        if unknown or duplicates or element.attrib:
            return {"fm2014": {"attributes": dict(element.attrib), "unknownElements": unknown,
                                "duplicateElements": [ET.tostring(c, encoding="unicode") for c in element if c.tag in duplicates]}}
        return {}

    for source in root.findall("node"):
        label = value(source, "label", "")
        identifier = value(source, "id", label)
        if not identifier or identifier in identifiers:
            raise ValueError("Missing or duplicate node ID: " + repr(identifier))
        identifiers.add(identifier)
        node = {"id": identifier, "label": label}
        types = [c.text or "" for c in source.findall("type")]
        semantic = [t for t in types if not re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)", t)]
        numeric = [float(t) for t in types if t not in semantic]
        if semantic:
            if len(set(semantic)) > 1:
                raise ValueError("Conflicting semantic types for " + identifier)
            node["type"] = semantic[0]
        if numeric:
            report["warnings"].append({"node": identifier, "code": "numeric-node-type", "values": types})
            node.setdefault("extensions", {})["fm2014"] = {"originalTypes": types}
            if recover and source.find("weight") is None:
                if len(set(numeric)) > 1:
                    raise ValueError("Conflicting numeric type weights for " + identifier)
                node["weight"] = numeric[0]
                report["recoveries"].append({"node": identifier, "code": "type-to-weight", "weight": numeric[0]})
        if source.find("weight") is not None:
            node["weight"] = float(value(source, "weight"))
        if source.find("hint") is not None:
            hint = value(source, "hint", "")
            node["annotation"] = {"format": "html" if re.search(r"<(?:html|body|p|a|br|div)\b", hint, re.I) else "text", "text": hint}
        if source.find("url") is not None:
            node["url"] = value(source, "url", "")
            if node["url"]:
                report["unresolvedResources"].append({"node": identifier, "url": node["url"], "reason": "Retained verbatim; external resources were not opened"})
        if source.find("shape") is not None:
            code = int(value(source, "shape"))
            if code not in SHAPES:
                raise ValueError("Unknown shape " + str(code))
            node["visual"] = {"style": {"shape": SHAPES[code]}}
        unknown = extra(source, {"id", "label", "type", "weight", "hint", "url", "shape", "relation"})
        if unknown:
            node.setdefault("extensions", {}).setdefault("fm2014", {}).update(unknown["fm2014"])
        nodes.append(node)
    for source, node in zip(root.findall("node"), nodes[:]):
        for relation in source.findall("relation"):
            destination = value(relation, "destination")
            if not destination:
                raise ValueError("Missing relation destination at " + node["id"])
            if destination not in identifiers:
                identifiers.add(destination)
                nodes.append({"id": destination, "label": destination, "extensions": {"fm2014": {"placeholder": True}}})
                report["placeholders"].append(destination)
            edge = {"id": "fm2014-e" + str(len(edges) + 1), "from": node["id"], "to": destination, "label": value(relation, "type", "")}
            direction = value(relation, "direction", "forward")
            if direction == "backward":
                edge["from"], edge["to"] = edge["to"], edge["from"]
            elif direction != "forward":
                raise ValueError("Unknown relation direction: " + direction)
            for field in ["weight", "length"]:
                if relation.find(field) is not None:
                    edge[field] = float(value(relation, field)) if field == "weight" else int(value(relation, field))
            if relation.find("stroke") is not None:
                code = int(value(relation, "stroke"))
                if code not in STROKES:
                    raise ValueError("Unknown stroke " + str(code))
                edge["visual"] = {"style": {"stroke": {"dash": STROKES[code]}}}
            unknown = extra(relation, {"destination", "type", "direction", "weight", "length", "stroke"})
            if unknown:
                edge["extensions"] = unknown
            edges.append(edge)
    report.update({"sourceNodes": len(root.findall("node")), "sourceRelations": sum(len(n.findall("relation")) for n in root.findall("node")), "nodes": len(nodes), "edges": len(edges)})
    return {"document": {"format": "freshmind", "version": 1, "title": path.stem, "nodes": nodes, "edges": edges,
                         "extensions": {"fm2014": {"source": path.name, "sha256": report["sha256"]}}}, "report": report}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--recover-type-weights", action="store_true")
    args = parser.parse_args()
    print(json.dumps(convert(args.input, args.recover_type_weights), ensure_ascii=False, allow_nan=False))
