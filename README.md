# Proofrail

> Claim is not evidence. Verify it.

Proofrail is an evidence control plane for autonomous software changes.

AI can write the code. Proofrail determines whether the change is admissible.

## Current Phase

Phase 0 Foundation is closed for baseline `7865ea299f98b3fd0158d1486272f73468b345ac` after external independent Foundation Gate PASS.

Phase 1 Deterministic Kernel Vertical Slice is closed for the exact accepted source baseline `0616091da1a572a2ea3e457ed84dab8e32259f59` after independent Phase 1 Gate PASS. PR #12 reviewed head `b3724a8d7fdd71c0f8c68f9b98cfa45984a812a3`; PR #12 merged as `6895a00ec0570fb90a53ebd12998197e526f9c4b`; Phase 1 closure records merged through PR #13 as `9b45aafe9ff42b47f7024baf1b4edc3f5db0bdc4`.

This Phase 1 PASS is a repository engineering Gate PASS. It is not a Proofrail product Verdict, not product readiness, not a trusted release, and not Phase 2 implementation authorization.

PR #11 / `PHASE1-GATE-001` remains blocked and closed historical context due to an MTC authority-procedure defect. It must not be reused as accepted evidence.

The current product focus is Phase 2 AI PR Evidence Gate: a practical first product direction for turning an AI-authored pull request into an evidence packet that separates claims, observed evidence, missing evidence, scope, and review needs.

`GATE-MVP-001` starts the smallest local static-input implementation: `@proofrail/evidence-gate` builds an evidence packet from caller-provided pull request facts. It is not product readiness, trusted release status, or an authoritative Proofrail product Verdict.

`GATE-V01-001` adds the v0.1 local CLI for reading those facts from a JSON file and writing deterministic packet JSON to stdout or a file.

`GATE-GH-001` adds a bounded v0.2 local GitHub PR importer. It uses an already-authenticated local `gh` CLI to freeze selected pull request facts into the existing deterministic packet workflow.

Proofrail still does not have the complete product runtime. Any implementation beyond these bounded local workflows requires a later valid Machine Task Contract and independent review.

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

## AI PR Evidence Gate v0.1 Quick Start

After checkout and dependency installation, this workflow takes under three minutes. From the repository root, generate a packet from the checked-in example:

```bash
pnpm evidence-gate --input examples/evidence-gate/input.json
```

The command writes canonical packet JSON to stdout. To save the same output instead:

```bash
pnpm evidence-gate --input examples/evidence-gate/input.json --output packet.json
```

For a deterministic human-readable view of the same packet, select the optional report format:

    pnpm evidence-gate --input examples/evidence-gate/input.json --format human

Omitting --format (or selecting --format json) preserves the existing byte-identical JSON output. Human mode uses fixed sections, one trailing newline, and escapes control/ANSI/newline characters in untrusted packet text.

See [the example input](examples/evidence-gate/input.json) and [its expected output](examples/evidence-gate/expected-output.json) for the complete input and packet shapes. Run the focused tests with:

```bash
pnpm test:evidence-gate
```

v0.1 validates local JSON input, preserves claims, observed evidence, missing evidence, scope, review needs, and boundaries as separate packet fields, and produces deterministic JSON for identically normalized input. It uses only caller-provided static input.

v0.1 does not inspect a live repository, collect GitHub pull request data, execute target-project commands, provide adapters, APIs, MCP, web, or GitHub integration, call models, or implement the Inference Zone or the complete product Verdict runtime. It is not product readiness, a trusted release, or an authoritative Proofrail product Verdict.

## AI PR Evidence Gate v0.2 Local GitHub Import

Prerequisites: install the GitHub CLI as `gh` and authenticate it locally before running Proofrail. Proofrail does not request, accept, or manage an API key or token.

From the repository root, collect a sanitized point-in-time snapshot of a pull request and write its deterministic evidence packet to stdout:

```bash
pnpm evidence-gate:github --repo owner/name --pr 123
```

To write the packet to a file instead:

```bash
pnpm evidence-gate:github --repo owner/name --pr 123 --output packet.json
```

The same importer can render the collected packet as a deterministic human report:

    pnpm evidence-gate:github --repo owner/name --pr 123 --format human

The format flag changes rendering only; human mode performs the same bounded read-only collection, and omitted or explicit --format json remains the canonical packet JSON. The report is a review aid, not a product Verdict, authorization decision, readiness claim, or trusted release.

The importer collects selected PR metadata, changed-file summaries, commit identities, reported checks, and review metadata through local `gh`. It records the pull request head SHA; the resulting packet describes only that point-in-time snapshot. Run the command again after any new push.

The collection boundary is intentionally narrow. Proofrail does not collect PR or review bodies, patches, check logs, or repository file contents. It does not execute target-project commands and does not write to GitHub.

The packet boundary remains equally important:

- a Claim is not Evidence
- a reported successful check is an observed fact, not authority or independent acceptance
- a GitHub approval is review metadata, not independent Proofrail acceptance
- changed paths are reported, but v0.2 has no local scope policy that can decide whether those paths were authorized

The packet field `boundaries.staticInputOnly: true` describes the deterministic packet evaluator: after the live collector freezes a sanitized snapshot, the evaluator receives that snapshot as static input. It does not mean the v0.2 command avoided live GitHub collection.

v0.2 remains a bounded local workflow. It is not product readiness, a trusted release, or an authoritative Proofrail product Verdict.

See [docs/engineering/foundation-mechanization.md](docs/engineering/foundation-mechanization.md) for the current governance mechanics.

## Closed Phase 1 Plan

The closed Phase 1 plan is documented in [docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md](docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md):

Phase 1 Deterministic Kernel Vertical Slice

The Phase 1 implementation task was `KERNEL-VS-001`; the accepted Phase 1 source baseline is `0616091da1a572a2ea3e457ed84dab8e32259f59`.

## Phase 2 AI PR Evidence Gate Focus

The narrowed Phase 2 focus plan is documented in [docs/plans/active/phase-2-ai-pr-evidence-gate.md](docs/plans/active/phase-2-ai-pr-evidence-gate.md).

The earlier boundary-only record remains documented in [docs/plans/active/phase-2-boundary-definition.md](docs/plans/active/phase-2-boundary-definition.md).
