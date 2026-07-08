import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HELPER = path.join(REPO_ROOT, "scripts/governance/check-committed-whitespace.mjs");

function createGitRepo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proofrail-whitespace-"));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  git(root, ["init"]);
  git(root, ["config", "user.email", "synthetic@example.test"]);
  git(root, ["config", "user.name", "Synthetic Test"]);
  git(root, ["config", "core.autocrlf", "false"]);
  return root;
}

function git(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}

function writeText(root, repoPath, content) {
  const filePath = path.join(root, ...repoPath.split("/"));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function commitFile(root, repoPath, content, message) {
  writeText(root, repoPath, content);
  git(root, ["add", repoPath]);
  git(root, ["commit", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function runHelper(root, args) {
  return spawnSync(process.execPath, [HELPER, ...args], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
}

test("committed whitespace helper accepts a clean committed range", (t) => {
  const root = createGitRepo(t);
  const base = commitFile(root, "clean.txt", "alpha\n", "base");
  const head = commitFile(root, "next.txt", "beta\n", "head");

  const result = runHelper(root, ["--mode", "merge-base", base, head]);
  assert.equal(result.status, 0);
});

test("committed whitespace helper detects a committed trailing-whitespace defect", (t) => {
  const root = createGitRepo(t);
  const base = commitFile(root, "clean.txt", "alpha\n", "base");
  const head = commitFile(root, "bad.txt", "beta   \n", "head");

  const result = runHelper(root, ["--mode", "merge-base", base, head]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, /trailing whitespace/);
});

test("committed whitespace helper ignores unrelated uncommitted worktree defects", (t) => {
  const root = createGitRepo(t);
  const base = commitFile(root, "clean.txt", "alpha\n", "base");
  const head = commitFile(root, "next.txt", "beta\n", "head");
  writeText(root, "uncommitted.txt", "gamma   \n");

  const result = runHelper(root, ["--mode", "direct", base, head]);
  assert.equal(result.status, 0);
});

test("committed whitespace helper rejects missing base or head arguments deterministically", (t) => {
  const root = createGitRepo(t);
  commitFile(root, "clean.txt", "alpha\n", "base");

  const first = runHelper(root, ["--mode", "direct", "HEAD"]);
  const second = runHelper(root, ["--mode", "direct", "HEAD"]);

  assert.equal(first.status, 2);
  assert.equal(second.status, 2);
  assert.equal(first.stderr, second.stderr);
  assert.match(first.stderr, /^Usage:/);
});
