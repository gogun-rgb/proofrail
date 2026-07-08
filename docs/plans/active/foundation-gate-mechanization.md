# FOUNDATION GATE MECHANIZATION

## Status

Historical completed Foundation work retained at this path because current governance validation still requires this active-plan artifact.

Foundation Mechanization integrated successfully at the Foundation baseline.

Agent Legibility convergence completed through `FND-LEG-001` and PR #3 after the first independently graded Clean Agent Test trial exposed an authority-change preflight failure.

External independent review reported Agent Legibility Gate PASS, Clean Agent Test PASS, and Foundation Gate PASS for baseline `7865ea299f98b3fd0158d1486272f73468b345ac`.

Foundation Gate PASS is a repository engineering review decision, not a Proofrail product Verdict.

## Objective

Convert mechanically verifiable parts of the Foundation Gate into repository checks and CI-ready validation without claiming that conceptual quality can be fully automated.

Task ID: `FND-MECH-001`.

Branch: `foundation/gate-mechanization-1`.

This plan is retained as historical completed Foundation provenance. Builder work did not independently close the Foundation Gate or replace independent review.

## Agent Legibility Convergence State

The first independently graded Clean Agent Test trial used this exact bounded task input:

```text
Add a deterministic observation specification for lockfile changes.
```

The externally supplied finding for that trial is `FND-LEG-001`, classified as `AUTHORITY_CHANGE_PREFLIGHT_NOT_DISCOVERED`.

Known observed trial evidence is limited to:

- exact bounded task input
- tested agent final response supplied to the independent grader
- reported target files
- reported verification result
- absence of a new remote Proofrail commit or pull request
- local test edits were restored before convergence

The restored local trial diff was not independently inspected.

The second independently graded Clean Agent Test trial used the same bounded input and passed after the tested agent:

- identified the intended protocol layer
- identified authority-bearing protocol targets
- identified that no exact-task Machine Task Contract was supplied
- inspected nearest committed contract `FND-MECH-001`
- determined writable scope was insufficient
- determined protocol targets were read-only authority
- determined objective and acceptance scope did not authorize the requested protocol change
- treated `authority.mayChangeAuthority: true` as insufficient by itself
- stopped before editing
- made no file changes
- did not use verification or validation evidence as retroactive authority

The external independent decision, not Builder claim, closed Foundation Gate acceptance for the exact baseline above.

## Historical Implementation Plan

1. Create the committed Machine Task Contract instance, Foundation config schema, and HARN_ harness reason-code registry.
2. Refactor `scripts/validate-foundation.mjs` into modular governance validation while keeping the root command stable.
3. Add Ajv-backed JSON Schema validation for Foundation config and committed JSON Machine Task Contracts.
4. Generate deterministic governance projections for canonical terminology, canonical Verdict values, and the Documentation Authority Index.
5. Fail governance checks when committed generated projections are stale.
6. Add exact-set canonical terminology and canonical Verdict drift checks from authoritative document structure.
7. Add Documentation Authority Index and AGENTS.md authority-route validation without creating a second hand-maintained authority map.
8. Add synthetic Node `node:test` governance tests for deterministic output and required negative cases.
9. Add Clean Agent Test protocol artifacts and architecture-check preparation artifacts without claiming execution or enforcement.
10. Synchronize Foundation Gate, verification guidance, validation evidence, known debt, and Builder review documentation.
11. Run the required verification commands, confirm no-mutation invariants, commit, push, and open a PR for independent review.

## Mechanically Verifiable Gate

Expected future work includes:

- required documentation checks
- documentation authority index validation
- canonical terminology drift checks
- Markdown/reference checks
- reason-code registry validation
- fixture strategy presence and reference validation
- Machine Task Contract validation
- architecture rule encoding preparation

## Independently Reviewable Gate

The following require independent judgment:

- conceptual coherence
- authority precedence clarity
- hidden AI authority risks
- architecture leakage risks
- whether a clean agent can work without oral history

## Future Executable Gate

Later implementation phases may add:

- package dependency boundary checks
- fixture-based tests derived from `docs/engineering/fixture-strategy.md`
- adversarial fixture tests derived from `docs/engineering/fixture-strategy.md`
- protocol schema compatibility tests
- Clean Agent Test protocol execution

## Stop Conditions

Stop if mechanization requires implementing Proofrail runtime behavior, changing authoritative product identity, or treating automated checks as independent acceptance.
