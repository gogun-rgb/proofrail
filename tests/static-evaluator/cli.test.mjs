import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { evaluateKernel } from "../../packages/kernel/src/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(ROOT, "packages/static-evaluator/src/cli.mjs");
const EXAMPLE_INPUT = path.join(ROOT, "examples/static-evaluator/input.json");
const EXPECTED_OUTPUT = path.join(ROOT, "examples/static-evaluator/expected-output.json");
const USAGE = "static-evaluator: usage: static-evaluate --input <input.json> [--output <bundle.json>]\n";

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT
  });
}

function withTempDirectory(run) {
  const directory = mkdtempSync(path.join(tmpdir(), "proofrail-static-evaluator-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function stderr(result) {
  return result.stderr.toString("utf8");
}

test("CLI output is the direct kernel result with one trailing newline", () => {
  const input = JSON.parse(readFileSync(EXAMPLE_INPUT, "utf8"));
  const result = runCli(["--input", EXAMPLE_INPUT]);

  assert.equal(result.status, 0);
  assert.equal(result.stderr.length, 0);
  assert.deepEqual(JSON.parse(result.stdout.toString("utf8")), evaluateKernel(input));
  assert.match(result.stdout.toString("utf8"), /[^\n]\n$/);
  assert.doesNotMatch(result.stdout.toString("utf8"), /\n\n$/);
});

test("stdout and output-file bytes match the golden fixture", () => {
  const expected = readFileSync(EXPECTED_OUTPUT);
  const stdoutResult = runCli(["--input", EXAMPLE_INPUT]);

  assert.equal(stdoutResult.status, 0);
  assert.deepEqual(stdoutResult.stdout, expected);

  withTempDirectory((directory) => {
    const outputPath = path.join(directory, "bundle.json");
    const fileResult = runCli(["--input", EXAMPLE_INPUT, "--output", outputPath]);

    assert.equal(fileResult.status, 0);
    assert.equal(fileResult.stdout.length, 0);
    assert.equal(fileResult.stderr.length, 0);
    assert.deepEqual(readFileSync(outputPath), expected);
  });
});

test("identical input produces byte-identical output", () => {
  const first = runCli(["--input", EXAMPLE_INPUT]);
  const second = runCli(["--input", EXAMPLE_INPUT]);

  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.deepEqual(second.stdout, first.stdout);
});

test("semantically identical reordered input produces byte-identical output", () => {
  withTempDirectory((directory) => {
    const input = JSON.parse(readFileSync(EXAMPLE_INPUT, "utf8"));
    const reordered = Object.fromEntries(Object.entries(input).reverse());
    const reorderedPath = path.join(directory, "reordered.json");
    writeFileSync(reorderedPath, JSON.stringify(reordered));

    const original = runCli(["--input", EXAMPLE_INPUT]);
    const result = runCli(["--input", reorderedPath]);

    assert.equal(result.status, 0);
    assert.equal(result.stderr.length, 0);
    assert.deepEqual(result.stdout, original.stdout);
  });
});

test("valid REVISION_REQUIRED bundle exits zero and remains the direct kernel result", () => {
  withTempDirectory((directory) => {
    const input = JSON.parse(readFileSync(EXAMPLE_INPUT, "utf8"));
    input.observations = [];
    const inputPath = path.join(directory, "revision-required.json");
    writeFileSync(inputPath, JSON.stringify(input));

    const result = runCli(["--input", inputPath]);
    const directBundle = evaluateKernel(input);

    assert.equal(result.status, 0);
    assert.equal(result.stderr.length, 0);
    assert.equal(directBundle.verdict, "REVISION_REQUIRED");
    assert.deepEqual(
      result.stdout,
      Buffer.from(JSON.stringify(directBundle) + "\n", "utf8")
    );
  });
});

test("unknown, duplicate, missing, and missing-value arguments use fixed usage", () => {
  const cases = [
    [],
    ["--unknown", "value"],
    ["--input", EXAMPLE_INPUT, "--input", EXAMPLE_INPUT],
    ["--input"],
    ["--input", "--output", "bundle.json"],
    ["--input", EXAMPLE_INPUT, "--output"]
  ];

  for (const args of cases) {
    const result = runCli(args);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout.length, 0);
    assert.equal(stderr(result), USAGE);
  }
});

test("non-regular input is rejected through the fixed input boundary", () => {
  withTempDirectory((directory) => {
    const inputDirectory = path.join(directory, "input-directory");
    mkdirSync(inputDirectory);
    const result = runCli(["--input", inputDirectory]);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout.length, 0);
    assert.match(stderr(result), /^static-evaluator: input (must be a regular file|file is unavailable)\n$/);
  });
});

test("malformed, oversized, and non-UTF-8 input use bounded fixed errors", () => {
  withTempDirectory((directory) => {
    const malformedPath = path.join(directory, "malformed.json");
    writeFileSync(malformedPath, "{");
    const malformed = runCli(["--input", malformedPath]);
    assert.notEqual(malformed.status, 0);
    assert.equal(malformed.stdout.length, 0);
    assert.equal(stderr(malformed), "static-evaluator: input is not valid JSON\n");

    const oversizedPath = path.join(directory, "oversized.json");
    writeFileSync(oversizedPath, Buffer.alloc(1024 * 1024 + 1, 0x20));
    const oversized = runCli(["--input", oversizedPath]);
    assert.notEqual(oversized.status, 0);
    assert.equal(oversized.stdout.length, 0);
    assert.equal(stderr(oversized), "static-evaluator: input exceeds 1 MiB\n");

    const nonUtf8Path = path.join(directory, "non-utf8.json");
    writeFileSync(nonUtf8Path, Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x7d]));
    const nonUtf8 = runCli(["--input", nonUtf8Path]);
    assert.notEqual(nonUtf8.status, 0);
    assert.equal(nonUtf8.stdout.length, 0);
    assert.equal(stderr(nonUtf8), "static-evaluator: input is not valid UTF-8\n");
  });
});

test("invalid kernel input preserves existing output and discloses no details", () => {
  withTempDirectory((directory) => {
    const secret = "ghp_static_evaluator_secret_123456789";
    const inputPath = path.join(directory, `${secret}.json`);
    const outputPath = path.join(directory, "existing-output.json");
    const sentinel = "existing output must remain unchanged";
    writeFileSync(inputPath, JSON.stringify({ schemaVersion: secret }));
    writeFileSync(outputPath, sentinel);
    const result = runCli(["--input", inputPath, "--output", outputPath]);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout.length, 0);
    assert.equal(readFileSync(outputPath, "utf8"), sentinel);
    assert.equal(stderr(result), "static-evaluator: input is not accepted by the Phase 1 kernel\n");
    assert.doesNotMatch(stderr(result), new RegExp(secret));
    assert.doesNotMatch(stderr(result), /KernelBoundaryError|schemaVersion|\$\./);
  });
});

test("unavailable input and output do not disclose paths", () => {
  withTempDirectory((directory) => {
    const secret = "sk-live-static-evaluator-secret-123456";
    const missingPath = path.join(directory, secret, "input.json");
    const missing = runCli(["--input", missingPath]);
    assert.notEqual(missing.status, 0);
    assert.equal(missing.stdout.length, 0);
    assert.equal(stderr(missing), "static-evaluator: input file is unavailable\n");
    assert.doesNotMatch(stderr(missing), new RegExp(secret));

    const outputPath = path.join(directory, secret, "bundle.json");
    const output = runCli(["--input", EXAMPLE_INPUT, "--output", outputPath]);
    assert.notEqual(output.status, 0);
    assert.equal(output.stdout.length, 0);
    assert.equal(stderr(output), "static-evaluator: output file is unavailable\n");
    assert.doesNotMatch(stderr(output), new RegExp(secret));
  });
});
