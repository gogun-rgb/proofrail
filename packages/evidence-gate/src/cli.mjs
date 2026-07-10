#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

import { assertDistinctFiles, readBoundedUtf8File } from "./file-io.js";
import { buildEvidencePacket, canonicalJson } from "./index.js";
import { renderHumanReport } from "./report.js";

const MAX_INPUT_BYTES = 1024 * 1024;
const INPUT_FILE_ERRORS = {
  READ_FAILED: "could not read the input file",
  NOT_REGULAR: "input file must be a regular file",
  TOO_LARGE: "input file exceeds 1 MiB",
  INVALID_UTF8: "input file is not valid UTF-8"
};

export function parseArguments(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== "--input" && argument !== "--output" && argument !== "--format") {
      throw new TypeError("expected --input <input.json>, optional --output <packet.json>, and optional --format json|human");
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new TypeError(argument + " requires a value");
    }

    const name = argument.slice(2);
    if (options[name] !== undefined) {
      throw new TypeError(`${argument} may be supplied only once`);
    }

    options[name] = value;
    index += 1;
  }

  if (options.input === undefined) {
    throw new TypeError("--input <input.json> is required");
  }
  if (options.format !== undefined && !["json", "human"].includes(options.format)) {
    throw new TypeError("--format must be json or human");
  }

  return options;
}

async function readInput(path) {
  let source;
  try {
    source = await readBoundedUtf8File(path, MAX_INPUT_BYTES);
  } catch (error) {
    throw new Error(INPUT_FILE_ERRORS[error?.code] ?? INPUT_FILE_ERRORS.READ_FAILED);
  }

  try {
    return JSON.parse(source);
  } catch {
    throw new TypeError("input file contains malformed JSON");
  }
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const input = await readInput(options.input);
  const packet = buildEvidencePacket(input);
  if (options.output !== undefined) {
    try {
      await assertDistinctFiles(options.input, options.output);
    } catch {
      throw new Error("input and output files must be different");
    }
  }
  const output = options.format === "human"
    ? renderHumanReport(packet)
    : canonicalJson(packet) + "\n";

  if (options.output === undefined) {
    process.stdout.write(output);
    return;
  }

  try {
    await writeFile(options.output, output, "utf8");
  } catch {
    throw new Error("could not write the output file");
  }
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : "unexpected failure";
  process.stderr.write(`evidence-gate: ${message}\n`);
  process.exitCode = 1;
}
