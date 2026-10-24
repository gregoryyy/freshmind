/*!
 * TouchGraph-derived code; original TouchGraph license terms apply.
 * Copyright (c) 2001-2002 Alexander Shapiro. All rights reserved.
 * Copyright (c) 2026 TypeScript port by Gregor Heinrich using Codex GPT-6.1.
 *
 * Full license terms and required notices: ../../../LICENSE and ../../../NOTICE.
 * Redistribute this source with those files.
 */

// TypeScript adaptation, 2026. See NOTICE for the pinned Java reference.

export class TGException extends Error {
  static readonly NODE_EXISTS = 1;
  static readonly NODE_DOESNT_EXIST = 2;
  static readonly NODE_NO_ID = 3;
  readonly type: number;
  readonly exception: Error | null;
  constructor(typeOrMessage: number | string | Error, message = "") {
    super(typeof typeOrMessage === "string" ? typeOrMessage : message,
      typeOrMessage instanceof Error ? { cause: typeOrMessage } : undefined);
    this.name = "TGException";
    this.type = typeof typeOrMessage === "number" ? typeOrMessage : -1;
    this.exception = typeOrMessage instanceof Error ? typeOrMessage : null;
  }
  getId(): number { return this.type; }
}
