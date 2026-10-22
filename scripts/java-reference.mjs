import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { scenarios, lensCases, runScenario, runLens, referenceInput } from "../tests/scenarios.mjs";
import { compare } from "../tests/compare.mjs";

const root = new URL("../", import.meta.url);
const source = new URL("tests/reference/java/", root);
const output = await mkdtemp(join(tmpdir(), "fm4-java-"));
function run(command, args, input) {
  const result = spawnSync(command, args, { cwd: root, input, encoding: "utf8", maxBuffer: 10_000_000 });
  if (result.error) throw new Error(`${command} unavailable; a JDK is required for test:java`, { cause: result.error });
  if (result.status !== 0) throw new Error(`${command} failed:\n${result.stderr}`);
  return result.stdout;
}
try {
  const files = (await readdir(source, { recursive: true })).filter(file => file.endsWith(".java"));
  run("javac", ["-d", output, ...files.map(file => new URL(file, source).pathname)]);
  const expected = JSON.parse(run("java", ["-Djava.awt.headless=true", "-cp", output, "com.touchgraph.graphlayout.ReferenceRunner"], referenceInput()));
  const actual = { scenarios: scenarios.map(runScenario), lenses: lensCases.map(runLens) };
  compare(actual, expected);
  const golden = new URL("tests/reference/snapshots.json", root);
  if (process.argv.includes("--write")) await writeFile(golden, JSON.stringify(expected) + "\n");
  else compare(JSON.parse(await readFile(golden, "utf8")), expected, "stored Java snapshots");
  console.log(`Java parity passed: ${scenarios.length} scenarios, ${expected.scenarios.flat().length} layout batches, ${lensCases.length} lens cases.`);
} finally { await rm(output, { recursive: true, force: true }); }
