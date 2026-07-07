# Foundation Gate Mechanization Builder Review

## Review Boundary

This is the Builder review for `FND-MECH-001`. It is not independent acceptance, not a Proofrail product Verdict, and not Foundation Gate acceptance.

Separate read-only reviewer agents were used for Builder-internal review only:

- Reviewer A: Foundation Authority Reviewer
- Reviewer B: Adversarial Harness Reviewer
- Reviewer C: Maintainability Reviewer

Their findings remain Builder-internal review inputs. The final branch still requires independent review.

## Findings

### FND-MECH-BR-001

Severity: HIGH

Source: Reviewer A, Reviewer B

Location: `governance/foundation.config.json`, `docs/reviews/foundation-gate-mechanization-builder-review.md`

Observation: The governance config required this Builder review artifact before it existed, causing `HARN_REQUIRED_DOCUMENT_MISSING`.

Risk: The branch could not satisfy its own Foundation governance validation.

Remediation: Create this Builder review artifact and keep it in required documents.

Validation method: `node scripts/validate-foundation.mjs --format json`, `pnpm verify`.

Disposition: FIXED.

### FND-MECH-BR-002

Severity: HIGH

Source: Reviewer A, Reviewer B

Location: `governance/foundation.config.schema.json`, `scripts/governance/lib/projections.mjs`

Observation: Generated projection output paths were originally taken from config strings without a hard output-path guard.

Risk: A malformed or adversarial config could make generation overwrite authority-bearing documents or bypass stale projection checks.

Remediation: Constrain generated projection paths with schema constants, add generator-side canonical path and uniqueness guards, and add negative governance tests.

Validation method: `pnpm test:governance`.

Disposition: FIXED.

### FND-MECH-BR-003

Severity: MEDIUM

Source: Reviewer A

Location: `scripts/governance/lib/findings.mjs`

Observation: The success message originally said Foundation validation passed without explicitly stating the mechanical and non-acceptance boundary.

Risk: CI logs or copied evidence could be overread as Foundation Gate acceptance.

Remediation: Change the success text to state that mechanical Foundation governance checks passed and that this is not independent Foundation Gate acceptance.

Validation method: `node scripts/validate-foundation.mjs`.

Disposition: FIXED.

### FND-MECH-BR-004

Severity: HIGH

Source: Reviewer B, Reviewer C

Location: `scripts/governance/lib/validator.mjs`, `scripts/governance/lib/schema-validation.mjs`

Observation: Config schema failures were collected, but dependent checks originally continued to dereference config fields.

Risk: Schema-invalid config could produce a crash, nondeterministic partial findings, stack traces, or host-path leakage.

Remediation: Make schema validation return a boolean, skip config-dependent checks after config schema failure, and add a malformed-config negative test.

Validation method: `pnpm test:governance`.

Disposition: FIXED.

### FND-MECH-BR-005

Severity: HIGH

Source: Reviewer B

Location: `scripts/governance/lib/path-utils.mjs`, `scripts/governance/lib/markdown.mjs`

Observation: Repository paths and Markdown targets originally lacked an explicit containment guard.

Risk: Traversing or absolute local paths could escape the repository for reads, checks, or generated writes.

Remediation: Add safe repository path normalization and containment checks, reject absolute Markdown targets, and add negative tests for escaped and absolute Markdown links.

Validation method: `pnpm test:governance`.

Disposition: FIXED.

### FND-MECH-BR-006

Severity: MEDIUM

Source: Reviewer C

Location: `tests/governance/foundation-validator.test.mjs`

Observation: Synthetic test repositories initially duplicated checked-in schemas and reason-code registry data.

Risk: Future schema or registry changes could leave tests exercising stale semantics.

Remediation: Seed synthetic test repositories from the checked-in Foundation config schema, Machine Task Contract schema, and HARN_ registry.

Validation method: `pnpm test:governance`.

Disposition: FIXED.

### FND-MECH-BR-007

Severity: MEDIUM

Source: Reviewer B, Reviewer C

Location: `scripts/governance/lib/markdown.mjs`, `scripts/governance/lib/projections.mjs`

Observation: Markdown parsing remains a bounded scanner, not a full CommonMark implementation. It now strips fenced code and checks inline links, reference definitions, and HTML anchor hrefs, but it does not model every Markdown edge case such as escaped table pipes.

Risk: Future documentation patterns outside the bounded subset could create false positives or false negatives.

Remediation: Extend scanner coverage for current known gaps and document that the Foundation harness validates a governed Markdown subset unless a future task authorizes a parser dependency.

Validation method: negative tests for broken inline, reference-definition, HTML, escaped, and absolute local links.

Disposition: DEFERRED_WITH_REASON. A full Markdown parser or YAML/Markdown dependency is outside the authorized dependency scope for FND-MECH-001.

### FND-MECH-BR-008

Severity: LOW

Source: Reviewer C

Location: `scripts/governance/lib/projections.mjs`

Observation: Projection extraction, construction, validation, freshness checks, and writing share one module.

Risk: Projection growth could make future extension ownership less clear.

Remediation: Keep the current module because Phase 0 projection domains are small; split by projection domain in a future task if projections expand.

Validation method: module review and governance tests.

Disposition: DEFERRED_WITH_REASON. Current size remains bounded and avoids speculative abstraction.

### FND-MECH-BR-009

Severity: LOW

Source: Reviewer C

Location: `scripts/governance/lib/validator.mjs`

Observation: Identity hygiene originally scanned every non-excluded file as UTF-8 text.

Risk: Future binary or large generated assets could make validation brittle.

Remediation: Restrict identity hygiene scanning to known text-like extensions and known text config filenames.

Validation method: `pnpm test:governance`.

Disposition: FIXED.

### FND-MECH-BR-010

Severity: MEDIUM

Source: Reviewer B

Location: `package.json`, `.github/workflows/foundation-governance.yml`

Observation: `pnpm verify` initially ran only human-format governance validation and governance tests.

Risk: JSON output parseability and whitespace diff checks would remain outside the default CI gate.

Remediation: Add `pnpm governance:check-json` and make `pnpm verify` run governance check, JSON-output parsing, governance tests, and `git diff --check`.

Validation method: `pnpm verify`.

Disposition: FIXED.

### FND-MECH-BR-011

Severity: LOW

Source: Reviewer B

Location: `tests/governance/foundation-validator.test.mjs`

Observation: Synthetic temporary repositories initially were not cleaned up after tests.

Risk: Repeated local test runs could leave stale temporary directories.

Remediation: Register `t.after` cleanup for each synthetic repository.

Validation method: `pnpm test:governance`.

Disposition: FIXED.

### FND-MECH-BR-012

Severity: MEDIUM

Source: Builder self-review

Location: `docs/engineering/clean-agent-test.md`, `governance/clean-agent-test.json`

Observation: Clean Agent Test protocol creation could be misread as Clean Agent Test success.

Risk: Agent legibility could be overclaimed without an independent fresh-context run.

Remediation: State in both human and machine-readable artifacts that the protocol is defined but not executed, and that the Builder must not grade or claim pass.

Validation method: document review and `rg -n "protocol_defined_not_executed|must not grade|Builder" docs/engineering/clean-agent-test.md governance/clean-agent-test.json`.

Disposition: FIXED.

### FND-MECH-BR-013

Severity: MEDIUM

Source: Builder self-review

Location: `governance/architecture-check-preparation.json`, `docs/quality/foundation-gate.md`

Observation: Architecture check preparation could be misread as package dependency enforcement.

Risk: Future agents could believe dependency directions are already mechanically enforced.

Remediation: Record enforcement state as `prepared_not_enforced`, state that no production package layout exists, and keep dependency authority in `docs/architecture/dependency-rules.md`.

Validation method: document review.

Disposition: FIXED.

## Review Checklist

Authority leakage: no open CRITICAL or HIGH finding after remediation.

Product/runtime boundary leakage: no production package, product kernel, repository inspection, verification execution, policy evaluation, adapter, CLI, API, MCP, web, GitHub product integration, or Inference Zone implementation was introduced.

HARN_ versus product reason-code ambiguity: `HARN_` separation is documented in `governance/harness-reason-codes.json` and [../engineering/foundation-mechanization.md](../engineering/foundation-mechanization.md).

Generated artifact authority ambiguity: generated projections carry an authority notice and stale checks compare them against authoritative Markdown.

Deterministic output: findings are sorted by code, path, message, then remediation; JSON output contains no timestamps or random ids.

Host path leakage: JSON output uses repository-relative paths; tests assert the synthetic root path is absent.

Timestamp leakage: generated projections and validator output do not include timestamps.

Schema duplication: test fixtures now read checked-in schemas and registry data.

Exact-set extraction correctness: canonical terms and canonical Verdict values are extracted from authoritative section headings, not repository-wide word counts.

Negative test quality: governance tests include synthetic negative cases for reason-code registry failures, stale projections, canonical drift, authority index drift, Markdown links, identity contamination, malformed config, unsafe projection paths, and Machine Task Contract review constants.

CI mutability: CI runs `pnpm verify`; generation is not used as a CI repair step.

Stale projection bypass: schema constants, output-path uniqueness guard, and in-memory freshness checks are present.

Fixture maturity overclaim: governance tests are documented as governance tests only, not product fixture corpus coverage.
