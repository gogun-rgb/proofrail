#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { canonicalJson } from "./index.js";
import { writeStagedUtf8File } from "./file-io.js";
import { runGhCommand } from "./workflow-event-gh.js";
import {
  collectWorkflowEvent,
  normalizeWorkflowEvent,
  WorkflowEventError,
  workflowEventByteLength,
} from "./workflow-event.js";

const MAX_EVENT_BYTES = 8 * 1024 * 1024;
const REQUIRED_OPTIONS = ["github-repo", "pull-request", "base-sha", "head-sha", "output"];
const ALLOWED_OPTIONS = new Set(REQUIRED_OPTIONS.map((name) => `--${name}`));

export {
  collectWorkflowEvent,
  normalizeWorkflowEvent,
  WorkflowEventError,
  readCurrentPullRequestHead,
} from "./workflow-event.js";

import { readCurrentPullRequestHead } from "./workflow-event.js";

export function parseWorkflowEventArguments(args) {
  if (!Array.isArray(args) || args.length % 2 !== 0) {
    throw new WorkflowEventError("ARGUMENTS", "ARGUMENTS_INVALID");
  }
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const argument = args[index];
    const value = args[index + 1];
    if (!ALLOWED_OPTIONS.has(argument)
        || typeof value !== "string"
        || value === ""
        || value.startsWith("--")
        || Object.hasOwn(values, argument)) {
      throw new WorkflowEventError("ARGUMENTS", "ARGUMENTS_INVALID");
    }
    values[argument] = value;
  }

  for (const option of REQUIRED_OPTIONS) {
    if (!Object.hasOwn(values, `--${option}`)) {
      throw new WorkflowEventError("ARGUMENTS", "ARGUMENTS_INVALID");
    }
  }
  if (!/^\d+$/.test(values["--pull-request"])
      || !/^[0-9a-f]{40}$/i.test(values["--base-sha"])
      || !/^[0-9a-f]{40}$/i.test(values["--head-sha"])) {
    throw new WorkflowEventError("ARGUMENTS", "ARGUMENTS_INVALID");
  }
  return Object.freeze({
    repository: values["--github-repo"],
    pullRequestNumber: Number(values["--pull-request"]),
    baseSha: values["--base-sha"],
    headSha: values["--head-sha"],
    output: values["--output"],
  });
}

export async function runWorkflowEventCli(args = process.argv.slice(2), operations = {}) {
  const options = parseWorkflowEventArguments(args);
  const runGh = operations.runGh ?? runGhCommand;
  const clock = operations.clock;
  const write = operations.write ?? writeStagedUtf8File;
  let event;
  try {
    event = await collectWorkflowEvent({
      repository: options.repository,
      pullRequestNumber: options.pullRequestNumber,
      baseSha: options.baseSha,
      headSha: options.headSha,
      runGh,
      clock,
    });
  } catch (error) {
    if (error instanceof WorkflowEventError) throw error;
    throw new WorkflowEventError("COLLECTION", "INITIAL_SNAPSHOT_FAILED");
  }

  const rendered = `${canonicalJson(event)}\n`;
  if (workflowEventByteLength(event) > MAX_EVENT_BYTES
      || Buffer.byteLength(rendered, "utf8") > MAX_EVENT_BYTES) {
    throw new WorkflowEventError("OUTPUT", "EVENT_TOO_LARGE");
  }
  try {
    await write(options.output, rendered);
  } catch {
    throw new WorkflowEventError("OUTPUT", "OUTPUT_WRITE_FAILED");
  }
  return Object.freeze({ event, rendered });
}

export function renderWorkflowEventFailure(error) {
  const failure = error instanceof WorkflowEventError
    ? error
    : new WorkflowEventError("UNEXPECTED", "UNEXPECTED_FAILURE");
  return `${JSON.stringify({
    code: failure.code,
    stage: failure.stage,
    reason: failure.reason,
  })}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runWorkflowEventCli();
  } catch (error) {
    process.stderr.write(renderWorkflowEventFailure(error));
    process.exitCode = 1;
  }
}
