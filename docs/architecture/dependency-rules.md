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

The bounded current-package guard freezes the exact six-package dependency graph: `kernel -> contracts`, `release-orchestrator -> kernel + trusted-config`, `evidence-gate -> release-orchestrator`, and `static-evaluator -> kernel`; `contracts` and `trusted-config` have no workspace imports. It freezes each package's production Node import allowlist and exact manifest loading fields (type, exports, bin, and the required absence of alternate main, module, browser, or package-import-map entry points).

The checker parses the retained production extensions with TypeScript and covers static import and re-export declarations, TypeScript import-equals and import-type nodes, attached JSDoc imports, direct dynamic import(), direct require(), and direct require.resolve(). Non-literal targets fail closed. The current read-only GitHub collector's exact named execFile-from-node:child_process import and literal "gh" invocation remain the only accepted subprocess loader-shaped syntax.

The guard rejects direct eval, new Function, escaped or aliased require, computed-property require invocation, direct createRequire references, non-exact child-process imports, and other directly named subprocess loader calls. These are repository engineering architecture findings; they do not create product execution authority.

Residual semantics remain outside static enforcement: general module resolution, transitive and generated-code analysis, arbitrary global or computed object-property discovery, full lexical binding and data-flow resolution, native or VM loading reached without a guarded identifier, and the runtime behavior of the separately authorized literal gh process. Future packages, entry points, allowed edges, or loading syntax require an explicit Machine Task Contract and matching checker tests.
