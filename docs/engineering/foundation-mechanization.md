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
- Harness reason-code registry shape, duplicate codes, and `HARN_` prefixes.
- Unknown validator-emitted reason codes.
- Exact-set canonical terminology drift from `docs/constitution/terminology.md`.
- Exact-set canonical Verdict drift from `docs/product/verdict-semantics.md`.
- Stale generated governance projections.
- Documentation Authority Index duplicate topics, malformed local references, and missing local targets.
- AGENTS.md Authority Map routes that it declares.

## Harness Reason Codes

Foundation governance findings use `HARN_` codes from `governance/harness-reason-codes.json`.

`HARN_` codes are structurally separate from future Proofrail product runtime reason codes. They must not be presented as Proofrail product Verdict reason codes, Evidence Bundle reason codes, API reason codes, or product Policy reason codes.

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
