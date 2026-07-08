# Foundation Gate Mechanization Convergence Review

## Review Boundary

This is the Builder convergence review for `FND-MECH-CONV-001`. It responds to independent governor findings on PR #2. It is not independent acceptance, not a Proofrail product Verdict, and not Foundation Gate acceptance.

## Findings

### FND-MECH-GOV-001

Original severity: P1.

Affected files:

- `scripts/governance/lib/findings.mjs`
- `scripts/governance/lib/validator.mjs`
- `tests/governance/foundation-validator.test.mjs`

Exact remediation: Replace the final unknown-code append behavior with final finding normalization. When a valid non-empty registry containing `HARN_EMITTED_REASON_CODE_UNKNOWN` is available, unregistered emitted finding codes are removed from final output and represented by one registered `HARN_EMITTED_REASON_CODE_UNKNOWN` diagnostic per unknown code.

Exact changed locations:

- `normalizeRegisteredFindings` in `scripts/governance/lib/findings.mjs`
- final result construction in `validateFoundation` in `scripts/governance/lib/validator.mjs`
- `detects unknown emitted harness reason codes` in `tests/governance/foundation-validator.test.mjs`

Negative test added: The unknown-code test injects `HARN_SYNTHETIC_UNKNOWN`, asserts `HARN_EMITTED_REASON_CODE_UNKNOWN` is present, asserts `HARN_SYNTHETIC_UNKNOWN` is absent, and asserts every final finding code is registered.

Validation method: `pnpm test:governance`.

Disposition: REMEDIATED.

### FND-MECH-CFG-001

Original severity: P1.

Affected files:

- `governance/harness-reason-codes.json`
- `scripts/governance/lib/validator.mjs`
- `tests/governance/foundation-validator.test.mjs`

Exact remediation: Add registered `HARN_CONFIG_PATH_INVALID` and inspect configurable repository path fields before dereferencing them. Unsafe paths now produce deterministic config-field findings rather than uncaught path normalization or containment exceptions.

Exact changed locations:

- `HARN_CONFIG_PATH_INVALID` in `governance/harness-reason-codes.json`
- `validateConfigRepositoryPaths` in `scripts/governance/lib/validator.mjs`
- guarded required document, Machine Task Contract schema, registry, and generated projection dereferences in `validateFoundation`
- `reports unsafe required-document config paths as registered parseable JSON` in `tests/governance/foundation-validator.test.mjs`
- `reports unsafe repository paths for all Foundation config path fields` in `tests/governance/foundation-validator.test.mjs`

Negative test added: Tests cover `../outside.md`, `C:/outside.md`, a null-containing repository path, and every inspected config path field named by the governor finding.

Validation method: `pnpm test:governance`.

Disposition: REMEDIATED.

### FND-MECH-MTC-001

Original severity: P1.

Affected files:

- `docs/engineering/machine-task-contract.md`
- `governance/machine-task-contract.schema.json`
- `governance/tasks/FND-MECH-001.json`
- `governance/tasks/FND-MECH-CONV-001.json`
- `tests/governance/foundation-validator.test.mjs`

Exact remediation: Require `authority.read`, `authority.mayChangeAuthority`, and `authority.mayChangeProductSemantics` together. Update the Machine Task Contract documentation and task instances so authority mutation and product semantic mutation remain explicit and separate.

Exact changed locations:

- `authority.required` in `governance/machine-task-contract.schema.json`
- Required Sections, Field Semantics, and Rules in `docs/engineering/machine-task-contract.md`
- `authority` in `governance/tasks/FND-MECH-001.json`
- full new task contract in `governance/tasks/FND-MECH-CONV-001.json`
- Machine Task Contract authority tests in `tests/governance/foundation-validator.test.mjs`

Negative test added: Tests assert missing `mayChangeAuthority` is invalid, missing `mayChangeProductSemantics` is invalid, and both explicit boolean fields are accepted.

Validation method: `pnpm test:governance`.

Disposition: REMEDIATED.

### FND-MECH-PROJ-001

Original severity: P2.

Affected files:

- `scripts/governance/lib/markdown.mjs`
- `scripts/governance/lib/projections.mjs`
- `tests/governance/foundation-validator.test.mjs`

Regeneration check: `governance/generated/canonical-terminology.json`, `governance/generated/canonical-verdicts.json`, and `governance/generated/documentation-authority-index.json` were regenerated and remained byte-identical because current authoritative source sections contain no fenced code content.

Exact remediation: Separate raw authoritative section extraction for `sourceDigest` from fenced-code-stripped scan sections used for structural heading and table extraction. Fake headings inside fenced code remain ignored, while fenced content inside the authoritative section affects projection freshness.

Exact changed locations:

- `extractRawSection` and exported `stripFencedCode` in `scripts/governance/lib/markdown.mjs`
- canonical terminology, canonical Verdict, and Documentation Authority Index extraction in `scripts/governance/lib/projections.mjs`
- fenced-heading and fenced-digest tests in `tests/governance/foundation-validator.test.mjs`
- generated projection idempotence evidence in `docs/engineering/validation-evidence.md`

Negative test added: Tests assert fenced fake canonical headings are not extracted and changing fenced authoritative source content changes `sourceDigest`, causes stale projection detection, and returns to valid after regeneration.

Validation method: `pnpm test:governance` and `pnpm governance:generate`.

Disposition: REMEDIATED.
