# Kernel Vertical Slice Implementation Record

This document records the `KERNEL-VS-001` Builder implementation. It is not product authority and does not change canonical terminology, Trust semantics, Verdict semantics, protocol authority, or the Evidence Bundle foundation.

## Package Boundary

The implementation adds only the authorized Phase 1 production package layers:

- `packages/contracts`
- `packages/kernel`

`@proofrail/contracts` owns structural shapes and constants for the vertical slice. It does not import the kernel and does not evaluate requirements, rules, or Verdicts.

`@proofrail/kernel` depends on `@proofrail/contracts` through a pnpm workspace dependency and owns the deterministic behavior for the synthetic-input vertical slice.

No adapter, delivery surface, orchestration package, inference package, repository scanner, verification runner, CLI, API, MCP server, web app, GitHub integration, or target-repository execution path is implemented.

## Synthetic Kernel Boundary

The public kernel entry point is `evaluateKernel(input)`, also exported as `evaluate`.

The Phase 1 synthetic kernel boundary models already-authorized inputs. It does not establish Trusted Configuration. It does not perform deterministic Policy selection. It does not prove external Rule authority. It does not inspect repositories. It does not execute verification. It does not implement the complete final Evidence Bundle protocol.

The boundary accepts only synthetic in-memory domain input supplied directly to the kernel. The kernel rejects authority-shaped fields such as `modelConfidence`, `inferenceProposal`, and `proposedContent` before evaluation.

## Array Container Boundary Validation

`KERNEL-VS-CONV-001` hardens authoritative Array handling at the public kernel boundary. Array containers are descriptor-inspected before element values are read.

The boundary rejects sparse arrays, accessor-backed array indices, symbol-keyed array properties, unexpected string-keyed array properties, custom non-enumerable array properties, and array-attached authority-shaped fields such as `modelConfidence`, `inferenceProposal`, and `proposedContent`.

This applies recursively to top-level kernel arrays and nested modeled arrays such as Evidence Contract `requirementIds` and Observation `limitations`.

## Evidence Contract Selection Provenance

Evidence Contract selection provenance is modeled only as already authorized selection provenance for deterministic evaluation.

Allowed provenance sources are:

- `TRUSTED_CONFIGURATION`
- `DETERMINISTIC_POLICY_SELECTION`

The implementation rejects `MACHINE_TASK_CONTRACT`, `MODEL_OUTPUT`, and `INFERENCE_PROPOSAL` as Evidence Contract selection provenance. A declared provenance string is not a general trust establishment mechanism. Future application orchestration must establish that authority before supplying the kernel boundary.

## Rule Authority Provenance

Rules carry authority provenance only as already-authorized synthetic input.

Allowed Rule authority sources are:

- `TRUSTED_CONFIGURATION`
- `POLICY`

The implementation rejects `MACHINE_TASK_CONTRACT`, `MODEL_OUTPUT`, and `INFERENCE_PROPOSAL` as Rule authority provenance. A Rule authority reference does not prove external trust.

## Evidence Satisfaction

The vertical slice implements one narrow Evidence satisfaction rule:

```text
OBSERVATION_FACT_EQUALS
```

An Observation satisfies an Evidence Requirement only when all modeled fields match deterministically:

- target scope identity
- observer identity
- observer version
- fact key
- expected JSON primitive value
- no modeled limitations

There is no fuzzy matching, natural-language interpretation, model confidence, coercive equality, Verification Receipt ingestion, or Claim-to-Evidence shortcut. The number `1` and the string `"1"` are different values.

## Evaluation Scope Consistency

`KERNEL-VS-CONV-001` rejects Observations whose `targetScopeId` is outside the declared evaluation scope covered by Claims and selected Evidence Contracts after existing Claim/Contract consistency validation.

An Observation in the declared evaluation scope remains valid boundary input even when it does not satisfy an Evidence Requirement because observer identity, observer version, fact key, fact value, or limitations differ.

## Rule Evaluation

Rules are evaluated after Evidence satisfaction. The vertical slice implements only narrow predicates:

- `EVIDENCE_PRESENT`
- `EVIDENCE_ABSENT`

The only implemented Rule effect is deterministic denial. A triggered denial creates a `REJECTED` candidate Verdict, retains the Rule reason code, and preserves the Rule identity in Evidence Lineage. Rule reason codes beginning with `HARN_` are rejected so Foundation harness reason codes do not leak into product kernel reason codes.

The kernel-owned missing Evidence Requirement condition reason code `KERNEL_EVIDENCE_REQUIREMENT_MISSING` remains internal to `packages/kernel` and is reserved from Rule-supplied reason codes. This is a narrow reservation, not a general product reason-code registry and not a reservation of every `KERNEL_` prefix.

## Deterministic Normalization

The kernel validates and clones accepted input before evaluation. Normalization sorts semantically unordered arrays by stable identity or deterministic ordering key:

- Claims by identity
- Evidence Contracts by identity
- Evidence Requirement identities inside Evidence Contracts
- Evidence Requirements by identity
- Observations by ordering key, then identity
- Rules by identity
- Observation limitations by stable string order

Duplicate identities are rejected before normalization.

## Canonical Serialization

The kernel uses canonical JSON serialization for digests and derived identities. Object keys are sorted recursively, normalized array order is preserved, and only JSON-compatible values are accepted.

The implementation rejects functions, symbols, bigint, `undefined`, cyclic input, `Date`, `Map`, `Set`, `NaN`, and `Infinity` from authoritative input structures.

## Derived Identity Strategy

Evidence, lineage, Verdict candidates, and Evidence Bundle identities are derived from SHA-256 hashes over canonical deterministic content.

The implementation does not use timestamps, random identifiers, host identity, absolute repository paths, process uptime, environment-variable values, network-derived values, `Date.now`, `new Date`, `Math.random`, `crypto.randomUUID`, or random UUID packages as authoritative evaluation inputs or derived identity sources.

## Verdict Reduction

Verdict reduction is a focused deterministic function over already-classified candidate Verdict states. It preserves the canonical precedence:

```text
BLOCKED > REJECTED > REVISION_REQUIRED > ADMISSIBLE
```

Reduction preserves every applicable reason code and all candidate lineage references. Lower-precedence reasons are not discarded when a higher-precedence Verdict wins.

`ADMISSIBLE` is produced only when all applicable Evidence Requirements are satisfied, no deterministic Rule denial is triggered, and no higher-precedence candidate condition exists.

## Evidence Lineage

The finalized vertical-slice bundle includes explicit Evidence Lineage entries for:

- Claim
- selected Evidence Contract
- Evidence Contract selection provenance
- Evidence Requirement
- accepted Observation
- produced Evidence
- evaluated Rule
- Verdict candidate classification
- Verdict reduction

Lineage identities and ordering are deterministic. Natural-language explanation, comments, test names, and Builder prose are not Evidence Lineage.

## Evidence Bundle Finalization

The Phase 1 bundle records enough deterministic state to inspect the vertical-slice evaluation:

- bundle identity
- bundle schema version
- kernel engine version
- evaluation identity
- Claims
- Evidence Contracts
- Evidence Contract selection provenance
- Evidence Requirements
- Observations
- produced Evidence
- Rules
- empty `verificationReceipts`
- Evidence Lineage
- winning Verdict
- retained reason codes
- deterministic Verdict reduction record

`verificationReceipts` is empty because this Phase 1 slice does not ingest Verification Receipts. The implementation does not create fake Verification Receipts, repository snapshot data, adapter identities, Adapter Capability data, environment identity, or Policy digest data.

The bundle identity is derived from canonical finalized bundle content excluding the bundle identity field itself.

## Immutability

Finalized Evidence Bundles are deeply frozen in memory, including nested arrays and nested records. Finalization does not freeze or mutate caller-owned input. Mutating caller-owned input after evaluation does not change the finalized bundle.

## Non-Goals

`KERNEL-VS-001` does not implement:

- repository inspection
- target repository code execution
- verification execution
- Verification Receipt ingestion
- language adapters
- Adapter Capability modeling
- Python path traversal detection
- CLI, API, MCP, web, or GitHub delivery surfaces
- SARIF export
- model provider integration
- Inference Zone implementation
- Policy runtime
- general product reason-code registry
- complete final Evidence Bundle protocol

## Future Gaps

Future authorized tasks must establish external trust before supplying the kernel boundary, implement deterministic Policy selection outside this kernel slice, define any additional Evidence satisfaction input classes through terminology and protocol authority, and implement delivery or integration surfaces only under later Machine Task Contracts.
