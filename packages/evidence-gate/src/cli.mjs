#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

import { buildEvidencePacket, canonicalJson } from "./index.js";

function parseArguments(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== "--input" && argument !== "--output") {
      throw new TypeError("expected --input <input.json> and optional --output <packet.json>");
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new TypeError(`${argument} requires a file path`);
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

  return options;
}

async function readInput(path) {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch {
    throw new Error("could not read the input file");
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
  const output = `${canonicalJson(buildEvidencePacket(input))}\n`;

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
