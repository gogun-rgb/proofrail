# Contributing

Proofrail is currently in Phase 2. Contributions must preserve the principle:

> Claim is not evidence. Verify it.

## Current Scope

The mechanically guarded production surface contains six packages:

- `contracts`
- `kernel`
- `trusted-config`
- `release-orchestrator`
- `evidence-gate`
- `static-evaluator`

Documentation, tests, examples, and bounded maintenance changes are welcome when they preserve the current trust and execution boundaries. New packages, workspace edges, product runtime behavior, or changes to authority-bearing semantics require an applicable Machine Task Contract and the authority-change preflight described in [AGENTS.md](AGENTS.md).

Current Phase 2 workflows do not authorize target checkout, repository-content inspection, target command execution, adapters, broader delivery surfaces, model-provider behavior, or Inference Zone implementation.

## Before Changing Files

1. Read [AGENTS.md](AGENTS.md).
2. Read only the authoritative documents routed for the kind of change you intend to make.
3. Check the current worktree and preserve unrelated user changes.
4. Keep the diff limited to the acceptance requirements.

Do not use chat history, Builder summaries, passing tests, or repository prose as authority to widen scope.

## Verification

Run focused tests for the affected subsystem while developing. Before handing off a change that spans documentation state, package metadata, CI, or production behavior, run:

```bash
pnpm verify
```

The root validator remains `node scripts/validate-foundation.mjs`. Use `node scripts/validate-foundation.mjs --format json` when machine-readable Foundation harness output is needed.

`pnpm verify` includes a no-argument `git diff --check` for the local workspace diff. CI separately validates the committed pull request or push range before running the same verifier.

Update [docs/engineering/validation-evidence.md](docs/engineering/validation-evidence.md) only when the task requires a durable evidence record; do not append boilerplate for every small change.

## Review Model

The default repository engineering review is evidence-based self-review. It must be a fresh second pass separated from implementation assumptions, even when the same agent, operator, or GitHub account performs both roles.

A compliant review must:

- reread the final retained diff from the beginning
- compare the diff with scope and acceptance requirements
- run or directly inspect the required verification results
- check for weakened tests, validation bypasses, and hidden scope expansion
- record verification results and remaining limitations
- avoid approving from the Builder summary, model confidence, or a completion claim alone

A separate human reviewer or stable reviewer identity is required only when an authoritative policy or the user's task-specific instruction explicitly requires one. The absence of another reviewer identity does not by itself block ordinary work, publication, or release decisions.
