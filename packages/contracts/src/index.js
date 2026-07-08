// @ts-check

export const PHASE1_KERNEL_INPUT_SCHEMA_VERSION = "proofrail.kernel.input.phase1.v1";
export const PHASE1_BUNDLE_SCHEMA_VERSION = "proofrail.evidence-bundle.phase1.v1";
export const PHASE1_KERNEL_ENGINE_VERSION = "0.1.0-phase1";

export const VERDICTS = Object.freeze([
  "ADMISSIBLE",
  "REVISION_REQUIRED",
  "REJECTED",
  "BLOCKED"
]);

export const EVIDENCE_CONTRACT_SELECTION_PROVENANCE_SOURCES = Object.freeze([
  "TRUSTED_CONFIGURATION",
  "DETERMINISTIC_POLICY_SELECTION"
]);

export const RULE_AUTHORITY_PROVENANCE_SOURCES = Object.freeze([
  "TRUSTED_CONFIGURATION",
  "POLICY"
]);

export const EVIDENCE_SATISFACTION_KIND = "OBSERVATION_FACT_EQUALS";

export const RULE_PREDICATES = Object.freeze([
  "EVIDENCE_PRESENT",
  "EVIDENCE_ABSENT"
]);

export const RULE_EFFECT_DENY = "DENY";
