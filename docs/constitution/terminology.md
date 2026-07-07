# Canonical Terminology

## Authority

This document is authoritative for Proofrail domain vocabulary.

New normative domain concepts MUST be added here before they are used elsewhere as authoritative terms. Future agents MUST NOT introduce parallel terms because they sound natural.

## Canonical Terms

### Claim

Definition: A statement that a change has a property or satisfies a requirement.

Authority characteristics: A Claim has no evidentiary authority by itself.

Relationship: A Claim may motivate Evidence Requirements or request evaluation. It is not an Observation, Evidence, Verification Receipt, Policy, Rule, or Verdict.

Warnings: Do not treat an agent statement as Evidence.

### Observation

Definition: A deterministic fact discovered about a target repository, environment, artifact, or verification result by an authorized mechanism.

Authority characteristics: An Observation is authoritative only within its method, scope, inputs, and lineage.

Relationship: Evidence may cite Observations when they satisfy Evidence Requirements. Observations are not Verdicts.

Warnings: Repository prose is input to observation, not automatically an Observation.

### Evidence

Definition: An authoritative record that a specific Evidence Requirement has been satisfied by acceptable Observations or Verification Receipts.

Authority characteristics: Evidence must be traceable to requirements, inputs, and lineage.

Relationship: Evidence contributes to policy evaluation and verdict derivation. Evidence is not a Claim, Rule, or Policy.

Warnings: AI explanations, human assertions, comments, deterministic values, digests, parser results, and other records are not Evidence by themselves. A future additional authoritative Evidence satisfaction input class requires an explicit terminology and protocol revision.

### Evidence Requirement

Definition: A required condition that must be satisfied for a change to be considered under an Evidence Contract or Policy.

Authority characteristics: An Evidence Requirement obtains authority from a versioned Evidence Contract or Policy.

Relationship: Evidence satisfies Evidence Requirements. Rules may reference Evidence Requirements. Evidence Requirements are not Rules.

Warnings: Do not use "Evidence Constraint", "Requirement Spec", or "Evidence Rule" as interchangeable synonyms.

### Evidence Contract

Definition: A versioned set of Evidence Requirements and expected verification or observation obligations for a task or change class.

Authority characteristics: An Evidence Contract is authoritative only when selected through Trusted Configuration or deterministic Policy selection.

Relationship: It governs what Evidence is needed before policy evaluation can derive a Verdict.

Warnings: An Inference Proposal may draft an Evidence Contract, but the proposal is not authoritative until accepted through Trusted Configuration or deterministic Policy selection. Agent requests, natural-language task descriptions, and Machine Task Contracts do not make an Evidence Contract authoritative.

### Verification Receipt

Definition: A deterministic record of a verification action, including mechanism identity, inputs, environment identity where available, output summary, result state, and ordering data.

Authority characteristics: A Verification Receipt is authoritative only for the verification action it records and within its modeled environment.

Relationship: Receipts may support Evidence. They do not by themselves decide a Verdict.

Warnings: A missing receipt is missing evidence, not successful verification.

### Policy

Definition: A versioned deterministic governance artifact that declares which Rules and Evidence Requirements apply to a change, scope, actor, or environment.

Authority characteristics: Policy obtains authority from trusted configuration.

Relationship: Policy selects or contains Rules and may require Evidence Requirements. Policy evaluation derives Verdicts through deterministic rules.

Warnings: Policy is not free-form AI judgment.

### Rule

Definition: A deterministic policy unit that evaluates declared inputs and emits stable machine-readable reason codes.

Authority characteristics: A Rule is authoritative only as part of a versioned Policy or trusted configuration.

Relationship: Rules may test Evidence, missing requirements, contradictions, unsupported capability, or denial conditions.

Warnings: Do not collapse Policy, Rule, and Evidence Requirement into a generic rule concept.

### Verdict

Definition: The authoritative deterministic outcome of an evaluation using canonical verdict vocabulary.

Authority characteristics: A Verdict is authoritative only when derived from declared deterministic inputs through the authorized verdict path.

Relationship: Verdicts are recorded in Evidence Bundles and explained by reason codes. Natural-language explanation does not change Verdict semantics.

Warnings: Only `ADMISSIBLE`, `REVISION_REQUIRED`, `REJECTED`, and `BLOCKED` are canonical Verdict values.

### Evidence Bundle

Definition: An immutable finalized collection of evaluation inputs, Evidence, Verification Receipts, Evidence Lineage, Policy references, reason codes, and Verdict metadata for a specific evaluation.

Authority characteristics: A finalized Evidence Bundle must not be mutated in place. A later bundle may supersede an earlier bundle.

Relationship: Bundles preserve auditability and reproducibility analysis.

Warnings: Do not edit finalized bundle history to correct an outcome.

### Evidence Lineage

Definition: The trace of sources, transformations, requirements, receipts, policies, rules, and supersession relationships that explain how Evidence and a Verdict were produced.

Authority characteristics: Lineage is authoritative only when generated or accepted through deterministic Proofrail authority paths.

Relationship: Evidence Lineage is included in Evidence Bundles and may be summarized by inference.

Warnings: A summary of lineage is not the lineage record.

### Adapter Capability

Definition: A declared capability of a language or tool adapter, including support state, limitation details, and deterministic reason codes.

Authority characteristics: Adapter Capability records are authoritative only for the adapter identity, version, environment, and target scope that produced them.

Relationship: Capabilities inform observation quality, unsupported conditions, degraded conditions, and policy decisions.

Warnings: Do not claim equivalent semantic capability across languages.

### Inference Proposal

Definition: A structurally distinct non-authoritative output from an inference system, such as a draft Evidence Contract, explanation, remediation suggestion, or natural-language summary.

Authority characteristics: An Inference Proposal is proposed content. It has no evidentiary or verdict authority unless later accepted through a separate authorized deterministic path.

Relationship: Inference Proposals may help humans or agents prepare inputs. They do not satisfy Evidence Requirements.

Warnings: Inference Proposal identifiers and serialization shapes must not be ambiguous with Evidence, Verification Receipts, or Evidence Bundles.

## Prohibited Ambiguity

The following terms MUST NOT be treated as interchangeable unless a future terminology revision defines separate meanings:

- Evidence Requirement
- Evidence Constraint
- Requirement Spec
- Evidence Rule

When in doubt, use the canonical term or stop and update this document within task scope.
