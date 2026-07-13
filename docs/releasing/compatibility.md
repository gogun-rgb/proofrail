# Compatibility

## Supported Toolchain

The repository declares and verifies the following development toolchain:

- Node.js 24 in GitHub Actions
- pnpm 11.7.0 through the root `packageManager` field
- Git for source and exact-byte checks
- GitHub CLI only for the optional bounded live PR collector

The canonical install and verification commands are:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

## Platform Evidence

Ubuntu on the current GitHub-hosted runner is the continuously verified CI platform.

Native Windows is supported for repository development and the documented PowerShell-compatible commands. Exact-byte authority JSON and golden files are forced to LF through `.gitattributes`, including with `core.autocrlf=true`. Tests that require symbolic-link privileges may report explicit Windows permission skips; those skips do not represent executed symlink coverage.

macOS is not currently a CI matrix target. Compatibility is expected from the Node.js implementation but is not continuously verified, so it must not be reported as an evidenced support guarantee.

## Product and Package Boundary

All workspace packages are private and no npm compatibility promise is currently published. The supported behavior is the checked-in repository workflow at an exact commit, not a registry distribution.

Schema, protocol, configuration, Policy, Evidence Contract, kernel engine, and package versions are independent. Consumers must use each document's own version and digest rather than infer compatibility from the root package version.

## Current Runtime Limitations

Compatibility does not imply target execution support. Proofrail currently does not checkout a target repository, execute target commands, provide adapters, or create Verification Receipts in the fixed release-candidate workflow.
