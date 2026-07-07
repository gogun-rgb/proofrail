# Policy Schema Foundation

## Authority

This document is authoritative for Phase 0 policy protocol direction.

## Current Phase

No policy runtime, policy evaluator, or authoritative product policy schema is implemented in Phase 0.

## Policy as Code Direction

Proofrail is expected to support policy as code.

Policy evaluation must be:

- deterministic
- versioned
- traceable to trusted configuration
- explainable through stable machine-readable reason codes
- independent of free-form AI judgment

## Distinctions

### Policy

A Policy is a versioned deterministic governance artifact selected through trusted configuration. It declares which Rules and Evidence Requirements apply.

### Rule

A Rule is a deterministic policy unit that evaluates declared inputs and emits stable reason codes.

### Evidence Requirement

An Evidence Requirement is a required condition that must be satisfied by Evidence before or during policy evaluation.

Policy may contain or select Rules. Rules may reference Evidence Requirements. Evidence Requirements are not Rules, and Rules are not Evidence.

## Versioning Direction

Future policies should declare:

- policy identity
- policy version
- schema version
- applicable scope
- selected Evidence Contracts or Evidence Requirements
- Rules and reason-code namespace
- compatibility constraints

## Prohibited Policy Design

Policies MUST NOT rely on model confidence, natural-language persuasion, or human assertions as deterministic authority.

AI may draft a policy proposal only as an Inference Proposal. That proposal is not trusted configuration until accepted through a future authorized path.