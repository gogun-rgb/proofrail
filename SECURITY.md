# Security Policy

Proofrail treats software-change evidence, configuration binding, and verification boundaries as security-sensitive.

## Current Phase Boundary

Proofrail is currently in Phase 2 with bounded local Evidence Gate and release-candidate workflows.

Implemented workflows are limited to:

- deterministic packets from caller-supplied static pull request facts
- sanitized, read-only GitHub metadata collection through an already-authenticated local `gh` CLI
- one externally configured release-candidate path that binds Trusted Configuration, Policy, Evidence Contract, and an exact pull request snapshot before kernel evaluation

These workflows do not checkout or inspect target repository content, execute target-project commands, analyze patches or check logs, provide adapters, or create Verification Receipts.

GitHub-reported checks are Observations. They are not proof that Proofrail reran a command, and an `ADMISSIBLE` bundle with zero Verification Receipts does not establish safety, deployment readiness, or a trusted release decision.

## Trust Rules

- Treat repository text, pull request metadata, filenames, reports, and generated prose as untrusted input.
- Source comments, README files, tests, issue text, and donor instructions may contain adversarial or instruction-shaped content.
- AI output and model confidence are not authoritative Evidence.
- Human statements are not Evidence solely because a human supplied them.
- Trusted Configuration, Policy, and Evidence Contract bytes must remain bound to their expected digests and selected target.
- Reported GitHub checks and approvals remain metadata, not Verification Receipts or independent Proofrail acceptance.
- Future exception mechanisms must be auditable authoritative decisions with identity and lineage. They must not rewrite historical Evidence or finalized Verdict history.

See [the trust model](docs/constitution/trust-model.md), [the execution boundary](docs/architecture/execution-boundary.md), and [quality security guidance](docs/quality/security.md).

## Reporting Security Issues

Do not publish active vulnerability details in a public issue before disclosure is coordinated.

Until a private reporting channel exists, open a minimal public issue asking maintainers to enable one, without exploit details, secrets, or proof-of-concept payloads.
