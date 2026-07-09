# Kernel Assurance Campaign Builder Review

This is Builder review for `KERNEL-ASSURE-001` and the `KERNEL-ASSURE-CONV-001` convergence update. It is not independent acceptance and is not a Proofrail product Verdict.

## Review Provenance

- Builder: current Codex implementation session on `phase1/kernel-assurance-campaign-1`.
- Task contracts: `governance/tasks/KERNEL-ASSURE-001.json` and `governance/tasks/KERNEL-ASSURE-CONV-001.json`.
- Review boundary: Builder-internal assurance and convergence only. Independent review remains required.

## Coverage

Reviewed topics included deterministic case generation, stable case identity, permutation invariance, repeated evaluation, duplicate-case audit and diversification, primitive distinction, canonical serialization, missing Evidence Requirement handling, Rule denial matrices, structurally independent Verdict reduction reference modeling, recursive boundary shapes, executable-wrapper early rejection, direct caller-input non-mutation, post-evaluation caller mutation isolation, deep immutability, Evidence identity, concrete lineage reference coverage, Observation scope handling, Claim non-evidence behavior, inference-shaped field rejection, reserved reason-code handling, skipped/todo/vacuous test audit, production-source forbidden-surface search, package-boundary inspection, and full verification readiness.

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

### KASS-CONV-001

- severity: MEDIUM
- source: `KERNEL-ASSURE-CONV-001` independent review concern
- affected path: `packages/kernel/test/kernel-assurance-campaign.test.js`
- observation: The previous test-only Verdict reference oracle used the same ordered Verdict list plus rank-map reduction shape as the production reducer, creating correlated reference-oracle risk.
- risk: A production defect in the shared precedence/ranking structure could be mirrored by the oracle and remain undetected.
- remediation: Replaced the oracle with explicit high-precedence containment checks, explicit per-Verdict candidate-ordering buckets, and independent published-precedence expectations while continuing to compare every non-empty canonical Verdict combination.
- validation: `pnpm test:kernel` passed with 475 tests, including 401 generated campaign cases; `pnpm typecheck:phase1` passed after local annotation remediation.
- disposition: FIXED

### KASS-CONV-002

- severity: LOW
- source: Builder duplicate-case audit
- affected path: `packages/kernel/test/kernel-assurance-campaign.test.js`
- observation: The 16 permutation cases differed mainly by index-shaped Claim and unmatched Observation identities.
- risk: Near-duplicate variants could inflate the identified case count without adding distinct reviewable paths or invariants.
- remediation: Replaced the index-only variants with 16 named permutation dimensions covering distinct verdict outcomes, rule-trigger patterns, provenance paths, duplicate accepted Observations, limitation normalization, and primitive satisfaction values.
- validation: The manifest now asserts exact family counts and 401 total generated cases; `pnpm test:kernel` passed.
- disposition: FIXED

### KASS-CONV-003

- severity: LOW
- source: `KERNEL-ASSURE-CONV-001` acceptance audit
- affected path: `packages/kernel/test/kernel-assurance-campaign.test.js`
- observation: Caller-input isolation covered post-evaluation mutation effects, and candidate-classification lineage checks did not assert concrete expected reference fields for representative paths.
- risk: The harness could miss caller input mutation during evaluation or lineage records with only kind-level coverage but wrong reference payloads.
- remediation: Added direct pre/post caller non-mutation checks for both `evaluateKernel` and `evaluate` using a representative multi-requirement input, and added concrete `VERDICT_CANDIDATE_CLASSIFIED` reference assertions for `ADMISSIBLE`, `REVISION_REQUIRED`, and `REJECTED` paths.
- validation: `pnpm test:kernel` passed with the new caller-input case and strengthened lineage assertions.
- disposition: FIXED

### KASS-CONV-004

- severity: LOW
- source: Builder validation-evidence audit
- affected path: `docs/engineering/validation-evidence.md`
- observation: Prior validation evidence said 17 Rule matrix subcases failed even though the generated Rule matrix contains 16 identified cases.
- risk: The evidence record could overstate the exact identified subcase count and blur any enclosing parent test failure from subcase failures.
- remediation: Corrected the evidence record to state 16 identified Rule matrix subcases and record the parent-test-count limitation precisely.
- validation: Validation evidence now distinguishes identified generated subcases from possible enclosing parent test failure accounting.
- disposition: FIXED

### KASS-CONV-005

- severity: LOW
- source: Builder typecheck
- affected path: `packages/kernel/test/kernel-assurance-campaign.test.js`
- observation: After convergence harness edits, TypeScript inferred the evaluator table as a mixed string/function array and reported two implicit callback parameter types.
- risk: Typecheck failure would block review readiness despite passing runtime tests.
- remediation: Added a local tuple annotation for evaluator entry points and explicit local callback parameter annotations.
- validation: `pnpm typecheck:phase1` rerun exited 0.
- disposition: FIXED

## Builder Status

`KERNEL-ASSURE-CONV-001` is BUILDER_READY_FOR_REVIEW after final verification evidence is recorded. This status is repository engineering readiness for independent review, not Proofrail product acceptance.
