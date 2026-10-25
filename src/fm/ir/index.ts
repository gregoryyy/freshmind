/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
// Compatibility exports share the independent search implementations; graph adapters live here.
export * from "../../ir/corpus/index.js";
export * from "../../ir/lexical/index.js";
export * from "./corpus.js";
export * from "./graph.js";
export {graphSearchViewSeeds} from "./view-seeds.js";
export type {GraphSearchSeed} from "./view-seeds.js";
