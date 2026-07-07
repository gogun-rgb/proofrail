# Proofrail

> Claim is not evidence. Verify it.

Proofrail is an evidence control plane for autonomous software changes.

AI can write the code. Proofrail determines whether the change is admissible.

## Current Phase

This repository is in Phase 0: Foundation and Engineering Harness Bootstrap.

Phase 0 creates durable project memory, canonical terminology, architecture boundaries, trust boundaries, protocol foundations, and governance checks for later work. It does not implement Proofrail product runtime behavior.

## Start Here

Read [AGENTS.md](AGENTS.md) first. It is the operational map for future agents.

Authoritative knowledge is organized under:

- [docs/constitution/product-constitution.md](docs/constitution/product-constitution.md)
- [docs/constitution/terminology.md](docs/constitution/terminology.md)
- [docs/constitution/trust-model.md](docs/constitution/trust-model.md)
- [docs/architecture/dependency-rules.md](docs/architecture/dependency-rules.md)
- [docs/architecture/inference-boundary.md](docs/architecture/inference-boundary.md)
- [docs/product/verdict-semantics.md](docs/product/verdict-semantics.md)
- [docs/quality/foundation-gate.md](docs/quality/foundation-gate.md)

## Phase 0 Verification

Run the governance verifier from the repository root:

```bash
node scripts/validate-foundation.mjs
```

The verifier checks required files, local documentation links, canonical terminology anchors, governance configuration, Machine Task Contract schema structure, and repository identity hygiene. It is not a product runtime and does not provide independent acceptance.

## Next Foundation Task

The next foundation task is documented in [docs/plans/active/foundation-gate-mechanization.md](docs/plans/active/foundation-gate-mechanization.md):

FOUNDATION GATE MECHANIZATION