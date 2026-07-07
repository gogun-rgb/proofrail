# Data Flow

## Authority

This document is authoritative for conceptual Phase 0 data-flow direction. It is not an implementation design.

## Authoritative Path

Conceptual authoritative flow:

```text
Claim
  -> selected Evidence Contract
  -> Evidence Requirements
  -> authorized Observations and Verification Receipts
  -> Evidence satisfaction
  -> Policy and Rule evaluation
  -> Verdict
  -> finalized Evidence Bundle with Evidence Lineage
```

Each step must preserve identity, scope, and lineage.

## Inference Path

Inference is parallel and non-authoritative:

```text
inputs or authoritative records
  -> inference system
  -> Inference Proposal
```

An Inference Proposal may help with drafting, explanation, or summarization. It does not enter the authoritative path unless a future authorized deterministic process accepts it as a separate input.

## Distinguishable Conditions

Missing Evidence Requirements, contradictory Evidence, malformed input, unsupported capability, degraded capability, verification failure, policy denial, and execution impossibility must remain distinguishable. They must not be collapsed into natural-language error text.

## Bundle Finalization

A finalized Evidence Bundle records the authoritative outcome for a specific evaluation. It is immutable in concept. Later evaluations may create superseding bundles; they do not mutate finalized history.