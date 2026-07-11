import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CLI = path.join(ROOT, "packages/evidence-gate/src/cli.mjs");
const EXAMPLE_INPUT = path.join(ROOT, "examples/evidence-gate/input.json");
const EXPECTED_OUTPUT = path.join(ROOT, "examples/evidence-gate/expected-output.json");
const EXPECTED_REPORT = path.join(ROOT, "examples/evidence-gate/expected-report.txt");
const MAX_INPUT_BYTES = 1024 * 1024;

function readExpectedOutput() {
  return readFileSync(EXPECTED_OUTPUT, "utf8").replace(/\r\n/g, "\n");
}

function readExpectedReport() {
  return readFileSync(EXPECTED_REPORT, "utf8").replace(/\r\n/g, "\n");
}

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

function paddedExample(size) {
  const source = readFileSync(EXAMPLE_INPUT);
  assert.ok(source.length <= size);
  return Buffer.concat([source, Buffer.alloc(size - source.length, 0x20)]);
}

function temporaryEntries(directory) {
  return readdirSync(directory).filter((name) => name.startsWith(".proofrail-"));
}

function createFileSymlinkOrSkip(t, target, link) {
  try {
    symlinkSync(target, link, "file");
    return true;
  } catch (error) {
    if (error && ["EACCES", "EPERM", "ENOSYS", "EOPNOTSUPP"].includes(error.code)) {
      t.skip("symbolic-link creation denied by OS: " + error.code);
      return false;
    }
    throw error;
  }
}

function createBrokenOutputLinkOrSkip(t, target, link) {
  try {
    symlinkSync(target, link, process.platform === "win32" ? "junction" : "file");
    return true;
  } catch (error) {
    if (error && ["EACCES", "EPERM", "ENOSYS", "EOPNOTSUPP"].includes(error.code)) {
      t.skip("broken-link creation denied by OS: " + error.code);
      return false;
    }
    throw error;
  }
}

function assertStaticAliasRejected(t, setup) {
  return withTempDirectory((directory) => {
    const configured = setup(t, directory);
    if (configured === null) return;
    const tracked = [...new Set(configured.tracked)];
    const before = tracked.map((file) => readFileSync(file));
    const result = runCli([
      "--input", configured.input,
      "--output", configured.output
    ]);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(
      result.stderr,
      "evidence-gate: input and output files must be different\n"
    );
    tracked.forEach((file, index) => {
      assert.deepEqual(readFileSync(file), before[index]);
    });
  });
}

test("CLI writes canonical example output to stdout with exactly one trailing newline", () => {
  const result = runCli(["--input", EXAMPLE_INPUT]);
  const expected = readExpectedOutput();

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
    assert.equal(readFileSync(outputPath, "utf8"), readExpectedOutput());
  });
});

test("CLI default JSON and explicit json format remain byte-identical", () => {
  const defaultResult = runCli(["--input", EXAMPLE_INPUT]);
  const explicitResult = runCli(["--input", EXAMPLE_INPUT, "--format", "json"]);
  assert.equal(defaultResult.status, 0);
  assert.equal(explicitResult.status, 0);
  assert.equal(explicitResult.stdout, defaultResult.stdout);
});

test("CLI writes deterministic human report to stdout and file", () => {
  const expected = readExpectedReport();
  const stdoutResult = runCli(["--input", EXAMPLE_INPUT, "--format", "human"]);
  assert.equal(stdoutResult.status, 0);
  assert.equal(stdoutResult.stderr, "");
  assert.equal(stdoutResult.stdout, expected);

  withTempDirectory((directory) => {
    const outputPath = path.join(directory, "report.txt");
    const fileResult = runCli([
      "--input", EXAMPLE_INPUT, "--format", "human", "--output", outputPath
    ]);
    assert.equal(fileResult.status, 0);
    assert.equal(fileResult.stdout, "");
    assert.equal(readFileSync(outputPath, "utf8"), expected);
  });
});

test("CLI replaces existing JSON and human outputs with exact staged bytes", () => {
  withTempDirectory((directory) => {
    for (const [format, expected] of [
      ["json", readExpectedOutput()],
      ["human", readExpectedReport()]
    ]) {
      const outputPath = path.join(directory, `existing-${format}.txt`);
      writeFileSync(outputPath, "PREVIOUS_OUTPUT_BYTES");
      const result = runCli([
        "--input", EXAMPLE_INPUT,
        "--format", format,
        "--output", outputPath
      ]);
      assert.equal(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.equal(readFileSync(outputPath, "utf8"), expected);
      assert.deepEqual(temporaryEntries(directory), []);
    }
  });
});

test("CLI rejects invalid and duplicate format arguments", () => {
  const invalid = runCli(["--input", EXAMPLE_INPUT, "--format", "yaml"]);
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /--format must be json or human/);
  const duplicate = runCli([
    "--input", EXAMPLE_INPUT, "--format", "human", "--format", "json"
  ]);
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /--format may be supplied only once/);
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
    const outputPath = path.join(directory, "existing-output.json");
    const originalOutput = Buffer.from("PRESERVE_OUTPUT_BEFORE_PARSE");
    writeFileSync(inputPath, `{\"apiKey\":\"${secret}\",\"pullRequest\":`, "utf8");

    writeFileSync(outputPath, originalOutput);
    const result = runCli(["--input", inputPath, "--output", outputPath]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /malformed JSON/i);
    assert.doesNotMatch(result.stderr, new RegExp(secret));
    assert.equal(result.stdout, "");
    assert.deepEqual(readFileSync(outputPath), originalOutput);
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("CLI reports invalid input shape without echoing secret-like values", () => {
  withTempDirectory((directory) => {
    const secret = "ghp_complete_secret_value_123456";
    const inputPath = path.join(directory, "invalid-shape.json");
    const outputPath = path.join(directory, "existing-output.json");
    const originalOutput = Buffer.from("PRESERVE_OUTPUT_BEFORE_BUILD");
    writeFileSync(inputPath, JSON.stringify({ pullRequest: secret }), "utf8");

    writeFileSync(outputPath, originalOutput);
    const result = runCli(["--input", inputPath, "--output", outputPath]);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pullRequest must be an object/);
    assert.doesNotMatch(result.stderr, new RegExp(secret));
    assert.equal(result.stdout, "");
    assert.deepEqual(readFileSync(outputPath), originalOutput);
    assert.deepEqual(temporaryEntries(directory), []);
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

test("CLI enforces bounded regular-file fatal UTF-8 input", async (t) => {
  await t.test("accepts exactly 1 MiB of valid JSON bytes", () => {
    withTempDirectory((directory) => {
      const inputPath = path.join(directory, "exact-limit.json");
      writeFileSync(inputPath, paddedExample(MAX_INPUT_BYTES));
      const result = runCli(["--input", inputPath]);
      assert.equal(result.status, 0);
      assert.equal(result.stderr, "");
      assert.equal(result.stdout, readExpectedOutput());
    });
  });

  await t.test("rejects one byte over 1 MiB", () => {
    withTempDirectory((directory) => {
      const inputPath = path.join(directory, "over-limit.json");
      writeFileSync(inputPath, paddedExample(MAX_INPUT_BYTES + 1));
      const result = runCli(["--input", inputPath]);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "evidence-gate: input file exceeds 1 MiB\n");
    });
  });

  await t.test("rejects a directory", () => {
    withTempDirectory((directory) => {
      const result = runCli(["--input", directory]);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "evidence-gate: input file must be a regular file\n");
    });
  });

  await t.test("rejects malformed UTF-8", () => {
    withTempDirectory((directory) => {
      const inputPath = path.join(directory, "invalid-utf8.json");
      writeFileSync(inputPath, Buffer.from([0x7b, 0x22, 0xc3, 0x28, 0x22, 0x7d]));
      const result = runCli(["--input", inputPath]);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "evidence-gate: input file is not valid UTF-8\n");
    });
  });

  await t.test("preserves a UTF-8 BOM for existing malformed-JSON behavior", () => {
    withTempDirectory((directory) => {
      const inputPath = path.join(directory, "bom.json");
      writeFileSync(inputPath, Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        readFileSync(EXAMPLE_INPUT)
      ]));
      const result = runCli(["--input", inputPath]);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "evidence-gate: input file contains malformed JSON\n");
    });
  });

  await t.test("uses a fixed non-disclosing read error", () => {
    const secret = "SYNTHETIC_INPUT_PATH_SECRET_DO_NOT_DISCLOSE";
    const result = runCli(["--input", "missing-" + secret + ".json"]);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "evidence-gate: could not read the input file\n");
    assert.doesNotMatch(result.stderr, new RegExp(secret));
  });

  await t.test("preserves input failure categories with an existing distinct output", () => {
    withTempDirectory((directory) => {
      const output = path.join(directory, "existing-output.json");
      const inputDirectory = path.join(directory, "input-directory");
      const oversized = path.join(directory, "oversized.json");
      const invalidUtf8 = path.join(directory, "invalid-utf8.json");
      const missing = path.join(directory, "missing.json");
      const originalOutput = Buffer.from("PRESERVE_EXISTING_OUTPUT");
      mkdirSync(inputDirectory);
      writeFileSync(oversized, paddedExample(MAX_INPUT_BYTES + 1));
      writeFileSync(invalidUtf8, Buffer.from([0xc3, 0x28]));
      writeFileSync(output, originalOutput);

      for (const [input, message] of [
        [missing, "could not read the input file"],
        [inputDirectory, "input file must be a regular file"],
        [oversized, "input file exceeds 1 MiB"],
        [invalidUtf8, "input file is not valid UTF-8"]
      ]) {
        const result = runCli(["--input", input, "--output", output]);
        assert.notEqual(result.status, 0);
        assert.equal(result.stdout, "");
        assert.equal(result.stderr, "evidence-gate: " + message + "\n");
        assert.deepEqual(readFileSync(output), originalOutput);
        assert.deepEqual(temporaryEntries(directory), []);
      }
    });
  });
});

test("CLI uses fixed output errors without mutating invalid targets", async (t) => {
  await t.test("directory output", () => {
    withTempDirectory((directory) => {
      const before = readdirSync(directory);
      const result = runCli(["--input", EXAMPLE_INPUT, "--output", directory]);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "evidence-gate: could not write the output file\n");
      assert.deepEqual(readdirSync(directory), before);
    });
  });

  await t.test("missing parent", () => {
    withTempDirectory((directory) => {
      const secret = "SYNTHETIC_OUTPUT_PATH_SECRET_DO_NOT_DISCLOSE";
      const missingParent = path.join(directory, "missing-" + secret);
      const output = path.join(missingParent, "packet.json");
      const result = runCli(["--input", EXAMPLE_INPUT, "--output", output]);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "evidence-gate: could not write the output file\n");
      assert.doesNotMatch(result.stderr, new RegExp(secret));
      assert.equal(existsSync(missingParent), false);
      assert.deepEqual(temporaryEntries(directory), []);
    });
  });

  await t.test("broken symbolic link or junction", (subtest) => {
    withTempDirectory((directory) => {
      const missingTarget = path.join(directory, "missing-target");
      const output = path.join(directory, "broken-link.json");
      const inputBefore = readFileSync(EXAMPLE_INPUT);
      if (!createBrokenOutputLinkOrSkip(subtest, missingTarget, output)) return;
      const result = runCli(["--input", EXAMPLE_INPUT, "--output", output]);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "evidence-gate: could not write the output file\n");
      assert.equal(lstatSync(output).isSymbolicLink(), true);
      assert.equal(existsSync(missingTarget), false);
      assert.deepEqual(readFileSync(EXAMPLE_INPUT), inputBefore);
      assert.deepEqual(temporaryEntries(directory), []);
    });
  });
});

test("CLI preserves a healthy output symlink and updates its canonical target", (t) => {
  withTempDirectory((directory) => {
    const linkDirectory = path.join(directory, "links");
    const targetDirectory = path.join(directory, "targets");
    mkdirSync(linkDirectory);
    mkdirSync(targetDirectory);
    const target = path.join(targetDirectory, "packet-target.json");
    const output = path.join(linkDirectory, "packet-link.json");
    writeFileSync(target, "PREVIOUS_TARGET_BYTES");
    if (!createFileSymlinkOrSkip(t, target, output)) return;

    const result = runCli(["--input", EXAMPLE_INPUT, "--output", output]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.equal(lstatSync(output).isSymbolicLink(), true);
    assert.equal(readFileSync(target, "utf8"), readExpectedOutput());
    assert.equal(readFileSync(output, "utf8"), readExpectedOutput());
    assert.deepEqual(temporaryEntries(linkDirectory), []);
    assert.deepEqual(temporaryEntries(targetDirectory), []);
  });
});

test("CLI replaces only a selected hardlink entry", () => {
  withTempDirectory((directory) => {
    const sibling = path.join(directory, "sibling.json");
    const output = path.join(directory, "selected.json");
    const original = Buffer.from("SHARED_ORIGINAL_BYTES");
    writeFileSync(sibling, original);
    linkSync(sibling, output);
    const beforeSibling = statSync(sibling, { bigint: true });
    const beforeOutput = statSync(output, { bigint: true });
    assert.equal(beforeSibling.dev, beforeOutput.dev);
    assert.equal(beforeSibling.ino, beforeOutput.ino);

    const result = runCli(["--input", EXAMPLE_INPUT, "--output", output]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.deepEqual(readFileSync(sibling), original);
    assert.equal(readFileSync(output, "utf8"), readExpectedOutput());
    const afterSibling = statSync(sibling, { bigint: true });
    const afterOutput = statSync(output, { bigint: true });
    if (afterSibling.dev !== 0n || afterSibling.ino !== 0n) {
      assert.notEqual(`${afterSibling.dev}:${afterSibling.ino}`, `${afterOutput.dev}:${afterOutput.ino}`);
    }
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("CLI rejects stable same-file input/output aliases without mutation", async (t) => {
  await t.test("same spelling", (subtest) => {
    assertStaticAliasRejected(subtest, (_current, directory) => {
      const input = path.join(directory, "input.json");
      writeFileSync(input, readFileSync(EXAMPLE_INPUT));
      return { input, output: input, tracked: [input] };
    });
  });

  await t.test("dot spelling", (subtest) => {
    assertStaticAliasRejected(subtest, (_current, directory) => {
      const input = path.join(directory, "input.json");
      writeFileSync(input, readFileSync(EXAMPLE_INPUT));
      const output = directory + path.sep + "." + path.sep + "input.json";
      return { input, output, tracked: [input] };
    });
  });

  await t.test("relative and absolute spelling", (subtest) => {
    assertStaticAliasRejected(subtest, (_current, directory) => {
      const absoluteInput = path.join(directory, "input.json");
      writeFileSync(absoluteInput, readFileSync(EXAMPLE_INPUT));
      return {
        input: path.relative(ROOT, absoluteInput),
        output: absoluteInput,
        tracked: [absoluteInput]
      };
    });
  });

  await t.test("parent spelling", (subtest) => {
    assertStaticAliasRejected(subtest, (_current, directory) => {
      const input = path.join(directory, "input.json");
      const child = path.join(directory, "child");
      mkdirSync(child);
      writeFileSync(input, readFileSync(EXAMPLE_INPUT));
      const output = child + path.sep + ".." + path.sep + "input.json";
      return { input, output, tracked: [input] };
    });
  });

  await t.test("hardlink", (subtest) => {
    assertStaticAliasRejected(subtest, (_current, directory) => {
      const input = path.join(directory, "input.json");
      const output = path.join(directory, "hardlink.json");
      writeFileSync(input, readFileSync(EXAMPLE_INPUT));
      linkSync(input, output);
      return { input, output, tracked: [input, output] };
    });
  });

  await t.test("output symbolic link targets input", (subtest) => {
    assertStaticAliasRejected(subtest, (current, directory) => {
      const input = path.join(directory, "input.json");
      const output = path.join(directory, "output-link.json");
      writeFileSync(input, readFileSync(EXAMPLE_INPUT));
      if (!createFileSymlinkOrSkip(current, input, output)) return null;
      return { input, output, tracked: [input, output] };
    });
  });

  await t.test("input symbolic link targets output", (subtest) => {
    assertStaticAliasRejected(subtest, (current, directory) => {
      const input = path.join(directory, "input-link.json");
      const output = path.join(directory, "target.json");
      writeFileSync(output, readFileSync(EXAMPLE_INPUT));
      if (!createFileSymlinkOrSkip(current, output, input)) return null;
      return { input, output, tracked: [input, output] };
    });
  });

  if (process.platform === "win32") {
    await t.test("case-resolved spelling", (subtest) => {
      assertStaticAliasRejected(subtest, (_current, directory) => {
        const input = path.join(directory, "MiXeD.json");
        writeFileSync(input, readFileSync(EXAMPLE_INPUT));
        return { input, output: input.toUpperCase(), tracked: [input] };
      });
    });
  }
});

test("CLI accepts a bounded regular-file symbolic-link input with distinct output", (t) => {
  withTempDirectory((directory) => {
    const target = path.join(directory, "target.json");
    const input = path.join(directory, "input-link.json");
    const output = path.join(directory, "packet.json");
    writeFileSync(target, readFileSync(EXAMPLE_INPUT));
    if (!createFileSymlinkOrSkip(t, target, input)) return;

    const result = runCli(["--input", input, "--output", output]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.equal(readFileSync(output, "utf8"), readExpectedOutput());
    assert.deepEqual(readFileSync(target), readFileSync(EXAMPLE_INPUT));
  });
});
