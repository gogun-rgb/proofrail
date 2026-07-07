# Foundation Gate

## Authority

This document is authoritative for Phase 0 foundation review criteria. The Builder cannot grade its own foundation acceptance.

## Domain Gate

- Canonical terminology is stable enough for bounded implementation.
- Authoritative documentation locations are explicit.
- Normative terminology conflicts are absent or documented.

## Architecture Gate

- Dependency directions are defined.
- Forbidden dependencies are defined.
- Kernel authority boundaries are explicit.
- Inference boundaries are explicit.

## Verdict Gate

- Verdict semantics are deterministic.
- No inference authority exists in the verdict path.
- Missing, contradictory, denied, unsupported, degraded, malformed, and blocked conditions are distinguishable.

## Protocol Gate

- Evidence protocol foundation is coherent.
- Adapter capability model is coherent.
- Policy concepts are separated.
- Bundle immutability and supersession semantics are explicit.

## Harness Gate

- Machine Task Contract format exists.
- Governance validation strategy exists.
- Reason-code registry strategy exists.
- Fixture strategy exists.
- Adversarial fixture strategy exists.

## Agent Legibility Gate

- AGENTS.md is a usable map.
- A clean agent can locate authoritative concepts.
- Stop conditions are discoverable.
- Prohibited silent redesign behavior is explicit.

## Clean Agent Test

The future Clean Agent Test gives a new agent with no conversational history a bounded task such as:

```text
Add a deterministic observation specification for lockfile changes.
```

The clean agent should be able to:

- locate authoritative documents
- identify the intended layer
- avoid inventing duplicate terminology
- respect scope
- identify required verification
- stop if protocol authority must change

The Builder cannot grade this test. It requires an independent fresh-context agent or equivalent independent review process.

## Gate Classification

Mechanically verifiable gate:

- required document existence
- local Markdown reference validity
- governance configuration shape
- canonical terminology anchors
- Machine Task Contract schema artifact presence
- repository identity hygiene checks

Independently reviewable gate:

- conceptual coherence
- authority conflicts
- hidden AI authority
- architecture leakage risk
- legibility for clean agents

Future executable gate:

- architecture dependency checks
- reason-code registry validation
- fixture and adversarial fixture checks
- protocol schema compatibility checks
- Clean Agent Test protocol execution