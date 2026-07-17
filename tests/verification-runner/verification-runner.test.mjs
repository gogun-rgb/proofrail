import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { runVerificationPlan, VerificationRunnerError } from "../../packages/verification-runner/src/index.js";
import { redact } from "../../packages/verification-runner/src/redaction.js";

const temporaryDirectories = [];
afterEach(async () => Promise.all(temporaryDirectories.splice(0).map((entry) => rm(entry, { recursive: true, force: true }))));
const WINDOWS_EXECUTION_SKIP = process.platform === "win32"
  ? "GITHUB_HOSTED_LINUX_SANDBOX_V1 cannot enforce process-tree termination on Windows"
  : false;

async function findBash() {
  const candidates = process.platform === "win32" ? [process.env.PROOFRAIL_TEST_BASH, "C:\\Users\\zizon\\AppData\\Local\\hermes\\git\\bin\\bash.exe", "C:\\Program Files\\Git\\bin\\bash.exe"] : [process.env.PROOFRAIL_TEST_BASH, "/bin/bash", "/usr/bin/bash"];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try { await access(candidate); return candidate; } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  throw new Error("bash is required for verification-runner tests");
}

async function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code !== "ESRCH"; }
}

function shellQuote(value) {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

async function fixture(overrides = {}, { register = true } = {}) {
  const workingDirectory = await mkdtemp(join(tmpdir(), "proofrail-runner-"));
  if (register) temporaryDirectories.push(workingDirectory);
  await writeFile(join(workingDirectory, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  const executionBoundary = { id: "execution.test-v1", maximumCommandCount: 12, maximumCommandTimeoutSeconds: 2, maximumTotalTimeoutSeconds: 4, maximumOutputBytesPerStream: 1024, maximumPreviewBytesPerStream: 256, terminateProcessTree: true, allowedEnvironmentNames: ["CI", "PATH", "PROOFRAIL_ALLOWED"], deniedEnvironmentNames: ["GH_TOKEN", "GITHUB_TOKEN", "NODE_OPTIONS", "NPM_CONFIG_USERCONFIG"] };
  return { target: { repository: "proofrail/example", pullRequestNumber: 17, baseSha: "1".repeat(40), headSha: "2".repeat(40), targetScopeId: "scope:market-test" }, commands: [{ name: "verify", run: "printf verified" }], workingDirectory, shellPath: await findBash(), executionBoundary, isolationAttestation: { backend: "GITHUB_HOSTED_LINUX_SANDBOX_V1", attested: true, platform: process.platform, enforcesFilesystem: true, enforcesNetwork: true, enforcesProcessTreeTermination: true, filesystemRoot: workingDirectory }, authorityLineage: { trustedConfigurationSha256: "A".repeat(64), policySha256: "B".repeat(64), evidenceContractSha256: "C".repeat(64) }, marketConfigSha256: "D".repeat(64), controlEnvironment: { PATH: process.env.PATH, CI: "true" }, runnerIdentity: { runner: "test", os: "test-os", architecture: "x64", node: "v24.test" }, ...overrides };
}

test("emits a canonical PASS receipt for a real command", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const options = await fixture();
  const [receipt] = await runVerificationPlan(options);
  assert.equal(receipt.result.status, "PASS");
  assert.equal(receipt.result.stdoutPreview, "verified");
  assert.deepEqual(receipt.producer, { id: "runner.proofrail-verification", version: "1.0.0" });
  assert.match(receipt.result.stdoutDigest, /^sha256:[0-9A-F]{64}$/);
  assert.equal("verdict" in receipt, false);
});

test("rejects a shell whose bytes do not match the authority digest", async () => {
  const base = await fixture();
  await assert.rejects(
    runVerificationPlan({ ...base, executionBoundary: { ...base.executionBoundary, shellSha256: "0".repeat(64) } }),
    (error) => error instanceof VerificationRunnerError && error.code === "BLOCKED_EXECUTION_BOUNDARY",
  );
});

test("records spawn failures as ERROR without exposing the raw error", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const missingShell = process.platform === "win32" ? "C:\\missing\\proofrail-shell.exe" : "/missing/proofrail-shell";
  const [receipt] = await runVerificationPlan({ ...base, shellPath: missingShell });
  assert.equal(receipt.result.status, "ERROR");
  assert.equal(receipt.result.exitCode, null);
  assert.doesNotMatch(JSON.stringify(receipt), /ENOENT|missing\/proofrail-shell/);
});

test("records FAIL and stops before following commands", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const marker = join(base.workingDirectory, "second-ran");
  const receipts = await runVerificationPlan({ ...base, commands: [{ name: "first", run: "exit 7" }, { name: "second", run: "printf second > second-ran" }] });
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].result.status, "FAIL");
  assert.equal(receipts[0].result.exitCode, 7);
  await assert.rejects(access(marker), (error) => error?.code === "ENOENT");
});

test("runs an optional worktree assertion before verification and after every command", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  let calls = 0;
  const receipts = await runVerificationPlan({
    ...base,
    commands: [{ name: "first", run: "printf first" }, { name: "second", run: "printf second" }],
    assertWorkingTreeStable: async () => { calls += 1; },
  });

  assert.equal(receipts.length, 2);
  assert.equal(calls, 3);
});

test("rejects a changed worktree before retaining a receipt or starting the next command", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const firstMarker = join(base.workingDirectory, "first-ran");
  const secondMarker = join(base.workingDirectory, "second-ran");
  let calls = 0;

  await assert.rejects(
    runVerificationPlan({
      ...base,
      commands: [
        { name: "first", run: `printf first > '${firstMarker}'` },
        { name: "second", run: `printf second > '${secondMarker}'` },
      ],
      assertWorkingTreeStable: async () => {
        calls += 1;
        if (calls === 2) throw new VerificationRunnerError("BLOCKED_EXECUTION_BOUNDARY", "working tree changed");
      },
    }),
    (error) => error instanceof VerificationRunnerError && error.code === "BLOCKED_EXECUTION_BOUNDARY",
  );
  assert.equal(calls, 2);
  await access(firstMarker);
  await assert.rejects(access(secondMarker), (error) => error?.code === "ENOENT");
});

test("rejects a non-function worktree assertion", async () => {
  const base = await fixture();
  await assert.rejects(
    runVerificationPlan({ ...base, assertWorkingTreeStable: true }),
    (error) => error instanceof VerificationRunnerError && error.code === "INVALID_OPTIONS",
  );
});

test("fails closed when no worker isolation attestation is supplied", async () => {
  const base = await fixture();
  const marker = join(base.workingDirectory, "unattested-command-ran");
  await assert.rejects(
    runVerificationPlan({ ...base, isolationAttestation: undefined, commands: [{ name: "unattested", run: `printf ran > '${marker}'` }] }),
    (error) => error instanceof VerificationRunnerError && error.code === "BLOCKED_EXECUTION_BOUNDARY",
  );
  await assert.rejects(access(marker), (error) => error?.code === "ENOENT");
});

test("runs only with an attested backend when filesystem and network policy are declared", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const [receipt] = await runVerificationPlan({
    ...base,
    commands: [{ name: "attested", run: "printf attested" }],
    executionBoundary: { ...base.executionBoundary, filesystemPolicy: "CHECKOUT_AND_RUNNER_TEMP_ONLY", filesystemRoot: base.workingDirectory, networkPolicy: "NO_NETWORK" },
    isolationAttestation: { backend: "GITHUB_HOSTED_LINUX_SANDBOX_V1", attested: true, platform: process.platform, enforcesFilesystem: true, enforcesNetwork: true, enforcesProcessTreeTermination: true, filesystemRoot: base.workingDirectory },
  });
  assert.equal(receipt.result.status, "PASS");
  assert.equal(receipt.result.stdoutPreview, "attested");
});

test("fails closed when filesystem isolation is declared but not attested", async () => {
  const base = await fixture();
  const marker = join(base.workingDirectory, "filesystem-command-ran");
  await assert.rejects(
    runVerificationPlan({
      ...base,
      commands: [{ name: "filesystem", run: `printf ran > '${marker}'` }],
      executionBoundary: { ...base.executionBoundary, filesystemPolicy: "CHECKOUT_AND_RUNNER_TEMP_ONLY" },
      isolationAttestation: undefined,
    }),
    (error) => error instanceof VerificationRunnerError && error.code === "BLOCKED_EXECUTION_BOUNDARY",
  );
  await assert.rejects(access(marker), (error) => error?.code === "ENOENT");
});

test("records TIMEOUT and terminates a command", { skip: process.platform === "win32" }, async () => {
  const base = await fixture();
  const [receipt] = await runVerificationPlan({ ...base, commands: [{ name: "slow", run: "sleep 20" }], executionBoundary: { ...base.executionBoundary, maximumCommandTimeoutSeconds: 1, maximumTotalTimeoutSeconds: 2 } });
  assert.equal(receipt.result.status, "TIMEOUT");
  assert.equal(receipt.result.timedOut, true);
});

test("bounds previews while hashing the complete stream", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const raw = "x".repeat(300);
  const [receipt] = await runVerificationPlan({ ...base, commands: [{ name: "large", run: "printf '%0300d' 0 | tr 0 x" }], executionBoundary: { ...base.executionBoundary, maximumPreviewBytesPerStream: 32 } });
  assert.equal(Buffer.byteLength(receipt.result.stdoutPreview), 32);
  assert.equal(receipt.result.stdoutTruncated, true);
  assert.equal(receipt.result.stdoutDigest, `sha256:${createHash("sha256").update(raw).digest("hex").toUpperCase()}`);
});

test("redaction helper removes prefixed and space-separated secret assignment values", () => {
  const canaries = [
    "GITHUB_TOKEN=runner-helper-github-token-canary",
    "CI_GITHUB_TOKEN = runner-helper-ci-token-canary",
    "OPENAI_API_KEY: runner-helper-openai-key-canary",
    "AWS_SECRET_ACCESS_KEY : runner-helper-aws-secret-canary",
    "PASSWORD = runner-helper-password-canary",
    "SERVICE_PRIVATE_KEY=runner-helper-private-key-canary",
  ];
  const redacted = redact(canaries.join("\n"));

  assert.equal(redacted.matchCount, canaries.length);
  for (const canary of canaries) {
    const value = canary.slice(canary.search(/[:=]/) + 1).trim();
    assert.doesNotMatch(redacted.text, new RegExp(value));
  }
  assert.match(redacted.text, /GITHUB_TOKEN=\[REDACTED\]/);
  assert.match(redacted.text, /CI_GITHUB_TOKEN = \[REDACTED\]/);
  assert.match(redacted.text, /OPENAI_API_KEY: \[REDACTED\]/);
  assert.match(redacted.text, /AWS_SECRET_ACCESS_KEY : \[REDACTED\]/);
  assert.match(redacted.text, /PASSWORD = \[REDACTED\]/);
  assert.match(redacted.text, /SERVICE_PRIVATE_KEY=\[REDACTED\]/);
});

test("redaction helper preserves non-secret assignment labels", () => {
  const text = "CI_GITHUB_TOKENIZED=value OPENAI_API_KEYS:value tokenization=visible BUILD_MODE=release";
  assert.deepEqual(redact(text), { text, matchCount: 0 });
});

test("redaction helper covers required labels and token families", () => {
  const canaries = [
    ["CI_GITHUB_TOKEN=supersecretvalue", "supersecretvalue"],
    ["OPENAI_API_KEY:supersecretvalue", "supersecretvalue"],
    ["AWS_SECRET_ACCESS_KEY=aws-supersecretvalue", "aws-supersecretvalue"],
    ["PASSWORD=password-supersecretvalue", "password-supersecretvalue"],
    ["token=token-supersecretvalue", "token-supersecretvalue"],
    ["Bearer bearer-supersecretvalue", "bearer-supersecretvalue"],
    [`ghp_${"G".repeat(24)}`, `ghp_${"G".repeat(24)}`],
  ];
  const redacted = redact(canaries.map(([input]) => input).join("\n"));

  assert.ok(redacted.matchCount >= canaries.length);
  for (const [, value] of canaries) assert.doesNotMatch(redacted.text, new RegExp(value));
  assert.match(redacted.text, /CI_GITHUB_TOKEN=\[REDACTED\]/);
  assert.match(redacted.text, /OPENAI_API_KEY:\[REDACTED\]/);
  assert.match(redacted.text, /AWS_SECRET_ACCESS_KEY=\[REDACTED\]/);
  assert.match(redacted.text, /PASSWORD=\[REDACTED\]/);
  assert.match(redacted.text, /token=\[REDACTED\]/);
  assert.deepEqual(redacted.text.split("\n").slice(-2), ["[REDACTED]", "[REDACTED]"]);

  const ordinary = "CI_GITHUB_TOKENIZED=value OPENAI_API_KEYS:value tokenization=visible BUILD_MODE=release";
  assert.deepEqual(redact(ordinary), { text: ordinary, matchCount: 0 });
});

test("redaction helper redacts raw credential families and complete private-key blocks", () => {
  const canaries = [
    `AKIA${"A".repeat(16)}`,
    ["xox", "b-123456789012-123456789012-abcdefghijklmnop"].join(""),
    `npm_${"n".repeat(36)}`,
    "-----BEGIN PRIVATE KEY-----\ncHJvb2ZyYWlsLXN5bnRoZXRpYy1wZW0tY2FuYXJ5\n-----END PRIVATE KEY-----",
  ];
  const redacted = redact(canaries.join("\n"));

  assert.equal(redacted.matchCount, canaries.length);
  for (const canary of canaries) assert.doesNotMatch(redacted.text, new RegExp(canary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(redacted.text.match(/\[REDACTED\]/g)?.length, canaries.length);
});

test("redaction helper preserves incomplete raw credential lookalikes", () => {
  const text = [
    `AKIA${"A".repeat(15)}`,
    "xoxb-too-short",
    `npm_${"n".repeat(35)}`,
    "-----BEGIN PRIVATE KEY-----\ncHJvb2ZyYWlsLXN5bnRoZXRpYy1wZW0tY2FuYXJ5",
  ].join("\n");

  assert.deepEqual(redact(text), { text, matchCount: 0 });
});

test("redaction helper removes quoted and JSON assignment values", () => {
  const canaries = [
    ['PASSWORD="runner-quoted-assignment-canary"', "runner-quoted-assignment-canary"],
    ["PASSWORD='runner-single-assignment-canary'", "runner-single-assignment-canary"],
    ['{"PASSWORD":"runner-json-assignment-canary"}', "runner-json-assignment-canary"],
  ];
  const redacted = redact(canaries.map(([input]) => input).join("\n"));

  assert.equal(redacted.matchCount, canaries.length);
  for (const [, value] of canaries) assert.doesNotMatch(redacted.text, new RegExp(value));
  assert.match(redacted.text, /PASSWORD="\[REDACTED\]"/);
  assert.match(redacted.text, /PASSWORD='\[REDACTED\]'/);
  assert.match(redacted.text, /\{"PASSWORD":"\[REDACTED\]"\}/);
});

test("redaction helper removes quoted and JSON assignment values", () => {
  const canaries = [
    ['PASSWORD="runner-quoted-assignment-canary"', "runner-quoted-assignment-canary"],
    ["PASSWORD='runner-single-assignment-canary'", "runner-single-assignment-canary"],
    ['{"PASSWORD":"runner-json-assignment-canary"}', "runner-json-assignment-canary"],
    [`TOKEN=ghp_${"G".repeat(24)}`, `ghp_${"G".repeat(24)}`],
  ];
  const redacted = redact(canaries.map(([input]) => input).join("\n"));

  assert.equal(redacted.matchCount, canaries.length);
  for (const [, value] of canaries) assert.doesNotMatch(redacted.text, new RegExp(value));
  assert.match(redacted.text, /PASSWORD="\[REDACTED\]"/);
  assert.match(redacted.text, /PASSWORD='\[REDACTED\]'/);
  assert.match(redacted.text, /\{"PASSWORD":"\[REDACTED\]"\}/);
  assert.match(redacted.text, /TOKEN=\[REDACTED\]/);
});

test("redacts prefixed and space-separated secret assignment labels", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const canaries = [
    "GITHUB_TOKEN=runner-github-token-canary",
    "CI_GITHUB_TOKEN = runner-ci-token-canary",
    "OPENAI_API_KEY: runner-openai-key-canary",
    "AWS_SECRET_ACCESS_KEY : runner-aws-secret-canary",
    "PASSWORD = runner-password-canary",
    "SERVICE_PRIVATE_KEY=runner-private-key-canary",
  ];
  const raw = canaries.join("\n");
  const [receipt] = await runVerificationPlan({
    ...base,
    commands: [{ name: "secret-labels", run: `printf '%s' ${shellQuote(raw)}` }],
    executionBoundary: { ...base.executionBoundary, maximumPreviewBytesPerStream: 1024 },
  });

  assert.equal(receipt.redaction.applied, true);
  assert.equal(receipt.redaction.matchCount, canaries.length);
  for (const canary of canaries) {
    const value = canary.slice(canary.search(/[:=]/) + 1).trim();
    assert.doesNotMatch(JSON.stringify(receipt), new RegExp(value));
  }
  assert.match(receipt.result.stdoutPreview, /GITHUB_TOKEN=\[REDACTED\]/);
  assert.match(receipt.result.stdoutPreview, /CI_GITHUB_TOKEN = \[REDACTED\]/);
  assert.match(receipt.result.stdoutPreview, /OPENAI_API_KEY: \[REDACTED\]/);
  assert.match(receipt.result.stdoutPreview, /AWS_SECRET_ACCESS_KEY : \[REDACTED\]/);
  assert.match(receipt.result.stdoutPreview, /PASSWORD = \[REDACTED\]/);
  assert.match(receipt.result.stdoutPreview, /SERVICE_PRIVATE_KEY=\[REDACTED\]/);
});

test("filters denied environment values", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const [receipt] = await runVerificationPlan({ ...base, commands: [{ name: "environment", run: "env | sort" }], controlEnvironment: { PATH: process.env.PATH, CI: "true", PROOFRAIL_ALLOWED: "visible", GH_TOKEN: "ghp_hiddenhiddenhiddenhidden", NODE_OPTIONS: "--require=/tmp/evil" }, executionBoundary: { ...base.executionBoundary, maximumOutputBytesPerStream: 4096, maximumPreviewBytesPerStream: 4096, allowedEnvironmentNames: [...base.executionBoundary.allowedEnvironmentNames, "GH_TOKEN", "NODE_OPTIONS"] } });
  assert.match(receipt.result.stdoutPreview, /PROOFRAIL_ALLOWED=visible/);
  assert.doesNotMatch(receipt.result.stdoutPreview, /GH_TOKEN|NODE_OPTIONS|hiddenhidden|evil/);
});

test("redacts previews and retained command text", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const raw = "token=supersecretvalue";
  const [receipt] = await runVerificationPlan({ ...base, commands: [{ name: "secret", run: `printf '${raw}'` }] });
  assert.equal(receipt.result.stdoutPreview, "token=[REDACTED]");
  assert.equal(receipt.redaction.applied, true);
  assert.doesNotMatch(JSON.stringify(receipt), /supersecretvalue/);
  assert.equal(receipt.result.stdoutDigest, `sha256:${createHash("sha256").update(raw).digest("hex").toUpperCase()}`);
});

test("redacts raw credential families and complete private-key blocks from retained receipts", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const canaries = [
    `AKIA${"A".repeat(16)}`,
    ["xox", "b-123456789012-123456789012-abcdefghijklmnop"].join(""),
    `npm_${"n".repeat(36)}`,
    "-----BEGIN PRIVATE KEY-----\ncHJvb2ZyYWlsLXN5bnRoZXRpYy1wZW0tY2FuYXJ5\n-----END PRIVATE KEY-----",
  ];
  const raw = canaries.join("\n");
  const [receipt] = await runVerificationPlan({
    ...base,
    commands: [{ name: "raw-credentials", run: `printf '%s' ${shellQuote(raw)}` }],
    executionBoundary: { ...base.executionBoundary, maximumPreviewBytesPerStream: 1024 },
  });

  assert.equal(receipt.redaction.applied, true);
  assert.ok(receipt.redaction.matchCount >= canaries.length);
  for (const canary of canaries) assert.doesNotMatch(JSON.stringify(receipt), new RegExp(canary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(receipt.result.stdoutPreview.match(/\[REDACTED\]/g)?.length, canaries.length);
});

test("fails closed when output exceeds its boundary", { skip: process.platform === "win32" }, async () => {
  const base = await fixture();
  const [receipt] = await runVerificationPlan({ ...base, commands: [{ name: "overflow", run: "while :; do printf xxxxxxxxxxxxxxxx; done" }], executionBoundary: { ...base.executionBoundary, maximumOutputBytesPerStream: 128, maximumPreviewBytesPerStream: 32 } });
  assert.equal(receipt.result.status, "ERROR");
  assert.ok(receipt.result.stdoutBytes > 128);
});

test("rejects invalid options before starting a command", async () => {
  const base = await fixture();
  await assert.rejects(
    runVerificationPlan({ ...base, workingDirectory: "relative/path" }),
    (error) => error instanceof VerificationRunnerError && error.code === "INVALID_OPTIONS",
  );
});

test("reports lockfile read failures without starting a command", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  await rm(join(base.workingDirectory, "pnpm-lock.yaml"));
  await mkdir(join(base.workingDirectory, "pnpm-lock.yaml"));
  await assert.rejects(
    runVerificationPlan(base),
    (error) => error instanceof VerificationRunnerError && error.code === "LOCKFILE_READ_FAILED",
  );
});

test("rejects traversal in the working directory before spawn", async () => {
  const base = await fixture();
  const traversal = `${base.workingDirectory}\\..\\${base.workingDirectory.split(/[\\/]/).pop()}`;
  await assert.rejects(
    runVerificationPlan({ ...base, workingDirectory: traversal }),
    (error) => error instanceof VerificationRunnerError && error.code === "INVALID_OPTIONS",
  );
});

test("fails closed when network isolation is declared but not attested", async () => {
  const base = await fixture();
  const marker = join(base.workingDirectory, "network-command-ran");
  await assert.rejects(
    runVerificationPlan({
      ...base,
      commands: [{ name: "network", run: `printf ran > '${marker}'` }],
      executionBoundary: { ...base.executionBoundary, networkPolicy: "NO_NETWORK" },
      isolationAttestation: undefined,
    }),
    (error) => error instanceof VerificationRunnerError && error.code === "BLOCKED_EXECUTION_BOUNDARY",
  );
  await assert.rejects(access(marker), (error) => error?.code === "ENOENT");
});

test("blocks an unattested Windows process-tree primitive before spawn", { skip: process.platform !== "win32" }, async () => {
  const base = await fixture();
  const marker = join(base.workingDirectory, "unsupported-tree-ran");
  const attestation = { ...base.isolationAttestation };
  delete attestation.enforcesProcessTreeTermination;
  await assert.rejects(
    runVerificationPlan({ ...base, isolationAttestation: attestation, commands: [{ name: "unsupported-tree", run: `printf ran > '${marker}'` }] }),
    (error) => error instanceof VerificationRunnerError && error.code === "BLOCKED_EXECUTION_BOUNDARY",
  );
  await assert.rejects(access(marker), (error) => error?.code === "ENOENT");
});

test("rejects an executable that does not match the authority binding", async () => {
  const base = await fixture();
  const mismatch = process.platform === "win32" ? "C:\\Windows\\System32\\cmd.exe" : "/bin/sh";
  await assert.rejects(
    runVerificationPlan({ ...base, executionBoundary: { ...base.executionBoundary, approvedShellPath: mismatch } }),
    (error) => error instanceof VerificationRunnerError && error.code === "BLOCKED_EXECUTION_BOUNDARY",
  );
});

test("rejects target mutation during receipt timing", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  let calls = 0;
  const target = base.target;
  const options = { ...base, clock: { now: () => { calls += 1; if (calls === 2) target.headSha = "3".repeat(40); return new Date("2026-07-15T00:00:00.000Z"); } } };
  await assert.rejects(
    runVerificationPlan(options),
    (error) => error instanceof VerificationRunnerError && error.code === "BLOCKED_EXECUTION_BOUNDARY",
  );
});

test("terminates a timeout process tree within the bounded grace window", { skip: process.platform === "win32" }, async () => {
  const base = await fixture();
  const pidFile = join(base.workingDirectory, "descendant.pid");
  const command = `sleep 30 & printf '%s' $! > '${pidFile}'; wait`;
  const started = Date.now();
  const [receipt] = await runVerificationPlan({ ...base, commands: [{ name: "timeout-tree", run: command }], executionBoundary: { ...base.executionBoundary, maximumCommandTimeoutSeconds: 1, maximumTotalTimeoutSeconds: 2 } });
  const elapsed = Date.now() - started;
  assert.equal(receipt.result.status, "TIMEOUT");
  assert.ok(elapsed < 5000, `timeout took ${elapsed}ms`);
  const pid = Number.parseInt(await readFile(pidFile, "utf8"), 10);
  assert.equal(await processExists(pid), false);
});

test("blocks the Linux isolation backend before a Windows descendant can spawn", { skip: process.platform !== "win32" }, async () => {
  const base = await fixture();
  const pidFile = join(base.workingDirectory, "node-descendant.pid");
  const markerPath = pidFile.replaceAll("\\", "/");
  const script = `require('node:fs').writeFileSync(${JSON.stringify(markerPath)}, String(process.pid)); setInterval(() => {}, 1000);`;
  const command = `node -e ${shellQuote(script)} & wait`;
  await assert.rejects(
    runVerificationPlan({ ...base, commands: [{ name: "windows-descendant", run: command }] }),
    (error) => error instanceof VerificationRunnerError
      && error.code === "BLOCKED_EXECUTION_BOUNDARY"
      && /GITHUB_HOSTED_LINUX_SANDBOX_V1/.test(error.message),
  );
  await assert.rejects(access(pidFile), (error) => error?.code === "ENOENT");
});

test("sends TERM before KILL when a POSIX child handles TERM", { skip: process.platform === "win32" }, async () => {
  const base = await fixture();
  const termMarker = join(base.workingDirectory, "term-marker");
  const command = `trap 'printf term > "${termMarker}"; exit 0' TERM; while :; do sleep 1; done`;
  const [receipt] = await runVerificationPlan({ ...base, commands: [{ name: "term-first", run: command }], executionBoundary: { ...base.executionBoundary, maximumCommandTimeoutSeconds: 1, maximumTotalTimeoutSeconds: 2 } });
  assert.equal(receipt.result.status, "TIMEOUT");
  assert.equal(await readFile(termMarker, "utf8"), "term");
});

test("preserves raw stdout and stderr digests while redacting retained previews", { skip: WINDOWS_EXECUTION_SKIP }, async () => {
  const base = await fixture();
  const stdout = "password=super-secret-canary";
  const stderr = "Bearer abcdefghijklmnop-secret";
  const [receipt] = await runVerificationPlan({ ...base, commands: [{ name: "digests", run: `printf '${stdout}'; printf '${stderr}' >&2` }] });
  assert.equal(receipt.result.stdoutDigest, `sha256:${createHash("sha256").update(stdout).digest("hex").toUpperCase()}`);
  assert.equal(receipt.result.stderrDigest, `sha256:${createHash("sha256").update(stderr).digest("hex").toUpperCase()}`);
  assert.match(receipt.result.stdoutPreview, /password=\[REDACTED\]/);
  assert.equal(receipt.result.stderrPreview, "[REDACTED]");
  assert.doesNotMatch(JSON.stringify(receipt), /super-secret-canary|abcdefghijklmnop-secret/);
});
