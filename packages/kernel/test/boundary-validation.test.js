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

test("Rule reason code reserved for missing Evidence Requirement is rejected", () => {
  const input = makeInput({
    rules: [
      {
        ...validRule("rule.reserved-missing-evidence"),
        effect: {
          kind: "DENY",
          reasonCode: "KERNEL_EVIDENCE_REQUIREMENT_MISSING"
        }
      }
    ]
  });

  const error = assertBoundaryError(input, "RESERVED_KERNEL_REASON_CODE");
  assert.equal(error.path, "$.rules[0].effect.reasonCode");
});

test("normal KERNEL_ Rule reason code remains valid", () => {
  const bundle = evaluateKernel(makeInput({
    rules: [validRule("rule.normal-kernel-code")]
  }));

  assert.equal(bundle.verdict, "REJECTED");
  assert.deepEqual(bundle.reasonCodes, ["KERNEL_SYNTHETIC_DENIAL"]);
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

test("modelConfidence attached to observations Array is rejected before evaluation", () => {
  const input = /** @type {any} */ (makeInput());
  input.observations.modelConfidence = 0.99;

  const error = assertBoundaryError(input, "FORBIDDEN_AUTHORITY_FIELD");
  assert.equal(error.path, "$.observations.modelConfidence");
});

test("inferenceProposal attached to rules Array is rejected before evaluation", () => {
  const input = /** @type {any} */ (makeInput());
  input.rules.inferenceProposal = { verdict: "ADMISSIBLE" };

  const error = assertBoundaryError(input, "FORBIDDEN_AUTHORITY_FIELD");
  assert.equal(error.path, "$.rules.inferenceProposal");
});

test("symbol-keyed property attached to an authoritative Array is rejected", () => {
  const input = /** @type {any} */ (makeInput());
  input.observations[Symbol("authority")] = "hidden";

  const error = assertBoundaryError(input, "SYMBOL_KEY");
  assert.equal(error.path, "$.observations");
});

test("non-enumerable custom property attached to an authoritative Array is rejected", () => {
  const input = makeInput();
  Object.defineProperty(input.observations, "hidden", {
    enumerable: false,
    value: "not-json-shape"
  });

  const error = assertBoundaryError(input, "NON_ENUMERABLE_FIELD");
  assert.equal(error.path, "$.observations.hidden");
});

test("accessor-backed numeric Array index is rejected without executing the getter", () => {
  const input = makeInput();
  let getterExecutionCount = 0;
  Object.defineProperty(input.observations, "0", {
    configurable: true,
    enumerable: true,
    get() {
      getterExecutionCount += 1;
      return makeInput().observations[0];
    }
  });

  const error = assertBoundaryError(input, "ACCESSOR_FIELD");
  assert.equal(error.path, "$.observations[0]");
  assert.equal(getterExecutionCount, 0);
});

test("sparse observations Array is rejected before normalization", () => {
  const input = /** @type {any} */ (makeInput());
  delete input.observations[0];

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.observations[0]");
});

test("sparse rules Array is rejected before Rule evaluation", () => {
  const input = /** @type {any} */ (makeInput());
  input.rules.length = 1;

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.rules[0]");
});

test("unexpected ordinary string-keyed Array property is rejected", () => {
  const input = /** @type {any} */ (makeInput());
  input.observations.extra = "unexpected";

  const error = assertBoundaryError(input, "UNEXPECTED_FIELD");
  assert.equal(error.path, "$.observations.extra");
});

test("nested sparse Evidence Contract requirementIds Array is rejected", () => {
  const input = /** @type {any} */ (makeInput());
  delete input.evidenceContracts[0].requirementIds[0];

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.evidenceContracts[0].requirementIds[0]");
});

test("nested accessor-backed Observation limitations Array is rejected without executing the getter", () => {
  const input = makeInput({
    observationOverrides: {
      limitations: ["SYNTHETIC_LIMITATION"]
    }
  });
  const observation = /** @type {any} */ (input.observations[0]);
  let getterExecutionCount = 0;
  Object.defineProperty(observation.limitations, "0", {
    configurable: true,
    enumerable: true,
    get() {
      getterExecutionCount += 1;
      return "SYNTHETIC_LIMITATION";
    }
  });

  const error = assertBoundaryError(input, "ACCESSOR_FIELD");
  assert.equal(error.path, "$.observations[0].limitations[0]");
  assert.equal(getterExecutionCount, 0);
});

test("repeated malformed Array validation reports the same category and path", () => {
  const input = /** @type {any} */ (makeInput());
  delete input.observations[0];

  const first = assertBoundaryError(input, "INVALID_ARRAY");
  const second = assertBoundaryError(input, "INVALID_ARRAY");

  assert.equal(first.issueCategory, second.issueCategory);
  assert.equal(first.path, second.path);
});

test("ordinary dense JSON-compatible Arrays remain accepted", () => {
  const bundle = evaluateKernel(makeInput());

  assert.equal(bundle.verdict, "ADMISSIBLE");
});

test("null-prototype observations Array is rejected with KernelBoundaryError", () => {
  const input = makeInput();
  Object.setPrototypeOf(input.observations, null);

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.observations");
});

test("null-prototype rules Array is rejected with KernelBoundaryError", () => {
  const input = makeInput();
  Object.setPrototypeOf(input.rules, null);

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.rules");
});

test("Array subclass instance is rejected", () => {
  class AuthoritativeArray extends Array {}

  const input = /** @type {any} */ (makeInput());
  input.observations = new AuthoritativeArray(input.observations[0]);

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.observations");
});

test("Array subclass overriding forEach does not execute overridden body", () => {
  let forEachExecutionCount = 0;
  class TrackingArray extends Array {
    forEach() {
      forEachExecutionCount += 1;
    }
  }

  const input = /** @type {any} */ (makeInput());
  input.observations = new TrackingArray(input.observations[0]);

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.observations");
  assert.equal(forEachExecutionCount, 0);
});

test("Array subclass overriding map does not execute overridden body", () => {
  let mapExecutionCount = 0;
  class TrackingArray extends Array {
    map() {
      mapExecutionCount += 1;
      return [];
    }
  }

  const input = /** @type {any} */ (makeInput());
  input.observations = new TrackingArray(input.observations[0]);

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.observations");
  assert.equal(mapExecutionCount, 0);
});

test("custom Array prototype attempting to skip validation does not execute", () => {
  const input = /** @type {any} */ (makeInput());
  let forEachExecutionCount = 0;
  input.observations[0] = {
    ...input.observations[0],
    id: ""
  };
  Object.setPrototypeOf(input.observations, {
    forEach() {
      forEachExecutionCount += 1;
    }
  });

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.observations");
  assert.equal(forEachExecutionCount, 0);
});

test("custom Array prototype attempting to substitute clone output does not execute", () => {
  const input = /** @type {any} */ (makeInput());
  let mapExecutionCount = 0;
  input.observations[0] = {
    ...input.observations[0],
    id: ""
  };
  Object.setPrototypeOf(input.observations, {
    map() {
      mapExecutionCount += 1;
      return makeInput().observations;
    }
  });

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.observations");
  assert.equal(mapExecutionCount, 0);
});

test("nested Evidence Contract requirementIds with non-ordinary Array prototype is rejected", () => {
  const input = makeInput();
  const contract = /** @type {any} */ (input.evidenceContracts[0]);
  Object.setPrototypeOf(contract.requirementIds, null);

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.evidenceContracts[0].requirementIds");
});

test("nested Observation limitations with non-ordinary Array prototype is rejected", () => {
  const input = makeInput({
    observationOverrides: {
      limitations: ["SYNTHETIC_LIMITATION"]
    }
  });
  const observation = /** @type {any} */ (input.observations[0]);
  Object.setPrototypeOf(observation.limitations, null);

  const error = assertBoundaryError(input, "INVALID_ARRAY");
  assert.equal(error.path, "$.observations[0].limitations");
});

test("Proxy-wrapped root input is rejected before traps execute", () => {
  const counters = createTrapCounters();
  const proxy = countingProxy(makeInput(), counters);

  const first = assertBoundaryError(proxy, "PROXY_INPUT");
  const second = assertBoundaryError(proxy, "PROXY_INPUT");

  assert.equal(first.path, "$");
  assert.equal(first.issueCategory, second.issueCategory);
  assert.equal(first.path, second.path);
  assertZeroTrapCounters(counters);
});

test("Proxy-wrapped evaluation is rejected before traps execute", () => {
  const input = /** @type {any} */ (makeInput());
  const counters = createTrapCounters();
  input.evaluation = countingProxy(input.evaluation, counters);

  const error = assertBoundaryError(input, "PROXY_INPUT");

  assert.equal(error.path, "$.evaluation");
  assertZeroTrapCounters(counters);
});

test("Proxy-wrapped Observation is rejected before traps execute", () => {
  const input = /** @type {any} */ (makeInput());
  const counters = createTrapCounters();
  input.observations[0] = countingProxy(input.observations[0], counters);

  const error = assertBoundaryError(input, "PROXY_INPUT");

  assert.equal(error.path, "$.observations[0]");
  assertZeroTrapCounters(counters);
});

test("Proxy-wrapped observations Array is rejected before descriptor or clone traps execute", () => {
  const input = /** @type {any} */ (makeInput());
  const counters = createTrapCounters();
  input.observations = countingProxy(input.observations, counters);

  const error = assertBoundaryError(input, "PROXY_INPUT");

  assert.equal(error.path, "$.observations");
  assertZeroTrapCounters(counters);
});

test("Proxy-wrapped nested Observation limitations Array is rejected before traps execute", () => {
  const input = /** @type {any} */ (makeInput({
    observationOverrides: {
      limitations: ["SYNTHETIC_LIMITATION"]
    }
  }));
  const counters = createTrapCounters();
  input.observations[0].limitations = countingProxy(input.observations[0].limitations, counters);

  const error = assertBoundaryError(input, "PROXY_INPUT");

  assert.equal(error.path, "$.observations[0].limitations");
  assertZeroTrapCounters(counters);
});

test("Proxy-wrapped Rule effect is rejected before traps execute", () => {
  const rule = /** @type {any} */ (validRule("rule.proxy-effect"));
  const counters = createTrapCounters();
  rule.effect = countingProxy(rule.effect, counters);
  const input = makeInput({ rules: [rule] });

  const error = assertBoundaryError(input, "PROXY_INPUT");

  assert.equal(error.path, "$.rules[0].effect");
  assertZeroTrapCounters(counters);
});

test("revoked Proxy input is rejected as Proxy input", () => {
  const revocable = Proxy.revocable(makeInput(), {});
  revocable.revoke();

  const error = assertBoundaryError(revocable.proxy, "PROXY_INPUT");
  assert.equal(error.path, "$");
});

test("Proxy cannot lie about descriptors and supply a different clone value", () => {
  const input = /** @type {any} */ (makeInput());
  const counters = createTrapCounters();
  const malformedObservation = {
    ...input.observations[0],
    id: ""
  };
  input.observations[0] = new Proxy(malformedObservation, {
    get(target, property, receiver) {
      counters.get += 1;
      if (property === "id") {
        return "obs.lockfile-present";
      }
      return Reflect.get(target, property, receiver);
    },
    getPrototypeOf(target) {
      counters.getPrototypeOf += 1;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      counters.ownKeys += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, property) {
      counters.getOwnPropertyDescriptor += 1;
      return Reflect.getOwnPropertyDescriptor(target, property);
    }
  });

  const error = assertBoundaryError(input, "PROXY_INPUT");

  assert.equal(error.path, "$.observations[0]");
  assertZeroTrapCounters(counters);
});

test("Observation target scope outside the declared evaluation scope is rejected", () => {
  const input = makeInput({
    observationOverrides: {
      targetScopeId: "scope.other"
    }
  });

  const error = assertBoundaryError(input, "TARGET_SCOPE_MISMATCH");
  assert.equal(error.path, "$.observations[0].targetScopeId");
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
 * @returns {KernelBoundaryError}
 */
function assertBoundaryError(input, issueCategory, label = issueCategory) {
  const error = captureBoundaryError(input, label);
  assert.equal(error.issueCategory, issueCategory, label);
  return error;
}

/**
 * @param {unknown} input
 * @param {string} label
 * @returns {KernelBoundaryError}
 */
function captureBoundaryError(input, label) {
  /** @type {KernelBoundaryError | undefined} */
  let captured;
  assert.throws(
    () => evaluateKernel(input),
    (error) => {
      assert.equal(error instanceof KernelBoundaryError, true, label);
      captured = /** @type {KernelBoundaryError} */ (error);
      return true;
    }
  );
  assert.ok(captured, label);
  return captured;
}

/**
 * @typedef {{
 *   get: number,
 *   getPrototypeOf: number,
 *   ownKeys: number,
 *   getOwnPropertyDescriptor: number
 * }} TrapCounters
 */

/**
 * @returns {TrapCounters}
 */
function createTrapCounters() {
  return {
    get: 0,
    getPrototypeOf: 0,
    ownKeys: 0,
    getOwnPropertyDescriptor: 0
  };
}

/**
 * @template {object} T
 * @param {T} target
 * @param {TrapCounters} counters
 * @returns {T}
 */
function countingProxy(target, counters) {
  return new Proxy(target, {
    get(proxyTarget, property, receiver) {
      counters.get += 1;
      return Reflect.get(proxyTarget, property, receiver);
    },
    getPrototypeOf(proxyTarget) {
      counters.getPrototypeOf += 1;
      return Reflect.getPrototypeOf(proxyTarget);
    },
    ownKeys(proxyTarget) {
      counters.ownKeys += 1;
      return Reflect.ownKeys(proxyTarget);
    },
    getOwnPropertyDescriptor(proxyTarget, property) {
      counters.getOwnPropertyDescriptor += 1;
      return Reflect.getOwnPropertyDescriptor(proxyTarget, property);
    }
  });
}

/**
 * @param {TrapCounters} counters
 * @returns {void}
 */
function assertZeroTrapCounters(counters) {
  assert.equal(counters.get, 0, "get trap execution count");
  assert.equal(counters.getPrototypeOf, 0, "getPrototypeOf trap execution count");
  assert.equal(counters.ownKeys, 0, "ownKeys trap execution count");
  assert.equal(counters.getOwnPropertyDescriptor, 0, "getOwnPropertyDescriptor trap execution count");
}
