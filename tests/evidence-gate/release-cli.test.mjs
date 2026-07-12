import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  parseReleaseArguments,
  ReleaseDeliveryError,
  runReleaseCli,
} from "../../packages/evidence-gate/src/release-cli.mjs";
import { canonicalJson } from "../../packages/evidence-gate/src/index.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CONFIG = "config/trusted/proofrail-release-v0.1.json";
const SNAPSHOT = JSON.parse(await readFile(
  path.join(ROOT, "examples/release/github-pr-27.snapshot.json"),
  "utf8",
));

test("accepts only an explicit trusted configuration and optional output", () => {
  assert.deepEqual(parseReleaseArguments(["--trusted-config", CONFIG]), {
    trustedConfigurationPath: CONFIG,
    output: undefined,
  });
  for (const args of [
    [],
    ["--repo", "gogun-rgb/proofrail"],
    ["--trusted-config", CONFIG, "--trusted-config", CONFIG],
    ["--trusted-config"],
    ["--trusted-config", CONFIG, "--output"],
  ]) {
    assert.throws(() => parseReleaseArguments(args), fixedFailure("ARGUMENTS"));
  }
});

test("emits only one canonical finalized bundle with one trailing newline", async () => {
  let output = "";
  const bundle = await runReleaseCli(["--trusted-config", CONFIG], {
    collect: async () => structuredClone(SNAPSHOT),
    stdout: (text) => { output += text; },
  });
  assert.equal(output, `${canonicalJson(bundle)}\n`);
  assert.equal(output.endsWith("\n"), true);
  assert.equal(output.endsWith("\n\n"), false);
  assert.equal(bundle.verdict, "REVISION_REQUIRED");
});

test("maps gh collection failure to a fixed non-disclosing delivery failure", async () => {
  const canary = "SECRET_LIKE_GH_FAILURE_CANARY";
  await assert.rejects(
    runReleaseCli(["--trusted-config", CONFIG], {
      collect: async () => { throw new Error(canary); },
    }),
    (error) => fixedFailure("COLLECTION")(error) && !error.message.includes(canary),
  );
});

test("maps target validation and output publication failures to fixed stages", async () => {
  await assert.rejects(
    runReleaseCli(["--trusted-config", CONFIG], {
      collect: async () => ({ ...structuredClone(SNAPSHOT), number: 28 }),
    }),
    fixedFailure("EVALUATION"),
  );
  await assert.rejects(
    runReleaseCli(["--trusted-config", CONFIG, "--output", "bundle.json"], {
      collect: async () => structuredClone(SNAPSHOT),
      write: async () => { throw new Error("OUTPUT_CANARY"); },
    }),
    fixedFailure("OUTPUT"),
  );
});

test("refuses to overwrite any selected authority document", async () => {
  for (const output of [
    CONFIG,
    "config/policies/proofrail-ai-pr-github-ci-v1.json",
    "config/evidence-contracts/proofrail-ai-pr-github-ci-v1.json",
  ]) {
    await assert.rejects(
      runReleaseCli(["--trusted-config", CONFIG, "--output", output], {
        collect: async () => structuredClone(SNAPSHOT),
      }),
      fixedFailure("OUTPUT"),
    );
  }
});

function fixedFailure(stage) {
  return (error) => error instanceof ReleaseDeliveryError
    && error.code === "PROOFRAIL_RELEASE_DELIVERY_FAILED"
    && error.stage === stage
    && error.message === "PROOFRAIL_RELEASE_DELIVERY_FAILED";
}
