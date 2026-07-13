# Reliability

## Authority

This document is authoritative for reliability direction.

## Reliability Principles

Proofrail reliability depends on:

- deterministic evaluation from normalized authoritative inputs
- stable reason codes
- explicit capability negotiation
- traceable Evidence Lineage
- immutable finalized Evidence Bundles
- bounded execution authority
- honest representation of missing, unsupported, degraded, or contradictory inputs

## Current Phase

Current Phase 2 reliability evidence includes repository governance, complete-set exact LF checkout checks, the bounded six-package architecture guard, a 49-case deterministic product fixture corpus, its separate generated inventory, and two retained Clean Agent Test runs with matching independently graded interpretations. The fixture corpus covers positive, negative, malformed, and adversarial classes for every exact implemented input-bearing operation and trust boundary; `contracts.constants` is the explicit no-input exception. Spawned CLI fixture arguments are closed to exact input-only or runner-controlled staged-output shapes, receive no ambient host environment, and cannot select an arbitrary output path.

These controls exercise only the current six-package local and exact release paths. They do not inspect a target repository, execute target commands, create Verification Receipts, exercise adapters, or prove general product reliability, deployment readiness, trusted-release status, or a Proofrail product Verdict.

## Future Reliability Requirements

Future authorized runtime work should:

- extend the manifest coverage map and fixture classes whenever an implemented surface or trust boundary is added
- add target-execution, adapter, and Verification Receipt fixtures only when those product surfaces are separately authorized and implemented
- preserve deterministic ordering, bounded diagnostics, reason-code coverage, schema compatibility, and fail-closed architecture checks as the package surface evolves
- retain fresh evidence-based review and remediation without treating a Builder claim as acceptance

## Failure Honesty

Reliability includes refusing to make a determination when a valid determination cannot be made. `BLOCKED` is a legitimate outcome when authority, boundary, or prerequisite conditions prevent evaluation.

A negative, malformed, or adversarial product fixture passes only when the implemented surface produces its explicit expected deterministic rejection. That fixture result is not an acceptance of malformed input and does not widen product authority.
