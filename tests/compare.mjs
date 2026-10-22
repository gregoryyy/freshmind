import assert from "node:assert/strict";

export function compare(actual, expected, path = "root") {
  if (typeof expected === "number") {
    assert.ok(Number.isFinite(actual), `${path}: non-finite result ${actual}`);
    const tolerance = 1e-10 * Math.max(1, Math.abs(expected));
    assert.ok(Math.abs(actual - expected) <= tolerance, `${path}: ${actual} != ${expected}`);
  } else if (Array.isArray(expected)) {
    assert.equal(actual.length, expected.length, `${path}: length`);
    expected.forEach((value, i) => compare(actual[i], value, `${path}[${i}]`));
  } else {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), `${path}: keys`);
    for (const key of Object.keys(expected)) compare(actual[key], expected[key], `${path}.${key}`);
  }
}
