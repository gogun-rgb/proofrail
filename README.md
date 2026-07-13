# Proofrail

[![CI](https://github.com/gogun-rgb/proofrail/actions/workflows/foundation-governance.yml/badge.svg)](https://github.com/gogun-rgb/proofrail/actions/workflows/foundation-governance.yml)
![Node.js 24](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

> Claim is not evidence. Verify it.

Proofrail is an evidence control plane for autonomous software changes.

AI can write the code. Proofrail determines whether the change is admissible.

## What Proofrail does

Proofrail collects bounded pull request facts, keeps Claims separate from Observations, identifies missing Evidence and scope findings, and produces deterministic JSON or a human-readable review packet.

The current Phase 2 implementation supports caller-supplied static inputs, sanitized read-only GitHub metadata collection, and one exact externally configured release-candidate workflow.

## See the result

The checked-in example starts with this Claim:

```text
Builder claims the change is ready for release.
```

Proofrail's human report shows the basis separately:

```text
Observed evidence: 1 supplied changed-path summary
Missing evidence: 1 required review record
Outside declared scope: README.md
Review needs: 4
Product Verdict: not produced
```

This makes the review gap visible without treating the Builder's statement as Evidence. See [the complete input](examples/evidence-gate/input.json), [canonical packet](examples/evidence-gate/expected-output.json), and [human report](examples/evidence-gate/expected-report.txt).

## First local run

Requirements: Node.js 24 and pnpm 11.7.0 through Corepack.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm evidence-gate --input examples/evidence-gate/input.json --format human
```

Use the local GitHub importer after installing and authenticating the GitHub CLI:

```bash
gh auth status
pnpm evidence-gate:github --repo owner/name --pr 123 --format human
```

Proofrail reads the existing local `gh` authentication. It does not request or store a GitHub token.

## What `ADMISSIBLE` currently means

The fixed release-candidate workflow can produce the following canonical fields:

```json
{
  "verdict": "ADMISSIBLE",
  "verificationReceipts": []
}
```

In the current workflow, this means the selected Policy and Evidence Contract were satisfied by the allowed GitHub metadata Observations for the exact configured target. Zero Verification Receipts means Proofrail did not checkout the target, inspect repository content, or rerun tests, lint, build, or security commands.

`ADMISSIBLE` therefore does not by itself mean the code was independently executed, is safe, is deployment-ready, or has received a trusted release decision.

## Current boundaries

- No target repository checkout, content inspection, patch analysis, or target command execution.
- GitHub-reported checks are Observations, not Proofrail-executed Verification Receipts.
- The exact release-candidate workflow remains bound to its externally supplied Trusted Configuration and fixed target.
- No GitHub writes, Action, Check Run, API, MCP, web UI, adapter, model provider, or Inference Zone implementation.
- Version `0.2.0-rc.1` is private workspace pre-release metadata. No npm package, binary, or general product release is published.

See [versioning](docs/releasing/versioning.md), [compatibility](docs/releasing/compatibility.md), and [known debt](docs/plans/debt.md) for the maintained operational details.

## Project state and assurance history

Phase 0 Foundation is closed for baseline `7865ea299f98b3fd0158d1486272f73468b345ac` after external independent Foundation Gate PASS.

Phase 1 Deterministic Kernel Vertical Slice is closed for the exact accepted source baseline `0616091da1a572a2ea3e457ed84dab8e32259f59` after independent Phase 1 Gate PASS. PR #12 reviewed head `b3724a8d7fdd71c0f8c68f9b98cfa45984a812a3`; PR #12 merged as `6895a00ec0570fb90a53ebd12998197e526f9c4b`; Phase 1 closure records merged through PR #13 as `9b45aafe9ff42b47f7024baf1b4edc3f5db0bdc4`.

This Phase 1 PASS is a repository engineering Gate PASS. It is not a Proofrail product Verdict, not product readiness, not a trusted release, and not Phase 2 implementation authorization.

PR #11 / `PHASE1-GATE-001` remains blocked and closed historical context due to an MTC authority-procedure defect. It must not be reused as accepted evidence.

The current product focus is Phase 2 AI PR Evidence Gate: a practical first product direction for turning an AI-authored pull request into an evidence packet that separates claims, observed evidence, missing evidence, scope, and review needs.

`GATE-MVP-001` starts the smallest local static-input implementation: `@proofrail/evidence-gate` builds an evidence packet from caller-provided pull request facts. It is not product readiness, trusted release status, or an authoritative Proofrail product Verdict.

`GATE-V01-001` adds the v0.1 local CLI for reading those facts from a JSON file and writing deterministic packet JSON to stdout or a file.

`GATE-GH-001` adds a bounded v0.2 local GitHub PR importer. It uses an already-authenticated local `gh` CLI to freeze selected pull request facts into the existing deterministic packet workflow.

Proofrail still does not have the complete product runtime. Any implementation beyond these bounded local workflows requires a later valid Machine Task Contract and the configured evidence-based repository engineering review.

`PRODUCT-RELEASE-001` adds an exact release-candidate vertical slice. Separately supplied Trusted Configuration, Policy, and Evidence Contract bytes select `gogun-rgb/proofrail#27`; `@proofrail/trusted-config` validates and binds those bytes, `@proofrail/release-orchestrator` converts the sanitized collector snapshot into kernel input, and the unchanged kernel finalizes the Evidence Bundle. `PRODUCT-RELEASE-002` adds only `baseRefOid` to the existing bounded metadata query, validates it as `baseOid`, and supplies the previously missing `target.baseSha` Observation. The authorized live result and offline golden are byte-identical and `ADMISSIBLE`, with no Verification Receipt. This is not by itself a trusted release or external release decision.

## Static Phase 1 Kernel Evaluation

Evaluate one complete caller-supplied Phase 1 kernel input and write the finalized bundle to stdout:

```bash
pnpm static-evaluate --input examples/static-evaluator/input.json
```

Use `--output bundle.json` to write the same bytes to a local file. This bounded CLI only decodes, parses, and evaluates the supplied static input with the accepted kernel. It does not inspect or execute a target, use the network, establish trust, select Policy or Evidence Contracts, or claim product readiness, trusted release, or independent acceptance.

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

The verifier checks required files and artifacts, local documentation links and anchors, exact-set canonical terminology and Verdict projections, governance configuration, Machine Task Contract instances, the HARN_ harness reason-code registry, generated projection freshness, authority-index routes, JSON-output parseability, governance tests, the bounded current-package architecture guard and its synthetic tests, package tests, Phase 1 type checking, diff whitespace, and repository identity hygiene. It is not a product runtime and does not provide independent acceptance.

`pnpm verify` includes a local workspace diff whitespace check through no-argument `git diff --check`. That check reports whitespace errors in the current worktree and index diff. It is not a committed pull request base/head range check.

The GitHub Actions Foundation governance workflow runs committed change-range whitespace validation as a separate step. Pull request events validate the explicit pull request base SHA and head SHA. Push events use deterministic push-specific ranges before `pnpm verify` runs.

The architecture guard freezes the exact six-package surface and manifest names. `contracts` has no edge; `kernel` depends only on `contracts`; `trusted-config` has no workspace edge; `release-orchestrator` depends only on `kernel` and `trusted-config`; `evidence-gate` depends only on `release-orchestrator`; and `static-evaluator` depends only on `kernel`. It also freezes exact Node imports, rejects external bare production imports, checks recognized TypeScript-AST load forms under `packages/*/src`, rejects source symbolic links, and contains relative imports within their package. Run `pnpm architecture:check` and `pnpm test:architecture`.

This is a bounded repository engineering drift guard, not complete enforcement of [the dependency rules](docs/architecture/dependency-rules.md). It does not perform general module resolution, transitive dependency analysis, generated-code analysis, target-repository inspection, or detect `eval`, `new Function`, aliased `require`, computed-property `require` invocation, aliased `createRequire`, or subprocess-loaded code. Future packages or allowed edges require an explicit task contract and checker update.

For only the Foundation validator:

```bash
node scripts/validate-foundation.mjs
node scripts/validate-foundation.mjs --format json
```

## AI PR Evidence Gate v0.1 Detailed Usage

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

Omitting --format (or selecting --format json) preserves the existing byte-identical JSON output. Human mode uses fixed sections, one trailing newline, and escapes control/ANSI/newline and fixed Unicode format characters in untrusted packet text while preserving printable non-format Unicode.

`GATE-IO-001` limits the static input to an opened regular file of at most 1 MiB and the optional declared-scope input to an opened regular file of at most 64 KiB. Both inputs require valid UTF-8. Under stable filesystem state, an input or declared-scope file that aliases its selected output is rejected before output mutation; declared-scope aliases are rejected before `gh` collection.

`GATE-OUTPUT-001` uses staged output publication for both Evidence Gate CLIs. It exclusively creates a short randomly named temporary regular file in the resolved publication target's actual directory, writes the complete UTF-8 result, applies the selected ordinary permission bits, closes the file, and then makes one rename attempt. A healthy output symbolic link remains in place while its canonical regular-file target is updated. Publishing through one selected hardlink path replaces that directory entry, so sibling hardlinks retain their previous bytes. Broken symbolic links and nonregular output targets are rejected.

Staged publication requires create and rename permission in the target directory. Cleanup is best effort and a failed cleanup may leave a Proofrail temporary file. This boundary does not promise general cross-platform atomicity, durability, crash or race safety, fsync or directory sync, recovery, attacker or TOCTOU protection, ACL or ownership preservation, extended attributes, special mode bits, inode identity, or timestamps. On Windows, temporary mode `0o600` is not an owner-only ACL guarantee.

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

To report paths outside a caller-declared scope, pass one local scope JSON file:

```bash
pnpm evidence-gate:github --repo owner/name --pr 123 --scope-file declared-scope.json
```

The caller declaration only feeds the existing `outsideDeclaredScope` reporting. It never decides authorization, Policy, Evidence, readiness, trusted release, independent acceptance, or a Proofrail product Verdict.

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

`GATE-INTEGRITY-001` fails closed when declaration IDs are duplicated or existing packet references are dangling, uses locale-independent deterministic ordering while preserving checked-in ASCII outputs, and redacts supported GitHub token shapes and prefixed secret assignments from projected text. This hardening does not change packet schema, collection fields, authority, readiness, release, or Verdict behavior.

`GATE-IO-001` also preserves existing CLI arguments, JSON and human golden bytes, collection fields, and packet semantics. Its local file and report hardening does not establish Evidence authority, product readiness, a trusted release, or a Proofrail product Verdict.

`GATE-GH-BOUND-001` confines the collector's pull-request number to the GitHub GraphQL `Int` range and fails closed on mismatched metadata identity, invalid or excessive changed-file counts, connection pages above 100 nodes, continuation beyond 100 pages, missing or repeated continuing cursors, malformed GraphQL error envelopes, and duplicate normalized file paths or commit identifiers. Each files, commits, reviews, and checks connection is therefore bounded to 10,000 collected nodes. The existing queries, fields, packet mapping, output formats, and valid golden bytes remain unchanged; reviews and checks are not deduplicated because the bounded query does not collect a stable identity for them.

v0.2 remains a bounded local workflow. It is not product readiness, a trusted release, or an authoritative Proofrail product Verdict.

## Exact release-candidate workflow

Evaluate the offline sanitized fixture and compare both canonical goldens:

```bash
pnpm proofrail-release:fixture
```

For an authorized live read using the installed, already-authenticated `gh`, select the Trusted Configuration explicitly:

```bash
pnpm proofrail-release --trusted-config config/trusted/proofrail-release-v0.1.json
```

Add `--output bundle.json` to use staged publication. The command accepts no repository, pull-request, Policy, Evidence Contract, observer, or rule override. Pre-kernel configuration, collection, target, or output failures emit a fixed machine-readable delivery failure and no bundle. Reported GitHub checks remain Observations, never Verification Receipts or independent acceptance.

See [docs/engineering/foundation-mechanization.md](docs/engineering/foundation-mechanization.md) for the current governance mechanics.

## Closed Phase 1 Plan

The closed Phase 1 plan is documented in [docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md](docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md):

Phase 1 Deterministic Kernel Vertical Slice

The Phase 1 implementation task was `KERNEL-VS-001`; the accepted Phase 1 source baseline is `0616091da1a572a2ea3e457ed84dab8e32259f59`.

## Phase 2 AI PR Evidence Gate Focus

The narrowed Phase 2 focus plan is documented in [docs/plans/active/phase-2-ai-pr-evidence-gate.md](docs/plans/active/phase-2-ai-pr-evidence-gate.md).

The earlier boundary-only record remains documented in [docs/plans/active/phase-2-boundary-definition.md](docs/plans/active/phase-2-boundary-definition.md).

## License

Proofrail is licensed under the [Apache License 2.0](LICENSE).
