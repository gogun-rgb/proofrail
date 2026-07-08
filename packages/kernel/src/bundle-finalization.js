// @ts-check

import {
  PHASE1_BUNDLE_SCHEMA_VERSION,
  PHASE1_KERNEL_ENGINE_VERSION
} from "@proofrail/contracts";
import { derivedIdentity } from "./canonical-json.js";
import { deepFreeze } from "./deep-freeze.js";
import { lineageEntry } from "./evidence-satisfaction.js";
import { reduceVerdictCandidates } from "./verdict-reduction.js";

/**
 * @typedef {import("@proofrail/contracts").Evidence} Evidence
 * @typedef {import("@proofrail/contracts").EvidenceBundle} EvidenceBundle
 * @typedef {import("@proofrail/contracts").EvidenceLineage} EvidenceLineage
 * @typedef {import("@proofrail/contracts").KernelEvaluationInput} KernelEvaluationInput
 * @typedef {import("@proofrail/contracts").VerdictCandidate} VerdictCandidate
 */

/**
 * @param {KernelEvaluationInput} input
 * @param {readonly Evidence[]} evidence
 * @param {readonly EvidenceLineage[]} evaluationLineage
 * @param {readonly VerdictCandidate[]} candidates
 * @returns {EvidenceBundle}
 */
export function finalizeEvidenceBundle(input, evidence, evaluationLineage, candidates) {
  const admissibleState = candidates.length > 0 ? null : makeAdmissibleCandidateState(input.evaluation.id);
  const candidateStates = admissibleState === null ? [...candidates] : [admissibleState.candidate];
  const verdictReduction = reduceVerdictCandidates(candidateStates);
  const reductionLineage = lineageEntry("VERDICT_REDUCED", {
    evaluationId: input.evaluation.id,
    verdict: verdictReduction.verdict,
    reasonCodes: verdictReduction.reasonCodes,
    candidateIds: verdictReduction.candidateIds
  });

  const evidenceLineage = [
    ...baseLineage(input),
    ...evaluationLineage,
    ...(admissibleState === null ? [] : [admissibleState.lineage]),
    reductionLineage
  ].sort(compareById);

  const bundleWithoutId = {
    schemaVersion: PHASE1_BUNDLE_SCHEMA_VERSION,
    kernelEngineVersion: PHASE1_KERNEL_ENGINE_VERSION,
    evaluationId: input.evaluation.id,
    claims: input.claims,
    evidenceContracts: input.evidenceContracts,
    evidenceContractSelectionProvenance: input.evidenceContracts.map((contract) => contract.selectionProvenance),
    evidenceRequirements: input.evidenceRequirements,
    observations: input.observations,
    evidence,
    rules: input.rules,
    verificationReceipts: /** @type {[]} */ ([]),
    evidenceLineage,
    verdict: verdictReduction.verdict,
    reasonCodes: verdictReduction.reasonCodes,
    verdictReduction: {
      ...verdictReduction,
      lineageIds: [...verdictReduction.lineageIds, reductionLineage.id].sort(compareStrings)
    }
  };

  const bundle = {
    id: derivedIdentity("bundle", bundleWithoutId),
    ...bundleWithoutId
  };

  return /** @type {EvidenceBundle} */ (/** @type {unknown} */ (deepFreeze(bundle)));
}

/**
 * @param {KernelEvaluationInput} input
 * @returns {EvidenceLineage[]}
 */
function baseLineage(input) {
  /** @type {EvidenceLineage[]} */
  const lineage = [];

  for (const claim of input.claims) {
    lineage.push(lineageEntry("CLAIM_DECLARED", {
      claimId: claim.id,
      targetScopeId: claim.targetScopeId
    }));
  }

  for (const contract of input.evidenceContracts) {
    lineage.push(lineageEntry("EVIDENCE_CONTRACT_SELECTED", {
      evidenceContractId: contract.id,
      version: contract.version,
      targetScopeId: contract.targetScopeId
    }));
    lineage.push(lineageEntry("EVIDENCE_CONTRACT_SELECTION_PROVENANCE", provenanceReferences(contract)));
  }

  for (const requirement of input.evidenceRequirements) {
    lineage.push(lineageEntry("EVIDENCE_REQUIREMENT_DECLARED", {
      requirementId: requirement.id,
      evidenceContractId: requirement.evidenceContractId,
      targetScopeId: requirement.targetScopeId
    }));
  }

  return lineage;
}

/**
 * @param {import("@proofrail/contracts").EvidenceContract} contract
 * @returns {Record<string, import("@proofrail/contracts").JsonPrimitive | readonly import("@proofrail/contracts").JsonPrimitive[]>}
 */
function provenanceReferences(contract) {
  const provenance = contract.selectionProvenance;
  if (provenance.source === "TRUSTED_CONFIGURATION") {
    return {
      evidenceContractId: contract.id,
      source: provenance.source,
      configurationId: provenance.configurationId,
      configurationVersion: provenance.configurationVersion
    };
  }
  return {
    evidenceContractId: contract.id,
    source: provenance.source,
    policyId: provenance.policyId,
    policyVersion: provenance.policyVersion
  };
}

/**
 * @param {string} evaluationId
 * @returns {{ candidate: VerdictCandidate, lineage: EvidenceLineage }}
 */
function makeAdmissibleCandidateState(evaluationId) {
  const candidateLineage = lineageEntry("VERDICT_CANDIDATE_CLASSIFIED", {
    condition: "ALL_REQUIREMENTS_SATISFIED_NO_RULE_DENIAL",
    evaluationId,
    verdict: "ADMISSIBLE"
  });
  return {
    candidate: {
      id: derivedIdentity("verdict-candidate", {
        kind: "admissible",
        evaluationId,
        verdict: "ADMISSIBLE"
      }),
      verdict: "ADMISSIBLE",
      reasonCodes: [],
      lineageIds: [candidateLineage.id]
    },
    lineage: candidateLineage
  };
}

/**
 * @param {{ readonly id: string }} left
 * @param {{ readonly id: string }} right
 * @returns {number}
 */
function compareById(left, right) {
  return compareStrings(left.id, right.id);
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
