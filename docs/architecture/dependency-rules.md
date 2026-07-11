# Dependency Rules

## Authority

This document is authoritative for allowed and forbidden dependency directions.

## Allowed Direction

Future production packages SHOULD follow this direction:

```text
contracts -> kernel -> domain capability packages -> application orchestration -> delivery surfaces
```

Read as: later layers may depend on earlier layers only where explicitly allowed. Earlier layers must not depend on later layers.

## Ownership of Authoritative Concepts

| Concept | Owner |
| --- | --- |
| Canonical terminology | Constitution and kernel |
| Verdict semantics | Kernel |
| Evidence satisfaction semantics | Kernel |
| Policy and Rule evaluation semantics | Kernel |
| Evidence Bundle finalization semantics | Kernel |
| Adapter Capability reporting | Adapter protocol plus adapter packages |
| Workflow coordination | Application orchestration |
| CLI/API/MCP/web/GitHub concerns | Delivery surfaces |
| Inference Proposal creation | Inference Zone |

## Forbidden Directions

The kernel MUST NOT depend on:

- UI or web packages
- delivery frameworks
- model providers
- network services
- GitHub-specific code
- MCP-specific code
- application orchestration
- language parser implementations
- target repository package managers or build tools

Contracts MUST NOT import kernel, orchestration, delivery, adapter, or inference implementations.

Adapters MUST NOT modify kernel semantics to represent a language-specific special case. If an adapter discovers a protocol gap, the task must report the gap rather than changing the core protocol outside scope.

Delivery surfaces MUST NOT create private Verdict, Evidence, Evidence Requirement, Policy, Rule, or Evidence Bundle definitions.

Inference packages MUST NOT be imported by kernel, policy evaluation, evidence satisfaction, or bundle finalization paths.

## Orchestration Boundary

Application orchestration coordinates workflows. It may select configured policies, request observations, invoke verification under the execution boundary, and assemble inputs for kernel evaluation.

Application orchestration MUST NOT redefine Verdict semantics or mark requirements satisfied without kernel-authorized deterministic evaluation.

## Mechanical Enforcement

The bounded current-package guard freezes the exact six-package dependency graph: `kernel -> contracts`, `release-orchestrator -> kernel + trusted-config`, `evidence-gate -> release-orchestrator`, and `static-evaluator -> kernel`; `contracts` and `trusted-config` have no workspace imports. It also freezes each package's production Node import allowlist. This is partial drift enforcement, not general module resolution or complete semantic enforcement.
