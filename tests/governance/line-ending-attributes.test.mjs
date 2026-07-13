import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const LF_PATHS = [
  "config/evidence-contracts/proofrail-ai-pr-github-ci-v1.json",
  "config/policies/proofrail-ai-pr-github-ci-v1.json",
  "config/trusted/proofrail-release-v0.1.json",
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
