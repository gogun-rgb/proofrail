import { spawnSync } from "node:child_process";
import process from "node:process";

const result = spawnSync(process.execPath, ["scripts/validate-foundation.mjs", "--format", "json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: false,
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Foundation JSON validation command failed.\n");
  process.exit(result.status ?? 1);
}

let parsed;
try {
  parsed = JSON.parse(result.stdout);
} catch {
  process.stderr.write("Foundation JSON validation output did not parse as JSON.\n");
  process.exit(1);
}

if (parsed?.schemaVersion !== "1" || parsed?.status !== "VALID" || !Array.isArray(parsed?.findings)) {
  process.stderr.write("Foundation JSON validation output did not match the expected VALID result shape.\n");
  process.exit(1);
}

process.stdout.write("Foundation JSON validation output parsed as VALID.\n");
