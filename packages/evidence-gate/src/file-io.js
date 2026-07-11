import { randomBytes } from "node:crypto";
import { lstat, open, realpath, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

const MAX_TEMP_ATTEMPTS = 16;
const TEMP_PREFIX = ".proofrail-";
const BROKEN_LINK_CODES = new Set(["ENOENT", "ENOTDIR", "ELOOP"]);
const BROKEN_SYMBOLIC_LINK = Symbol("BROKEN_SYMBOLIC_LINK");
const DEFAULT_WRITE_OPERATIONS = {
  lstat,
  open,
  randomBytes,
  realpath,
  rename,
  stat,
  unlink,
  umask: () => process.umask()
};

class FileIoError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export async function readBoundedUtf8File(file, maxBytes) {
  let handle;
  try {
    handle = await open(file, "r");
  } catch {
    throw new FileIoError("READ_FAILED");
  }

  try {
    let details;
    try {
      details = await handle.stat({ bigint: true });
    } catch {
      throw new FileIoError("READ_FAILED");
    }
    if (!details.isFile()) {
      throw new FileIoError("NOT_REGULAR");
    }
    if (details.size > BigInt(maxBytes)) {
      throw new FileIoError("TOO_LARGE");
    }

    const buffer = Buffer.allocUnsafe(maxBytes + 1);
    let length = 0;
    while (length < buffer.length) {
      let result;
      try {
        result = await handle.read(buffer, length, buffer.length - length, null);
      } catch {
        throw new FileIoError("READ_FAILED");
      }
      if (result.bytesRead === 0) break;
      length += result.bytesRead;
    }
    if (length > maxBytes) {
      throw new FileIoError("TOO_LARGE");
    }

    try {
      return new TextDecoder("utf-8", {
        fatal: true,
        ignoreBOM: true
      }).decode(buffer.subarray(0, length));
    } catch {
      throw new FileIoError("INVALID_UTF8");
    }
  } finally {
    await handle.close().catch(() => {});
  }
}

export async function assertDistinctFiles(source, output) {
  if (samePathSpelling(path.resolve(source), path.resolve(output))) {
    throw new FileIoError("SAME_FILE");
  }

  const outputIdentity = await existingIdentity(output, true);
  if (outputIdentity === null) return;
  if (outputIdentity === BROKEN_SYMBOLIC_LINK) return;
  const sourceIdentity = await existingIdentity(source);
  if (sourceIdentity === null) {
    throw new FileIoError("SAME_FILE");
  }

  if (samePathSpelling(sourceIdentity.realPath, outputIdentity.realPath)) {
    throw new FileIoError("SAME_FILE");
  }
  if (!hasUsableFileIdentity(sourceIdentity)
      || !hasUsableFileIdentity(outputIdentity)) {
    throw new FileIoError("SAME_FILE");
  }
  if (sourceIdentity.dev === outputIdentity.dev
      && sourceIdentity.ino === outputIdentity.ino) {
    throw new FileIoError("SAME_FILE");
  }
}

export async function writeStagedUtf8File(outputPath, renderedText, operations) {
  const io = { ...DEFAULT_WRITE_OPERATIONS };
  for (const [name, operation] of Object.entries(operations ?? {})) {
    if (operation !== undefined) io[name] = operation;
  }
  const target = await resolvePublicationTarget(outputPath, io);
  let handle;
  let temporaryPath;

  try {
    ({ handle, temporaryPath } = await openTemporaryFile(target, io));
    const bytes = Buffer.from(renderedText, "utf8");
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.write(bytes, offset, bytes.length - offset, null);
      if (!Number.isInteger(result?.bytesWritten)
          || result.bytesWritten <= 0
          || result.bytesWritten > bytes.length - offset) {
        throw new FileIoError("WRITE_FAILED");
      }
      offset += result.bytesWritten;
    }
    await handle.chmod(target.mode);
    await handle.close();
    handle = undefined;
    await io.rename(temporaryPath, target.path);
    temporaryPath = undefined;
  } catch (error) {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch {}
    }
    if (temporaryPath !== undefined) {
      try {
        await io.unlink(temporaryPath);
      } catch {}
    }
    throw error;
  }
}

async function resolvePublicationTarget(outputPath, io) {
  const resolvedOutput = path.resolve(outputPath);
  let outputDetails;
  try {
    outputDetails = await io.lstat(resolvedOutput);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const directory = await io.realpath(path.dirname(resolvedOutput));
    const directoryDetails = await io.stat(directory);
    if (!directoryDetails.isDirectory()) {
      throw new FileIoError("WRITE_FAILED");
    }
    return {
      directory,
      mode: 0o666 & ~Number(io.umask()) & 0o777,
      path: path.join(directory, path.basename(resolvedOutput))
    };
  }

  if (!outputDetails.isFile() && !outputDetails.isSymbolicLink()) {
    throw new FileIoError("WRITE_FAILED");
  }
  const targetPath = await io.realpath(resolvedOutput);
  const targetDetails = await io.stat(targetPath);
  if (!targetDetails.isFile()) {
    throw new FileIoError("WRITE_FAILED");
  }
  return {
    directory: path.dirname(targetPath),
    mode: Number(targetDetails.mode) & 0o777,
    path: targetPath
  };
}

async function openTemporaryFile(target, io) {
  for (let attempt = 0; attempt < MAX_TEMP_ATTEMPTS; attempt += 1) {
    const token = io.randomBytes(12).toString("hex");
    const temporaryPath = path.join(target.directory, TEMP_PREFIX + token);
    if (samePathSpelling(temporaryPath, target.path)) {
      throw new FileIoError("WRITE_FAILED");
    }
    try {
      const handle = await io.open(temporaryPath, "wx", 0o600);
      return { handle, temporaryPath };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
  throw new FileIoError("WRITE_FAILED");
}

async function existingIdentity(file, allowBrokenSymbolicLink = false) {
  let linkDetails;
  try {
    linkDetails = await lstat(file, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new FileIoError("SAME_FILE");
  }

  try {
    const realPath = await realpath(file);
    const details = await stat(file, { bigint: true });
    return {
      realPath,
      dev: details.dev,
      ino: details.ino
    };
  } catch (error) {
    if (allowBrokenSymbolicLink
        && linkDetails.isSymbolicLink()
        && BROKEN_LINK_CODES.has(error?.code)) {
      return BROKEN_SYMBOLIC_LINK;
    }
    throw new FileIoError("SAME_FILE");
  }
}

function samePathSpelling(left, right) {
  if (process.platform === "win32") {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

function hasUsableFileIdentity(identity) {
  return identity.dev !== 0n || identity.ino !== 0n;
}
