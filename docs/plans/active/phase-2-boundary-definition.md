# Phase 2 Boundary Definition

## Status

Boundary definition only. `PHASE2-BOUNDARY-001` prepared the next repository engineering boundary after Phase 1 closure.

This plan does not authorize Phase 2 implementation, product readiness, trusted release status, or a Proofrail product Verdict.

The narrowed current Phase 2 product focus is AI PR Evidence Gate under [phase-2-ai-pr-evidence-gate.md](phase-2-ai-pr-evidence-gate.md). That focus is an implementation roadmap direction for a practical evidence packet around AI-authored pull requests; it is not implementation authority by itself.

PR #14, if referenced as historical context, must not be treated as implementation authority, independent acceptance evidence, product readiness, trusted release status, or an authoritative Proofrail product Verdict for this narrowed focus.

## Phase 1 Carry-Forward

Phase 1 Deterministic Kernel Vertical Slice is closed for accepted source baseline `0616091da1a572a2ea3e457ed84dab8e32259f59` after independent Phase 1 Gate PASS.

The accepted Gate path is PR #12 / `PHASE1-GATE-002`, reviewed at head `b3724a8d7fdd71c0f8c68f9b98cfa45984a812a3` and merged as `6895a00ec0570fb90a53ebd12998197e526f9c4b`. Phase 1 closure records merged through PR #13 as `9b45aafe9ff42b47f7024baf1b4edc3f5db0bdc4`.

PR #11 / `PHASE1-GATE-001` remains blocked and closed historical context because of an MTC authority-procedure defect. It must not be reused as accepted evidence.

## Objective

Define the Phase 2 boundary before any Phase 2 implementation begins.

The boundary definition should answer:

- what the next repository engineering phase is called
- what problem the phase is allowed to address
- what surfaces remain prohibited
- what files or package areas a later implementation task may request
- what independent review must inspect before any merge
- what stop conditions prevent scope expansion

## Allowed Work in This Boundary Task

`PHASE2-BOUNDARY-001` may only:

- record Phase 2 Boundary Definition as the next repository engineering work
- create this boundary-only plan
- update current-state records in README.md and the Product Constitution
- preserve Phase 1 closure facts and product-boundary warnings
- define future implementation preconditions without granting implementation authority

## Forbidden Work in This Boundary Task

This task does not authorize:

- repository inspection behavior
- execution of target repository code
- verification execution behavior
- language adapters or adapter capability implementation
- CLI
- API
- MCP
- web
- GitHub integration
- SARIF export
- model provider behavior
- Inference Zone implementation
- LLM judgment in the authoritative path
- probabilistic confidence in the authoritative path
- network dependencies
- target repository package-manager or build-tool dependencies
- production package creation or modification
- product protocol changes
- Verdict semantic changes
- Evidence authority class changes
- Trust semantic changes
- canonical terminology changes
- generated governance projection changes
- CI, script, or test changes

## Future Implementation Preconditions

A later Phase 2 implementation task requires a separate valid Machine Task Contract committed before implementation edits.

That later contract must define:

- exact task identity
- exact baseline
- write scope
- read-only authority
- forbidden surfaces
- permitted package boundaries
- acceptance criteria
- required verification commands
- independent review requirements
- explicit stop conditions for scope expansion

A later implementation task must not treat this plan as implementation authority by itself.

## Product Boundary Preservation

Proofrail still does not contain a complete product runtime.

No repository text, Builder claim, test name, source comment, model output, or human convenience summary may become authoritative Evidence.

Passing tests are evidence, not authority.

Agent action is not an approved change and is not a trusted release.

## Independent Review Boundary

Independent review must verify that this PR:

- begins with committed `PHASE2-BOUNDARY-001`
- changes only the authorized files
- does not implement Phase 2 behavior
- does not authorize product readiness or trusted release status
- preserves Phase 1 closure facts
- preserves all prohibited product surfaces
- requires a later valid Machine Task Contract before implementation

## Stop Conditions

Stop instead of expanding scope if the task requires:

- implementation outside boundary-definition records
- changes to product semantics, Trust, Verdicts, Evidence authority, or canonical terminology
- production code, contract, test, script, CI, generated projection, or package manifest edits
- repository inspection, verification execution, adapters, delivery surfaces, model provider behavior, or Inference Zone work
- treating the boundary plan as sufficient implementation authority
- any cost, billing, credential, paid cloud, or SaaS prompt
- local long-run or Codex limit exhaustion
