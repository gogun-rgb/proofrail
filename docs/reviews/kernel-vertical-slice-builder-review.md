# Kernel Vertical Slice Builder Review

This is Builder review for `KERNEL-VS-001`. It is not independent acceptance and is not a Proofrail product Verdict.

## Review Provenance

- Builder: current Codex implementation session on `phase1/kernel-vertical-slice-1`.
- Read-only Reviewer A: Domain semantics review, agent `019f4036-0a41-78c1-99b0-06951e2de115`.
- Read-only Reviewer B: Determinism and immutability review, agent `019f4036-39ad-74f1-9a41-6fe264c838ff`.
- Read-only Reviewer C: Architecture and boundary review, agent `019f4036-64e6-78d0-9d01-973227b67da6`.
- Review boundary: Builder-internal only. The read-only reviewers did not provide independent acceptance.

## Coverage

Reviewed topics included canonical terminology drift, Claim/Evidence authority leakage, Evidence Contract selection authority leakage, Rule authority leakage, Machine Task Contract runtime-authority leakage, model confidence leakage, Inference Proposal leakage, Evidence satisfaction coercion, limitation handling, malformed JSON values, duplicate identity handling, invalid reference handling, deterministic normalization, canonical serialization, derived identity stability, Verdict precedence, lower-precedence reason retention, Evidence Lineage completeness, bundle deep immutability, caller input mutation, package dependency direction, repository inspection leakage, target-code execution leakage, verification execution leakage, network leakage, product runtime dependency growth, `HARN_` namespace leakage, complete bundle-format overclaim, README maturity overclaim, and `pnpm verify` mutation risk.

No Builder-discovered CRITICAL findings remain open. No Builder-discovered HIGH findings remain open.

## Findings

### KVS-BR-001

- severity: HIGH
- source: Read-only Reviewer A
- location: `packages/kernel/src/boundary-validation.js`, `packages/kernel/src/bundle-finalization.js`
- observation: A caller could submit an additional Claim with a target scope not covered by a selected Evidence Contract. The kernel could still produce `ADMISSIBLE` when the covered requirements passed.
- risk: The bundle could appear to admit a Claim surface that was not governed by an Evidence Contract or Evidence Requirement.
- remediation: Added reverse target-scope validation so every Claim scope must have a selected Evidence Contract, and added regression coverage.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`.
- disposition: FIXED

### KVS-BR-002

- severity: MEDIUM
- source: Read-only Reviewer A
- location: `packages/kernel/src/evidence-satisfaction.js`, `packages/contracts/src/index.d.ts`
- observation: Produced Evidence retained its own Evidence-produced lineage ID but did not directly retain accepted Observation lineage IDs.
- risk: Evidence source lineage was present in the bundle but harder to trace from the Evidence record itself.
- remediation: Evidence now retains accepted Observation lineage IDs plus produced-Evidence lineage ID. The satisfied-requirement test asserts both lineage links exist.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`.
- disposition: FIXED

### KVS-BR-003

- severity: MEDIUM
- source: Read-only Reviewer A
- location: `packages/kernel/src/verdict-reduction.js`
- observation: The exported pure reducer could return `ADMISSIBLE` for an empty candidate set or ignore unknown candidate Verdict values.
- risk: A public helper could appear to reduce invalid caller-supplied candidates into an admissible outcome outside the evaluated kernel path.
- remediation: The reducer now rejects empty candidate sets and unknown Verdict candidates with `TypeError`, and regression coverage was added.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`.
- disposition: FIXED

### KVS-BR-004

- severity: HIGH
- source: Read-only Reviewer B
- location: `packages/kernel/src/boundary-validation.js`
- observation: Accessor-backed plain objects could compute values during validation or clone reads.
- risk: Getter-backed input could inject time, random, mutation, or other side effects while still resembling a plain authoritative object.
- remediation: Boundary validation now rejects accessor-backed, symbol-keyed, and non-enumerable authoritative fields before value reads, and regression coverage was added.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`.
- disposition: FIXED

### KVS-BR-005

- severity: MEDIUM
- source: Read-only Reviewer B
- location: `packages/kernel/src/normalization.js`, `packages/kernel/src/bundle-finalization.js`
- observation: Nested union records created by object spread could preserve caller key insertion order in returned bundle objects.
- risk: `JSON.stringify(bundle)` could differ for semantically identical inputs even when bundle identity used canonical JSON.
- remediation: Normalization now reconstructs Evidence Contract selection provenance, Rule predicates, Rule effects, and Rule authority with explicit field order. Regression coverage compares serialized bundle output for alternate nested key insertion order.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`.
- disposition: FIXED

### KVS-BR-006

- severity: LOW
- source: Read-only Reviewer B
- location: `packages/kernel/src/canonical-json.js`
- observation: Public canonicalization wrote sorted keys into `{}`, which is unsafe for own `__proto__` data keys.
- risk: A public utility caller could get noncanonical behavior for otherwise JSON-shaped objects containing an own `__proto__` key.
- remediation: Canonicalization now writes normalized object keys into `Object.create(null)` via `Object.defineProperty`.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`.
- disposition: FIXED

### KVS-BR-007

- severity: MEDIUM
- source: Read-only Reviewer C
- location: `packages/kernel/src/index.js`
- observation: The root kernel package exported canonical/hash helpers and the pure reducer in addition to the primary evaluation entry point.
- risk: The public kernel surface was wider than the requested one clear vertical-slice entry point.
- remediation: The root export now exposes only `evaluateKernel`, `evaluate`, and `KernelBoundaryError`. Tests import the pure reducer directly from its internal source module.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`.
- disposition: FIXED

### KVS-BR-008

- severity: MEDIUM
- source: Read-only Reviewer C
- location: `packages/kernel/src/boundary-validation.js`
- observation: Stable identity validation allowed `:` and `/`, permitting path-shaped or URL-shaped identities to be preserved in bundle content.
- risk: Synthetic inputs could carry machine paths or network-shaped values into bundle identity material.
- remediation: Stable input identities now allow only alphanumeric characters plus `.`, `_`, and `-`. Regression coverage rejects path-shaped and URL-shaped identities.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`.
- disposition: FIXED

### KVS-BR-009

- severity: LOW
- source: Read-only Reviewer C
- location: `.pnpm-store`
- observation: An install-created local package-manager store existed as an untracked workspace artifact.
- risk: The artifact could obscure the final no-mutation and untracked-artifact checks.
- remediation: Removed `.pnpm-store` after verifying its resolved path was inside the workspace.
- validation method: `git status --short`; final no-mutation comparison.
- disposition: FIXED

### KVS-BR-010

- severity: LOW
- source: Builder
- location: `docs/engineering/kernel-vertical-slice.md`, `README.md`, `docs/protocols/bundle-format.md`
- observation: The implemented Evidence Bundle is intentionally a Phase 1 vertical-slice bundle, not the complete final Evidence Bundle protocol.
- risk: Overclaiming the bundle as the final protocol would blur implementation status and product authority.
- remediation: Documentation and README state that the implementation is an initial deterministic synthetic-input vertical slice and does not implement the complete final Evidence Bundle protocol or complete product runtime.
- validation method: Documentation inspection; `pnpm governance:check`.
- disposition: FIXED

### KVS-BR-011

- severity: LOW
- source: Builder
- location: `docs/reviews/kernel-vertical-slice-builder-review.md`
- observation: Builder self-review and bounded read-only reviewer findings are not independent acceptance.
- risk: Treating Builder review as acceptance would violate the review boundary.
- remediation: This review and the implementation documentation state that Builder review is provisional and not independent acceptance.
- validation method: Documentation inspection.
- disposition: OPEN
