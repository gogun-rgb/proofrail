import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import {
  open as openFile,
  rename as renameFile,
  unlink as unlinkFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { writeStagedUtf8File } from "../../packages/evidence-gate/src/file-io.js";

function withTempDirectory(run) {
  const directory = mkdtempSync(path.join(tmpdir(), "proofrail-file-io-"));
  return Promise.resolve()
    .then(() => run(directory))
    .finally(() => rmSync(directory, { recursive: true, force: true }));
}

function codedError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function temporaryEntries(directory) {
  return readdirSync(directory).filter((name) => name.startsWith(".proofrail-"));
}

function memoryHandle() {
  let bytes = Buffer.alloc(0);
  let closed = false;
  const chmodModes = [];
  const handle = {
    async write(buffer, offset, length, position) {
      assert.equal(this, handle);
      assert.equal(closed, false);
      assert.equal(position, null);
      bytes = Buffer.concat([bytes, buffer.subarray(offset, offset + length)]);
      return { bytesWritten: length };
    },
    async chmod(mode) {
      assert.equal(this, handle);
      assert.equal(closed, false);
      chmodModes.push(mode);
    },
    async close() {
      assert.equal(this, handle);
      assert.equal(closed, false);
      closed = true;
    }
  };
  return {
    handle,
    bytes: () => bytes,
    chmodModes,
    closed: () => closed
  };
}

test("staged publication prepares a complete same-directory file before one rename", async (t) => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "user-selected-packet.json");
    const rendered = "Proofrail 한국어 café 😀\n";
    const expectedMode = 0o666 & ~process.umask();
    const openCalls = [];
    const chmodModes = [];
    const renameCalls = [];
    const unlinkCalls = [];

    await writeStagedUtf8File(output, rendered, {
      open: async (...args) => {
        openCalls.push(args);
        const handle = await openFile(...args);
        return {
          write: (...writeArgs) => handle.write(...writeArgs),
          chmod: async (mode) => {
            chmodModes.push(mode);
            await handle.chmod(mode);
          },
          close: () => handle.close()
        };
      },
      rename: async (temporaryPath, targetPath) => {
        renameCalls.push([temporaryPath, targetPath]);
        assert.equal(existsSync(output), false);
        assert.equal(path.dirname(temporaryPath), directory);
        assert.match(path.basename(temporaryPath), /^\.proofrail-[0-9a-f]{24}$/);
        assert.equal(path.basename(temporaryPath).includes("user-selected-packet"), false);
        assert.deepEqual(readFileSync(temporaryPath), Buffer.from(rendered, "utf8"));
        await renameFile(temporaryPath, targetPath);
      },
      unlink: async (temporaryPath) => {
        unlinkCalls.push(temporaryPath);
        await unlinkFile(temporaryPath);
      }
    });

    assert.deepEqual(readFileSync(output), Buffer.from(rendered, "utf8"));
    assert.equal(renameCalls.length, 1);
    assert.equal(openCalls.length, 1);
    assert.deepEqual(openCalls[0].slice(1), ["wx", 0o600]);
    assert.deepEqual(chmodModes, [expectedMode]);
    assert.deepEqual(unlinkCalls, []);
    assert.deepEqual(temporaryEntries(directory), []);
    if (process.platform === "win32") {
      t.diagnostic("POSIX mode-bit assertion skipped on Windows");
    } else {
      assert.equal(statSync(output).mode & 0o777, expectedMode);
    }
  });
});

test("existing target bytes and ordinary mode remain unchanged until rename", async (t) => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "existing.json");
    const original = Buffer.from("ORIGINAL_TARGET_BYTES");
    const rendered = "replacement\n";
    writeFileSync(output, original);
    chmodSync(output, 0o640);
    const originalMode = statSync(output).mode & 0o777;
    const chmodModes = [];
    let renameCalls = 0;

    await writeStagedUtf8File(output, rendered, {
      open: async (...args) => {
        const handle = await openFile(...args);
        return {
          write: (...writeArgs) => handle.write(...writeArgs),
          chmod: async (mode) => {
            chmodModes.push(mode);
            await handle.chmod(mode);
          },
          close: () => handle.close()
        };
      },
      rename: async (temporaryPath, targetPath) => {
        renameCalls += 1;
        assert.deepEqual(readFileSync(targetPath), original);
        assert.deepEqual(readFileSync(temporaryPath), Buffer.from(rendered));
        await renameFile(temporaryPath, targetPath);
      }
    });

    assert.equal(renameCalls, 1);
    assert.deepEqual(chmodModes, [originalMode]);
    assert.deepEqual(readFileSync(output), Buffer.from(rendered));
    assert.deepEqual(temporaryEntries(directory), []);
    if (process.platform === "win32") {
      t.diagnostic("POSIX mode-bit assertion skipped on Windows");
    } else {
      assert.equal(statSync(output).mode & 0o777, originalMode);
    }
  });
});

test("undefined operation entries retain the default implementation", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "defaults.json");
    await writeStagedUtf8File(output, "defaults\n", { rename: undefined });
    assert.equal(readFileSync(output, "utf8"), "defaults\n");
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("a non-collision exclusive-open failure does not claim or unlink a path", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    const original = codedError("EACCES", "open denied");
    const unlinkCalls = [];
    await assert.rejects(
      writeStagedUtf8File(output, "packet\n", {
        open: async () => { throw original; },
        unlink: async (file) => { unlinkCalls.push(file); }
      }),
      (error) => error === original
    );
    assert.equal(existsSync(output), false);
    assert.deepEqual(unlinkCalls, []);
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("a missing final path can never be opened as its own temporary file", async () => {
  await withTempDirectory(async (directory) => {
    const token = Buffer.alloc(12, 0x33);
    const output = path.join(directory, ".proofrail-" + token.toString("hex"));
    let openCalls = 0;
    await assert.rejects(
      writeStagedUtf8File(output, "packet\n", {
        randomBytes: () => token,
        open: async () => {
          openCalls += 1;
          throw new Error("unexpected open");
        }
      }),
      (error) => error?.code === "WRITE_FAILED"
    );
    assert.equal(openCalls, 0);
    assert.equal(existsSync(output), false);
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("zero-byte write progress fails without looping and cleans the known temp", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    let writes = 0;
    await assert.rejects(
      writeStagedUtf8File(output, "packet\n", {
        open: async (...args) => {
          const handle = await openFile(...args);
          return {
            write: async () => {
              writes += 1;
              return { bytesWritten: 0 };
            },
            chmod: (mode) => handle.chmod(mode),
            close: () => handle.close()
          };
        }
      }),
      (error) => error?.code === "WRITE_FAILED"
    );
    assert.equal(writes, 1);
    assert.equal(existsSync(output), false);
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("a partial-write failure preserves the original error and cleans the temp", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    const original = new Error("partial write failure");
    let writes = 0;
    await assert.rejects(
      writeStagedUtf8File(output, "complete packet\n", {
        open: async (...args) => {
          const handle = await openFile(...args);
          return {
            write: async (buffer, offset, length, position) => {
              writes += 1;
              if (writes === 1) {
                return handle.write(buffer, offset, Math.min(3, length), position);
              }
              throw original;
            },
            chmod: (mode) => handle.chmod(mode),
            close: () => handle.close()
          };
        }
      }),
      (error) => error === original
    );
    assert.equal(writes, 2);
    assert.equal(existsSync(output), false);
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("chmod failure preserves the existing target and cleans the known temp", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    const originalBytes = Buffer.from("ORIGINAL");
    const original = new Error("chmod failure");
    writeFileSync(output, originalBytes);
    await assert.rejects(
      writeStagedUtf8File(output, "replacement\n", {
        open: async (...args) => {
          const handle = await openFile(...args);
          return {
            write: (...writeArgs) => handle.write(...writeArgs),
            chmod: async () => { throw original; },
            close: () => handle.close()
          };
        }
      }),
      (error) => error === original
    );
    assert.deepEqual(readFileSync(output), originalBytes);
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("close failure retries close only for cleanup and preserves the original error", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    const originalBytes = Buffer.from("ORIGINAL");
    const original = new Error("close failure");
    let closeCalls = 0;
    writeFileSync(output, originalBytes);
    await assert.rejects(
      writeStagedUtf8File(output, "replacement\n", {
        open: async (...args) => {
          const handle = await openFile(...args);
          return {
            write: (...writeArgs) => handle.write(...writeArgs),
            chmod: (mode) => handle.chmod(mode),
            close: async () => {
              closeCalls += 1;
              if (closeCalls === 1) throw original;
              await handle.close();
            }
          };
        }
      }),
      (error) => error === original
    );
    assert.equal(closeCalls, 2);
    assert.deepEqual(readFileSync(output), originalBytes);
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("rename failure makes one publication attempt and successful cleanup preserves target", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    const originalBytes = Buffer.from("ORIGINAL");
    const original = new Error("rename failure");
    const unlinked = [];
    let renameCalls = 0;
    writeFileSync(output, originalBytes);
    await assert.rejects(
      writeStagedUtf8File(output, "replacement\n", {
        rename: async () => {
          renameCalls += 1;
          assert.deepEqual(readFileSync(output), originalBytes);
          throw original;
        },
        unlink: async (file) => {
          unlinked.push(file);
          await unlinkFile(file);
        }
      }),
      (error) => error === original
    );
    assert.equal(renameCalls, 1);
    assert.equal(unlinked.length, 1);
    assert.deepEqual(readFileSync(output), originalBytes);
    assert.deepEqual(temporaryEntries(directory), []);
  });
});

test("cleanup failure does not mask rename failure and may leave the known orphan", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    const originalBytes = Buffer.from("ORIGINAL");
    const original = new Error("rename failure");
    writeFileSync(output, originalBytes);
    await assert.rejects(
      writeStagedUtf8File(output, "replacement\n", {
        rename: async () => { throw original; },
        unlink: () => { throw new Error("cleanup failure"); }
      }),
      (error) => error === original
    );
    assert.deepEqual(readFileSync(output), originalBytes);
    assert.equal(temporaryEntries(directory).length, 1);
  });
});

test("EEXIST retries do not unlink an unknown collision before success", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    const tokens = [Buffer.alloc(12, 0x11), Buffer.alloc(12, 0x22)];
    const collision = path.join(directory, ".proofrail-" + tokens[0].toString("hex"));
    const collisionBytes = Buffer.from("UNKNOWN_COLLISION");
    const unlinkCalls = [];
    let randomIndex = 0;
    writeFileSync(collision, collisionBytes);
    await writeStagedUtf8File(output, "packet\n", {
      randomBytes: () => tokens[randomIndex++],
      unlink: async (file) => {
        unlinkCalls.push(file);
        await unlinkFile(file);
      }
    });
    assert.equal(randomIndex, 2);
    assert.deepEqual(readFileSync(collision), collisionBytes);
    assert.equal(readFileSync(output, "utf8"), "packet\n");
    assert.deepEqual(unlinkCalls, []);
  });
});

test("sixteen EEXIST attempts exhaust without unlinking collision files", async () => {
  await withTempDirectory(async (directory) => {
    const output = path.join(directory, "packet.json");
    const tokens = Array.from({ length: 16 }, (_unused, index) => Buffer.alloc(12, index + 1));
    const collisions = tokens.map((token, index) => {
      const file = path.join(directory, ".proofrail-" + token.toString("hex"));
      writeFileSync(file, `collision-${index}`);
      return file;
    });
    const unlinkCalls = [];
    let randomIndex = 0;
    await assert.rejects(
      writeStagedUtf8File(output, "packet\n", {
        randomBytes: () => tokens[randomIndex++],
        unlink: async (file) => { unlinkCalls.push(file); }
      }),
      (error) => error?.code === "WRITE_FAILED"
    );
    assert.equal(randomIndex, 16);
    assert.equal(existsSync(output), false);
    assert.deepEqual(unlinkCalls, []);
    collisions.forEach((file, index) => {
      assert.equal(readFileSync(file, "utf8"), `collision-${index}`);
    });
  });
});

test("missing output resolves a symlinked parent before staging", async () => {
  const logicalDirectory = path.resolve("logical-output-parent");
  const actualDirectory = path.resolve("actual-output-parent");
  const output = path.join(logicalDirectory, "packet.json");
  const remembered = memoryHandle();
  const opened = [];
  const renamed = [];

  await writeStagedUtf8File(output, "packet\n", {
    lstat: async () => { throw codedError("ENOENT"); },
    realpath: async (file) => {
      assert.equal(file, logicalDirectory);
      return actualDirectory;
    },
    stat: async (file) => {
      assert.equal(file, actualDirectory);
      return { isDirectory: () => true };
    },
    umask: () => 0o027,
    randomBytes: () => Buffer.alloc(12, 0x44),
    open: async (...args) => {
      opened.push(args);
      return remembered.handle;
    },
    rename: async (...args) => { renamed.push(args); },
    unlink: async () => { throw new Error("unexpected cleanup"); }
  });

  assert.equal(path.dirname(opened[0][0]), actualDirectory);
  assert.deepEqual(opened[0].slice(1), ["wx", 0o600]);
  assert.deepEqual(renamed, [[opened[0][0], path.join(actualDirectory, "packet.json")]]);
  assert.deepEqual(remembered.bytes(), Buffer.from("packet\n"));
  assert.deepEqual(remembered.chmodModes, [0o640]);
  assert.equal(remembered.closed(), true);
});

test("healthy output symlink stages beside and publishes to its canonical target", async () => {
  const logicalOutput = path.resolve("logical-parent", "packet-link.json");
  const canonicalTarget = path.resolve("different-actual-directory", "packet.json");
  const remembered = memoryHandle();
  const opened = [];
  const renamed = [];

  await writeStagedUtf8File(logicalOutput, "packet\n", {
    lstat: async (file) => {
      assert.equal(file, logicalOutput);
      return { isFile: () => false, isSymbolicLink: () => true };
    },
    realpath: async (file) => {
      assert.equal(file, logicalOutput);
      return canonicalTarget;
    },
    stat: async (file) => {
      assert.equal(file, canonicalTarget);
      return { isFile: () => true, mode: 0o100604 };
    },
    randomBytes: () => Buffer.alloc(12, 0x55),
    open: async (...args) => {
      opened.push(args);
      return remembered.handle;
    },
    rename: async (...args) => { renamed.push(args); },
    unlink: async () => { throw new Error("unexpected cleanup"); }
  });

  assert.equal(path.dirname(opened[0][0]), path.dirname(canonicalTarget));
  assert.deepEqual(renamed, [[opened[0][0], canonicalTarget]]);
  assert.deepEqual(remembered.bytes(), Buffer.from("packet\n"));
  assert.deepEqual(remembered.chmodModes, [0o604]);
  assert.equal(remembered.closed(), true);
});
