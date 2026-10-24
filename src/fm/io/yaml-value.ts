/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */
import { isAlias, isPair, isScalar, parseDocument } from "yaml";
import { jsonData } from "../config/core.js";

/** Reads one strict YAML 1.2 JSON-compatible value, rejecting aliases, merges, tags and duplicate keys. */
export function parseYamlValue(source: string): unknown {
  const doc = parseDocument(source, {schema: "core", version: "1.2", uniqueKeys: true, strict: true});
  if (doc.errors.length || doc.warnings.length) throw new TypeError([...doc.errors, ...doc.warnings].map(e => e.message).join("\n"));
  if (doc.directives?.yaml.version !== "1.2") throw new TypeError("Requires YAML 1.2");
  const walk = (node: unknown, depth = 0): void => {
    if (depth > 64) throw new TypeError("YAML nesting exceeds 64 levels");
    if (isAlias(node)) throw new TypeError("YAML aliases are not supported");
    if (isPair(node)) {
      if (!isScalar(node.key) || typeof node.key.value !== "string") throw new TypeError("YAML mapping keys must be strings");
      if (node.key.value === "<<") throw new TypeError("YAML merge keys are not supported");
      walk(node.key, depth + 1); walk(node.value, depth + 1);
    } else if (node && typeof node === "object") {
      if ("tag" in node && node.tag && !/^tag:yaml.org,2002:(str|int|float|bool|null|map|seq)$/.test(String(node.tag))) throw new TypeError("Custom YAML tags are not supported");
      if ("items" in node && Array.isArray(node.items)) for (const item of node.items) walk(item, depth + 1);
    }
  };
  walk(doc.contents); const value: unknown = doc.toJS({maxAliasCount: 0}); jsonData(value); return value;
}
