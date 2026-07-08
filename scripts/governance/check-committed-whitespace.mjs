import { spawnSync } from "node:child_process";
import process from "node:process";

const MODES = new Set(["direct", "merge-base"]);

function usage() {
  return [
    "Usage: node scripts/governance/check-committed-whitespace.mjs [--mode direct|merge-base] <base-ref> <head-ref>",
    "",
    "direct mode runs: git diff --check <base-ref> <head-ref>",
    "merge-base mode runs: git diff --check <base-ref>...<head-ref>",
  ].join("\n");
}

function parseArgs(args) {
  let mode = "merge-base";
  const remaining = [...args];

  if (remaining[0] === "--mode") {
    mode = remaining[1];
    remaining.splice(0, 2);
  } else if (remaining[0]?.startsWith("--mode=")) {
    mode = remaining[0].slice("--mode=".length);
    remaining.splice(0, 1);
  }

  const [baseRef, headRef, extra] = remaining;
  if (!MODES.has(mode) || !baseRef || !headRef || extra || baseRef.startsWith("-") || headRef.startsWith("-")) {
    return { error: usage() };
  }

  return { baseRef, headRef, mode };
}

const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  process.stderr.write(`${parsed.error}\n`);
  process.exit(2);
}

const rangeArgs = parsed.mode === "merge-base" ? [`${parsed.baseRef}...${parsed.headRef}`] : [parsed.baseRef, parsed.headRef];
const result = spawnSync("git", ["diff", "--check", ...rangeArgs], {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: false,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  process.stderr.write(`Unable to run git diff --check: ${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);
