# Foundation Gate Mechanization Final Convergence Review

## Review Boundary

This is the Builder final convergence review for `FND-MECH-CONV-002`. It responds to remaining independent governor findings on PR #2. It is not independent acceptance, not a Proofrail product Verdict, and not Foundation Gate acceptance.

## Findings

### FND-MECH-REG-002

Original severity: P1.

Affected files:

- `governance/harness-reason-codes.json`
- `governance/harness-reason-codes.schema.json`
- `governance/foundation.config.json`
- `governance/tasks/FND-MECH-CONV-002.json`
- `scripts/governance/lib/findings.mjs`
- `scripts/governance/lib/registry.mjs`
- `scripts/governance/lib/validator.mjs`
- `tests/governance/foundation-validator.test.mjs`
- `docs/engineering/foundation-mechanization.md`
- `docs/engineering/validation-evidence.md`

Observation: Final finding normalization could return raw unregistered findings when the registered-code set was empty or when `HARN_EMITTED_REASON_CODE_UNKNOWN` was absent from the registry. Registry validation did not explicitly determine whether the registry was usable for final normalization.

Exact remediation: Add a committed harness reason-code registry schema, make registry validation return an explicit usability state, require supported top-level metadata and exactly one `HARN_EMITTED_REASON_CODE_UNKNOWN` entry, and change final normalization so it never returns raw unknown finding codes. With a usable registry, registered findings are preserved and raw unknown codes are represented by one reserved diagnostic per unique code. With an unavailable or unusable registry, final output fails closed with deterministic `INVALID` output using only the reserved bootstrap diagnostic.

Exact changed locations:

- `BOOTSTRAP_UNKNOWN_REASON_CODE` and `normalizeRegisteredFindings` in `scripts/governance/lib/findings.mjs`
- `validateReasonCodeRegistry` in `scripts/governance/lib/registry.mjs`
- registry schema loading and registry-state normalization in `scripts/governance/lib/validator.mjs`
- new schema artifact `governance/harness-reason-codes.schema.json`
- reserved bootstrap diagnostic metadata in `governance/harness-reason-codes.json`
- required artifact entries in `governance/foundation.config.json`
- unusable-registry tests in `tests/governance/foundation-validator.test.mjs`
- bootstrap boundary documentation in `docs/engineering/foundation-mechanization.md`

Negative tests:

- `fails closed when reserved bootstrap diagnostic is removed from registry`
- `fails closed when harness reason-code registry codes array is empty`
- `fails closed when reserved bootstrap diagnostic is duplicated`
- `fails closed when harness reason-code registry top-level metadata is malformed`
- `does not pass raw unknown finding through while registry is unusable`
- existing valid-registry unknown-code test continues to assert registered-only final codes

Validation method: `pnpm test:governance`, `node scripts/validate-foundation.mjs --format json`, and final verification commands recorded in validation evidence.

Disposition: REMEDIATED.

### FND-MECH-CI-001

Original severity: P2.

Affected files:

- `.github/workflows/foundation-governance.yml`
- `scripts/governance/check-committed-whitespace.mjs`
- `tests/governance/committed-whitespace.test.mjs`
- `README.md`
- `CONTRIBUTING.md`
- `docs/engineering/foundation-mechanization.md`
- `docs/engineering/validation-evidence.md`
- `governance/foundation.config.json`
- `governance/tasks/FND-MECH-CONV-002.json`

Observation: `pnpm verify` used no-argument `git diff --check`, and the workflow ran it from a clean checkout. That checked local worktree and index diff state, not the reviewed committed pull request base/head range.

Exact remediation: Keep the local workspace diff check inside `pnpm verify` but document its actual semantics. Add `scripts/governance/check-committed-whitespace.mjs` for explicit committed base/head checks using `shell: false`. Update GitHub Actions to fetch full history and run committed-range whitespace validation as separate event-specific steps before `pnpm verify`: pull requests use the event base SHA and head SHA with merge-base diff semantics, main pushes use the pushed before/head range, new main history uses the empty-tree fallback, and foundation branch pushes use `origin/main...head`.

Exact changed locations:

- committed-range helper in `scripts/governance/check-committed-whitespace.mjs`
- committed-range helper tests in `tests/governance/committed-whitespace.test.mjs`
- checkout fetch depth and committed-range workflow steps in `.github/workflows/foundation-governance.yml`
- local workspace versus committed-range documentation in `README.md`, `CONTRIBUTING.md`, and `docs/engineering/foundation-mechanization.md`
- required artifact entries in `governance/foundation.config.json`

Negative tests:

- `committed whitespace helper accepts a clean committed range`
- `committed whitespace helper detects a committed trailing-whitespace defect`
- `committed whitespace helper ignores unrelated uncommitted worktree defects`
- `committed whitespace helper rejects missing base or head arguments deterministically`

Validation method: `pnpm test:governance`, workflow inspection, and final verification commands recorded in validation evidence.

Disposition: REMEDIATED.
