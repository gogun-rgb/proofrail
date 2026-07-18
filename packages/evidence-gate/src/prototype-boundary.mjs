import { createHash, randomBytes } from "node:crypto";
import { mkdir, lstat, readFile, readlink, realpath, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const MAX_HASH_BYTES = 64 * 1024 * 1024;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export class PrototypeBoundaryError extends Error {
  constructor(reason, message = reason) {
    super(message);
    this.name = "PrototypeBoundaryError";
    this.reason = reason;
  }
}

export function assertSafeRepositoryPath(value) {
  if (typeof value !== "string"
      || value === ""
      || value.includes("\u0000")
      || value.includes("\\")
      || value.startsWith("/")
      || /^[A-Za-z]:/.test(value)) {
    throw new PrototypeBoundaryError("PRF_SCOPE_PATH_NOT_ALLOWED", "changed path is not repository-relative");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new PrototypeBoundaryError("PRF_SCOPE_PATH_NOT_ALLOWED", "changed path contains traversal");
  }
  return value;
}

export async function assertRepositoryChangedPaths(snapshot, repositoryPath) {
  if (!snapshot || !Array.isArray(snapshot.files)) {
    throw new PrototypeBoundaryError("PRF_SCOPE_PATH_NOT_ALLOWED", "changed paths are unavailable");
  }
  const root = path.resolve(repositoryPath);
  await assertNoSymlinkAncestors(root);
  for (const file of snapshot.files) {
    const relative = assertSafeRepositoryPath(file?.path);
    const candidate = path.resolve(root, ...relative.split("/"));
    if (!isWithin(root, candidate)) {
      throw new PrototypeBoundaryError("PRF_SCOPE_PATH_NOT_ALLOWED", "changed path escapes repository");
    }
    await assertNoSymlinkAncestors(candidate);
  }
}

export async function captureWorktreeSnapshot(repositoryPath) {
  const root = path.resolve(repositoryPath);
  await assertNoSymlinkAncestors(root);
  const rootEntry = await captureWorktreeEntry(root, "");
  if (rootEntry.kind !== "directory") {
    throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target checkout is not a directory");
  }
  const entries = [];
  await walkWorktree(root, "", entries);
  return Object.freeze({ root, rootEntry, entries });
}

export async function assertWorktreeSnapshotStable(before) {
  if (!before || typeof before.root !== "string" || !before.rootEntry || !Array.isArray(before.entries)) {
    throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target worktree baseline is unavailable");
  }
  for (const entry of [before.rootEntry, ...before.entries]) {
    const currentPath = entry.relative === "" ? before.root : path.join(before.root, ...entry.relative.split("/"));
    const current = await captureWorktreeEntry(currentPath, entry.relative);
    if (!sameBaselineWorktreeEntry(entry, current)) {
      throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target worktree changed during verification");
    }
  }
  await assertNoUnrecognizedWorktreeAdditions(before);
  return before;
}

export function rejectUnsafeArgumentPath(value, field) {
  if (typeof value !== "string" || value === "" || value.includes("\u0000")) {
    throw new PrototypeBoundaryError("PATH_INVALID", `${field} is invalid`);
  }
  const segments = value.replaceAll("\\", "/").split("/");
  if (segments.includes("..")) {
    throw new PrototypeBoundaryError("PATH_INVALID", `${field} contains traversal`);
  }
  return path.resolve(value);
}

export async function capturePrototypeOutputPath(value) {
  return captureOutputPath(value);
}

export async function capturePrototypePaths(options, capturedOutput = undefined) {
  const event = await capturePath(options.event, "event", "file");
  const repository = await capturePath(options.repository, "repository", "directory");
  const config = await capturePath(options.config, "config", "file");
  const shell = await capturePath(options.shell, "shell", "file");
  const output = await captureOutputPath(options.output);
  if (capturedOutput !== undefined) assertSameIdentity(capturedOutput, output, "OUTPUT_CHANGED");
  assertDistinct(event, repository, "event", "repository");
  assertDistinct(event, config, "event", "config");
  assertDistinct(event, shell, "event", "shell");
  assertDistinct(config, shell, "config", "shell");
  assertDistinct(config, output, "config", "output");
  assertDistinct(event, output, "event", "output");
  assertDistinct(shell, output, "shell", "output");
  assertDistinct(repository, output, "repository", "output");
  if (isWithin(repository.realPath, output.realPath)) {
    throw new PrototypeBoundaryError("OUTPUT_ALIAS", "output is inside the target checkout");
  }
  return Object.freeze({ event, repository, config, shell, output });
}

export async function readStableInput(file, read, maxBytes) {
  const before = await capturePath(file.path, file.field, "file");
  const source = await read(file.path, maxBytes);
  const after = await capturePath(file.path, file.field, "file");
  assertSameIdentity(before, after, "INPUT_CHANGED");
  return Object.freeze({ source, identity: after });
}

export async function assertPrototypePathsStable(paths) {
  for (const entry of [paths.event, paths.repository, paths.config, paths.shell, paths.output]) {
    const current = entry.kind === "missing-directory"
      ? await captureOutputPath(entry.path)
      : await capturePath(entry.path, entry.field, entry.kind);
    assertSameIdentity(entry, current, "BOUNDARY_CHANGED");
  }
}

export function assertApprovedShell(shell, authority) {
  const configured = authority.trustedConfiguration.executionBoundary;
  const allowed = configured.allowedShellPaths ?? configured.approvedShellPaths;
  if (Array.isArray(allowed) && allowed.length > 0) {
    const match = allowed.some((candidate) => samePath(shell.realPath, path.resolve(candidate)));
    if (!match) throw new PrototypeBoundaryError("UNAUTHORIZED_SHELL", "shell is not authority-approved");
    return;
  }
  const name = path.basename(shell.realPath).toLowerCase();
  if (!new Set(["bash", "bash.exe"]).has(name)) {
    throw new PrototypeBoundaryError("UNAUTHORIZED_SHELL", "shell is not an approved bash executable");
  }
}

export function assertNetworkBoundary(authority, attestation) {
  const policy = String(authority.trustedConfiguration.executionBoundary.networkPolicy ?? "").toUpperCase();
  const denied = /NO[_ -]?NETWORK|NETWORK[_ -]?DENIED|DENY[_ -]?NETWORK|EGRESS[_ -]?DENIED|OFFLINE/.test(policy);
  if (denied && attestation?.enforcesNetwork !== true) {
    throw new PrototypeBoundaryError("BLOCKED_EXECUTION_BOUNDARY", "network denial is not enforceable");
  }
}

export async function publishPrototypeOutput(output, files, write) {
  const stage = path.join(output.parentPath, `.proofrail-${randomBytes(12).toString("hex")}`);
  let movedExisting = null;
  try {
    await mkdir(stage, { recursive: false });
    for (const [name, content] of files) await write(path.join(stage, name), content);
    const current = await captureOutputPath(output.path);
    if (current.kind === "directory") assertSameIdentity(output, current, "OUTPUT_CHANGED");
    if (current.kind === "directory") {
      movedExisting = `${output.path}.previous-${randomBytes(8).toString("hex")}`;
      await rename(output.path, movedExisting);
    } else if (current.kind !== "missing-directory") {
      throw new PrototypeBoundaryError("OUTPUT_WRITE_FAILED", "output is not a directory");
    }
    try {
      await rename(stage, output.path);
    } catch (error) {
      if (movedExisting !== null) await rename(movedExisting, output.path).catch(() => {});
      throw error;
    }
    if (movedExisting !== null) await rm(movedExisting, { recursive: true, force: true });
  } catch (error) {
    await rm(stage, { recursive: true, force: true }).catch(() => {});
    if (movedExisting !== null) {
      const exists = await pathExists(output.path);
      if (!exists) await rename(movedExisting, output.path).catch(() => {});
    }
    if (error instanceof PrototypeBoundaryError) throw error;
    throw new PrototypeBoundaryError("OUTPUT_WRITE_FAILED", "output publication failed");
  }
}

async function capturePath(value, field, expectedKind) {
  const resolved = path.resolve(value);
  await assertNoSymlinkAncestors(resolved);
  let details;
  try {
    details = await lstat(resolved, { bigint: true });
  } catch {
    throw new PrototypeBoundaryError("READ_FAILED", `${field} cannot be inspected`);
  }
  if (details.isSymbolicLink()) throw new PrototypeBoundaryError("FILE_ALIAS", `${field} is symbolic`);
  const realPath = await realpath(resolved).catch(() => { throw new PrototypeBoundaryError("READ_FAILED", `${field} cannot be resolved`); });
  if (!samePath(resolved, realPath)) throw new PrototypeBoundaryError("FILE_ALIAS", `${field} resolves through an alias`);
  if (expectedKind === "file" && !details.isFile()) throw new PrototypeBoundaryError("NOT_REGULAR", `${field} is not a file`);
  if (expectedKind === "directory" && !details.isDirectory()) throw new PrototypeBoundaryError("NOT_REGULAR", `${field} is not a directory`);
  const digest = details.isFile() ? await boundedDigest(realPath, details.size) : null;
  return Object.freeze({ path: resolved, realPath, parentPath: path.dirname(realPath), field, kind: expectedKind, dev: details.dev, ino: details.ino, size: details.size, mtimeNs: details.mtimeNs, digest });
}

async function captureOutputPath(value) {
  const resolved = path.resolve(value);
  await assertNoSymlinkAncestors(path.dirname(resolved));
  try {
    return await capturePath(resolved, "output", "directory");
  } catch (error) {
    if (!(error instanceof PrototypeBoundaryError) || !["READ_FAILED", "NOT_REGULAR"].includes(error.reason)) throw error;
    if (await pathExists(resolved)) {
      if (error.reason === "NOT_REGULAR") return capturePath(resolved, "output", "file");
      throw error;
    }
    const parentPath = await realpath(path.dirname(resolved)).catch(() => { throw new PrototypeBoundaryError("OUTPUT_WRITE_FAILED", "output parent cannot be resolved"); });
    const parent = await capturePath(parentPath, "output-parent", "directory");
    return Object.freeze({ path: resolved, realPath: resolved, parentPath: parent.realPath, field: "output", kind: "missing-directory", dev: null, ino: null, size: null, mtimeNs: null, digest: null });
  }
}

async function walkWorktree(root, relative, entries) {
  const directory = relative === "" ? root : path.join(root, ...relative.split("/"));
  let children;
  try {
    children = await readdir(directory, { withFileTypes: true });
  } catch {
    throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target worktree cannot be inspected");
  }
  children.sort((left, right) => left.name.localeCompare(right.name, "en", { sensitivity: "variant" }));
  for (const child of children) {
    const childRelative = relative === "" ? child.name : `${relative}/${child.name}`;
    const absolute = path.join(root, ...childRelative.split("/"));
    const entry = await captureWorktreeEntry(absolute, childRelative);
    entries.push(entry);
    if (entry.kind === "directory") await walkWorktree(root, childRelative, entries);
  }
}

async function captureWorktreeEntry(value, relative) {
  let details;
  try {
    details = await lstat(value, { bigint: true });
  } catch {
    throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target worktree cannot be inspected");
  }
  const kind = details.isDirectory()
    ? "directory"
    : details.isFile()
      ? "file"
      : details.isSymbolicLink()
        ? "symbolic-link"
        : "special";
  let digest = null;
  let linkTarget = null;
  if (kind === "file") digest = await boundedDigest(value, details.size);
  if (kind === "symbolic-link") {
    try {
      linkTarget = await readlink(value, "utf8");
    } catch {
      throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target symbolic link cannot be inspected");
    }
  }
  return Object.freeze({
    relative,
    kind,
    dev: details.dev,
    ino: details.ino,
    mode: details.mode,
    size: details.size,
    mtimeNs: details.mtimeNs,
    ctimeNs: details.ctimeNs,
    digest,
    linkTarget,
  });
}

function sameBaselineWorktreeEntry(left, right) {
  if (left.kind === "directory") {
    return left.relative === right.relative
      && left.kind === right.kind
      && left.dev === right.dev
      && left.ino === right.ino
      && left.mode === right.mode;
  }
  return left.relative === right.relative
    && left.kind === right.kind
    && left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.digest === right.digest
    && left.linkTarget === right.linkTarget;
}

async function assertNoUnrecognizedWorktreeAdditions(before) {
  const baselinePaths = new Set(before.entries.map((entry) => entry.relative));
  await assertNoUnrecognizedWorktreeEntry(before.root, "", baselinePaths);
}

async function assertNoUnrecognizedWorktreeEntry(root, relative, baselinePaths) {
  const directory = relative === "" ? root : path.join(root, ...relative.split("/"));
  let children;
  try {
    children = await readdir(directory, { withFileTypes: true });
  } catch {
    throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target worktree cannot be inspected");
  }
  for (const child of children) {
    const childRelative = relative === "" ? child.name : `${relative}/${child.name}`;
    if (!baselinePaths.has(childRelative) && childRelative.replaceAll("\\", "/").split("/")[0] === ".git") {
      throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target worktree changed during verification");
    }
    const outputRoot = generatedOutputRoot(childRelative);
    if (!baselinePaths.has(childRelative) && outputRoot === null) {
      throw new PrototypeBoundaryError("PRF_STALE_TARGET", "target worktree changed during verification");
    }
    if (!baselinePaths.has(childRelative) && outputRoot === childRelative) {
      const entry = await captureWorktreeEntry(path.join(root, ...childRelative.split("/")), childRelative);
      if (entry.kind !== "directory") {
        throw new PrototypeBoundaryError("PRF_STALE_TARGET", "generated output root is not a directory");
      }
    }
    if (child.isDirectory()) await assertNoUnrecognizedWorktreeEntry(root, childRelative, baselinePaths);
  }
}

function generatedOutputRoot(relative) {
  const segments = relative.split("/");
  if (segments[0] === "dist") return "dist";
  const index = segments.indexOf("node_modules");
  return index < 0 ? null : segments.slice(0, index + 1).join("/");
}

async function boundedDigest(file, size) {
  if (size > BigInt(MAX_HASH_BYTES)) throw new PrototypeBoundaryError("TOO_LARGE", "boundary file exceeds hash limit");
  return createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
}

async function assertNoSymlinkAncestors(value) {
  let cursor = path.resolve(value);
  while (true) {
    let details;
    try { details = await lstat(cursor); } catch (error) {
      if (error?.code === "ENOENT") {
        cursor = path.dirname(cursor);
        if (cursor === path.dirname(cursor)) return;
        continue;
      }
      throw new PrototypeBoundaryError("READ_FAILED", "path ancestor cannot be inspected");
    }
    if (details.isSymbolicLink()) throw new PrototypeBoundaryError("FILE_ALIAS", "ancestor symlink escapes boundary");
    const parent = path.dirname(cursor);
    if (parent === cursor) return;
    cursor = parent;
  }
}

function assertDistinct(left, right, leftName, rightName) {
  if (samePath(left.realPath, right.realPath) || sameIdentity(left, right)) {
    throw new PrototypeBoundaryError(rightName === "output" ? "OUTPUT_ALIAS" : "FILE_ALIAS", `${leftName} aliases ${rightName}`);
  }
}

function assertSameIdentity(before, after, reason) {
  if (!samePath(before.realPath, after.realPath)
      || before.dev !== after.dev
      || before.ino !== after.ino
      || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs
      || before.digest !== after.digest) {
    throw new PrototypeBoundaryError(reason, "boundary identity changed");
  }
}

function sameIdentity(left, right) {
  return left.dev !== null && right.dev !== null && left.dev === right.dev && left.ino === right.ino;
}

function samePath(left, right) {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function pathExists(value) {
  try { await lstat(value); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}
