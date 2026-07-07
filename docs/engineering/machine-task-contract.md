# Machine Task Contract

## Authority

This document is authoritative for the proposed Machine Task Contract format.

## Purpose

A Machine Task Contract makes task scope, authority, verification, and stop conditions explicit enough that silent task expansion becomes detectable.

It is an engineering harness governance artifact for work on the Proofrail repository. It is not Proofrail product runtime authority.

## Format Direction

Machine Task Contracts should be authored as YAML or JSON using the same structural fields. The schema artifact in [../../governance/machine-task-contract.schema.json](../../governance/machine-task-contract.schema.json) captures the Phase 0 draft shape.

FND-MECH-001 mechanically validates committed JSON Machine Task Contracts under `governance/tasks` with Ajv. YAML remains a documented format direction, but YAML task contracts are not mechanically validated in this phase and no YAML parsing dependency is introduced.

## Required Sections

```yaml
task:
  id: ADAPTER-PY-014
  class: bounded_implementation
  objective: Detect pytest test symbols.

scope:
  write:
    - packages/adapters/python/**
    - fixtures/python/**
  forbidden:
    - packages/kernel/**
    - packages/contracts/**

authority:
  read:
    - docs/protocols/adapter-protocol.md
    - docs/architecture/dependency-rules.md
  mayChangeAuthority: false

acceptance:
  requirements:
    - pytest functions beginning with test_ are discovered.
    - deterministic output ordering is preserved.

verification:
  commands:
    - pnpm test --filter adapter-python
    - pnpm architecture:check

requiredArtifacts:
  - implementation
  - tests
  - fixture

stopConditions:
  - adapter protocol change required
  - trust boundary unclear
  - authoritative schema change required outside scope

review:
  expectation: independent_review_required
  reviewerMustNotRelyOnBuilderClaim: true
```

## Field Semantics

| Field | Meaning |
| --- | --- |
| `task.id` | Stable task identifier. |
| `task.class` | Task category, such as documentation, bounded implementation, mechanization, review, or convergence. |
| `task.objective` | Single task objective. |
| `scope.write` | Paths the task may modify. |
| `scope.read_only_authority` | Authority paths the task may read but must not modify. |
| `scope.forbidden` | Paths or concepts the task must not modify. |
| `authority.read` | Authoritative documents the agent must read before acting. |
| `authority.mayChangeAuthority` | Whether the task is allowed to modify authority-bearing docs or schemas. |
| `authority.mayChangeProductSemantics` | Whether the task may change Proofrail product semantics when a task needs that boundary stated explicitly. |
| `acceptance.requirements` | Reviewable requirements for the task. |
| `verification.commands` | Commands expected for self-checks. |
| `verification.requiredInvariants` | Verification invariants expected in addition to command execution. |
| `requiredArtifacts` | Required output artifact categories. |
| `stopConditions` | Conditions that require stopping instead of expanding scope. |
| `review` | Independent review expectations. |

## Rules

A task contract MUST identify writable and forbidden scope.

A task contract MUST identify authoritative documents to read.

A task contract MUST define stop conditions.

A task contract SHOULD separate acceptance requirements from verification commands.

A task contract MUST NOT authorize an agent to assign its own authoritative Verdict.

A Machine Task Contract MUST NOT authorize Proofrail product target repository execution, Evidence Contract selection, Policy selection, Evidence Requirement satisfaction, Evidence creation, or Verdict authority.

Future Proofrail product verification execution authority must derive from Trusted Configuration and applicable deterministic Policy-defined execution boundaries.

Evidence Contract authority and selection must derive from Trusted Configuration or deterministic Policy selection.

The Phase 0 schema MUST enforce `review.expectation` as exactly `independent_review_required` and `review.reviewerMustNotRelyOnBuilderClaim` as exactly `true`.
