/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
/** Numeric FM2014-style suffix, interpreted only by an editor commit, never by model/persistence APIs. */
export function parseWeightedLabel(input:string):{label:string;weight?:number} {
  const match=/\s+=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*$/i.exec(input);
  if(!match)return {label:input};
  const weight=Number(match[1]);
  if(!Number.isFinite(weight)||weight<0)throw new RangeError("Weight must be a finite nonnegative number");
  return {label:input.slice(0,match.index).trimEnd(),weight};
}
