import { lstat, readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { arch, platform, release } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { blocked, invalid, VerificationRunnerError } from "./errors.js";

export const LOCKFILES = Object.freeze(["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "bun.lockb"]);
export const HARD_DENIED = new Set(["ACTIONS_ID_TOKEN_REQUEST_TOKEN", "ACTIONS_RUNTIME_TOKEN", "GH_TOKEN", "GITHUB_TOKEN", "NODE_AUTH_TOKEN", "NODE_OPTIONS", "NPM_CONFIG_USERCONFIG", "PNPM_HOME", "YARN_NPM_AUTH_TOKEN"]);

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) invalid(`${field} must be a positive integer`);
}

function normalizeFileDigest(value) {
  const match = typeof value === "string" && value.match(/^(?:sha256:)?([0-9a-f]{64})$/i);
  return !match ? null : match[1].toUpperCase();
}

async function fileDigest(value) {
  return createHash("sha256").update(await readFile(value)).digest("hex").toUpperCase();
}

function digestValue(value, field) {
  if (typeof value !== "string" || !/^(?:sha256:)?[0-9a-f]{64}$/i.test(value)) invalid(`${field} must be a SHA-256 digest`);
}

function hasTraversal(value) {
  return String(value).replaceAll("\\", "/").split("/").includes("..");
}

function normalizePath(value) {
  const normalized = value.replaceAll("\\", "/").replace(/\/+$/, "");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function stableJson(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

function sameTarget(left, right) {
  return stableJson(left) === stableJson(right);
}

function within(root, candidate) {
  const remainder = relative(root, candidate);
  return remainder === "" || (remainder !== ".." && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder));
}

function policyRequiresFilesystem(boundary) {
  return typeof boundary.filesystemPolicy === "string"
    && boundary.filesystemPolicy.trim() !== ""
    && !/^(?:UNRESTRICTED|NONE|NO_RESTRICTION)$/i.test(boundary.filesystemPolicy);
}

function policyRequiresNetworkEnforcement(boundary) {
  const value = String(boundary.networkPolicy ?? "").toUpperCase();
  return /NO[_ -]?NETWORK|NETWORK[_ -]?DENIED|DENY[_ -]?NETWORK|EGRESS[_ -]?DENIED|OFFLINE/.test(value);
}

function isolationAttestation(options) {
  const boundary = options.executionBoundary;
  const value = options.isolationAttestation ?? options.workerAttestation ?? boundary.isolationAttestation ?? boundary.workerAttestation ?? boundary.isolationBackend ?? boundary.isolation;
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return { backend: value, attested: false };
  if (typeof value !== "object" || Array.isArray(value)) blocked("isolation attestation is invalid");
  if (typeof value.backend !== "string") {
    const backend = value.id ?? value.name;
    if (typeof backend === "string") return { ...value, backend };
  }
  return value;
}

function resolveAuthorityPath(boundary) {
  const values = [boundary.shellPath, boundary.approvedShellPath, boundary.authorizedShellPath, boundary.approvedExecutablePath, boundary.authorizedExecutablePath, boundary.executablePath, boundary.shellRealpath, boundary.shell].filter((value) => value !== undefined);
  if (values.some((value) => typeof value !== "string" || !isAbsolute(value))) blocked("authority shell identity is invalid");
  const identity = boundary.shellIdentity ?? boundary.executableIdentity;
  if (identity !== undefined) {
    if (typeof identity !== "object" || Array.isArray(identity)) blocked("authority shell identity is invalid");
    for (const key of ["path", "realpath", "sha256"]) if (key in identity && typeof identity[key] !== "string") blocked("authority shell identity is invalid");
    if (typeof identity.path === "string") values.push(identity.path);
    if (typeof identity.realpath === "string") values.push(identity.realpath);
  }
  const allowed = boundary.allowedShellPaths ?? boundary.allowedExecutablePaths;
  if (allowed !== undefined) {
    if (!Array.isArray(allowed) || allowed.length === 0 || allowed.some((value) => typeof value !== "string" || !isAbsolute(value))) blocked("authority shell identity is invalid");
    values.push(...allowed);
  }
  return values;
}

async function canonicalPath(value, field, boundaryFailure) {
  try { return await realpath(value); } catch (error) {
    if (boundaryFailure) blocked(`${field} cannot be resolved`);
    throw new VerificationRunnerError("INVALID_OPTIONS", `${field} cannot be resolved`, { cause: error });
  }
}

async function assertNoSymlinkAncestors(value) {
  const absolute = resolve(value);
  const root = dirname(absolute) === absolute ? absolute : absolute.startsWith(sep) ? sep : `${absolute.slice(0, 3)}`;
  let cursor = absolute;
  const ancestors = [];
  while (cursor !== root && cursor !== dirname(cursor)) {
    ancestors.push(cursor);
    cursor = dirname(cursor);
  }
  ancestors.push(root);
  for (const candidate of ancestors.reverse()) {
    try {
      const stats = await lstat(candidate);
      if (stats.isSymbolicLink()) blocked("ancestor symlink escapes the execution boundary");
    } catch (error) {
      if (error instanceof VerificationRunnerError) throw error;
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

export function validateOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) invalid("options must be an object");
  if (typeof options.shellPath !== "string" || !isAbsolute(options.shellPath)) invalid("shellPath must be absolute");
  if (typeof options.workingDirectory !== "string" || !isAbsolute(options.workingDirectory)) invalid("workingDirectory must be absolute");
  if (hasTraversal(options.shellPath) || hasTraversal(options.workingDirectory)) invalid("paths may not contain traversal segments");
  if (!Array.isArray(options.commands) || options.commands.length === 0) invalid("commands must be non-empty");
  const boundary = options.executionBoundary;
  if (boundary === null || typeof boundary !== "object" || Array.isArray(boundary)) invalid("executionBoundary is required");
  if (typeof boundary.id !== "string" || boundary.id.length === 0) invalid("executionBoundary.id is required");
  for (const field of ["maximumCommandCount", "maximumCommandTimeoutSeconds", "maximumTotalTimeoutSeconds", "maximumOutputBytesPerStream", "maximumPreviewBytesPerStream"]) positiveInteger(boundary[field], field);
  if (boundary.maximumPreviewBytesPerStream > boundary.maximumOutputBytesPerStream) invalid("preview limit cannot exceed output limit");
  if (options.commands.length > boundary.maximumCommandCount) invalid("command count exceeds execution boundary");
  if (boundary.terminateProcessTree !== true) invalid("terminateProcessTree must be true");
  for (const field of ["terminationGraceMilliseconds", "terminationKillMilliseconds", "terminationMonitorMilliseconds"]) {
    if (boundary[field] !== undefined) {
      positiveInteger(boundary[field], field);
      if (boundary[field] > 60000) invalid(`${field} exceeds the termination watchdog bound`);
    }
  }
  if (!Array.isArray(boundary.allowedEnvironmentNames) || !Array.isArray(boundary.deniedEnvironmentNames)) invalid("environment boundary is invalid");
  for (const name of [...boundary.allowedEnvironmentNames, ...boundary.deniedEnvironmentNames]) if (typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) invalid("environment boundary is invalid");
  const commandNames = new Set();
  for (const command of options.commands) {
    if (command === null || typeof command !== "object" || !/^[a-z][a-z0-9-]{0,63}$/.test(command.name) || typeof command.run !== "string" || command.run.length === 0 || command.run.length > 4096) invalid("command is invalid");
    if (commandNames.has(command.name)) invalid("command names must be unique");
    commandNames.add(command.name);
    if (command.timeoutMinutes !== undefined) positiveInteger(command.timeoutMinutes, `${command.name}.timeoutMinutes`);
  }
  const target = options.target;
  if (target === null || typeof target !== "object" || !/^[0-9a-f]{40}$/.test(target?.baseSha) || !/^[0-9a-f]{40}$/.test(target?.headSha)) invalid("target SHAs must be lowercase full Git SHAs");
  if (typeof target.repository !== "string" || !Number.isSafeInteger(target.pullRequestNumber) || target.pullRequestNumber < 1 || typeof target.targetScopeId !== "string" || target.targetScopeId === "") invalid("target identity is invalid");
  if (options.authorityLineage === null || typeof options.authorityLineage !== "object") invalid("authorityLineage is required");
  for (const field of ["trustedConfigurationSha256", "policySha256", "evidenceContractSha256"]) digestValue(options.authorityLineage[field], field);
  digestValue(options.marketConfigSha256, "marketConfigSha256");
  if (options.clock !== undefined && (options.clock === null || typeof options.clock.now !== "function")) invalid("clock.now must be a function");
  if (options.controlEnvironment !== undefined && (options.controlEnvironment === null || typeof options.controlEnvironment !== "object" || Array.isArray(options.controlEnvironment) || Object.values(options.controlEnvironment).some((value) => value !== undefined && typeof value !== "string"))) invalid("controlEnvironment is invalid");
  if (options.runnerIdentity !== undefined) {
    if (options.runnerIdentity === null || typeof options.runnerIdentity !== "object" || Array.isArray(options.runnerIdentity)) invalid("runnerIdentity is invalid");
    for (const field of ["runner", "os", "architecture", "node"]) if (typeof options.runnerIdentity[field] !== "string" || options.runnerIdentity[field] === "") invalid("runnerIdentity is invalid");
  }
  return options;
}

export function buildChildEnvironment(options) {
  const source = options.controlEnvironment ?? process.env;
  const denied = new Set([...HARD_DENIED, ...options.executionBoundary.deniedEnvironmentNames.map((name) => name.toUpperCase())]);
  const environment = {};
  for (const name of [...options.executionBoundary.allowedEnvironmentNames].sort()) {
    const upper = name.toUpperCase();
    if (denied.has(upper) || /^(?:NPM_CONFIG_|YARN_|PNPM_|BUN_)/.test(upper)) continue;
    const value = source[name];
    if (value !== undefined) environment[name] = String(value);
  }
  return environment;
}

export async function dependencyLockfile(workingDirectory) {
  for (const name of LOCKFILES) {
    try {
      const bytes = await readFile(join(workingDirectory, name));
      return { path: name, bytes };
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw new VerificationRunnerError("LOCKFILE_READ_FAILED", `failed to read ${name}`, { cause: error });
    }
  }
  return { path: null, bytes: null };
}

export async function bindExecutionBoundary(options) {
  const boundary = options.executionBoundary;
  const target = structuredClone(options.target);
  const workingDirectory = await canonicalPath(options.workingDirectory, "workingDirectory", false);
  await assertNoSymlinkAncestors(options.workingDirectory);
  const authorityPaths = resolveAuthorityPath(boundary);
  let shellPath;
  let shellResolved = true;
  try {
    shellPath = await canonicalPath(options.shellPath, "shellPath", authorityPaths.length > 0);
  } catch (error) {
    if (authorityPaths.length > 0 || !(error instanceof VerificationRunnerError) || error.code !== "INVALID_OPTIONS") throw error;
    shellPath = resolve(options.shellPath);
    shellResolved = false;
  }
  if (authorityPaths.length > 0) {
    const canonicalAuthorities = await Promise.all(authorityPaths.map((value) => canonicalPath(value, "authority shell", true)));
    if (!canonicalAuthorities.some((value) => normalizePath(value) === normalizePath(shellPath))) blocked("shell executable does not match authority");
  }
  const authorityShellDigest = boundary.shellSha256 ?? boundary.executableSha256 ?? boundary.shellIdentity?.sha256 ?? boundary.executableIdentity?.sha256;
  const expectedShellDigest = normalizeFileDigest(authorityShellDigest);
  if (authorityShellDigest !== undefined && expectedShellDigest === null) blocked("authority shell digest is invalid");
  if (expectedShellDigest !== null && shellResolved && await fileDigest(shellPath) !== expectedShellDigest) blocked("shell executable digest does not match authority");
  const targetIdentity = boundary.targetIdentity ?? boundary.target;
  if (targetIdentity !== undefined && !sameTarget(targetIdentity, target)) blocked("target identity does not match authority");
  const expectedDirectory = boundary.workingDirectory ?? boundary.allowedWorkingDirectory ?? boundary.checkoutPath;
  if (expectedDirectory !== undefined) {
    if (typeof expectedDirectory !== "string" || !isAbsolute(expectedDirectory)) blocked("working directory authority is invalid");
    const expected = await canonicalPath(expectedDirectory, "working directory authority", true);
    if (normalizePath(expected) !== normalizePath(workingDirectory)) blocked("working directory does not match authority");
  }
  const rootCandidate = boundary.filesystemRoot ?? boundary.allowedRoot ?? boundary.checkoutRoot;
  const attestation = isolationAttestation(options);
  const requiresFilesystem = policyRequiresFilesystem(boundary);
  const requiresNetwork = policyRequiresNetworkEnforcement(boundary);
  if (attestation === null || attestation.attested !== true || typeof attestation.backend !== "string" || attestation.backend !== "GITHUB_HOSTED_LINUX_SANDBOX_V1") blocked("execution isolation backend is not attested");
  if (process.platform === "win32" && attestation.backend === "GITHUB_HOSTED_LINUX_SANDBOX_V1") blocked("GITHUB_HOSTED_LINUX_SANDBOX_V1 cannot enforce process-tree termination on Windows");
  if (requiresFilesystem && attestation.enforcesFilesystem !== true) blocked("filesystem isolation is not enforceable");
  if (requiresNetwork && attestation.enforcesNetwork !== true) blocked("network isolation is not enforceable");
  let filesystemRoot = null;
  if (rootCandidate !== undefined || attestation?.filesystemRoot !== undefined) {
    const root = rootCandidate ?? attestation.filesystemRoot;
    if (typeof root !== "string" || !isAbsolute(root)) blocked("filesystem root is invalid");
    filesystemRoot = await canonicalPath(root, "filesystem root", true);
    if (!within(filesystemRoot, workingDirectory)) blocked("working directory escapes filesystem boundary");
  } else if (requiresFilesystem) {
    blocked("filesystem root is not enforceable");
  }
  return {
    target,
    workingDirectory,
    shellPath,
    filesystemRoot,
    assertCurrent: async () => {
      if (!sameTarget(options.target, target)) blocked("target identity changed during execution");
      const currentDirectory = await canonicalPath(options.workingDirectory, "workingDirectory", true);
      if (normalizePath(currentDirectory) !== normalizePath(workingDirectory)) blocked("working directory changed during execution");
      if (shellResolved) {
        const currentShell = await canonicalPath(options.shellPath, "shellPath", true);
        if (normalizePath(currentShell) !== normalizePath(shellPath)) blocked("shell executable changed during execution");
        if (expectedShellDigest !== null && await fileDigest(currentShell) !== expectedShellDigest) blocked("shell executable digest changed during execution");
      }
      if (filesystemRoot !== null && !within(filesystemRoot, currentDirectory)) blocked("working directory escaped filesystem boundary");
    },
  };
}

export function normalizeDigest(value, field) {
  const match = value.match(/^(?:sha256:)?([0-9a-f]{64})$/i);
  if (match === null) invalid(`${field} must be a SHA-256 digest`);
  return `sha256:${match[1].toUpperCase()}`;
}

export function runnerIdentity(options) {
  return options.runnerIdentity ?? { runner: process.env.RUNNER_NAME ?? "local", os: `${platform()} ${release()}`, architecture: arch(), node: process.version };
}
