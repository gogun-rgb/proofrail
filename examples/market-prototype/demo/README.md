# Market prototype demo

This directory is a deterministic consumer fixture for the public prototype. The checked-in configuration selects the `docs-only` preset and runs one bounded `git diff --check` command.

The caller workflow in `.github/workflows/proofrail.yml` is the same reusable-workflow shape documented for external repositories. Copy the directory contents into a repository you control, keep `.proofrail/config.yml` on the base branch, and open a pull request to exercise the workflow. The workflow publishes the automatic GitHub Actions job check, Step Summary, and `proofrail-evidence` artifact. A live run remains fail-closed unless the authority-approved runner attestation is present; see [the installation guide](../../../docs/getting-started/installation.md).
