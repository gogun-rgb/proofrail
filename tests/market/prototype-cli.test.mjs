import assert from "node:assert/strict";
import { access, cp, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { parsePrototypeArguments, renderMarketSummary, runPrototypeCli } from "../../packages/evidence-gate/src/prototype-cli.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

async function bashPath() {
  for (const candidate of process.platform === "win32" ? ["C:\\Users\\zizon\\AppData\\Local\\hermes\\git\\bin\\bash.exe", "C:\\Program Files\\Git\\bin\\bash.exe"] : ["/bin/bash", "/usr/bin/bash"]) {
    try { await access(candidate); return candidate; } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  throw new Error("bash unavailable");
}

async function runFixture(t, name) {
  const output = await mkdtemp(path.join(tmpdir(), `proofrail-market-${name}-`));
  t.after(() => rm(output, { recursive: true, force: true }));
  let stdout = "";
  const event = JSON.parse(await readFile(path.join(ROOT, `fixtures/market-prototype/github/pr-${name}.json`), "utf8"));
  const heads = [event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid, event.runtimeState.currentHeadSha];
  const result = await runPrototypeCli(["--event", path.join(ROOT, `fixtures/market-prototype/github/pr-${name}.json`), "--repo", path.join(ROOT, "examples/market-prototype/demo"), "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"), "--output", output, "--shell", await bashPath()], {
    __proofrailTestOnly: true,
    readCheckoutHead: async () => heads.shift() ?? event.snapshot.headOid,
    readBaseCheckoutHead: async () => event.snapshot.baseOid,
    runVerificationPlan: async ({ target, commands, authorityLineage, marketConfigSha256 }) => [{
      schemaVersion: "proofrail.verification-receipt.v1",
      id: "receipt:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      type: "COMMAND_EXECUTION",
      producer: { id: "runner.proofrail-verification", version: "1.0.0" },
      target,
      command: { name: commands[0].name, run: commands[0].run, orderingKey: "001" },
      environment: {},
      executionBoundaryId: "execution.github-actions-market-v1",
      timing: {},
      result: { status: "PASS", exitCode: 0, stdoutDigest: `sha256:${"A".repeat(64)}`, stderrDigest: `sha256:${"B".repeat(64)}`, stdoutBytes: 0, stderrBytes: 0, stdoutPreview: "", stderrPreview: "", stdoutTruncated: false, stderrTruncated: false, timedOut: false },
      dependencyLockfile: {},
      redaction: {},
      lineage: {
        trustedConfigurationSha256: `sha256:${authorityLineage.trustedConfigurationSha256}`,
        policySha256: `sha256:${authorityLineage.policySha256}`,
        evidenceContractSha256: `sha256:${authorityLineage.evidenceContractSha256}`,
        marketConfigSha256: `sha256:${marketConfigSha256}`,
      },
    }],
    stdout: (text) => { stdout += text; },
  });
  return { ...result, output, stdout };
}

async function prepareTelemetryEnabledPrototype(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-delivery-telemetry-"));
  const repository = path.join(directory, "checkout");
  const output = path.join(directory, "output");
  const config = path.join(repository, ".proofrail", "config.yml");
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.join(ROOT, "examples/market-prototype/demo"), repository, { recursive: true });
  const source = await readFile(config, "utf8");
  await writeFile(config, source.replace("enabled: false", "enabled: true"), "utf8");
  return { config, output, repository };
}

test("prototype CLI writes a digest-bound deterministic ADMISSIBLE bundle", async (t) => {
  const first = await runFixture(t, "success");
  const second = await runFixture(t, "success");
  assert.equal(first.bundle.verdict, "ADMISSIBLE");
  assert.match(first.stdout, /ADMISSIBLE 2222222222222222222222222222222222222222/);
  assert.equal(await readFile(path.join(first.output, "evidence-bundle.json"), "utf8"), await readFile(path.join(second.output, "evidence-bundle.json"), "utf8"));
  const artifact = JSON.parse(await readFile(path.join(first.output, "evidence-bundle.json"), "utf8"));
  assert.equal(artifact.finalizedAt, "2026-07-15T00:00:00.000Z");
  assert.equal(artifact.artifactDigest, first.bundle.artifactDigest);
  const summary = await readFile(path.join(first.output, "summary.md"), "utf8");
  assert.equal(artifact.summary, summary);
  assert.deepEqual(artifact.scope.changedPaths, ["docs/guide.md"]);
  assert.equal(artifact.reviews[0].authorCanPushToRepository, true);
  assert.match(summary, /## Next actions/);
  assert.match(summary, /No remediation is required/);
  assert.match(summary, /exact target, authority lineage, observations, and receipts/);
  const telemetry = JSON.parse(await readFile(path.join(first.output, "telemetry.json"), "utf8"));
  assert.deepEqual(telemetry.events, []);
  assert.equal(telemetry.networkTransmission, false);
});

test("prototype CLI summary uses the policy-owned PRF reason vocabulary", () => {
  const summary = renderMarketSummary({
    verdict: "REVISION_REQUIRED",
    target: { repository: "proofrail/demo", pullRequestNumber: 8, baseSha: "1".repeat(40), headSha: "2".repeat(40) },
    reasonCodes: ["PRF_VERIFICATION_COMMAND_FAILED"],
    verificationReceipts: [],
  });

  assert.match(summary, /PRF_VERIFICATION_COMMAND_FAILED/);
  assert.match(summary, /Fix the failing configured command/);
});

test("prototype CLI retains an INPUT failure packet after validating a fresh output boundary", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-input-failure-"));
  const eventPath = path.join(directory, "event.json");
  const output = path.join(directory, "output");
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(eventPath, "[]", "utf8");

  await assert.rejects(
    runPrototypeCli([
      "--event", eventPath,
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", output,
      "--shell", await bashPath(),
    ], { __proofrailTestOnly: true }),
    (error) => error?.stage === "INPUT" && error?.reason === "EVENT_ENVELOPE_INVALID",
  );

  assert.deepEqual(JSON.parse(await readFile(path.join(output, "failure.json"), "utf8")), {
    schemaVersion: "proofrail.delivery-failure.v1",
    code: "PROOFRAIL_PROTOTYPE_DELIVERY_FAILED",
    stage: "INPUT",
    reason: "EVENT_ENVELOPE_INVALID",
  });
  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(output, "telemetry.json"), "utf8")).events.map(({ kind }) => kind),
    ["INSTALLATION", "DELIVERY_FAILURE", "RERUN_INTENT"],
  );
});

test("prototype CLI rejects offline market reviews without eligibility metadata", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-review-eligibility-"));
  const eventPath = path.join(directory, "event.json");
  const output = path.join(directory, "output");
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  const { authorCanPushToRepository: _missingEligibility, ...review } = event.snapshot.reviews[0];
  event.snapshot.reviews = [review];
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(eventPath, JSON.stringify(event), "utf8");

  await assert.rejects(
    runPrototypeCli([
      "--event", eventPath,
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", output,
      "--shell", await bashPath(),
    ], { __proofrailTestOnly: true }),
    (error) => error?.stage === "INPUT" && error?.reason === "SNAPSHOT_INVALID",
  );
  assert.equal(JSON.parse(await readFile(path.join(output, "failure.json"), "utf8")).reason, "SNAPSHOT_INVALID");
});

test("prototype CLI retains an EVALUATION failure packet without fabricating a verdict", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-evaluation-failure-"));
  const output = path.join(directory, "output");
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      executionAttestation: { enforcesNetwork: true },
      readCheckoutHead: async () => event.snapshot.headOid,
      readBaseCheckoutHead: async () => event.snapshot.baseOid,
      runVerificationPlan: async () => [],
      evaluateMarketCandidate: () => { throw Object.assign(new Error("evaluation failed"), { code: "MARKET_CONFIG_INVALID" }); },
    }),
    (error) => error?.stage === "EVALUATION" && error?.reason === "MARKET_CONFIG_INVALID",
  );

  assert.deepEqual(JSON.parse(await readFile(path.join(output, "failure.json"), "utf8")), {
    schemaVersion: "proofrail.delivery-failure.v1",
    code: "PROOFRAIL_PROTOTYPE_DELIVERY_FAILED",
    stage: "EVALUATION",
    reason: "MARKET_CONFIG_INVALID",
  });
  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(output, "telemetry.json"), "utf8")).events.map(({ kind }) => kind),
    [],
  );
});

test("prototype CLI consumes a live event and structured post-run head", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-live-"));
  const eventPath = path.join(directory, "event.json");
  const output = path.join(directory, "output");
  t.after(() => rm(directory, { recursive: true, force: true }));
  const snapshot = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8")).snapshot;
  await writeFile(eventPath, JSON.stringify({
    schemaVersion: "proofrail.workflow-event.v1",
    origin: "live",
    snapshot,
    source: {
      collector: "github-pr-bounded-collector.v1",
      repository: snapshot.repository,
      pullRequestNumber: snapshot.number,
      baseRepository: snapshot.repository,
      headRepository: "proofrail/demo",
      baseSha: snapshot.baseOid,
      headSha: snapshot.headOid,
      collectedAt: "2026-07-15T00:00:00.000Z",
    },
  }), "utf8");
  const result = await runPrototypeCli([
    "--event", eventPath,
    "--repo", path.join(ROOT, "examples/market-prototype/demo"),
    "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
    "--output", output,
    "--shell", await bashPath(),
    "--github-repo", snapshot.repository,
    "--pull-request", String(snapshot.number),
  ], {
    __proofrailTestOnly: true,
    readCheckoutHead: async () => snapshot.headOid,
    readBaseCheckoutHead: async () => snapshot.baseOid,
    readCurrentPullRequestHead: async () => ({ repository: snapshot.repository, pullRequestNumber: snapshot.number, headSha: snapshot.headOid, observedAt: "2026-07-15T00:00:00.250Z", source: "github-api" }),
    runVerificationPlan: async ({ target, commands, authorityLineage, marketConfigSha256 }) => [{
      schemaVersion: "proofrail.verification-receipt.v1", id: "receipt:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", type: "COMMAND_EXECUTION", producer: { id: "runner.proofrail-verification", version: "1.0.0" }, target, command: { name: commands[0].name, run: commands[0].run, orderingKey: "001" }, environment: {}, executionBoundaryId: "execution.github-actions-market-v1", timing: {}, result: { status: "PASS", exitCode: 0, stdoutDigest: `sha256:${"A".repeat(64)}`, stderrDigest: `sha256:${"B".repeat(64)}`, stdoutBytes: 0, stderrBytes: 0, stdoutPreview: "", stderrPreview: "", stdoutTruncated: false, stderrTruncated: false, timedOut: false }, dependencyLockfile: {}, redaction: {}, lineage: { trustedConfigurationSha256: `sha256:${authorityLineage.trustedConfigurationSha256}`, policySha256: `sha256:${authorityLineage.policySha256}`, evidenceContractSha256: `sha256:${authorityLineage.evidenceContractSha256}`, marketConfigSha256: `sha256:${marketConfigSha256}` },
    }],
  });
  assert.equal(result.bundle.verdict, "ADMISSIBLE");
});

test("prototype CLI fails closed when live current-head authorization is unavailable", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-live-auth-missing-"));
  const eventPath = path.join(directory, "event.json");
  const output = path.join(directory, "output");
  t.after(() => rm(directory, { recursive: true, force: true }));
  const snapshot = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8")).snapshot;
  await writeFile(eventPath, JSON.stringify({
    schemaVersion: "proofrail.workflow-event.v1",
    origin: "live",
    snapshot,
    source: {
      collector: "github-pr-bounded-collector.v1",
      repository: snapshot.repository,
      pullRequestNumber: snapshot.number,
      baseRepository: snapshot.repository,
      headRepository: snapshot.repository,
      baseSha: snapshot.baseOid,
      headSha: snapshot.headOid,
      collectedAt: "2026-07-15T00:00:00.000Z",
    },
  }), "utf8");
  let runnerCalled = false;
  await assert.rejects(
    runPrototypeCli([
      "--event", eventPath,
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", output,
      "--shell", await bashPath(),
      "--github-repo", snapshot.repository,
      "--pull-request", String(snapshot.number),
    ], {
      __proofrailTestOnly: true,
      executionAttestation: { enforcesNetwork: true },
      readCheckoutHead: async () => snapshot.headOid,
      readBaseCheckoutHead: async () => snapshot.baseOid,
      readCurrentPullRequestHead: async () => undefined,
      runVerificationPlan: async () => {
        runnerCalled = true;
        return [];
      },
    }),
    (error) => error?.reason === "CURRENT_HEAD_INVALID",
  );
  assert.equal(runnerCalled, true);
  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
});

test("prototype CLI publishes a blocked bundle when live post-head is stale", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-live-stale-"));
  const eventPath = path.join(directory, "event.json");
  const output = path.join(directory, "output");
  t.after(() => rm(directory, { recursive: true, force: true }));
  const snapshot = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8")).snapshot;
  await writeFile(eventPath, JSON.stringify({
    schemaVersion: "proofrail.workflow-event.v1", origin: "live", snapshot,
    source: { collector: "github-pr-bounded-collector.v1", repository: snapshot.repository, pullRequestNumber: snapshot.number, baseRepository: snapshot.repository, headRepository: snapshot.repository, baseSha: snapshot.baseOid, headSha: snapshot.headOid, collectedAt: "2026-07-15T00:00:00.000Z" },
  }), "utf8");
  const previousExitCode = process.exitCode;
  try {
    const result = await runPrototypeCli([
      "--event", eventPath, "--repo", path.join(ROOT, "examples/market-prototype/demo"), "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"), "--output", output, "--shell", await bashPath(), "--github-repo", snapshot.repository, "--pull-request", String(snapshot.number),
    ], {
      __proofrailTestOnly: true,
      readCheckoutHead: async () => snapshot.headOid,
      readBaseCheckoutHead: async () => snapshot.baseOid,
      readCurrentPullRequestHead: async () => ({ repository: snapshot.repository, pullRequestNumber: snapshot.number, headSha: "3".repeat(40), observedAt: "2026-07-15T00:00:00.250Z", source: "github-api" }),
      runVerificationPlan: async ({ target, commands, authorityLineage, marketConfigSha256 }) => [{
        schemaVersion: "proofrail.verification-receipt.v1", id: "receipt:cccccccccccccccccccccccccccccccc", type: "COMMAND_EXECUTION", producer: { id: "runner.proofrail-verification", version: "1.0.0" }, target, command: { name: commands[0].name, run: commands[0].run, orderingKey: "001" }, environment: {}, executionBoundaryId: "execution.github-actions-market-v1", timing: {}, result: { status: "PASS", exitCode: 0, stdoutDigest: `sha256:${"A".repeat(64)}`, stderrDigest: `sha256:${"B".repeat(64)}`, stdoutBytes: 0, stderrBytes: 0, stdoutPreview: "", stderrPreview: "", stdoutTruncated: false, stderrTruncated: false, timedOut: false }, dependencyLockfile: {}, redaction: {}, lineage: { trustedConfigurationSha256: `sha256:${authorityLineage.trustedConfigurationSha256}`, policySha256: `sha256:${authorityLineage.policySha256}`, evidenceContractSha256: `sha256:${authorityLineage.evidenceContractSha256}`, marketConfigSha256: `sha256:${marketConfigSha256}` },
      }],
    });
    assert.equal(result.bundle.verdict, "BLOCKED");
    assert(result.bundle.reasonCodes.includes("PRF_STALE_TARGET"));
    assert.equal(process.exitCode, 1);
    assert.match(await readFile(path.join(output, "summary.md"), "utf8"), /PRF_STALE_TARGET/);
  } finally {
    process.exitCode = previousExitCode;
  }
});

test("prototype CLI rejects a nested base config before runner spawn", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-nested-config-"));
  const repository = path.join(directory, "checkout");
  const nestedConfig = path.join(repository, "nested", ".proofrail", "config.yml");
  const output = path.join(directory, "output");
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(path.join(ROOT, "examples/market-prototype/demo"), repository, { recursive: true });
  await mkdir(path.dirname(nestedConfig), { recursive: true });
  await writeFile(nestedConfig, await readFile(path.join(repository, ".proofrail", "config.yml"), "utf8"), "utf8");
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  let runnerCalled = false;
  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", repository,
      "--config", nestedConfig,
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      executionAttestation: { enforcesNetwork: true },
      readCheckoutHead: async () => event.snapshot.headOid,
      readBaseCheckoutHead: async () => event.snapshot.baseOid,
      runVerificationPlan: async () => {
        runnerCalled = true;
        return [];
      },
    }),
    (error) => error?.reason === "CONFIG_PATH_UNAUTHORIZED",
  );
  assert.equal(runnerCalled, false);
  assert.equal(JSON.parse(await readFile(path.join(output, "failure.json"), "utf8")).reason, "CONFIG_PATH_UNAUTHORIZED");
});

test("prototype CLI rejects base checkout drift after verification before publication", async (t) => {
  const output = await mkdtemp(path.join(tmpdir(), "proofrail-market-stale-base-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  let baseReads = 0;
  let runnerCalled = false;
  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      executionAttestation: { enforcesNetwork: true },
      readCheckoutHead: async () => event.snapshot.headOid,
      readBaseCheckoutHead: async () => {
        baseReads += 1;
        return baseReads === 1 ? event.snapshot.baseOid : "3".repeat(40);
      },
      runVerificationPlan: async () => {
        runnerCalled = true;
        return [];
      },
    }),
    (error) => error?.reason === "PRF_STALE_BASE",
  );
  assert.equal(baseReads, 2);
  assert.equal(runnerCalled, true);
  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
});

test("prototype CLI blocks an unenforceable production boundary before runner spawn", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-boundary-"));
  const output = path.join(directory, "output");
  t.after(() => rm(directory, { recursive: true, force: true }));
  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      readCheckoutHead: async () => "2".repeat(40),
      readBaseCheckoutHead: async () => "1".repeat(40),
    }),
    (error) => error?.reason === "BLOCKED_EXECUTION_BOUNDARY",
  );
  const failure = JSON.parse(await readFile(path.join(output, "failure.json"), "utf8"));
  assert.deepEqual(failure, {
    schemaVersion: "proofrail.delivery-failure.v1",
    code: "PROOFRAIL_PROTOTYPE_DELIVERY_FAILED",
    stage: "EXECUTION",
    reason: "BLOCKED_EXECUTION_BOUNDARY",
  });
  const summary = await readFile(path.join(output, "summary.md"), "utf8");
  assert.match(summary, /authority-approved GITHUB_HOSTED_LINUX_SANDBOX_V1 isolation attestation/);
  assert.match(summary, /No Evidence Bundle was produced/);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(output, "telemetry.json"), "utf8")).events.map(({ kind }) => kind),
    [],
  );
});

test("prototype CLI records a stale execution failure without a product Verdict", async (t) => {
  const { config, output, repository } = await prepareTelemetryEnabledPrototype(t);
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  const heads = [event.snapshot.headOid, event.snapshot.headOid, "3".repeat(40)];

  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", repository,
      "--config", config,
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      executionAttestation: { enforcesNetwork: true },
      readCheckoutHead: async () => heads.shift() ?? event.snapshot.headOid,
      readBaseCheckoutHead: async () => event.snapshot.baseOid,
      runVerificationPlan: async () => [],
    }),
    (error) => error?.stage === "EXECUTION" && error?.reason === "PRF_STALE_TARGET",
  );

  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(output, "telemetry.json"), "utf8")).events.map(({ kind }) => kind),
    ["INSTALLATION", "CONFIGURATION_PARSED", "VERIFICATION_STARTED", "DELIVERY_FAILURE", "STALE_TARGET", "RERUN_INTENT"],
  );
});

test("prototype CLI retains an OUTPUT failure packet when its first publication fails", async (t) => {
  const { config, output, repository } = await prepareTelemetryEnabledPrototype(t);
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  const heads = [event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid];
  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", repository,
      "--config", config,
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      executionAttestation: { enforcesNetwork: true },
      readCheckoutHead: async () => heads.shift() ?? event.snapshot.headOid,
      readBaseCheckoutHead: async () => event.snapshot.baseOid,
      runVerificationPlan: async ({ target, commands, authorityLineage, marketConfigSha256 }) => [{
        schemaVersion: "proofrail.verification-receipt.v1", id: "receipt:dddddddddddddddddddddddddddddddd", type: "COMMAND_EXECUTION", producer: { id: "runner.proofrail-verification", version: "1.0.0" }, target, command: { name: commands[0].name, run: commands[0].run, orderingKey: "001" }, environment: {}, executionBoundaryId: "execution.github-actions-market-v1", timing: {}, result: { status: "PASS", exitCode: 0, stdoutDigest: `sha256:${"A".repeat(64)}`, stderrDigest: `sha256:${"B".repeat(64)}`, stdoutBytes: 0, stderrBytes: 0, stdoutPreview: "", stderrPreview: "", stdoutTruncated: false, stderrTruncated: false, timedOut: false }, dependencyLockfile: {}, redaction: {}, lineage: { trustedConfigurationSha256: `sha256:${authorityLineage.trustedConfigurationSha256}`, policySha256: `sha256:${authorityLineage.policySha256}`, evidenceContractSha256: `sha256:${authorityLineage.evidenceContractSha256}`, marketConfigSha256: `sha256:${marketConfigSha256}` },
      }],
      write: async (file, content) => {
        if (file.endsWith("evidence-bundle.json")) throw new Error("injected primary publication failure");
        await writeFile(file, content, "utf8");
      },
    }),
    (error) => error?.stage === "OUTPUT" && error?.reason === "OUTPUT_WRITE_FAILED",
  );

  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
  assert.equal(JSON.parse(await readFile(path.join(output, "failure.json"), "utf8")).stage, "OUTPUT");
  assert.match(await readFile(path.join(output, "summary.md"), "utf8"), /No Evidence Bundle was produced/);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(output, "telemetry.json"), "utf8")).events.map(({ kind }) => kind),
    ["INSTALLATION", "CONFIGURATION_PARSED", "VERIFICATION_STARTED", "COMMAND_DURATION", "EVALUATION_COMPLETED", "DELIVERY_FAILURE", "ARTIFACT_FAILURE", "RERUN_INTENT"],
  );
});

test("prototype CLI preserves an OUTPUT failure when failure-packet publication also fails", async (t) => {
  const { config, output, repository } = await prepareTelemetryEnabledPrototype(t);
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  const heads = [event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid];
  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", repository,
      "--config", config,
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      executionAttestation: { enforcesNetwork: true },
      readCheckoutHead: async () => heads.shift() ?? event.snapshot.headOid,
      readBaseCheckoutHead: async () => event.snapshot.baseOid,
      runVerificationPlan: async () => [],
      write: async () => { throw new Error("injected publication failure"); },
    }),
    (error) => error?.stage === "OUTPUT" && error?.reason === "OUTPUT_WRITE_FAILED",
  );
  assert.equal(await lstat(output).catch(() => null), null);
});

test("prototype CLI rejects output alias before evaluation and publication", async (t) => {
  const eventPath = path.join(ROOT, "fixtures/market-prototype/github/pr-success.json");
  await assert.rejects(
    runPrototypeCli([
      "--event", eventPath,
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", eventPath,
      "--shell", await bashPath(),
    ], { __proofrailTestOnly: true }),
    (error) => error?.reason === "OUTPUT_ALIAS",
  );
  assert.match(await readFile(eventPath, "utf8"), /"snapshot"/);
  t.after(async () => { await lstat(eventPath); });
});

test("prototype CLI leaves the existing output untouched when staged publication fails", async (t) => {
  const output = await mkdtemp(path.join(tmpdir(), "proofrail-market-output-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const marker = path.join(output, "keep.txt");
  await writeFile(marker, "keep", "utf8");
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  const heads = [event.snapshot.headOid, event.snapshot.headOid];
  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      readCheckoutHead: async () => heads.shift() ?? event.snapshot.headOid,
      readBaseCheckoutHead: async () => event.snapshot.baseOid,
      runVerificationPlan: async ({ target, commands, authorityLineage, marketConfigSha256 }) => [{
        schemaVersion: "proofrail.verification-receipt.v1", id: "receipt:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", type: "COMMAND_EXECUTION", producer: { id: "runner.proofrail-verification", version: "1.0.0" }, target, command: { name: commands[0].name, run: commands[0].run, orderingKey: "001" }, environment: {}, executionBoundaryId: "execution.github-actions-market-v1", timing: {}, result: { status: "PASS", exitCode: 0, stdoutDigest: `sha256:${"A".repeat(64)}`, stderrDigest: `sha256:${"B".repeat(64)}`, stdoutBytes: 0, stderrBytes: 0, stdoutPreview: "", stderrPreview: "", stdoutTruncated: false, stderrTruncated: false, timedOut: false }, dependencyLockfile: {}, redaction: {}, lineage: { trustedConfigurationSha256: `sha256:${authorityLineage.trustedConfigurationSha256}`, policySha256: `sha256:${authorityLineage.policySha256}`, evidenceContractSha256: `sha256:${authorityLineage.evidenceContractSha256}`, marketConfigSha256: `sha256:${marketConfigSha256}` },
      }],
      write: async () => { throw new Error("injected write failure"); },
    }),
    (error) => error?.reason === "OUTPUT_WRITE_FAILED",
  );
  assert.equal(await readFile(marker, "utf8"), "keep");
  assert.equal((await lstat(path.join(output, "evidence-bundle.json")).catch(() => null)), null);
});

test("prototype CLI blocks an existing target-file mutation before publication", async (t) => {
  const output = await mkdtemp(path.join(tmpdir(), "proofrail-market-target-mutation-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const marker = path.join(output, "keep.txt");
  await writeFile(marker, "keep", "utf8");
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  const targetFile = path.join(ROOT, "examples/market-prototype/demo/README.md");
  const original = await readFile(targetFile);
  const heads = [event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid];
  let runnerCalled = false;
  try {
    await assert.rejects(
      runPrototypeCli([
        "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
        "--repo", path.join(ROOT, "examples/market-prototype/demo"),
        "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
        "--output", output,
        "--shell", await bashPath(),
      ], {
        __proofrailTestOnly: true,
        readCheckoutHead: async () => heads.shift() ?? event.snapshot.headOid,
        readBaseCheckoutHead: async () => event.snapshot.baseOid,
        runVerificationPlan: async () => {
          runnerCalled = true;
          await writeFile(targetFile, Buffer.concat([original, Buffer.from("\nmutated by runner\n", "utf8")]));
          return [];
        },
      }),
      (error) => error?.reason === "PRF_STALE_TARGET",
    );
  } finally {
    await writeFile(targetFile, original);
  }
  assert.equal(runnerCalled, true);
  assert.equal(await readFile(marker, "utf8"), "keep");
  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
});

test("prototype CLI blocks a runner-created non-generated sentinel before publication", async (t) => {
  const { config, output, repository } = await prepareTelemetryEnabledPrototype(t);
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  const heads = [event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid, event.snapshot.headOid];
  const sentinel = path.join(repository, "runner-created-sentinel.txt");
  let runnerCalled = false;

  await assert.rejects(
    runPrototypeCli([
      "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
      "--repo", repository,
      "--config", config,
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      executionAttestation: { enforcesNetwork: true },
      readCheckoutHead: async () => heads.shift() ?? event.snapshot.headOid,
      readBaseCheckoutHead: async () => event.snapshot.baseOid,
      runVerificationPlan: async () => {
        runnerCalled = true;
        await writeFile(sentinel, "unexpected\n", "utf8");
        return [];
      },
    }),
    (error) => error?.stage === "EXECUTION" && error?.reason === "PRF_STALE_TARGET",
  );

  assert.equal(runnerCalled, true);
  assert.equal(await lstat(sentinel).then(() => true), true);
  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
});

test("prototype CLI rejects a target mutation during the final pre-spawn head read", async (t) => {
  const output = await mkdtemp(path.join(tmpdir(), "proofrail-market-prespawn-target-mutation-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  const targetFile = path.join(ROOT, "examples/market-prototype/demo/README.md");
  const original = await readFile(targetFile);
  let headReads = 0;
  let runnerCalled = false;
  try {
    await assert.rejects(
      runPrototypeCli([
        "--event", path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"),
        "--repo", path.join(ROOT, "examples/market-prototype/demo"),
        "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
        "--output", output,
        "--shell", await bashPath(),
      ], {
        __proofrailTestOnly: true,
        readCheckoutHead: async () => {
          headReads += 1;
          if (headReads === 2) await writeFile(targetFile, Buffer.concat([original, Buffer.from("\nmutated during pre-spawn read\n", "utf8")]));
          return event.snapshot.headOid;
        },
        readBaseCheckoutHead: async () => event.snapshot.baseOid,
        runVerificationPlan: async () => {
          runnerCalled = true;
          return [];
        },
      }),
      (error) => error?.reason === "PRF_STALE_TARGET",
    );
  } finally {
    await writeFile(targetFile, original);
  }
  assert.equal(headReads, 2);
  assert.equal(runnerCalled, false);
  assert.equal(await lstat(path.join(output, "evidence-bundle.json")).catch(() => null), null);
});

test("prototype CLI rejects traversal in an offline changed path before runner", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-market-scope-path-"));
  const output = path.join(directory, "output");
  const eventPath = path.join(directory, "event.json");
  t.after(() => rm(directory, { recursive: true, force: true }));
  const event = JSON.parse(await readFile(path.join(ROOT, "fixtures/market-prototype/github/pr-success.json"), "utf8"));
  event.snapshot.files[0].path = "../../outside";
  await writeFile(eventPath, JSON.stringify(event), "utf8");
  let runnerCalled = false;
  await assert.rejects(
    runPrototypeCli([
      "--event", eventPath,
      "--repo", path.join(ROOT, "examples/market-prototype/demo"),
      "--config", path.join(ROOT, "examples/market-prototype/demo/.proofrail/config.yml"),
      "--output", output,
      "--shell", await bashPath(),
    ], {
      __proofrailTestOnly: true,
      readCheckoutHead: async () => event.snapshot.headOid,
      readBaseCheckoutHead: async () => event.snapshot.baseOid,
      runVerificationPlan: async () => {
        runnerCalled = true;
        return [];
      },
    }),
    (error) => error?.reason === "PRF_SCOPE_PATH_NOT_ALLOWED",
  );
  assert.equal(runnerCalled, false);
  assert.equal(JSON.parse(await readFile(path.join(output, "failure.json"), "utf8")).reason, "PRF_SCOPE_PATH_NOT_ALLOWED");
});

test("prototype CLI accepts the exact live argument extension", () => {
  const parsed = parsePrototypeArguments([
    "--event", "event.json",
    "--repo", "target",
    "--config", "base/.proofrail/config.yml",
    "--output", "output",
    "--shell", process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/bash",
    "--github-repo", "proofrail/demo",
    "--pull-request", "8",
  ]);
  assert.equal(parsed.mode, "live");
  assert.equal(parsed.repositoryName, "proofrail/demo");
  assert.equal(parsed.pullRequestNumber, 8);
});

test("prototype CLI rejects traversal before path resolution", () => {
  assert.throws(
    () => parsePrototypeArguments([
      "--event", "../event.json",
      "--repo", "target",
      "--config", "base/.proofrail/config.yml",
      "--output", "output",
      "--shell", "/bin/bash",
    ]),
    (error) => error?.reason === "PATH_INVALID",
  );
});

test("prototype CLI accepts the standalone strict workflow flag", () => {
  const parsed = parsePrototypeArguments([
    "--event", "event.json",
    "--repo", "target",
    "--config", "base/.proofrail/config.yml",
    "--output", "output",
    "--shell", process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/bash",
    "--strict",
  ]);
  assert.equal(parsed.strict, true);
  for (const strictTokens of [["--strict", "false"], ["--strict", "banana"], ["--strict", "--strict"], ["--strict=banana"]]) {
    assert.throws(
      () => parsePrototypeArguments([
        "--event", "event.json",
        "--repo", "target",
        "--config", "base/.proofrail/config.yml",
        "--output", "output",
        "--shell", "/bin/bash",
        ...strictTokens,
      ]),
      (error) => error?.reason === "INVALID_OPTIONS",
      `strict token sequence ${strictTokens.join(" ")} must be rejected`,
    );
  }
});

test("prototype CLI writes evidence but sets strict failure for stale target", async (t) => {
  const previous = process.exitCode;
  try {
    const result = await runFixture(t, "stale");
    assert.equal(result.bundle.verdict, "BLOCKED");
    assert(result.bundle.reasonCodes.includes("PRF_STALE_TARGET"));
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = previous;
  }
});
