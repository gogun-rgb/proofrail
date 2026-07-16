import { createHash } from "node:crypto";
import { bindExecutionBoundary, buildChildEnvironment, dependencyLockfile, normalizeDigest, runnerIdentity, validateOptions } from "./boundary.js";
import { VerificationRunnerError } from "./errors.js";
import { executeCommand } from "./lifecycle.js";
import { redact } from "./redaction.js";

const PRODUCER = Object.freeze({ id: "runner.proofrail-verification", version: "1.0.0" });

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex").toUpperCase()}`;
}

function receiptId(value) {
  return `receipt:${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32)}`;
}

function executionTiming(startedAt, endedAt) {
  return {
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: Math.max(0, endedAt.getTime() - startedAt.getTime()),
  };
}

function statusFor(execution) {
  if (execution.spawnError !== null || execution.outputExceeded) return "ERROR";
  if (execution.timedOut) return "TIMEOUT";
  return execution.exitCode === 0 ? "PASS" : "FAIL";
}

function terminationLimits(boundary) {
  return {
    graceMs: boundary.terminationGraceMilliseconds ?? 250,
    killMs: boundary.terminationKillMilliseconds ?? 1000,
    monitorMs: boundary.terminationMonitorMilliseconds ?? 25,
  };
}

export { VerificationRunnerError };

export async function runVerificationPlan(options) {
  validateOptions(options);
  const clock = options.clock ?? { now: () => new Date() };
  const binding = await bindExecutionBoundary(options);
  const environment = buildChildEnvironment(options);
  const lockfile = await dependencyLockfile(binding.workingDirectory);
  const lineage = {
    trustedConfigurationSha256: normalizeDigest(options.authorityLineage.trustedConfigurationSha256, "trustedConfigurationSha256"),
    policySha256: normalizeDigest(options.authorityLineage.policySha256, "policySha256"),
    evidenceContractSha256: normalizeDigest(options.authorityLineage.evidenceContractSha256, "evidenceContractSha256"),
    marketConfigSha256: normalizeDigest(options.marketConfigSha256, "marketConfigSha256"),
  };
  const runner = runnerIdentity(options);
  const receipts = [];
  const deadline = Date.now() + options.executionBoundary.maximumTotalTimeoutSeconds * 1000;
  const limits = terminationLimits(options.executionBoundary);
  for (const [index, command] of options.commands.entries()) {
    await binding.assertCurrent();
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const commandLimit = Math.min(options.executionBoundary.maximumCommandTimeoutSeconds, (command.timeoutMinutes ?? Number.MAX_SAFE_INTEGER) * 60) * 1000;
    const execution = await executeCommand({
      command,
      shellPath: binding.shellPath,
      workingDirectory: binding.workingDirectory,
      environment,
      clock,
      timeoutMs: Math.min(commandLimit, remaining),
      outputLimit: options.executionBoundary.maximumOutputBytesPerStream,
      previewLimit: options.executionBoundary.maximumPreviewBytesPerStream,
      assertCurrent: binding.assertCurrent,
      ...limits,
    });
    const stdout = redact(execution.stdout.preview);
    const stderr = redact(execution.stderr.preview);
    const matchCount = stdout.matchCount + stderr.matchCount;
    const configuredCommand = { name: command.name, run: redact(command.run).text, orderingKey: String(index + 1).padStart(3, "0") };
    const receipt = {
      schemaVersion: "proofrail.verification-receipt.v1",
      id: receiptId({ target: binding.target, command: configuredCommand, executionBoundaryId: options.executionBoundary.id, lineage }),
      type: "COMMAND_EXECUTION",
      producer: PRODUCER,
      target: structuredClone(binding.target),
      command: configuredCommand,
      environment: { ...runner, allowedEnvironmentNames: Object.keys(environment).sort() },
      executionBoundaryId: options.executionBoundary.id,
      timing: executionTiming(execution.startedAt, execution.endedAt),
      result: {
        status: statusFor(execution),
        exitCode: execution.spawnError === null ? execution.exitCode : null,
        stdoutDigest: execution.stdout.digest,
        stderrDigest: execution.stderr.digest,
        stdoutBytes: execution.stdout.bytes,
        stderrBytes: execution.stderr.bytes,
        stdoutPreview: stdout.text,
        stderrPreview: stderr.text,
        stdoutTruncated: execution.stdout.truncated,
        stderrTruncated: execution.stderr.truncated,
        timedOut: execution.timedOut,
      },
      dependencyLockfile: { path: lockfile.path, sha256: lockfile.bytes === null ? null : digest(lockfile.bytes) },
      redaction: { applied: matchCount > 0, matchCount },
      lineage,
    };
    receipts.push(receipt);
    if (receipt.result.status !== "PASS") break;
  }
  return receipts;
}
