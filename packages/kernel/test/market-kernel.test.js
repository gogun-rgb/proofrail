import assert from "node:assert/strict";
import test from "node:test";

import { beginMarketEvaluation, evaluateMarketKernel, transitionMarketEvaluation } from "../src/index.js";
import { sha256Digest } from "../src/canonical-json.js";

const DIGESTS = { trustedConfiguration: `sha256:${"A".repeat(64)}`, policy: `sha256:${"B".repeat(64)}`, evidenceContract: `sha256:${"C".repeat(64)}`, marketConfig: `sha256:${"D".repeat(64)}` };

/** @template T @param {readonly T[]} values @returns {T} */
function takeFirst(values) {
  const value = values[0];
  if (value === undefined) throw new Error("test fixture unexpectedly omitted a value");
  return value;
}

function input() {
  const target = { repository: "proofrail/demo", pullRequestNumber: 7, baseSha: "1".repeat(40), headSha: "2".repeat(40), targetScopeId: "scope:demo" };
  return {
    schemaVersion: "proofrail.kernel.input.v2",
    evaluation: { id: "evaluation:market-test" },
    target,
    authority: {
      trustedConfiguration: { id: "config.market", version: "1.0.0", sha256: DIGESTS.trustedConfiguration },
      policy: { id: "policy.market", version: "1.0.0", sha256: DIGESTS.policy },
      evidenceContract: { id: "contract.market", version: "1.0.0", sha256: DIGESTS.evidenceContract },
      marketConfigSha256: DIGESTS.marketConfig,
    },
    claims: [{ id: "claim:market", targetScopeId: target.targetScopeId, statement: "the exact head satisfies market requirements" }],
    evidenceContract: { id: "contract.market", version: "1.0.0", selectionProvenance: { source: "TRUSTED_CONFIGURATION", configurationId: "config.market", configurationVersion: "1.0.0" }, requirementIds: ["requirement:head", "requirement:test"] },
    evidenceRequirements: [
      { id: "requirement:head", inputKind: "OBSERVATION", requiredProducer: { id: "observer.github", version: "1.0.0" }, factKey: "checkout.headMatchesTarget", expectation: { kind: "CONSTANT_EQUALS", value: true } },
      { id: "requirement:test", inputKind: "VERIFICATION_RECEIPT", requiredProducer: { id: "runner.proofrail-verification", version: "1.0.0" }, commandName: "test", expectedReceiptStatus: "PASS" },
    ],
    observations: [{ id: "observation:head", producer: { id: "observer.github", version: "1.0.0" }, targetScopeId: target.targetScopeId, factKey: "checkout.headMatchesTarget", factValue: true, sourceInputId: "github:demo", orderingKey: "001", limitations: [] }],
    verificationReceipts: [{ schemaVersion: "proofrail.verification-receipt.v1", id: "receipt:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", type: "COMMAND_EXECUTION", producer: { id: "runner.proofrail-verification", version: "1.0.0" }, target: structuredClone(target), command: { name: "test", run: "pnpm test", orderingKey: "001" }, environment: {}, executionBoundaryId: "execution.market", timing: {}, result: { status: "PASS", exitCode: 0, stdoutDigest: `sha256:${"E".repeat(64)}`, stderrDigest: `sha256:${"F".repeat(64)}` }, dependencyLockfile: {}, redaction: {}, lineage: { trustedConfigurationSha256: DIGESTS.trustedConfiguration, policySha256: DIGESTS.policy, evidenceContractSha256: DIGESTS.evidenceContract, marketConfigSha256: DIGESTS.marketConfig } }],
    rules: [
      { id: "rule:stale", condition: "STALE_TARGET", verdict: "BLOCKED", reasonCode: "PRF_STALE_TARGET" },
      { id: "rule:execution", condition: "EXECUTION_IMPOSSIBLE", verdict: "BLOCKED", reasonCode: "PRF_EXECUTION_IMPOSSIBLE" },
      { id: "rule:verification", condition: "VERIFICATION_COMMAND_FAILED", verdict: "REVISION_REQUIRED", reasonCode: "PRF_VERIFICATION_COMMAND_FAILED" },
      { id: "rule:missing", condition: "REQUIRED_EVIDENCE_MISSING", verdict: "REVISION_REQUIRED", reasonCode: "PRF_REQUIRED_EVIDENCE_MISSING" },
    ],
  };
}

test("PASS receipt and exact Observation produce deterministic ADMISSIBLE evidence", () => {
  const first = evaluateMarketKernel(input());
  const second = evaluateMarketKernel(structuredClone(input()));
  assert.deepEqual(first, second);
  assert.equal(first.verdict, "ADMISSIBLE");
  assert.equal(first.evidence.length, 2);
  assert.equal(Object.isFrozen(takeFirst(first.verificationReceipts)), true);
  const { artifactDigest, ...scope } = first;
  assert.equal(artifactDigest, `sha256:${sha256Digest(scope).toUpperCase()}`);
});

test("receipt failure is classified by Policy without directly assigning Verdict", () => {
  const candidate = input();
  const receipt = takeFirst(candidate.verificationReceipts);
  receipt.result.status = "FAIL";
  receipt.result.exitCode = 1;
  const result = evaluateMarketKernel(candidate);
  assert.equal(result.verdict, "REVISION_REQUIRED");
  assert.deepEqual(result.reasonCodes, ["PRF_VERIFICATION_COMMAND_FAILED"]);
});

test("stale target and command failure reduce to canonical BLOCKED precedence", () => {
  const candidate = input();
  takeFirst(candidate.observations).factValue = false;
  takeFirst(candidate.verificationReceipts).result.status = "FAIL";
  const result = evaluateMarketKernel(candidate);
  assert.equal(result.verdict, "BLOCKED");
  assert.deepEqual(result.reasonCodes, ["PRF_STALE_TARGET", "PRF_VERIFICATION_COMMAND_FAILED"]);
});

test("receipt producer, target and authority lineage cannot cross requirement boundaries", () => {
  const mutations = [
    (candidate = input()) => { takeFirst(candidate.verificationReceipts).producer.id = "runner.other"; },
    (candidate = input()) => { takeFirst(candidate.verificationReceipts).target.headSha = "3".repeat(40); },
    (candidate = input()) => { takeFirst(candidate.verificationReceipts).lineage.policySha256 = `sha256:${"9".repeat(64)}`; },
  ];
  for (const mutate of mutations) {
    const candidate = input();
    mutate(candidate);
    assert.notEqual(evaluateMarketKernel(candidate).verdict, "ADMISSIBLE");
  }
});

test("market-config lineage is part of the receipt authority boundary", () => {
  const candidate = input();
  const receipt = takeFirst(candidate.verificationReceipts);
  assert.ok(receipt);
  receipt.lineage.marketConfigSha256 = `sha256:${"9".repeat(64)}`;

  const result = evaluateMarketKernel(candidate);

  assert.equal(result.verdict, "REVISION_REQUIRED");
  assert.deepEqual(result.reasonCodes, ["PRF_REQUIRED_EVIDENCE_MISSING"]);
});

test("a receipt cannot satisfy an Observation requirement", () => {
  const candidate = input();
  const receipt = takeFirst(candidate.verificationReceipts);
  assert.ok(receipt);
  receipt.command.name = "checkout.headMatchesTarget";

  const result = evaluateMarketKernel(candidate);

  assert.equal(result.verdict, "REVISION_REQUIRED");
  assert.deepEqual(result.reasonCodes, ["PRF_REQUIRED_EVIDENCE_MISSING"]);
});

test("selection provenance remains bound to the trusted configuration", () => {
  const candidate = input();
  candidate.evidenceContract.selectionProvenance.configurationId = "config.attacker";

  assert.throws(
    () => evaluateMarketKernel(candidate),
    (error) => error instanceof Error && /authority reference mismatch|selection provenance/i.test(error.message)
  );
});

test("duplicate observation and receipt identities fail closed", () => {
  const candidate = input();
  const observation = takeFirst(candidate.observations);
  const receipt = takeFirst(candidate.verificationReceipts);
  assert.ok(observation && receipt);
  candidate.observations = [observation, structuredClone(observation)];
  assert.throws(() => evaluateMarketKernel(candidate), /observations contains duplicate identities/);

  const receiptCandidate = input();
  const receiptCopy = takeFirst(receiptCandidate.verificationReceipts);
  assert.ok(receiptCopy);
  receiptCandidate.verificationReceipts = [receiptCopy, structuredClone(receiptCopy)];
  assert.throws(() => evaluateMarketKernel(receiptCandidate), /verificationReceipts contains duplicate identities/);
});

test("market lifecycle reevaluation is explicit, immutable, and idempotent", () => {
  const candidate = input();
  const observation = takeFirst(candidate.observations);
  const receipt = takeFirst(candidate.verificationReceipts);
  assert.ok(observation && receipt);
  candidate.observations = [];
  candidate.verificationReceipts = [];

  let state = beginMarketEvaluation(candidate);
  assert.equal(state.phase, "COLLECTING_EVIDENCE");
  assert.equal(state.nextAction.kind, "COLLECT_EVIDENCE");

  state = transitionMarketEvaluation(state, { id: "event.observation", kind: "OBSERVATION_COLLECTED", observation });
  state = transitionMarketEvaluation(state, { id: "event.receipt", kind: "VERIFICATION_RECEIPT_COLLECTED", receipt });
  state = transitionMarketEvaluation(state, { id: "event.evaluate", kind: "RE_EVALUATE" });
  assert.equal(state.phase, "TERMINAL");
  assert.equal(state.verdict, "ADMISSIBLE");

  assert.deepEqual(
    transitionMarketEvaluation(state, { id: "event.evaluate", kind: "RE_EVALUATE" }),
    state
  );
  assert.throws(
    () => transitionMarketEvaluation(state, { id: "event.late", kind: "RE_EVALUATE" }),
    (error) => error instanceof Error && error.message.includes("INVALID_TRANSITION")
  );
});

test("a timeout receipt reaches canonical BLOCKED without fabricated evidence", () => {
  const candidate = input();
  const observation = takeFirst(candidate.observations);
  const receipt = takeFirst(candidate.verificationReceipts);
  assert.ok(observation && receipt);
  candidate.observations = [];
  candidate.verificationReceipts = [];
  receipt.result.status = "TIMEOUT";

  let state = beginMarketEvaluation(candidate);
  state = transitionMarketEvaluation(state, { id: "event.observation", kind: "OBSERVATION_COLLECTED", observation });
  state = transitionMarketEvaluation(state, { id: "event.receipt", kind: "VERIFICATION_RECEIPT_COLLECTED", receipt });
  state = transitionMarketEvaluation(state, { id: "event.evaluate", kind: "RE_EVALUATE" });

  assert.equal(state.phase, "BLOCKED");
  assert.equal(state.verdict, "BLOCKED");
  assert.equal(state.bundle.evidence.some(({ requirementId }) => requirementId === "requirement:test"), false);
});
