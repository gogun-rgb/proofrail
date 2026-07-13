# Foundation Gate

## Authority

This document is authoritative for Phase 0 foundation review criteria and current Foundation Gate state. The Builder cannot grade its own foundation acceptance.

## Current Gate State

Foundation Gate state: PASS by external independent repository engineering review.

Decision scope: Phase 0 Foundation Gate.

Decision baseline: `7865ea299f98b3fd0158d1486272f73468b345ac`, the exact Foundation baseline ending in PR #3 integration.

Decision boundary: Foundation Gate PASS is a repository engineering review decision. It is not the Proofrail product Verdict ADMISSIBLE and does not claim a product runtime, kernel, repository inspection, verification execution, adapters, delivery surfaces, GitHub integration, or Phase 1 vertical slice exists.

Review record: [../reviews/phase-0-foundation-gate-independent-review.md](../reviews/phase-0-foundation-gate-independent-review.md).

Historical criteria remain below. This state update does not rewrite those criteria as though the gate had always passed and does not collapse mechanically verified checks into independently reviewable acceptance.

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
- The bounded six-package product fixture corpus and its separate generated inventory execute deterministically.
- Exact-byte authority, golden, fixture, and generated-reference paths are checked out with LF and verified in a temporary `core.autocrlf=true` checkout.
- The current six-package architecture loading boundary has an executable fail-closed checker and synthetic negative cases.

## Agent Legibility Gate

- AGENTS.md is a usable map.
- A clean agent can locate authoritative concepts.
- A clean agent distinguishes locating authority from permission to modify authority-bearing targets.
- A clean agent can perform authority-change preflight before editing authority-bearing targets.
- Stop conditions are discoverable.
- Prohibited silent redesign behavior is explicit.

## Clean Agent Test

The Clean Agent Test gives a new agent with no conversational history a bounded task such as:

```text
Add a deterministic observation specification for lockfile changes.
```

The clean agent should be able to:

- locate authoritative documents
- identify the intended layer
- identify whether editing an authority-bearing target is authorized before making the edit
- avoid inventing duplicate terminology
- respect scope
- identify required verification
- stop if protocol authority must change

For the bounded lockfile Observation example, if adding the requested specification requires modifying authoritative protocol direction and no applicable authority-changing Machine Task Contract is supplied, the clean agent should stop before editing the protocol document.

The Builder summary cannot grade this test. Each retained run requires a distinct fresh-context grading pass based on recorded run evidence and protocol criteria rather than a completion claim. No separate human identity or GitHub account is required.

`PRODUCT-HARDEN-001` retained two runs against candidate `e7df25ff368b789158a673498a187d9124e1912d`. Both used the same exact bounded task, stopped before an unauthorized authority edit, preserved clean worktrees, and received `PASS` on the same nine grading criteria. The standalone validator reports two valid records with no findings. This later executable evidence preserves rather than rewrites the historical failure and convergence trials that supported the Phase 0 Foundation Gate decision.

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
- product-owned reason-code registry schema, emitted-code, surface, deprecation, and generated-reference validation
- repository identity hygiene checks
- generated governance projection freshness
- Documentation Authority Index structural checks
- declared AGENTS.md authority-route checks
- exact LF checkout and `core.autocrlf=true` byte-equality checks
- bounded six-package architecture loading checks and synthetic negative cases
- schema-validated deterministic product fixture execution and generated inventory equality
- structural Clean Agent run-record, byte-digest, pair-equality, and candidate-ancestry validation

Independently reviewable gate:

- conceptual coherence
- authority conflicts
- hidden AI authority
- architecture leakage risk
- legibility for clean agents
- assumption-resistant Clean Agent Test grading
- Foundation Gate acceptance

Not implemented as product gates:

- target repository checkout, content inspection, or target command execution
- adapter or Verification Receipt execution coverage
- general product reliability, deployment readiness, or trusted-release determination

## Mechanization Boundary

The current mechanization distinguishes:

- Mechanically verified: deterministic repository governance, LF checkout, bounded architecture, product fixture, and Clean Agent record checks run by `pnpm verify`.
- Evidence-based review: conceptual, authority, and grading judgments require a separate review pass that does not rely on Builder claims; a different human identity is not inherently required.
- Not claimed: unimplemented target execution, adapters, Verification Receipts, broader product reliability, trusted release, or a Proofrail product Verdict.

The validator can establish only its bounded structural and deterministic results. It cannot cryptographically prove hidden-context absence, conceptual coherence, complete architecture quality, general product-fixture maturity, Foundation Gate acceptance, trusted release, or a Proofrail product Verdict.
