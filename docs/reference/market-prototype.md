# PRODUCT-MARKET-001 reference

## Capability boundary

The market prototype is a narrow delivery path composed of the following stages:

```text
GitHub pull-request event
        ↓
bounded read-only metadata collector
        ↓
exact base and head checkout
        ↓
base-branch configuration loader
        ↓
bounded verification runner
        ↓
Verification Receipts
        ↓
release orchestrator
        ↓
deterministic market kernel
        ↓
Evidence Bundle + Step Summary + artifact
```

The base and head identities, configuration lineage, changed paths, reviews, reported checks, receipt lineage, and final head re-read are retained as distinct records. Builder prose, GitHub check text, and model confidence never satisfy a requirement by themselves.

## Inputs and outputs

The trusted runtime authority selects the base configuration path `.proofrail/config.yml`, the allowed presets, the exact target binding, command count and timeout bounds, filtered environment names, and the canonical output format. The base configuration selects a preset and may provide scope, command, review, reported-check, output, and local telemetry settings.

The output directory contains only canonical LF JSON and Markdown files:

```text
proofrail-output/
├── evidence-bundle.json
├── summary.md
└── telemetry.json
```

The Evidence Bundle contains the exact repository, pull-request number, base SHA, head SHA, authority lineage, observations, receipts, scope result, policy conditions, reason codes, Verdict, and artifact digest. Raw stdout and stderr are never retained; the runner records stream digests and bounded redacted previews.

## Verdict semantics

| Verdict | Meaning in this bounded path |
| --- | --- |
| `ADMISSIBLE` | All selected evidence requirements are satisfied for the exact target and receipt lineage. |
| `REVISION_REQUIRED` | A verification, review, reported-check, or other required evidence condition is unsatisfied. |
| `REJECTED` | A denied scope path or untrusted policy change is present. |
| `BLOCKED` | Authority, target identity, execution boundary, or required capability is unavailable. |

These are deterministic product Verdicts for the recorded evaluation only. They are not repository engineering review decisions, trusted release decisions, deployment authorization, or safety guarantees.

## Security boundary

- The control token is available only to the read-only GitHub collector and is removed from the target command environment.
- Fork pull requests receive no secrets from the workflow.
- The base configuration is loaded from the exact base checkout, not from the pull-request head.
- Shell identity, checkout identity, worktree stability, changed-path containment, output publication, command count, command timeout, total timeout, output bytes, process-tree termination, and dependency-lockfile identity are bounded and fail closed.
- The current runtime authority denies GitHub writes, model execution, and credential persistence.
- The accepted runner backend name is `GITHUB_HOSTED_LINUX_SANDBOX_V1`; absence of an explicit attestation yields `BLOCKED_EXECUTION_BOUNDARY` rather than a fabricated receipt.

These controls are application-level boundaries for the current prototype. They are not a complete VM or operating-system sandbox and do not prove arbitrary target code is safe.

## Local verification

The checked-in fixtures exercise the success, stale-target, failed-command, timeout, output-limit, scope, token-isolation, path-alias, and output-publication paths:

```bash
pnpm test:market
pnpm test:public-site
pnpm verify
```

The live GitHub collector requires the runner's read-only `GH_TOKEN` context. The local importer uses an already-authenticated `gh` CLI, while the reusable workflow handles collection inside GitHub Actions and does not require local tool installation.

## Explicit exclusions

The prototype does not implement a hosted service, GitHub App, Marketplace publication, Check Run writes, review or merge writes, API, MCP, SARIF export, language adapters, model providers, LLM judgment, complete sandbox or VM isolation, arbitrary repository inspection, patch analysis, secret storage, billing, long-term retention, or automatic deployment.
