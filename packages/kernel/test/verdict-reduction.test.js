// @ts-check

import test from "node:test";
import assert from "node:assert/strict";
import { reduceVerdictCandidates } from "../src/verdict-reduction.js";

test("pure reducer preserves Verdict precedence", () => {
  const candidates = [
    candidate("a", "ADMISSIBLE"),
    candidate("b", "REVISION_REQUIRED"),
    candidate("c", "REJECTED"),
    candidate("d", "BLOCKED")
  ];

  const reduction = reduceVerdictCandidates(candidates);

  assert.equal(reduction.verdict, "BLOCKED");
  assert.deepEqual(reduction.precedence, [
    "BLOCKED",
    "REJECTED",
    "REVISION_REQUIRED",
    "ADMISSIBLE"
  ]);
});

test("pure reducer retains lower-precedence reason codes and lineage references", () => {
  const reduction = reduceVerdictCandidates([
    candidate("candidate.revision", "REVISION_REQUIRED", ["KERNEL_EVIDENCE_REQUIREMENT_MISSING"], ["lineage.missing"]),
    candidate("candidate.rejected", "REJECTED", ["KERNEL_POLICY_DENIAL"], ["lineage.denial"])
  ]);

  assert.equal(reduction.verdict, "REJECTED");
  assert.deepEqual(reduction.reasonCodes, [
    "KERNEL_EVIDENCE_REQUIREMENT_MISSING",
    "KERNEL_POLICY_DENIAL"
  ]);
  assert.deepEqual(reduction.lineageIds, ["lineage.denial", "lineage.missing"]);
});

test("pure reducer rejects empty and invalid candidate sets", () => {
  assert.throws(() => reduceVerdictCandidates([]), TypeError);
  assert.throws(
    () => reduceVerdictCandidates([
      /** @type {import("@proofrail/contracts").VerdictCandidate} */ ({
        id: "candidate.invalid",
        verdict: /** @type {import("@proofrail/contracts").Verdict} */ (/** @type {unknown} */ ("UNKNOWN")),
        reasonCodes: [],
        lineageIds: []
      })
    ]),
    TypeError
  );
});

/**
 * @param {string} id
 * @param {import("@proofrail/contracts").Verdict} verdict
 * @param {readonly string[]} [reasonCodes]
 * @param {readonly string[]} [lineageIds]
 * @returns {import("@proofrail/contracts").VerdictCandidate}
 */
function candidate(id, verdict, reasonCodes = [], lineageIds = []) {
  return { id, verdict, reasonCodes, lineageIds };
}
