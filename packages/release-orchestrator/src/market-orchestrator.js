import { evaluateMarketKernel } from "@proofrail/kernel";
import { assertValidatedMarketConfiguration } from "@proofrail/trusted-config";
import { fail } from "./errors.js";
import { compare, deepFreeze, exactObject, isSuccessfulCheck, normalizeSnapshot } from "./snapshot.js";

export function assembleMarketKernelInput(validatedConfiguration, parsedConfiguration, suppliedSnapshot, verificationReceipts, runtimeState) {
  const validated = assertValidatedMarketConfiguration(validatedConfiguration);
  if (!parsedConfiguration || typeof parsedConfiguration !== "object" || !Object.isFrozen(parsedConfiguration) || !parsedConfiguration.marketConfiguration || !parsedConfiguration.identity) fail("MARKET_CONFIG_INVALID");
  if (!Array.isArray(verificationReceipts)) fail("RECEIPTS_INVALID");
  exactObject(runtimeState, ["checkoutHeadSha", "currentHeadSha", "baseConfigurationUsed"]);
  if (!/^[0-9a-f]{40}$/i.test(runtimeState.checkoutHeadSha) || !/^[0-9a-f]{40}$/i.test(runtimeState.currentHeadSha) || typeof runtimeState.baseConfigurationUsed !== "boolean") fail("RUNTIME_STATE_INVALID");
  const snapshot = normalizeSnapshot(suppliedSnapshot, { requireReviewEligibility: true });
  const { trustedConfiguration, policy, evidenceContract, identities } = validated;
  const config = parsedConfiguration.marketConfiguration;
  const target = { repository: snapshot.repository, pullRequestNumber: snapshot.number, baseSha: snapshot.baseOid, headSha: snapshot.headOid, targetScopeId: `scope.github-pr.${snapshot.repository.replace("/", "-")}.${snapshot.number}` };
  const latestReviewStates = latestReviews(snapshot.reviews, true);
  const exactApprovals = latestReviewStates.filter((review) => review.state.toUpperCase() === "APPROVED" && review.commitOid?.toLowerCase() === snapshot.headOid).length;
  const hasChangesRequested = latestReviewStates.some((review) => review.state.toUpperCase() === "CHANGES_REQUESTED");
  const changedPathsAllowed = snapshot.files.every(({ path: changedPath }) => config.scope.allowed.some((pattern) => matchesGlob(pattern, changedPath)));
  const deniedPathsAbsent = snapshot.files.every(({ path: changedPath }) => !config.scope.denied.some((pattern) => matchesGlob(pattern, changedPath)));
  const facts = new Map([
    ["target.repository", target.repository],
    ["target.pullRequestNumber", target.pullRequestNumber],
    ["target.baseSha", target.baseSha],
    ["target.headSha", target.headSha],
    ["checkout.headMatchesTarget", runtimeState.checkoutHeadSha.toLowerCase() === target.headSha],
    ["target.headStillCurrent", runtimeState.currentHeadSha.toLowerCase() === target.headSha],
    ["configuration.baseVersionUsed", runtimeState.baseConfigurationUsed && !snapshot.files.some(({ path: changedPath }) => changedPath === trustedConfiguration.marketConfig.path)],
    ["scope.changedPathsWithinAllowedScope", changedPathsAllowed],
    ["scope.deniedPathsAbsent", deniedPathsAbsent],
    ["reviews.minimumApprovalsSatisfied", exactApprovals >= config.reviews.minimumApprovals],
    ["reviews.exactHeadApprovalPresent", !config.reviews.requireExactHeadApproval || exactApprovals > 0],
    ["reviews.changesRequestedAbsent", !config.reviews.blockChangesRequested || !hasChangesRequested],
    ["checks.minimumCountSatisfied", snapshot.checks.length >= config.reportedChecks.minimumCount],
    ["checks.allReportedSuccessful", !config.reportedChecks.requireSuccess || (snapshot.checks.length > 0 && snapshot.checks.every((check) => isSuccessfulCheck(policy, check)))],
    ["collection.changedFilesComplete", snapshot.changedFiles === snapshot.files.length],
  ]);
  const requirements = evidenceContract.requirements.map((requirement) => structuredClone(requirement));
  const template = evidenceContract.requirementTemplates[0];
  for (const command of config.verification.commands) requirements.push({ id: `${template.idPrefix}.${command.name}`, inputKind: template.inputKind, requiredProducer: { ...template.requiredProducer }, commandName: command.name, expectedReceiptStatus: template.expectedReceiptStatus });
  const observations = [...facts.entries()].sort(([left], [right]) => compare(left, right)).map(([factKey, factValue], index) => ({ id: `observation:market-${String(index + 1).padStart(3, "0")}`, producer: { ...trustedConfiguration.observer }, targetScopeId: target.targetScopeId, factKey, factValue, sourceInputId: `github:${snapshot.repository}#${snapshot.number}@${snapshot.headOid}`, orderingKey: String(index + 1).padStart(3, "0"), limitations: [] }));
  return deepFreeze({
    schemaVersion: trustedConfiguration.kernel.inputSchemaVersion,
    evaluation: { id: `evaluation:market-${snapshot.repository.replace("/", "-")}-${snapshot.number}-${snapshot.headOid}` },
    target,
    authority: {
      trustedConfiguration: { id: trustedConfiguration.id, version: trustedConfiguration.version, sha256: `sha256:${identities.trustedConfigurationSha256}` },
      policy: { id: policy.id, version: policy.version, sha256: `sha256:${identities.policySha256}` },
      evidenceContract: { id: evidenceContract.id, version: evidenceContract.version, sha256: `sha256:${identities.evidenceContractSha256}` },
      marketConfigSha256: `sha256:${parsedConfiguration.identity.marketConfigSha256}`,
    },
    claims: [{ id: "claim:market-requirements-satisfied", targetScopeId: target.targetScopeId, statement: "The exact pull request target satisfies all applicable configured evidence requirements." }],
    evidenceContract: { id: evidenceContract.id, version: evidenceContract.version, selectionProvenance: { ...evidenceContract.selectionProvenance }, requirementIds: requirements.map(({ id }) => id).sort(compare) },
    evidenceRequirements: requirements,
    observations,
    verificationReceipts: verificationReceipts.map((receipt) => structuredClone(receipt)),
    rules: policy.rules.map((rule) => structuredClone(rule)),
  });
}

export function evaluateMarketCandidate(validatedConfiguration, parsedConfiguration, snapshot, verificationReceipts, runtimeState) {
  return evaluateMarketKernel(assembleMarketKernelInput(validatedConfiguration, parsedConfiguration, snapshot, verificationReceipts, runtimeState));
}

export function buildMarketArtifactProjection(parsedConfiguration, suppliedSnapshot, kernelBundle) {
  if (!parsedConfiguration || typeof parsedConfiguration !== "object" || !Object.isFrozen(parsedConfiguration) || !parsedConfiguration.marketConfiguration) fail("MARKET_CONFIG_INVALID");
  if (!kernelBundle || typeof kernelBundle !== "object" || !Object.isFrozen(kernelBundle) || !Array.isArray(kernelBundle.observations) || !Array.isArray(kernelBundle.reasonCodes)) fail("SNAPSHOT_INVALID");
  const snapshot = normalizeSnapshot(suppliedSnapshot, { requireReviewEligibility: true });
  assertProjectionTarget(kernelBundle.target, snapshot);
  const config = parsedConfiguration.marketConfiguration;
  const facts = factsFromObservations(kernelBundle.observations);
  const allowedPatterns = [...config.scope.allowed].sort(compare);
  const deniedPatterns = [...config.scope.denied].sort(compare);
  const changedPaths = snapshot.files.map(({ path: changedPath }) => changedPath);
  const outsideDeclaredScope = changedPaths.filter((changedPath) =>
    !allowedPatterns.some((pattern) => matchesGlob(pattern, changedPath))
    || deniedPatterns.some((pattern) => matchesGlob(pattern, changedPath)));
  const reportedChecks = snapshot.checks.map((check) => ({
    kind: check.kind,
    name: check.name,
    status: check.status,
    conclusion: check.conclusion,
  }));
  return deepFreeze({
    facts,
    scope: { allowedPatterns, deniedPatterns, changedPaths, outsideDeclaredScope },
    reviews: normalizeStableReviews(snapshot.reviews),
    reportedChecks,
    reviewNeeds: deriveReviewNeeds(config, snapshot, kernelBundle),
  });
}

function assertProjectionTarget(target, snapshot) {
  if (!target || typeof target !== "object"
      || target.repository !== snapshot.repository
      || target.pullRequestNumber !== snapshot.number
      || target.baseSha !== snapshot.baseOid
      || target.headSha !== snapshot.headOid) fail("SNAPSHOT_INVALID");
}

function factsFromObservations(observations) {
  const entries = observations.map(({ factKey, factValue }) => {
    if (typeof factKey !== "string" || !isJsonPrimitive(factValue)) fail("SNAPSHOT_INVALID");
    return [factKey, factValue];
  }).sort(([left], [right]) => compare(left, right));
  if (entries.some(([factKey], index) => index > 0 && factKey === entries[index - 1][0])) fail("SNAPSHOT_INVALID");
  return Object.fromEntries(entries);
}

function deriveReviewNeeds(config, snapshot, kernelBundle) {
  if (kernelBundle.verdict === "ADMISSIBLE") return [];
  const reasonCodes = new Set(kernelBundle.reasonCodes);
  const latest = latestReviews(snapshot.reviews, true);
  const exactApprovals = latest.filter((review) => review.state === "APPROVED" && review.commitOid === snapshot.headOid).length;
  const needs = [];
  if (reasonCodes.has("PRF_MINIMUM_APPROVALS_MISSING")) {
    needs.push(`PRF_MINIMUM_APPROVALS_MISSING: ${exactApprovals} of ${config.reviews.minimumApprovals} distinct latest exact-head approvals are present.`);
  }
  if (reasonCodes.has("PRF_EXACT_HEAD_APPROVAL_MISSING")) {
    needs.push("PRF_EXACT_HEAD_APPROVAL_MISSING: no latest approval is recorded for the exact pull request head.");
  }
  if (reasonCodes.has("PRF_CHANGES_REQUESTED_PRESENT")) {
    for (const review of latest.filter((review) => review.state === "CHANGES_REQUESTED")) {
      needs.push(`PRF_CHANGES_REQUESTED_PRESENT: latest review by ${review.authorLogin} requests changes.`);
    }
  }
  if (reasonCodes.has("PRF_REPORTED_CHECK_FAILED")) {
    needs.push("PRF_REPORTED_CHECK_FAILED: one or more reported checks are not successful; inspect the structured reported checks.");
  }
  if (reasonCodes.has("PRF_SCOPE_PATH_NOT_ALLOWED")) {
    const scopePaths = snapshot.files.map(({ path: changedPath }) => changedPath).filter((changedPath) => !config.scope.allowed.some((pattern) => matchesGlob(pattern, changedPath)) || config.scope.denied.some((pattern) => matchesGlob(pattern, changedPath)));
    for (const changedPath of scopePaths) needs.push(`PRF_SCOPE_PATH_NOT_ALLOWED: changed path requires scope review: ${changedPath}.`);
  }
  const genericNeeds = new Map([
    ["PRF_STALE_TARGET", "PRF_STALE_TARGET: the evaluated target no longer matches the collected pull request head."],
    ["PRF_EXECUTION_IMPOSSIBLE", "PRF_EXECUTION_IMPOSSIBLE: required verification could not complete within the authorized execution boundary."],
    ["PRF_UNTRUSTED_POLICY_CHANGE", "PRF_UNTRUSTED_POLICY_CHANGE: the candidate changes the configuration selected from the trusted base."],
    ["PRF_VERIFICATION_COMMAND_FAILED", "PRF_VERIFICATION_COMMAND_FAILED: at least one required verification receipt reported FAIL."],
    ["PRF_REQUIRED_EVIDENCE_MISSING", "PRF_REQUIRED_EVIDENCE_MISSING: one or more required observations or verification receipts are absent."],
  ]);
  for (const [reasonCode, reviewNeed] of genericNeeds) if (reasonCodes.has(reasonCode)) needs.push(reviewNeed);
  return [...new Set(needs)].sort(compare);
}

function matchesGlob(pattern, changedPath) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(?:.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]");
  return new RegExp(`^${escaped}$`).test(changedPath.replace(/\\/g, "/"));
}

function latestReviews(reviews, eligibleOnly = false) {
  const latest = new Map();
  for (const review of normalizeStableReviews(reviews).filter((review) => review.authorLogin !== null
    && (!eligibleOnly || review.authorCanPushToRepository === true))) {
    const identity = review.authorLogin;
    const previous = latest.get(identity);
    if (!previous || compare(previous.submittedAt ?? "", review.submittedAt ?? "") <= 0) {
      latest.set(identity, review);
    }
  }
  return [...latest.values()];
}

function normalizeStableReviews(reviews) {
  return reviews.map((review) => ({
    authorLogin: reviewerIdentity(review.authorLogin),
    authorCanPushToRepository: review.authorCanPushToRepository,
    state: review.state.toUpperCase(),
    submittedAt: review.submittedAt ?? null,
    commitOid: review.commitOid?.toLowerCase() ?? null,
  })).sort((left, right) => compare(left.authorLogin ?? "", right.authorLogin ?? "")
    || compare(left.submittedAt ?? "", right.submittedAt ?? "")
    || compare(left.state, right.state)
    || compare(left.commitOid ?? "", right.commitOid ?? "")
    || Number(left.authorCanPushToRepository) - Number(right.authorCanPushToRepository));
}

function reviewerIdentity(authorLogin) {
  if (typeof authorLogin !== "string") return null;
  const identity = authorLogin.trim().toLowerCase();
  return identity === "" || identity === "(unknown-reviewer)" ? null : identity;
}

function isJsonPrimitive(value) {
  return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}
