# Proofrail

> Claim is not evidence. Verify it.

Proofrail is an evidence control plane for autonomous software changes.

AI can write the code. Proofrail determines whether the change is admissible.

## Current Phase

Phase 0 Foundation is closed for baseline `7865ea299f98b3fd0158d1486272f73468b345ac` after external independent Foundation Gate PASS.

This repository is now in Phase 1: Deterministic Kernel Vertical Slice.

Phase 1 authorizes a bounded synthetic-input vertical slice through Claim, Evidence Contract, Evidence Requirement, Observation, Evidence satisfaction, Rule, Verdict reduction, and Evidence Bundle. It does not authorize repository inspection, target-code execution, verification execution, adapters, delivery surfaces, model provider integration, or Inference Zone implementation.

Proofrail does not yet have a working product runtime, kernel implementation, or completed Phase 1 vertical slice.

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

## Repository Governance Verification

Run the governance verifier from the repository root:

```bash
pnpm verify
```

The verifier checks required files and artifacts, local documentation links and anchors, exact-set canonical terminology and Verdict projections, governance configuration, Machine Task Contract instances, the HARN_ harness reason-code registry, generated projection freshness, authority-index routes, JSON-output parseability, governance tests, diff whitespace, and repository identity hygiene. It is not a product runtime and does not provide independent acceptance.

`pnpm verify` includes a local workspace diff whitespace check through no-argument `git diff --check`. That check reports whitespace errors in the current worktree and index diff. It is not a committed pull request base/head range check.

The GitHub Actions Foundation governance workflow runs committed change-range whitespace validation as a separate step. Pull request events validate the explicit pull request base SHA and head SHA. Push events use deterministic push-specific ranges before `pnpm verify` runs.

For only the Foundation validator:

```bash
node scripts/validate-foundation.mjs
node scripts/validate-foundation.mjs --format json
```

See [docs/engineering/foundation-mechanization.md](docs/engineering/foundation-mechanization.md) for the current governance mechanics.

## Active Plan

The active Phase 1 plan is documented in [docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md](docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md):

Phase 1 Deterministic Kernel Vertical Slice

The next implementation task identity is `KERNEL-VS-001`. It is not implemented in this repository state.
