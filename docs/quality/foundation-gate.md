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
- Foundation engineering harness reason-code registry exists under `governance/harness-reason-codes.json`.
- Fixture strategy exists in [../engineering/fixture-strategy.md](../engineering/fixture-strategy.md).
- Adversarial fixture strategy exists in [../engineering/fixture-strategy.md#adversarial-fixture-classes](../engineering/fixture-strategy.md#adversarial-fixture-classes).

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

Mechanically verified gate:

- required document existence
- local Markdown reference validity
- local Markdown anchor validity
- governance configuration schema validity
- canonical terminology exact-set drift
- canonical Verdict exact-set drift
- Machine Task Contract schema review constants
- committed JSON Machine Task Contract validation
- HARN_ harness reason-code registry validation
- validator emitted reason-code registration
- repository identity hygiene checks
- generated governance projection freshness
- Documentation Authority Index structural checks
- declared AGENTS.md authority-route checks

Independently reviewable gate:

- conceptual coherence
- authority conflicts
- hidden AI authority
- architecture leakage risk
- legibility for clean agents
- Clean Agent Test grading
- Foundation Gate acceptance

Future executable gate:

- architecture dependency checks
- product runtime reason-code registry validation
- fixture and adversarial fixture checks derived from the documented fixture strategy
- protocol schema compatibility checks
- Clean Agent Test protocol execution

## Mechanization Boundary

The current mechanization distinguishes:

- Mechanically verified: deterministic repository governance checks run by `pnpm verify`.
- Independently reviewable: conceptual and authority judgments that require a reviewer other than the Builder.
- Future executable: checks that require future product layout, fixture corpus, protocol schemas, or independent Clean Agent Test execution.

The validator must not claim hidden AI authority absence, conceptual coherence, architecture quality, Clean Agent Test success, Foundation Gate acceptance, or product fixture maturity.
