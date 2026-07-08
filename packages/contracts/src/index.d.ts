export const PHASE1_KERNEL_INPUT_SCHEMA_VERSION: "proofrail.kernel.input.phase1.v1";
export const PHASE1_BUNDLE_SCHEMA_VERSION: "proofrail.evidence-bundle.phase1.v1";
export const PHASE1_KERNEL_ENGINE_VERSION: "0.1.0-phase1";

export const VERDICTS: readonly [
  "ADMISSIBLE",
  "REVISION_REQUIRED",
  "REJECTED",
  "BLOCKED"
];

export const EVIDENCE_CONTRACT_SELECTION_PROVENANCE_SOURCES: readonly [
  "TRUSTED_CONFIGURATION",
  "DETERMINISTIC_POLICY_SELECTION"
];

export const RULE_AUTHORITY_PROVENANCE_SOURCES: readonly [
  "TRUSTED_CONFIGURATION",
  "POLICY"
];

export const EVIDENCE_SATISFACTION_KIND: "OBSERVATION_FACT_EQUALS";
export const RULE_PREDICATES: readonly ["EVIDENCE_PRESENT", "EVIDENCE_ABSENT"];
export const RULE_EFFECT_DENY: "DENY";

export type StableIdentity = string;
export type JsonPrimitive = string | number | boolean | null;
export type Verdict =
  | "ADMISSIBLE"
  | "REVISION_REQUIRED"
  | "REJECTED"
  | "BLOCKED";

export interface Claim {
  readonly id: StableIdentity;
  readonly targetScopeId: StableIdentity;
  readonly statement: string;
}

export type EvidenceContractSelectionProvenance =
  | TrustedConfigurationSelectionProvenance
  | DeterministicPolicySelectionProvenance;

export interface TrustedConfigurationSelectionProvenance {
  readonly source: "TRUSTED_CONFIGURATION";
  readonly configurationId: StableIdentity;
  readonly configurationVersion: string;
}

export interface DeterministicPolicySelectionProvenance {
  readonly source: "DETERMINISTIC_POLICY_SELECTION";
  readonly policyId: StableIdentity;
  readonly policyVersion: string;
}

export interface EvidenceContract {
  readonly id: StableIdentity;
  readonly version: string;
  readonly targetScopeId: StableIdentity;
  readonly selectionProvenance: EvidenceContractSelectionProvenance;
  readonly requirementIds: readonly StableIdentity[];
}

export interface EvidenceRequirement {
  readonly id: StableIdentity;
  readonly evidenceContractId: StableIdentity;
  readonly targetScopeId: StableIdentity;
  readonly requiredObserver: ObserverReference;
  readonly factKey: string;
  readonly expectedValue: JsonPrimitive;
}

export interface ObserverReference {
  readonly id: StableIdentity;
  readonly version: string;
}

export interface Observation {
  readonly id: StableIdentity;
  readonly observer: ObserverReference;
  readonly targetScopeId: StableIdentity;
  readonly factKey: string;
  readonly factValue: JsonPrimitive;
  readonly sourceInputId: StableIdentity;
  readonly orderingKey: string;
  readonly limitations: readonly string[];
}

export interface Evidence {
  readonly id: StableIdentity;
  readonly evaluationId: StableIdentity;
  readonly evidenceContractId: StableIdentity;
  readonly requirementId: StableIdentity;
  readonly targetScopeId: StableIdentity;
  readonly satisfaction: EvidenceSatisfaction;
  readonly acceptedObservationIds: readonly StableIdentity[];
  readonly lineageIds: readonly StableIdentity[];
}

export interface EvidenceSatisfaction {
  readonly kind: "OBSERVATION_FACT_EQUALS";
  readonly factKey: string;
  readonly expectedValue: JsonPrimitive;
}

export interface Rule {
  readonly id: StableIdentity;
  readonly predicate: RulePredicate;
  readonly effect: RuleEffect;
  readonly authority: RuleAuthorityProvenance;
}

export type RulePredicate =
  | EvidencePresentPredicate
  | EvidenceAbsentPredicate;

export interface EvidencePresentPredicate {
  readonly kind: "EVIDENCE_PRESENT";
  readonly evidenceRequirementId: StableIdentity;
}

export interface EvidenceAbsentPredicate {
  readonly kind: "EVIDENCE_ABSENT";
  readonly evidenceRequirementId: StableIdentity;
}

export interface RuleEffect {
  readonly kind: "DENY";
  readonly reasonCode: string;
}

export type RuleAuthorityProvenance =
  | TrustedConfigurationRuleAuthority
  | PolicyRuleAuthority;

export interface TrustedConfigurationRuleAuthority {
  readonly source: "TRUSTED_CONFIGURATION";
  readonly configurationId: StableIdentity;
  readonly configurationVersion: string;
}

export interface PolicyRuleAuthority {
  readonly source: "POLICY";
  readonly policyId: StableIdentity;
  readonly policyVersion: string;
}

export interface KernelEvaluationInput {
  readonly schemaVersion: "proofrail.kernel.input.phase1.v1";
  readonly evaluation: EvaluationReference;
  readonly claims: readonly Claim[];
  readonly evidenceContracts: readonly EvidenceContract[];
  readonly evidenceRequirements: readonly EvidenceRequirement[];
  readonly observations: readonly Observation[];
  readonly rules: readonly Rule[];
}

export interface EvaluationReference {
  readonly id: StableIdentity;
}

export interface EvidenceLineage {
  readonly id: StableIdentity;
  readonly kind:
    | "CLAIM_DECLARED"
    | "EVIDENCE_CONTRACT_SELECTED"
    | "EVIDENCE_CONTRACT_SELECTION_PROVENANCE"
    | "EVIDENCE_REQUIREMENT_DECLARED"
    | "OBSERVATION_ACCEPTED"
    | "EVIDENCE_PRODUCED"
    | "RULE_EVALUATED"
    | "VERDICT_CANDIDATE_CLASSIFIED"
    | "VERDICT_REDUCED";
  readonly references: Readonly<Record<string, JsonPrimitive | readonly JsonPrimitive[]>>;
}

export interface VerdictCandidate {
  readonly id: StableIdentity;
  readonly verdict: Verdict;
  readonly reasonCodes: readonly string[];
  readonly lineageIds: readonly StableIdentity[];
}

export interface VerdictReduction {
  readonly verdict: Verdict;
  readonly reasonCodes: readonly string[];
  readonly candidateIds: readonly StableIdentity[];
  readonly lineageIds: readonly StableIdentity[];
  readonly precedence: readonly Verdict[];
}

export interface EvidenceBundle {
  readonly id: StableIdentity;
  readonly schemaVersion: "proofrail.evidence-bundle.phase1.v1";
  readonly kernelEngineVersion: "0.1.0-phase1";
  readonly evaluationId: StableIdentity;
  readonly claims: readonly Claim[];
  readonly evidenceContracts: readonly EvidenceContract[];
  readonly evidenceContractSelectionProvenance: readonly EvidenceContractSelectionProvenance[];
  readonly evidenceRequirements: readonly EvidenceRequirement[];
  readonly observations: readonly Observation[];
  readonly evidence: readonly Evidence[];
  readonly rules: readonly Rule[];
  readonly verificationReceipts: readonly [];
  readonly evidenceLineage: readonly EvidenceLineage[];
  readonly verdict: Verdict;
  readonly reasonCodes: readonly string[];
  readonly verdictReduction: VerdictReduction;
}
