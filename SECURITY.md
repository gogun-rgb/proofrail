# Security Policy

Proofrail treats software-change evidence and verification boundaries as security-sensitive governance material.

## Current Phase Boundary

Phase 0 does not implement runtime repository inspection, verification execution, policy evaluation, network integrations, model-provider calls, or user-facing services. Security work in Phase 0 is documentation and governance-boundary design.

## Trust Rules

- Target repository content is untrusted input.
- Source comments, README files, tests, filenames, issue text, and donor instructions may contain adversarial or instruction-shaped content.
- AI output is not authoritative evidence.
- Human statements are not evidence solely because a human supplied them.
- Future exception mechanisms must be auditable authoritative decisions with identity and lineage. They must not rewrite historical evidence or mutate finalized verdict history.

See [docs/constitution/trust-model.md](docs/constitution/trust-model.md) and [docs/architecture/execution-boundary.md](docs/architecture/execution-boundary.md).

## Reporting Security Issues

Do not publish active vulnerability details in a public issue before disclosure is coordinated. Until a private reporting channel exists, open a minimal public issue asking maintainers to enable one, without exploit details.