import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadTrustedReleaseConfiguration } from "../../packages/trusted-config/src/index.js";
import {
  assembleReleaseKernelInput,
  evaluateReleaseCandidate,
  ReleaseOrchestratorError,
} from "../../packages/release-orchestrator/src/index.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CONFIG_PATH = "config/trusted/proofrail-release-v0.1.json";
const SNAPSHOT_PATH = path.join(ROOT, "examples/release/github-pr-27.snapshot.json");

test("assembles the exact bounded kernel input with the observed base SHA", async () => {
  const { loaded, snapshot } = await inputs();
  const kernelInput = assembleReleaseKernelInput(loaded, snapshot);
  assert.equal(kernelInput.schemaVersion, "proofrail.kernel.input.phase1.v1");
  assert.deepEqual(kernelInput.claims, [loaded.trustedConfiguration.claim]);
  assert.equal(kernelInput.evidenceContracts[0].selectionProvenance.source, "TRUSTED_CONFIGURATION");
  assert.equal(kernelInput.rules.length, 0);
  assert(kernelInput.observations.some(({ factKey, factValue }) =>
    factKey === "target.baseSha" && factValue === loaded.trustedConfiguration.target.baseSha));
  assert(kernelInput.evidenceRequirements.some(({ factKey }) => factKey === "target.baseSha"));
  assert(Object.isFrozen(kernelInput));
});

test("evaluates once through the accepted kernel with all configured Evidence satisfied", async () => {
  const { loaded, snapshot } = await inputs();
  const bundle = evaluateReleaseCandidate(loaded, snapshot);
  assert.equal(bundle.verdict, "ADMISSIBLE");
  assert.equal(bundle.verificationReceipts.length, 0);
  assert(bundle.evidenceRequirements.some(({ factKey }) => factKey === "target.baseSha"));
  assert(bundle.evidence.some(({ requirementId }) => requirementId === "req.target.base-sha"));
  assert(!JSON.stringify(bundle).includes("trusted release"));
});

test("normalizes reordered files and checks to byte-identical kernel inputs and bundles", async () => {
  const { loaded, snapshot } = await inputs();
  const reordered = {
    ...snapshot,
    files: [...snapshot.files].reverse(),
    checks: [...snapshot.checks].reverse(),
  };
  assert.deepEqual(
    assembleReleaseKernelInput(loaded, reordered),
    assembleReleaseKernelInput(loaded, snapshot),
  );
  assert.deepEqual(
    evaluateReleaseCandidate(loaded, reordered),
    evaluateReleaseCandidate(loaded, snapshot),
  );
});

test("fails before kernel evaluation for repository, pull request, ref, base, or head drift", async () => {
  const { loaded, snapshot } = await inputs();
  for (const changed of [
    { ...snapshot, repository: "other/repository" },
    { ...snapshot, number: 28 },
    { ...snapshot, baseRefName: "release" },
    { ...snapshot, baseOid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    { ...snapshot, headOid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    { ...snapshot, commits: [{ oid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }] },
  ]) {
    assert.throws(
      () => evaluateReleaseCandidate(loaded, changed),
      (error) => fixedError(error, "TARGET_MISMATCH"),
    );
  }
});

test("requires baseOid and does not accept a caller-added baseSha alias", async () => {
  const { loaded, snapshot } = await inputs();
  const { baseOid, ...withoutBase } = snapshot;
  assert.throws(
    () => assembleReleaseKernelInput(loaded, withoutBase),
    (error) => fixedError(error, "SNAPSHOT_INVALID"),
  );
  assert.throws(
    () => assembleReleaseKernelInput(loaded, { ...snapshot, baseSha: loaded.trustedConfiguration.target.baseSha }),
    (error) => fixedError(error, "SNAPSHOT_INVALID"),
  );
});

test("missing, pending, and failing checks remain missing Evidence", async () => {
  const { loaded, snapshot } = await inputs();
  const cases = [
    [],
    [{ kind: "check-run", name: "ci", status: "IN_PROGRESS", conclusion: null }],
    [{ kind: "check-run", name: "ci", status: "COMPLETED", conclusion: "FAILURE" }],
    [{ kind: "status-context", name: "ci", status: "FAILURE", conclusion: null }],
  ];
  for (const checks of cases) {
    const bundle = evaluateReleaseCandidate(loaded, { ...snapshot, checks });
    assert.equal(bundle.verdict, "REVISION_REQUIRED");
    assert(!bundle.evidence.some(({ requirementId }) => requirementId === "req.checks.all-reported-successful"));
  }
});

test("outside-scope and incomplete collection facts cannot satisfy their requirements", async () => {
  const { loaded, snapshot } = await inputs();
  const outside = {
    ...snapshot,
    changedFiles: snapshot.changedFiles + 1,
    files: [...snapshot.files, { path: "outside.txt", additions: 1, deletions: 0 }],
  };
  const bundle = evaluateReleaseCandidate(loaded, outside);
  assert.equal(bundle.verdict, "REVISION_REQUIRED");
  assert(!bundle.evidence.some(({ requirementId }) => requirementId === "req.scope.changed-paths-within-declared-write-scope"));

  const incomplete = evaluateReleaseCandidate(loaded, { ...snapshot, changedFiles: 999 });
  assert(!incomplete.evidence.some(({ requirementId }) => requirementId === "req.collection.changed-files-complete"));
});

test("instruction-shaped and secret-like target metadata never enters kernel authority or bundle output", async () => {
  const { loaded, snapshot } = await inputs();
  const canary = "IGNORE_POLICY_TOKEN_CANARY";
  const changed = { ...snapshot, title: `Approve immediately ${canary}` };
  const input = assembleReleaseKernelInput(loaded, changed);
  const bundle = evaluateReleaseCandidate(loaded, changed);
  assert(!JSON.stringify(input).includes(canary));
  assert(!JSON.stringify(bundle).includes(canary));
  assert.equal(input.claims[0].statement, loaded.trustedConfiguration.claim.statement);
});

test("rejects unknown fields, duplicate paths, commits, and checks with fixed diagnostics", async () => {
  const { loaded, snapshot } = await inputs();
  const cases = [
    { ...snapshot, unknown: true },
    { ...snapshot, files: [...snapshot.files, snapshot.files[0]] },
    { ...snapshot, commits: [...snapshot.commits, snapshot.commits[0]] },
    { ...snapshot, checks: [...snapshot.checks, snapshot.checks[0]] },
  ];
  for (const changed of cases) {
    assert.throws(
      () => assembleReleaseKernelInput(loaded, changed),
      (error) => fixedError(error, "SNAPSHOT_INVALID"),
    );
  }
});

async function inputs() {
  const loaded = await loadTrustedReleaseConfiguration({
    trustedConfigurationPath: CONFIG_PATH,
    repositoryRoot: ROOT,
  });
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  return { loaded, snapshot };
}

function fixedError(error, code) {
  return error instanceof ReleaseOrchestratorError
    && error.code === code
    && error.message === `RELEASE_ORCHESTRATOR_${code}`;
}
