# Phase 2 AI PR Evidence Gate

## Status

Active narrowed product focus. `PRODUCT-FOCUS-001` defined the next Proofrail direction as an AI PR Evidence Gate.

`GATE-MVP-001` starts the smallest useful implementation: a local static-input evidence packet builder. This MVP is not product readiness, trusted release status, or a Proofrail product Verdict.

## Objective

The Phase 2 AI PR Evidence Gate is a small, practical first product direction for AI-authored pull requests.

The first useful product shape is an evidence packet that separates:

- Builder claims about the pull request
- observed evidence supplied as input
- missing evidence that still needs collection or review
- scope boundaries for the proposed change
- review needs for independent human or machine review

The packet direction preserves the core product principle:

> Claim is not evidence. Verify it.

## MVP Boundary

`GATE-MVP-001` may implement only local static-input packet construction under `packages/evidence-gate`.

The MVP may:

- normalize caller-provided pull request facts
- keep claims separate from observed evidence
- keep missing evidence visible
- preserve changed-path scope boundaries
- produce deterministic packet output for identical normalized input
- expose local tests through `pnpm test:evidence-gate`

The MVP does not implement the complete product runtime. It does not collect facts from a live repository, run target project commands, integrate with delivery channels, use model judgment, or produce an authoritative Proofrail product Verdict.

## Evidence Packet Orientation

The evidence packet must keep these separations explicit:

- a claim is an assertion, not Evidence by itself
- passing tests are evidence, not authority
- Builder output is provisional until reviewed under the applicable gate
- PR merge is not a trusted release
- missing evidence remains visible instead of being converted into confidence
- review needs are preserved for independent review rather than hidden behind model judgment

## De-Scoped Until Later Authorization

The following remain out of scope until separately authorized:

- complete Proofrail product Verdict runtime
- broad Evidence Bundle protocol completion
- Inference Zone behavior
- model providers
- adapters
- delivery surfaces
- live repository fact collection
- target project command execution

## Relationship to Phase 2 Boundary Definition

[phase-2-boundary-definition.md](phase-2-boundary-definition.md) remains a boundary-only record. This plan narrows the product focus within that boundary and records the first static-input MVP step.

Neither this plan nor PR #14 is product readiness, trusted release status, or an authoritative Proofrail product Verdict.

## Future Implementation Preconditions

Any implementation beyond the static-input MVP requires a later valid Machine Task Contract that defines exact write scope, forbidden scope, acceptance criteria, required verification, stop conditions, and independent review.

Future implementation must not change canonical terminology, Verdict semantics, Evidence authority classes, Trust semantics, or product protocols unless a later valid Machine Task Contract explicitly authorizes that exact authority-bearing change.

## Stop Conditions

Stop instead of expanding this focus if work requires:

- product semantic changes
- Verdict semantic changes
- Evidence authority class changes
- Trust semantic changes
- canonical terminology changes
- production work outside the authorized package and tests
- live repository fact collection, target project command execution, adapters, delivery channels, model-provider behavior, or Inference Zone implementation
- treating this MVP as product readiness, trusted release status, or an authoritative Proofrail product Verdict
- cost-risk setup
