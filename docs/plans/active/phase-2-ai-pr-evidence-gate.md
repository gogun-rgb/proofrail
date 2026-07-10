# Phase 2 AI PR Evidence Gate

## Status

Active narrowed product focus. `PRODUCT-FOCUS-001` defined the next Proofrail direction as an AI PR Evidence Gate.

`GATE-MVP-001` starts the smallest useful implementation: a local static-input evidence packet builder. This MVP is not product readiness, trusted release status, or a Proofrail product Verdict.

`GATE-V01-001` defines v0.1 as the usable local CLI workflow around that builder. It reads caller-provided JSON from a file and writes deterministic packet JSON to stdout or an explicitly selected output file. This remains a static-input-only implementation, not product readiness, a trusted release, or an authoritative Proofrail product Verdict.

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

## v0.1 Local Workflow

After checkout and dependency installation, a new user can complete this workflow in under three minutes. From the repository root, run the checked-in example directly:

```bash
pnpm evidence-gate --input examples/evidence-gate/input.json
```

The command writes canonical JSON to stdout. To write the packet to a file instead:

```bash
pnpm evidence-gate --input examples/evidence-gate/input.json --output packet.json
```

The complete example input and expected deterministic packet are stored at [../../../examples/evidence-gate/input.json](../../../examples/evidence-gate/input.json) and [../../../examples/evidence-gate/expected-output.json](../../../examples/evidence-gate/expected-output.json). Focused tests remain available through `pnpm test:evidence-gate`.

v0.1 provides:

- local JSON-file input validation with readable failures
- deterministic packet JSON written to stdout or an explicit output file
- separate claims, observed evidence, missing evidence, scope, review needs, and boundaries
- explicit preservation of missing evidence and changed paths outside declared scope
- checked-in example input and expected output

These features organize caller-provided records for review. They do not collect or verify those records and do not promote a Claim to Evidence.

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
- APIs, MCP, web, GitHub integration, and other delivery surfaces
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
