# Known Debt

## Authority

This document records known debt and open risks. It is not a product roadmap, a Policy, a release decision, or an authoritative Proofrail Verdict.

## Classification Vocabulary

Statuses are `OPEN`, `PLANNED`, `IN_PROGRESS`, `MITIGATED`, `CLOSED`, and `ACCEPTED_RISK`.

Release classifications are:

- `BLOCKS_PUBLIC_RELEASE`: must be resolved or explicitly accepted before publishing general-use packages or distributions
- `BLOCKS_TRUSTED_RELEASE`: must be resolved or explicitly accepted before a future trusted release decision in the affected scope
- `DOES_NOT_BLOCK_RELEASE`: controlled debt that does not block the current bounded release scope
- `RESEARCH_ONLY`: evidence or automation work that is not a current release gate

An `OPEN` status does not automatically make an item release-blocking. The release classification and affected scope control that decision.

## Summary

| ID | Severity | Release classification | Owner | Target milestone | Status |
| --- | --- | --- | --- | --- | --- |
| DEBT-001 | High | `BLOCKS_PUBLIC_RELEASE` | Proofrail maintainers | Completed by PRODUCT-RC-001 | CLOSED |
| DEBT-002 | Medium | `DOES_NOT_BLOCK_RELEASE` | Proofrail maintainers | Completed by PRODUCT-HARDEN-001 | CLOSED |
| DEBT-003 | Low | `RESEARCH_ONLY` | Repository engineering | Completed by PRODUCT-HARDEN-001 | CLOSED |
| DEBT-004 | High | `BLOCKS_PUBLIC_RELEASE` | Proofrail maintainers | Completed for current implemented surfaces by PRODUCT-HARDEN-001 | CLOSED |
| DEBT-005 | Medium | `DOES_NOT_BLOCK_RELEASE` | Repository engineering | Completed by PRODUCT-HARDEN-001 | CLOSED |

## Debt Items

### DEBT-001: Product Runtime Reason-Code Registry

Status: CLOSED.

Severity: High.

Product impact: Consumers now have one documented registry for the Proofrail-owned machine-readable codes emitted by the current six-package product surface.

Release classification: `BLOCKS_PUBLIC_RELEASE`; this condition is cleared by the CLOSED status. DEBT-004 still independently blocks a general public release.

Owner: Proofrail maintainers.

Target milestone: Completed by `PRODUCT-RC-001`.

Dependencies: Satisfied by the externally supplied `PRODUCT-RC-001` authority, committed registry schema, registry, deterministic error reference, and CI drift guard.

Observation: `config/reason-codes/product-reason-codes.json` registers 45 unique current codes. `schemas/product/reason-code-registry.schema.json` closes the shape, and `docs/reference/reason-codes.md` is exact deterministic output from the registry. Foundation `HARN_` codes and Policy-owned Rule denial codes remain separate.

Risk: The AST guard deliberately recognizes the current supported machine-code emitter forms rather than claiming arbitrary semantic source analysis. A new production code form must extend the guard and its negative tests under a later authorized task.

Current control: `pnpm product:reason-codes` validates schema, exact sorted identities, source surfaces, deprecation replacement integrity, no-alias and HARN_ separation, active emission coverage, and reference equality. `pnpm test:product-reason-codes` exercises positive and fail-closed cases, and both run inside `pnpm verify`.

Exit criteria:

- The externally supplied contract, strict schema, product registry, and deterministic error reference are committed.
- Every currently emitted Proofrail-owned code is registered once and documented; Policy-owned Rule codes remain under Policy authority.
- Missing, malformed, duplicate, unsorted, aliased, HARN_-contaminated, dynamically uninspectable, surface-drifted, and invalidly deprecated cases fail closed in focused tests.

Verification: On the post-review retained implementation, `pnpm product:reason-codes`, 23 focused tests, exact error-reference equality, and the full `pnpm verify` passed.

### DEBT-002: Architecture Rules Are Only Partially Mechanically Enforced

Status: CLOSED.

Severity: Medium.

Product impact: The current six-package boundary is guarded, but future loading mechanisms or package classes could escape the narrow mechanical checks.

Release classification: `DOES_NOT_BLOCK_RELEASE` for the current bounded six-package scope.

Owner: Proofrail maintainers.

Target milestone: Completed by `PRODUCT-HARDEN-001`; any later package-surface expansion requires a new bounded update.

Dependencies: Satisfied for the retained six-package surface by `PRODUCT-HARDEN-001`.

Observation: `ARCH-BOUND-001`, `PRODUCT-RELEASE-001`, and `PRODUCT-HARDEN-001` provide a bounded repository engineering checker that freezes the exact current six-package classification, workspace dependency declarations and edges, Node import allowlist, relative package containment, and every loading form present in retained production source. The final hardening also guards the exact authorized `github.js` subprocess form and rejects newly in-scope disguised loading forms with synthetic negative cases.

Risk: General binding and data-flow resolution, generated code, `eval`, `new Function`, arbitrary aliasing, transitive dependencies, broader delivery-definition ownership, inference isolation, and future package classes remain outside this bounded static checker. Those are explicit nonclaims rather than uncovered current production loading forms; a new form must reopen or replace this debt under a new Machine Task Contract.

Current control: `pnpm architecture:check` and `pnpm test:architecture` run inside `pnpm verify`; future packages, workspace edges, or runtime import surfaces fail closed until an explicit Machine Task Contract and checker update records them. `governance/architecture-check-preparation.json` records the bounded partial state without redefining dependency authority.

Exit criteria:

- The checker covers every production loading form authorized for the expanded package surface.
- Synthetic negative cases demonstrate that each newly in-scope forbidden edge fails closed.
- Documentation states any remaining unenforced architecture semantics.

Verification: `pnpm architecture:check` passed; `pnpm test:architecture` reported 40 passed, 0 failed, and 2 Windows `EPERM` file-symlink construction skips; the full `pnpm verify` passed. Mutation evidence also showed that removing the exact subprocess path guard makes the focused architecture test fail.

### DEBT-003: Clean Agent Test Execution Evidence

Status: CLOSED.

Severity: Low.

Product impact: Repository instructions now have reproducible, exact-candidate Clean Agent onboarding evidence without converting agent claims into product authority.

Release classification: `RESEARCH_ONLY`.

Owner: Repository engineering.

Target milestone: Completed by `PRODUCT-HARDEN-001`.

Dependencies: Satisfied by the strict run-record schema, validator, two retained records, and separate fresh-context grading passes.

Observation: The historical first independently graded trial failed because authority-change preflight was not discovered; the historical convergence trial then passed and supported the Phase 0 Foundation Gate decision. Those trials remain unchanged. Separately, `PRODUCT-HARDEN-001` executed the same exact 68-byte task twice from clean worktrees at candidate `e7df25ff368b789158a673498a187d9124e1912d`, retained exact bounded outputs and observed metadata, and obtained `PASS` from distinct fresh-context graders on the same nine criteria.

Risk: The validator can recompute bytes, ordering, pair equality, stop consistency, and candidate ancestry, but it cannot cryptographically prove fresh-context declarations, internal reasoning, or grader independence. Raw child-session transcripts are not embedded in the bounded records.

Current control: [../engineering/clean-agent-test.md](../engineering/clean-agent-test.md) defines the protocol, `governance/clean-agent-test.json` records `executed_two_run_pass_retained`, and `pnpm clean-agent:validate` checks exactly two strict records without relying on a Builder summary.

Exit criteria:

- The protocol runs from a clean checkout without relying on conversation history.
- The run records its exact repository SHA, inputs, outputs, and grading evidence.
- A repeat run produces the same pass/fail interpretation under unchanged inputs.

Verification: `pnpm clean-agent:validate` reported `VALID`, `runCount: 2`, and no findings; the focused Clean Agent suite passed 13/13; the full `pnpm verify` passed.

### DEBT-004: Bounded Product Fixture Corpus

Status: CLOSED.

Severity: High.

Product impact: The current implemented six-package input boundaries now have deterministic positive, negative, malformed, and adversarial fixture coverage with explicit oracles.

Release classification: `BLOCKS_PUBLIC_RELEASE`; this condition is cleared for the current implemented surfaces by the CLOSED status. Unimplemented adapters, target execution, and Verification Receipts remain outside coverage and require separate release evidence if introduced.

Owner: Proofrail maintainers.

Target milestone: Completed for current implemented surfaces by `PRODUCT-HARDEN-001`.

Dependencies: Satisfied by the strict manifest schema, 41 checked-in synthetic fixtures, deterministic runner, and operation-aware coverage map.

Observation: `fixtures/product` contains 41 stable fixtures. Every exact implemented input-bearing operation and trust boundary has positive, negative, malformed, and adversarial classes; `contracts.constants` is the explicit no-input exception. Each manifest records its implemented operation, surface, trust boundary, synthetic provenance, digest, deterministic oracle, and limitations. The runner validates manifests before execution, rejects unsafe CLI argument shapes before spawning, rejects identity, operation, mapping, coverage-class, digest, and oracle drift, and processes fixtures in stable id order.

Risk: The corpus does not claim repository inspection, target execution, adapters, Verification Receipts, or future surfaces. New implemented boundaries must extend the coverage map and required classes before this closure can be carried forward.

Current control: `pnpm product:fixtures`, `pnpm product:fixture-inventory`, and `pnpm test:product-fixtures` run inside `pnpm verify`; [../reference/product-fixtures.md](../reference/product-fixtures.md) is generated deterministically from the committed manifests.

Exit criteria:

- A deterministic fixture runner executes checked-in positive and negative product fixtures.
- Implemented trust boundaries have adversarial cases with explicit oracles.
- Malformed, ambiguous, and unsupported inputs fail closed without weakened assertions or skips.

Verification: The product runner reported 41/41 `PASS`, generated inventory equality passed, and the focused suite passed 13/13. Absolute and relative outside-sentinel output attempts were rejected before spawn with sentinel bytes unchanged; cross-operation class borrowing also failed closed. A real duplicate-key mutation failed closed, and the full `pnpm verify` passed.

### DEBT-005: Product Fixture Inventory Separation

Status: CLOSED.

Severity: Medium.

Product impact: Readers can now distinguish repository-governance checks from exact product fixture coverage and its explicit nonclaims.

Release classification: `DOES_NOT_BLOCK_RELEASE`; the separation condition is cleared by the CLOSED status.

Owner: Repository engineering.

Target milestone: Completed by `PRODUCT-HARDEN-001`.

Dependencies: Satisfied with DEBT-004's bounded corpus closure.

Observation: Governance tests remain repository-engineering harness checks. The separate generated [product fixture inventory](../reference/product-fixtures.md) maps each current package export and CLI bin to an exact implemented surface, trust boundary, and fixture ids while naming `contracts.constants` as the no-input exception and leaving unimplemented surfaces uncovered.

Risk: Future work may overread governance test coverage as product reliability coverage.

Current control: Product fixtures have separate commands, schema, corpus, tests, and generated inventory. The inventory generator fails on stale bytes, ambiguous mappings, unimplemented claims, or coverage-class gaps, and `pnpm verify` runs governance and product-fixture stages separately.

Exit criteria:

- Product fixture suites are listed separately from governance harness tests.
- Coverage claims name the exact implemented product surfaces exercised by each suite.
- User-facing documentation does not present governance test counts as product reliability evidence.

Verification: `pnpm product:fixture-inventory` reported `PASS`, `pnpm test:product-fixtures` passed 9/9, and the full `pnpm verify` passed without presenting governance test counts as product reliability evidence.
