/*!
 * Freshmind. Licensed under the Apache License, Version 2.0.
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2002-2014 Gregor Heinrich.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 * See licenses/LICENSE-APACHE-2.0 for the license text.
 */

import {clone,jsonData,record} from "../config/core.js";
import type {Metadata} from "./types.js";

export function metadata(value: unknown): Metadata { record(value, "metadata"); jsonData(value); return clone(value) as Metadata; }
