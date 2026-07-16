import { evaluateKernel } from "@proofrail/kernel";
export {
  MARKET_LIFECYCLE_PHASES,
  MarketLifecycleTransitionError,
  applyMarketEvaluationEvent,
  beginMarketEvaluation,
  reevaluateMarketEvaluation,
  startMarketEvaluation,
  transitionMarketEvaluation,
} from "@proofrail/kernel";
import {
  assertValidatedReleaseConfiguration,
  loadTrustedMarketConfiguration,
  loadTrustedReleaseConfiguration,
} from "@proofrail/trusted-config";
export { ReleaseOrchestratorError } from "./errors.js";
export { assembleMarketKernelInput, evaluateMarketCandidate } from "./market-orchestrator.js";
import { fail } from "./errors.js";
import { compare, deepFreeze, exactObject, isSuccessfulCheck, matchesScope, normalizeSnapshot } from "./snapshot.js";

export async function loadMarketConfiguration(options) {
  return loadTrustedMarketConfiguration(options);
}

export async function loadReleaseConfiguration(options) {
  return loadTrustedReleaseConfiguration(options);
}

export function assembleReleaseKernelInput(validatedConfiguration, suppliedSnapshot) {
  const validated = assertValidatedReleaseConfiguration(validatedConfiguration);
  const snapshot = normalizeSnapshot(suppliedSnapshot);
  const { trustedConfiguration, policy, evidenceContract } = validated;
  enforceTarget(trustedConfiguration, snapshot);

  const observedFacts = new Map([
    ["target.repository", snapshot.repository],
    ["target.pullRequestNumber", snapshot.number],
    ["target.baseSha", snapshot.baseOid],
    ["target.headSha", snapshot.headOid],
    ["target.state", snapshot.state],
    ["target.isDraft", snapshot.isDraft],
    ["collection.changedFilesComplete", snapshot.changedFiles === snapshot.files.length],
    ["scope.changedPathsWithinDeclaredWriteScope", snapshot.files.every(({ path }) =>
      trustedConfiguration.declaredWriteScope.some((pattern) => matchesScope(pattern, path)))],
    ["checks.minimumCountSatisfied", snapshot.checks.length >= policy.requiredCheckPolicy.minimumReportedChecks],
    ["checks.allReportedSuccessful", snapshot.checks.length > 0
      && snapshot.checks.every((check) => isSuccessfulCheck(policy, check))],
  ]);

  const observationEntries = [...observedFacts.entries()].sort(([left], [right]) => compare(left, right));
  const observations = observationEntries.map(([factKey, factValue], index) => ({
    id: `obs.github.${factKey.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}`,
    observer: {
      id: trustedConfiguration.observer.id,
      version: trustedConfiguration.observer.version,
    },
    targetScopeId: trustedConfiguration.target.targetScopeId,
    factKey,
    factValue,
    sourceInputId: stableIdentity(trustedConfiguration.observer.sourceInputId),
    orderingKey: String(index + 1).padStart(3, "0"),
    limitations: [],
  }));

  return deepFreeze({
    schemaVersion: trustedConfiguration.kernel.inputSchemaVersion,
    evaluation: {
      id: `eval.release.${trustedConfiguration.id}.${trustedConfiguration.target.headSha}`,
    },
    claims: [{ ...trustedConfiguration.claim }],
    evidenceContracts: [{
      id: evidenceContract.id,
      version: evidenceContract.version,
      targetScopeId: evidenceContract.targetScopeId,
      selectionProvenance: { ...evidenceContract.selectionProvenance },
      requirementIds: evidenceContract.requirements.map(({ id }) => id).sort(compare),
    }],
    evidenceRequirements: evidenceContract.requirements.map((requirement) => ({
      id: requirement.id,
      evidenceContractId: evidenceContract.id,
      targetScopeId: requirement.targetScopeId,
      requiredObserver: { ...requirement.requiredObserver },
      factKey: requirement.factKey,
      expectedValue: requirement.expectedValue,
    })),
    observations,
    rules: policy.rules.map((rule) => structuredClone(rule)),
  });
}

export function evaluateReleaseCandidate(validatedConfiguration, snapshot) {
  const input = assembleReleaseKernelInput(validatedConfiguration, snapshot);
  return evaluateKernel(input);
}

function enforceTarget(configuration, snapshot) {
  if (snapshot.repository !== configuration.target.repository
      || snapshot.number !== configuration.target.pullRequestNumber
      || snapshot.baseRefName !== configuration.target.baseRefName
      || snapshot.baseOid !== configuration.target.baseSha
      || snapshot.headOid !== configuration.target.headSha) {
    fail("TARGET_MISMATCH");
  }
  if (!snapshot.commits.some(({ oid }) => oid === snapshot.headOid)) fail("TARGET_MISMATCH");
}

function stableIdentity(value) {
  return [...value].map((character) => /[A-Za-z0-9._-]/.test(character)
    ? character
    : `-${character.codePointAt(0).toString(16).toUpperCase()}-`).join("");
}
