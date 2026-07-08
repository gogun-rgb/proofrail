# Foundation Mechanization

## Authority Boundary

This document describes Proofrail Phase 0 repository governance mechanics. It is not Proofrail product runtime authority, Trusted Configuration, Evidence, a Verification Receipt, Policy, Rule, Verdict logic, or an Evidence Bundle format.

The authoritative Markdown documents remain the source of authority. Generated governance projections are derived views for mechanical checks only.

## Commands

Run from the repository root:

```bash
pnpm governance:generate
pnpm governance:check
pnpm governance:check-json
pnpm test:governance
pnpm verify
```

`pnpm verify` is repository and workspace governance verification. It runs the non-mutating governance validator, JSON-output parse check, governance tests, and a local no-argument `git diff --check` workspace-diff check.

No-argument `git diff --check` checks the current worktree and index diff. It does not prove that committed pull request changes were checked against their reviewed base/head range.

Committed change-range whitespace validation is separate. The governance helper is:

```bash
node scripts/governance/check-committed-whitespace.mjs --mode merge-base <base-ref> <head-ref>
node scripts/governance/check-committed-whitespace.mjs --mode direct <base-ref> <head-ref>
```

The helper invokes Git with `shell: false`, requires explicit base and head refs or SHAs, and forwards the `git diff --check` exit status without rewriting files or executing target repository code.

The root Foundation validator command remains:

```bash
node scripts/validate-foundation.mjs
```

Machine-readable output is available with:

```bash
node scripts/validate-foundation.mjs --format json
```

Validator JSON uses Foundation harness status values:

- `VALID`
- `INVALID`

These are not Proofrail product Verdict values.

## Mechanically Enforced

The Foundation governance validator mechanically checks:

- Foundation governance config schema validity with Ajv.
- Required document, CI, script, test, lockfile, and governance artifact presence.
- Local Markdown file links and local Markdown anchors.
- Repository identity hygiene for inherited project names.
- Machine Task Contract schema review constants.
- Every committed JSON Machine Task Contract under `governance/tasks`.
- Harness reason-code registry schema, top-level metadata, duplicate codes, `HARN_` prefixes, and explicit usability for final finding normalization.
- Unknown validator-emitted reason codes.
- Exact-set canonical terminology drift from `docs/constitution/terminology.md`.
- Exact-set canonical Verdict drift from `docs/product/verdict-semantics.md`.
- Stale generated governance projections.
- Documentation Authority Index duplicate topics, malformed local references, and missing local targets.
- AGENTS.md Authority Map routes that it declares.

## Harness Reason Codes

Foundation governance findings use `HARN_` codes from `governance/harness-reason-codes.json`.

`HARN_` codes are structurally separate from future Proofrail product runtime reason codes. They must not be presented as Proofrail product Verdict reason codes, Evidence Bundle reason codes, API reason codes, or product Policy reason codes.

`HARN_EMITTED_REASON_CODE_UNKNOWN` is a validator-reserved bootstrap normalization diagnostic. Every usable committed harness reason-code registry must mirror it exactly once.

When the registry is usable, final normalization preserves registered findings, suppresses raw unregistered finding codes, and emits one `HARN_EMITTED_REASON_CODE_UNKNOWN` diagnostic per unique unregistered code. When the registry is unavailable or unusable, final normalization fails closed with deterministic `INVALID` output using only the reserved bootstrap diagnostic needed to report that the registry cannot safely be trusted.

This bootstrap behavior is Foundation engineering harness behavior only. It is not a Proofrail product runtime reason code.

## CI Whitespace Semantics

The GitHub Actions workflow runs committed change-range whitespace validation as an explicit step before `pnpm verify`.

Pull request events validate the reviewed pull request range using the event base SHA and head SHA with merge-base diff semantics equivalent to:

```bash
git diff --check <pull-request-base-sha>...<pull-request-head-sha>
```

Push events use event-specific semantics:

- `main` pushes with a non-zero `before` SHA validate the direct pushed range from `before` to the pushed `head`.
- new `main` history with an all-zero `before` SHA validates from the empty tree to the pushed `head`.
- `foundation/**` branch pushes validate `origin/main...head` after fetching the `origin/main` baseline.

The workflow checks out enough history for explicit range comparison and preserves frozen-lockfile installation and `pnpm verify`.

## Generated Projections

Generated projections live under `governance/generated`:

- `canonical-terminology.json`
- `canonical-verdicts.json`
- `documentation-authority-index.json`

Each projection records:

- source document
- source section
- deterministic digest of the normalized source section
- derived mechanical view
- an explicit notice that the projection is not independent authority

Run `pnpm governance:generate` to update generated projections. `pnpm governance:check` computes expected projections in memory and fails with a registered `HARN_` finding when committed projections are stale.

CI must not run generation as a mutating repair step.

`pnpm verify` runs the non-mutating governance check, JSON-output parse check, governance tests, and `git diff --check`.

## Machine Task Contracts

Phase 0 mechanically validates committed JSON Machine Task Contracts under `governance/tasks`.

YAML remains a documented format direction in [machine-task-contract.md](machine-task-contract.md), but YAML Machine Task Contracts are not mechanically validated in this phase. This avoids adding YAML parser dependencies in FND-MECH-001.

## Tests

Governance tests live under `tests/governance` and use Node's built-in `node:test` runner. Test data is synthetic and exercises the Foundation governance tooling only.

The tests do not execute target repository code, implement the Proofrail kernel, simulate policy evaluation, run repository inspection, or perform product verification execution.

## Not Mechanically Proven

The validator does not prove:

- conceptual coherence
- hidden AI authority absence
- product architecture quality
- Clean Agent Test success
- dependency direction enforcement
- product fixture corpus existence
- Foundation Gate acceptance

Those remain independently reviewable or future executable according to [../quality/foundation-gate.md](../quality/foundation-gate.md).
