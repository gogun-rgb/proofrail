# Evidence Bundle Format Foundation

## Authority

This document is authoritative for Phase 0 Evidence Bundle direction.

## Current Phase

No Evidence Bundle runtime format is implemented in Phase 0.

## Bundle Invariant

A finalized Evidence Bundle is immutable in concept.

A later bundle may supersede an earlier bundle. It must not mutate finalized bundle history in place.

## Future Bundle Contents

A future Evidence Bundle should record:

- bundle identity
- bundle schema version
- Proofrail engine version
- repository snapshot digest
- Evidence Contract digest
- Policy digest
- adapter identities
- adapter versions
- Adapter Capability states
- Observations
- Verification Receipts
- Evidence
- Evidence Lineage
- Verdict
- stable reason codes
- relevant environment identity
- supersession relationship where applicable

## Deterministic Evaluation

DETERMINISTIC EVALUATION means the same authoritative normalized inputs should lead to the same deterministic evaluation.

This is a property of the evaluation path, not a claim that every environment will produce the same observations.

## Environmental Reproducibility

ENVIRONMENTAL REPRODUCIBILITY means separate environments can reproduce the same observations or verification receipts.

Proofrail MUST NOT overclaim bit-for-bit reproducibility across machines or environments unless every meaningful environmental input is modeled and controlled.

## Design Risk

Future work must keep deterministic evaluation and environmental reproducibility visibly separate. Collapsing them would hide verification uncertainty and weaken auditability.