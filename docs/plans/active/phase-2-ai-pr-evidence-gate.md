# Phase 2 AI PR Evidence Gate

## Status

Narrowed product focus only. `PRODUCT-FOCUS-001` defines the next Proofrail product direction as an AI PR Evidence Gate.

This plan does not authorize product runtime implementation, product readiness, trusted release status, or a Proofrail product Verdict.

## Objective

The Phase 2 AI PR Evidence Gate is a small, practical first product direction for AI-authored GitHub pull requests.

The intended future product shape is an evidence packet that separates:

- Builder claims about the pull request
- observed evidence available to a future authorized implementation
- missing evidence that still needs collection or review
- scope boundaries for the proposed change
- review needs for independent human or machine review

The packet direction preserves the core product principle:

> Claim is not evidence. Verify it.

## Non-Implementation Boundary

This focus plan is roadmap direction only. It does not implement or authorize:

- repository inspection behavior
- execution of target repository code
- verification execution behavior
- language adapters or adapter capability implementation
- CLI, API, MCP, web, GitHub, SARIF, or other delivery surfaces
- model provider behavior
- Inference Zone implementation
- complete product Verdict runtime behavior
- broad Evidence Bundle protocol completion
- production package changes
- contracts, tests, scripts, CI, or generated projection changes

## Evidence Packet Orientation

A later authorized implementation may request scope to define and implement evidence-packet behavior, but only under a separate valid Machine Task Contract and independent review.

That later work should keep these separations explicit:

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
- repository inspection implementation
- verification execution implementation
- target-code execution behavior

## Relationship to Phase 2 Boundary Definition

[phase-2-boundary-definition.md](phase-2-boundary-definition.md) remains a boundary-only record. This plan narrows the next product focus within that non-implementation posture.

Neither this plan nor PR #14 is implementation authority, independent acceptance evidence, product readiness, trusted release status, or an authoritative Proofrail product Verdict.

## Future Implementation Preconditions

Any implementation task for the AI PR Evidence Gate requires a later valid Machine Task Contract that defines exact write scope, forbidden scope, acceptance criteria, required verification, stop conditions, and independent review.

Future implementation must not change canonical terminology, Verdict semantics, Evidence authority classes, Trust semantics, or product protocols unless a later valid Machine Task Contract explicitly authorizes that exact authority-bearing change.

## Stop Conditions

Stop instead of expanding this focus if work requires:

- product semantic changes
- Verdict semantic changes
- Evidence authority class changes
- Trust semantic changes
- canonical terminology changes
- production code, contracts, tests, scripts, CI, generated projections, or package manifest edits
- repository inspection, verification execution, adapters, delivery surfaces, model provider behavior, or Inference Zone implementation
- treating this focus plan as product readiness, trusted release status, or an authoritative Proofrail product Verdict
- any payment, billing, API key, credits, paid cloud runner, SaaS enablement, or cloud execution prompt