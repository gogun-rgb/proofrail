# Proofrail

> Claim is not evidence. Verify it.

Proofrail is an evidence control plane for autonomous software changes.

AI can write the code. Proofrail determines whether the change is admissible.

## Current Phase

Phase 0 Foundation is closed for baseline `7865ea299f98b3fd0158d1486272f73468b345ac` after external independent Foundation Gate PASS.

Phase 1 Deterministic Kernel Vertical Slice is closed for the exact accepted source baseline `0616091da1a572a2ea3e457ed84dab8e32259f59` after independent Phase 1 Gate PASS. PR #12 reviewed head `b3724a8d7fdd71c0f8c68f9b98cfa45984a812a3`; PR #12 merged as `6895a00ec0570fb90a53ebd12998197e526f9c4b`; Phase 1 closure records merged through PR #13 as `9b45aafe9ff42b47f7024baf1b4edc3f5db0bdc4`.

This Phase 1 PASS is a repository engineering Gate PASS. It is not a Proofrail product Verdict, not product readiness, not a trusted release, and not Phase 2 implementation authorization.

PR #11 / `PHASE1-GATE-001` remains blocked and closed historical context due to an MTC authority-procedure defect. It must not be reused as accepted evidence.

The current next product focus is Phase 2 AI PR Evidence Gate: a narrowed, practical first product direction for turning an AI-authored pull request into an evidence packet that separates claims, observed evidence, missing evidence, scope, and review needs.

`PRODUCT-FOCUS-001` narrows the implementation roadmap focus only. It does not authorize product runtime implementation, product readiness, trusted release status, or an authoritative Proofrail product Verdict.

Proofrail still does not have repository inspection, verification execution, adapters, delivery surfaces, model provider behavior, Inference Zone implementation, complete Evidence Bundle protocol completion, complete product Verdict runtime behavior, or a complete product runtime.

Any implementation after this narrowed focus requires a later valid Machine Task Contract and independent review.

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

## Closed Phase 1 Plan

The closed Phase 1 plan is documented in [docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md](docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md):

Phase 1 Deterministic Kernel Vertical Slice

The Phase 1 implementation task was `KERNEL-VS-001`; the accepted Phase 1 source baseline is `0616091da1a572a2ea3e457ed84dab8e32259f59`.

## Phase 2 AI PR Evidence Gate Focus

The narrowed Phase 2 focus plan is documented in [docs/plans/active/phase-2-ai-pr-evidence-gate.md](docs/plans/active/phase-2-ai-pr-evidence-gate.md).

The earlier boundary-only record remains documented in [docs/plans/active/phase-2-boundary-definition.md](docs/plans/active/phase-2-boundary-definition.md). That record and this focus plan do not implement or authorize repository inspection, verification execution, adapters, delivery surfaces, model provider behavior, Inference Zone behavior, or a trusted release.
