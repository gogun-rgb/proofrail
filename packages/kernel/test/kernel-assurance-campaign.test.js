// @ts-check

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateKernel, KernelBoundaryError } from "../src/index.js";
import { canonicalJson } from "../src/canonical-json.js";
import { reduceVerdictCandidates } from "../src/verdict-reduction.js";
import { MISSING_EVIDENCE_REASON_CODE } from "../src/kernel-reason-codes.js";
import { makeInput, clone, lineageKinds } from "./helpers.js";

/** @typedef {import("@proofrail/contracts").JsonPrimitive} JsonPrimitive */
/** @typedef {import("@proofrail/contracts").KernelEvaluationInput} KernelEvaluationInput */
/** @typedef {import("@proofrail/contracts").Rule} Rule */
/** @typedef {import("@proofrail/contracts").Verdict} Verdict */
/** @typedef {import("@proofrail/contracts").VerdictCandidate} VerdictCandidate */

/**
 * @typedef {{
 *   readonly id: string,
 *   readonly family: string,
 *   readonly run: () => void
 * }} AssuranceCase
 */

/** @type {readonly { readonly label: string, readonly value: JsonPrimitive }[]} */
const JSON_PRIMITIVES = Object.freeze([
  { label: "null", value: null },
  { label: "bool-false", value: false },
  { label: "bool-true", value: true },
  { label: "string-empty", value: "" },
  { label: "string-zero", value: "0" },
  { label: "string-word", value: "stable" },
  { label: "number-zero", value: 0 },
  { label: "number-negative-zero", value: -0 },
  { label: "number-one", value: 1 },
  { label: "number-negative-one", value: -1 },
  { label: "number-decimal", value: 1.25 },
  { label: "number-large", value: 9007199254740991 }
]);

/** @type {readonly Verdict[]} */
const VERDICTS = Object.freeze([
  "ADMISSIBLE",
  "REVISION_REQUIRED",
  "REJECTED",
  "BLOCKED"
]);

/** @type {ReadonlyMap<Verdict, number>} */
const VERDICT_RANK = new Map(VERDICTS.map((verdict, index) => [verdict, index]));

/** @type {readonly string[]} */
const FORBIDDEN_AUTHORITY_FIELDS = Object.freeze([
  "modelConfidence",
  "inferenceProposal",
  "proposedContent"
]);

/** @type {readonly AssuranceCase[]} */
const CAMPAIGN_CASES = Object.freeze([
  ...makePrimitiveDistinctionCases(),
  ...makePermutationCases(),
  ...makeRuleMatrixCases(),
  ...makeVerdictReferenceCases(),
  ...makeBoundaryShapeCases(),
  ...makeLineageAndIsolationCases(),
  ...makeCanonicalSerializationCases()
].sort(compareCaseIds));

test("KERNEL-ASSURE-001 campaign manifest is deterministic and broad", () => {
  const ids = CAMPAIGN_CASES.map((item) => item.id);
  const families = countBy(CAMPAIGN_CASES.map((item) => item.family));

  assert.equal(ids.length, new Set(ids).size, "case identities are unique");
  assert.deepEqual(ids, [...ids].sort(compareStrings), "case generation order is stable");
  assert.equal(CAMPAIGN_CASES.length >= 256, true, "campaign case count");
  assert.equal(families.get("primitive") ?? 0, 144);
  assert.equal((families.get("boundary-record") ?? 0) > 0, true);
  assert.equal((families.get("boundary-array") ?? 0) > 0, true);
  assert.equal((families.get("verdict-reference") ?? 0) > 0, true);
  assert.equal((families.get("rule-matrix") ?? 0) > 0, true);
});

test("KERNEL-ASSURE-001 deterministic assurance cases", async (t) => {
  for (const item of CAMPAIGN_CASES) {
    await t.test(item.id, item.run);
  }
});

/**
 * @returns {AssuranceCase[]}
 */
function makePrimitiveDistinctionCases() {
  /** @type {AssuranceCase[]} */
  const cases = [];
  for (const expected of JSON_PRIMITIVES) {
    for (const fact of JSON_PRIMITIVES) {
      cases.push({
        id: `primitive/${expected.label}/fact/${fact.label}`,
        family: "primitive",
        run() {
          const input = makeInput();
          setFirst(input.evidenceRequirements, "Evidence Requirement").expectedValue = expected.value;
          setFirst(input.observations, "Observation").factValue = fact.value;

          const bundle = evaluateKernel(input);
          const samePrimitive = canonicalJson(expected.value) === canonicalJson(fact.value);

          assert.equal(bundle.evaluationId, "eval.phase1");
          assert.equal(bundle.evidenceRequirements[0]?.id, "req.has-lockfile");
          assert.equal(bundle.evidence[0]?.requirementId ?? "missing", samePrimitive ? "req.has-lockfile" : "missing");
          assert.equal(bundle.verdict, samePrimitive ? "ADMISSIBLE" : "REVISION_REQUIRED");
          assert.deepEqual(bundle.reasonCodes, samePrimitive ? [] : [MISSING_EVIDENCE_REASON_CODE]);
          assert.equal(Object.is(expected.value, -0) || Object.is(fact.value, -0) ? canonicalJson(-0) : "0", "0");
        }
      });
    }
  }
  return cases;
}

/**
 * @returns {AssuranceCase[]}
 */
function makePermutationCases() {
  /** @type {AssuranceCase[]} */
  const cases = [];
  for (let index = 0; index < 16; index += 1) {
    cases.push({
      id: `permutation/equivalent-input-${String(index).padStart(2, "0")}`,
      family: "permutation",
      run() {
        const base = makePermutationBaseInput(index);
        const permuted = permuteSemanticallyUnorderedInput(base);
        const first = evaluateKernel(clone(base));
        const second = evaluateKernel(clone(permuted));
        const repeated = evaluateKernel(clone(base));

        assert.deepEqual(second, first);
        assert.deepEqual(repeated, first);
        assert.equal(second.id, first.id);
        assert.equal(repeated.id, first.id);
        assert.deepEqual(
          first.evidence.map((record) => record.acceptedObservationIds),
          second.evidence.map((record) => record.acceptedObservationIds)
        );
      }
    });
  }
  return cases;
}

/**
 * @returns {AssuranceCase[]}
 */
function makeRuleMatrixCases() {
  /** @type {AssuranceCase[]} */
  const cases = [];
  for (let presenceMask = 0; presenceMask < 4; presenceMask += 1) {
    for (let predicateMask = 0; predicateMask < 4; predicateMask += 1) {
      cases.push({
        id: `rule-matrix/presence-${presenceMask}/predicates-${predicateMask}`,
        family: "rule-matrix",
        run() {
          const requirementIds = ["req.alpha", "req.beta"];
          const presentRequirementIds = requirementIds.filter((_, index) => (presenceMask & (1 << index)) !== 0);
          const rules = requirementIds.map((requirementId, index) =>
            validRule(
              `rule.matrix.${index}`,
              requirementId,
              (predicateMask & (1 << index)) === 0 ? "EVIDENCE_PRESENT" : "EVIDENCE_ABSENT",
              `KERNEL_MATRIX_${index}`
            )
          ).reverse();
          const bundle = evaluateKernel(makeRequirementInput(requirementIds, presentRequirementIds, rules));
          const triggeredReasonCodes = rules
            .filter((rule) => {
              const present = presentRequirementIds.includes(rule.predicate.evidenceRequirementId);
              return rule.predicate.kind === "EVIDENCE_PRESENT" ? present : !present;
            })
            .map((rule) => rule.effect.reasonCode)
            .sort(compareStrings);
          const absentRequirementCount = requirementIds.length - presentRequirementIds.length;
          const missingReasonCodes = absentRequirementCount === 0
            ? []
            : [MISSING_EVIDENCE_REASON_CODE];
          const expectedReasonCodes = [...triggeredReasonCodes, ...missingReasonCodes].sort(compareStrings);
          const expectedCandidateCount = triggeredReasonCodes.length + (
            absentRequirementCount > 0
              ? absentRequirementCount
              : triggeredReasonCodes.length === 0
                ? 1
                : 0
          );

          assert.equal(
            bundle.verdict,
            triggeredReasonCodes.length > 0
              ? "REJECTED"
              : presentRequirementIds.length === requirementIds.length
                ? "ADMISSIBLE"
                : "REVISION_REQUIRED"
          );
          assert.deepEqual(bundle.reasonCodes, expectedReasonCodes);
          assert.equal(bundle.verdictReduction.candidateIds.length, expectedCandidateCount);
          assert.equal(
            bundle.evidenceLineage.filter((entry) => entry.kind === "RULE_EVALUATED").length,
            2
          );
        }
      });
    }
  }
  return cases;
}

/**
 * @returns {AssuranceCase[]}
 */
function makeVerdictReferenceCases() {
  /** @type {AssuranceCase[]} */
  const cases = [];
  for (let mask = 1; mask < (1 << VERDICTS.length); mask += 1) {
    const selectedVerdicts = VERDICTS.filter((_, index) => (mask & (1 << index)) !== 0);
    cases.push({
      id: `verdict-reference/mask-${String(mask).padStart(2, "0")}`,
      family: "verdict-reference",
      run() {
        const candidates = selectedVerdicts
          .map((verdict, index) => candidate(`candidate.${index}.${verdict.toLowerCase()}`, verdict))
          .reverse();
        const actual = reduceVerdictCandidates(candidates);
        const expected = referenceReduce(candidates);

        assert.deepEqual(actual, expected);
        assert.equal(actual.verdict, selectedVerdicts.reduce(maxVerdictByReference, "ADMISSIBLE"));
        assert.deepEqual(actual.reasonCodes, expected.reasonCodes);
        assert.deepEqual(actual.lineageIds, expected.lineageIds);
      }
    });
  }
  return cases;
}

/**
 * @returns {AssuranceCase[]}
 */
function makeBoundaryShapeCases() {
  return [
    ...makeRecordShapeCases(),
    ...makeArrayShapeCases(),
    ...makeInvalidValueCases(),
    ...makeExecutableWrapperCases(),
    ...makeReferenceAndProvenanceCases()
  ];
}

/**
 * @returns {AssuranceCase[]}
 */
function makeRecordShapeCases() {
  /** @type {AssuranceCase[]} */
  const cases = [];
  for (const target of recordTargets()) {
    cases.push({
      id: `boundary-record/${target.id}/unknown-field`,
      family: "boundary-record",
      run() {
        const input = makeBoundaryInput();
        target.get(input).unexpected = "not-authoritative";
        assertBoundaryIssue(input, "UNEXPECTED_FIELD", `${target.path}.unexpected`);
      }
    });
    for (const field of FORBIDDEN_AUTHORITY_FIELDS) {
      cases.push({
        id: `boundary-record/${target.id}/forbidden-${field}`,
        family: "boundary-record",
        run() {
          const input = makeBoundaryInput();
          target.get(input)[field] = { proposed: true };
          assertBoundaryIssue(input, "FORBIDDEN_AUTHORITY_FIELD", `${target.path}.${field}`);
        }
      });
    }
    cases.push({
      id: `boundary-record/${target.id}/symbol-field`,
      family: "boundary-record",
      run() {
        const input = makeBoundaryInput();
        target.get(input)[Symbol("authority")] = "hidden";
        assertBoundaryIssue(input, "SYMBOL_KEY", target.path);
      }
    });
    cases.push({
      id: `boundary-record/${target.id}/non-enumerable-field`,
      family: "boundary-record",
      run() {
        const input = makeBoundaryInput();
        Object.defineProperty(target.get(input), "hidden", {
          value: true,
          enumerable: false
        });
        assertBoundaryIssue(input, "NON_ENUMERABLE_FIELD", `${target.path}.hidden`);
      }
    });
    cases.push({
      id: `boundary-record/${target.id}/accessor-field`,
      family: "boundary-record",
      run() {
        const input = makeBoundaryInput();
        let getterCount = 0;
        Object.defineProperty(target.get(input), "poison", {
          enumerable: true,
          get() {
            getterCount += 1;
            return "executed";
          }
        });
        assertBoundaryIssue(input, "ACCESSOR_FIELD", `${target.path}.poison`);
        assert.equal(getterCount, 0);
      }
    });
  }

  for (const target of ["root", "observation", "rule-effect"]) {
    cases.push({
      id: `boundary-record/${target}/own-proto-key`,
      family: "boundary-record",
      run() {
        const input = makeBoundaryInput();
        const record = recordTargets().find((item) => item.id === target);
        assert.ok(record);
        defineEnumerableData(record.get(input), "__proto__", "proto-data");
        assertBoundaryIssue(input, "UNEXPECTED_FIELD", `${record.path}.__proto__`);
      }
    });
  }

  cases.push({
    id: "boundary-record/root-cycle",
    family: "boundary-record",
    run() {
      const input = makeBoundaryInput();
      input.cycle = input;
      assertBoundaryIssue(input, "CYCLIC_INPUT", "$.cycle");
    }
  });

  cases.push({
    id: "boundary-record/nested-cycle",
    family: "boundary-record",
    run() {
      const input = makeBoundaryInput();
      setFirst(input.observations, "Observation").cycle = input;
      assertBoundaryIssue(input, "CYCLIC_INPUT", "$.observations[0].cycle");
    }
  });

  return cases;
}

/**
 * @returns {AssuranceCase[]}
 */
function makeArrayShapeCases() {
  /** @type {AssuranceCase[]} */
  const cases = [];
  for (const target of arrayTargets()) {
    for (const field of FORBIDDEN_AUTHORITY_FIELDS) {
      cases.push({
        id: `boundary-array/${target.id}/forbidden-${field}`,
        family: "boundary-array",
        run() {
          const input = makeBoundaryInput();
          target.get(input)[field] = { proposed: true };
          assertBoundaryIssue(input, "FORBIDDEN_AUTHORITY_FIELD", `${target.path}.${field}`);
        }
      });
    }
    cases.push({
      id: `boundary-array/${target.id}/symbol-field`,
      family: "boundary-array",
      run() {
        const input = makeBoundaryInput();
        target.get(input)[Symbol("authority")] = "hidden";
        assertBoundaryIssue(input, "SYMBOL_KEY", target.path);
      }
    });
    cases.push({
      id: `boundary-array/${target.id}/non-enumerable-field`,
      family: "boundary-array",
      run() {
        const input = makeBoundaryInput();
        Object.defineProperty(target.get(input), "hidden", {
          value: true,
          enumerable: false
        });
        assertBoundaryIssue(input, "NON_ENUMERABLE_FIELD", `${target.path}.hidden`);
      }
    });
    cases.push({
      id: `boundary-array/${target.id}/accessor-index`,
      family: "boundary-array",
      run() {
        const input = makeBoundaryInput();
        let getterCount = 0;
        Object.defineProperty(target.get(input), "0", {
          configurable: true,
          enumerable: true,
          get() {
            getterCount += 1;
            return "executed";
          }
        });
        assertBoundaryIssue(input, "ACCESSOR_FIELD", `${target.path}[0]`);
        assert.equal(getterCount, 0);
      }
    });
    cases.push({
      id: `boundary-array/${target.id}/sparse`,
      family: "boundary-array",
      run() {
        const input = makeBoundaryInput();
        delete target.get(input)[0];
        assertBoundaryIssue(input, "INVALID_ARRAY", `${target.path}[0]`);
      }
    });
    cases.push({
      id: `boundary-array/${target.id}/extra-string-property`,
      family: "boundary-array",
      run() {
        const input = makeBoundaryInput();
        target.get(input).extra = "unexpected";
        assertBoundaryIssue(input, "UNEXPECTED_FIELD", `${target.path}.extra`);
      }
    });
    cases.push({
      id: `boundary-array/${target.id}/non-ordinary-prototype`,
      family: "boundary-array",
      run() {
        const input = makeBoundaryInput();
        Object.setPrototypeOf(target.get(input), null);
        assertBoundaryIssue(input, "INVALID_ARRAY", target.path);
      }
    });
  }
  return cases;
}

/**
 * @returns {AssuranceCase[]}
 */
function makeInvalidValueCases() {
  const invalidValues = [
    { label: "date", value: new Date("2026-01-01T00:00:00Z") },
    { label: "map", value: new Map([["key", "value"]]) },
    { label: "set", value: new Set(["value"]) },
    { label: "function", value: () => "not-json" },
    { label: "bigint", value: 1n },
    { label: "undefined", value: undefined },
    { label: "nan", value: Number.NaN },
    { label: "infinity", value: Number.POSITIVE_INFINITY }
  ];

  return invalidValues.flatMap((item) => [
    {
      id: `boundary-value/root-${item.label}`,
      family: "boundary-value",
      run() {
        assertBoundaryIssue(item.value, "NON_JSON_VALUE", "$");
      }
    },
    {
      id: `boundary-value/observation-fact-${item.label}`,
      family: "boundary-value",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.observations, "Observation").factValue = item.value;
        assertBoundaryIssue(input, "NON_JSON_VALUE", "$.observations[0].factValue");
      }
    }
  ]);
}

/**
 * @returns {AssuranceCase[]}
 */
function makeExecutableWrapperCases() {
  return [
    {
      id: "boundary-wrapper/root-proxy-zero-traps",
      family: "boundary-wrapper",
      run() {
        const counters = createTrapCounters();
        const proxy = countingProxy(makeBoundaryInput(), counters);
        assertBoundaryIssue(proxy, "PROXY_INPUT", "$");
        assertZeroTrapCounters(counters);
      }
    },
    {
      id: "boundary-wrapper/nested-proxy-zero-traps",
      family: "boundary-wrapper",
      run() {
        const input = makeBoundaryInput();
        const counters = createTrapCounters();
        setFirst(input.observations, "Observation").observer = countingProxy(
          setFirst(input.observations, "Observation").observer,
          counters
        );
        assertBoundaryIssue(input, "PROXY_INPUT", "$.observations[0].observer");
        assertZeroTrapCounters(counters);
      }
    },
    {
      id: "boundary-wrapper/array-proxy-zero-traps",
      family: "boundary-wrapper",
      run() {
        const input = makeBoundaryInput();
        const counters = createTrapCounters();
        input.observations = countingProxy(input.observations, counters);
        assertBoundaryIssue(input, "PROXY_INPUT", "$.observations");
        assertZeroTrapCounters(counters);
      }
    },
    {
      id: "boundary-wrapper/revoked-proxy",
      family: "boundary-wrapper",
      run() {
        const revocable = Proxy.revocable(makeBoundaryInput(), {});
        revocable.revoke();
        assertBoundaryIssue(revocable.proxy, "PROXY_INPUT", "$");
      }
    },
    {
      id: "boundary-wrapper/array-subclass-forEach-zero-calls",
      family: "boundary-wrapper",
      run() {
        let forEachCount = 0;
        class TrackingArray extends Array {
          forEach() {
            forEachCount += 1;
          }
        }
        const input = makeBoundaryInput();
        input.observations = new TrackingArray(setFirst(input.observations, "Observation"));
        assertBoundaryIssue(input, "INVALID_ARRAY", "$.observations");
        assert.equal(forEachCount, 0);
      }
    },
    {
      id: "boundary-wrapper/array-subclass-map-zero-calls",
      family: "boundary-wrapper",
      run() {
        let mapCount = 0;
        class TrackingArray extends Array {
          map() {
            mapCount += 1;
            return [];
          }
        }
        const input = makeBoundaryInput();
        input.observations = new TrackingArray(setFirst(input.observations, "Observation"));
        assertBoundaryIssue(input, "INVALID_ARRAY", "$.observations");
        assert.equal(mapCount, 0);
      }
    },
    {
      id: "boundary-wrapper/custom-array-prototype-method-zero-calls",
      family: "boundary-wrapper",
      run() {
        const input = makeBoundaryInput();
        let forEachCount = 0;
        Object.setPrototypeOf(input.observations, {
          forEach() {
            forEachCount += 1;
          }
        });
        assertBoundaryIssue(input, "INVALID_ARRAY", "$.observations");
        assert.equal(forEachCount, 0);
      }
    }
  ];
}

/**
 * @returns {AssuranceCase[]}
 */
function makeReferenceAndProvenanceCases() {
  return [
    {
      id: "boundary-reference/duplicate-claim-identity",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        input.claims.push({ ...setFirst(input.claims, "Claim") });
        assertBoundaryIssue(input, "DUPLICATE_IDENTITY", "$.claims[1]");
      }
    },
    {
      id: "boundary-reference/duplicate-contract-identity",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        input.evidenceContracts.push({ ...setFirst(input.evidenceContracts, "Evidence Contract") });
        assertBoundaryIssue(input, "DUPLICATE_IDENTITY", "$.evidenceContracts[1]");
      }
    },
    {
      id: "boundary-reference/duplicate-requirement-identity",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        input.evidenceRequirements.push({ ...setFirst(input.evidenceRequirements, "Evidence Requirement") });
        assertBoundaryIssue(input, "DUPLICATE_IDENTITY", "$.evidenceRequirements[1]");
      }
    },
    {
      id: "boundary-reference/duplicate-observation-identity",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        input.observations.push({ ...setFirst(input.observations, "Observation") });
        assertBoundaryIssue(input, "DUPLICATE_IDENTITY", "$.observations[1]");
      }
    },
    {
      id: "boundary-reference/duplicate-rule-identity",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        input.rules.push({ ...setFirst(input.rules, "Rule") });
        assertBoundaryIssue(input, "DUPLICATE_IDENTITY", "$.rules[1]");
      }
    },
    {
      id: "boundary-reference/contract-unknown-requirement",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.evidenceContracts, "Evidence Contract").requirementIds = ["req.unknown"];
        assertBoundaryIssue(input, "INVALID_REFERENCE", "$.evidenceContracts");
      }
    },
    {
      id: "boundary-reference/requirement-unknown-contract",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.evidenceRequirements, "Evidence Requirement").evidenceContractId = "contract.unknown";
        assertBoundaryIssue(input, "INVALID_REFERENCE", "$.evidenceRequirements");
      }
    },
    {
      id: "boundary-reference/requirement-not-declared-by-contract",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.evidenceRequirements, "Evidence Requirement").id = "req.not-declared";
        assertBoundaryIssue(input, "INVALID_REFERENCE", "$.evidenceContracts");
      }
    },
    {
      id: "boundary-reference/contract-target-scope-without-claim",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.evidenceContracts, "Evidence Contract").targetScopeId = "scope.other";
        assertBoundaryIssue(input, "TARGET_SCOPE_MISMATCH", "$.evidenceContracts");
      }
    },
    {
      id: "boundary-reference/claim-target-scope-without-contract",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        input.claims.push({
          id: "claim.uncovered",
          targetScopeId: "scope.uncovered",
          statement: "Uncovered Claim."
        });
        assertBoundaryIssue(input, "TARGET_SCOPE_MISMATCH", "$.claims");
      }
    },
    {
      id: "boundary-reference/observation-scope-outside-evaluation",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.observations, "Observation").targetScopeId = "scope.outside";
        assertBoundaryIssue(input, "TARGET_SCOPE_MISMATCH", "$.observations[0].targetScopeId");
      }
    },
    {
      id: "boundary-reference/rule-unknown-requirement",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.rules, "Rule").predicate.evidenceRequirementId = "req.unknown";
        assertBoundaryIssue(input, "INVALID_REFERENCE", "$.rules");
      }
    },
    {
      id: "boundary-provenance/invalid-contract-selection-source",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.evidenceContracts, "Evidence Contract").selectionProvenance = {
          source: "MODEL_OUTPUT",
          configurationId: "config.invalid",
          configurationVersion: "1.0.0"
        };
        assertBoundaryIssue(input, "INVALID_EVIDENCE_CONTRACT_SELECTION_PROVENANCE", "$.evidenceContracts[0].selectionProvenance.source");
      }
    },
    {
      id: "boundary-provenance/invalid-rule-authority-source",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.rules, "Rule").authority = {
          source: "INFERENCE_PROPOSAL",
          policyId: "policy.invalid",
          policyVersion: "1.0.0"
        };
        assertBoundaryIssue(input, "INVALID_RULE_AUTHORITY_PROVENANCE", "$.rules[0].authority.source");
      }
    },
    {
      id: "boundary-reason/harn-rule-code-rejected",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.rules, "Rule").effect.reasonCode = "HARN_NOT_PRODUCT";
        assertBoundaryIssue(input, "RESERVED_REASON_CODE_NAMESPACE", "$.rules[0].effect.reasonCode");
      }
    },
    {
      id: "boundary-reason/kernel-missing-code-rule-rejected",
      family: "boundary-reference",
      run() {
        const input = makeBoundaryInput();
        setFirst(input.rules, "Rule").effect.reasonCode = MISSING_EVIDENCE_REASON_CODE;
        assertBoundaryIssue(input, "RESERVED_KERNEL_REASON_CODE", "$.rules[0].effect.reasonCode");
      }
    }
  ];
}

/**
 * @returns {AssuranceCase[]}
 */
function makeLineageAndIsolationCases() {
  return [
    {
      id: "lineage/required-reference-coverage",
      family: "lineage",
      run() {
        const bundle = evaluateKernel(makeInput({
          rules: [validRule("rule.absent.nontriggered", "req.has-lockfile", "EVIDENCE_ABSENT", "KERNEL_ABSENCE_DENIAL")]
        }));
        const kinds = lineageKinds(bundle.evidenceLineage);

        for (const kind of [
          "CLAIM_DECLARED",
          "EVIDENCE_CONTRACT_SELECTED",
          "EVIDENCE_CONTRACT_SELECTION_PROVENANCE",
          "EVIDENCE_REQUIREMENT_DECLARED",
          "OBSERVATION_ACCEPTED",
          "EVIDENCE_PRODUCED",
          "RULE_EVALUATED",
          "VERDICT_CANDIDATE_CLASSIFIED",
          "VERDICT_REDUCED"
        ]) {
          assert.equal(kinds.has(kind), true, kind);
        }

        assertLineageReference(bundle, "CLAIM_DECLARED", "claimId", "claim.lockfile");
        assertLineageReference(bundle, "EVIDENCE_CONTRACT_SELECTED", "evidenceContractId", "contract.phase1");
        assertLineageReference(bundle, "EVIDENCE_CONTRACT_SELECTION_PROVENANCE", "source", "TRUSTED_CONFIGURATION");
        assertLineageReference(bundle, "EVIDENCE_REQUIREMENT_DECLARED", "requirementId", "req.has-lockfile");
        assertLineageReference(bundle, "OBSERVATION_ACCEPTED", "observationId", "obs.lockfile-present");
        assertLineageReference(bundle, "EVIDENCE_PRODUCED", "requirementId", "req.has-lockfile");
        assertLineageReference(bundle, "RULE_EVALUATED", "ruleId", "rule.absent.nontriggered");
        assertLineageReference(bundle, "VERDICT_REDUCED", "evaluationId", "eval.phase1");
      }
    },
    {
      id: "isolation/caller-post-evaluation-mutations-do-not-change-bundle",
      family: "isolation",
      run() {
        const input = makePermutationBaseInput(1);
        const bundle = evaluateKernel(input);
        const before = clone(bundle);
        const idBefore = bundle.id;
        const mutableInput = /** @type {any} */ (input);

        mutableInput.claims.push({
          id: "claim.after-evaluation",
          targetScopeId: "scope.repo",
          statement: "Mutation after finalization."
        });
        setFirst(input.evidenceContracts, "Evidence Contract").requirementIds.reverse();
        setFirst(input.observations, "Observation").observer.id = "observer.after";
        setFirst(input.observations, "Observation").limitations.push("AFTER");
        setFirst(input.rules, "Rule").effect.reasonCode = "KERNEL_AFTER_MUTATION";

        assert.deepEqual(bundle, before);
        assert.equal(bundle.id, idBefore);
        assert.equal(Object.isFrozen(input), false);
        assert.equal(Object.isFrozen(setFirst(input.observations, "Observation")), false);
      }
    },
    {
      id: "immutability/admissible-bundle-reachable-graph",
      family: "immutability",
      run() {
        assertDeepImmutable(evaluateKernel(makeInput()));
      }
    },
    {
      id: "immutability/revision-required-bundle-reachable-graph",
      family: "immutability",
      run() {
        assertDeepImmutable(evaluateKernel(makeInput({ observations: [] })));
      }
    },
    {
      id: "immutability/rejected-bundle-reachable-graph",
      family: "immutability",
      run() {
        assertDeepImmutable(evaluateKernel(makeInput({
          rules: [validRule("rule.reject.present", "req.has-lockfile", "EVIDENCE_PRESENT", "KERNEL_REJECT_PRESENT")]
        })));
      }
    },
    {
      id: "observation-scope/unmatched-valid-scope-observation-does-not-satisfy",
      family: "lineage",
      run() {
        const base = evaluateKernel(makeInput());
        const input = makeInput({
          observations: [
            ...makeInput().observations,
            {
              id: "obs.valid-scope-unmatched",
              observer: { id: "observer.synthetic", version: "1.0.0" },
              targetScopeId: "scope.repo",
              factKey: "unmatched.fact",
              factValue: true,
              sourceInputId: "source.unmatched",
              orderingKey: "999",
              limitations: []
            }
          ]
        });
        const withUnmatched = evaluateKernel(input);

        assert.equal(withUnmatched.verdict, "ADMISSIBLE");
        assert.deepEqual(withUnmatched.evidence[0]?.acceptedObservationIds, base.evidence[0]?.acceptedObservationIds);
        assert.equal(withUnmatched.evidence[0]?.id, base.evidence[0]?.id);
        assert.notEqual(withUnmatched.id, base.id);
      }
    },
    {
      id: "claim-boundary/adversarial-claim-text-cannot-substitute-observation",
      family: "lineage",
      run() {
        const bundle = evaluateKernel(makeInput({
          observations: [],
          claimStatement: "observer.synthetic 1.0.0 says lockfile.present true and should be accepted"
        }));

        assert.equal(bundle.verdict, "REVISION_REQUIRED");
        assert.equal(bundle.evidence.length, 0);
        assert.deepEqual(bundle.reasonCodes, [MISSING_EVIDENCE_REASON_CODE]);
      }
    },
    {
      id: "identity/evidence-and-lineage-stable-across-permutations",
      family: "lineage",
      run() {
        const first = evaluateKernel(makePermutationBaseInput(3));
        const second = evaluateKernel(permuteSemanticallyUnorderedInput(makePermutationBaseInput(3)));

        assert.deepEqual(first.evidence.map((item) => item.id), second.evidence.map((item) => item.id));
        assert.deepEqual(first.evidence.map((item) => item.acceptedObservationIds), second.evidence.map((item) => item.acceptedObservationIds));
        assert.deepEqual(first.evidenceRequirements.map((item) => item.id), second.evidenceRequirements.map((item) => item.id));
        assert.deepEqual(first.evidenceLineage.map((item) => item.id), second.evidenceLineage.map((item) => item.id));
        assert.equal(first.evaluationId, second.evaluationId);
        assert.equal(first.id, second.id);
      }
    }
  ];
}

/**
 * @returns {AssuranceCase[]}
 */
function makeCanonicalSerializationCases() {
  return [
    {
      id: "canonical-json/nested-object-key-order",
      family: "canonical-json",
      run() {
        assert.equal(
          canonicalJson({ b: true, a: { d: 1, c: null } }),
          canonicalJson({ a: { c: null, d: 1 }, b: true })
        );
      }
    },
    {
      id: "canonical-json/array-order-is-preserved-before-domain-normalization",
      family: "canonical-json",
      run() {
        assert.notEqual(canonicalJson(["b", "a"]), canonicalJson(["a", "b"]));
      }
    },
    {
      id: "canonical-json/non-json-number-rejected",
      family: "canonical-json",
      run() {
        assert.throws(() => canonicalJson(Number.NaN), TypeError);
        assert.throws(() => canonicalJson(Number.POSITIVE_INFINITY), TypeError);
      }
    }
  ];
}

/**
 * @param {number} variant
 * @returns {KernelEvaluationInput}
 */
function makePermutationBaseInput(variant) {
  const input = makeMultiRequirementInput(
    ["req.alpha", "req.beta", "req.gamma"],
    [
      validRule("rule.absent.alpha", "req.alpha", "EVIDENCE_ABSENT", "KERNEL_ALPHA_ABSENT"),
      validRule("rule.present.beta", "req.beta", "EVIDENCE_PRESENT", "KERNEL_BETA_PRESENT")
    ]
  );
  const mutableInput = /** @type {any} */ (input);

  mutableInput.claims.push({
    id: `claim.extra.${variant}`,
    targetScopeId: "scope.repo",
    statement: "Additional synthetic Claim for permutation assurance."
  });
  mutableInput.observations.push({
    id: `obs.unmatched.${variant}`,
    observer: { id: "observer.synthetic", version: "1.0.0" },
    targetScopeId: "scope.repo",
    factKey: "unmatched.fact",
    factValue: "ignored",
    sourceInputId: "source.unmatched",
    orderingKey: "999",
    limitations: ["Z_LIMIT", "A_LIMIT"]
  });

  return input;
}

/**
 * @param {KernelEvaluationInput} input
 * @returns {KernelEvaluationInput}
 */
function permuteSemanticallyUnorderedInput(input) {
  const permuted = clone(input);
  const mutablePermuted = /** @type {any} */ (permuted);
  mutablePermuted.claims.reverse();
  mutablePermuted.evidenceContracts.reverse();
  for (const contract of mutablePermuted.evidenceContracts) {
    contract.requirementIds.reverse();
  }
  mutablePermuted.evidenceRequirements.reverse();
  mutablePermuted.observations.reverse();
  for (const observation of mutablePermuted.observations) {
    observation.limitations.reverse();
  }
  mutablePermuted.rules.reverse();
  return permuted;
}

/**
 * @param {readonly string[]} presentRequirementIds
 * @param {readonly Rule[]} rules
 * @returns {KernelEvaluationInput}
 */
function makeMultiRequirementInput(presentRequirementIds, rules) {
  return makeRequirementInput(["req.alpha", "req.beta", "req.gamma"], presentRequirementIds, rules);
}

/**
 * @param {readonly string[]} requirementIds
 * @param {readonly string[]} presentRequirementIds
 * @param {readonly Rule[]} rules
 * @returns {KernelEvaluationInput}
 */
function makeRequirementInput(requirementIds, presentRequirementIds, rules) {
  const input = makeInput();
  const mutableInput = /** @type {any} */ (input);
  mutableInput.evidenceContracts[0].requirementIds = [...requirementIds];
  mutableInput.evidenceRequirements = requirementIds.map((requirementId) =>
    requirement(requirementId, factKeyForRequirement(requirementId))
  );
  mutableInput.observations = presentRequirementIds.map((requirementId, index) =>
    observationForRequirement(requirementId, String(index + 1).padStart(3, "0"))
  );
  mutableInput.rules = [...rules];
  return input;
}

/**
 * @param {string} id
 * @param {string} factKey
 * @returns {KernelEvaluationInput["evidenceRequirements"][number]}
 */
function requirement(id, factKey) {
  return {
    id,
    evidenceContractId: "contract.phase1",
    targetScopeId: "scope.repo",
    requiredObserver: {
      id: "observer.synthetic",
      version: "1.0.0"
    },
    factKey,
    expectedValue: true
  };
}

/**
 * @param {string} requirementId
 * @returns {string}
 */
function factKeyForRequirement(requirementId) {
  return `fact.${requirementId.slice("req.".length)}`;
}

/**
 * @param {string} requirementId
 * @param {string} orderingKey
 * @returns {KernelEvaluationInput["observations"][number]}
 */
function observationForRequirement(requirementId, orderingKey) {
  const factKey = factKeyForRequirement(requirementId);
  return {
    id: `obs.${requirementId.slice("req.".length)}`,
    observer: {
      id: "observer.synthetic",
      version: "1.0.0"
    },
    targetScopeId: "scope.repo",
    factKey,
    factValue: true,
    sourceInputId: `source.${requirementId.slice("req.".length)}`,
    orderingKey,
    limitations: []
  };
}

/**
 * @returns {any}
 */
function makeBoundaryInput() {
  const input = /** @type {any} */ (makeInput({
    rules: [validRule("rule.boundary", "req.has-lockfile", "EVIDENCE_PRESENT", "KERNEL_BOUNDARY_DENIAL")]
  }));
  input.observations[0].limitations = ["BOUNDARY_LIMITATION"];
  return input;
}

/**
 * @returns {readonly { readonly id: string, readonly path: string, readonly get: (input: any) => any }[]}
 */
function recordTargets() {
  return Object.freeze([
    { id: "root", path: "$", get: (input) => input },
    { id: "evaluation", path: "$.evaluation", get: (input) => input.evaluation },
    { id: "claim", path: "$.claims[0]", get: (input) => input.claims[0] },
    { id: "contract", path: "$.evidenceContracts[0]", get: (input) => input.evidenceContracts[0] },
    { id: "selection-provenance", path: "$.evidenceContracts[0].selectionProvenance", get: (input) => input.evidenceContracts[0].selectionProvenance },
    { id: "requirement", path: "$.evidenceRequirements[0]", get: (input) => input.evidenceRequirements[0] },
    { id: "required-observer", path: "$.evidenceRequirements[0].requiredObserver", get: (input) => input.evidenceRequirements[0].requiredObserver },
    { id: "observation", path: "$.observations[0]", get: (input) => input.observations[0] },
    { id: "observer", path: "$.observations[0].observer", get: (input) => input.observations[0].observer },
    { id: "rule", path: "$.rules[0]", get: (input) => input.rules[0] },
    { id: "rule-predicate", path: "$.rules[0].predicate", get: (input) => input.rules[0].predicate },
    { id: "rule-effect", path: "$.rules[0].effect", get: (input) => input.rules[0].effect },
    { id: "rule-authority", path: "$.rules[0].authority", get: (input) => input.rules[0].authority }
  ]);
}

/**
 * @returns {readonly { readonly id: string, readonly path: string, readonly get: (input: any) => any }[]}
 */
function arrayTargets() {
  return Object.freeze([
    { id: "claims", path: "$.claims", get: (input) => input.claims },
    { id: "contracts", path: "$.evidenceContracts", get: (input) => input.evidenceContracts },
    { id: "contract-requirement-ids", path: "$.evidenceContracts[0].requirementIds", get: (input) => input.evidenceContracts[0].requirementIds },
    { id: "requirements", path: "$.evidenceRequirements", get: (input) => input.evidenceRequirements },
    { id: "observations", path: "$.observations", get: (input) => input.observations },
    { id: "observation-limitations", path: "$.observations[0].limitations", get: (input) => input.observations[0].limitations },
    { id: "rules", path: "$.rules", get: (input) => input.rules }
  ]);
}

/**
 * @param {string} id
 * @param {string} requirementId
 * @param {"EVIDENCE_PRESENT" | "EVIDENCE_ABSENT"} kind
 * @param {string} reasonCode
 * @returns {Rule}
 */
function validRule(id, requirementId, kind, reasonCode) {
  return {
    id,
    predicate: {
      kind,
      evidenceRequirementId: requirementId
    },
    effect: {
      kind: "DENY",
      reasonCode
    },
    authority: {
      source: "POLICY",
      policyId: "policy.phase1",
      policyVersion: "1.0.0"
    }
  };
}

/**
 * @param {string} id
 * @param {Verdict} verdict
 * @returns {VerdictCandidate}
 */
function candidate(id, verdict) {
  return {
    id,
    verdict,
    reasonCodes: verdict === "ADMISSIBLE" ? [] : [`REASON_${verdict}`],
    lineageIds: [`lineage.${id}`]
  };
}

/**
 * @param {readonly VerdictCandidate[]} candidates
 * @returns {import("@proofrail/contracts").VerdictReduction}
 */
function referenceReduce(candidates) {
  const sortedCandidates = [...candidates].sort((left, right) =>
    referenceRank(left.verdict) - referenceRank(right.verdict) || compareStrings(left.id, right.id)
  );
  return {
    verdict: sortedCandidates.map((item) => item.verdict).reduce(maxVerdictByReference, "ADMISSIBLE"),
    reasonCodes: uniqueSorted(sortedCandidates.flatMap((item) => item.reasonCodes)),
    candidateIds: sortedCandidates.map((item) => item.id),
    lineageIds: uniqueSorted(sortedCandidates.flatMap((item) => item.lineageIds)),
    precedence: [...VERDICTS].reverse()
  };
}

/**
 * @param {Verdict} left
 * @param {Verdict} right
 * @returns {Verdict}
 */
function maxVerdictByReference(left, right) {
  return referenceRank(right) > referenceRank(left) ? right : left;
}

/**
 * @param {Verdict} verdict
 * @returns {number}
 */
function referenceRank(verdict) {
  const value = VERDICT_RANK.get(verdict);
  assert.notEqual(value, undefined);
  return /** @type {number} */ (value);
}

/**
 * @param {unknown} input
 * @param {string} issueCategory
 * @param {string} [path]
 * @returns {KernelBoundaryError}
 */
function assertBoundaryIssue(input, issueCategory, path) {
  /** @type {KernelBoundaryError | undefined} */
  let captured;
  assert.throws(
    () => evaluateKernel(input),
    (error) => {
      assert.equal(error instanceof KernelBoundaryError, true);
      captured = /** @type {KernelBoundaryError} */ (error);
      return true;
    }
  );
  assert.ok(captured);
  assert.equal(captured.issueCategory, issueCategory);
  if (path !== undefined) {
    assert.equal(captured.path, path);
  }
  return captured;
}

/**
 * @template {object} T
 * @param {T} target
 * @param {string} key
 * @param {unknown} value
 * @returns {void}
 */
function defineEnumerableData(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

/**
 * @param {readonly unknown[]} values
 * @param {string} label
 * @returns {any}
 */
function setFirst(values, label) {
  const value = values[0];
  assert.ok(value, label);
  return /** @type {any} */ (value);
}

/**
 * @param {import("@proofrail/contracts").EvidenceBundle} bundle
 * @param {import("@proofrail/contracts").EvidenceLineage["kind"]} kind
 * @param {string} key
 * @param {JsonPrimitive} expectedValue
 * @returns {void}
 */
function assertLineageReference(bundle, kind, key, expectedValue) {
  assert.equal(
    bundle.evidenceLineage.some((entry) => entry.kind === kind && entry.references[key] === expectedValue),
    true,
    `${kind}.${key}`
  );
}

/**
 * @param {unknown} value
 * @returns {void}
 */
function assertDeepImmutable(value) {
  const before = clone(value);
  const seen = new WeakSet();
  const stack = [value];
  let reachableObjectCount = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== "object") {
      continue;
    }
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    reachableObjectCount += 1;
    assert.equal(Object.isFrozen(current), true);
    assert.throws(() => {
      Object.defineProperty(current, "__mutation_attempt", {
        value: true,
        enumerable: true
      });
    }, TypeError);
    if (Array.isArray(current)) {
      assert.throws(() => {
        current.push("mutation");
      }, TypeError);
    }
    for (const key of Object.getOwnPropertyNames(current)) {
      stack.push(/** @type {Record<string, unknown>} */ (current)[key]);
    }
  }

  assert.equal(reachableObjectCount > 0, true);
  assert.deepEqual(value, before);
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

/**
 * @param {readonly string[]} values
 * @returns {string[]}
 */
function uniqueSorted(values) {
  return [...new Set(values)].sort(compareStrings);
}

/**
 * @param {readonly string[]} values
 * @returns {Map<string, number>}
 */
function countBy(values) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/**
 * @param {AssuranceCase} left
 * @param {AssuranceCase} right
 * @returns {number}
 */
function compareCaseIds(left, right) {
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
