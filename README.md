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
pnpm verify
```

The verifier checks required files and artifacts, local documentation links and anchors, exact-set canonical terminology and Verdict projections, governance configuration, Machine Task Contract instances, the HARN_ harness reason-code registry, generated projection freshness, authority-index routes, JSON-output parseability, governance tests, diff whitespace, and repository identity hygiene. It is not a product runtime and does not provide independent acceptance.

For only the Foundation validator:

```bash
node scripts/validate-foundation.mjs
node scripts/validate-foundation.mjs --format json
```

See [docs/engineering/foundation-mechanization.md](docs/engineering/foundation-mechanization.md) for the current governance mechanics.

## Next Foundation Task

The next foundation task is documented in [docs/plans/active/foundation-gate-mechanization.md](docs/plans/active/foundation-gate-mechanization.md):

FOUNDATION GATE MECHANIZATION
