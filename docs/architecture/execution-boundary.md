# Execution Boundary

## Authority

This document is authoritative for controlled verification execution direction and execution stop conditions.

## Current Phase

Phase 0 does not implement verification execution. Only governance validation tooling may run.

## Future Product Verification Execution

Future Proofrail product verification execution must be explicitly authorized by Trusted Configuration and applicable deterministic Policy-defined execution boundaries.

The current `PRODUCT-RELEASE-001` Trusted Configuration explicitly denies target checkout, repository content reads, target commands, verification commands, GitHub writes, and model execution. Its only live external operation is the existing bounded read-only GitHub GraphQL collection through an installed, already-authenticated local `gh`; credential values are never requested or emitted.

Machine Task Contracts are repository engineering harness governance artifacts. They may authorize work on this Proofrail repository and its governance checks, but they MUST NOT authorize target repository execution, select an Evidence Contract, select Policy, satisfy an Evidence Requirement, create Evidence, or influence Verdict authority.

Verification execution should record:

- command or mechanism identity
- input scope
- environment identity where available
- tool versions where available
- network policy
- filesystem write policy
- credentials boundary
- exit status or result state
- bounded output summary
- receipt identity and lineage

## Network and External Effects

Network-capable commands require explicit authorization. If a task requires network access and the execution boundary denies it, the agent must stop rather than silently expanding authority.

Target repository commands must not be executed unless a future authorized execution boundary permits them.

## Environment Uncertainty

Proofrail distinguishes deterministic evaluation from environmental reproducibility. The same authoritative normalized inputs should produce the same evaluation. Different uncontrolled environments may produce different Observations or Verification Receipts.

When environment uncertainty prevents a valid determination, the evaluation may be `BLOCKED`. When a capability is available but limited by environment or tool conditions, the adapter may report a degraded capability if the protocol permits it.
