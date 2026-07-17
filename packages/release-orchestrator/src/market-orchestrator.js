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
  const snapshot = normalizeSnapshot(suppliedSnapshot);
  const { trustedConfiguration, policy, evidenceContract, identities } = validated;
  const config = parsedConfiguration.marketConfiguration;
  const target = { repository: snapshot.repository, pullRequestNumber: snapshot.number, baseSha: snapshot.baseOid, headSha: snapshot.headOid, targetScopeId: `scope.github-pr.${snapshot.repository.replace("/", "-")}.${snapshot.number}` };
  const exactApprovals = snapshot.reviews.filter((review) => review.state.toUpperCase() === "APPROVED" && review.commitOid?.toLowerCase() === snapshot.headOid).length;
  const hasChangesRequested = snapshot.reviews.some((review) => review.state.toUpperCase() === "CHANGES_REQUESTED");
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

function matchesGlob(pattern, changedPath) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "(?:.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]");
  return new RegExp(`^${escaped}$`).test(changedPath.replace(/\\/g, "/"));
}
