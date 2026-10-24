/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import { isAlias, isPair, isScalar, parseDocument, visit } from "yaml";
import { TypeRegistry } from "./registry.js";

/**
 * Parses one YAML 1.2 core-schema type configuration into a validated registry.
 * Duplicate keys, aliases, merge keys and custom tags are rejected. This loader
 * handles visual/semantic definitions only, not native graph persistence.
 * @param source Complete YAML document text.
 * @returns A new registry ready for atomic replacement in a panel.
 * @throws {TypeError} For YAML errors/warnings, unsupported features or invalid definitions.
 */
export function parseTypeConfiguration(source: string): TypeRegistry {
  const doc = parseDocument(source, { schema: "core", version: "1.2", uniqueKeys: true, strict: true });
  if (doc.errors.length || doc.warnings.length) throw new TypeError([...doc.errors, ...doc.warnings].map(e => e.message).join("\n"));
  if (doc.directives?.yaml.version !== "1.2") throw new TypeError("Type configuration requires YAML 1.2");
  visit(doc, (_key, node) => {
    if (isAlias(node)) throw new TypeError("YAML aliases are not supported");
    if (isPair(node) && isScalar(node.key) && node.key.value === "<<") throw new TypeError("YAML merge keys are not supported");
    if (node && typeof node === "object" && "tag" in node && node.tag && !/^tag:yaml.org,2002:(str|int|float|bool|null|map|seq)$/.test(String(node.tag)))
      throw new TypeError("Custom YAML tags are not supported");
  });
  return new TypeRegistry(doc.toJS({ maxAliasCount: 0 }));
}
