// @ts-check

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateKernel, KernelBoundaryError } from "../src/index.js";
import { makeInput } from "./helpers.js";

test("modelConfidence authoritative input field is rejected before evaluation", () => {
  assertBoundaryError({ ...makeInput(), modelConfidence: 0.99 }, "FORBIDDEN_AUTHORITY_FIELD");
});

test("inferenceProposal and proposedContent authoritative fields are rejected", () => {
  assertBoundaryError({ ...makeInput(), inferenceProposal: { verdict: "ADMISSIBLE" } }, "FORBIDDEN_AUTHORITY_FIELD");
  assertBoundaryError({ ...makeInput(), proposedContent: "trust me" }, "FORBIDDEN_AUTHORITY_FIELD");
});

test("invalid Evidence Contract selection provenance is rejected", () => {
  for (const source of ["MACHINE_TASK_CONTRACT", "MODEL_OUTPUT", "INFERENCE_PROPOSAL"]) {
    const input = makeInput();
    const contract = /** @type {any} */ (input.evidenceContracts[0]);
    contract.selectionProvenance = {
      source,
      configurationId: "config.invalid",
      configurationVersion: "1.0.0"
    };
    assertBoundaryError(input, "INVALID_EVIDENCE_CONTRACT_SELECTION_PROVENANCE");
  }
});

test("invalid Rule authority provenance is rejected", () => {
  for (const source of ["MACHINE_TASK_CONTRACT", "MODEL_OUTPUT", "INFERENCE_PROPOSAL"]) {
    const input = makeInput({
      rules: [
        {
          id: "rule.invalid-authority",
          predicate: {
            kind: "EVIDENCE_PRESENT",
            evidenceRequirementId: "req.has-lockfile"
          },
          effect: {
            kind: "DENY",
            reasonCode: "KERNEL_SYNTHETIC_DENIAL"
          },
          authority: /** @type {any} */ ({
            source,
            configurationId: "config.invalid",
            configurationVersion: "1.0.0"
          })
        }
      ]
    });
    assertBoundaryError(input, "INVALID_RULE_AUTHORITY_PROVENANCE");
  }
});

test("Rule reason code beginning with HARN_ is rejected", () => {
  const input = makeInput({
    rules: [
      {
        id: "rule.harn",
        predicate: {
          kind: "EVIDENCE_PRESENT",
          evidenceRequirementId: "req.has-lockfile"
        },
        effect: {
          kind: "DENY",
          reasonCode: "HARN_NOT_PRODUCT"
        },
        authority: {
          source: "POLICY",
          policyId: "policy.phase1",
          policyVersion: "1.0.0"
        }
      }
    ]
  });

  assertBoundaryError(input, "RESERVED_REASON_CODE_NAMESPACE");
});

test("invalid JSON values are rejected deterministically", () => {
  const cyclic = /** @type {any} */ (makeInput());
  cyclic.claims[0].statement = "cycle carrier";
  cyclic.claims[0].cycle = cyclic;

  const invalidCases = [
    { label: "NaN", value: Number.NaN },
    { label: "Infinity", value: Number.POSITIVE_INFINITY },
    { label: "undefined", value: undefined },
    { label: "bigint", value: 1n },
    { label: "Date", value: new Date("2026-01-01T00:00:00Z") },
    { label: "Map", value: new Map([["a", 1]]) },
    { label: "Set", value: new Set([1]) },
    { label: "function", value: () => true },
    { label: "symbol", value: Symbol("bad") }
  ];

  for (const item of invalidCases) {
    const input = makeInput();
    const mutableInput = /** @type {any} */ (input);
    mutableInput.observations[0].factValue = item.value;
    assertBoundaryError(input, "NON_JSON_VALUE", item.label);
  }
  assertBoundaryError(cyclic, "CYCLIC_INPUT", "cyclic");
});

test("duplicate requirement, Observation, or Rule identities are rejected before normalization", () => {
  const duplicateRequirement = makeInput();
  /** @type {any[]} */ (/** @type {any} */ (duplicateRequirement.evidenceRequirements)).push({
    ...duplicateRequirement.evidenceRequirements[0]
  });
  assertBoundaryError(duplicateRequirement, "DUPLICATE_IDENTITY");

  const duplicateObservation = makeInput();
  /** @type {any[]} */ (/** @type {any} */ (duplicateObservation.observations)).push({
    ...duplicateObservation.observations[0]
  });
  assertBoundaryError(duplicateObservation, "DUPLICATE_IDENTITY");

  const duplicateRule = makeInput({
    rules: [
      validRule("rule.duplicate"),
      validRule("rule.duplicate")
    ]
  });
  assertBoundaryError(duplicateRule, "DUPLICATE_IDENTITY");
});

test("Rule referencing unknown Evidence Requirement is rejected", () => {
  const input = makeInput({
    rules: [
      {
        ...validRule("rule.unknown"),
        predicate: {
          kind: "EVIDENCE_PRESENT",
          evidenceRequirementId: "req.unknown"
        }
      }
    ]
  });

  assertBoundaryError(input, "INVALID_REFERENCE");
});

test("Claim scope without selected Evidence Contract is rejected", () => {
  const input = makeInput();
  const mutableInput = /** @type {any} */ (input);
  mutableInput.claims.push({
    id: "claim.uncovered",
    targetScopeId: "scope.uncovered",
    statement: "This Claim is outside the selected Evidence Contract scope."
  });

  assertBoundaryError(input, "TARGET_SCOPE_MISMATCH");
});

test("accessor, symbol-keyed, and non-enumerable authoritative fields are rejected", () => {
  const accessorInput = makeInput();
  Object.defineProperty(accessorInput.evaluation, "id", {
    enumerable: true,
    get() {
      return "eval.from-getter";
    }
  });
  assertBoundaryError(accessorInput, "ACCESSOR_FIELD");

  const symbolInput = makeInput();
  const mutableSymbolInput = /** @type {any} */ (symbolInput);
  mutableSymbolInput[Symbol("authority")] = "hidden";
  assertBoundaryError(symbolInput, "SYMBOL_KEY");

  const nonEnumerableInput = makeInput();
  Object.defineProperty(nonEnumerableInput.evaluation, "hidden", {
    enumerable: false,
    value: "not-json-shape"
  });
  assertBoundaryError(nonEnumerableInput, "NON_ENUMERABLE_FIELD");
});

test("path-shaped and URL-shaped stable identities are rejected", () => {
  const pathInput = makeInput();
  const mutablePathInput = /** @type {any} */ (pathInput);
  mutablePathInput.evaluation.id = "C:/Users/zizon/proofrail";
  assertBoundaryError(pathInput, "INVALID_STABLE_IDENTITY");

  const urlInput = makeInput();
  const mutableUrlInput = /** @type {any} */ (urlInput);
  mutableUrlInput.observations[0].sourceInputId = "https://example.invalid/source";
  assertBoundaryError(urlInput, "INVALID_STABLE_IDENTITY");
});

/**
 * @param {string} id
 * @returns {import("@proofrail/contracts").Rule}
 */
function validRule(id) {
  return {
    id,
    predicate: {
      kind: "EVIDENCE_PRESENT",
      evidenceRequirementId: "req.has-lockfile"
    },
    effect: {
      kind: "DENY",
      reasonCode: "KERNEL_SYNTHETIC_DENIAL"
    },
    authority: {
      source: "POLICY",
      policyId: "policy.phase1",
      policyVersion: "1.0.0"
    }
  };
}

/**
 * @param {unknown} input
 * @param {string} issueCategory
 * @param {string} [label]
 * @returns {void}
 */
function assertBoundaryError(input, issueCategory, label = issueCategory) {
  assert.throws(
    () => evaluateKernel(input),
    (error) => {
      assert.equal(error instanceof KernelBoundaryError, true, label);
      const boundaryError = /** @type {{ issueCategory: unknown }} */ (error);
      assert.equal(boundaryError.issueCategory, issueCategory, label);
      return true;
    }
  );
}
