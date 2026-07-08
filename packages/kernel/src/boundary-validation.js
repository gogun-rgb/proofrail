// @ts-check

import { types as nodeUtilTypes } from "node:util";
import { PHASE1_KERNEL_INPUT_SCHEMA_VERSION } from "@proofrail/contracts";
import { MISSING_EVIDENCE_REASON_CODE } from "./kernel-reason-codes.js";

/** @typedef {import("@proofrail/contracts").KernelEvaluationInput} KernelEvaluationInput */

const FORBIDDEN_AUTHORITY_FIELDS = new Set([
  "modelConfidence",
  "inferenceProposal",
  "proposedContent"
]);

const STABLE_IDENTITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const ARRAY_INDEX_PATTERN = /^(0|[1-9][0-9]*)$/;
const MAX_ARRAY_INDEX = 4294967294;

export class KernelBoundaryError extends Error {
  /**
   * @param {string} issueCategory
   * @param {string} path
   * @param {string} detail
   */
  constructor(issueCategory, path, detail) {
    super(`${issueCategory} at ${path}: ${detail}`);
    this.name = "KernelBoundaryError";
    this.issueCategory = issueCategory;
    this.path = path;
  }
}

/**
 * @param {unknown} input
 * @returns {KernelEvaluationInput}
 */
export function validateKernelEvaluationInput(input) {
  scanAuthoritativeValue(input, "$", new WeakSet());

  const clonedInput = cloneJsonCompatible(input, "$");
  const root = expectPlainObject(clonedInput, "$");
  assertKnownFields(
    root,
    ["schemaVersion", "evaluation", "claims", "evidenceContracts", "evidenceRequirements", "observations", "rules"],
    "$"
  );
  expectLiteral(root.schemaVersion, PHASE1_KERNEL_INPUT_SCHEMA_VERSION, "$.schemaVersion");
  validateEvaluation(root.evaluation, "$.evaluation");

  const claims = expectArray(root.claims, "$.claims", { minLength: 1 });
  claims.forEach((claim, index) => validateClaim(claim, pathForArrayItem("$.claims", index)));

  const evidenceContracts = expectArray(root.evidenceContracts, "$.evidenceContracts", { minLength: 1 });
  evidenceContracts.forEach((contract, index) =>
    validateEvidenceContract(contract, pathForArrayItem("$.evidenceContracts", index))
  );

  const evidenceRequirements = expectArray(root.evidenceRequirements, "$.evidenceRequirements", { minLength: 1 });
  evidenceRequirements.forEach((requirement, index) =>
    validateEvidenceRequirement(requirement, pathForArrayItem("$.evidenceRequirements", index))
  );

  const observations = expectArray(root.observations, "$.observations");
  observations.forEach((observation, index) =>
    validateObservation(observation, pathForArrayItem("$.observations", index))
  );

  const rules = expectArray(root.rules, "$.rules");
  rules.forEach((rule, index) => validateRule(rule, pathForArrayItem("$.rules", index)));

  assertUniqueIdentity(claims, "Claim", "$.claims");
  assertUniqueIdentity(evidenceContracts, "Evidence Contract", "$.evidenceContracts");
  assertUniqueIdentity(evidenceRequirements, "Evidence Requirement", "$.evidenceRequirements");
  assertUniqueIdentity(observations, "Observation", "$.observations");
  assertUniqueIdentity(rules, "Rule", "$.rules");

  validateReferences(root);

  return /** @type {KernelEvaluationInput} */ (/** @type {unknown} */ (root));
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {WeakSet<object>} stack
 * @returns {void}
 */
function scanAuthoritativeValue(value, path, stack) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throwBoundaryError("NON_JSON_VALUE", path, "numbers must be finite JSON numbers");
    }
    return;
  }

  if (typeof value === "undefined" || typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    throwBoundaryError("NON_JSON_VALUE", path, `${typeof value} is not JSON-compatible`);
  }

  if (typeof value !== "object") {
    throwBoundaryError("NON_JSON_VALUE", path, "value is not JSON-compatible");
  }

  assertNotProxyInput(value, path);

  if (value instanceof Date) {
    throwBoundaryError("NON_JSON_VALUE", path, "Date is not an authoritative JSON value");
  }
  if (value instanceof Map) {
    throwBoundaryError("NON_JSON_VALUE", path, "Map is not an authoritative JSON value");
  }
  if (value instanceof Set) {
    throwBoundaryError("NON_JSON_VALUE", path, "Set is not an authoritative JSON value");
  }

  if (stack.has(value)) {
    throwBoundaryError("CYCLIC_INPUT", path, "cyclic authoritative input is not allowed");
  }
  stack.add(value);

  if (Array.isArray(value)) {
    const length = validateAuthoritativeArrayContainer(value, path);
    for (let index = 0; index < length; index += 1) {
      scanAuthoritativeValue(value[index], pathForArrayItem(path, index), stack);
    }
    stack.delete(value);
    return;
  }

  if (!isPlainObject(value)) {
    throwBoundaryError("NON_PLAIN_OBJECT", path, "authoritative records must be plain objects");
  }

  for (const key of ownEnumerableStringKeys(value, path)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN_AUTHORITY_FIELDS.has(key)) {
      throwBoundaryError("FORBIDDEN_AUTHORITY_FIELD", childPath, `${key} is not accepted by the kernel boundary`);
    }
    scanAuthoritativeValue(value[key], childPath, stack);
  }
  stack.delete(value);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateEvaluation(value, path) {
  const evaluation = expectPlainObject(value, path);
  assertKnownFields(evaluation, ["id"], path);
  expectStableIdentity(evaluation.id, `${path}.id`);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateClaim(value, path) {
  const claim = expectPlainObject(value, path);
  assertKnownFields(claim, ["id", "targetScopeId", "statement"], path);
  expectStableIdentity(claim.id, `${path}.id`);
  expectStableIdentity(claim.targetScopeId, `${path}.targetScopeId`);
  expectNonEmptyString(claim.statement, `${path}.statement`);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateEvidenceContract(value, path) {
  const contract = expectPlainObject(value, path);
  assertKnownFields(contract, ["id", "version", "targetScopeId", "selectionProvenance", "requirementIds"], path);
  expectStableIdentity(contract.id, `${path}.id`);
  expectNonEmptyString(contract.version, `${path}.version`);
  expectStableIdentity(contract.targetScopeId, `${path}.targetScopeId`);
  validateEvidenceContractSelectionProvenance(contract.selectionProvenance, `${path}.selectionProvenance`);
  const requirementIds = expectArray(contract.requirementIds, `${path}.requirementIds`, { minLength: 1 });
  requirementIds.forEach((requirementId, index) =>
    expectStableIdentity(requirementId, pathForArrayItem(`${path}.requirementIds`, index))
  );
  assertUniquePrimitiveStrings(requirementIds, `${path}.requirementIds`);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateEvidenceContractSelectionProvenance(value, path) {
  const provenance = expectPlainObject(value, path);
  const source = expectNonEmptyString(provenance.source, `${path}.source`);
  if (source === "TRUSTED_CONFIGURATION") {
    assertKnownFields(provenance, ["source", "configurationId", "configurationVersion"], path);
    expectStableIdentity(provenance.configurationId, `${path}.configurationId`);
    expectNonEmptyString(provenance.configurationVersion, `${path}.configurationVersion`);
    return;
  }
  if (source === "DETERMINISTIC_POLICY_SELECTION") {
    assertKnownFields(provenance, ["source", "policyId", "policyVersion"], path);
    expectStableIdentity(provenance.policyId, `${path}.policyId`);
    expectNonEmptyString(provenance.policyVersion, `${path}.policyVersion`);
    return;
  }
  throwBoundaryError("INVALID_EVIDENCE_CONTRACT_SELECTION_PROVENANCE", `${path}.source`, "selection source is not authorized for Phase 1");
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateEvidenceRequirement(value, path) {
  const requirement = expectPlainObject(value, path);
  assertKnownFields(
    requirement,
    ["id", "evidenceContractId", "targetScopeId", "requiredObserver", "factKey", "expectedValue"],
    path
  );
  expectStableIdentity(requirement.id, `${path}.id`);
  expectStableIdentity(requirement.evidenceContractId, `${path}.evidenceContractId`);
  expectStableIdentity(requirement.targetScopeId, `${path}.targetScopeId`);
  validateObserverReference(requirement.requiredObserver, `${path}.requiredObserver`);
  expectNonEmptyString(requirement.factKey, `${path}.factKey`);
  expectJsonPrimitive(requirement.expectedValue, `${path}.expectedValue`);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateObserverReference(value, path) {
  const observer = expectPlainObject(value, path);
  assertKnownFields(observer, ["id", "version"], path);
  expectStableIdentity(observer.id, `${path}.id`);
  expectNonEmptyString(observer.version, `${path}.version`);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateObservation(value, path) {
  const observation = expectPlainObject(value, path);
  assertKnownFields(
    observation,
    ["id", "observer", "targetScopeId", "factKey", "factValue", "sourceInputId", "orderingKey", "limitations"],
    path
  );
  expectStableIdentity(observation.id, `${path}.id`);
  validateObserverReference(observation.observer, `${path}.observer`);
  expectStableIdentity(observation.targetScopeId, `${path}.targetScopeId`);
  expectNonEmptyString(observation.factKey, `${path}.factKey`);
  expectJsonPrimitive(observation.factValue, `${path}.factValue`);
  expectStableIdentity(observation.sourceInputId, `${path}.sourceInputId`);
  expectNonEmptyString(observation.orderingKey, `${path}.orderingKey`);
  const limitations = expectArray(observation.limitations, `${path}.limitations`);
  limitations.forEach((limitation, index) =>
    expectNonEmptyString(limitation, pathForArrayItem(`${path}.limitations`, index))
  );
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateRule(value, path) {
  const rule = expectPlainObject(value, path);
  assertKnownFields(rule, ["id", "predicate", "effect", "authority"], path);
  expectStableIdentity(rule.id, `${path}.id`);
  validateRulePredicate(rule.predicate, `${path}.predicate`);
  validateRuleEffect(rule.effect, `${path}.effect`);
  validateRuleAuthority(rule.authority, `${path}.authority`);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateRulePredicate(value, path) {
  const predicate = expectPlainObject(value, path);
  const kind = expectNonEmptyString(predicate.kind, `${path}.kind`);
  if (kind !== "EVIDENCE_PRESENT" && kind !== "EVIDENCE_ABSENT") {
    throwBoundaryError("INVALID_RULE_PREDICATE", `${path}.kind`, "Rule predicate is outside the Phase 1 scope");
  }
  assertKnownFields(predicate, ["kind", "evidenceRequirementId"], path);
  expectStableIdentity(predicate.evidenceRequirementId, `${path}.evidenceRequirementId`);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateRuleEffect(value, path) {
  const effect = expectPlainObject(value, path);
  assertKnownFields(effect, ["kind", "reasonCode"], path);
  expectLiteral(effect.kind, "DENY", `${path}.kind`);
  const reasonCode = expectNonEmptyString(effect.reasonCode, `${path}.reasonCode`);
  if (!REASON_CODE_PATTERN.test(reasonCode)) {
    throwBoundaryError("INVALID_REASON_CODE", `${path}.reasonCode`, "reason codes must be stable uppercase tokens");
  }
  if (reasonCode.startsWith("HARN_")) {
    throwBoundaryError("RESERVED_REASON_CODE_NAMESPACE", `${path}.reasonCode`, "Foundation HARN_ reason codes are not product kernel reason codes");
  }
  if (reasonCode === MISSING_EVIDENCE_REASON_CODE) {
    throwBoundaryError("RESERVED_KERNEL_REASON_CODE", `${path}.reasonCode`, "kernel-owned condition reason code is not a Rule reason code");
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function validateRuleAuthority(value, path) {
  const authority = expectPlainObject(value, path);
  const source = expectNonEmptyString(authority.source, `${path}.source`);
  if (source === "TRUSTED_CONFIGURATION") {
    assertKnownFields(authority, ["source", "configurationId", "configurationVersion"], path);
    expectStableIdentity(authority.configurationId, `${path}.configurationId`);
    expectNonEmptyString(authority.configurationVersion, `${path}.configurationVersion`);
    return;
  }
  if (source === "POLICY") {
    assertKnownFields(authority, ["source", "policyId", "policyVersion"], path);
    expectStableIdentity(authority.policyId, `${path}.policyId`);
    expectNonEmptyString(authority.policyVersion, `${path}.policyVersion`);
    return;
  }
  throwBoundaryError("INVALID_RULE_AUTHORITY_PROVENANCE", `${path}.source`, "Rule authority source is not authorized for Phase 1");
}

/**
 * @param {Record<string, unknown>} root
 * @returns {void}
 */
function validateReferences(root) {
  const claims = /** @type {Record<string, unknown>[]} */ (root.claims);
  const evidenceContracts = /** @type {Record<string, unknown>[]} */ (root.evidenceContracts);
  const evidenceRequirements = /** @type {Record<string, unknown>[]} */ (root.evidenceRequirements);
  const observations = /** @type {Record<string, unknown>[]} */ (root.observations);
  const rules = /** @type {Record<string, unknown>[]} */ (root.rules);

  const claimScopeIds = new Set(claims.map((claim) => String(claim.targetScopeId)));
  const contractById = mapById(evidenceContracts);
  const requirementById = mapById(evidenceRequirements);

  for (const contract of evidenceContracts) {
    const contractId = String(contract.id);
    const contractScopeId = String(contract.targetScopeId);
    if (!claimScopeIds.has(contractScopeId)) {
      throwBoundaryError("TARGET_SCOPE_MISMATCH", "$.evidenceContracts", `Evidence Contract ${contractId} does not match any Claim target scope`);
    }
    const requirementIds = /** @type {string[]} */ (contract.requirementIds);
    for (const requirementId of requirementIds) {
      const requirement = requirementById.get(requirementId);
      if (!requirement) {
        throwBoundaryError("INVALID_REFERENCE", "$.evidenceContracts", `Evidence Contract ${contractId} references unknown Evidence Requirement ${requirementId}`);
      }
      if (String(requirement.evidenceContractId) !== contractId) {
        throwBoundaryError("INVALID_REFERENCE", "$.evidenceRequirements", `Evidence Requirement ${requirementId} does not reference Evidence Contract ${contractId}`);
      }
      if (String(requirement.targetScopeId) !== contractScopeId) {
        throwBoundaryError("TARGET_SCOPE_MISMATCH", "$.evidenceRequirements", `Evidence Requirement ${requirementId} target scope differs from Evidence Contract ${contractId}`);
      }
    }
  }

  for (const claim of claims) {
    const claimId = String(claim.id);
    const claimScopeId = String(claim.targetScopeId);
    const coveringContract = evidenceContracts.find((contract) => String(contract.targetScopeId) === claimScopeId);
    if (!coveringContract) {
      throwBoundaryError("TARGET_SCOPE_MISMATCH", "$.claims", `Claim ${claimId} target scope has no selected Evidence Contract`);
    }
  }

  for (const requirement of evidenceRequirements) {
    const requirementId = String(requirement.id);
    const contract = contractById.get(String(requirement.evidenceContractId));
    if (!contract) {
      throwBoundaryError("INVALID_REFERENCE", "$.evidenceRequirements", `Evidence Requirement ${requirementId} references unknown Evidence Contract`);
    }
    const contractRequirementIds = new Set(/** @type {string[]} */ (contract.requirementIds));
    if (!contractRequirementIds.has(requirementId)) {
      throwBoundaryError("INVALID_REFERENCE", "$.evidenceRequirements", `Evidence Requirement ${requirementId} is not declared by its Evidence Contract`);
    }
  }

  const declaredEvaluationScopeIds = new Set(evidenceContracts.map((contract) => String(contract.targetScopeId)));
  observations.forEach((observation, index) => {
    const observationScopeId = String(observation.targetScopeId);
    if (!declaredEvaluationScopeIds.has(observationScopeId)) {
      throwBoundaryError(
        "TARGET_SCOPE_MISMATCH",
        `${pathForArrayItem("$.observations", index)}.targetScopeId`,
        `Observation ${String(observation.id)} target scope is outside the declared evaluation scope`
      );
    }
  });

  for (const rule of rules) {
    const predicate = /** @type {Record<string, unknown>} */ (rule.predicate);
    const requirementId = String(predicate.evidenceRequirementId);
    if (!requirementById.has(requirementId)) {
      throwBoundaryError("INVALID_REFERENCE", "$.rules", `Rule ${String(rule.id)} references unknown Evidence Requirement ${requirementId}`);
    }
  }
}

/**
 * @param {unknown[]} value
 * @param {string} path
 * @returns {number}
 */
function validateAuthoritativeArrayContainer(value, path) {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throwBoundaryError("INVALID_ARRAY", path, "authoritative arrays must use the ordinary Array.prototype");
  }

  const descriptors = /** @type {Record<string | symbol, PropertyDescriptor>} */ (
    /** @type {unknown} */ (Object.getOwnPropertyDescriptors(value))
  );
  const lengthDescriptor = descriptors.length;
  if (
    lengthDescriptor === undefined ||
    lengthDescriptor.get !== undefined ||
    lengthDescriptor.set !== undefined ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0 ||
    lengthDescriptor.enumerable
  ) {
    throwBoundaryError("INVALID_ARRAY", `${path}.length`, "authoritative array length must be the ordinary Array length property");
  }

  const length = lengthDescriptor.value;
  let indexPropertyCount = 0;

  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key === "symbol") {
      throwBoundaryError("SYMBOL_KEY", path, "symbol-keyed authoritative array properties are not accepted");
    }

    const descriptor = descriptors[key];
    if (descriptor === undefined) {
      throwBoundaryError("UNEXPECTED_FIELD", `${path}.${key}`, "unknown authoritative array property");
    }

    if (key === "length") {
      continue;
    }

    const propertyPath = pathForArrayProperty(path, key);
    if (FORBIDDEN_AUTHORITY_FIELDS.has(key)) {
      throwBoundaryError("FORBIDDEN_AUTHORITY_FIELD", propertyPath, `${key} is not accepted by the kernel boundary`);
    }
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throwBoundaryError("ACCESSOR_FIELD", propertyPath, "accessor-backed authoritative array properties are not accepted");
    }
    if (!descriptor.enumerable) {
      throwBoundaryError("NON_ENUMERABLE_FIELD", propertyPath, "non-enumerable authoritative array properties are not accepted");
    }

    const index = canonicalArrayIndexFromKey(key);
    if (index === undefined || index >= length) {
      throwBoundaryError("UNEXPECTED_FIELD", propertyPath, "unexpected authoritative array property");
    }
    indexPropertyCount += 1;
  }

  if (indexPropertyCount !== length) {
    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(descriptors, String(index))) {
        throwBoundaryError("INVALID_ARRAY", pathForArrayItem(path, index), "sparse authoritative arrays are not accepted");
      }
    }
    throwBoundaryError("INVALID_ARRAY", path, "authoritative array properties must cover every index");
  }

  return length;
}

/**
 * @param {unknown[]} records
 * @param {string} label
 * @param {string} path
 * @returns {void}
 */
function assertUniqueIdentity(records, label, path) {
  const seen = new Set();
  records.forEach((record, index) => {
    const identity = String(/** @type {Record<string, unknown>} */ (record).id);
    if (seen.has(identity)) {
      throwBoundaryError("DUPLICATE_IDENTITY", pathForArrayItem(path, index), `${label} identity ${identity} is duplicated`);
    }
    seen.add(identity);
  });
}

/**
 * @param {unknown[]} values
 * @param {string} path
 * @returns {void}
 */
function assertUniquePrimitiveStrings(values, path) {
  const seen = new Set();
  values.forEach((value, index) => {
    const text = String(value);
    if (seen.has(text)) {
      throwBoundaryError("DUPLICATE_IDENTITY", pathForArrayItem(path, index), `identity ${text} is duplicated`);
    }
    seen.add(text);
  });
}

/**
 * @param {Record<string, unknown>[]} records
 * @returns {Map<string, Record<string, unknown>>}
 */
function mapById(records) {
  const mapped = new Map();
  for (const record of records) {
    mapped.set(String(record.id), record);
  }
  return mapped;
}

/**
 * @param {Record<string, unknown>} record
 * @param {readonly string[]} allowedFields
 * @param {string} path
 * @returns {void}
 */
function assertKnownFields(record, allowedFields, path) {
  const allowed = new Set(allowedFields);
  for (const field of ownEnumerableStringKeys(record, path)) {
    if (FORBIDDEN_AUTHORITY_FIELDS.has(field)) {
      throwBoundaryError("FORBIDDEN_AUTHORITY_FIELD", `${path}.${field}`, `${field} is not accepted by the kernel boundary`);
    }
    if (!allowed.has(field)) {
      throwBoundaryError("UNEXPECTED_FIELD", `${path}.${field}`, "unknown authoritative input field");
    }
  }
  for (const field of allowedFields) {
    if (!Object.hasOwn(record, field)) {
      throwBoundaryError("MISSING_FIELD", `${path}.${field}`, "required authoritative input field is missing");
    }
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {Record<string, unknown>}
 */
function expectPlainObject(value, path) {
  if (!isPlainObject(value)) {
    throwBoundaryError("NON_PLAIN_OBJECT", path, "expected a plain object");
  }
  return value;
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {{ minLength?: number }} [options]
 * @returns {unknown[]}
 */
function expectArray(value, path, options = {}) {
  if (!Array.isArray(value)) {
    throwBoundaryError("INVALID_ARRAY", path, "expected an array");
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    throwBoundaryError("INVALID_ARRAY", path, `expected at least ${options.minLength} item(s)`);
  }
  return value;
}

/**
 * @param {unknown} value
 * @param {string} expected
 * @param {string} path
 * @returns {void}
 */
function expectLiteral(value, expected, path) {
  if (value !== expected) {
    throwBoundaryError("INVALID_LITERAL", path, `expected ${expected}`);
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {string}
 */
function expectNonEmptyString(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    throwBoundaryError("INVALID_STRING", path, "expected a non-empty string");
  }
  return value;
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function expectStableIdentity(value, path) {
  const identity = expectNonEmptyString(value, path);
  if (!STABLE_IDENTITY_PATTERN.test(identity)) {
    throwBoundaryError("INVALID_STABLE_IDENTITY", path, "identity contains unsupported characters");
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {void}
 */
function expectJsonPrimitive(value, path) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return;
  }
  throwBoundaryError("INVALID_JSON_PRIMITIVE", path, "expected a JSON primitive");
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {unknown}
 */
function cloneJsonCompatible(value, path) {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "undefined" || typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    throwBoundaryError("NON_JSON_VALUE", path, `${typeof value} is not JSON-compatible`);
  }
  if (typeof value !== "object") {
    throwBoundaryError("NON_JSON_VALUE", path, "value is not JSON-compatible");
  }
  assertNotProxyInput(value, path);
  if (Array.isArray(value)) {
    const length = validateAuthoritativeArrayContainer(value, path);
    /** @type {unknown[]} */
    const cloned = [];
    for (let index = 0; index < length; index += 1) {
      cloned[index] = cloneJsonCompatible(value[index], pathForArrayItem(path, index));
    }
    return cloned;
  }
  const record = expectPlainObject(value, path);
  /** @type {Record<string, unknown>} */
  const cloned = {};
  for (const key of ownEnumerableStringKeys(record, path)) {
    cloned[key] = cloneJsonCompatible(record[key], `${path}.${key}`);
  }
  return cloned;
}

/**
 * @param {object} value
 * @param {string} path
 * @returns {void}
 */
function assertNotProxyInput(value, path) {
  if (nodeUtilTypes.isProxy(value)) {
    throwBoundaryError("PROXY_INPUT", path, "Proxy-backed authoritative values are not accepted");
  }
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} path
 * @returns {string[]}
 */
function ownEnumerableStringKeys(record, path) {
  const descriptors = Object.getOwnPropertyDescriptors(record);
  /** @type {string[]} */
  const keys = [];
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key === "symbol") {
      throwBoundaryError("SYMBOL_KEY", path, "symbol-keyed authoritative fields are not accepted");
    }
    const descriptor = descriptors[key];
    if (descriptor === undefined) {
      throwBoundaryError("UNEXPECTED_FIELD", `${path}.${key}`, "unknown authoritative input field");
    }
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      throwBoundaryError("ACCESSOR_FIELD", `${path}.${key}`, "accessor-backed authoritative fields are not accepted");
    }
    if (!descriptor.enumerable) {
      throwBoundaryError("NON_ENUMERABLE_FIELD", `${path}.${key}`, "non-enumerable authoritative fields are not accepted");
    }
    keys.push(key);
  }
  return keys;
}

/**
 * @param {string} arrayPath
 * @param {number} index
 * @returns {string}
 */
function pathForArrayItem(arrayPath, index) {
  return `${arrayPath}[${index}]`;
}

/**
 * @param {string} arrayPath
 * @param {string} key
 * @returns {string}
 */
function pathForArrayProperty(arrayPath, key) {
  const index = canonicalArrayIndexFromKey(key);
  return index === undefined ? `${arrayPath}.${key}` : pathForArrayItem(arrayPath, index);
}

/**
 * @param {string} key
 * @returns {number | undefined}
 */
function canonicalArrayIndexFromKey(key) {
  if (!ARRAY_INDEX_PATTERN.test(key)) {
    return undefined;
  }
  const index = Number(key);
  if (!Number.isSafeInteger(index) || index > MAX_ARRAY_INDEX || String(index) !== key) {
    return undefined;
  }
  return index;
}

/**
 * @param {string} issueCategory
 * @param {string} path
 * @param {string} detail
 * @returns {never}
 */
function throwBoundaryError(issueCategory, path, detail) {
  throw new KernelBoundaryError(issueCategory, path, detail);
}
