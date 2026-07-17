import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import { assertValidatedMarketConfiguration, assertValidatedReleaseConfiguration, loadTrustedMarketConfiguration, loadTrustedReleaseConfiguration, parseMarketConfiguration, TrustedConfigurationError } from "../../packages/trusted-config/src/index.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MARKET_CONFIG = "config/trusted/proofrail-market-prototype-v1.json";
const PRESETS = path.join(ROOT, "config/presets");

test("loads the exact externally supplied v2 authority as a separate frozen brand", async () => {
  const market = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  assert.equal(market.identities.trustedConfigurationSha256, "7A76DCA50F3F76167EA92F5AF68D64ACFCE8539C03EAE20262876F5D6423A683");
  assert.equal(market.identities.policySha256, "C4AFB49EE70B3701837DF8ACC65427A180CF0453ABA773265B9DFC159E11CC1F");
  assert.equal(market.identities.evidenceContractSha256, "C195378ECDDDAE3FDE703EFC6A9A9C052A09683F68CF3490D2730A71F1B84C61");
  assert.equal(assertValidatedMarketConfiguration(market), market);
  assert.equal(Object.isFrozen(market.trustedConfiguration.executionBoundary), true);
  assert.throws(() => assertValidatedReleaseConfiguration(market), (error) => fixedError(error, "UNVALIDATED_CONFIGURATION"));

  const release = await loadTrustedReleaseConfiguration({ trustedConfigurationPath: "config/trusted/proofrail-release-v0.1.json", repositoryRoot: ROOT });
  assert.throws(() => assertValidatedMarketConfiguration(release), (error) => fixedError(error, "UNVALIDATED_CONFIGURATION"));
});

test("all four presets resolve deterministically from base YAML", async () => {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  const expected = {
    "typescript-basic": {
      allowed: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx", "package.json", "pnpm-lock.yaml", "tsconfig.json"],
      denied: [".github/**", "**/*.pem", "**/*.key"],
      commands: [{ name: "frozen-install", run: "pnpm install --frozen-lockfile", timeoutMinutes: 10 }, { name: "typecheck", run: "pnpm typecheck", timeoutMinutes: 10 }, { name: "test", run: "pnpm test", timeoutMinutes: 10 }],
      timeoutMinutes: 30,
      maximumOutputBytes: 1048576,
      reviews: { minimumApprovals: 1, requireExactHeadApproval: true, blockChangesRequested: true },
    },
    "ai-pr-strict": {
      allowed: ["src/**", "packages/**", "tests/**", "package.json", "pnpm-lock.yaml", "tsconfig.json"],
      denied: [".github/**", "config/trusted/**", "config/policies/**", "config/evidence-contracts/**", "**/*.pem", "**/*.key"],
      commands: [{ name: "frozen-install", run: "pnpm install --frozen-lockfile", timeoutMinutes: 10 }, { name: "lint", run: "pnpm lint", timeoutMinutes: 10 }, { name: "typecheck", run: "pnpm typecheck", timeoutMinutes: 10 }, { name: "test", run: "pnpm test", timeoutMinutes: 20 }, { name: "build", run: "pnpm build", timeoutMinutes: 10 }],
      timeoutMinutes: 60,
      maximumOutputBytes: 1048576,
      reviews: { minimumApprovals: 2, requireExactHeadApproval: true, blockChangesRequested: true },
    },
    "docs-only": {
      allowed: ["docs/**", "README.md", "CHANGELOG.md", "**/*.md"],
      denied: ["src/**", "packages/**", ".github/**", "config/**", "**/*.pem", "**/*.key"],
      commands: [{ name: "diff-check", run: "git diff --check", timeoutMinutes: 10 }],
      timeoutMinutes: 10,
      maximumOutputBytes: 262144,
      reviews: { minimumApprovals: 1, requireExactHeadApproval: true, blockChangesRequested: true },
    },
    "dependency-update": {
      allowed: ["package.json", "pnpm-lock.yaml", "npm-shrinkwrap.json", "package-lock.json", "yarn.lock"],
      denied: ["src/**", "packages/**", ".github/**", "config/**", "**/*.pem", "**/*.key"],
      commands: [{ name: "frozen-install", run: "pnpm install --frozen-lockfile", timeoutMinutes: 20 }, { name: "test", run: "pnpm test", timeoutMinutes: 20 }],
      timeoutMinutes: 40,
      maximumOutputBytes: 1048576,
      reviews: { minimumApprovals: 1, requireExactHeadApproval: true, blockChangesRequested: true },
    },
  };
  for (const preset of ["ai-pr-strict", "dependency-update", "docs-only", "typescript-basic"]) {
    const source = `version: 1\npreset: ${preset}\n`;
    const first = await parseMarketConfiguration({ source, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority });
    const second = await parseMarketConfiguration({ source, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority });
    assert.deepEqual(first, second);
    assert.equal(first.marketConfiguration.preset, preset);
    assert.deepEqual(first.marketConfiguration.scope.allowed, expected[preset].allowed);
    assert.deepEqual(first.marketConfiguration.scope.denied, expected[preset].denied);
    assert.deepEqual(first.marketConfiguration.verification.commands, expected[preset].commands);
    assert.equal(first.marketConfiguration.verification.timeoutMinutes, expected[preset].timeoutMinutes);
    assert.equal(first.marketConfiguration.verification.maximumOutputBytes, expected[preset].maximumOutputBytes);
    assert.deepEqual(first.marketConfiguration.reviews, expected[preset].reviews);
    assert.deepEqual(first.marketConfiguration.reportedChecks, { requireSuccess: true, minimumCount: 1 });
    assert.deepEqual(first.marketConfiguration.output, { uploadEvidenceBundle: true, includeCommandPreview: true, strict: true });
    assert.deepEqual(first.marketConfiguration.telemetry, { enabled: true });
    assert.equal(first.identity.marketConfigSha256, createHash("sha256").update(source).digest("hex").toUpperCase());
    assert.equal(Object.isFrozen(first.marketConfiguration.verification.commands), true);
  }
});

test("uses lower base limits while preserving selected command identities", async () => {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  const source = ["version: 1", "preset: typescript-basic", "verification:", "  timeoutMinutes: 10", "  maximumOutputBytes: 4096", "  commands:", "    - name: typecheck", "      run: pnpm typecheck", "      timeoutMinutes: 5", "    - name: test", "      run: pnpm test", "      timeoutMinutes: 7", "telemetry:", "  enabled: false", ""].join("\n");
  const parsed = await parseMarketConfiguration({ source, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority });
  assert.equal(parsed.marketConfiguration.verification.timeoutMinutes, 10);
  assert.equal(parsed.marketConfiguration.verification.maximumOutputBytes, 4096);
  assert.deepEqual(parsed.marketConfiguration.verification.commands, [{ name: "typecheck", run: "pnpm typecheck", timeoutMinutes: 5 }, { name: "test", run: "pnpm test", timeoutMinutes: 7 }]);
});

test("uses the stricter effective boundary", async () => {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  const source = ["version: 1", "preset: docs-only", "verification:", "  timeoutMinutes: 5", "  maximumOutputBytes: 4096", "  commands:", "    - name: diff-check", "      run: git diff --check", "      timeoutMinutes: 3", ""].join("\n");
  const parsed = await parseMarketConfiguration({ source, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority });
  assert.deepEqual(parsed.marketConfiguration.verification, {
    timeoutMinutes: 5,
    maximumOutputBytes: 4096,
    commands: [{ name: "diff-check", run: "git diff --check", timeoutMinutes: 3 }],
  });
  assert.equal(parsed.marketConfiguration.output.includeCommandPreview, true);
  assert.equal(authority.trustedConfiguration.executionBoundary.maximumPreviewBytesPerStream, 8192);
});

test("enables artifact-local telemetry by default and permits an explicit opt-out", async () => {
  // Given: a trusted authority and a telemetry-enabled preset.
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });

  // When: the base configuration omits telemetry or explicitly disables it.
  const defaultConfiguration = await parseMarketConfiguration({ source: "version: 1\npreset: docs-only\n", presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority });
  const optOutConfiguration = await parseMarketConfiguration({ source: "version: 1\npreset: docs-only\ntelemetry:\n  enabled: false\n", presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority });

  // Then: the preset default is retained unless the base configuration opts out.
  assert.deepEqual(defaultConfiguration.marketConfiguration.telemetry, { enabled: true });
  assert.deepEqual(optOutConfiguration.marketConfiguration.telemetry, { enabled: false });
});

test("freezes every effective configuration branch", async () => {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  const parsed = await parseMarketConfiguration({ source: "version: 1\npreset: ai-pr-strict\n", presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority });
  for (const section of Object.values(parsed.marketConfiguration)) assert.equal(Object.isFrozen(section), true);
  assert.throws(() => parsed.marketConfiguration.scope.allowed.push("unsafe/**"), TypeError);
  assert.throws(() => parsed.marketConfiguration.verification.commands[0].run = "curl https://example.invalid", TypeError);
});

test("rejects authority increases and conflicts", async () => {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  const cases = [
    ["version: 1\npreset: typescript-basic\nverification:\n  timeoutMinutes: 31\n", "AUTHORITY_LIMIT_EXCEEDED"],
    ["version: 1\npreset: typescript-basic\nverification:\n  maximumOutputBytes: 1048577\n", "AUTHORITY_LIMIT_EXCEEDED"],
    ["version: 1\npreset: typescript-basic\nverification:\n  commands:\n    - name: smoke\n      run: pnpm test\n", "CONFLICTING_CONFIGURATION"],
    ["version: 1\npreset: typescript-basic\nscope:\n  allowed: [other/**]\n", "CONFLICTING_CONFIGURATION"],
    ["version: 1\npreset: typescript-basic\nscope:\n  denied: [.github/**]\n", "CONFLICTING_CONFIGURATION"],
    ["version: 1\npreset: typescript-basic\nreviews:\n  minimumApprovals: 0\n", "CONFLICTING_CONFIGURATION"],
    ["version: 1\npreset: typescript-basic\noutput:\n  strict: false\n", "CONFLICTING_CONFIGURATION"],
  ];
  for (const [source, code] of cases) {
    await assert.rejects(parseMarketConfiguration({ source, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority }), (error) => fixedError(error, code));
  }
});

test("rejects unsafe and ambiguous path patterns", async () => {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  for (const pattern of ["", "/abs", "C:/abs", "../x", "a/../b", "a\\b", "a//b", "./a", "a/***/b"]) {
    const source = `version: 1\npreset: docs-only\nscope:\n  allowed: [${JSON.stringify(pattern)}]\n`;
    await assert.rejects(parseMarketConfiguration({ source, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority }), (error) => error instanceof TrustedConfigurationError);
  }
  const ambiguous = "version: 1\npreset: docs-only\nscope:\n  allowed: [docs/**]\n  denied: [docs/**]\n";
  await assert.rejects(parseMarketConfiguration({ source: ambiguous, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority }), (error) => fixedError(error, "CONFLICTING_CONFIGURATION"));
});

test("rejects scope patterns beyond the schema maxItems limit", async () => {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  const denied = ["src/**", "packages/**", ".github/**", "config/**", "**/*.pem", "**/*.key", ...Array.from({ length: 257 }, (_, index) => `extra-${String(index).padStart(3, "0")}/**`)];
  const source = [
    "version: 1",
    "preset: docs-only",
    "scope:",
    "  denied:",
    ...denied.map((pattern) => `    - ${JSON.stringify(pattern)}`),
    "",
  ].join("\n");
  await assert.rejects(
    parseMarketConfiguration({ source, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority }),
    (error) => fixedError(error, "SCHEMA_INVALID"),
  );
});

test("rejects YAML aliases, tags, multiple documents, unknown fields and unsafe globs", async () => {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  const cases = [
    "version: 1\npreset: &p typescript-basic\nscope: *p\n",
    "version: 1\npreset: !unsafe typescript-basic\n",
    "version: 1\npreset: typescript-basic\n---\nversion: 1\npreset: docs-only\n",
    "version: 1\npreset: typescript-basic\nunknown: true\n",
    "version: 1\npreset: typescript-basic\nscope:\n  allowed: [../escape]\n",
  ];
  for (const source of cases) {
    await assert.rejects(parseMarketConfiguration({ source, presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority }), (error) => error instanceof TrustedConfigurationError);
  }
});

test("verification receipt schema requires producer identity", async () => {
  const schema = JSON.parse(await readFile(path.join(ROOT, "schemas/product/verification-receipt.schema.json"), "utf8"));
  const validate = new Ajv2020({ allErrors: true, strict: true, formats: { "date-time": true } }).compile(schema);
  const receipt = { schemaVersion: "proofrail.verification-receipt.v1", id: `receipt:${"a".repeat(32)}`, type: "COMMAND_EXECUTION", producer: { id: "runner.proofrail-verification", version: "1.0.0" }, target: { repository: "proofrail/demo", pullRequestNumber: 1, baseSha: "1".repeat(40), headSha: "2".repeat(40), targetScopeId: "scope:demo" }, command: { name: "test", run: "pnpm test", orderingKey: "001" }, environment: { runner: "test", os: "test", architecture: "x64", node: "v24", allowedEnvironmentNames: ["CI"] }, executionBoundaryId: "execution.test", timing: { startedAt: "2026-07-15T00:00:00Z", endedAt: "2026-07-15T00:00:01Z", durationMs: 1000 }, result: { status: "PASS", exitCode: 0, stdoutDigest: `sha256:${"A".repeat(64)}`, stderrDigest: `sha256:${"B".repeat(64)}`, stdoutBytes: 0, stderrBytes: 0, stdoutPreview: "", stderrPreview: "", stdoutTruncated: false, stderrTruncated: false, timedOut: false }, dependencyLockfile: { path: null, sha256: null }, redaction: { applied: false, matchCount: 0 }, lineage: { trustedConfigurationSha256: `sha256:${"A".repeat(64)}`, policySha256: `sha256:${"B".repeat(64)}`, evidenceContractSha256: `sha256:${"C".repeat(64)}`, marketConfigSha256: `sha256:${"D".repeat(64)}` } };
  assert.equal(validate(receipt), true, JSON.stringify(validate.errors));
  delete receipt.producer;
  assert.equal(validate(receipt), false);
});

function fixedError(error, code) { return error instanceof TrustedConfigurationError && error.code === code && error.message === `TRUSTED_CONFIG_${code}`; }
