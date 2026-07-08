# Kernel Assurance Campaign

This document records the `KERNEL-ASSURE-001` Builder assurance campaign. It is an engineering record, not product authority, not independent acceptance, and not a Proofrail product Verdict.

## Scope

The campaign stays inside the Phase 1 synthetic kernel boundary. It adds a deterministic test-only assurance harness in `packages/kernel/test/kernel-assurance-campaign.test.js` and does not add production packages, external dependencies, repository inspection behavior, target-code execution, verification execution, adapters, delivery surfaces, model provider integration, or Inference Zone behavior.

No `packages/contracts` source was changed. No authoritative terminology, Trust, Verdict, protocol, or Evidence authority semantics were changed.

## Campaign Architecture

The assurance harness is dependency-free beyond Node's built-in `node:test` and `node:assert/strict`. Case generation uses fixed arrays, nested loops, explicit modeled paths, and lexicographic case ordering. It does not use time, randomness, network, filesystem state, environment values, repository inspection, or model output as evaluation input.

Each generated case has a stable identity string. The manifest test asserts unique identities, stable sorted generation order, at least 256 cases, and non-empty coverage across the major invariant families.

The campaign exercises 400 stable identified assurance cases:

- 144 primitive distinction cases.
- 16 permutation and repeated-evaluation cases.
- 16 Rule denial matrix cases.
- 15 Verdict reference-model cases.
- 198 boundary-shape and executable-wrapper cases.
- 8 lineage, caller-isolation, immutability, observation-scope, Claim-boundary, and identity cases.
- 3 canonical serialization cases.

## Invariant Families

Permutation invariance is checked for Claims, Evidence Contracts, Evidence Contract `requirementIds`, Evidence Requirements, Observations, Observation `limitations`, and Rules. Repeated evaluation and semantically equivalent permutations must produce deeply equal finalized bundles with stable bundle identities.

Primitive distinction is checked across `null`, booleans, strings, finite numbers, and negative zero where relevant. Canonical JSON object key ordering, array-order preservation before domain normalization, and non-finite-number rejection are checked directly.

Missing Evidence Requirement handling is checked across multiple simultaneous missing requirements. The kernel-owned `KERNEL_EVIDENCE_REQUIREMENT_MISSING` reason is expected to remain the only missing-Evidence condition code and is separately rejected when supplied as a Rule reason code. `HARN_` Rule reason codes remain rejected.

Rule evaluation is checked across `EVIDENCE_PRESENT` and `EVIDENCE_ABSENT`, triggered and non-triggered Rules, mixed reason-code order, and lower-precedence reason retention.

Verdict reduction is cross-checked against a test-only reference precedence model for every non-empty combination of the four canonical Verdict values. The reference model independently selects `BLOCKED > REJECTED > REVISION_REQUIRED > ADMISSIBLE` and checks deterministic candidate, reason-code, and lineage retention.

Boundary assurance recursively places malformed structures at modeled root and nested paths. It covers Proxy wrappers, revoked Proxy, accessors, symbols, non-enumerable properties, sparse Arrays, non-ordinary Array prototypes, Array subclasses, unknown fields, authority-shaped fields, own `__proto__` keys, cycles, Date, Map, Set, function, bigint, undefined, NaN, Infinity, duplicate identities, invalid references, and invalid provenance.

Executable-wrapper regressions assert zero caller-controlled getter, Array override, custom prototype method, and Proxy trap execution counts where the current boundary promises early rejection.

Caller-input isolation mutates nested caller records and arrays after evaluation and checks that finalized bundle content and identity do not change. Deep immutability traverses representative `ADMISSIBLE`, `REVISION_REQUIRED`, and `REJECTED` bundles and attempts mutation against every reachable object or Array.

Evidence Lineage coverage checks required Claim, Evidence Contract, selection provenance, Evidence Requirement, accepted Observation, produced Evidence, Rule, candidate classification, and Verdict reduction references.

Observation-scope tests distinguish rejected out-of-scope Observations from valid-scope unmatched Observations. Claim-boundary tests verify adversarial Claim text cannot substitute for Observation facts.

## Reference-Model Boundary

The test-only Verdict reference model is intentionally narrow. It does not define product semantics. It exists only to compare the kernel reducer against an independently written precedence calculation over already-classified synthetic candidate Verdict states.

The boundary-shape campaign similarly asserts current kernel boundary behavior. It does not create a general product schema, policy runtime, adapter protocol implementation, or new reason-code registry.

## Defect Remediation Loop

The initial campaign run found a Builder harness defect: the Rule matrix generated a third Evidence Requirement while calculating expected results for a two-requirement matrix. The harness was corrected to build the same requirement set that its reference expectation uses.

Typecheck then found readonly contract-type friction in mutable test fixtures. The test file was corrected with explicit local mutable casts around caller-owned synthetic input mutation. No production kernel remediation was required by this campaign.

## Audit Notes

The campaign contains no skipped tests, todo tests, snapshot assertions, `assert.doesNotThrow` assertions, or cases that only prove no exception was thrown. Passing test names and comments are not treated as authority.

Production-source search found no kernel or contracts use of filesystem, child process, network, model provider, GitHub, time, randomness, or random UUID APIs.

## Known Gaps

This campaign does not provide independent review, product readiness, Phase 1 completion, external reproducibility, complete Evidence Bundle protocol coverage, repository inspection, verification execution, Policy runtime, adapters, delivery integrations, or model-provider behavior.

Future authorized work should continue broadening assurance only within task scope and should preserve the separation between deterministic kernel evaluation and environmental reproducibility.
