/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

import type {ImmutableGraphEltSet} from "../graph/index.js";
import type {Node} from "../model/index.js";

export interface LayoutHost {
  getGES(): ImmutableGraphEltSet;
  repaintAfterMove(): void;
}

/** Accumulates extra dx/dy impulses before integration; must not change graph membership or positions. */
export type LayoutForce = ((graph: ImmutableGraphEltSet, rigidity: number) => void) & {
  /** Optional extension activity: keep invoking batches while a timed force transition finishes. */
  needsTicks?: () => boolean;
};

/** Optional post-integration position proposals. TG retains coordinate ownership and protects pinned/dragged nodes. */
export type LayoutConstraint = ((graph:ImmutableGraphEltSet, dragNode:Node|null) => ReadonlyMap<Node,{x:number;y:number}>) & {
  needsTicks?:()=>boolean;
};
