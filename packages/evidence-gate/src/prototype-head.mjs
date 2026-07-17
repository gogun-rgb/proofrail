import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

const HEAD_BYTES = 16 * 1024;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export class PrototypeHeadError extends Error {
  constructor(reason = "CHECKOUT_HEAD_UNREADABLE") {
    super(reason);
    this.name = "PrototypeHeadError";
    this.reason = reason;
  }
}

export async function readRepositoryHead(startPath) {
  const root = await findGitRoot(startPath);
  const gitEntry = path.join(root, ".git");
  const details = await lstat(gitEntry).catch(() => { throw new PrototypeHeadError(); });
  if (details.isSymbolicLink()) throw new PrototypeHeadError("FILE_ALIAS");
  let gitDirectory = gitEntry;
  if (details.isFile()) {
    const pointer = await readBounded(gitEntry);
    const match = pointer.match(/^gitdir:\s*(.+)\s*$/im);
    if (match === null) throw new PrototypeHeadError();
    gitDirectory = path.resolve(root, match[1]);
  }
  const canonicalGitDirectory = await realpath(gitDirectory).catch(() => { throw new PrototypeHeadError(); });
  const gitRemainder = path.relative(root, canonicalGitDirectory);
  if (gitRemainder.startsWith("..") || path.isAbsolute(gitRemainder)) throw new PrototypeHeadError("FILE_ALIAS");
  const headPath = path.join(canonicalGitDirectory, "HEAD");
  const head = (await readBounded(headPath)).trim();
  if (SHA_PATTERN.test(head)) return head.toLowerCase();
  const refMatch = head.match(/^ref:\s*(refs\/[A-Za-z0-9._/-]+)$/);
  if (refMatch === null) throw new PrototypeHeadError();
  const refPath = path.join(canonicalGitDirectory, refMatch[1]);
  try {
    const ref = (await readBounded(refPath)).trim();
    if (SHA_PATTERN.test(ref)) return ref.toLowerCase();
  } catch (error) {
    if (!(error instanceof PrototypeHeadError)) throw error;
  }
  const packedRefs = await readBounded(path.join(canonicalGitDirectory, "packed-refs")).catch(() => "");
  for (const line of packedRefs.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length === 2 && fields[1] === refMatch[1] && SHA_PATTERN.test(fields[0])) return fields[0].toLowerCase();
  }
  throw new PrototypeHeadError();
}

async function findGitRoot(startPath) {
  let cursor = path.resolve(startPath);
  const details = await lstat(cursor).catch(() => { throw new PrototypeHeadError(); });
  if (details.isFile()) cursor = path.dirname(cursor);
  while (true) {
    const candidate = path.join(cursor, ".git");
    if (await isPresent(candidate)) return cursor;
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new PrototypeHeadError();
    cursor = parent;
  }
}

async function readBounded(file) {
  const details = await lstat(file).catch(() => { throw new PrototypeHeadError(); });
  if (!details.isFile() || details.isSymbolicLink() || details.size > HEAD_BYTES) throw new PrototypeHeadError();
  const real = await realpath(file).catch(() => { throw new PrototypeHeadError(); });
  if (process.platform === "win32" ? real.toLowerCase() !== path.resolve(file).toLowerCase() : real !== path.resolve(file)) throw new PrototypeHeadError("FILE_ALIAS");
  return readFile(real, "utf8").catch(() => { throw new PrototypeHeadError(); });
}

async function isPresent(file) {
  try { await lstat(file); return true; } catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}
