# Agent Experience

## Authority

This document is authoritative for autonomous-agent-facing product expectations.

## Agent Role

Agents may submit claims, task context, evidence candidates, verification receipts when authorized, and remediation attempts.

Agents may not directly assign authoritative verdict authority to themselves.

## Required Future Machine Feedback

Future Proofrail responses for agents should identify:

- Verdict
- stable reason codes
- missing Evidence Requirements
- contradictory Evidence
- malformed input
- unsupported Adapter Capability
- degraded Adapter Capability
- allowed next transitions
- remediation-relevant deterministic context
- required new evaluation or superseding bundle conditions

## Prohibited Agent Operations

There must never be an agent operation equivalent to:

- `mark_pass`
- `force_admissible`
- `ignore_missing_evidence`
- `fabricate_receipt`
- `trust_my_claim`

Agents may add inputs. They may not grant themselves admissibility.

## Error Shape Direction

Agent-facing failures should be machine-readable first and explainable second. Human-readable text may help, but it must not be the only carrier of state.