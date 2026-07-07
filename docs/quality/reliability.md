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

Phase 0 reliability work is limited to repository legibility and governance validation. No runtime reliability is claimed.

## Future Reliability Requirements

Future runtime work should define:

- fixture strategy
- adversarial fixture strategy
- deterministic ordering requirements
- reason-code registry checks
- schema compatibility checks
- architecture dependency checks
- convergence remediation loops after independent review

## Failure Honesty

Reliability includes refusing to make a determination when a valid determination cannot be made. `BLOCKED` is a legitimate outcome when authority, boundary, or prerequisite conditions prevent evaluation.