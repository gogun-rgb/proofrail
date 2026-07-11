# Phase 2 AI PR Evidence Gate

## Status

Active narrowed product focus. `PRODUCT-FOCUS-001` defined the next Proofrail direction as an AI PR Evidence Gate.

`GATE-MVP-001` starts the smallest useful implementation: a local static-input evidence packet builder. This MVP is not product readiness, trusted release status, or a Proofrail product Verdict.

`GATE-V01-001` defines v0.1 as the usable local CLI workflow around that builder. It reads caller-provided JSON from a file and writes deterministic packet JSON to stdout or an explicitly selected output file. This remains a static-input-only implementation, not product readiness, a trusted release, or an authoritative Proofrail product Verdict.

`GATE-GH-001` defines v0.2 as a bounded local GitHub PR importer. It uses an installed, already-authenticated local `gh` CLI to freeze selected pull request facts into the existing deterministic packet workflow. This is not product readiness, a trusted release, or an authoritative Proofrail product Verdict.

## Objective

The Phase 2 AI PR Evidence Gate is a small, practical first product direction for AI-authored pull requests.

The first useful product shape is an evidence packet that separates:

- Builder claims about the pull request
- observed evidence supplied as input
- missing evidence that still needs collection or review
- scope boundaries for the proposed change
- review needs for independent human or machine review

The packet direction preserves the core product principle:

> Claim is not evidence. Verify it.

## MVP Boundary

`GATE-MVP-001` may implement only local static-input packet construction under `packages/evidence-gate`.

The MVP may:

- normalize caller-provided pull request facts
- keep claims separate from observed evidence
- keep missing evidence visible
- preserve changed-path scope boundaries
- produce deterministic packet output for identical normalized input
- expose local tests through `pnpm test:evidence-gate`

The MVP does not implement the complete product runtime. It does not collect facts from a live repository, run target project commands, integrate with delivery channels, use model judgment, or produce an authoritative Proofrail product Verdict.

## v0.1 Local Workflow

After checkout and dependency installation, a new user can complete this workflow in under three minutes. From the repository root, run the checked-in example directly:

```bash
pnpm evidence-gate --input examples/evidence-gate/input.json
```

The command writes canonical JSON to stdout. To write the packet to a file instead:

```bash
pnpm evidence-gate --input examples/evidence-gate/input.json --output packet.json
```

The complete example input and expected deterministic packet are stored at [../../../examples/evidence-gate/input.json](../../../examples/evidence-gate/input.json) and [../../../examples/evidence-gate/expected-output.json](../../../examples/evidence-gate/expected-output.json). Focused tests remain available through `pnpm test:evidence-gate`.

v0.1 provides:

- local JSON-file input validation with readable failures
- deterministic packet JSON written to stdout or an explicit output file
- separate claims, observed evidence, missing evidence, scope, review needs, and boundaries
- explicit preservation of missing evidence and changed paths outside declared scope
- checked-in example input and expected output

These features organize caller-provided records for review. They do not collect or verify those records and do not promote a Claim to Evidence.

## v0.2 Local GitHub PR Import

Prerequisites: `gh` must be installed and already authenticated in the local environment. Proofrail does not request or manage API keys, tokens, billing, credits, or paid services.

The one-command workflow writes a deterministic packet to stdout:

```bash
pnpm evidence-gate:github --repo owner/name --pr 123
```

An explicit output path writes the same packet to a file:

```bash
pnpm evidence-gate:github --repo owner/name --pr 123 --output packet.json
```

GATE-SCOPE-001 adds an optional caller-declared scope file for existing changed-path reporting:

```bash
pnpm evidence-gate:github --repo owner/name --pr 123 --scope-file declared-scope.json
```

The caller declaration only feeds the existing `outsideDeclaredScope` reporting. It never decides authorization, Policy, Evidence, readiness, trusted release, independent acceptance, or a Proofrail product Verdict.

The importer collects only selected PR metadata, changed-file summaries, commit identities, reported checks, and review metadata. It records the exact pull request head SHA, so the packet applies only to that point-in-time snapshot. A later push requires a new collection.

The importer must not collect PR or review bodies, patches, check logs, or repository file contents. It must not execute target-project commands or perform GitHub writes. These exclusions reduce the chance of copying instruction-shaped or secret-bearing source content into a packet; they do not turn the remaining metadata into trusted Evidence.

The collector freezes and sanitizes live metadata before calling the existing packet evaluator. Consequently, `boundaries.staticInputOnly: true` describes the evaluator's input boundary, not the complete v0.2 command: the evaluator receives a static snapshot even though the preceding collector used local `gh` to query GitHub.

v0.2 reports changed paths and, when supplied, caller-declared scope boundaries, but does not apply a local scope policy. A path appearing in the packet or `outsideDeclaredScope` is not a finding that the path was authorized or unauthorized.

## Human Report View

GATE-REPORT-001 adds an optional deterministic human-readable rendering alongside the existing packet JSON.

    pnpm evidence-gate --input examples/evidence-gate/input.json --format human
    pnpm evidence-gate:github --repo owner/name --pr 123 --format human

The default and explicit --format json modes remain byte-identical to the existing JSON output. Human mode uses a package-local pure renderer with fixed sections for pull-request identity, packet identity, attention counts, claims, observed evidence, missing evidence, scope, review needs, and explicit product-boundary statements. Empty collections render as (none), and control, ANSI, and embedded newline characters are escaped so untrusted text cannot forge report structure.

The report is a deterministic review aid only. It does not alter packet schema, collection fields, Evidence authority, scope authorization, product readiness, trusted release state, or an authoritative Proofrail product Verdict.

## Evidence Packet Orientation

The evidence packet must keep these separations explicit:

- a claim is an assertion, not Evidence by itself
- passing tests are evidence, not authority
- reported successful checks are observed facts, not independent Proofrail acceptance
- Builder output is provisional until reviewed under the applicable gate
- GitHub approval metadata is not independent Proofrail acceptance
- PR merge is not a trusted release
- missing evidence remains visible instead of being converted into confidence
- review needs are preserved for independent review rather than hidden behind model judgment

## Integrity Hardening

`GATE-INTEGRITY-001` hardens existing packet and GitHub snapshot boundaries without expanding collection. Duplicate declaration IDs and dangling existing references fail closed before packet identity or output construction. Packet and snapshot ordering use a locale-independent deterministic comparator while preserving checked-in ASCII output bytes. Projected GitHub text redacts the already-supported GitHub token families even when embedded and redacts values assigned to prefixed secret labels such as `CI_GITHUB_TOKEN` and `OPENAI_API_KEY`.

This task does not change packet schema or version, reference semantics beyond existing declared edges, query fields, the report renderer, CLI interface, argument or I/O handling, filesystem behavior, authority, Evidence, readiness, trusted release, or a Proofrail product Verdict. For matching secret-shaped projected text, normalized snapshot content intentionally changes only by replacing the secret value with `[REDACTED]`. The redacted value propagates to packet and rendered report content only when that sanitized field is mapped into the packet; snapshot-only fields remain sanitized at the snapshot boundary. Ordinary non-secret text remains compatible.

## Delivery Boundary Hardening

`GATE-IO-001` bounds the existing static and declared-scope local file inputs to opened regular files, actual-byte limits of 1 MiB and 64 KiB respectively, and fatal UTF-8 decoding. Under stable filesystem state, input/output aliases are rejected before output mutation, and declared-scope/output aliases are rejected before `gh` collection. The human renderer escapes a fixed explicit set of terminal-structure control code points while preserving printable non-format Unicode and existing golden bytes.

This hardening does not change CLI arguments or formats, packet or collection content, authority, Evidence, readiness, trusted release, or Verdict behavior. Staged output publication and protection against adversarial concurrent filesystem changes remain outside this boundary.

## Staged Output Publication

`GATE-OUTPUT-001` changes only the existing Evidence Gate file-output boundary. Both CLIs prepare the complete UTF-8 result in an exclusively created, short randomly named temporary regular file in the resolved publication target's actual directory. They apply the selected ordinary permission bits, close the temporary file, and then attempt one rename. Existing regular outputs remain replaceable with the same rendered bytes. A healthy output symbolic link remains while its canonical regular-file target is updated; publishing through a distinct hardlink path replaces only the selected directory entry, leaving sibling hardlink bytes unchanged. Broken symbolic links and nonregular targets fail with the existing fixed write error.

The helper cleans up only its known temporary file on failure and cleanup is best effort, so cleanup failure may leave an orphan. Publication requires parent-directory create and rename permission. This stable-local-filesystem boundary does not establish general cross-platform atomicity, durability, crash or race safety, fsync or directory sync, recovery, rollback after a filesystem rename failure, attacker or TOCTOU protection, ACL or ownership preservation, extended attributes, special mode bits, inode preservation, or timestamp preservation. Windows mode `0o600` is not an owner-only ACL guarantee.

This hardening preserves CLI arguments, stdout, fixed diagnostics, JSON and human bytes, input and declared-scope alias ordering, GitHub collection behavior, packet semantics, authority, Evidence, readiness, trusted release, and Verdict behavior.

## GitHub Collection Boundary Hardening

`GATE-GH-BOUND-001` bounds the existing local GitHub collector without expanding its query. CLI and collector pull-request numbers are limited to the GraphQL `Int` range. The collector validates the returned pull-request identity and changed-file count before file pagination, permits at most 100 nodes per page and 100 pages per files, commits, reviews, or checks connection, rejects missing or repeated continuing cursors, requires a well-formed empty GraphQL errors array when that member is present, and rejects duplicate file paths or commit identifiers after existing normalization.

The four connections can collect no more than 10,000 nodes each and make no more than 400 connection calls plus the metadata call. A terminal one-hundredth page remains valid; a continuing one-hundredth page fails without a one-hundred-and-first request. Existing query strings, fields, packet mapping, redaction, ordering, CLI and report behavior, and valid output bytes remain unchanged. Reviews and checks retain duplicate metadata because the current query does not provide a stable identity for either node type. These collection controls do not establish Evidence authority, product readiness, a trusted release, independent acceptance, or a Proofrail product Verdict.

## De-Scoped Until Later Authorization

The following remain out of scope until separately authorized:

- complete Proofrail product Verdict runtime
- broad Evidence Bundle protocol completion
- Inference Zone behavior
- model providers
- adapters
- APIs, MCP, web, GitHub App behavior, and other delivery surfaces beyond the bounded local `gh` importer
- PR or review bodies, patches, check logs, and repository file-content collection
- GitHub writes
- local scope-policy evaluation
- target project command execution

## Relationship to Phase 2 Boundary Definition

## PRODUCT-RELEASE-001 exact release-candidate slice

`PRODUCT-RELEASE-001` connects separately supplied, byte-identified Trusted Configuration, Policy, and Evidence Contract artifacts to the existing bounded GitHub collector and accepted kernel. The selected configuration fixes repository `gogun-rgb/proofrail`, pull request 27, base and head identities, observer, declared path scope, check policy, requirements, and a deny-by-default execution boundary. The live CLI accepts only `--trusted-config` and optional `--output`; it does not accept caller overrides for product authority.

The offline fixture commits a sanitized frozen snapshot, canonical kernel input, and canonical Evidence Bundle. The unchanged collector does not query the base commit SHA, and its fields may not be expanded under this task. The orchestrator therefore refuses to invent a base-SHA Observation: the exact fixture deterministically returns `REVISION_REQUIRED` because that requirement remains missing. Live collection is environmental and is not claimed byte-reproducible.

This slice performs no target checkout, repository content inspection, target command or verification execution, GitHub write, inference, or model call. Reported checks are Observations rather than Verification Receipts. The produced bundle is not itself a trusted release, external review report, or release-decider action.

[phase-2-boundary-definition.md](phase-2-boundary-definition.md) remains a boundary-only record. This plan narrows the product focus within that boundary and records the first static-input MVP step.

Neither this plan nor PR #14 is product readiness, trusted release status, or an authoritative Proofrail product Verdict.

## Future Implementation Preconditions

Any implementation beyond the v0.1 static-input CLI, bounded v0.2 local importer, and exact `PRODUCT-RELEASE-001` configured slice requires a later valid Machine Task Contract that defines exact write scope, forbidden scope, acceptance criteria, required verification, and stop conditions.

Future implementation must not change canonical terminology, Verdict semantics, Evidence authority classes, Trust semantics, or product protocols unless a later valid Machine Task Contract explicitly authorizes that exact authority-bearing change.

## Stop Conditions

Stop instead of expanding this focus if work requires:

- product semantic changes
- Verdict semantic changes
- Evidence authority class changes
- Trust semantic changes
- canonical terminology changes
- production work outside the authorized package and tests
- collection of bodies, patches, logs, or repository file contents; target project command execution; GitHub writes; adapters; additional delivery channels; model-provider behavior; or Inference Zone implementation
- treating this MVP as product readiness, trusted release status, or an authoritative Proofrail product Verdict
- cost-risk setup
