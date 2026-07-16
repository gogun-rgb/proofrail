# Domain Map

## Authority

This document is authoritative for Phase 0 architecture direction. It does not create production packages.

## Adopted Conceptual Structure

Proofrail should use a layered architecture:

```text
contracts
  -> kernel
    -> domain capability packages
      -> application orchestration
        -> delivery surfaces
```

The Inference Zone is isolated from the authoritative path and may depend on proposal contracts, but it must not be imported by the kernel.

## Layer Responsibilities

| Layer | Responsibility |
| --- | --- |
| contracts | Shared schemas and interface contracts that do not execute product authority by themselves. |
| kernel | Deterministic domain authority: verdict derivation, evidence satisfaction, policy-rule execution, and bundle finalization. |
| domain capability packages | Repository observations, verification receipt capture, policy loading, and adapters. |
| application orchestration | Workflow coordination, task lifecycle, evidence bundle assembly, and delivery-independent use cases. |
| delivery surfaces | CLI, API, MCP, web, GitHub integration, and CI integrations. |
| inference zone | Drafts proposals, explanations, and summaries outside the authoritative verdict path. |

## Why This Structure Was Adopted

This structure best protects kernel determinism from delivery frameworks, model providers, integration clients, and language-specific adapter details. It gives future agents bounded places to work without redefining core authority for every feature.

Contracts are placed before the kernel so stable data shapes can be shared without forcing the kernel to import delivery or adapter implementations. The kernel remains the conceptual owner of authoritative verdict semantics.

## Alternatives Considered

### Alternative A: Delivery-First Monorepo

Structure: define `cli`, `server`, `web`, and `mcp` first, then place domain logic under each surface.

| Criterion | Evaluation |
| --- | --- |
| Dependency direction clarity | Weak because frameworks tend to pull domain logic outward. |
| Authority boundary leakage risk | High because surface shortcuts can become de facto authority. |
| Adapter extensibility | Moderate, but semantics may diverge by surface. |
| Parallel-agent conflict risk | High because agents may redefine concepts in separate surfaces. |
| Framework contamination risk | High. |
| Testability | Mixed; surface tests are easy but kernel isolation is harder. |
| Package proliferation risk | Low initially, higher as hidden duplication grows. |

Decision: Rejected as the primary direction.

### Alternative B: Adapter-Centered Architecture

Structure: organize around language adapters first, with shared policy and evidence helpers used by each adapter.

| Criterion | Evaluation |
| --- | --- |
| Dependency direction clarity | Moderate. Adapter boundaries are visible, but core authority may move outward. |
| Authority boundary leakage risk | High because language-specific assumptions may shape the kernel. |
| Adapter extensibility | Strong for adding languages, weaker for uniform protocol semantics. |
| Parallel-agent conflict risk | Moderate. Agents can work per adapter, but protocol changes may be made locally. |
| Framework contamination risk | Moderate. Parser and tool dependencies can leak into shared layers. |
| Testability | Strong for adapter fixtures, weaker for global verdict determinism. |
| Package proliferation risk | High as languages create local variants of shared concepts. |

Decision: Rejected as the primary direction. Adapters must negotiate capabilities through a core protocol rather than shaping kernel semantics.

### Alternative C: Bundle-First Event Log

Structure: make Evidence Bundles and event lineage central, with all systems appending events.

| Criterion | Evaluation |
| --- | --- |
| Dependency direction clarity | Moderate. History is clear, but evaluation semantics can scatter across producers. |
| Authority boundary leakage risk | Moderate. Event shape can overtake terminology if not governed. |
| Adapter extensibility | Moderate. Capability negotiation may become event-specific. |
| Parallel-agent conflict risk | Moderate. Agents can add event types too freely without a terminology gate. |
| Framework contamination risk | Low if event storage stays pure. |
| Testability | Strong for lineage, weaker for semantic evaluation unless the kernel remains separate. |
| Package proliferation risk | Moderate. |

Decision: Not adopted as the top-level structure. Bundle immutability is core, but it should not replace the kernel as verdict authority owner.

## Current Implemented Slice

The current guard recognizes exactly seven production packages. `contracts` and `kernel` own accepted shapes and deterministic authority; `trusted-config` loads exact runtime authority and closed market configuration; `verification-runner` owns bounded command execution and canonical receipt construction; `release-orchestrator` coordinates observations, receipts, requirements, and kernel input; and `evidence-gate` plus `static-evaluator` are delivery surfaces. This is a narrow implemented slice, not the complete conceptual architecture. Machine Task Contracts govern repository work and do not create product runtime authority.
