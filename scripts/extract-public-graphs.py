#!/usr/bin/env python3
"""Freshmind. Apache-2.0. Copyright (c) 2002-2014, 2026 Gregor Heinrich.
TypeScript port by Gregor Heinrich using Codex GPT-6.1.
Extract literal graph definitions from the pinned NetworkX source without executing it.
"""
import ast
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / "examples/public/sources/networkx-social.py"
data = source.read_bytes()
functions = {node.name: node for node in ast.parse(data).body if isinstance(node, ast.FunctionDef)}
graphs = []
for name, function in [("florentine", "florentine_families_graph"), ("karate", "karate_club_graph"), ("les-miserables", "les_miserables_graph")]:
    definition = functions[function]
    nodes, edges = {}, []
    if name == "karate":
        literals = {target.id: ast.literal_eval(node.value) for node in definition.body if isinstance(node, ast.Assign)
                    for target in node.targets if isinstance(target, ast.Name) and target.id in {"zacharydat", "club1"}}
        matrix = [[int(value) for value in row.split()] for row in literals["zacharydat"].splitlines()]
        assert len(matrix) == 34 and all(len(row) == 34 for row in matrix)
        by_pair = {}
        for index in range(34):
            nodes[index] = {"key": index, "club": "Mr. Hi" if index in literals["club1"] else "Officer"}
            assert matrix[index][index] == 0
            for other, weight in enumerate(matrix[index]):
                if weight:
                    pair = tuple(sorted((index, other)))
                    # Match nx.Graph.add_edge: a later nonzero reverse entry replaces the weight.
                    by_pair[pair] = {"from": pair[0], "to": pair[1], "weight": weight}
        edges = list(by_pair.values())
    else:
        for node in definition.body:
            if not isinstance(node, ast.Expr) or not isinstance(node.value, ast.Call):
                continue
            call = node.value
            if not isinstance(call.func, ast.Attribute) or call.func.attr != "add_edge":
                continue
            assert isinstance(call.func.value, ast.Name) and call.func.value.id == "G"
            a, b = [ast.literal_eval(arg) for arg in call.args]
            weight = next((ast.literal_eval(keyword.value) for keyword in call.keywords if keyword.arg == "weight"), 1)
            nodes.setdefault(a, {"key": a})
            nodes.setdefault(b, {"key": b})
            edges.append({"from": a, "to": b, "weight": weight})
    pairs = {frozenset((edge["from"], edge["to"])) for edge in edges}
    assert len(pairs) == len(edges), "Unexpected duplicate relation"
    graphs.append({"id": name, "function": function, "nodes": list(nodes.values()), "edges": edges})
print(json.dumps({"source": {"release": "networkx-3.4.2", "sha256": hashlib.sha256(data).hexdigest(),
    "url": "https://raw.githubusercontent.com/networkx/networkx/networkx-3.4.2/networkx/generators/social.py"}, "graphs": graphs}))
