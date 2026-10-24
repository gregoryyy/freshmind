/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import { dashStyles, interactionStates, nodeShapes } from "./types.js";
import type { EdgeStyle, NodeStyle, TypeConfiguration, VisualOverride } from "./types.js";

/** Requires a plain mapping and rejects prototype-related keys, reporting the field path. */
export function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${path}: expected a mapping`);
  for (const key of Object.keys(value)) if (["__proto__", "prototype", "constructor"].includes(key)) throw new TypeError(`${path}: unsupported key ${key}`);
  return value as Record<string, unknown>;
}
export function keys(value: Record<string, unknown>, allowed: string[], path: string): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new TypeError(`${path}.${key}: unknown field`);
}
export function text(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${path}: expected a nonempty string`);
}
export function number(value: unknown, path: string, min = 0, max = Infinity): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new TypeError(`${path}: expected a finite number in [${min}, ${max}]`);
}
function choice(value: unknown, choices: readonly string[], path: string): void {
  if (typeof value !== "string" || !choices.includes(value)) throw new TypeError(`${path}: expected ${choices.join(" | ")}`);
}
export function clone<T>(value: T): T { return structuredClone(value); }
/**
 * Validates finite JSON-compatible metadata recursively, allowing at most 64 nesting levels.
 * @throws {TypeError} For unsupported values, mapping keys or excessive/cyclic nesting.
 */
export function jsonData(value: unknown, path = "data", depth = 0): void {
  if (depth > 64) throw new TypeError(`${path}: nesting exceeds 64 levels`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") { number(value, path, -Infinity); return; }
  if (Array.isArray(value)) { value.forEach((v, i) => jsonData(v, `${path}[${i}]`, depth + 1)); return; }
  for (const [key, v] of Object.entries(record(value, path))) jsonData(v, `${path}.${key}`, depth + 1);
}

/**
 * Merges validated mappings recursively, with later values winning field by field.
 * Arrays/scalars replace earlier values; inputs are copied rather than mutated.
 * @param values Validated mapping fragments; absent/falsy fragments are skipped.
 */
export function merge<T>(...values: unknown[]): T {
  const result: Record<string, unknown> = {};
  for (const value of values) {
    if (!value) continue;
    for (const [key, item] of Object.entries(record(value, "style"))) {
      result[key] = item && typeof item === "object" && !Array.isArray(item)
        ? merge(result[key], item) : clone(item);
    }
  }
  return result as T;
}

function style(value: unknown, kind: "node" | "edge", path: string): void {
  const obj = record(value, path);
  keys(obj, kind === "node" ? ["shape", "fill", "text", "stroke", "label", "halo","importance"] : ["curve", "stroke", "arrow", "label"], path);
  for (const [key, val] of Object.entries(obj)) {
    const p = `${path}.${key}`;
    if (key === "shape") choice(val, nodeShapes, p);
    else if (key === "curve") choice(val, ["spider", "lens", "straight"], p);
    else if (key === "fill") text(val, p);
    else {
      const fields = record(val, p);
      const allowed = key === "stroke" ? ["color", "width", "dash"] : key === "text" ? ["color", "font"]
        : key === "halo" ? ["enabled", "opacity"] : key === "importance" ? ["mode","minScale","maxScale"] : key === "arrow" ? ["placement", "size"]
        : kind === "node" ? ["maxWidth", "paddingX", "paddingY"] : ["font", "color", "offset"];
      keys(fields, allowed, p);
      for (const [f, v] of Object.entries(fields)) {
        const fp = `${p}.${f}`;
        if (["color", "font"].includes(f)) text(v, fp);
        else if (f === "dash") choice(v, dashStyles, fp);
        else if (f === "placement") choice(v, ["middle", "end", "none"], fp);
        else if (f === "mode") choice(v,["size","legacy","none"],fp);
        else if (f === "minScale") number(v,fp,.5,1);
        else if (f === "maxScale") number(v,fp,1,3);
        else if (f === "enabled") { if (typeof v !== "boolean") throw new TypeError(`${fp}: expected boolean`); }
        else if (f === "offset") {
          const offset = record(v, fp); keys(offset, ["x", "y"], fp);
          for (const [axis, n] of Object.entries(offset)) number(n, `${fp}.${axis}`, -Infinity);
        } else number(v, fp, f === "maxWidth" ? 1 : 0, f === "opacity" ? 1 : Infinity);
      }
    }
  }
}
/** Validates an item's named visual/partial style and returns a detached copy. */
export function validateVisualOverride<T extends NodeStyle | EdgeStyle>(value: unknown, kind: "node" | "edge"): VisualOverride<T> {
  const obj = record(value, "visual"); keys(obj, ["type", "style"], "visual");
  if (obj.type !== undefined) text(obj.type, "visual.type");
  if (obj.style !== undefined) style(obj.style, kind, "visual.style");
  return clone(obj) as VisualOverride<T>;
}
/**
 * Validates version, fields and primitive style values, returning a detached configuration.
 * Cross-reference and inheritance-cycle checks are performed by TypeRegistry afterward.
 * @throws {TypeError} For missing/unknown fields, unsupported versions or invalid values.
 */
export function validateConfiguration(value: unknown): TypeConfiguration {
  const obj = record(value, "types");
  keys(obj, ["format", "version", "id", "defaults", "nodeTypes", "relationTypes", "nodeVisuals", "edgeVisuals"], "types");
  if (obj.format !== "freshmind-types" || obj.version !== 1) throw new TypeError("Expected freshmind-types version 1");
  text(obj.id, "id");
  const defaults = record(obj.defaults, "defaults");
  keys(defaults, ["nodeType", "relationType", "nodeVisual", "edgeVisual"], "defaults");
  for (const key of ["nodeType", "relationType", "nodeVisual", "edgeVisual"]) text(defaults[key], `defaults.${key}`);
  for (const kind of ["nodeTypes", "relationTypes"] as const) {
    for (const [id, val] of Object.entries(record(obj[kind], kind))) {
      text(id, kind); const path = `${kind}.${id}`, item = record(val, path);
      keys(item, kind === "nodeTypes" ? ["label", "visual", "queryKind"] : ["label", "visual"], path);
      text(item.label, `${path}.label`); text(item.visual, `${path}.visual`);
      if (item.queryKind !== undefined) choice(item.queryKind, ["simple", "lucene", "lda"], `${path}.queryKind`);
    }
  }
  for (const kind of ["nodeVisuals", "edgeVisuals"] as const) {
    for (const [id, val] of Object.entries(record(obj[kind], kind))) {
      text(id, kind); const path = `${kind}.${id}`, item = record(val, path);
      const { extends: parent, states, ...base } = item;
      if (parent !== undefined) text(parent, `${path}.extends`);
      style(base, kind === "nodeVisuals" ? "node" : "edge", path);
      if (states !== undefined) for (const [state, definition] of Object.entries(record(states, `${path}.states`))) {
        choice(state, interactionStates, path); style(definition, kind === "nodeVisuals" ? "node" : "edge", `${path}.states.${state}`);
      }
    }
  }
  return clone(obj) as unknown as TypeConfiguration;
}
