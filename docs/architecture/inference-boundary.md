# Inference Boundary

## Authority

This document is authoritative for the Inference Zone and inference authority limits.

## Inference Zone

The Inference Zone is an isolated boundary for AI or model-assisted behavior.

Inference may:

- draft an Evidence Contract as an Inference Proposal
- parse natural-language intent into an Inference Proposal
- explain deterministic results
- summarize Evidence Lineage
- suggest remediation text

Inference may not:

- create authoritative Evidence
- alter an Observation
- mark an Evidence Requirement satisfied
- fabricate a Verification Receipt
- produce an authoritative Verdict
- bypass Policy
- change Rule semantics
- modify a finalized Evidence Bundle
- convert model confidence into authority

## Structural Separation

All inference outputs MUST be structurally distinguishable from authoritative domain records.

Use the canonical term `Inference Proposal` unless [../constitution/terminology.md](../constitution/terminology.md) establishes a more precise subtype.

Inference Proposal identifiers and serialization shapes MUST NOT be ambiguous with Evidence, Verification Receipts, Verdicts, or Evidence Bundles.

## Dependency Rule

The kernel, policy evaluation path, evidence satisfaction path, and bundle finalization path MUST NOT import the Inference Zone.

Delivery surfaces may display inference explanations only as explanatory content. They MUST preserve deterministic Verdict and reason codes as the authoritative outcome.