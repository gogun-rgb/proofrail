import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(ROOT, "packages/evidence-gate/src/cli.mjs");
const EXAMPLE_INPUT = path.join(ROOT, "examples/evidence-gate/input.json");
const EXPECTED_OUTPUT = path.join(ROOT, "examples/evidence-gate/expected-output.json");

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8"
  });
}

function withTempDirectory(run) {
  const directory = mkdtempSync(path.join(tmpdir(), "proofrail-evidence-gate-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("CLI writes canonical example output to stdout with exactly one trailing newline", () => {
  const result = runCli(["--input", EXAMPLE_INPUT]);
  const expected = readFileSync(EXPECTED_OUTPUT, "utf8");

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, expected);
  assert.match(result.stdout, /[^\n]\n$/);
  assert.doesNotMatch(result.stdout, /\n\n$/);
});

test("CLI writes byte-identical output to a requested file", () => {
  withTempDirectory((directory) => {
    const outputPath = path.join(directory, "packet.json");
    const result = runCli(["--input", EXAMPLE_INPUT, "--output", outputPath]);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.equal(readFileSync(outputPath, "utf8"), readFileSync(EXPECTED_OUTPUT, "utf8"));
  });
});

test("CLI produces byte-identical output for reordered but identically normalized input", () => {
  withTempDirectory((directory) => {
    const input = JSON.parse(readFileSync(EXAMPLE_INPUT, "utf8"));
    input.requiredEvidence.reverse();
    input.scope.changedPaths.reverse();
    const reorderedPath = path.join(directory, "reordered.json");
    writeFileSync(reorderedPath, JSON.stringify(input), "utf8");

    const first = runCli(["--input", EXAMPLE_INPUT]);
    const second = runCli(["--input", reorderedPath]);

    assert.equal(first.status, 0);
    assert.equal(second.status, 0);
    assert.equal(second.stdout, first.stdout);
  });
});

test("CLI rejects malformed JSON without disclosing secret-like input", () => {
  withTempDirectory((directory) => {
    const secret = "sk-live-complete-secret-value-123456";
    const inputPath = path.join(directory, "malformed.json");
    writeFileSync(inputPath, `{\"apiKey\":\"${secret}\",\"pullRequest\":`, "utf8");

    const result = runCli(["--input", inputPath]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /malformed JSON/i);
    assert.doesNotMatch(result.stderr, new RegExp(secret));
    assert.equal(result.stdout, "");
  });
});

test("CLI reports invalid input shape without echoing secret-like values", () => {
  withTempDirectory((directory) => {
    const secret = "ghp_complete_secret_value_123456";
    const inputPath = path.join(directory, "invalid-shape.json");
    writeFileSync(inputPath, JSON.stringify({ pullRequest: secret }), "utf8");

    const result = runCli(["--input", inputPath]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pullRequest must be an object/);
    assert.doesNotMatch(result.stderr, new RegExp(secret));
    assert.equal(result.stdout, "");
  });
});

test("example retains missing evidence, scope violations, and non-readiness boundaries", () => {
  const result = runCli(["--input", EXAMPLE_INPUT]);
  assert.equal(result.status, 0);

  const packet = JSON.parse(result.stdout);
  assert.deepEqual(packet.missingEvidence, [{
    description: "Independent review must inspect the exact change.",
    id: "req-independent-review",
    neededForClaimIds: ["claim-ready"]
  }]);
  assert.deepEqual(packet.scope.outsideDeclaredScope, ["README.md"]);
  assert.ok(packet.reviewNeeds.includes("Review path outside declared scope: README.md"));
  assert.equal(packet.boundaries.productVerdict, null);
  assert.equal(packet.boundaries.productReadiness, false);
  assert.equal(packet.boundaries.trustedRelease, false);
});
