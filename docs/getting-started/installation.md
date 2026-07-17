# Install the bounded market prototype

`PRODUCT-MARKET-001` is a public, reusable GitHub Actions workflow for the bounded Proofrail prototype. It is intended for a repository owner who wants to evaluate an AI-authored pull request without installing Node.js, pnpm, or the GitHub CLI locally.

This is a prototype surface, not a hosted service, GitHub App, Marketplace listing, trusted release, deployment decision, or general Proofrail product Verdict. The workflow uses the base branch configuration, checks out the exact pull-request base and head SHAs, executes only the configured bounded commands, and retains a canonical Evidence Bundle.

## 1. Add the base-branch configuration

Commit this file on the pull request's base branch as `.proofrail/config.yml`. The called workflow always loads this exact base version; a pull request cannot relax its own verification policy.

```yaml
version: 1
preset: typescript-basic

telemetry:
# Optional explicit opt-out. The preset default is enabled: true.
  enabled: false
```

The selected `typescript-basic` preset has a fixed, authority-selected command sequence: a 10-minute `pnpm install --frozen-lockfile`, followed by 10-minute `pnpm typecheck` and `pnpm test` commands. The `ai-pr-strict` preset uses the same bounded frozen install before lint, typecheck, test, and build. A base configuration may only select a preset or make permitted values stricter; it cannot replace those command identities or add credentials. Dependencies fail closed if the frozen lockfile cannot be satisfied.

All presets enable artifact-local telemetry by default. It records no network transmission (`networkTransmission: false`) and does not grant network or credential access. The `enabled: false` value above is the explicit opt-out when that local artifact metadata is not wanted. Do not put credentials or secret values in the file.

## 2. Add the caller workflow

Create `.github/workflows/proofrail.yml` in the same repository. The ref below is a full reviewed commit SHA, so a rerun cannot silently move to a different Proofrail workflow.

```yaml
name: Proofrail

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: read
  checks: read
  statuses: read

jobs:
  proofrail:
    name: Proofrail
    uses: gogun-rgb/proofrail/.github/workflows/proofrail.yml@332969ce635a0a818072a6c45ecaf8288c76f0f0
    with:
      config-path: .proofrail/config.yml
      strict: true
    permissions:
      contents: read
      pull-requests: read
      checks: read
      statuses: read
```

The caller only needs GitHub Actions. The reusable workflow installs Node.js and pnpm on its own runner and uses the token only for the read-only metadata collection step. It does not request a personal token, secret, local `gh` login, or API key.

## 3. Read the result

Each successful evaluation writes:

If the runner fails closed before an Evidence Bundle can be evaluated, a fresh output directory retains failure.json and an actionable summary.md in the same artifact instead. That packet is delivery evidence only, not a product Verdict.

- a Step Summary with the Verdict, exact head SHA, reason codes, and receipt status;
- `proofrail-evidence/evidence-bundle.json`, `summary.md`, and `telemetry.json` in the `proofrail-evidence` artifact.

`ADMISSIBLE` means the selected Policy and Evidence Contract were satisfied for the exact target, observations, and Proofrail Verification Receipts in that bundle. It is not a promise that the change is correct, secure, deployable, or approved for a trusted release. In strict mode every non-`ADMISSIBLE` result fails the workflow.

The `Proofrail` job is shown by GitHub as the workflow's automatic job check. The current authority is read-only for GitHub: the prototype publishes the Step Summary and artifact through the workflow, but it does not create or mutate a separate GitHub Check Run, review, label, merge, release, or deployment.

## Troubleshooting and known limits

- `BLOCKED_EXECUTION_BOUNDARY` means the runner did not provide the authority-approved `GITHUB_HOSTED_LINUX_SANDBOX_V1` isolation attestation. Proofrail fails closed rather than inventing one. The current repository does not ship a separate attestation provider.
- `PRF_STALE_TARGET` means the pull-request head changed during or after verification. Start a new run for the new head.
- `PRF_SCOPE_PATH_NOT_ALLOWED` means a changed path is outside the base configuration's allowed scope or matches a denied pattern.
- A target command failure produces a `VERIFICATION_COMMAND_FAILED` reason and a receipt with the bounded exit status, stream digests, and redacted previews.

The workflow intentionally does not provide complete VM or sandbox isolation, arbitrary repository inspection, patch or file-content analysis, network credentials, GitHub writes, an API, an MCP server, a hosted retention service, or model-based judgment. These limits are part of the current `PRODUCT-MARKET-001` contract and must not be read as product readiness or trusted-release authority.

The local deterministic fixture is under `examples/market-prototype/demo`. The implementation boundary is the sequence of read-only GitHub collection, exact base/head checkout, base-configuration loading, bounded verification, canonical Verification Receipts, deterministic kernel evaluation, and artifact/Step Summary publication described above. See [the market prototype guide](market-prototype.md) for the capability boundary and explicit exclusions.
