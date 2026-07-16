import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadTrustedMarketConfiguration, parseMarketConfiguration } from "../../packages/trusted-config/src/index.js";
import { evaluateMarketCandidate } from "../../packages/release-orchestrator/src/index.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

async function fixture() {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: "config/trusted/proofrail-market-prototype-v1.json", repositoryRoot: ROOT });
  const parsed = await parseMarketConfiguration({ source: "version: 1\npreset: docs-only\n", presetsDirectory: path.join(ROOT, "config/presets"), repositoryRoot: ROOT, validatedAuthority: authority });
  const target = { repository: "proofrail/demo", pullRequestNumber: 8, baseSha: "1".repeat(40), headSha: "2".repeat(40), targetScopeId: "scope.github-pr.proofrail-demo.8" };
  const snapshot = { repository: target.repository, number: target.pullRequestNumber, title: "docs", state: "OPEN", isDraft: false, baseRefName: "main", baseOid: target.baseSha, headRefName: "docs", headOid: target.headSha, changedFiles: 1, files: [{ path: "docs/guide.md", additions: 2, deletions: 0 }], commits: [{ oid: target.headSha }], checks: [{ kind: "check-run", name: "ci", status: "COMPLETED", conclusion: "SUCCESS" }], reviews: [{ authorLogin: "reviewer", state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha }] };
  const receipt = { schemaVersion: "proofrail.verification-receipt.v1", id: "receipt:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", type: "COMMAND_EXECUTION", producer: { id: "runner.proofrail-verification", version: "1.0.0" }, target, command: { name: "diff-check", run: "git diff --check", orderingKey: "001" }, environment: {}, executionBoundaryId: "execution.github-actions-market-v1", timing: {}, result: { status: "PASS", exitCode: 0, stdoutDigest: `sha256:${"A".repeat(64)}`, stderrDigest: `sha256:${"B".repeat(64)}` }, dependencyLockfile: {}, redaction: {}, lineage: { trustedConfigurationSha256: `sha256:${authority.identities.trustedConfigurationSha256}`, policySha256: `sha256:${authority.identities.policySha256}`, evidenceContractSha256: `sha256:${authority.identities.evidenceContractSha256}`, marketConfigSha256: `sha256:${parsed.identity.marketConfigSha256}` } };
  return { authority, parsed, snapshot, receipt, target };
}

test("exact target, policy observations and PASS receipt produce ADMISSIBLE", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const bundle = evaluateMarketCandidate(authority, parsed, snapshot, [receipt], { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true });
  assert.equal(bundle.verdict, "ADMISSIBLE");
  assert.equal(bundle.verificationReceipts.length, 1);
  assert(bundle.evidence.some(({ requirementId }) => requirementId === "req.verification.command.diff-check"));
});

test("denied scope is REJECTED and stale post-run head is BLOCKED", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const denied = { ...snapshot, files: [{ path: "src/runtime.js", additions: 1, deletions: 0 }] };
  assert.equal(evaluateMarketCandidate(authority, parsed, denied, [receipt], { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true }).verdict, "REJECTED");
  const stale = evaluateMarketCandidate(authority, parsed, snapshot, [receipt], { checkoutHeadSha: target.headSha, currentHeadSha: "3".repeat(40), baseConfigurationUsed: true });
  assert.equal(stale.verdict, "BLOCKED");
  assert(stale.reasonCodes.includes("PRF_STALE_TARGET"));
});

test("a changed head configuration is evaluated from base but never self-authorizes", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const changed = { ...snapshot, changedFiles: 2, files: [...snapshot.files, { path: ".proofrail/config.yml", additions: 1, deletions: 1 }] };
  const result = evaluateMarketCandidate(authority, parsed, changed, [receipt], { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true });
  assert.equal(result.verdict, "REJECTED");
  assert(result.reasonCodes.includes("PRF_UNTRUSTED_POLICY_CHANGE"));
});

test("missing approvals, changes requested, and reported check failure map to REVISION_REQUIRED", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const runtimeState = { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true };

  const missingApproval = evaluateMarketCandidate(authority, parsed, { ...snapshot, reviews: [] }, [receipt], runtimeState);
  assert.equal(missingApproval.verdict, "REVISION_REQUIRED");
  assert(missingApproval.reasonCodes.includes("PRF_MINIMUM_APPROVALS_MISSING"));
  assert(missingApproval.reasonCodes.includes("PRF_EXACT_HEAD_APPROVAL_MISSING"));

  const staleApproval = evaluateMarketCandidate(authority, parsed, {
    ...snapshot,
    reviews: [{ authorLogin: "reviewer", state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.baseSha }],
  }, [receipt], runtimeState);
  assert.equal(staleApproval.verdict, "REVISION_REQUIRED");
  assert(staleApproval.reasonCodes.includes("PRF_MINIMUM_APPROVALS_MISSING"));
  assert(staleApproval.reasonCodes.includes("PRF_EXACT_HEAD_APPROVAL_MISSING"));

  const changesRequested = evaluateMarketCandidate(authority, parsed, {
    ...snapshot,
    reviews: [{ authorLogin: "reviewer", state: "CHANGES_REQUESTED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha }],
  }, [receipt], runtimeState);
  assert.equal(changesRequested.verdict, "REVISION_REQUIRED");
  assert(changesRequested.reasonCodes.includes("PRF_CHANGES_REQUESTED_PRESENT"));

  const failedCheck = evaluateMarketCandidate(authority, parsed, {
    ...snapshot,
    checks: [{ kind: "check-run", name: "ci", status: "COMPLETED", conclusion: "FAILURE" }],
  }, [receipt], runtimeState);
  assert.equal(failedCheck.verdict, "REVISION_REQUIRED");
  assert(failedCheck.reasonCodes.includes("PRF_REPORTED_CHECK_FAILED"));
});

test("receipt FAIL requires revision while TIMEOUT and ERROR remain BLOCKED", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const runtimeState = { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true };

  for (const [status, verdict, reasonCode] of [
    ["FAIL", "REVISION_REQUIRED", "PRF_VERIFICATION_COMMAND_FAILED"],
    ["TIMEOUT", "BLOCKED", "PRF_EXECUTION_IMPOSSIBLE"],
    ["ERROR", "BLOCKED", "PRF_EXECUTION_IMPOSSIBLE"],
  ]) {
    const candidateReceipt = structuredClone(receipt);
    candidateReceipt.result.status = status;
    candidateReceipt.result.exitCode = status === "FAIL" ? 1 : null;
    const result = evaluateMarketCandidate(authority, parsed, snapshot, [candidateReceipt], runtimeState);
    assert.equal(result.verdict, verdict);
    assert(result.reasonCodes.includes(reasonCode));
  }
});

test("duplicate receipt identities fail closed before a Verdict is emitted", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const duplicate = structuredClone(receipt);
  assert.throws(
    () => evaluateMarketCandidate(authority, parsed, snapshot, [receipt, duplicate], { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true }),
    /duplicate identities|DUPLICATE_IDENTITY/
  );
});
