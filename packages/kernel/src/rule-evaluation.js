// @ts-check

import { derivedIdentity } from "./canonical-json.js";
import { lineageEntry } from "./evidence-satisfaction.js";

/**
 * @typedef {import("@proofrail/contracts").Evidence} Evidence
 * @typedef {import("@proofrail/contracts").EvidenceLineage} EvidenceLineage
 * @typedef {import("@proofrail/contracts").Rule} Rule
 * @typedef {import("@proofrail/contracts").VerdictCandidate} VerdictCandidate
 */

/**
 * @param {readonly Rule[]} rules
 * @param {readonly Evidence[]} evidence
 * @returns {{
 *   lineage: EvidenceLineage[],
 *   candidates: VerdictCandidate[]
 * }}
 */
export function evaluateRules(rules, evidence) {
  const satisfiedRequirementIds = new Set(evidence.map((record) => record.requirementId));
  /** @type {EvidenceLineage[]} */
  const lineage = [];
  /** @type {VerdictCandidate[]} */
  const candidates = [];

  for (const rule of rules) {
    const requirementId = rule.predicate.evidenceRequirementId;
    const evidencePresent = satisfiedRequirementIds.has(requirementId);
    const triggered =
      (rule.predicate.kind === "EVIDENCE_PRESENT" && evidencePresent) ||
      (rule.predicate.kind === "EVIDENCE_ABSENT" && !evidencePresent);

    const ruleLineage = lineageEntry("RULE_EVALUATED", {
      ruleId: rule.id,
      predicateKind: rule.predicate.kind,
      requirementId,
      authoritySource: rule.authority.source,
      authorityReferenceId: authorityReferenceId(rule.authority),
      authorityReferenceVersion: authorityReferenceVersion(rule.authority),
      triggered
    });
    lineage.push(ruleLineage);

    if (triggered) {
      const candidateLineage = lineageEntry("VERDICT_CANDIDATE_CLASSIFIED", {
        condition: "RULE_DENIAL",
        ruleId: rule.id,
        requirementId,
        verdict: "REJECTED",
        reasonCode: rule.effect.reasonCode
      });
      lineage.push(candidateLineage);
      candidates.push({
        id: derivedIdentity("verdict-candidate", {
          kind: "rule-denial",
          ruleId: rule.id,
          requirementId,
          verdict: "REJECTED",
          reasonCode: rule.effect.reasonCode
        }),
        verdict: "REJECTED",
        reasonCodes: [rule.effect.reasonCode],
        lineageIds: [ruleLineage.id, candidateLineage.id]
      });
    }
  }

  lineage.sort(compareById);
  candidates.sort(compareById);

  return { lineage, candidates };
}

/**
 * @param {Rule["authority"]} authority
 * @returns {string}
 */
function authorityReferenceId(authority) {
  return authority.source === "POLICY" ? authority.policyId : authority.configurationId;
}

/**
 * @param {Rule["authority"]} authority
 * @returns {string}
 */
function authorityReferenceVersion(authority) {
  return authority.source === "POLICY" ? authority.policyVersion : authority.configurationVersion;
}

/**
 * @param {{ readonly id: string }} left
 * @param {{ readonly id: string }} right
 * @returns {number}
 */
function compareById(left, right) {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}
