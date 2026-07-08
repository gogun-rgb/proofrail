// @ts-check

import { EVIDENCE_SATISFACTION_KIND } from "@proofrail/contracts";
import { canonicalJson, derivedIdentity } from "./canonical-json.js";

export const MISSING_EVIDENCE_REASON_CODE = "KERNEL_EVIDENCE_REQUIREMENT_MISSING";

/**
 * @typedef {import("@proofrail/contracts").Evidence} Evidence
 * @typedef {import("@proofrail/contracts").EvidenceLineage} EvidenceLineage
 * @typedef {import("@proofrail/contracts").KernelEvaluationInput} KernelEvaluationInput
 * @typedef {import("@proofrail/contracts").VerdictCandidate} VerdictCandidate
 */

/**
 * @param {KernelEvaluationInput} input
 * @returns {{
 *   evidence: Evidence[],
 *   lineage: EvidenceLineage[],
 *   candidates: VerdictCandidate[]
 * }}
 */
export function evaluateEvidenceSatisfaction(input) {
  /** @type {Evidence[]} */
  const evidence = [];
  /** @type {EvidenceLineage[]} */
  const lineage = [];
  /** @type {VerdictCandidate[]} */
  const candidates = [];

  for (const requirement of input.evidenceRequirements) {
    const acceptedObservationIds = input.observations
      .filter((observation) => observationSatisfiesRequirement(observation, requirement))
      .map((observation) => observation.id)
      .sort(compareStrings);

    if (acceptedObservationIds.length > 0) {
      /** @type {string[]} */
      const acceptedObservationLineageIds = [];
      for (const observationId of acceptedObservationIds) {
        const observationLineage = lineageEntry("OBSERVATION_ACCEPTED", {
          requirementId: requirement.id,
          observationId
        });
        acceptedObservationLineageIds.push(observationLineage.id);
        lineage.push(observationLineage);
      }

      const evidenceLineage = lineageEntry("EVIDENCE_PRODUCED", {
        evidenceId: derivedIdentity("evidence", {
          evaluationId: input.evaluation.id,
          requirementId: requirement.id,
          acceptedObservationIds
        }),
        requirementId: requirement.id,
        observationIds: acceptedObservationIds
      });
      const evidenceRecord = makeEvidence(
        input.evaluation.id,
        requirement,
        acceptedObservationIds,
        [...acceptedObservationLineageIds, evidenceLineage.id].sort(compareStrings)
      );
      evidence.push(evidenceRecord);
      lineage.push(evidenceLineage);
    } else {
      const missingLineage = lineageEntry("VERDICT_CANDIDATE_CLASSIFIED", {
        condition: "MISSING_EVIDENCE_REQUIREMENT",
        requirementId: requirement.id,
        verdict: "REVISION_REQUIRED",
        reasonCode: MISSING_EVIDENCE_REASON_CODE
      });
      lineage.push(missingLineage);
      candidates.push({
        id: derivedIdentity("verdict-candidate", {
          kind: "missing-evidence",
          requirementId: requirement.id,
          verdict: "REVISION_REQUIRED",
          reasonCode: MISSING_EVIDENCE_REASON_CODE
        }),
        verdict: "REVISION_REQUIRED",
        reasonCodes: [MISSING_EVIDENCE_REASON_CODE],
        lineageIds: [missingLineage.id]
      });
    }
  }

  evidence.sort(compareById);
  lineage.sort(compareById);
  candidates.sort(compareById);

  return { evidence, lineage, candidates };
}

/**
 * @param {import("@proofrail/contracts").Observation} observation
 * @param {import("@proofrail/contracts").EvidenceRequirement} requirement
 * @returns {boolean}
 */
function observationSatisfiesRequirement(observation, requirement) {
  return (
    observation.limitations.length === 0 &&
    observation.targetScopeId === requirement.targetScopeId &&
    observation.observer.id === requirement.requiredObserver.id &&
    observation.observer.version === requirement.requiredObserver.version &&
    observation.factKey === requirement.factKey &&
    canonicalJson(observation.factValue) === canonicalJson(requirement.expectedValue)
  );
}

/**
 * @param {string} evaluationId
 * @param {import("@proofrail/contracts").EvidenceRequirement} requirement
 * @param {readonly string[]} acceptedObservationIds
 * @param {readonly string[]} lineageIds
 * @returns {Evidence}
 */
function makeEvidence(evaluationId, requirement, acceptedObservationIds, lineageIds) {
  return {
    id: derivedIdentity("evidence", {
      evaluationId,
      requirementId: requirement.id,
      acceptedObservationIds
    }),
    evaluationId,
    evidenceContractId: requirement.evidenceContractId,
    requirementId: requirement.id,
    targetScopeId: requirement.targetScopeId,
    satisfaction: {
      kind: EVIDENCE_SATISFACTION_KIND,
      factKey: requirement.factKey,
      expectedValue: requirement.expectedValue
    },
    acceptedObservationIds,
    lineageIds
  };
}

/**
 * @param {EvidenceLineage["kind"]} kind
 * @param {Record<string, import("@proofrail/contracts").JsonPrimitive | readonly import("@proofrail/contracts").JsonPrimitive[]>} references
 * @returns {EvidenceLineage}
 */
export function lineageEntry(kind, references) {
  return {
    id: derivedIdentity("lineage", { kind, references }),
    kind,
    references
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
