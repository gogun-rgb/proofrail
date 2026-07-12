#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  evaluateReleaseCandidate,
  loadReleaseConfiguration,
} from "@proofrail/release-orchestrator";

import { assertDistinctFiles, writeStagedUtf8File } from "./file-io.js";
import { collectGitHubPullRequest } from "./github.js";
import { canonicalJson } from "./index.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export class ReleaseDeliveryError extends Error {
  constructor(stage) {
    super("PROOFRAIL_RELEASE_DELIVERY_FAILED");
    this.name = "ReleaseDeliveryError";
    this.code = "PROOFRAIL_RELEASE_DELIVERY_FAILED";
    this.stage = stage;
  }
}

export function parseReleaseArguments(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const argument = args[index];
    const value = args[index + 1];
    if (!["--trusted-config", "--output"].includes(argument)
        || typeof value !== "string" || value === "" || value.startsWith("--")
        || values[argument] !== undefined) {
      throw new ReleaseDeliveryError("ARGUMENTS");
    }
    values[argument] = value;
  }
  if (values["--trusted-config"] === undefined) {
    throw new ReleaseDeliveryError("ARGUMENTS");
  }
  return Object.freeze({
    trustedConfigurationPath: values["--trusted-config"],
    output: values["--output"],
  });
}

export async function runReleaseCli(args = process.argv.slice(2), operations = {}) {
  const options = parseReleaseArguments(args);
  const loadConfiguration = operations.loadConfiguration ?? loadReleaseConfiguration;
  const collect = operations.collect ?? collectGitHubPullRequest;
  const evaluate = operations.evaluate ?? evaluateReleaseCandidate;
  const write = operations.write ?? writeStagedUtf8File;
  const stdout = operations.stdout ?? ((text) => process.stdout.write(text));
  let loaded;
  try {
    loaded = await loadConfiguration({
      repositoryRoot: REPOSITORY_ROOT,
      trustedConfigurationPath: options.trustedConfigurationPath,
    });
  } catch {
    throw new ReleaseDeliveryError("CONFIGURATION");
  }

  let snapshot;
  try {
    snapshot = await collect({
      repository: loaded.trustedConfiguration.target.repository,
      pullRequestNumber: loaded.trustedConfiguration.target.pullRequestNumber,
    });
  } catch {
    throw new ReleaseDeliveryError("COLLECTION");
  }

  let bundle;
  try {
    bundle = evaluate(loaded, snapshot);
  } catch {
    throw new ReleaseDeliveryError("EVALUATION");
  }
  const rendered = `${canonicalJson(bundle)}\n`;
  if (options.output === undefined) {
    stdout(rendered);
    return bundle;
  }

  try {
    const authorityPaths = [
      options.trustedConfigurationPath,
      loaded.trustedConfiguration.policy.path,
      loaded.trustedConfiguration.evidenceContract.path,
    ].map((entry) => path.resolve(REPOSITORY_ROOT, entry));
    for (const authorityPath of authorityPaths) {
      await assertDistinctFiles(authorityPath, options.output);
    }
    await write(options.output, rendered);
  } catch {
    throw new ReleaseDeliveryError("OUTPUT");
  }
  return bundle;
}

function renderFailure(error) {
  const failure = error instanceof ReleaseDeliveryError
    ? error
    : new ReleaseDeliveryError("UNEXPECTED");
  return `${JSON.stringify({ code: failure.code, stage: failure.stage })}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runReleaseCli();
  } catch (error) {
    process.stderr.write(renderFailure(error));
    process.exitCode = 1;
  }
}
