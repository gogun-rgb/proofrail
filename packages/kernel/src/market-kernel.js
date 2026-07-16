// @ts-check

import { MARKET_KERNEL_BUNDLE_SCHEMA_VERSION, MARKET_KERNEL_ENGINE_VERSION, MARKET_KERNEL_INPUT_SCHEMA_VERSION, MARKET_POLICY_CONDITIONS } from "@proofrail/contracts";
import { canonicalJson, canonicalizeJson, derivedIdentity, sha256Digest } from "./canonical-json.js";
import { deepFreeze } from "./deep-freeze.js";
import { reduceVerdictCandidates } from "./verdict-reduction.js";

/** @typedef {import("@proofrail/contracts").MarketKernelInput} MarketKernelInput */
/** @typedef {import("@proofrail/contracts").MarketEvidenceRequirement} MarketEvidenceRequirement */
/** @typedef {import("@proofrail/contracts").MarketEvidence} MarketEvidence */
/** @typedef {import("@proofrail/contracts").MarketEvidenceLineage} MarketEvidenceLineage */
/** @typedef {import("@proofrail/contracts").MarketPolicyCondition} MarketPolicyCondition */
/** @typedef {import("@proofrail/contracts").VerdictCandidate} VerdictCandidate */

const OBSERVATION_CONDITIONS = new Map([
  ["checkout.headMatchesTarget", "STALE_TARGET"],
  ["target.headStillCurrent", "STALE_TARGET"],
  ["scope.changedPathsWithinAllowedScope", "SCOPE_PATH_DENIED"],
  ["scope.deniedPathsAbsent", "SCOPE_PATH_DENIED"],
  ["configuration.baseVersionUsed", "UNTRUSTED_POLICY_CHANGE"],
  ["reviews.exactHeadApprovalPresent", "EXACT_HEAD_APPROVAL_MISSING"],
  ["reviews.minimumApprovalsSatisfied", "MINIMUM_APPROVALS_MISSING"],
  ["reviews.changesRequestedAbsent", "CHANGES_REQUESTED_PRESENT"],
  ["checks.minimumCountSatisfied", "REPORTED_CHECK_FAILED"],
  ["checks.allReportedSuccessful", "REPORTED_CHECK_FAILED"],
]);
const DIGEST_PATTERN = /^sha256:[0-9A-F]{64}$/;

export class MarketKernelBoundaryError extends Error {
  /** @param {string} message */
  constructor(message) { super(message); this.name = "MarketKernelBoundaryError"; }
}

/** @param {unknown} input @returns {import("@proofrail/contracts").MarketEvidenceBundle} */
export function evaluateMarketKernel(input) {
  const normalized = normalizeMarketInput(input);
  const evaluation = evaluateRequirements(normalized);
  const ruleStates = evaluation.conditions.map((condition) => candidateForCondition(normalized, condition));
  const candidates = ruleStates.map(({ candidate }) => candidate);
  const verdictReduction = reduceVerdictCandidates(candidates.length === 0 ? [admissibleCandidate(normalized.evaluation.id)] : candidates);
  const reductionLineage = lineage("VERDICT_REDUCED", { evaluationId: normalized.evaluation.id, verdict: verdictReduction.verdict, candidateIds: verdictReduction.candidateIds, reasonCodes: verdictReduction.reasonCodes });
  const evidenceLineage = [...evaluation.lineage, ...ruleStates.map(({ entry }) => entry), reductionLineage].sort(compareById);
  const componentDigests = componentDigestMap(normalized, evaluation.evidence, evidenceLineage, verdictReduction);
  const withoutArtifactDigest = {
    schemaVersion: MARKET_KERNEL_BUNDLE_SCHEMA_VERSION,
    kernelEngineVersion: MARKET_KERNEL_ENGINE_VERSION,
    evaluationId: normalized.evaluation.id,
    target: normalized.target,
    authority: normalized.authority,
    claims: normalized.claims,
    evidenceContract: normalized.evidenceContract,
    evidenceRequirements: normalized.evidenceRequirements,
    observations: normalized.observations,
    verificationReceipts: normalized.verificationReceipts,
    evidence: evaluation.evidence,
    evidenceLineage,
    rules: normalized.rules,
    policyConditions: evaluation.conditions,
    verdict: verdictReduction.verdict,
    reasonCodes: verdictReduction.reasonCodes,
    verdictReduction,
    componentDigests,
  };
  return deepFreeze({ ...withoutArtifactDigest, artifactDigest: digest(withoutArtifactDigest) });
}

/** @param {unknown} input @returns {MarketKernelInput} */
function normalizeMarketInput(input) {
  const value = canonicalizeJson(input);
  if (!isRecord(value) || value.schemaVersion !== MARKET_KERNEL_INPUT_SCHEMA_VERSION) throw new MarketKernelBoundaryError(`schemaVersion must equal ${MARKET_KERNEL_INPUT_SCHEMA_VERSION}`);
  for (const key of ["claims", "evidenceRequirements", "observations", "verificationReceipts", "rules"]) if (!Array.isArray(value[key])) throw new MarketKernelBoundaryError(`${key} must be an array`);
  const typed = /** @type {MarketKernelInput} */ (/** @type {unknown} */ (value));
  if (!typed.evaluation?.id || !typed.target?.targetScopeId || typed.evidenceContract?.id !== typed.authority?.evidenceContract?.id || typed.evidenceContract?.version !== typed.authority?.evidenceContract?.version || !typed.authority?.marketConfigSha256) throw new MarketKernelBoundaryError("authority reference mismatch");
  if ([typed.authority.trustedConfiguration, typed.authority.policy, typed.authority.evidenceContract].some(({ id, version, sha256 }) => typeof id !== "string" || typeof version !== "string" || !DIGEST_PATTERN.test(sha256)) || !DIGEST_PATTERN.test(typed.authority.marketConfigSha256)) throw new MarketKernelBoundaryError("authority digest is invalid");
  const selection = typed.evidenceContract.selectionProvenance;
  if (!isRecord(selection)
      || selection.source !== "TRUSTED_CONFIGURATION"
      || selection.configurationId !== typed.authority.trustedConfiguration.id
      || selection.configurationVersion !== typed.authority.trustedConfiguration.version) {
    throw new MarketKernelBoundaryError("selection provenance is not bound to trusted configuration");
  }
  assertUniqueIds(typed.claims, "claims");
  assertUniqueIds(typed.evidenceRequirements, "evidenceRequirements");
  assertUniqueIds(typed.observations, "observations");
  assertUniqueIds(typed.verificationReceipts, "verificationReceipts");
  assertUniqueIds(typed.rules, "rules");
  if (typed.claims.some((claim) => claim.targetScopeId !== typed.target.targetScopeId)) throw new MarketKernelBoundaryError("claim target scope mismatch");
  const requiredIds = typed.evidenceRequirements.map(({ id }) => id).sort(compareStrings);
  if (canonicalJson(requiredIds) !== canonicalJson([...typed.evidenceContract.requirementIds].sort(compareStrings))) throw new MarketKernelBoundaryError("Evidence Contract requirementIds mismatch");
  const conditions = typed.rules.map(({ condition }) => condition);
  if (new Set(conditions).size !== conditions.length || conditions.some((condition) => !MARKET_POLICY_CONDITIONS.includes(condition))) throw new MarketKernelBoundaryError("invalid Policy conditions");
  return { ...typed, claims: [...typed.claims].sort(compareById), evidenceContract: { ...typed.evidenceContract, requirementIds: requiredIds }, evidenceRequirements: [...typed.evidenceRequirements].sort(compareById), observations: [...typed.observations].sort(compareObservation), verificationReceipts: [...typed.verificationReceipts].sort(compareReceipt), rules: [...typed.rules].sort(compareById) };
}

/** @param {MarketKernelInput} input */
function evaluateRequirements(input) {
  /** @type {MarketEvidence[]} */ const evidence = [];
  /** @type {MarketEvidenceLineage[]} */ const entries = [];
  /** @type {MarketPolicyCondition[]} */ const conditions = [];
  for (const requirement of input.evidenceRequirements) {
    const result = requirement.inputKind === "OBSERVATION" ? satisfyObservation(input, requirement) : satisfyReceipt(input, requirement);
    if (result.evidence === null) conditions.push(result.condition);
    else { evidence.push(result.evidence); entries.push(...result.lineage); }
  }
  return { evidence: evidence.sort(compareById), lineage: entries.sort(compareById), conditions: uniqueSorted(conditions) };
}

/** @param {MarketKernelInput} input @param {import("@proofrail/contracts").MarketObservationRequirement} requirement */
function satisfyObservation(input, requirement) {
  const candidates = input.observations.filter((observation) => sameProducer(observation.producer, requirement.requiredProducer) && observation.targetScopeId === input.target.targetScopeId && observation.factKey === requirement.factKey);
  const accepted = candidates.filter((observation) => observation.limitations.length === 0 && Object.is(observation.factValue, expectedValue(input, requirement.expectation)));
  if (accepted.length === 0) return missing(candidates.length === 0 || candidates.every(({ limitations }) => limitations.length > 0) ? "REQUIRED_EVIDENCE_MISSING" : observationCondition(requirement.factKey));
  return evidenceResult(input, requirement.id, "OBSERVATION", accepted.map(({ id }) => id).sort(compareStrings));
}

/** @param {MarketKernelInput} input @param {import("@proofrail/contracts").MarketReceiptRequirement} requirement */
function satisfyReceipt(input, requirement) {
  const named = input.verificationReceipts.filter((receipt) => receipt.command.name === requirement.commandName);
  const exact = named.filter((receipt) => sameProducer(receipt.producer, requirement.requiredProducer) && sameTarget(receipt.target, input.target) && sameLineage(receipt.lineage, input.authority));
  const passed = exact.filter((receipt) => receipt.result.status === requirement.expectedReceiptStatus);
  if (passed.length > 0) return evidenceResult(input, requirement.id, "VERIFICATION_RECEIPT", passed.map(({ id }) => id).sort(compareStrings));
  if (named.some((receipt) => !sameTarget(receipt.target, input.target))) return missing("STALE_TARGET");
  if (exact.some((receipt) => ["TIMEOUT", "ERROR"].includes(receipt.result.status))) return missing("EXECUTION_IMPOSSIBLE");
  if (exact.some((receipt) => receipt.result.status === "FAIL")) return missing("VERIFICATION_COMMAND_FAILED");
  return missing("REQUIRED_EVIDENCE_MISSING");
}

/** @param {MarketPolicyCondition} condition */
function missing(condition) { return { evidence: null, lineage: /** @type {MarketEvidenceLineage[]} */ ([]), condition }; }

/** @param {MarketKernelInput} input @param {string} requirementId @param {"OBSERVATION"|"VERIFICATION_RECEIPT"} sourceKind @param {string[]} acceptedIds */
function evidenceResult(input, requirementId, sourceKind, acceptedIds) {
  const accepted = lineage(sourceKind === "OBSERVATION" ? "OBSERVATION_ACCEPTED" : "VERIFICATION_RECEIPT_ACCEPTED", { requirementId, acceptedIds });
  const produced = lineage("EVIDENCE_PRODUCED", { requirementId, acceptedSourceIds: acceptedIds });
  return { evidence: { id: derivedIdentity("evidence", { evaluationId: input.evaluation.id, requirementId, sourceKind, acceptedIds }), evaluationId: input.evaluation.id, evidenceContractId: input.evidenceContract.id, requirementId, targetScopeId: input.target.targetScopeId, satisfaction: { kind: sourceKind }, acceptedObservationIds: sourceKind === "OBSERVATION" ? acceptedIds : [], acceptedReceiptIds: sourceKind === "VERIFICATION_RECEIPT" ? acceptedIds : [], lineageIds: [accepted.id, produced.id].sort(compareStrings) }, lineage: [accepted, produced], condition: null };
}

/** @param {MarketKernelInput} input @param {MarketPolicyCondition} condition */
function candidateForCondition(input, condition) {
  const rule = input.rules.find((item) => item.condition === condition);
  if (rule === undefined) throw new MarketKernelBoundaryError(`Policy has no Rule for condition ${condition}`);
  const entry = lineage("POLICY_RULE_EVALUATED", { ruleId: rule.id, condition, verdict: rule.verdict, reasonCode: rule.reasonCode });
  return { candidate: /** @type {VerdictCandidate} */ ({ id: derivedIdentity("verdict-candidate", { ruleId: rule.id, condition, verdict: rule.verdict }), verdict: rule.verdict, reasonCodes: [rule.reasonCode], lineageIds: [entry.id] }), entry };
}

/** @param {string} evaluationId @returns {VerdictCandidate} */
function admissibleCandidate(evaluationId) { return { id: derivedIdentity("verdict-candidate", { evaluationId, verdict: "ADMISSIBLE" }), verdict: "ADMISSIBLE", reasonCodes: [], lineageIds: [] }; }
/** @param {string} factKey @returns {MarketPolicyCondition} */
function observationCondition(factKey) { return /** @type {MarketPolicyCondition} */ (OBSERVATION_CONDITIONS.get(factKey) ?? "REQUIRED_EVIDENCE_MISSING"); }
/** @param {MarketKernelInput} input @param {import("@proofrail/contracts").MarketExpectation} expectation */
function expectedValue(input, expectation) { return expectation.kind === "CONSTANT_EQUALS" ? expectation.value : input.target[expectation.targetField]; }
/** @param {import("@proofrail/contracts").ProducerReference} left @param {import("@proofrail/contracts").ProducerReference} right */
function sameProducer(left, right) { return left.id === right.id && left.version === right.version; }
/** @param {import("@proofrail/contracts").MarketTarget} left @param {import("@proofrail/contracts").MarketTarget} right */
function sameTarget(left, right) { return left.repository === right.repository && left.pullRequestNumber === right.pullRequestNumber && left.baseSha === right.baseSha && left.headSha === right.headSha && left.targetScopeId === right.targetScopeId; }
/** @param {import("@proofrail/contracts").VerificationReceipt["lineage"]} value @param {import("@proofrail/contracts").MarketAuthority} authority */
function sameLineage(value, authority) { return value.trustedConfigurationSha256 === authority.trustedConfiguration.sha256 && value.policySha256 === authority.policy.sha256 && value.evidenceContractSha256 === authority.evidenceContract.sha256 && value.marketConfigSha256 === authority.marketConfigSha256; }
/** @param {MarketKernelInput} input @param {MarketEvidence[]} evidence @param {MarketEvidenceLineage[]} evidenceLineage @param {import("@proofrail/contracts").VerdictReduction} verdictReduction */
function componentDigestMap(input, evidence, evidenceLineage, verdictReduction) { return { target: digest(input.target), authority: digest(input.authority), claims: digest(input.claims), evidenceContract: digest(input.evidenceContract), evidenceRequirements: digest(input.evidenceRequirements), observations: digest(input.observations), verificationReceipts: digest(input.verificationReceipts), evidence: digest(evidence), evidenceLineage: digest(evidenceLineage), rules: digest(input.rules), verdictReduction: digest(verdictReduction) }; }
/** @param {unknown} value @returns {import("@proofrail/contracts").Sha256Digest} */
function digest(value) { return `sha256:${sha256Digest(value).toUpperCase()}`; }
/** @param {MarketEvidenceLineage["kind"]} kind @param {Record<string, import("@proofrail/contracts").JsonPrimitive | readonly import("@proofrail/contracts").JsonPrimitive[]>} references @returns {MarketEvidenceLineage} */
function lineage(kind, references) { const value = { kind, references }; return { id: derivedIdentity("lineage", value), ...value }; }
/** @template {string} T @param {T[]} values @returns {T[]} */
function uniqueSorted(values) { return [...new Set(values)].sort(compareStrings); }
/** @param {{id:string}} left @param {{id:string}} right */
function compareById(left, right) { return compareStrings(left.id, right.id); }
/** @param {import("@proofrail/contracts").MarketObservation} left @param {import("@proofrail/contracts").MarketObservation} right */
function compareObservation(left, right) { return compareStrings(left.orderingKey, right.orderingKey) || compareStrings(left.id, right.id); }
/** @param {import("@proofrail/contracts").VerificationReceipt} left @param {import("@proofrail/contracts").VerificationReceipt} right */
function compareReceipt(left, right) { return compareStrings(left.command.orderingKey, right.command.orderingKey) || compareStrings(left.id, right.id); }
/** @param {string} left @param {string} right */
function compareStrings(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
/** @param {readonly {id:string}[]} values @param {string} field */
function assertUniqueIds(values, field) { if (new Set(values.map(({ id }) => id)).size !== values.length) throw new MarketKernelBoundaryError(`${field} contains duplicate identities`); }
