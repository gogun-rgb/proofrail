# Quality Bar

## Authority

This document is authoritative for general quality expectations.

## Current Quality Invariants

Proofrail documentation MUST be legible to a clean agent without chat history.

Authoritative definitions MUST have a single owning location. Other documents may link, summarize, or apply them, but must not redefine them incompatibly.

Normative claims MUST distinguish current invariant, future requirement, design direction, and open risk.

## Engineering Expectations

Future implementation work should be:

- deterministic where it affects authority
- covered by focused tests proportional to risk
- scoped by Machine Task Contracts
- reviewed independently when it affects authority boundaries
- free of hidden AI authority in verdict paths
- explicit about unsupported or degraded capability

## Documentation Expectations

Documentation should avoid marketing claims, duplicate authority, and implied implementation maturity.

When a document names a canonical concept normatively, it should use the canonical term from [../constitution/terminology.md](../constitution/terminology.md).