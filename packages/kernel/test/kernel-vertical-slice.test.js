// @ts-check

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateKernel } from "../src/index.js";
import { makeInput, clone, lineageKinds } from "./helpers.js";

test("satisfied requirement produces Evidence and ADMISSIBLE bundle", () => {
  const bundle = evaluateKernel(makeInput());

  assert.equal(bundle.verdict, "ADMISSIBLE");
  assert.equal(bundle.evidence.length, 1);
  assert.equal(bundle.evidence[0]?.requirementId, "req.has-lockfile");
  assert.deepEqual(bundle.evidence[0]?.acceptedObservationIds, ["obs.lockfile-present"]);
  assert.equal(bundle.evidence[0]?.lineageIds.length, 2);
  assert.equal(bundle.reasonCodes.length, 0);
});

test("Claim statement is not Evidence when required Observation is absent", () => {
  const bundle = evaluateKernel(makeInput({
    observations: [],
    claimStatement: "lockfile.present is true"
  }));

  assert.equal(bundle.verdict, "REVISION_REQUIRED");
  assert.equal(bundle.evidence.length, 0);
  assert.deepEqual(bundle.reasonCodes, ["KERNEL_EVIDENCE_REQUIREMENT_MISSING"]);
});

test("missing Evidence Requirement creates REVISION_REQUIRED candidate and lineage", () => {
  const bundle = evaluateKernel(makeInput({ observations: [] }));

  assert.equal(bundle.verdict, "REVISION_REQUIRED");
  assert.deepEqual(bundle.reasonCodes, ["KERNEL_EVIDENCE_REQUIREMENT_MISSING"]);
  assert.equal(
    bundle.evidenceLineage.some((entry) =>
      entry.kind === "VERDICT_CANDIDATE_CLASSIFIED" &&
      entry.references.requirementId === "req.has-lockfile"
    ),
    true
  );
});

test("observer identity mismatch does not satisfy requirement", () => {
  const bundle = evaluateKernel(makeInput({
    observationOverrides: {
      observer: { id: "observer.other", version: "1.0.0" }
    }
  }));

  assert.equal(bundle.verdict, "REVISION_REQUIRED");
  assert.equal(bundle.evidence.length, 0);
});

test("observer version mismatch does not satisfy requirement", () => {
  const bundle = evaluateKernel(makeInput({
    observationOverrides: {
      observer: { id: "observer.synthetic", version: "2.0.0" }
    }
  }));

  assert.equal(bundle.verdict, "REVISION_REQUIRED");
  assert.equal(bundle.evidence.length, 0);
});

test("scope mismatch does not satisfy requirement", () => {
  const bundle = evaluateKernel(makeInput({
    observationOverrides: {
      targetScopeId: "scope.other"
    }
  }));

  assert.equal(bundle.verdict, "REVISION_REQUIRED");
  assert.equal(bundle.evidence.length, 0);
});

test("primitive type difference is not coerced", () => {
  const bundle = evaluateKernel(makeInput({
    expectedValue: 1,
    factValue: "1"
  }));

  assert.equal(bundle.verdict, "REVISION_REQUIRED");
  assert.equal(bundle.evidence.length, 0);
});

test("Observation with limitations does not silently satisfy requirement", () => {
  const bundle = evaluateKernel(makeInput({
    observationOverrides: {
      limitations: ["SYNTHETIC_LIMITATION"]
    }
  }));

  assert.equal(bundle.verdict, "REVISION_REQUIRED");
  assert.equal(bundle.evidence.length, 0);
});

test("triggered denial Rule creates REJECTED candidate with reason and lineage", () => {
  const bundle = evaluateKernel(makeInput({
    rules: [
      {
        id: "rule.reject-present",
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
      }
    ]
  }));

  assert.equal(bundle.verdict, "REJECTED");
  assert.deepEqual(bundle.reasonCodes, ["KERNEL_SYNTHETIC_DENIAL"]);
  assert.equal(
    bundle.evidenceLineage.some((entry) =>
      entry.kind === "RULE_EVALUATED" &&
      entry.references.ruleId === "rule.reject-present"
    ),
    true
  );
});

test("lower-precedence missing-Evidence reason survives higher-precedence Rule denial", () => {
  const bundle = evaluateKernel(makeInput({
    observations: [],
    rules: [
      {
        id: "rule.reject-absent",
        predicate: {
          kind: "EVIDENCE_ABSENT",
          evidenceRequirementId: "req.has-lockfile"
        },
        effect: {
          kind: "DENY",
          reasonCode: "KERNEL_ABSENCE_DENIAL"
        },
        authority: {
          source: "TRUSTED_CONFIGURATION",
          configurationId: "config.phase1",
          configurationVersion: "1.0.0"
        }
      }
    ]
  }));

  assert.equal(bundle.verdict, "REJECTED");
  assert.deepEqual(bundle.reasonCodes, [
    "KERNEL_ABSENCE_DENIAL",
    "KERNEL_EVIDENCE_REQUIREMENT_MISSING"
  ]);
  assert.equal(bundle.verdictReduction.candidateIds.length, 2);
});

test("end-to-end Evidence Bundle contains required lineage coverage", () => {
  const bundle = evaluateKernel(makeInput({
    rules: [
      {
        id: "rule.require-present",
        predicate: {
          kind: "EVIDENCE_ABSENT",
          evidenceRequirementId: "req.has-lockfile"
        },
        effect: {
          kind: "DENY",
          reasonCode: "KERNEL_ABSENCE_DENIAL"
        },
        authority: {
          source: "POLICY",
          policyId: "policy.phase1",
          policyVersion: "1.0.0"
        }
      }
    ]
  }));
  const kinds = lineageKinds(bundle.evidenceLineage);

  assert.equal(kinds.has("CLAIM_DECLARED"), true);
  assert.equal(kinds.has("EVIDENCE_CONTRACT_SELECTED"), true);
  assert.equal(kinds.has("EVIDENCE_CONTRACT_SELECTION_PROVENANCE"), true);
  assert.equal(kinds.has("EVIDENCE_REQUIREMENT_DECLARED"), true);
  assert.equal(kinds.has("OBSERVATION_ACCEPTED"), true);
  assert.equal(kinds.has("EVIDENCE_PRODUCED"), true);
  assert.equal(kinds.has("RULE_EVALUATED"), true);
  assert.equal(kinds.has("VERDICT_CANDIDATE_CLASSIFIED"), true);
  assert.equal(kinds.has("VERDICT_REDUCED"), true);
});

test("identical semantic input evaluates to deeply equal bundle output", () => {
  const input = makeInput();

  assert.deepEqual(evaluateKernel(clone(input)), evaluateKernel(clone(input)));
});

test("input order normalization makes unordered arrays deterministic", () => {
  const ordered = makeInput({
    observations: [
      {
        id: "obs.lockfile-present-b",
        observer: { id: "observer.synthetic", version: "1.0.0" },
        targetScopeId: "scope.repo",
        factKey: "lockfile.present",
        factValue: true,
        sourceInputId: "source.synthetic",
        orderingKey: "002",
        limitations: []
      },
      {
        id: "obs.lockfile-present",
        observer: { id: "observer.synthetic", version: "1.0.0" },
        targetScopeId: "scope.repo",
        factKey: "lockfile.present",
        factValue: true,
        sourceInputId: "source.synthetic",
        orderingKey: "001",
        limitations: []
      }
    ]
  });
  const reordered = {
    ...ordered,
    claims: [...ordered.claims].reverse(),
    evidenceContracts: [...ordered.evidenceContracts].reverse(),
    evidenceRequirements: [...ordered.evidenceRequirements].reverse(),
    observations: [...ordered.observations].reverse(),
    rules: [...ordered.rules].reverse()
  };

  assert.deepEqual(evaluateKernel(ordered), evaluateKernel(reordered));
});

test("nested authoritative record key insertion order does not change serialized bundle output", () => {
  const first = makeInput({
    rules: [
      {
        id: "rule.require-present",
        predicate: {
          kind: "EVIDENCE_ABSENT",
          evidenceRequirementId: "req.has-lockfile"
        },
        effect: {
          kind: "DENY",
          reasonCode: "KERNEL_ABSENCE_DENIAL"
        },
        authority: {
          source: "POLICY",
          policyId: "policy.phase1",
          policyVersion: "1.0.0"
        }
      }
    ]
  });
  const second = makeInput({
    rules: [
      /** @type {import("@proofrail/contracts").Rule} */ ({
        authority: {
          policyVersion: "1.0.0",
          policyId: "policy.phase1",
          source: "POLICY"
        },
        effect: {
          reasonCode: "KERNEL_ABSENCE_DENIAL",
          kind: "DENY"
        },
        predicate: {
          evidenceRequirementId: "req.has-lockfile",
          kind: "EVIDENCE_ABSENT"
        },
        id: "rule.require-present"
      })
    ]
  });
  const mutableSecond = /** @type {any} */ (second);
  mutableSecond.evidenceContracts[0].selectionProvenance = {
    configurationVersion: "1.0.0",
    configurationId: "config.phase1",
    source: "TRUSTED_CONFIGURATION"
  };

  assert.equal(JSON.stringify(evaluateKernel(first)), JSON.stringify(evaluateKernel(second)));
});

test("evaluation does not mutate or freeze caller input", () => {
  const input = makeInput();
  const before = clone(input);

  evaluateKernel(input);

  assert.deepEqual(input, before);
  assert.equal(Object.isFrozen(input), false);
  assert.equal(Object.isFrozen(input.observations[0]), false);
});

test("caller mutation after evaluation does not change finalized bundle", () => {
  const input = makeInput();
  const bundle = evaluateKernel(input);
  const beforeMutation = clone(bundle);
  const mutableInput = /** @type {any} */ (input);

  mutableInput.observations[0].factValue = false;
  mutableInput.claims.push({
    id: "claim.after",
    targetScopeId: "scope.repo",
    statement: "Caller-owned mutation after evaluation."
  });

  assert.deepEqual(bundle, beforeMutation);
});

test("deterministic bundle identity does not depend on Date.now or Math.random", () => {
  const originalDateNow = Date.now;
  const originalRandom = Math.random;
  try {
    Date.now = () => 123;
    Math.random = () => 0.123;
    const first = evaluateKernel(makeInput());
    Date.now = () => 999;
    Math.random = () => 0.999;
    const second = evaluateKernel(makeInput());
    assert.equal(first.id, second.id);
    assert.deepEqual(first, second);
  } finally {
    Date.now = originalDateNow;
    Math.random = originalRandom;
  }
});
