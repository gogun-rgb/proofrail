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

export const MARKET_KERNEL_INPUT_SCHEMA_VERSION: "proofrail.kernel.input.v2";
export const MARKET_KERNEL_BUNDLE_SCHEMA_VERSION: "proofrail.evidence-bundle.v2";
export const MARKET_KERNEL_ENGINE_VERSION: "0.3.0-market-prototype";
export const MARKET_REQUIREMENT_INPUT_KINDS: readonly ["OBSERVATION", "VERIFICATION_RECEIPT"];
export const VERIFICATION_RECEIPT_STATUSES: readonly ["PASS", "FAIL", "TIMEOUT", "ERROR"];
export const MARKET_POLICY_CONDITIONS: readonly ["STALE_TARGET", "EXECUTION_IMPOSSIBLE", "SCOPE_PATH_DENIED", "UNTRUSTED_POLICY_CHANGE", "VERIFICATION_COMMAND_FAILED", "EXACT_HEAD_APPROVAL_MISSING", "MINIMUM_APPROVALS_MISSING", "CHANGES_REQUESTED_PRESENT", "REPORTED_CHECK_FAILED", "REQUIRED_EVIDENCE_MISSING"];
export type Sha256Digest = `sha256:${string}`;
export interface MarketTarget { readonly repository: string; readonly pullRequestNumber: number; readonly baseSha: string; readonly headSha: string; readonly targetScopeId: StableIdentity; }
export interface ProducerReference { readonly id: StableIdentity; readonly version: string; }
export interface MarketAuthorityReference { readonly id: StableIdentity; readonly version: string; readonly sha256: Sha256Digest; }
export interface MarketAuthority { readonly trustedConfiguration: MarketAuthorityReference; readonly policy: MarketAuthorityReference; readonly evidenceContract: MarketAuthorityReference; readonly marketConfigSha256: Sha256Digest; }
export interface MarketEvidenceContract { readonly id: StableIdentity; readonly version: string; readonly selectionProvenance: EvidenceContractSelectionProvenance; readonly requirementIds: readonly StableIdentity[]; }
export type MarketExpectation = { readonly kind: "CONSTANT_EQUALS"; readonly value: JsonPrimitive } | { readonly kind: "TARGET_BINDING_EQUALS"; readonly targetField: "repository" | "pullRequestNumber" | "baseSha" | "headSha" };
export interface MarketObservationRequirement { readonly id: StableIdentity; readonly inputKind: "OBSERVATION"; readonly requiredProducer: ProducerReference; readonly factKey: string; readonly expectation: MarketExpectation; }
export interface MarketReceiptRequirement { readonly id: StableIdentity; readonly inputKind: "VERIFICATION_RECEIPT"; readonly requiredProducer: ProducerReference; readonly commandName: string; readonly expectedReceiptStatus: "PASS"; }
export type MarketEvidenceRequirement = MarketObservationRequirement | MarketReceiptRequirement;
export interface MarketObservation { readonly id: StableIdentity; readonly producer: ProducerReference; readonly targetScopeId: StableIdentity; readonly factKey: string; readonly factValue: JsonPrimitive; readonly sourceInputId: StableIdentity; readonly orderingKey: string; readonly limitations: readonly string[]; }
export type VerificationReceiptStatus = "PASS" | "FAIL" | "TIMEOUT" | "ERROR";
export interface VerificationReceipt { readonly schemaVersion: "proofrail.verification-receipt.v1"; readonly id: StableIdentity; readonly type: "COMMAND_EXECUTION"; readonly producer: ProducerReference; readonly target: MarketTarget; readonly command: { readonly name: string; readonly run: string; readonly orderingKey: string }; readonly environment: Readonly<Record<string, unknown>>; readonly executionBoundaryId: string; readonly timing: Readonly<Record<string, unknown>>; readonly result: { readonly status: VerificationReceiptStatus; readonly exitCode: number | null; readonly stdoutDigest: Sha256Digest; readonly stderrDigest: Sha256Digest }; readonly dependencyLockfile: Readonly<Record<string, unknown>>; readonly redaction: Readonly<Record<string, unknown>>; readonly lineage: { readonly trustedConfigurationSha256: Sha256Digest; readonly policySha256: Sha256Digest; readonly evidenceContractSha256: Sha256Digest; readonly marketConfigSha256: Sha256Digest } }
export type MarketPolicyCondition = typeof MARKET_POLICY_CONDITIONS[number];
export interface MarketPolicyRule { readonly id: StableIdentity; readonly condition: MarketPolicyCondition; readonly verdict: Exclude<Verdict, "ADMISSIBLE">; readonly reasonCode: string; }
export interface MarketKernelInput { readonly schemaVersion: "proofrail.kernel.input.v2"; readonly evaluation: EvaluationReference; readonly target: MarketTarget; readonly authority: MarketAuthority; readonly claims: readonly Claim[]; readonly evidenceContract: MarketEvidenceContract; readonly evidenceRequirements: readonly MarketEvidenceRequirement[]; readonly observations: readonly MarketObservation[]; readonly verificationReceipts: readonly VerificationReceipt[]; readonly rules: readonly MarketPolicyRule[]; }
export interface MarketEvidence { readonly id: StableIdentity; readonly evaluationId: StableIdentity; readonly evidenceContractId: StableIdentity; readonly requirementId: StableIdentity; readonly targetScopeId: StableIdentity; readonly satisfaction: { readonly kind: "OBSERVATION" | "VERIFICATION_RECEIPT" }; readonly acceptedObservationIds: readonly StableIdentity[]; readonly acceptedReceiptIds: readonly StableIdentity[]; readonly lineageIds: readonly StableIdentity[]; }
export interface MarketEvidenceLineage { readonly id: StableIdentity; readonly kind: "OBSERVATION_ACCEPTED" | "VERIFICATION_RECEIPT_ACCEPTED" | "EVIDENCE_PRODUCED" | "POLICY_RULE_EVALUATED" | "VERDICT_REDUCED"; readonly references: Readonly<Record<string, JsonPrimitive | readonly JsonPrimitive[]>>; }
export interface MarketEvidenceBundle { readonly schemaVersion: "proofrail.evidence-bundle.v2"; readonly kernelEngineVersion: "0.3.0-market-prototype"; readonly evaluationId: StableIdentity; readonly target: MarketTarget; readonly authority: MarketAuthority; readonly claims: readonly Claim[]; readonly evidenceContract: MarketEvidenceContract; readonly evidenceRequirements: readonly MarketEvidenceRequirement[]; readonly observations: readonly MarketObservation[]; readonly verificationReceipts: readonly VerificationReceipt[]; readonly evidence: readonly MarketEvidence[]; readonly evidenceLineage: readonly MarketEvidenceLineage[]; readonly rules: readonly MarketPolicyRule[]; readonly policyConditions: readonly MarketPolicyCondition[]; readonly verdict: Verdict; readonly reasonCodes: readonly string[]; readonly verdictReduction: VerdictReduction; readonly componentDigests: Readonly<Record<string, Sha256Digest>>; readonly artifactDigest: Sha256Digest; }
export interface MarketArtifactScope { readonly allowedPatterns: readonly string[]; readonly deniedPatterns: readonly string[]; readonly changedPaths: readonly string[]; readonly outsideDeclaredScope: readonly string[]; }
export interface MarketArtifactReview { readonly authorLogin: string | null; readonly authorCanPushToRepository: boolean; readonly state: string; readonly submittedAt: string | null; readonly commitOid: string | null; }
export interface MarketReportedCheck { readonly kind: "check-run" | "status-context"; readonly name: string; readonly status: string; readonly conclusion: string | null; }
export interface MarketArtifactProjection { readonly facts: Readonly<Record<string, JsonPrimitive>>; readonly scope: MarketArtifactScope; readonly reviews: readonly MarketArtifactReview[]; readonly reportedChecks: readonly MarketReportedCheck[]; readonly reviewNeeds: readonly string[]; }
export interface FinalizedMarketEvidenceBundle extends MarketEvidenceBundle, MarketArtifactProjection { readonly summary: string; readonly finalizedAt: string; }
export interface MarketEvidenceArtifact { readonly bundle: FinalizedMarketEvidenceBundle; readonly text: string; readonly bytes: number; readonly artifactDigest: Sha256Digest; }

export type MarketLifecyclePhase = "COLLECTING_EVIDENCE" | "READY_FOR_REEVALUATION" | "TERMINAL" | "BLOCKED";
export type MarketLifecycleEvent =
  | { readonly id: StableIdentity; readonly kind: "OBSERVATION_COLLECTED"; readonly observation: MarketObservation }
  | { readonly id: StableIdentity; readonly kind: "VERIFICATION_RECEIPT_COLLECTED"; readonly receipt: VerificationReceipt }
  | { readonly id: StableIdentity; readonly kind: "RE_EVALUATE" };
export type MarketLifecycleNextAction =
  | { readonly kind: "COLLECT_EVIDENCE"; readonly requirementIds: readonly StableIdentity[] }
  | { readonly kind: "RE_EVALUATE" }
  | { readonly kind: "START_NEW_EVALUATION"; readonly previousVerdict: Verdict }
  | { readonly kind: "REMOVE_BLOCKER"; readonly reasonCodes: readonly string[] };
export interface MarketLifecycleState {
  readonly schemaVersion: "proofrail.market-lifecycle.v1";
  readonly evaluationId: StableIdentity;
  readonly phase: MarketLifecyclePhase;
  readonly input: MarketKernelInput;
  readonly bundle: MarketEvidenceBundle;
  readonly nextAction: MarketLifecycleNextAction;
  readonly processedEventIds: readonly StableIdentity[];
  readonly eventDigests: Readonly<Record<StableIdentity, Sha256Digest>>;
  readonly verdict?: Verdict | undefined;
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
