#!/usr/bin/env node

import { readFile, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { buildEvidencePacket, canonicalJson } from "./index.js";
import { renderHumanReport } from "./report.js";
import {
  collectGitHubPullRequest,
  mapGitHubPullRequestToEvidenceInput,
  normalizeDeclaredWriteScope
} from "./github.js";

const MAX_SCOPE_FILE_BYTES = 64 * 1024;

export function parseGitHubArguments(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!["--repo", "--pr", "--output", "--format", "--scope-file"].includes(argument)) {
      throw new TypeError(
        "expected --repo <owner/name> --pr <positive-integer> and optional --output <packet.json>, --format json|human, and --scope-file <scope.json>"
      );
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new TypeError(`${argument} requires a value`);
    }

    const name = argument.slice(2);
    if (options[name] !== undefined) {
      throw new TypeError(`${argument} may be supplied only once`);
    }

    options[name] = value;
    index += 1;
  }

  if (options.repo === undefined) {
    throw new TypeError("--repo <owner/name> is required");
  }
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})\/[A-Za-z0-9_.-]{1,100}$/.test(options.repo)) {
    throw new TypeError("--repo must use owner/name format");
  }
  if (options.pr === undefined
      || !/^[1-9]\d*$/.test(options.pr)
      || !Number.isSafeInteger(Number(options.pr))) {
    throw new TypeError("--pr must be a positive integer");
  }
  if (options.format !== undefined && !["json", "human"].includes(options.format)) {
    throw new TypeError("--format must be json or human");
  }

  return {
    repository: options.repo,
    pullRequestNumber: Number(options.pr),
    output: options.output,
    format: options.format ?? "json",
    scopeFile: options["scope-file"]
  };
}
export async function runGitHubCli(args = process.argv.slice(2)) {
  const options = parseGitHubArguments(args);
  const declaredWriteScope = options.scopeFile === undefined
    ? []
    : await readDeclaredScopeFile(options.scopeFile);
  const snapshot = await collectGitHubPullRequest({
    repository: options.repository,
    pullRequestNumber: options.pullRequestNumber
  });
  const input = mapGitHubPullRequestToEvidenceInput(snapshot, declaredWriteScope);
  const packet = buildEvidencePacket(input);
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

export async function readDeclaredScopeFile(file) {
  let source;
  try {
    const details = await stat(file);
    if (!details.isFile() || details.size > MAX_SCOPE_FILE_BYTES) {
      throw new Error("invalid scope file");
    }
    source = await readFile(file, "utf8");
  } catch {
    throw new Error("could not read the declared scope file");
  }

  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("declared scope file contains malformed JSON");
  }

  if (!isExactDeclaredScopeObject(parsed) || hasDuplicateTopLevelObjectKeys(source)) {
    throw new Error("declared scope file must contain only declaredWriteScope");
  }

  try {
    const declaredWriteScope = normalizeDeclaredWriteScope(parsed.declaredWriteScope);
    if (declaredWriteScope.length === 0) {
      throw new TypeError("declaredWriteScope must not be empty");
    }
    return declaredWriteScope;
  } catch {
    throw new Error("declared scope file declaredWriteScope must be an array of safe path patterns");
  }
}

function isExactDeclaredScopeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === "declaredWriteScope";
}

function hasDuplicateTopLevelObjectKeys(source) {
  let cursor = skipJsonWhitespace(source, 0);
  if (source[cursor] !== "{") {
    return false;
  }
  cursor = skipJsonWhitespace(source, cursor + 1);
  const keys = new Set();
  if (source[cursor] === "}") {
    return false;
  }

  while (cursor < source.length) {
    if (source[cursor] !== "\"") {
      return false;
    }
    const keyEnd = scanJsonString(source, cursor);
    const key = JSON.parse(source.slice(cursor, keyEnd));
    if (keys.has(key)) {
      return true;
    }
    keys.add(key);
    cursor = skipJsonWhitespace(source, keyEnd);
    if (source[cursor] !== ":") {
      return false;
    }
    cursor = skipJsonWhitespace(source, skipJsonValue(source, cursor + 1));
    if (source[cursor] === "}") {
      return false;
    }
    if (source[cursor] !== ",") {
      return false;
    }
    cursor = skipJsonWhitespace(source, cursor + 1);
  }
  return false;
}

function skipJsonWhitespace(source, cursor) {
  while (/\s/.test(source[cursor] ?? "")) {
    cursor += 1;
  }
  return cursor;
}

function scanJsonString(source, start) {
  let escaped = false;
  for (let cursor = start + 1; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (escaped) {
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === "\"") {
      return cursor + 1;
    }
  }
  return source.length;
}

function skipJsonValue(source, start) {
  let cursor = skipJsonWhitespace(source, start);
  if (source[cursor] === "\"") {
    return scanJsonString(source, cursor);
  }
  if (source[cursor] !== "{" && source[cursor] !== "[") {
    while (cursor < source.length && !/[\s,}\]]/.test(source[cursor])) {
      cursor += 1;
    }
    return cursor;
  }

  const closing = source[cursor] === "{" ? "}" : "]";
  const stack = [closing];
  for (cursor += 1; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (character === "\"") {
      cursor = scanJsonString(source, cursor) - 1;
    } else if (character === "{") {
      stack.push("}");
    } else if (character === "[") {
      stack.push("]");
    } else if (character === "}" || character === "]") {
      if (stack.pop() !== character) {
        return source.length;
      }
      if (stack.length === 0) {
        return cursor + 1;
      }
    }
  }
  return source.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runGitHubCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected failure";
    process.stderr.write(`evidence-gate-github: ${message}\n`);
    process.exitCode = 1;
  }
}
