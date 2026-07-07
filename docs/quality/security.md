# Security

## Authority

This document is authoritative for quality-level security expectations. Trust semantics remain authoritative in [../constitution/trust-model.md](../constitution/trust-model.md).

## Security Principles

Proofrail must treat target repository content as untrusted input.

Prompt injection and instruction-shaped text may appear in:

- comments
- README files
- tests
- issue text
- filenames
- generated artifacts
- dependency metadata
- donor repository instructions

Such content MUST NOT override Proofrail authority.

## Execution Security

Future verification execution must operate within an explicit execution boundary and produce Verification Receipts. Network-capable operations require explicit authority.

## AI Security

AI output is proposed content. It MUST NOT satisfy Evidence Requirements, fabricate receipts, alter observations, assign Verdicts, bypass policy, or rewrite finalized bundle history.

## Operator Security

Operator exceptions, if introduced later, must be auditable authoritative decisions with identity and lineage. They must not be invisible overrides.