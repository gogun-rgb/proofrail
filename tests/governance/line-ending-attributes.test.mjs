import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  checkAutocrlfCheckout,
  verifyLfCheckout,
} from "../../scripts/governance/verify-lf-checkout.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const LF_PATHS = [
  "config/evidence-contracts/proofrail-ai-pr-github-ci-v1.json",
  "config/policies/proofrail-ai-pr-github-ci-v1.json",
  "config/reason-codes/product-reason-codes.json",
  "config/trusted/proofrail-release-v0.1.json",
  "docs/reference/product-fixtures.md",
  "docs/reference/reason-codes.md",
  "examples/evidence-gate/expected-output.json",
  "examples/evidence-gate/expected-report.txt",
  "examples/evidence-gate/github/declared-scope.json",
  "examples/evidence-gate/github/sanitized-pr-snapshot.json",
  "examples/evidence-gate/input.json",
  "examples/release/expected-evidence-bundle.json",
  "examples/release/expected-kernel-input.json",
  "examples/release/github-pr-27.snapshot.json",
  "examples/static-evaluator/expected-output.json",
  "examples/static-evaluator/input.json",
  "fixtures/product/_attribute-probe/manifest.json",
  "fixtures/product/_attribute-probe/expected-output.txt",
  "governance/architecture-check-preparation.json",
  "governance/clean-agent-run.schema.json",
  "governance/clean-agent-runs/_attribute-probe.json",
  "governance/tasks/PRODUCT-HARDEN-001.json",
  "schemas/product/fixture-manifest.schema.json",
];

test("exact-byte authority and golden files are checked out with LF", () => {
  const output = execFileSync(
    "git",
    ["check-attr", "-z", "text", "eol", "--", ...LF_PATHS],
    { cwd: ROOT, encoding: "utf8", windowsHide: true },
  );
  const fields = output.split("\0");
  assert.equal(fields.pop(), "");

  const attributes = new Map();
  for (let index = 0; index < fields.length; index += 3) {
    const [path, attribute, value] = fields.slice(index, index + 3);
    attributes.set(`${path}\0${attribute}`, value);
  }

  for (const path of LF_PATHS) {
    assert.equal(attributes.get(`${path}\0text`), "set", `${path} must be text`);
    assert.equal(attributes.get(`${path}\0eol`), "lf", `${path} must use LF`);
  }
  assert.equal(attributes.size, LF_PATHS.length * 2);
});

test("core.autocrlf=true checkout-index bytes remain identical to the index", async () => {
  assert.deepEqual(await checkAutocrlfCheckout(ROOT), []);
});

test("path-specific attribute overrides are rejected even when checkout bytes remain LF", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "proofrail-lf-attributes-"));
  const oraclePath = "fixtures/product/cases/contracts.constants.v1/oracle.json";
  try {
    await mkdir(path.join(root, path.dirname(oraclePath)), { recursive: true });
    await writeFile(
      path.join(root, ".gitattributes"),
      `* text eol=lf\n${oraclePath} -text -eol\n`,
      "utf8",
    );
    await writeFile(path.join(root, oraclePath), "{\n  \"verdict\": \"ADMISSIBLE\"\n}\n", "utf8");
    execFileSync("git", ["init", "--quiet"], { cwd: root, windowsHide: true });
    execFileSync("git", ["add", "--", ".gitattributes", oraclePath], {
      cwd: root,
      windowsHide: true,
    });

    assert.deepEqual(await checkAutocrlfCheckout(root), []);
    assert.deepEqual(await verifyLfCheckout(root), [
      { id: "LFCHK_ATTRIBUTE_INVALID", path: oraclePath, target: "eol" },
      { id: "LFCHK_ATTRIBUTE_INVALID", path: oraclePath, target: "text" },
    ]);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("an empty tracked artifact selection fails closed", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "proofrail-lf-empty-"));
  try {
    await writeFile(path.join(root, ".gitattributes"), "* text eol=lf\n", "utf8");
    execFileSync("git", ["init", "--quiet"], { cwd: root, windowsHide: true });
    execFileSync("git", ["add", "--", ".gitattributes"], { cwd: root, windowsHide: true });

    assert.deepEqual(await verifyLfCheckout(root), [
      { id: "LFCHK_TRACKED_SET_EMPTY", path: ".gitattributes", target: "<tracked>" },
    ]);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
