# Kernel Vertical Slice Convergence Review

This is Builder convergence review for `KERNEL-VS-CONV-001`. It is not independent acceptance and is not a Proofrail product Verdict.

The findings below were externally supplied by the independent governor for PR #5 reviewed head `ee7b348868ab8ab342bb2ea6eb57f4b2477516b2`. This review records Builder remediation only.

## KVS-BND-001

- original severity: P1
- classification: ARRAY_CONTAINER_VALIDATION_BYPASS
- affected files: `packages/kernel/src/boundary-validation.js`; `packages/kernel/test/boundary-validation.test.js`; `docs/engineering/kernel-vertical-slice.md`
- exact remediation: Added recursive authoritative Array-container descriptor validation before element reads. The boundary now rejects sparse arrays, accessor-backed indices, symbol-keyed properties, unexpected string-keyed properties, custom non-enumerable properties, and array-attached forbidden authority fields before normalization or evaluation.
- negative tests added: array-attached `modelConfidence`; array-attached `inferenceProposal`; symbol-keyed array property; non-enumerable custom array property; accessor-backed numeric index; sparse `observations`; sparse `rules`; unexpected ordinary string-keyed array property; nested sparse Evidence Contract `requirementIds`; nested accessor-backed Observation `limitations`.
- regression tests added: repeated malformed array shape returns the same `KernelBoundaryError` issue category and path; ordinary dense JSON-compatible arrays remain accepted.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`; final verification command set recorded in validation evidence.
- getter execution observation: accessor-backed numeric-index regression observed getter execution count = 0.
- disposition: REMEDIATED

## KVS-RSN-001

- original severity: P1
- classification: KERNEL_REASON_CODE_SEMANTIC_COLLISION
- affected files: `packages/kernel/src/kernel-reason-codes.js`; `packages/kernel/src/evidence-satisfaction.js`; `packages/kernel/src/boundary-validation.js`; `packages/kernel/test/boundary-validation.test.js`; `packages/kernel/test/kernel-vertical-slice.test.js`; `docs/engineering/kernel-vertical-slice.md`
- exact remediation: Moved the missing Evidence Requirement condition reason code into a small internal kernel source of truth and reserved the exact `KERNEL_EVIDENCE_REQUIREMENT_MISSING` literal from Rule-supplied reason codes at the public kernel boundary. The change does not create a general product reason-code registry and does not reserve the full `KERNEL_` prefix.
- negative tests added: Rule-supplied `KERNEL_EVIDENCE_REQUIREMENT_MISSING` is rejected with `RESERVED_KERNEL_REASON_CODE` before Rule evaluation.
- regression tests added: missing Evidence Requirement classification still emits `KERNEL_EVIDENCE_REQUIREMENT_MISSING`; normal `KERNEL_SYNTHETIC_DENIAL` Rule reason remains valid; `HARN_` namespace rejection remains covered.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`; production-source occurrence search for `KERNEL_EVIDENCE_REQUIREMENT_MISSING`.
- disposition: REMEDIATED

## KVS-SCOPE-001

- original severity: P2
- classification: UNRELATED_OBSERVATION_SCOPE_ACCEPTED
- affected files: `packages/kernel/src/boundary-validation.js`; `packages/kernel/test/boundary-validation.test.js`; `packages/kernel/test/kernel-vertical-slice.test.js`; `docs/engineering/kernel-vertical-slice.md`
- exact remediation: Added Observation target-scope reference validation after existing Claim/Contract consistency validation. Observations whose `targetScopeId` is outside the declared evaluation scope are rejected with `TARGET_SCOPE_MISMATCH` before normalization.
- negative tests added: unrelated Observation target scope is rejected at `$.observations[0].targetScopeId`.
- regression tests added: wrong observer in a valid target scope remains valid boundary input and produces missing-Evidence behavior; wrong fact key in a valid target scope remains valid boundary input and produces missing-Evidence behavior; limited Observation in a valid target scope remains valid boundary input and does not satisfy the Requirement.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`; final verification command set recorded in validation evidence.
- disposition: REMEDIATED
