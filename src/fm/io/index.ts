/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See LICENSE-APACHE-2.0 for the license text.
 */

export {parseDocument,readDocument,serializeDocument,documentToRecord} from "./codec.js";
export type {DocumentRecord,DocumentView,NodeRecord,EdgeRecord,LoadOptions,SaveOptions} from "./types.js";
export {parseYamlValue} from "./yaml-value.js";
