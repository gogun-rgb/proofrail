# Kernel Assurance Campaign

This document records the `KERNEL-ASSURE-001` Builder assurance campaign and the `KERNEL-ASSURE-CONV-001` Builder convergence update. It is an engineering record, not product authority, not independent acceptance, and not a Proofrail product Verdict.

## Scope

The campaign stays inside the Phase 1 synthetic kernel boundary. It adds a deterministic test-only assurance harness in `packages/kernel/test/kernel-assurance-campaign.test.js` and does not add production packages, external dependencies, repository inspection behavior, target-code execution, verification execution, adapters, delivery surfaces, model provider integration, or Inference Zone behavior.

No `packages/contracts` source was changed. No authoritative terminology, Trust, Verdict, protocol, or Evidence authority semantics were changed.

## Campaign Architecture

The assurance harness is dependency-free beyond Node's built-in `node:test` and `node:assert/strict`. Case generation uses fixed arrays, nested loops, explicit modeled paths, and lexicographic case ordering. It does not use time, randomness, network, filesystem state, environment values, repository inspection, or model output as evaluation input.

Each generated case has a stable identity string. The manifest test asserts unique identities, stable sorted generation order, the exact recalculated family counts, and at least 256 useful cases.

After convergence, the campaign exercises 401 stable identified assurance cases:

- 144 primitive distinction cases.
- 16 diversified permutation and repeated-evaluation cases.
- 16 Rule denial matrix cases.
- 15 Verdict reference-model cases.
- 198 boundary-shape and executable-wrapper cases.
- 9 lineage, caller-isolation, immutability, observation-scope, Claim-boundary, and identity cases.
- 3 canonical serialization cases.

The boundary-shape and executable-wrapper cases split into 96 boundary-record cases, 63 boundary-array cases, 16 boundary-value cases, 7 executable-wrapper cases, and 16 boundary-reference/provenance/reason cases. The lineage and isolation family splits into 4 lineage/identity/scope/Claim-boundary cases, 2 caller-isolation cases, and 3 deep-immutability cases.

## Invariant Families

Permutation invariance is checked for Claims, Evidence Contracts, Evidence Contract `requirementIds`, Evidence Requirements, Observations, Observation `limitations`, and Rules. Repeated evaluation and semantically equivalent permutations must produce deeply equal finalized bundles with stable bundle identities.

`KERNEL-ASSURE-CONV-001` audited the original 16 permutation variants and replaced index-only near-duplicates with 16 named dimensions: all-present Rule denial, missing-requirement reason retention, non-triggered Rule admissibility, revision-only missing Evidence, absence-triggered denial, single-present multiple-missing handling, all-missing revision handling, two triggered denials, Trusted Configuration Rule authority, deterministic Policy selection provenance, duplicate accepted Observations, unmatched limited Observations, and string, number, null, and false primitive satisfaction. No permutation case is retained merely to inflate the count.

Primitive distinction is checked across `null`, booleans, strings, finite numbers, and negative zero where relevant. Canonical JSON object key ordering, array-order preservation before domain normalization, and non-finite-number rejection are checked directly.

Missing Evidence Requirement handling is checked across multiple simultaneous missing requirements. The kernel-owned `KERNEL_EVIDENCE_REQUIREMENT_MISSING` reason is expected to remain the only missing-Evidence condition code and is separately rejected when supplied as a Rule reason code. `HARN_` Rule reason codes remain rejected.

Rule evaluation is checked across `EVIDENCE_PRESENT` and `EVIDENCE_ABSENT`, triggered and non-triggered Rules, mixed reason-code order, and lower-precedence reason retention.

Verdict reduction is cross-checked against a test-only reference precedence model for every non-empty combination of the four canonical Verdict values. The convergence reference oracle no longer imports or calls the production reducer, production precedence array, or production rank helpers. It independently selects the winning Verdict through explicit high-precedence condition checks, independently derives deterministic candidate ordering by explicit Verdict buckets, and checks published precedence output, reason-code retention, lineage retention, and candidate identity ordering.

Boundary assurance recursively places malformed structures at modeled root and nested paths. It covers Proxy wrappers, revoked Proxy, accessors, symbols, non-enumerable properties, sparse Arrays, non-ordinary Array prototypes, Array subclasses, unknown fields, authority-shaped fields, own `__proto__` keys, cycles, Date, Map, Set, function, bigint, undefined, NaN, Infinity, duplicate identities, invalid references, and invalid provenance.

Executable-wrapper regressions assert zero caller-controlled getter, Array override, custom prototype method, and Proxy trap execution counts where the current boundary promises early rejection.

Caller-input isolation now has two separate invariants. Direct caller non-mutation snapshots a representative multi-requirement input before `evaluateKernel` and before the `evaluate` alias, then proves the caller-owned input remains deeply equal to the snapshot and remains unfrozen afterward. Post-evaluation mutation isolation remains separate: it mutates nested caller records and arrays after evaluation and checks that finalized bundle content and identity do not change. Deep immutability traverses representative `ADMISSIBLE`, `REVISION_REQUIRED`, and `REJECTED` bundles and attempts mutation against every reachable object or Array.

Evidence Lineage coverage checks required Claim, Evidence Contract, selection provenance, Evidence Requirement, accepted Observation, produced Evidence, Rule, candidate classification, and Verdict reduction references. The convergence harness checks concrete `VERDICT_CANDIDATE_CLASSIFIED` reference fields and values for the `ADMISSIBLE` path and representative `REVISION_REQUIRED` and `REJECTED` non-ADMISSIBLE paths, rather than checking only kind presence.

Observation-scope tests distinguish rejected out-of-scope Observations from valid-scope unmatched Observations. Claim-boundary tests verify adversarial Claim text cannot substitute for Observation facts.

## Reference-Model Boundary

The test-only Verdict reference model is intentionally narrow. It does not define product semantics. It exists only to compare the kernel reducer against an independently written precedence calculation over already-classified synthetic candidate Verdict states.

The convergence oracle is deliberately structurally different from `packages/kernel/src/verdict-reduction.js`: it uses explicit `BLOCKED`, `REJECTED`, `REVISION_REQUIRED`, then `ADMISSIBLE` containment checks for the winner and explicit per-Verdict buckets for candidate ordering. A correlated production defect in the reducer's ordered-array plus rank-map path should be able to disagree with this oracle.

The boundary-shape campaign similarly asserts current kernel boundary behavior. It does not create a general product schema, policy runtime, adapter protocol implementation, or new reason-code registry.

## Defect Remediation Loop

The initial campaign run found a Builder harness defect: the Rule matrix generated a third Evidence Requirement while calculating expected results for a two-requirement matrix. The harness was corrected to build the same requirement set that its reference expectation uses.

Typecheck then found readonly contract-type friction in mutable test fixtures. The test file was corrected with explicit local mutable casts around caller-owned synthetic input mutation. No production kernel remediation was required by this campaign.

During `KERNEL-ASSURE-CONV-001`, typecheck found a Builder harness annotation issue after the caller non-mutation case was added: the evaluator tuple was inferred as a mixed string/function array and two local callbacks had implicit `any` parameters. The harness annotations were corrected. No production kernel remediation was required by this convergence update.

## Audit Notes

The campaign contains no skipped tests, todo tests, snapshot assertions, `assert.doesNotThrow` assertions, or cases that only prove no exception was thrown. Passing test names and comments are not treated as authority.

Production-source search found no kernel or contracts use of filesystem, child process, network, model provider, GitHub, time, randomness, or random UUID APIs.

## Known Gaps

This campaign does not provide independent review, product readiness, Phase 1 completion, external reproducibility, complete Evidence Bundle protocol coverage, repository inspection, verification execution, Policy runtime, adapters, delivery integrations, or model-provider behavior.

Future authorized work should continue broadening assurance only within task scope and should preserve the separation between deterministic kernel evaluation and environmental reproducibility.
