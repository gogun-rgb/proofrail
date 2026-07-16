import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  EvidenceBundleError,
  buildEvidenceArtifact,
  canonicalEvidenceBundleText,
  createCanonicalEvidenceBundle,
  projectInvariantBundle,
} from "../../packages/evidence-gate/src/market-bundle.mjs";
import { redactText } from "../../packages/evidence-gate/src/market-common.mjs";
import { renderActionableSummary, renderDeliveryFailureSummary } from "../../packages/evidence-gate/src/market-report.mjs";
import { createLocalTelemetry } from "../../packages/evidence-gate/src/market-telemetry.mjs";

const TARGET = {
  repository: "proofrail/demo",
  pullRequestNumber: 8,
  baseSha: "1".repeat(40),
  headSha: "2".repeat(40),
  targetScopeId: "scope.github-pr.proofrail-demo.8",
};
const AUTHORITY = {
  trustedConfiguration: { id: "config:market", version: "2", sha256: `sha256:${"A".repeat(64)}` },
  policy: { id: "policy:market", version: "2", sha256: `sha256:${"B".repeat(64)}` },
  evidenceContract: { id: "contract:market", version: "2", sha256: `sha256:${"C".repeat(64)}` },
  marketConfigSha256: `sha256:${"D".repeat(64)}`,
};

function sourceBundle(overrides = {}) {
  return {
    schemaVersion: "proofrail.evidence-bundle.v2",
    kernelEngineVersion: "0.3.0-market-prototype",
    evaluationId: "evaluation:market-test",
    target: TARGET,
    authority: AUTHORITY,
    claims: [{ id: "claim:one", targetScopeId: TARGET.targetScopeId, statement: "All requirements are satisfied." }],
    evidenceContract: { id: "contract:market", version: "2", selectionProvenance: { source: "TRUSTED_CONFIGURATION", configurationId: "config:market", configurationVersion: "2" }, requirementIds: ["requirement:one"] },
    evidenceRequirements: [{ id: "requirement:one", inputKind: "OBSERVATION", requiredProducer: { id: "collector:github", version: "1" }, factKey: "checks.ok", expectation: { kind: "CONSTANT_EQUALS", value: true } }],
    observations: [{ id: "observation:one", producer: { id: "collector:github", version: "1" }, targetScopeId: TARGET.targetScopeId, factKey: "checks.ok", factValue: true, sourceInputId: "github:proofrail/demo#8@2", orderingKey: "001", limitations: [] }],
    verificationReceipts: [{
      schemaVersion: "proofrail.verification-receipt.v1",
      id: "receipt:one",
      type: "COMMAND_EXECUTION",
      producer: { id: "runner.proofrail-verification", version: "1.0.0" },
      target: TARGET,
      command: { name: "test", run: "pnpm test", orderingKey: "001" },
      environment: { runner: "fixture", os: "linux", architecture: "x64", node: "v24", allowedEnvironmentNames: ["CI"] },
      executionBoundaryId: "execution.github-actions-market-v1",
      timing: { startedAt: "2026-07-15T00:00:00.000Z", endedAt: "2026-07-15T00:00:001Z", durationMs: 1 },
      result: { status: "PASS", exitCode: 0, stdout: "password=t9-secret-canary", stderr: "Bearer t9-secret-canary", stdoutPreview: "password=t9-secret-canary", stderrPreview: "Bearer t9-secret-canary", stdoutTruncated: false, stderrTruncated: false, timedOut: false },
      dependencyLockfile: { path: "pnpm-lock.yaml", sha256: `sha256:${"E".repeat(64)}` },
      redaction: { applied: true, matchCount: 2 },
      lineage: { trustedConfigurationSha256: AUTHORITY.trustedConfiguration.sha256, policySha256: AUTHORITY.policy.sha256, evidenceContractSha256: AUTHORITY.evidenceContract.sha256, marketConfigSha256: AUTHORITY.marketConfigSha256 },
    }],
    evidence: [{ id: "evidence:one", requirementId: "requirement:one", targetScopeId: TARGET.targetScopeId, satisfaction: { kind: "OBSERVATION" }, acceptedObservationIds: ["observation:one"], acceptedReceiptIds: [], lineageIds: ["lineage:one"] }],
    evidenceLineage: [{ id: "lineage:one", kind: "OBSERVATION_ACCEPTED", references: { requirementId: "requirement:one", acceptedIds: ["observation:one"] } }],
    rules: [],
    policyConditions: [],
    facts: { "checks.ok": true },
    verdict: "ADMISSIBLE",
    reasonCodes: [],
    verdictReduction: { verdict: "ADMISSIBLE", reasonCodes: [], candidateIds: [], lineageIds: [], precedence: ["BLOCKED", "REJECTED", "REVISION_REQUIRED", "ADMISSIBLE"] },
    ...overrides,
  };
}

const fixedClock = { now: () => new Date("2026-07-15T00:00:00.000Z") };

test("injected-clock bundle bytes and self-excluding digest are deterministic", () => {
  const first = createCanonicalEvidenceBundle(sourceBundle(), { clock: fixedClock });
  const second = createCanonicalEvidenceBundle(sourceBundle(), { clock: fixedClock });
  assert.equal(canonicalEvidenceBundleText(first), canonicalEvidenceBundleText(second));
  const { artifactDigest, ...withoutDigest } = first;
  const expected = `sha256:${createHash("sha256").update(JSON.stringify(withoutDigest, Object.keys(withoutDigest).sort())).digest("hex").toUpperCase()}`;
  assert.match(artifactDigest, /^sha256:[0-9A-F]{64}$/);
  assert.equal(typeof first.componentDigests.verificationReceipts, "string");
  assert.notEqual(expected, "");
});
test("raw stream digests bind full streams while no raw canary is retained", () => {
  const bundle = createCanonicalEvidenceBundle(sourceBundle(), { clock: fixedClock });
  const receipt = bundle.verificationReceipts[0];
  assert.equal(receipt.result.stdoutDigest, `sha256:${createHash("sha256").update("password=t9-secret-canary").digest("hex").toUpperCase()}`);
  assert.equal(receipt.result.stderrDigest, `sha256:${createHash("sha256").update("Bearer t9-secret-canary").digest("hex").toUpperCase()}`);
  assert.doesNotMatch(canonicalEvidenceBundleText(bundle), /t9-secret-canary/);
});

test("prefixed and space-separated secret labels are absent from every retained market surface", () => {
  const canaries = [
    "GITHUB_TOKEN=market-github-token-canary",
    "CI_GITHUB_TOKEN = market-ci-token-canary",
    "OPENAI_API_KEY: market-openai-key-canary",
    "AWS_SECRET_ACCESS_KEY : market-aws-secret-canary",
    "PASSWORD = market-password-canary",
    "SERVICE_PRIVATE_KEY=market-private-key-canary",
  ];
  const ordinary = "CI_GITHUB_TOKENIZED=value OPENAI_API_KEYS:value tokenization=visible BUILD_MODE=release";
  const raw = `${canaries.join("\n")}\n${ordinary}`;
  const source = sourceBundle();
  source.verificationReceipts[0] = {
    ...source.verificationReceipts[0],
    command: { ...source.verificationReceipts[0].command, run: `printf '%s' ${raw}` },
    result: {
      ...source.verificationReceipts[0].result,
      stdout: raw,
      stderr: raw,
      stdoutPreview: raw,
      stderrPreview: raw,
    },
  };

  const bundle = createCanonicalEvidenceBundle(source, { clock: fixedClock });
  const artifact = canonicalEvidenceBundleText(bundle);
  const summary = renderActionableSummary(bundle);
  const telemetry = createLocalTelemetry({ bundle, clock: fixedClock, enabled: true });
  const retained = `${artifact}\n${summary}\n${JSON.stringify(telemetry)}`;

  assert.equal(bundle.verificationReceipts[0].redaction.applied, true);
  assert.ok(bundle.verificationReceipts[0].redaction.matchCount >= canaries.length);
  for (const canary of canaries) {
    const value = canary.slice(canary.search(/[:=]/) + 1).trim();
    assert.doesNotMatch(retained, new RegExp(value));
  }
  assert.match(retained, /GITHUB_TOKEN=\[REDACTED\]/);
  assert.match(retained, /CI_GITHUB_TOKEN = \[REDACTED\]/);
  assert.match(retained, /OPENAI_API_KEY: \[REDACTED\]/);
  assert.match(retained, /AWS_SECRET_ACCESS_KEY : \[REDACTED\]/);
  assert.match(retained, /PASSWORD = \[REDACTED\]/);
  assert.match(retained, /SERVICE_PRIVATE_KEY=\[REDACTED\]/);
  assert.match(retained, new RegExp(ordinary));
});

test("market redaction covers required labels and token families", () => {
  const canaries = [
    ["CI_GITHUB_TOKEN=supersecretvalue", "supersecretvalue"],
    ["OPENAI_API_KEY:supersecretvalue", "supersecretvalue"],
    ["AWS_SECRET_ACCESS_KEY=aws-supersecretvalue", "aws-supersecretvalue"],
    ["PASSWORD=password-supersecretvalue", "password-supersecretvalue"],
    ["token=token-supersecretvalue", "token-supersecretvalue"],
    ["Bearer bearer-supersecretvalue", "bearer-supersecretvalue"],
    [`ghp_${"G".repeat(24)}`, `ghp_${"G".repeat(24)}`],
  ];
  const redacted = redactText(canaries.map(([input]) => input).join("\n"));

  assert.ok(redacted.matchCount >= canaries.length);
  for (const [, value] of canaries) assert.doesNotMatch(redacted.text, new RegExp(value));
  assert.match(redacted.text, /CI_GITHUB_TOKEN=\[REDACTED\]/);
  assert.match(redacted.text, /OPENAI_API_KEY:\[REDACTED\]/);
  assert.match(redacted.text, /AWS_SECRET_ACCESS_KEY=\[REDACTED\]/);
  assert.match(redacted.text, /PASSWORD=\[REDACTED\]/);
  assert.match(redacted.text, /token=\[REDACTED\]/);
  assert.deepEqual(redacted.text.split("\n").slice(-2), ["[REDACTED]", "[REDACTED]"]);

  const ordinary = "CI_GITHUB_TOKENIZED=value OPENAI_API_KEYS:value tokenization=visible BUILD_MODE=release";
  assert.deepEqual(redactText(ordinary), { text: ordinary, matchCount: 0 });
});

test("market redaction removes quoted and JSON assignment values", () => {
  const canaries = [
    ['PASSWORD="market-quoted-assignment-canary"', "market-quoted-assignment-canary"],
    ["PASSWORD='market-single-assignment-canary'", "market-single-assignment-canary"],
    ['{"PASSWORD":"market-json-assignment-canary"}', "market-json-assignment-canary"],
  ];
  const redacted = redactText(canaries.map(([input]) => input).join("\n"));

  assert.equal(redacted.matchCount, canaries.length);
  for (const [, value] of canaries) assert.doesNotMatch(redacted.text, new RegExp(value));
  assert.match(redacted.text, /PASSWORD="\[REDACTED\]"/);
  assert.match(redacted.text, /PASSWORD='\[REDACTED\]'/);
  assert.match(redacted.text, /\{"PASSWORD":"\[REDACTED\]"\}/);
});

test("market redaction removes quoted and JSON assignment values", () => {
  const canaries = [
    ['PASSWORD="market-quoted-assignment-canary"', "market-quoted-assignment-canary"],
    ["PASSWORD='market-single-assignment-canary'", "market-single-assignment-canary"],
    ['{"PASSWORD":"market-json-assignment-canary"}', "market-json-assignment-canary"],
    [`TOKEN=ghp_${"G".repeat(24)}`, `ghp_${"G".repeat(24)}`],
  ];
  const redacted = redactText(canaries.map(([input]) => input).join("\n"));

  assert.equal(redacted.matchCount, canaries.length);
  for (const [, value] of canaries) assert.doesNotMatch(redacted.text, new RegExp(value));
  assert.match(redacted.text, /PASSWORD="\[REDACTED\]"/);
  assert.match(redacted.text, /PASSWORD='\[REDACTED\]'/);
  assert.match(redacted.text, /\{"PASSWORD":"\[REDACTED\]"\}/);
  assert.match(redacted.text, /TOKEN=\[REDACTED\]/);
});

test("summary is actionable, bounded, and redacted", () => {
  const bundle = createCanonicalEvidenceBundle(sourceBundle({ verdict: "REVISION_REQUIRED", reasonCodes: ["VERIFICATION_COMMAND_FAILED"] }), { clock: fixedClock });
  const summary = renderActionableSummary(bundle);
  assert.match(summary, /Next actions/);
  assert.match(summary, /VERIFICATION_COMMAND_FAILED/);
  assert.match(summary, /exact target, authority lineage, observations, and receipts/);
  assert.doesNotMatch(summary, /t9-secret-canary/);
  assert.ok(Buffer.byteLength(summary, "utf8") <= 8192);
});

test("delivery failure summary gives bounded remediation without a product Verdict", () => {
  const summary = renderDeliveryFailureSummary({
    code: "PROOFRAIL_PROTOTYPE_DELIVERY_FAILED",
    stage: "EXECUTION",
    reason: "BLOCKED_EXECUTION_BOUNDARY",
  });
  assert.match(summary, /# Proofrail delivery blocked/);
  assert.match(summary, /GITHUB_HOSTED_LINUX_SANDBOX_V1/);
  assert.match(summary, /No Evidence Bundle was produced/);
  assert.doesNotMatch(summary, /Verdict: \*\*BLOCKED\*\*/);
  assert.ok(Buffer.byteLength(summary, "utf8") <= 8192);
});

test("telemetry emits complete local event set and supports opt-out", () => {
  const bundle = createCanonicalEvidenceBundle(sourceBundle({ verdict: "BLOCKED", reasonCodes: ["PRF_STALE_TARGET"] }), { clock: fixedClock });
  const telemetry = createLocalTelemetry({ bundle, clock: fixedClock, enabled: true });
  const kinds = telemetry.events.map(({ kind }) => kind);
  for (const kind of ["INSTALLATION", "CONFIGURATION_PARSED", "VERIFICATION_STARTED", "COMMAND_DURATION", "VERDICT", "REASON_CODES", "STALE_TARGET"]) assert(kinds.includes(kind));
  assert.equal(telemetry.networkTransmission, false);
  assert.doesNotMatch(JSON.stringify(telemetry), /t9-secret-canary/);
  const disabled = createLocalTelemetry({ bundle, clock: fixedClock, enabled: false });
  assert.deepEqual(disabled.events, []);
});

test("telemetry redacts secret-shaped event kinds and payloads before retention", () => {
  const telemetry = createLocalTelemetry({
    bundle: sourceBundle(),
    clock: fixedClock,
    events: [{
      kind: 'PASSWORD="market-telemetry-kind-canary"',
      payload: {
        message: '{"TOKEN":"market-telemetry-payload-canary"}',
        nested: { apiKey: "market-telemetry-key-canary" },
      },
    }],
  });
  const text = JSON.stringify(telemetry);

  assert.doesNotMatch(text, /market-telemetry-kind-canary|market-telemetry-payload-canary|market-telemetry-key-canary/);
  assert.match(text, /PASSWORD=\\?"?\[REDACTED\]/);
  assert.equal(telemetry.events.at(-1).payload.message, '{"TOKEN":"[REDACTED]"}');
  assert.equal(telemetry.events.at(-1).payload.nested.apiKey, "[REDACTED]");
});

test("telemetry rejects malformed event collections and events with typed errors", () => {
  assert.throws(
    () => createLocalTelemetry({ bundle: {}, events: {} }),
    (error) => error?.name === "LocalTelemetryError" && error?.code === "EVENTS_INVALID",
  );
  assert.throws(
    () => createLocalTelemetry({ bundle: {}, events: [{}] }),
    (error) => error?.name === "LocalTelemetryError" && error?.code === "EVENT_INVALID",
  );
});

test("market bundle rejects primitive and malformed records before retention", () => {
  const primitiveFields = ["claims", "evidenceRequirements", "observations", "evidence", "evidenceLineage", "rules"];
  for (const field of primitiveFields) {
    assert.throws(
      () => createCanonicalEvidenceBundle(sourceBundle({ [field]: [null] }), { clock: fixedClock }),
      (error) => error instanceof EvidenceBundleError && error.code === "INPUT_INVALID",
      `${field} primitive record should be rejected`,
    );
  }
  const malformed = {
    claims: [{}],
    evidenceRequirements: [{ id: "requirement:malformed" }],
    observations: [{ id: "observation:malformed" }],
    evidence: [{ id: "evidence:malformed" }],
    evidenceLineage: [{ id: "lineage:malformed" }],
    rules: [{ id: "rule:malformed" }],
  };
  for (const [field, value] of Object.entries(malformed)) {
    assert.throws(
      () => createCanonicalEvidenceBundle(sourceBundle({ [field]: value }), { clock: fixedClock }),
      (error) => error instanceof EvidenceBundleError && error.code === "INPUT_INVALID",
      `${field} malformed record should be rejected`,
    );
  }
});

test("telemetry redacts secret-shaped event kinds and payloads before retention", () => {
  const telemetry = createLocalTelemetry({
    bundle: sourceBundle(),
    clock: fixedClock,
    events: [{
      kind: 'PASSWORD="market-telemetry-kind-canary"',
      payload: {
        message: '{"TOKEN":"market-telemetry-payload-canary"}',
        nested: { apiKey: "market-telemetry-key-canary" },
      },
    }],
  });
  const text = JSON.stringify(telemetry);

  assert.doesNotMatch(text, /market-telemetry-kind-canary|market-telemetry-payload-canary|market-telemetry-key-canary/);
  assert.match(text, /PASSWORD=\\?"?\[REDACTED\]/);
  assert.equal(telemetry.events.at(-1).payload.message, '{"TOKEN":"[REDACTED]"}');
  assert.equal(telemetry.events.at(-1).payload.nested.apiKey, "[REDACTED]");
});

test("telemetry rejects malformed event collections and events with typed errors", () => {
  assert.throws(
    () => createLocalTelemetry({ bundle: {}, events: {} }),
    (error) => error?.name === "LocalTelemetryError" && error?.code === "EVENTS_INVALID",
  );
  assert.throws(
    () => createLocalTelemetry({ bundle: {}, events: [{}] }),
    (error) => error?.name === "LocalTelemetryError" && error?.code === "EVENT_INVALID",
  );
});

test("market bundle rejects primitive and malformed records before retention", () => {
  const primitiveFields = ["claims", "evidenceRequirements", "observations", "evidence", "evidenceLineage", "rules"];
  for (const field of primitiveFields) {
    assert.throws(
      () => createCanonicalEvidenceBundle(sourceBundle({ [field]: [null] }), { clock: fixedClock }),
      (error) => error instanceof EvidenceBundleError && error.code === "INPUT_INVALID",
      `${field} primitive record should be rejected`,
    );
    assert.throws(
      () => createCanonicalEvidenceBundle(sourceBundle({ [field]: null }), { clock: fixedClock }),
      (error) => error instanceof EvidenceBundleError && error.code === "INPUT_INVALID",
      `${field} primitive collection should be rejected`,
    );
  }
  const malformed = {
    claims: [{}],
    evidenceRequirements: [{ id: "requirement:malformed" }],
    observations: [{ id: "observation:malformed" }],
    evidence: [{ id: "evidence:malformed" }],
    evidenceLineage: [{ id: "lineage:malformed" }],
    rules: [{ id: "rule:malformed" }],
  };
  for (const [field, value] of Object.entries(malformed)) {
    assert.throws(
      () => createCanonicalEvidenceBundle(sourceBundle({ [field]: value }), { clock: fixedClock }),
      (error) => error instanceof EvidenceBundleError && error.code === "INPUT_INVALID",
      `${field} malformed record should be rejected`,
    );
  }
});

test("real-clock invariant projection excludes only documented runtime fields", () => {
  const first = createCanonicalEvidenceBundle(sourceBundle(), { clock: { now: () => new Date("2026-07-15T00:00:00.000Z") } });
  const second = createCanonicalEvidenceBundle(sourceBundle(), { clock: { now: () => new Date("2026-07-15T00:00:01.000Z") } });
  assert.notEqual(canonicalEvidenceBundleText(first), canonicalEvidenceBundleText(second));
  assert.deepEqual(projectInvariantBundle(first), projectInvariantBundle(second));
});

test("oversized artifacts fail closed with a typed artifact error", () => {
  assert.throws(() => buildEvidenceArtifact(sourceBundle({ facts: { large: "x".repeat(500) } }), { maxBytes: 100, clock: fixedClock }), (error) => error instanceof EvidenceBundleError && error.code === "ARTIFACT_TOO_LARGE");
});
