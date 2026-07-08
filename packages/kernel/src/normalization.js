// @ts-check

/** @typedef {import("@proofrail/contracts").KernelEvaluationInput} KernelEvaluationInput */

/**
 * @param {KernelEvaluationInput} input
 * @returns {KernelEvaluationInput}
 */
export function normalizeKernelInput(input) {
  const claims = input.claims
    .map((claim) => ({
      id: claim.id,
      targetScopeId: claim.targetScopeId,
      statement: claim.statement
    }))
    .sort(compareById);

  const evidenceContracts = input.evidenceContracts
    .map((contract) => ({
      id: contract.id,
      version: contract.version,
      targetScopeId: contract.targetScopeId,
      selectionProvenance: normalizeEvidenceContractSelectionProvenance(contract.selectionProvenance),
      requirementIds: [...contract.requirementIds].sort(compareStrings)
    }))
    .sort(compareById);

  const evidenceRequirements = input.evidenceRequirements
    .map((requirement) => ({
      id: requirement.id,
      evidenceContractId: requirement.evidenceContractId,
      targetScopeId: requirement.targetScopeId,
      requiredObserver: {
        id: requirement.requiredObserver.id,
        version: requirement.requiredObserver.version
      },
      factKey: requirement.factKey,
      expectedValue: requirement.expectedValue
    }))
    .sort(compareById);

  const observations = input.observations
    .map((observation) => ({
      id: observation.id,
      observer: {
        id: observation.observer.id,
        version: observation.observer.version
      },
      targetScopeId: observation.targetScopeId,
      factKey: observation.factKey,
      factValue: observation.factValue,
      sourceInputId: observation.sourceInputId,
      orderingKey: observation.orderingKey,
      limitations: [...observation.limitations].sort(compareStrings)
    }))
    .sort(compareObservation);

  const rules = input.rules
    .map((rule) => ({
      id: rule.id,
      predicate: {
        kind: rule.predicate.kind,
        evidenceRequirementId: rule.predicate.evidenceRequirementId
      },
      effect: {
        kind: rule.effect.kind,
        reasonCode: rule.effect.reasonCode
      },
      authority: normalizeRuleAuthority(rule.authority)
    }))
    .sort(compareById);

  return {
    schemaVersion: input.schemaVersion,
    evaluation: { id: input.evaluation.id },
    claims,
    evidenceContracts,
    evidenceRequirements,
    observations,
    rules
  };
}

/**
 * @param {import("@proofrail/contracts").EvidenceContractSelectionProvenance} provenance
 * @returns {import("@proofrail/contracts").EvidenceContractSelectionProvenance}
 */
function normalizeEvidenceContractSelectionProvenance(provenance) {
  if (provenance.source === "TRUSTED_CONFIGURATION") {
    return {
      source: provenance.source,
      configurationId: provenance.configurationId,
      configurationVersion: provenance.configurationVersion
    };
  }
  return {
    source: provenance.source,
    policyId: provenance.policyId,
    policyVersion: provenance.policyVersion
  };
}

/**
 * @param {import("@proofrail/contracts").RuleAuthorityProvenance} authority
 * @returns {import("@proofrail/contracts").RuleAuthorityProvenance}
 */
function normalizeRuleAuthority(authority) {
  if (authority.source === "TRUSTED_CONFIGURATION") {
    return {
      source: authority.source,
      configurationId: authority.configurationId,
      configurationVersion: authority.configurationVersion
    };
  }
  return {
    source: authority.source,
    policyId: authority.policyId,
    policyVersion: authority.policyVersion
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
 * @param {import("@proofrail/contracts").Observation} left
 * @param {import("@proofrail/contracts").Observation} right
 * @returns {number}
 */
function compareObservation(left, right) {
  return compareStrings(left.orderingKey, right.orderingKey) || compareStrings(left.id, right.id);
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
