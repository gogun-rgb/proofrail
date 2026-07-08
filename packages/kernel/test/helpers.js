// @ts-check

import {
  PHASE1_KERNEL_INPUT_SCHEMA_VERSION
} from "@proofrail/contracts";

/**
 * @typedef {import("@proofrail/contracts").KernelEvaluationInput} KernelEvaluationInput
 */

/**
 * @param {{
 *   expectedValue?: import("@proofrail/contracts").JsonPrimitive,
 *   factValue?: import("@proofrail/contracts").JsonPrimitive,
 *   observations?: KernelEvaluationInput["observations"],
 *   rules?: KernelEvaluationInput["rules"],
 *   requirementOverrides?: Partial<KernelEvaluationInput["evidenceRequirements"][number]>,
 *   observationOverrides?: Partial<KernelEvaluationInput["observations"][number]>,
 *   claimStatement?: string
 * }} [options]
 * @returns {KernelEvaluationInput}
 */
export function makeInput(options = {}) {
  const expectedValue = options.expectedValue ?? true;
  const factValue = options.factValue ?? expectedValue;
  const requirement = {
    id: "req.has-lockfile",
    evidenceContractId: "contract.phase1",
    targetScopeId: "scope.repo",
    requiredObserver: {
      id: "observer.synthetic",
      version: "1.0.0"
    },
    factKey: "lockfile.present",
    expectedValue,
    ...options.requirementOverrides
  };
  const observation = {
    id: "obs.lockfile-present",
    observer: {
      id: "observer.synthetic",
      version: "1.0.0"
    },
    targetScopeId: "scope.repo",
    factKey: "lockfile.present",
    factValue,
    sourceInputId: "source.synthetic",
    orderingKey: "001",
    limitations: [],
    ...options.observationOverrides
  };

  return {
    schemaVersion: PHASE1_KERNEL_INPUT_SCHEMA_VERSION,
    evaluation: { id: "eval.phase1" },
    claims: [
      {
        id: "claim.lockfile",
        targetScopeId: "scope.repo",
        statement: options.claimStatement ?? "The synthetic change has the required lockfile fact."
      }
    ],
    evidenceContracts: [
      {
        id: "contract.phase1",
        version: "1.0.0",
        targetScopeId: "scope.repo",
        selectionProvenance: {
          source: "TRUSTED_CONFIGURATION",
          configurationId: "config.phase1",
          configurationVersion: "1.0.0"
        },
        requirementIds: ["req.has-lockfile"]
      }
    ],
    evidenceRequirements: [requirement],
    observations: options.observations ?? [observation],
    rules: options.rules ?? []
  };
}

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function clone(value) {
  return structuredClone(value);
}

/**
 * @param {readonly import("@proofrail/contracts").EvidenceLineage[]} lineage
 * @returns {Set<string>}
 */
export function lineageKinds(lineage) {
  return new Set(lineage.map((entry) => entry.kind));
}
