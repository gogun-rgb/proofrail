import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadTrustedMarketConfiguration, parseMarketConfiguration } from "../../packages/trusted-config/src/index.js";
import { buildMarketArtifactProjection, evaluateMarketCandidate } from "../../packages/release-orchestrator/src/index.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

async function fixture() {
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: "config/trusted/proofrail-market-prototype-v1.json", repositoryRoot: ROOT });
  const parsed = await parseMarketConfiguration({ source: "version: 1\npreset: docs-only\n", presetsDirectory: path.join(ROOT, "config/presets"), repositoryRoot: ROOT, validatedAuthority: authority });
  const target = { repository: "proofrail/demo", pullRequestNumber: 8, baseSha: "1".repeat(40), headSha: "2".repeat(40), targetScopeId: "scope.github-pr.proofrail-demo.8" };
  const snapshot = { repository: target.repository, number: target.pullRequestNumber, title: "docs", state: "OPEN", isDraft: false, baseRefName: "main", baseOid: target.baseSha, headRefName: "docs", headOid: target.headSha, changedFiles: 1, files: [{ path: "docs/guide.md", additions: 2, deletions: 0 }], commits: [{ oid: target.headSha }], checks: [{ kind: "check-run", name: "ci", status: "COMPLETED", conclusion: "SUCCESS" }], reviews: [{ authorLogin: "reviewer", authorCanPushToRepository: true, state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha }] };
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
    reviews: [{ authorLogin: "reviewer", authorCanPushToRepository: true, state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.baseSha }],
  }, [receipt], runtimeState);
  assert.equal(staleApproval.verdict, "REVISION_REQUIRED");
  assert(staleApproval.reasonCodes.includes("PRF_MINIMUM_APPROVALS_MISSING"));
  assert(staleApproval.reasonCodes.includes("PRF_EXACT_HEAD_APPROVAL_MISSING"));

  const changesRequested = evaluateMarketCandidate(authority, parsed, {
    ...snapshot,
    reviews: [{ authorLogin: "reviewer", authorCanPushToRepository: true, state: "CHANGES_REQUESTED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha }],
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

test("one reviewer cannot satisfy two approvals while two latest exact-head reviewers can", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const runtimeState = { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true };
  const twoApprovals = Object.freeze({
    ...parsed,
    marketConfiguration: {
      ...parsed.marketConfiguration,
      reviews: { ...parsed.marketConfiguration.reviews, minimumApprovals: 2 },
    },
  });

  const duplicateReviewer = evaluateMarketCandidate(authority, twoApprovals, {
    ...snapshot,
    reviews: [
      { authorLogin: "Reviewer", authorCanPushToRepository: true, state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha },
      { authorLogin: "reviewer", authorCanPushToRepository: true, state: "APPROVED", submittedAt: "2026-07-16T00:00:00Z", commitOid: target.headSha },
    ],
  }, [receipt], runtimeState);
  assert(duplicateReviewer.reasonCodes.includes("PRF_MINIMUM_APPROVALS_MISSING"));

  const distinctReviewers = evaluateMarketCandidate(authority, twoApprovals, {
    ...snapshot,
    reviews: [
      { authorLogin: "reviewer-one", authorCanPushToRepository: true, state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha },
      { authorLogin: "reviewer-two", authorCanPushToRepository: true, state: "APPROVED", submittedAt: "2026-07-16T00:00:00Z", commitOid: target.headSha },
    ],
  }, [receipt], runtimeState);
  assert(!distinctReviewers.reasonCodes.includes("PRF_MINIMUM_APPROVALS_MISSING"));
});

test("a latest non-approval supersedes an earlier exact-head approval", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const runtimeState = { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true };

  for (const state of ["CHANGES_REQUESTED", "DISMISSED", "COMMENTED"]) {
    const result = evaluateMarketCandidate(authority, parsed, {
      ...snapshot,
      reviews: [
        { authorLogin: "reviewer", authorCanPushToRepository: true, state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha },
        { authorLogin: "reviewer", authorCanPushToRepository: true, state, submittedAt: "2026-07-16T00:00:00Z", commitOid: target.headSha },
      ],
    }, [receipt], runtimeState);
    assert(result.reasonCodes.includes("PRF_MINIMUM_APPROVALS_MISSING"));
    assert(result.reasonCodes.includes("PRF_EXACT_HEAD_APPROVAL_MISSING"));
  }
});

test("unidentified reviewers cannot supply market approvals", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const runtimeState = { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true };

  for (const authorLogin of [null, "(unknown-reviewer)"]) {
    const result = evaluateMarketCandidate(authority, parsed, {
      ...snapshot,
      reviews: [{ authorLogin, authorCanPushToRepository: true, state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha }],
    }, [receipt], runtimeState);
    assert(result.reasonCodes.includes("PRF_MINIMUM_APPROVALS_MISSING"));
    assert(result.reasonCodes.includes("PRF_EXACT_HEAD_APPROVAL_MISSING"));
  }
});

test("market review eligibility is required and excludes outsiders from every latest-state fact", async () => {
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const runtimeState = { checkoutHeadSha: target.headSha, currentHeadSha: target.headSha, baseConfigurationUsed: true };
  const missingEligibility = {
    ...snapshot,
    reviews: [{ authorLogin: "reviewer", state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha }],
  };
  assert.throws(
    () => evaluateMarketCandidate(authority, parsed, missingEligibility, [receipt], runtimeState),
    /SNAPSHOT_INVALID/
  );

  const outsiderOnly = {
    ...snapshot,
    reviews: [
      { authorLogin: "outsider", authorCanPushToRepository: false, state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha },
      { authorLogin: "outsider", authorCanPushToRepository: false, state: "CHANGES_REQUESTED", submittedAt: "2026-07-16T00:00:00Z", commitOid: target.headSha },
    ],
  };
  const result = evaluateMarketCandidate(authority, parsed, outsiderOnly, [receipt], runtimeState);
  assert(result.reasonCodes.includes("PRF_MINIMUM_APPROVALS_MISSING"));
  assert(result.reasonCodes.includes("PRF_EXACT_HEAD_APPROVAL_MISSING"));
  assert(!result.reasonCodes.includes("PRF_CHANGES_REQUESTED_PRESENT"));

  const duplicateOpinion = { authorLogin: "reviewer", state: "APPROVED", submittedAt: "2026-07-15T00:00:00Z", commitOid: target.headSha };
  const forward = { ...snapshot, reviews: [{ ...duplicateOpinion, authorCanPushToRepository: false }, { ...duplicateOpinion, authorCanPushToRepository: true }] };
  const reverse = { ...snapshot, reviews: [...forward.reviews].reverse() };
  const forwardBundle = evaluateMarketCandidate(authority, parsed, forward, [receipt], runtimeState);
  const reverseBundle = evaluateMarketCandidate(authority, parsed, reverse, [receipt], runtimeState);
  assert.deepEqual(
    buildMarketArtifactProjection(parsed, forward, forwardBundle).reviews,
    buildMarketArtifactProjection(parsed, reverse, reverseBundle).reviews,
  );
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

test("market artifact projection is an ordered immutable post-kernel view", async () => {
  // Given: a kernel decision over an exact, clean market snapshot.
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const kernelBundle = evaluateMarketCandidate(authority, parsed, snapshot, [receipt], {
    checkoutHeadSha: target.headSha,
    currentHeadSha: target.headSha,
    baseConfigurationUsed: true,
  });
  const originalReduction = structuredClone(kernelBundle.verdictReduction);

  // When: a post-kernel artifact projection is built.
  const projection = buildMarketArtifactProjection(parsed, snapshot, kernelBundle);

  // Then: it is stable, derived, and cannot mutate the kernel decision.
  assert.deepEqual(Object.keys(projection), ["facts", "scope", "reviews", "reportedChecks", "reviewNeeds"]);
  assert.deepEqual(Object.keys(projection.facts), [...Object.keys(projection.facts)].sort());
  assert.deepEqual(projection.scope, {
    allowedPatterns: ["**/*.md", "CHANGELOG.md", "README.md", "docs/**"],
    deniedPatterns: ["**/*.key", "**/*.pem", ".github/**", "config/**", "packages/**", "src/**"],
    changedPaths: ["docs/guide.md"],
    outsideDeclaredScope: [],
  });
  assert.deepEqual(projection.reviews, [{
    authorLogin: "reviewer",
    authorCanPushToRepository: true,
    state: "APPROVED",
    submittedAt: "2026-07-15T00:00:00Z",
    commitOid: target.headSha,
  }]);
  assert.deepEqual(projection.reportedChecks, [{
    kind: "check-run",
    name: "ci",
    status: "COMPLETED",
    conclusion: "SUCCESS",
  }]);
  assert.deepEqual(projection.reviewNeeds, []);
  assert(Object.isFrozen(projection));
  assert(Object.isFrozen(projection.facts));
  assert(Object.isFrozen(projection.scope));
  assert(Object.isFrozen(projection.scope.changedPaths));
  assert(Object.isFrozen(projection.reviews));
  assert(Object.isFrozen(projection.reviews[0]));
  assert.throws(() => { projection.facts["target.repository"] = "changed"; }, /read only|object is not extensible/);
  assert.equal(kernelBundle.verdict, "ADMISSIBLE");
  assert.deepEqual(kernelBundle.verdictReduction, originalReduction);
});

test("market artifact projection names only kernel-backed review and check gaps", async () => {
  // Given: a same-scope snapshot with missing approvals and an unsuccessful reported check.
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const gapSnapshot = {
    ...snapshot,
    checks: [
      { kind: "check-run", name: "build", status: "COMPLETED", conclusion: "SUCCESS" },
      { kind: "check-run", name: "ci", status: "COMPLETED", conclusion: "FAILURE" },
    ],
    reviews: [],
  };
  const kernelBundle = evaluateMarketCandidate(authority, parsed, gapSnapshot, [receipt], {
    checkoutHeadSha: target.headSha,
    currentHeadSha: target.headSha,
    baseConfigurationUsed: true,
  });

  // When: the non-admissible result is projected after evaluation.
  const projection = buildMarketArtifactProjection(parsed, gapSnapshot, kernelBundle);

  // Then: exact counts and states are explained only when the kernel retained their reason codes.
  assert.equal(kernelBundle.verdict, "REVISION_REQUIRED");
  assert.deepEqual(projection.reportedChecks, [
    {
      kind: "check-run",
      name: "build",
      status: "COMPLETED",
      conclusion: "SUCCESS",
    },
    {
      kind: "check-run",
      name: "ci",
      status: "COMPLETED",
      conclusion: "FAILURE",
    },
  ]);
  assert.deepEqual(projection.reviewNeeds, [
    "PRF_EXACT_HEAD_APPROVAL_MISSING: no latest approval is recorded for the exact pull request head.",
    "PRF_MINIMUM_APPROVALS_MISSING: 0 of 1 distinct latest exact-head approvals are present.",
    "PRF_REPORTED_CHECK_FAILED: one or more reported checks are not successful; inspect the structured reported checks.",
  ]);
});

test("market artifact projection treats denied paths as outside the declared scope", async () => {
  // Given: a Markdown path matched by an allowed glob and a more specific denied glob.
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const deniedSnapshot = {
    ...snapshot,
    files: [{ path: "packages/readme.md", additions: 1, deletions: 0 }],
  };
  const kernelBundle = evaluateMarketCandidate(authority, parsed, deniedSnapshot, [receipt], {
    checkoutHeadSha: target.headSha,
    currentHeadSha: target.headSha,
    baseConfigurationUsed: true,
  });

  // When: the rejected result is projected for delivery.
  const projection = buildMarketArtifactProjection(parsed, deniedSnapshot, kernelBundle);

  // Then: the scope projection exposes the denied path instead of presenting it as in scope.
  assert.equal(kernelBundle.verdict, "REJECTED");
  assert(kernelBundle.reasonCodes.includes("PRF_SCOPE_PATH_NOT_ALLOWED"));
  assert.deepEqual(projection.scope.changedPaths, ["packages/readme.md"]);
  assert.deepEqual(projection.scope.outsideDeclaredScope, ["packages/readme.md"]);
  assert.deepEqual(projection.reviewNeeds, [
    "PRF_SCOPE_PATH_NOT_ALLOWED: changed path requires scope review: packages/readme.md.",
  ]);
});

test("market artifact projection rejects a kernel result for a different target", async () => {
  // Given: an immutable kernel result and a distinct normalized snapshot.
  const { authority, parsed, snapshot, receipt, target } = await fixture();
  const kernelBundle = evaluateMarketCandidate(authority, parsed, snapshot, [receipt], {
    checkoutHeadSha: target.headSha,
    currentHeadSha: target.headSha,
    baseConfigurationUsed: true,
  });
  const otherSnapshot = {
    ...snapshot,
    number: 9,
  };

  // When / Then: a post-kernel projection cannot combine them into one artifact.
  assert.throws(
    () => buildMarketArtifactProjection(parsed, otherSnapshot, kernelBundle),
    /SNAPSHOT_INVALID/
  );
});
