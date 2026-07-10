import { lstat, open, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

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

  const outputIdentity = await existingIdentity(output);
  if (outputIdentity === null) return;
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

async function existingIdentity(file) {
  try {
    await lstat(file, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new FileIoError("SAME_FILE");
  }

  try {
    const [realPath, details] = await Promise.all([
      realpath(file),
      stat(file, { bigint: true })
    ]);
    return {
      realPath,
      dev: details.dev,
      ino: details.ino
    };
  } catch {
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
