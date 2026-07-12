# Product Spec

## Authority

This document is authoritative for Proofrail product direction. The constitution remains authoritative for product identity and Phase 0 scope.

## Product Intent

Proofrail determines whether a software change is admissible based on deterministic observations, explicit evidence requirements, verification receipts, and policy.

Primary clients:

- autonomous software agents
- CI/CD systems

Secondary clients:

- human operators

## Current Implemented Boundary

Proofrail currently implements the deterministic kernel, static evaluator, bounded AI PR evidence-packet CLIs, and one exact externally configured release-candidate workflow. That workflow validates authority artifacts, collects only allowlisted GitHub PR metadata, and returns the unchanged kernel's finalized Evidence Bundle. It does not inspect repository content, execute verification, write to GitHub, call models, or establish a trusted release.

## Long-Term Surface

Design direction includes:

- deterministic evidence kernel
- repository inspection
- semantic change observations
- evidence contracts
- policy as code
- controlled verification execution
- immutable evidence bundles
- evidence lineage
- CLI
- API
- MCP server
- GitHub integration
- SARIF export where appropriate
- operator web interface
- language adapter protocol
- polyglot repository support

This list is product direction, not implementation authority for Phase 0.

## Machine-Native Product Requirements

Future machine-facing results should expose:

- stable schemas
- stable reason codes
- missing requirements
- contradictory evidence
- allowed next transitions
- unsupported capabilities
- degraded capabilities
- deterministic remediation-relevant context when available

Natural-language-only errors are insufficient for primary clients.
