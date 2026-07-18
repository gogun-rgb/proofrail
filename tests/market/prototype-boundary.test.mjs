import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PrototypeBoundaryError,
  assertWorktreeSnapshotStable,
  captureWorktreeSnapshot,
} from "../../packages/evidence-gate/src/prototype-boundary.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "proofrail-boundary-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "baseline"), { recursive: true });
  await writeFile(path.join(root, "baseline", "tracked.txt"), "original\n", "utf8");
  return root;
}

async function expectStale(snapshot) {
  await assert.rejects(
    assertWorktreeSnapshotStable(snapshot),
    (error) => error instanceof PrototypeBoundaryError && error.reason === "PRF_STALE_TARGET",
  );
}

test("worktree baseline permits fresh dependency and build output directories", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, "packages", "workspace"), { recursive: true });
  const snapshot = await captureWorktreeSnapshot(root);

  await mkdir(path.join(root, "node_modules", "example"), { recursive: true });
  await writeFile(path.join(root, "node_modules", "example", "index.js"), "export {};\n", "utf8");
  await mkdir(path.join(root, "packages", "workspace", "node_modules", "example"), { recursive: true });
  await writeFile(path.join(root, "packages", "workspace", "node_modules", "example", "index.js"), "export {};\n", "utf8");
  await mkdir(path.join(root, "dist"), { recursive: true });
  await writeFile(path.join(root, "dist", "bundle.js"), "console.log('built');\n", "utf8");

  await assert.doesNotReject(assertWorktreeSnapshotStable(snapshot));
});

test("worktree baseline rejects an arbitrary top-level addition", async (t) => {
  const root = await fixture(t);
  const snapshot = await captureWorktreeSnapshot(root);
  await writeFile(path.join(root, "runner-created-sentinel.txt"), "unexpected\n", "utf8");

  await expectStale(snapshot);
});

test("worktree baseline rejects an arbitrary nested addition", async (t) => {
  const root = await fixture(t);
  const snapshot = await captureWorktreeSnapshot(root);
  await mkdir(path.join(root, "baseline", "runner-created"));
  await writeFile(path.join(root, "baseline", "runner-created", "sentinel.txt"), "unexpected\n", "utf8");

  await expectStale(snapshot);
});

test("worktree baseline rejects generated-output roots with a non-directory type", async (t) => {
  const root = await fixture(t);
  const snapshot = await captureWorktreeSnapshot(root);
  await writeFile(path.join(root, "dist"), "not a directory\n", "utf8");

  await expectStale(snapshot);
});

test("worktree baseline rejects mutation, deletion, and replacement of retained files", async (t) => {
  const root = await fixture(t);
  const tracked = path.join(root, "baseline", "tracked.txt");

  const mutation = await captureWorktreeSnapshot(root);
  await writeFile(tracked, "changed\n", "utf8");
  await expectStale(mutation);

  await writeFile(tracked, "original\n", "utf8");
  const deletion = await captureWorktreeSnapshot(root);
  await rm(tracked);
  await expectStale(deletion);

  await writeFile(tracked, "original\n", "utf8");
  const replacement = await captureWorktreeSnapshot(root);
  await rm(tracked);
  await mkdir(tracked);
  await expectStale(replacement);
});

test("worktree baseline rejects relinking a retained entry", { skip: process.platform === "win32" }, async (t) => {
  const root = await fixture(t);
  const tracked = path.join(root, "baseline", "tracked.txt");
  const snapshot = await captureWorktreeSnapshot(root);
  await rm(tracked);
  await symlink("replacement", tracked);

  await expectStale(snapshot);
  assert.equal((await lstat(tracked)).isSymbolicLink(), true);
});

test("worktree baseline rejects additions beneath git metadata", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, ".git"));
  const snapshot = await captureWorktreeSnapshot(root);
  await mkdir(path.join(root, ".git", "objects"));
  await writeFile(path.join(root, ".git", "objects", "new-entry"), "metadata\n", "utf8");

  await expectStale(snapshot);
});

test("worktree baseline rejects generated-output additions beneath git metadata", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, ".git"));
  const snapshot = await captureWorktreeSnapshot(root);
  await assert.doesNotReject(assertWorktreeSnapshotStable(snapshot));
  await mkdir(path.join(root, ".git", "node_modules", "sentinel"), { recursive: true });
  await writeFile(path.join(root, ".git", "node_modules", "sentinel", "later-command-input"), "metadata\n", "utf8");

  await expectStale(snapshot);
});
