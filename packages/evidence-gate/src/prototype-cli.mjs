#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildMarketArtifactProjection, evaluateMarketCandidate, loadMarketConfiguration } from "@proofrail/release-orchestrator";
import { parseMarketConfiguration, parseStrictJson } from "@proofrail/trusted-config";
import { runVerificationPlan } from "@proofrail/verification-runner";

import { readBoundedUtf8File, writeStagedUtf8File } from "./file-io.js";
import { normalizeMarketGitHubSnapshot } from "./github.js";
import { readCurrentPullRequestHead } from "./workflow-event-cli.mjs";
import { runGhCommand } from "./workflow-event-gh.js";
import { normalizeWorkflowEvent } from "./workflow-event.js";
import { canonicalJson } from "./index.js";
import { buildEvidenceArtifact } from "./market-bundle.mjs";
import { renderActionableSummary, renderDeliveryFailureSummary } from "./market-report.mjs";
import { canonicalLocalTelemetryText, createLocalDeliveryFailureTelemetry, createLocalTelemetry } from "./market-telemetry.mjs";
import {
  assertApprovedShell,
  assertNetworkBoundary,
  assertRepositoryChangedPaths,
  assertPrototypePathsStable,
  assertWorktreeSnapshotStable,
  capturePrototypeOutputPath,
  capturePrototypePaths,
  captureWorktreeSnapshot,
  PrototypeBoundaryError,
  publishPrototypeOutput,
  readStableInput,
  rejectUnsafeArgumentPath,
} from "./prototype-boundary.mjs";
import { readRepositoryHead } from "./prototype-head.mjs";

const PROOFRAIL_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const AUTHORITY_PATH = "config/trusted/proofrail-market-prototype-v1.json";
const MAX_INPUT_BYTES = 1024 * 1024;
const USAGE = "Usage: proofrail-prototype --event <event.json> --repo <checkout> --config <base-config.yml> --output <directory> --shell <bash> [--github-repo <owner/name> --pull-request <number>] [--strict]\n";
const LIVE_KEYS = ["--github-repo", "--pull-request"];
const OFFLINE_KEYS = ["--event", "--repo", "--config", "--output", "--shell"];

export class PrototypeDeliveryError extends Error {
  constructor(stage, reason = "PROOFRAIL_PROTOTYPE_DELIVERY_FAILED") {
    super("PROOFRAIL_PROTOTYPE_DELIVERY_FAILED");
    this.name = "PrototypeDeliveryError";
    this.code = "PROOFRAIL_PROTOTYPE_DELIVERY_FAILED";
    this.stage = stage;
    this.reason = reason;
  }
}

function assertExactBaseConfigPath(configPath, authority, repositoryPath) {
  const expected = String(authority.trustedConfiguration.marketConfig.path).replaceAll("\\", "/");
  const actual = configPath.replaceAll("\\", "/");
  const configRoot = path.dirname(path.dirname(configPath));
  const repositoryRoot = path.resolve(repositoryPath);
  const sameCheckout = sameCanonicalPath(configRoot, repositoryRoot);
  const siblingCheckout = sameCanonicalPath(path.dirname(configRoot), path.dirname(repositoryRoot));
  if (!actual.endsWith(`/${expected}`) || (!sameCheckout && !siblingCheckout)) {
    throw new PrototypeBoundaryError("CONFIG_PATH_UNAUTHORIZED", "config is not the authority-selected base path");
  }
}

function sameCanonicalPath(left, right) {
  const normalizedLeft = path.resolve(left).replaceAll("\\", "/");
  const normalizedRight = path.resolve(right).replaceAll("\\", "/");
  return process.platform === "win32" ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase() : normalizedLeft === normalizedRight;
}

export function parsePrototypeArguments(args) {
  if (!Array.isArray(args)) throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
  if (args.length === 1 && args[0] === "--help") return Object.freeze({ help: true });
  if (args.length === 0) throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
  const allowed = new Set([...OFFLINE_KEYS, ...LIVE_KEYS]);
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (key === "--strict") {
      if (Object.hasOwn(values, key)) throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
      const next = args[index + 1];
      if (next !== undefined && !allowed.has(next)) throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
      values[key] = true;
      continue;
    }
    const value = args[index + 1];
    if (!allowed.has(key) || typeof value !== "string" || value === "" || value.startsWith("--") || Object.hasOwn(values, key)) {
      throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
    }
    values[key] = value;
    index += 1;
  }
  for (const key of OFFLINE_KEYS) if (!Object.hasOwn(values, key)) throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
  const hasLive = LIVE_KEYS.some((key) => Object.hasOwn(values, key));
  if (hasLive !== LIVE_KEYS.every((key) => Object.hasOwn(values, key))) throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
  const parsed = {
    mode: hasLive ? "live" : "offline",
    event: rejectUnsafeArgumentPath(values["--event"], "event"),
    repository: rejectUnsafeArgumentPath(values["--repo"], "repository"),
    config: rejectUnsafeArgumentPath(values["--config"], "config"),
    output: rejectUnsafeArgumentPath(values["--output"], "output"),
    shell: rejectUnsafeArgumentPath(values["--shell"], "shell"),
  };
  if (Object.hasOwn(values, "--strict")) parsed.strict = true;
  if (hasLive) {
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})\/[A-Za-z0-9_.-]{1,100}$/.test(values["--github-repo"]) || !/^\d+$/.test(values["--pull-request"])) {
      throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
    }
    const pullRequestNumber = Number(values["--pull-request"]);
    if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1 || pullRequestNumber > 2_147_483_647) throw new PrototypeDeliveryError("ARGUMENTS", "INVALID_OPTIONS");
    parsed.repositoryName = values["--github-repo"];
    parsed.pullRequestNumber = pullRequestNumber;
  }
  return Object.freeze(parsed);
}

export async function runPrototypeCli(args = process.argv.slice(2), operations = {}) {
  const options = parsePrototypeArguments(args);
  const stdout = operations.stdout ?? ((text) => process.stdout.write(text));
  if (options.help === true) {
    stdout(USAGE);
    return Object.freeze({ help: true });
  }
  const testOnly = operations.__proofrailTestOnly === true;
  const read = operations.read ?? readBoundedUtf8File;
  const write = operations.write ?? writeStagedUtf8File;
  let paths;
  let output;
  let authority;
  let event;
  let parsed;
  const failureTelemetry = { enabled: true, configurationParsed: false, verificationStarted: false, receipts: [], evaluationCompleted: false };
  try {
    output = await capturePrototypeOutputPath(options.output);
    paths = await capturePrototypePaths(options, output);
    authority = await loadMarketConfiguration({ trustedConfigurationPath: AUTHORITY_PATH, repositoryRoot: PROOFRAIL_ROOT });
    assertExactBaseConfigPath(paths.config.realPath, authority, paths.repository.realPath);
    const eventDocument = await readStableInput(paths.event, read, MAX_INPUT_BYTES);
    event = parsePrototypeEvent(parseStrictJson(eventDocument.source), options);
    await assertRepositoryChangedPaths(event.snapshot, paths.repository.realPath);
    const configDocument = await readStableInput(paths.config, read, MAX_INPUT_BYTES);
    parsed = await parseMarketConfiguration({ source: configDocument.source, presetsDirectory: path.join(PROOFRAIL_ROOT, "config/presets"), repositoryRoot: PROOFRAIL_ROOT, validatedAuthority: authority });
    failureTelemetry.enabled = parsed.marketConfiguration.telemetry.enabled;
    failureTelemetry.configurationParsed = true;
    await assertPrototypePathsStable(paths);
  } catch (error) {
    const failure = deliveryError("INPUT", error);
    await publishDeliveryFailure(paths?.output ?? output, failure, write, failureTelemetry);
    throw failure;
  }

  let runtimeState;
  let receipts;
  let clock;
  const seams = testOnly ? operations : {};
  const readCheckoutHead = seams.readCheckoutHead ?? readRepositoryHead;
  let worktreeBeforeRun;
  try {
    assertApprovedShell(paths.shell, authority);
    assertNetworkBoundary(authority, seams.executionAttestation);
    worktreeBeforeRun = await captureWorktreeSnapshot(paths.repository.realPath);
    const checkoutHeadSha = await readCheckoutHead(paths.repository.realPath);
    if (!/^[0-9a-f]{40}$/i.test(checkoutHeadSha) || checkoutHeadSha.toLowerCase() !== event.snapshot.headOid) throw new PrototypeBoundaryError("CHECKOUT_HEAD_MISMATCH", "checkout HEAD does not match event head");
    const readBaseHead = seams.readBaseCheckoutHead ?? readRepositoryHead;
    const baseHeadSha = await readBaseHead(paths.config.realPath);
    if (!/^[0-9a-f]{40}$/i.test(baseHeadSha) || baseHeadSha.toLowerCase() !== event.snapshot.baseOid) throw new PrototypeBoundaryError("BASE_HEAD_MISMATCH", "base checkout HEAD does not match event base");
    await assertPrototypePathsStable(paths);
    const preSpawnHeadSha = await readCheckoutHead(paths.repository.realPath);
    if (!/^[0-9a-f]{40}$/i.test(preSpawnHeadSha) || preSpawnHeadSha.toLowerCase() !== event.snapshot.headOid) throw new PrototypeBoundaryError("CHECKOUT_HEAD_MISMATCH", "checkout HEAD changed before spawn");
    await assertWorktreeSnapshotStable(worktreeBeforeRun);
    clock = event.clock ? createFixedClock(event.clock) : seams.clock;
    failureTelemetry.clock = clock;
    const run = seams.runVerificationPlan ?? runVerificationPlan;
    await assertWorktreeSnapshotStable(worktreeBeforeRun);
    failureTelemetry.verificationStarted = true;
    receipts = await run({
      target: targetFor(event.snapshot),
      commands: parsed.marketConfiguration.verification.commands,
      workingDirectory: paths.repository.realPath,
      shellPath: paths.shell.realPath,
      executionBoundary: authority.trustedConfiguration.executionBoundary,
      isolationAttestation: seams.executionAttestation,
      authorityLineage: authority.identities,
      marketConfigSha256: parsed.identity.marketConfigSha256,
      assertWorkingTreeStable: async () => assertWorktreeSnapshotStable(worktreeBeforeRun),
      clock,
    });
    if (!Array.isArray(receipts)) throw new PrototypeDeliveryError("EXECUTION", "RECEIPTS_INVALID");
    failureTelemetry.receipts = receipts;
    await assertWorktreeSnapshotStable(worktreeBeforeRun);
    await assertPrototypePathsStable(paths);
    const postCheckoutHeadSha = await readCheckoutHead(paths.repository.realPath);
    await assertWorktreeSnapshotStable(worktreeBeforeRun);
    if (!/^[0-9a-f]{40}$/i.test(postCheckoutHeadSha) || postCheckoutHeadSha.toLowerCase() !== event.snapshot.headOid) throw new PrototypeBoundaryError("PRF_STALE_TARGET", "checkout HEAD changed during execution");
    const postBaseHeadSha = await (seams.readBaseCheckoutHead ?? readRepositoryHead)(paths.config.realPath);
    if (!/^[0-9a-f]{40}$/i.test(postBaseHeadSha) || postBaseHeadSha.toLowerCase() !== event.snapshot.baseOid) throw new PrototypeBoundaryError("PRF_STALE_BASE", "base checkout HEAD changed during execution");
    const currentHeadSha = options.mode === "live"
      ? await readLiveHead(options, seams, clock)
      : await (seams.readCurrentHead ?? readCheckoutHead)(paths.repository.realPath);
    await assertWorktreeSnapshotStable(worktreeBeforeRun);
    if (!/^[0-9a-f]{40}$/i.test(currentHeadSha)) throw new PrototypeDeliveryError("COLLECTION", "CURRENT_HEAD_INVALID");
    runtimeState = { checkoutHeadSha: checkoutHeadSha.toLowerCase(), currentHeadSha: currentHeadSha.toLowerCase(), baseConfigurationUsed: true };
  } catch (error) {
    const failure = deliveryError("EXECUTION", error);
    await publishDeliveryFailure(paths.output, failure, write, failureTelemetry);
    throw failure;
  }

  let artifact;
  let bundle;
  let summary;
  try {
    const evaluate = seams.evaluateMarketCandidate ?? evaluateMarketCandidate;
    const kernelBundle = evaluate(authority, parsed, event.snapshot, receipts, runtimeState);
    const project = seams.buildMarketArtifactProjection ?? buildMarketArtifactProjection;
    const projection = project(parsed, event.snapshot, kernelBundle);
    summary = renderActionableSummary({ ...kernelBundle, ...projection });
    artifact = buildEvidenceArtifact(kernelBundle, { projection: { ...projection, summary }, clock });
    bundle = artifact.bundle;
    if (bundle.summary !== summary) throw new PrototypeDeliveryError("EVALUATION", "SUMMARY_FINALIZATION_INVALID");
    failureTelemetry.evaluationCompleted = true;
  } catch (error) {
    const failure = deliveryError("EVALUATION", error);
    await publishDeliveryFailure(paths.output, failure, write, failureTelemetry);
    throw failure;
  }
  const telemetry = createLocalTelemetry({ bundle, clock, enabled: parsed.marketConfiguration.telemetry.enabled });
  try {
    await mkdir(paths.output.parentPath, { recursive: true });
    await publishPrototypeOutput(paths.output, [
      ["evidence-bundle.json", artifact.text],
      ["summary.md", summary],
      ["telemetry.json", canonicalLocalTelemetryText(telemetry)],
    ], write);
  } catch (error) {
    const failure = deliveryError("OUTPUT", error);
    await publishDeliveryFailure(paths.output, failure, write, failureTelemetry);
    throw failure;
  }
  stdout(`${bundle.verdict} ${bundle.target.headSha}\nEvidence Bundle: ${path.join(paths.output.path, "evidence-bundle.json")}\n`);
  if ((options.strict === true || parsed.marketConfiguration.output.strict) && bundle.verdict !== "ADMISSIBLE") process.exitCode = 1;
  return { bundle, summary, telemetry };
}

export function renderMarketSummary(bundle) {
  return renderActionableSummary(bundle);
}

async function publishDeliveryFailure(output, failure, write, telemetryState) {
  if (!output || output.kind !== "missing-directory") return;
  try {
    const telemetry = createLocalDeliveryFailureTelemetry({ failure: { stage: failure.stage, reason: failure.reason }, ...telemetryState });
    await mkdir(output.parentPath, { recursive: true });
    await publishPrototypeOutput(output, [
      ["failure.json", canonicalJson({
        schemaVersion: "proofrail.delivery-failure.v1",
        code: failure.code,
        stage: failure.stage,
        reason: failure.reason,
      }) + "\n"],
      ["summary.md", renderDeliveryFailureSummary(failure)],
      ["telemetry.json", canonicalLocalTelemetryText(telemetry)],
    ], write);
  } catch {
    // Preserve the original delivery error when the failure packet cannot publish.
  }
}

async function readLiveHead(options, seams, clock) {
  const result = await (seams.readCurrentPullRequestHead ?? readCurrentPullRequestHead)({ repository: options.repositoryName, pullRequestNumber: options.pullRequestNumber, runGh: seams.runGh ?? runGhCommand, clock });
  if (!result || result.repository !== options.repositoryName || result.pullRequestNumber !== options.pullRequestNumber || typeof result.headSha !== "string" || !/^[0-9a-f]{40}$/i.test(result.headSha) || result.source !== "github-api") throw new PrototypeDeliveryError("COLLECTION", "CURRENT_HEAD_INVALID");
  return result.headSha;
}

function parsePrototypeEvent(value, options) {
  if (options.mode === "live") {
    const live = normalizeWorkflowEvent(value);
    if (live.source.repository !== options.repositoryName || live.source.pullRequestNumber !== options.pullRequestNumber) throw new PrototypeDeliveryError("INPUT", "TARGET_MISMATCH");
    return Object.freeze({ snapshot: live.snapshot, clock: undefined });
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !["snapshot", "runtimeState", "clock"].includes(key)) || !Object.hasOwn(value, "snapshot")) throw new PrototypeDeliveryError("INPUT", "EVENT_ENVELOPE_INVALID");
  const snapshotKeys = ["repository", "number", "title", "state", "isDraft", "baseRefName", "baseOid", "headRefName", "headOid", "changedFiles", "files", "commits", "checks", "reviews"];
  if (Object.keys(value.snapshot ?? {}).sort().join("\u0000") !== snapshotKeys.sort().join("\u0000")) throw new PrototypeDeliveryError("INPUT", "SNAPSHOT_INVALID");
  assertOfflineReviewShape(value.snapshot.reviews);
  const snapshot = normalizeMarketGitHubSnapshot(value.snapshot);
  return Object.freeze({ snapshot, clock: value.clock });
}

function assertOfflineReviewShape(reviews) {
  const expected = ["authorLogin", "state", "submittedAt", "commitOid", "authorCanPushToRepository"].sort().join("\u0000");
  if (!Array.isArray(reviews) || reviews.some((review) => !review || typeof review !== "object" || Array.isArray(review)
      || Object.keys(review).sort().join("\u0000") !== expected
      || typeof review.authorCanPushToRepository !== "boolean")) {
    throw new PrototypeDeliveryError("INPUT", "SNAPSHOT_INVALID");
  }
}

function targetFor(snapshot) {
  return { repository: snapshot.repository, pullRequestNumber: snapshot.number, baseSha: snapshot.baseOid, headSha: snapshot.headOid, targetScopeId: `scope.github-pr.${snapshot.repository.replace("/", "-")}.${snapshot.number}` };
}

function createFixedClock(values) {
  if (!Array.isArray(values) || values.length < 2 || values.some((entry) => typeof entry !== "string")) throw new PrototypeDeliveryError("INPUT", "CLOCK_INVALID");
  let index = 0;
  return { now: () => { const value = values[Math.min(index, values.length - 1)]; index += 1; const date = new Date(value); if (Number.isNaN(date.getTime())) throw new PrototypeDeliveryError("INPUT", "CLOCK_INVALID"); return date; } };
}

function deliveryError(stage, error) {
  if (error instanceof PrototypeDeliveryError) return error;
  if (error instanceof PrototypeBoundaryError) return new PrototypeDeliveryError(stage, error.reason);
  const reason = typeof error?.code === "string" ? error.code : stage === "INPUT" ? "INPUT_INVALID" : stage === "OUTPUT" ? "OUTPUT_WRITE_FAILED" : "PROOFRAIL_PROTOTYPE_DELIVERY_FAILED";
  return new PrototypeDeliveryError(stage, reason);
}

function renderFailure(error) {
  const failure = error instanceof PrototypeDeliveryError ? error : new PrototypeDeliveryError("UNEXPECTED", "UNEXPECTED_FAILURE");
  return `${JSON.stringify({ code: failure.code, stage: failure.stage, reason: failure.reason })}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await runPrototypeCli(); } catch (error) { process.stderr.write(renderFailure(error)); process.exitCode = 1; }
}
