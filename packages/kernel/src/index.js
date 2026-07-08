// @ts-check

export { KernelBoundaryError } from "./boundary-validation.js";

import { validateKernelEvaluationInput } from "./boundary-validation.js";
import { normalizeKernelInput } from "./normalization.js";
import { evaluateEvidenceSatisfaction } from "./evidence-satisfaction.js";
import { evaluateRules } from "./rule-evaluation.js";
import { finalizeEvidenceBundle } from "./bundle-finalization.js";

/** @typedef {import("@proofrail/contracts").EvidenceBundle} EvidenceBundle */

/**
 * Evaluates the Phase 1 deterministic synthetic-input kernel vertical slice.
 *
 * @param {unknown} input
 * @returns {EvidenceBundle}
 */
export function evaluateKernel(input) {
  const validatedInput = validateKernelEvaluationInput(input);
  const normalizedInput = normalizeKernelInput(validatedInput);
  const evidenceResult = evaluateEvidenceSatisfaction(normalizedInput);
  const ruleResult = evaluateRules(normalizedInput.rules, evidenceResult.evidence);

  return finalizeEvidenceBundle(
    normalizedInput,
    evidenceResult.evidence,
    [...evidenceResult.lineage, ...ruleResult.lineage],
    [...evidenceResult.candidates, ...ruleResult.candidates]
  );
}

export const evaluate = evaluateKernel;
