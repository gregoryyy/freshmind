/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

import { defaultEdgeStyle, defaultNodeStyle, interactionStates } from "./types.js";
import type { EdgeStyle, InteractionState, NodeStyle, TypeConfiguration, VisualDefinition, VisualItem } from "./types.js";
import { clone, merge, validateConfiguration, validateVisualOverride } from "./validation.js";

/** Validated configuration snapshot. Configuration reloads construct a new registry atomically. */
export class TypeRegistry {
  private readonly configuration: TypeConfiguration;
  private readonly nodes = new Map<string, VisualDefinition<NodeStyle>>();
  private readonly edges = new Map<string, VisualDefinition<EdgeStyle>>();
  private readonly warnings = new Set<string>();

  /**
   * Copies and validates configuration, then resolves named visual inheritance.
   * @throws {TypeError} For invalid fields, missing references/defaults or inheritance cycles.
   */
  constructor(configuration: unknown) {
    this.configuration = validateConfiguration(configuration);
    const c = this.configuration;
    const resolve = <T>(id: string, source: Record<string, VisualDefinition<T>>, cache: Map<string, VisualDefinition<T>>, stack: string[] = []): VisualDefinition<T> => {
      if (stack.includes(id)) throw new TypeError(`Visual inheritance cycle: ${[...stack, id].join(" -> ")}`);
      if (cache.has(id)) return cache.get(id)!;
      if (!Object.hasOwn(source, id)) throw new TypeError(`Unknown visual parent/reference: ${id}`);
      const { extends: parent, ...own } = source[id];
      const resolved = merge<VisualDefinition<T>>(parent ? resolve(parent, source, cache, [...stack, id]) : {}, own);
      cache.set(id, resolved); return resolved;
    };
    for (const id of Object.keys(c.nodeVisuals)) resolve(id, c.nodeVisuals, this.nodes);
    for (const id of Object.keys(c.edgeVisuals)) resolve(id, c.edgeVisuals, this.edges);
    for (const [types, visuals] of [[c.nodeTypes, this.nodes], [c.relationTypes, this.edges]] as const) {
      for (const [id, type] of Object.entries(types)) if (!visuals.has(type.visual)) throw new TypeError(`${id}: unknown visual ${type.visual}`);
    }
    if (!Object.hasOwn(c.nodeTypes, c.defaults.nodeType) || !Object.hasOwn(c.relationTypes, c.defaults.relationType)
      || !this.nodes.has(c.defaults.nodeVisual) || !this.edges.has(c.defaults.edgeVisual)) throw new TypeError("Unknown default type or visual");
  }
  /** Returns a detached snapshot; construct a new registry to apply configuration edits. */
  getConfiguration(): TypeConfiguration { return clone(this.configuration); }
  /** Returns deduplicated unknown-type/visual warnings accumulated during style resolution. */
  getDiagnostics(): string[] { return [...this.warnings]; }
  clearDiagnostics(): void { this.warnings.clear(); }
  /**
   * Resolves a detached node style from defaults, inherited visuals and item overrides.
   * Active states merge last in fixed → hover → selected → preselected → activeCandidate
   * order, independent of the order supplied by the caller. Unknown IDs retain their
   * model values and use fallback presentation, recording diagnostics.
   */
  resolveNode(item: VisualItem<NodeStyle>, states: readonly InteractionState[] = []): NodeStyle {
    return this.resolve(item, states, "node", this.nodes, defaultNodeStyle);
  }
  /**
   * Resolves a detached relation style using the same precedence and fallback as nodes.
   * Relation weight scaling is applied by presentation, not by the registry or layout.
   * @see TypeRegistry.resolveNode
   */
  resolveEdge(item: VisualItem<EdgeStyle>, states: readonly InteractionState[] = []): EdgeStyle {
    return this.resolve(item, states, "edge", this.edges, defaultEdgeStyle);
  }
  private resolve<T extends NodeStyle | EdgeStyle>(item: VisualItem<T>, states: readonly InteractionState[], kind: "node" | "edge",
    visuals: Map<string, VisualDefinition<T>>, fallback: T): T {
    const c = this.configuration, types = kind === "node" ? c.nodeTypes : c.relationTypes;
    const defaultVisual = kind === "node" ? c.defaults.nodeVisual : c.defaults.edgeVisual;
    const semantic = item.getSemanticType();
    if (!Object.hasOwn(types, semantic)) this.warnings.add(`Unknown ${kind} type: ${semantic}; using default presentation`);
    const visual = validateVisualOverride<T>(item.getVisual(), kind);
    const id = visual.type ?? (Object.hasOwn(types, semantic) ? types[semantic].visual : defaultVisual);
    if (!visuals.has(id)) this.warnings.add(`Unknown ${kind} visual: ${id}; using default presentation`);
    const definition = merge<VisualDefinition<T>>(visuals.get(defaultVisual), visuals.get(id));
    const { states: stateStyles, ...base } = definition;
    let result = merge<T>(fallback, base, visual.style);
    for (const state of interactionStates) if (states.includes(state)) result = merge<T>(result, stateStyles?.[state]);
    return result;
  }
}
