#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { buildEvidencePacket, canonicalJson } from "./index.js";
import {
  collectGitHubPullRequest,
  mapGitHubPullRequestToEvidenceInput
} from "./github.js";

export function parseGitHubArguments(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!["--repo", "--pr", "--output"].includes(argument)) {
      throw new TypeError(
        "expected --repo <owner/name> --pr <positive-integer> and optional --output <packet.json>"
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

  return {
    repository: options.repo,
    pullRequestNumber: Number(options.pr),
    output: options.output
  };
}

export async function runGitHubCli(args = process.argv.slice(2)) {
  const options = parseGitHubArguments(args);
  const snapshot = await collectGitHubPullRequest(options);
  const input = mapGitHubPullRequestToEvidenceInput(snapshot);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runGitHubCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected failure";
    process.stderr.write(`evidence-gate-github: ${message}\n`);
    process.exitCode = 1;
  }
}

