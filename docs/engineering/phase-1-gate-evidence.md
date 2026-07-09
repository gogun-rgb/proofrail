# Phase 1 Gate Evidence

## Authority And Scope

This document is engineering gate-preparation evidence for `PHASE1-GATE-001`.
It is not independent Gate acceptance, not Phase 1 closure, not product
readiness, and not a Proofrail product Verdict.

Task boundary:

- Task: `PHASE1-GATE-001`
- Class: independent gate preparation
- Authority change: not authorized
- Product semantic change: not authorized
- Writable evidence paths: this file, `docs/engineering/validation-evidence.md`,
  `docs/reviews/phase-1-gate-builder-review.md`, and
  `governance/tasks/PHASE1-GATE-001.json`
- Production, contracts, tests, current phase authority, product semantics,
  Verdict semantics, Evidence authority classes, Trust semantics, and canonical
  terminology: not modified

## Exact Baseline

Fetch result: `git fetch origin` succeeded before branch switch.

Review baseline for current Phase 1 source and tests:

```text
origin/main = 0616091da1a572a2ea3e457ed84dab8e32259f59
```

Required baseline from `PHASE1-GATE-001`:

```text
0616091da1a572a2ea3e457ed84dab8e32259f59
```

Main movement inspection:

- `origin/main` exactly equals the required baseline.
- There are no additional `origin/main` commits after
  `0616091da1a572a2ea3e457ed84dab8e32259f59` to inspect.
- Before gate-preparation edits, `phase1/phase-1-gate-1` pointed at
  `d8ef3e124232b6aeed6e843ae2d4657850fc8417`, whose delta from `origin/main`
  was only `governance/tasks/PHASE1-GATE-001.json`.

## Authority Read

Every `authority.read` path from `governance/tasks/PHASE1-GATE-001.json` was
read before this gate evidence was produced. The read set included the
constitution, terminology, trust model, data-flow and dependency architecture,
inference and execution boundaries, Verdict semantics, protocol foundations,
Foundation gate state, active Phase 1 plan, kernel implementation and assurance
records, validation evidence, prior task contracts, contracts package source,
kernel production source, and representative kernel tests.

The review treated source comments, test names, repository prose, Builder
claims, and model confidence as non-authoritative by themselves. Source and test
references below are used as observations for this engineering gate record, not
as Proofrail product Evidence.

## Phase 1 Objective Coverage Matrix

| Edge | Implementation paths | Representative tests | Residual uncertainty |
| --- | --- | --- | --- |
| Claim -> Evidence Contract | `validateKernelEvaluationInput` validates Claims and Evidence Contracts, then `validateReferences` requires contract target scopes to match declared Claim scopes (`packages/kernel/src/boundary-validation.js:38`, `:51`, `:54`, `:356`, `:360`, `:381`). `baseLineage` emits `CLAIM_DECLARED`, `EVIDENCE_CONTRACT_SELECTED`, and `EVIDENCE_CONTRACT_SELECTION_PROVENANCE` (`packages/kernel/src/bundle-finalization.js:78`, `:82`, `:89`, `:95`). | Claim/contract scope mismatch tests in `packages/kernel/test/boundary-validation.test.js:171` and assurance boundary reference cases in `packages/kernel/test/kernel-assurance-campaign.test.js:929`. | The kernel models already-authorized selection provenance only; it does not prove external Trusted Configuration or deterministic Policy selection. That is Phase 1-bounded, not a blocker. |
| Evidence Contract -> Evidence Requirement | Contracts carry `requirementIds`, requirements carry `evidenceContractId`, and references are cross-checked both directions (`packages/contracts/src/index.d.ts:56`, `:64`; `packages/kernel/src/boundary-validation.js:185`, `:360`, `:390`). | Unknown requirement, undeclared requirement, duplicate requirement, and contract/reference tests in `packages/kernel/test/boundary-validation.test.js:133`, `:155`, plus generated boundary-reference cases. | Complete future Evidence Contract authority and digest protocol are not implemented. Phase 1 only needs synthetic in-memory contracts at the kernel boundary. |
| Evidence Requirement -> Observation | Requirements and Observations model target scope, observer identity/version, fact key, primitive expected/fact value, source input, ordering key, and limitations (`packages/contracts/src/index.d.ts:64`, `:78`; `packages/kernel/src/boundary-validation.js:220`, `:252`). Out-of-scope Observations are rejected before evaluation (`packages/kernel/src/boundary-validation.js:402`). | Observer mismatch, version mismatch, wrong fact key, limitations, primitive type, and out-of-scope Observation tests in `packages/kernel/test/kernel-vertical-slice.test.js:44`, `:56`, `:67`, `:79`, `:90`; boundary scope test at `packages/kernel/test/boundary-validation.test.js:646`. | Observation acquisition is not implemented; Phase 1 supplies synthetic Observations directly. |
| Observation -> Evidence satisfaction | `evaluateEvidenceSatisfaction` filters normalized Observations through `observationSatisfiesRequirement`, which requires no limitations, same target scope, same observer id/version, same fact key, and canonical JSON equality of fact value and expected value (`packages/kernel/src/evidence-satisfaction.js:22`, `:30`, `:99`). | Satisfied requirement, missing Observation, mismatch, limitations, primitive distinction, permutation, and generated primitive cases in `packages/kernel/test/kernel-vertical-slice.test.js:8`, `:19`, `:44`, `:79`, `:90`, `:199`, `:205`; `packages/kernel/test/kernel-assurance-campaign.test.js:269`. | Only `OBSERVATION_FACT_EQUALS` is implemented. That is the authorized narrow Phase 1 satisfaction rule. |
| Evidence satisfaction -> Rule | Evidence records are made per satisfied requirement (`packages/kernel/src/evidence-satisfaction.js:117`). `evaluateRules` evaluates normalized Rules after Evidence satisfaction by checking satisfied requirement ids (`packages/kernel/src/rule-evaluation.js:21`, `:22`, `:28`). | Rule denial tests in `packages/kernel/test/kernel-vertical-slice.test.js:101`, `:134`; Rule matrix cases in `packages/kernel/test/kernel-assurance-campaign.test.js:332`. | Policy runtime is not implemented; Rules are synthetic already-authorized inputs for Phase 1. |
| Rule -> Verdict reduction | Missing Evidence creates `REVISION_REQUIRED` candidates with the kernel-owned missing-Evidence reason (`packages/kernel/src/evidence-satisfaction.js:65`). Triggered denial Rules create `REJECTED` candidates preserving reason code and lineage (`packages/kernel/src/rule-evaluation.js:46`). Finalization adds an `ADMISSIBLE` candidate only when there are no non-admissible candidates (`packages/kernel/src/bundle-finalization.js:27`, `:135`). | Missing Evidence, Rule denial, and lower-precedence reason retention tests in `packages/kernel/test/kernel-vertical-slice.test.js:30`, `:101`, `:134`; reducer tests in `packages/kernel/test/verdict-reduction.test.js:7`, `:26`. | End-to-end `BLOCKED` is not created by unauthorized capability modeling; pure reducer coverage exercises `BLOCKED`. |
| Verdict reduction -> Evidence Bundle | `reduceVerdictCandidates` applies `BLOCKED > REJECTED > REVISION_REQUIRED > ADMISSIBLE` and retains sorted reason codes and lineage ids (`packages/kernel/src/verdict-reduction.js:8`, `:21`, `:41`). `finalizeEvidenceBundle` assembles bundle content, derives bundle identity from content excluding id, and deep-freezes the finalized bundle (`packages/kernel/src/bundle-finalization.js:27`, `:45`, `:66`, `:71`; `packages/kernel/src/deep-freeze.js:8`). | Bundle lineage, deterministic identity, non-mutation, post-evaluation isolation, and immutability tests in `packages/kernel/test/kernel-vertical-slice.test.js:165`, `:199`, `:242`, `:293`, `:304`, `:320`; `packages/kernel/test/immutability.test.js:8`; generated immutability and identity cases. | The final complete Evidence Bundle protocol is future work. The Phase 1 bundle intentionally records an empty `verificationReceipts` array. |

## Package And Export Inventory

Observed package manifests:

- `package.json`
- `packages/contracts/package.json`
- `packages/kernel/package.json`

Observed production package tree:

- `packages/contracts/src/index.js`
- `packages/contracts/src/index.d.ts`
- `packages/kernel/src/index.js`
- `packages/kernel/src/boundary-validation.js`
- `packages/kernel/src/normalization.js`
- `packages/kernel/src/canonical-json.js`
- `packages/kernel/src/evidence-satisfaction.js`
- `packages/kernel/src/rule-evaluation.js`
- `packages/kernel/src/verdict-reduction.js`
- `packages/kernel/src/bundle-finalization.js`
- `packages/kernel/src/deep-freeze.js`
- `packages/kernel/src/kernel-reason-codes.js`

No third production package or application layer was observed. `pnpm-workspace.yaml`
includes only `packages/*`, and the only package directories under `packages` are
`contracts` and `kernel`.

Public package exports:

- `@proofrail/contracts` exports only `"."`, with runtime default
  `./src/index.js` and types `./src/index.d.ts`.
- `@proofrail/kernel` exports only `"."`, with runtime default
  `./src/index.js`.

Runtime constants exported by `@proofrail/contracts`:

- `PHASE1_KERNEL_INPUT_SCHEMA_VERSION`
- `PHASE1_BUNDLE_SCHEMA_VERSION`
- `PHASE1_KERNEL_ENGINE_VERSION`
- `VERDICTS`
- `EVIDENCE_CONTRACT_SELECTION_PROVENANCE_SOURCES`
- `RULE_AUTHORITY_PROVENANCE_SOURCES`
- `EVIDENCE_SATISFACTION_KIND`
- `RULE_PREDICATES`
- `RULE_EFFECT_DENY`

Type-only contract exports include the Phase 1 structural shapes for
`Claim`, `EvidenceContract`, `EvidenceRequirement`, `Observation`, `Evidence`,
`Rule`, `Verdict`, `EvidenceLineage`, `VerdictCandidate`, `VerdictReduction`,
`EvidenceBundle`, and supporting provenance and primitive types.

Kernel public exports from `packages/kernel/src/index.js`:

- `KernelBoundaryError`
- `evaluateKernel`
- `evaluate` alias

Several kernel source modules export internal helpers for local tests and module
composition, but the package export map does not expose subpaths as public
package surface.

## Deterministic Invariant Review

| Invariant | Source-grounded observation | Test-grounded observation | Gate disposition |
| --- | --- | --- | --- |
| Evidence satisfaction is deterministic | Satisfaction is a pure comparison over modeled fields and canonical JSON primitive equality (`packages/kernel/src/evidence-satisfaction.js:99`). | Primitive distinction and mismatch tests cover no coercive equality; generated primitive cases cover null, booleans, strings, finite numbers, and negative zero. | Verified from source and tests. |
| Rule evaluation is deterministic | Rules are evaluated against a set of satisfied requirement ids and produce deterministic lineage/candidates (`packages/kernel/src/rule-evaluation.js:21`). | Rule matrix cases cover present/absent predicates, triggered and non-triggered paths. | Verified from source and tests. |
| Verdict precedence and reason retention | Reducer precedence is fixed and reason/lineage ids are unique sorted (`packages/kernel/src/verdict-reduction.js:8`, `:41`). | Unit and generated reference-oracle tests cover all non-empty canonical Verdict combinations and lower-precedence reason retention. | Verified from source and tests. |
| Bundle identity and lineage are deterministic | Identities use SHA-256 over canonical deterministic JSON; bundle id derives from bundle content excluding id (`packages/kernel/src/canonical-json.js:58`, `:67`; `packages/kernel/src/bundle-finalization.js:66`). | Stability across repeated/permuted input and Date/Math.random perturbation is tested. | Verified from source and tests. |
| Caller input is not mutated or frozen | Boundary clone and normalization create kernel-owned structures before evaluation (`packages/kernel/src/boundary-validation.js:41`, `:660`; `packages/kernel/src/normalization.js:9`). | Direct non-mutation/unfrozen tests cover representative inputs and both `evaluateKernel` and `evaluate`. | Verified from source and tests. |
| Finalized bundle is deeply immutable | `deepFreeze` recursively freezes finalized bundle records and arrays (`packages/kernel/src/deep-freeze.js:8`). | Reachable graph immutability tests cover `ADMISSIBLE`, `REVISION_REQUIRED`, and `REJECTED` bundles. | Verified from source and tests. |
| Claim is non-evidentiary | Claims are only declared and included in lineage; satisfaction uses Observations, not Claim statements (`packages/kernel/src/bundle-finalization.js:82`; `packages/kernel/src/evidence-satisfaction.js:99`). | Claim text cannot substitute for Observation facts in vertical-slice and assurance tests. | Verified from source and tests. |
| Observation scope enforcement | Observations outside selected contract/evaluation scopes are rejected (`packages/kernel/src/boundary-validation.js:402`). | Out-of-scope rejection and valid-scope unmatched Observation tests are present. | Verified from source and tests. |
| Inference-shaped authority fields are rejected | `modelConfidence`, `inferenceProposal`, and `proposedContent` are forbidden recursively in authoritative records and arrays (`packages/kernel/src/boundary-validation.js:9`, `:139`, `:467`, `:547`). | Boundary tests reject those fields on root, records, and arrays. | Verified from source and tests. |
| Reserved reason-code handling | `HARN_` Rule reason codes and the kernel-owned missing-Evidence reason are rejected for Rule effects (`packages/kernel/src/boundary-validation.js:314`, `:317`). | Boundary tests cover `HARN_`, reserved missing-Evidence reason, and normal `KERNEL_` Rule reason acceptance. | Verified from source and tests. |
| Malformed boundary rejection | Boundary rejects non-JSON values, accessors, symbols, non-enumerables, sparse arrays, non-ordinary arrays, proxies, cycles, Dates, Maps, Sets, functions, bigint, undefined, NaN, and Infinity before evaluation (`packages/kernel/src/boundary-validation.js:89`, `:428`, `:699`). | Boundary and generated campaign tests cover these malformed shapes and zero getter/proxy trap execution. | Verified from source and tests. |
| Repeated/permuted input stability | Normalization sorts unordered arrays and canonical serialization sorts object keys (`packages/kernel/src/normalization.js:10`, `:18`, `:28`, `:42`, `:58`; `packages/kernel/src/canonical-json.js:21`). | Repeated evaluation, permutation, and nested key-order tests produce equal bundles and stable ids. | Verified from source and tests. |

No real Phase 1 objective defect, forbidden integration, semantic drift, or
unverifiable required invariant was found in the reviewed source and tests.

## Forbidden-Surface Audit

Production source and package-manifest search covered the forbidden Phase 1
surfaces named by `PHASE1-GATE-001`: repository or filesystem inspection,
target-code execution, verification-command execution, child process use,
package-manager or build-tool execution, network clients, GitHub integration,
model-provider integration, Inference Zone implementation, current-time
dependence, randomness, UUID generation, environment-dependent authoritative
input, probabilistic confidence, and LLM judgment.

Production source imports observed:

- `packages/kernel/src/boundary-validation.js` imports `node:util` only for
  `types.isProxy` boundary rejection.
- `packages/kernel/src/canonical-json.js` imports `node:crypto` only for
  deterministic SHA-256 hashing of canonical content.
- Kernel modules import local kernel modules and `@proofrail/contracts`.
- Contracts source has no imports.

No production source hit was found for filesystem APIs, child processes,
network clients, GitHub clients, model providers, Inference Zone imports,
current-time APIs, randomness, UUID generation, `process.env`, host identity, or
environment-derived authoritative input.

Manifest observation:

- The root `package.json` contains repository governance scripts including
  `pnpm verify`; these are repository engineering harness controls, not
  Proofrail product runtime behavior.
- `@proofrail/kernel` depends only on `@proofrail/contracts` through a workspace
  dependency.
- `@proofrail/contracts` has no runtime dependency on kernel or later layers.

Test-only and governance-only Node utilities are present outside the production
kernel path, including governance validator filesystem access and committed
whitespace child-process helpers. These are repository engineering harness
mechanics, not Phase 1 authoritative product evaluation behavior.

## Known Gap Classification

Source: `docs/engineering/kernel-assurance-campaign.md:75`.

| Known Gap | Classification | Rationale |
| --- | --- | --- |
| Independent review | RECORD_DRIFT | Independent review is an external gate requirement. Its absence from Builder assurance is expected before this gate-preparation task and is not a source defect. |
| Product readiness | FUTURE_PHASE_GAP | Product readiness exceeds the Phase 1 synthetic kernel slice and is explicitly not claimed. |
| Phase 1 completion | RECORD_DRIFT | Phase 1 completion depends on independent gate decision and transition authority. Builder evidence cannot close it. |
| External reproducibility | FUTURE_PHASE_GAP | Environmental reproducibility is distinct from deterministic evaluation and requires future modeled environment inputs. |
| Complete Evidence Bundle protocol coverage | FUTURE_PHASE_GAP | The current bundle is a vertical-slice bundle with empty verification receipts; complete protocol coverage is future authorized work. |
| Repository inspection | FUTURE_PHASE_GAP | Phase 1 explicitly forbids repository inspection product behavior. Its absence is not a blocker. |
| Verification execution | FUTURE_PHASE_GAP | Phase 1 explicitly forbids product verification execution. Its absence is not a blocker. |
| Policy runtime | FUTURE_PHASE_GAP | Rules are synthetic already-authorized inputs in Phase 1; Policy runtime is future work. |
| Adapters | FUTURE_PHASE_GAP | Language adapters and Adapter Capability implementation are explicitly outside Phase 1. |
| Delivery integrations | FUTURE_PHASE_GAP | CLI, API, MCP, web, GitHub, SARIF, and other delivery surfaces are outside Phase 1. |
| Model-provider behavior | FUTURE_PHASE_GAP | Model providers and Inference Zone behavior are explicitly outside the authoritative path for Phase 1. |

No Known Gap is classified as `PHASE1_BLOCKER`.

## Stale Current-State Record Inventory

The following are transition candidates only. This task did not edit current
phase authority, README, or active plan text.

| Path | Assertion | Classification | Rationale |
| --- | --- | --- | --- |
| `README.md:17` | "This repository now contains an initial deterministic synthetic-input kernel vertical slice from `KERNEL-VS-001`. It is pending independent review..." | Potential stale current-state record | The implementation and later assurance work are present on current `origin/main`; final Phase 1 gate state still requires independent decision. |
| `README.md:64` | "Builder implementation exists on `phase1/kernel-vertical-slice-1` and is pending independent review." | Stale current-state record | The implementation was merged to main before this gate baseline; the branch-only statement no longer describes the exact reviewed baseline. |
| `docs/constitution/product-constitution.md:69` | "No product runtime, kernel implementation, contracts implementation, or Phase 1 vertical slice exists until implemented by a later authorized task. The next implementation task identity is `KERNEL-VS-001`..." | Stale current-state record | `KERNEL-VS-001` has been implemented and the Phase 1 kernel/contracts packages exist. Because this is authority-bearing, it is only recorded here for later authorized transition handling. |
| `docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md:5` | Active plan text references reviewed head `5d05fe7...` and `KERNEL-VS-CONV-003` pending review. | Stale current-state record | Current `origin/main` includes later kernel assurance hardening and the gate task baseline; the active plan has not been transitioned to the current gate state. |
| `docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md:82` | "`KERNEL-VS-001` should define focused tests..." | Potential stale current-state record | Focused and assurance tests now exist; wording is plan-forward rather than current-state. |
| `docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md:122` and `:124` | "First implementation task identity..." and "`KERNEL-VS-001` Builder implementation exists on the task branch..." | Stale current-state record | The first implementation task identity is historical; the branch-only pending-review statement is not current for the exact gate baseline. |

## Findings

| ID | Severity | Affected path or surface | Observation | Risk to the Phase 1 objective | Evidence | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| PHASE1-GATE-BR-001 | MEDIUM | `governance/tasks/PHASE1-GATE-001.json` | Initial `pnpm governance:check` failed because `review.expectation` used `independent_phase_1_gate_review_required`, while the schema requires `independent_review_required`. | Mechanical governance verification could not proceed, blocking gate evidence preparation. | Initial command exit 1 with `HARN_MTC_REVIEW_EXPECTATION_INVALID`; after minimal schema correction, `pnpm governance:check` exited 0. | FIXED in writable task-contract path without changing authority fields, scope, product semantics, or review reliance requirement. |
| PHASE1-GATE-BR-002 | LOW | README, Product Constitution current phase invariant, active Phase 1 plan | Several current-state records still describe pre-implementation or older branch-review states. | Independent reviewer could confuse stale record state with current exact-baseline source state if not inventoried. | Record-drift inventory above cites exact paths and assertions. | RECORDED_TRANSITION_CANDIDATE. Not remediated because this task forbids current phase authority, README, and plan edits. |

No open CRITICAL, HIGH, or MEDIUM Phase 1 source findings were identified.

## Mechanical Verification

Commands were run from the repository root on `phase1/phase-1-gate-1`.

| Command | Exit status | Bounded result |
| --- | --- | --- |
| `pnpm governance:check` before schema correction | 1 | Failed with `HARN_MTC_REVIEW_EXPECTATION_INVALID` for `governance/tasks/PHASE1-GATE-001.json`. |
| `pnpm governance:check` after schema correction | 0 | Mechanical Foundation governance checks completed. |
| `pnpm governance:check-json` | 0 | Foundation JSON validation output parsed as `VALID`. |
| `pnpm test:governance` | 0 | 37 tests, 0 failures, 0 skipped, 0 todo. |
| `pnpm typecheck:phase1` | 0 | `tsc -p tsconfig.json` completed. |
| `pnpm test:kernel` first run | 0 | 475 tests, 0 failures, 0 skipped, 0 todo. |
| `pnpm test:kernel` second run | 0 | 475 tests, 0 failures, 0 skipped, 0 todo. |
| `pnpm verify` | 0 | Governance checks, JSON verification, governance tests, typecheck, kernel tests, and `git diff --check` completed. Git reported a line-ending conversion warning for the modified task JSON, not a whitespace error. |
| `node scripts/validate-foundation.mjs` | 0 | Mechanical Foundation governance checks completed. |
| `node scripts/validate-foundation.mjs --format json` | 0 | JSON output was `{ "findings": [], "schemaVersion": "1", "status": "VALID" }`. |
| `node scripts/governance/verify-json-output.mjs` | 0 | Foundation JSON validation output parsed as `VALID`. |
| `git diff --check` | 0 | No whitespace errors; Git reported the same line-ending conversion warning for `governance/tasks/PHASE1-GATE-001.json`. |

## Deterministic Verify No-Mutation Comparison

This section is intentionally completed after the evidence and Builder review
drafts exist. The final recorded values are in
`docs/engineering/validation-evidence.md` under `PHASE1-GATE-001`.

Method:

- Tracked diff hash: `git diff --binary | git hash-object --stdin`
- Sorted status state: `git status --short | Sort-Object`
- Command under observation: `pnpm verify`

Recorded values:

```text
pre-tracked-diff-hash: 477fba44c3731fcf2d40be9695397297edf8abc7
post-tracked-diff-hash: 477fba44c3731fcf2d40be9695397297edf8abc7
pre-sorted-status:
 M docs/engineering/validation-evidence.md
 M governance/tasks/PHASE1-GATE-001.json
?? docs/engineering/phase-1-gate-evidence.md
?? docs/reviews/phase-1-gate-builder-review.md
post-sorted-status:
 M docs/engineering/validation-evidence.md
 M governance/tasks/PHASE1-GATE-001.json
?? docs/engineering/phase-1-gate-evidence.md
?? docs/reviews/phase-1-gate-builder-review.md
pnpm verify exit status: 0
```

Sequencing limitation: recording these values necessarily changes the tracked
diff after the measured `pnpm verify` run. The comparison is therefore evidence
that the observed `pnpm verify` command did not mutate the pre-existing tracked
diff or status state, not that this evidence append had already been present
before the measured run.

## Final Diff Boundary

Final diff inspection from `origin/main` to the prepared branch must remain
limited to `PHASE1-GATE-001` writable paths:

- `governance/tasks/PHASE1-GATE-001.json`
- `docs/engineering/phase-1-gate-evidence.md`
- `docs/engineering/validation-evidence.md`
- `docs/reviews/phase-1-gate-builder-review.md`

No production source, contracts, tests, current phase authority, product
semantics, Verdict semantics, Evidence authority classes, Trust semantics, or
canonical terminology is intentionally modified by this gate-preparation work.

## Known Limitations

- This is Builder evidence preparation, not independent review.
- This record does not claim Phase 1 closure, Phase 2 authorization, product
  readiness, or trusted release.
- This record does not create Proofrail product Evidence, a product Verdict, or
  an authoritative Evidence Bundle for this repository change.
- External reproducibility, repository inspection, verification execution,
  Policy runtime, adapters, delivery surfaces, model providers, and Inference
  Zone behavior remain outside Phase 1.

## Builder Status

`BUILDER_READY_FOR_INDEPENDENT_GATE`, subject to final diff verification,
commit, and push mechanics for the gate-preparation branch.
