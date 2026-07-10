#!/usr/bin/env node

import { open, writeFile } from "node:fs/promises";
import { TextDecoder } from "node:util";

import { evaluateKernel } from "@proofrail/kernel";

const MAX_INPUT_BYTES = 1024 * 1024;
const USAGE_ERROR = "usage: static-evaluate --input <input.json> [--output <bundle.json>]";

class CliFailure extends Error {}

function parseArguments(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== "--input" && argument !== "--output") {
      throw new CliFailure(USAGE_ERROR);
    }

    const name = argument.slice(2);
    const value = args[index + 1];
    if (options[name] !== undefined || !value || value.startsWith("--")) {
      throw new CliFailure(USAGE_ERROR);
    }

    options[name] = value;
    index += 1;
  }

  if (options.input === undefined) {
    throw new CliFailure(USAGE_ERROR);
  }

  return options;
}

async function readBoundedRegularFile(path) {
  let handle;
  try {
    handle = await open(path, "r");
  } catch {
    throw new CliFailure("input file is unavailable");
  }

  try {
    const metadata = await handle.stat();
    if (!metadata.isFile()) {
      throw new CliFailure("input must be a regular file");
    }
    if (metadata.size > MAX_INPUT_BYTES) {
      throw new CliFailure("input exceeds 1 MiB");
    }

    const buffer = Buffer.allocUnsafe(MAX_INPUT_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        length,
        buffer.length - length,
        null
      );
      if (bytesRead === 0) {
        break;
      }
      length += bytesRead;
    }

    if (length > MAX_INPUT_BYTES) {
      throw new CliFailure("input exceeds 1 MiB");
    }

    return buffer.subarray(0, length);
  } catch (error) {
    if (error instanceof CliFailure) {
      throw error;
    }
    throw new CliFailure("input file is unavailable");
  } finally {
    await handle.close().catch(() => {});
  }
}

function decodeInput(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CliFailure("input is not valid UTF-8");
  }
}

function parseInput(source) {
  try {
    return JSON.parse(source);
  } catch {
    throw new CliFailure("input is not valid JSON");
  }
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const bytes = await readBoundedRegularFile(options.input);
  const parsed = parseInput(decodeInput(bytes));

  let bundle;
  try {
    bundle = evaluateKernel(parsed);
  } catch {
    throw new CliFailure("input is not accepted by the Phase 1 kernel");
  }

  const output = Buffer.from(JSON.stringify(bundle) + "\n", "utf8");
  if (options.output === undefined) {
    process.stdout.write(output);
    return;
  }

  try {
    await writeFile(options.output, output);
  } catch {
    throw new CliFailure("output file is unavailable");
  }
}

try {
  await run();
} catch (error) {
  const message = error instanceof CliFailure ? error.message : "unexpected failure";
  process.stderr.write(`static-evaluator: ${message}\n`);
  process.exitCode = 1;
}
