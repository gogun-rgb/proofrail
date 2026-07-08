import path from "node:path";

export function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

export function relativeRepoPath(root, filePath) {
  const relative = path.relative(root, filePath);
  return relative ? toPosixPath(relative) : ".";
}

export function resolveRepoPath(root, repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...normalized.split("/").filter(Boolean));
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Unsafe repository path: ${String(repoPath)}`);
  }
  return resolvedPath;
}

export function normalizeRepoPath(repoPath) {
  if (!isSafeRelativeRepoPath(repoPath)) {
    throw new Error(`Unsafe repository path: ${String(repoPath)}`);
  }
  const normalized = path.posix.normalize(toPosixPath(repoPath));
  return normalized === "." ? "" : normalized.replace(/^\.\//, "");
}

export function repoPathFromMarkdownTarget(sourceRepoPath, targetPath) {
  try {
    if (!targetPath) return normalizeRepoPath(sourceRepoPath);
    if (path.win32.isAbsolute(targetPath) || path.posix.isAbsolute(toPosixPath(targetPath))) return null;
    return normalizeRepoPath(path.posix.join(path.posix.dirname(sourceRepoPath), toPosixPath(targetPath)));
  } catch {
    return null;
  }
}

export function isExternalTarget(target) {
  return /^(?:https?:|mailto:)/i.test(target);
}

export function isSafeRelativeRepoPath(repoPath) {
  if (typeof repoPath !== "string" || repoPath.length === 0 || repoPath.includes("\0")) return false;
  if (path.win32.isAbsolute(repoPath) || path.posix.isAbsolute(toPosixPath(repoPath))) return false;
  const normalized = path.posix.normalize(toPosixPath(repoPath));
  return normalized !== ".." && !normalized.startsWith("../");
}
