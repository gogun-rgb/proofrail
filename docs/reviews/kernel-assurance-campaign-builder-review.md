# Kernel Assurance Campaign Builder Review

This is Builder review for `KERNEL-ASSURE-001`. It is not independent acceptance and is not a Proofrail product Verdict.

## Review Provenance

- Builder: current Codex implementation session on `phase1/kernel-assurance-campaign-1`.
- Task contract: `governance/tasks/KERNEL-ASSURE-001.json`.
- Review boundary: Builder-internal assurance and convergence only. Independent review remains required.

## Coverage

Reviewed topics included deterministic case generation, stable case identity, permutation invariance, repeated evaluation, primitive distinction, canonical serialization, missing Evidence Requirement handling, Rule denial matrices, Verdict reduction reference modeling, recursive boundary shapes, executable-wrapper early rejection, caller-input isolation, deep immutability, Evidence identity, lineage coverage, Observation scope handling, Claim non-evidence behavior, inference-shaped field rejection, reserved reason-code handling, skipped/todo/vacuous test audit, production-source forbidden-surface search, package-boundary inspection, and full verification readiness.

No Builder-discovered CRITICAL findings remain open. No Builder-discovered HIGH findings remain open.

## Findings

### KASS-BR-001

- severity: LOW
- source: Builder campaign dry run
- affected path: `packages/kernel/test/kernel-assurance-campaign.test.js`
- observation: The first Rule matrix generator produced three Evidence Requirements but calculated expected candidate counts and reason-code presence as if only two requirements existed.
- risk: The assurance harness could have reported false failures or obscured real Rule-matrix behavior by comparing the kernel against a mismatched test fixture.
- remediation: Added a requirement-set-specific input builder and updated the Rule matrix expectation to calculate absent requirement count, missing-Evidence candidates, and admissible fallback candidates from the exact generated input.
- validation: `pnpm test:kernel` after remediation passed with 474 tests, including 400 generated campaign cases.
- disposition: FIXED

### KASS-BR-002

- severity: LOW
- source: Builder typecheck
- affected path: `packages/kernel/test/kernel-assurance-campaign.test.js`
- observation: The new tests intentionally mutate caller-owned synthetic inputs, while the imported contract types expose readonly shapes.
- risk: Typecheck failure would block the campaign even though the mutations are local test fixture operations used to prove caller isolation and boundary rejection.
- remediation: Added explicit local mutable casts only around synthetic test fixture mutation points.
- validation: `pnpm typecheck:phase1` passed after remediation; `pnpm test:kernel` passed again afterward.
- disposition: FIXED

## Builder Status

`KERNEL-ASSURE-001` is BUILDER_READY_FOR_REVIEW. This status is repository engineering readiness for independent review, not Proofrail product acceptance.
