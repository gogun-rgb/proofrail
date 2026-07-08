# Machine Task Contract

## Authority

This document is authoritative for the proposed Machine Task Contract format.

## Purpose

A Machine Task Contract makes task scope, authority, verification, and stop conditions explicit enough that silent task expansion becomes detectable.

It is an engineering harness governance artifact for work on the Proofrail repository. It is not Proofrail product runtime authority.

## Autonomous Execution Default

A valid Machine Task Contract is a boundary and acceptance artifact, not an implementation script. It defines trust, scope, authority, acceptance, verification, required artifacts, stop conditions, and independent review expectations for repository engineering work.

Within granted authority, agents SHOULD autonomously choose work order, writable files within `scope.write`, implementation strategy, test design, verification sequencing, failure diagnosis, retry, rollback of task-local reversible changes, and remediation. Agents SHOULD NOT request human approval for ordinary reversible implementation choices that the contract already authorizes.

When Builder findings or independent review findings require remediation, agents SHOULD prefer autonomous convergence loops if an applicable convergence contract grants the needed scope and authority. Human escalation is reserved for product-direction ambiguity, irreversible external actions, material cost or resource commitment, security exceptions, authority conflicts, or repeated autonomous-loop deadlock.

Higher risk SHOULD normally increase evidence requirements and independent review depth before reducing agent autonomy. Autonomous execution does not weaken authority-change preflight, self-grant prevention, independent review requirements, or product runtime authority separation. Agent action is not an approved change, an approved repository change is not a trusted release, and autonomous remediation does not grant release or acceptance authority.

## Authority-Change Use

For repository engineering work, locating the correct authoritative document is not permission to modify it. A task that touches an authority-bearing target needs edit authority before the edit occurs.

Authority-bearing targets include at minimum:

- documents that declare themselves authoritative
- documents selected by the Product Constitution Documentation Authority Index as authoritative locations
- authority-bearing governance schemas when applicable

A plain imperative request, such as asking to add a deterministic observation specification, is bounded task input. It is not, by itself, an authority-change grant.

Before editing an authority-bearing target, an agent MUST perform an authority-change preflight and answer:

1. What is the target path?
2. Why is the target authority-bearing?
3. What Machine Task Contract identifies the current task?
4. Does `scope.write` authorize the target path?
5. Is the target excluded by `scope.read_only_authority`?
6. Is the target excluded by `scope.forbidden`?
7. Is `authority.mayChangeAuthority` exactly `true`?
8. Does the task objective or acceptance scope actually cover the authority-bearing change?

An agent MUST stop before editing an authority-bearing target when no current Machine Task Contract is explicitly identified, the contract cannot be resolved, the contract is invalid, the target is not writable under `scope.write`, the target is read-only authority, the target is forbidden, `authority.mayChangeAuthority` is `false`, authority is ambiguous, or the requested authority change exceeds the task objective or acceptance scope.

The stop is a repository engineering task status. The agent may report `BLOCKED` according to repository engineering stop guidance, but the status MUST NOT be presented as an authoritative Proofrail product Verdict.

Successful verification cannot retroactively grant missing authority. A later `pnpm verify` exit 0, a passing governance check, or recorded validation evidence does not authorize an edit that lacked authority before it was made.

An agent MUST NOT self-author authority by turning a plain natural-language request into a new permissive Machine Task Contract, setting `authority.mayChangeAuthority` to `true`, and then treating that self-authored contract as authority to modify authoritative documents.

Authority-changing work may proceed only when one of these is true:

- an applicable committed Machine Task Contract already identifies the task and grants the required authority
- external task input explicitly supplies a complete Machine Task Contract, including task identity, scope, authority, acceptance, verification, stop conditions, and independent review boundary

When external task input explicitly supplies a complete Machine Task Contract, the Builder may materialize that supplied contract as the first task artifact before other authorized edits. Materializing externally supplied authority is not the same as inventing or widening authority.

An agent MUST NOT widen `scope.write`, remove read-only authority, weaken `scope.forbidden`, or change `authority.mayChangeAuthority` from `false` to `true` merely to make a requested edit possible.

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
  mayChangeProductSemantics: false

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
| `authority.mayChangeProductSemantics` | Whether the task may change Proofrail product semantics. |
| `acceptance.requirements` | Reviewable requirements for the task. |
| `verification.commands` | Commands expected for self-checks. |
| `verification.requiredInvariants` | Verification invariants expected in addition to command execution. |
| `requiredArtifacts` | Required output artifact categories. |
| `stopConditions` | Conditions that require stopping instead of expanding scope. |
| `review` | Independent review expectations. |

## Rules

A task contract MUST identify writable and forbidden scope.

A task contract MUST identify authoritative documents to read.

A task contract MUST explicitly state both `authority.mayChangeAuthority` and `authority.mayChangeProductSemantics`.

A task contract MUST define stop conditions.

A task contract SHOULD separate acceptance requirements from verification commands.

A task contract MUST NOT authorize an agent to assign its own authoritative Verdict.

A Machine Task Contract MUST NOT authorize Proofrail product target repository execution, Evidence Contract selection, Policy selection, Evidence Requirement satisfaction, Evidence creation, or Verdict authority.

Future Proofrail product verification execution authority must derive from Trusted Configuration and applicable deterministic Policy-defined execution boundaries.

Evidence Contract authority and selection must derive from Trusted Configuration or deterministic Policy selection.

The Phase 0 schema MUST enforce `review.expectation` as exactly `independent_review_required` and `review.reviewerMustNotRelyOnBuilderClaim` as exactly `true`.
