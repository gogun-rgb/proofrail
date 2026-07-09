# Phase 1 Gate Evidence

Task: `PHASE1-GATE-002`.

Date: 2026-07-09.

Builder status: `BUILDER_READY_FOR_INDEPENDENT_GATE`.

This is a fresh Builder evidence record for the Phase 1 Deterministic Kernel Vertical Slice. It is not independent Gate acceptance, not Phase 1 closure, not Phase 2 authorization, not product readiness, and not a Proofrail product Verdict.

## Clean-Rebootstrap Provenance

Review baseline: `origin/main` at `0616091da1a572a2ea3e457ed84dab8e32259f59`.

Gate branch head before Builder evidence edits: `77bd16ce407aed46ccda9a73cb90fd2d88232223`.

Committed branch delta from `origin/main` before Builder evidence edits:

```text
A	governance/tasks/PHASE1-GATE-002.json
```

The worktree initially contained uncommitted Gate evidence files. Those local artifacts were not used as authority or accepted evidence. `docs/engineering/validation-evidence.md` was restored to the committed branch state before the fresh PHASE1-GATE-002 validation section was appended.

`pnpm governance:check` exited 0 before any Builder edit.

## Authority Read Set

The Builder read `governance/tasks/PHASE1-GATE-002.json` and every `authority.read` path named by that contract, including the current authority documents, Phase 1 plan and engineering records, prior kernel assurance records, KERNEL task contracts, `packages/contracts` source, `packages/kernel` source, and the named kernel tests.

The review subject was the current `origin/main` authority, production source, tests, and package manifests plus the externally committed `PHASE1-GATE-002` task contract. Gate 1 branch artifacts and PR #11 conclusions were not used.

## Objective Coverage Matrix

| Phase 1 edge | Current implementation evidence | Representative tests | Residual uncertainty |
| --- | --- | --- | --- |
| Claim -> Evidence Contract | `evaluateKernel` starts at the synthetic boundary; `validateKernelEvaluationInput` validates Claims and Evidence Contracts and `validateReferences` requires every Claim target scope to have a selected Evidence Contract. | `kernel-vertical-slice.test.js` Claim non-evidence case; boundary Claim target-scope rejection; assurance `boundary-reference/claim-target-scope-without-contract`. | Contract selection authority is modeled as already authorized synthetic input; external trust establishment remains outside Phase 1. |
| Evidence Contract -> Evidence Requirement | Contracts carry `requirementIds`; boundary validation checks referenced requirements exist, point back to the contract, and share target scope; normalization sorts requirement ids and requirements deterministically. | Boundary unknown requirement and requirement-contract mismatch cases; assurance boundary-reference cases. | No complete future Evidence Contract protocol runtime is implemented. |
| Evidence Requirement -> Observation | Requirements and Observations model scope, observer identity, observer version, fact key, primitive values, source input identity, ordering key, and limitations; Observation target scope must be inside declared evaluation scope. | Observer mismatch, version mismatch, fact-key mismatch, limitation, out-of-scope Observation, and valid-scope unmatched Observation tests. | Only synthetic in-memory Observations are authorized; repository observation mechanisms are absent by design. |
| Observation -> Evidence satisfaction | `evaluateEvidenceSatisfaction` uses only `OBSERVATION_FACT_EQUALS`; `observationSatisfiesRequirement` requires matching scope, observer id/version, fact key, canonical primitive value, and no limitations. | Satisfied requirement, primitive distinction, limitations, and assurance primitive matrix cases. | Verification Receipts are not ingested in this slice. |
| Evidence satisfaction -> Rule | `evaluateRules` computes satisfied requirement ids from produced Evidence and evaluates only `EVIDENCE_PRESENT` and `EVIDENCE_ABSENT`. | Rule denial tests and assurance 16-case Rule matrix. | Full Policy runtime is absent and explicitly outside Phase 1. |
| Rule -> Verdict reduction | Triggered Rule denial creates `REJECTED` candidates with stable Rule reason codes; missing Evidence creates `REVISION_REQUIRED`; reducer preserves `BLOCKED > REJECTED > REVISION_REQUIRED > ADMISSIBLE`. | `verdict-reduction.test.js`; lower-precedence reason-retention test; assurance Verdict reference oracle over all non-empty Verdict combinations. | `BLOCKED` is exercised through the pure reducer, not by adding unauthorized execution/capability behavior. |
| Verdict reduction -> Evidence Bundle | `finalizeEvidenceBundle` creates base and evaluation lineage, adds an `ADMISSIBLE` candidate only when no higher candidate exists, records empty `verificationReceipts`, derives bundle identity from canonical content, and deep-freezes the bundle. | Lineage coverage, identity stability, caller isolation, deep immutability, and assurance lineage/isolation/immutability cases. | Phase 1 bundle is not the complete final future Evidence Bundle protocol. |

## Package And Export Inventory

Production package directories under `packages`:

```text
contracts
kernel
```

Public runtime exports observed by importing package source:

```text
contracts=EVIDENCE_CONTRACT_SELECTION_PROVENANCE_SOURCES,EVIDENCE_SATISFACTION_KIND,PHASE1_BUNDLE_SCHEMA_VERSION,PHASE1_KERNEL_ENGINE_VERSION,PHASE1_KERNEL_INPUT_SCHEMA_VERSION,RULE_AUTHORITY_PROVENANCE_SOURCES,RULE_EFFECT_DENY,RULE_PREDICATES,VERDICTS
kernel=KernelBoundaryError,evaluate,evaluateKernel
```

Internal module exports exist in `packages/kernel/src` for decomposition, including boundary validation, normalization, canonical JSON, Evidence satisfaction, Rule evaluation, Verdict reduction, bundle finalization, deep freeze, and internal reason-code helpers. The public kernel package export remains `packages/kernel/src/index.js`.

Dependency inventory:

- `@proofrail/contracts` has no runtime dependency on kernel or later layers.
- `@proofrail/kernel` depends on `@proofrail/contracts` through `workspace:*`.
- Production source imports only sibling kernel modules, `@proofrail/contracts`, `node:crypto` for deterministic SHA-256 hashing, and `node:util` for Proxy detection.
- Root dev dependencies remain governance/typecheck tooling and are not product runtime dependencies.

No production package outside `packages/contracts` and `packages/kernel` was found.

## Deterministic Invariant Review

| Invariant | Source-grounded evidence | Result |
| --- | --- | --- |
| Evidence satisfaction is deterministic and narrow | `evaluateEvidenceSatisfaction` and `observationSatisfiesRequirement` compare modeled fields and canonical JSON primitive values only. | Satisfied |
| Claim content cannot become Evidence | Claims are lineage inputs; Evidence is produced only from accepted Observation ids for an Evidence Requirement. | Satisfied |
| Rule evaluation is deterministic | `evaluateRules` evaluates normalized Rules against produced Evidence and emits deterministic candidates. | Satisfied |
| Verdict precedence and reason retention are deterministic | `reduceVerdictCandidates` sorts candidates, selects the highest-precedence Verdict, and retains unique sorted reasons and lineage ids. | Satisfied |
| Bundle identity and lineage are deterministic | `canonicalJson`, `sha256Digest`, `derivedIdentity`, and sorted lineage/finalization paths derive identities from canonical content. | Satisfied |
| Caller input is isolated | Boundary scan and clone precede semantic validation; normalization returns new records; tests prove no caller mutation/freeze and post-evaluation mutation isolation. | Satisfied |
| Final bundles are deeply immutable | `deepFreeze` recursively freezes finalized bundle graphs; tests traverse representative bundles. | Satisfied |
| Inference-shaped fields are rejected | Boundary rejects `modelConfidence`, `inferenceProposal`, and `proposedContent` on records and Arrays. | Satisfied |
| Reserved reason codes are rejected | `HARN_` Rule reason codes and Rule use of `KERNEL_EVIDENCE_REQUIREMENT_MISSING` are rejected. | Satisfied |
| Malformed boundary input is rejected deterministically | Boundary tests and assurance cases cover accessors, symbols, non-enumerables, sparse/non-ordinary Arrays, Proxies, cycles, invalid JSON values, duplicate identities, invalid references, and invalid provenance. | Satisfied |
| Repeated or permuted input stability | Normalization sorts semantically unordered collections; tests compare repeated and permuted finalized bundles and identities. | Satisfied |

No real Phase 1 objective defect, forbidden integration, semantic drift, or unverifiable required invariant was found in this Builder review.

## Forbidden-Surface Audit

Production source and package manifest searches found no repository or filesystem inspection, child process execution, package-manager/build-tool execution, network clients, GitHub integration, model-provider integration, Inference Zone implementation, current-time dependence, randomness, UUID generation, environment-derived authoritative input, probabilistic confidence, or LLM judgment.

Searches for `PASS`, `FAIL`, `APPROVED`, `DENIED`, `UNKNOWN`, probabilistic safety language, and model-confidence authority in production source found no additional authoritative Verdict values. The only production Verdict literals are `ADMISSIBLE`, `REVISION_REQUIRED`, `REJECTED`, and `BLOCKED`. `DENY` exists only as the Rule effect constant, not as a Verdict.

`HARN_` appears in production source only in Rule reason-code rejection logic. `KERNEL_EVIDENCE_REQUIREMENT_MISSING` appears as the single internal kernel missing-Evidence reason-code declaration and is rejected when supplied by a Rule.

## Known Gap Classification

| Known Gap | Classification | Rationale |
| --- | --- | --- |
| Independent review absent from Builder assurance | `FUTURE_PHASE_GAP` | Independent review is required after Builder preparation; Builder status is not Gate acceptance. |
| Product readiness and Phase 1 completion absent | `FUTURE_PHASE_GAP` | The Gate task prepares evidence only and does not close Phase 1. |
| External reproducibility not proven | `FUTURE_PHASE_GAP` | Bundle format separates deterministic evaluation from environmental reproducibility. |
| Complete Evidence Bundle protocol coverage absent | `FUTURE_PHASE_GAP` | Phase 1 implements a vertical-slice bundle, not the complete future protocol. |
| Repository inspection absent | `FUTURE_PHASE_GAP` | Explicitly forbidden in Phase 1; absence is not a Phase 1 blocker. |
| Verification execution absent | `FUTURE_PHASE_GAP` | Explicitly forbidden in Phase 1; `verificationReceipts` are empty rather than fabricated. |
| Policy runtime and deterministic Policy selection outside kernel absent | `FUTURE_PHASE_GAP` | Current kernel accepts already-authorized synthetic provenance only. |
| Adapters, delivery integrations, GitHub, model-provider behavior, and Inference Zone absent | `FUTURE_PHASE_GAP` | Explicitly forbidden in Phase 1. |
| External trust establishment before kernel boundary absent | `FUTURE_PHASE_GAP` | Belongs to later orchestration/trusted-configuration work. |

No Known Gap reviewed here is classified as `PHASE1_BLOCKER`.

## Record-Drift Inventory

| Path | Assertion | Classification | Disposition |
| --- | --- | --- | --- |
| `README.md` | The first implementation task identity exists on `phase1/kernel-vertical-slice-1` and is pending independent review. | `RECORD_DRIFT` | Transition candidate only; not edited in this task. |
| `docs/constitution/product-constitution.md` | Transition-era statement says no product runtime, kernel implementation, contracts implementation, or Phase 1 vertical slice exists until later authorized implementation. | `RECORD_DRIFT` | Current phase authority candidate; not edited in this task. |
| `docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md` | Status still names `KERNEL-VS-CONV-003` as pending independent review and uses expected-test wording. | `RECORD_DRIFT` | Current phase plan candidate; not edited in this task. |

These stale or potentially stale declarations do not change the source-grounded review of current production source and tests. They are preserved for independent Gate/transition handling.

## Findings

| ID | Severity | Affected path or surface | Observation | Risk to Phase 1 objective or Gate integrity | Evidence | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| GATE2-FIND-001 | LOW | `README.md` | Active Plan text still points at `phase1/kernel-vertical-slice-1` and pending independent review. | Could confuse post-Gate transition readers about current branch/review state. | Record-drift search lines in `README.md`. | `RECORD_DRIFT`; not a Phase 1 blocker; not edited. |
| GATE2-FIND-002 | LOW | `docs/constitution/product-constitution.md` | Transition-era wording still says no kernel/contracts/vertical slice exists until later implementation. | Could become stale if independent Gate accepts the implemented slice, but current task cannot edit authority. | Record-drift search line in Product Constitution. | `RECORD_DRIFT`; not edited. |
| GATE2-FIND-003 | LOW | `docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md` | Plan status remains tied to `KERNEL-VS-CONV-003` pending independent review and expected-test language. | Could require update after independent Gate decision. | Record-drift search lines in active Phase 1 plan. | `RECORD_DRIFT`; not edited. |

No `PHASE1_BLOCKER`, HIGH, or CRITICAL Builder finding is open.

## Mechanical Verification

Command results are recorded in `docs/engineering/validation-evidence.md`.

Required command summary after fresh execution:

| Command | Exit status | Bounded result |
| --- | --- | --- |
| `pnpm governance:check` | 0 | Mechanical Foundation governance checks passed. |
| `pnpm governance:check-json` | 0 | Foundation JSON validation output parsed as `VALID`. |
| `pnpm test:governance` | 0 | Governance tests passed. |
| `pnpm typecheck:phase1` | 0 | TypeScript Phase 1 check passed. |
| `pnpm test:kernel` | 0 | Kernel tests passed. |
| `pnpm test:kernel` | 0 | Kernel tests passed again. |
| `pnpm verify` | 0 | Governance check, JSON check, governance tests, typecheck, kernel tests, and diff whitespace check passed. |
| `node scripts/validate-foundation.mjs` | 0 | Mechanical Foundation governance checks passed. |
| `node scripts/validate-foundation.mjs --format json` | 0 | JSON status `VALID`, findings empty. |
| `node scripts/governance/verify-json-output.mjs` | 0 | Foundation JSON validation output parsed as `VALID`. |
| `git diff --check` | 0 | No whitespace errors. |

## Deterministic Verify No-Mutation Comparison

Method:

```powershell
git add -N docs/engineering/phase-1-gate-evidence.md docs/reviews/phase-1-gate-builder-review.md
git diff HEAD --binary | git hash-object --stdin
git status --short | Sort-Object
pnpm verify
git diff HEAD --binary | git hash-object --stdin
git status --short | Sort-Object
```

Recorded values:

```text
pre-verify tracked diff hash: 0fd7f1e84ee523501d2c83677cbdc4f016f5ecb6
post-verify tracked diff hash: 0fd7f1e84ee523501d2c83677cbdc4f016f5ecb6
pre-verify sorted status:
 A docs/engineering/phase-1-gate-evidence.md
 A docs/reviews/phase-1-gate-builder-review.md
 M docs/engineering/validation-evidence.md
post-verify sorted status:
 A docs/engineering/phase-1-gate-evidence.md
 A docs/reviews/phase-1-gate-builder-review.md
 M docs/engineering/validation-evidence.md
pnpm verify exit status: 0
```

Sequencing limitation: the no-mutation values are recorded after the measured `pnpm verify` run. The comparison proves that `pnpm verify` was non-mutating for the otherwise-complete Gate evidence and Builder review set immediately before this subsection was updated; it does not claim this final explanatory update existed before the measured command.

## Known Limitations

- This is Builder evidence, not independent Gate acceptance.
- It does not close Phase 1 or authorize Phase 2.
- It does not claim a complete product runtime.
- It does not implement or authorize repository inspection, verification execution, adapters, delivery surfaces, GitHub integration, model-provider integration, or Inference Zone behavior.
- It does not treat tests, source comments, Builder prose, model output, or repository text as authoritative Evidence.
