# Contributing

Proofrail is currently in Phase 0: Foundation and Engineering Harness Bootstrap.

Contributions must preserve the principle:

> Claim is not evidence. Verify it.

## Current Scope

Phase 0 contributions may improve repository legibility, documentation authority, governance configuration, and whitelisted validation tooling. They must not implement Proofrail product runtime behavior.

Allowed executable work is limited to governance tooling such as required-file checks, terminology drift checks, Markdown link checks, documentation reference checks, governance configuration validation, generated governance projection checks, HARN_ harness reason-code checks, and repository engineering Machine Task Contract schema validation.

## Before Changing Files

Read [AGENTS.md](AGENTS.md), then read the authoritative documents relevant to the task. Do not rely on chat history as durable project authority.

If repository engineering work needs broader authority, capture that need in a Machine Task Contract or active plan rather than expanding silently. A Machine Task Contract does not authorize Proofrail product runtime execution or verdict authority.

## Verification

Run:

```bash
pnpm verify
```

The root validator remains `node scripts/validate-foundation.mjs`. Use `node scripts/validate-foundation.mjs --format json` when machine-readable Foundation harness output is needed.

Update [docs/engineering/validation-evidence.md](docs/engineering/validation-evidence.md) when validation evidence changes.

## Review Model

Builder self-review is useful but provisional. Independent review is required for foundation acceptance decisions.
