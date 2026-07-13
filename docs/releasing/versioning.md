# Versioning

## Current Strategy

Proofrail uses Semantic Versioning syntax for repository and package release metadata. During the current private pre-release stage, the root and all six workspace package manifests use one fixed version: `0.2.0-rc.1`.

All workspace packages remain `private: true`. A manifest version change does not publish a package, create a Git tag or GitHub Release, approve a trusted release, or establish product readiness.

## Version Kinds

The following identifiers are deliberately independent:

| Kind | Example | Meaning |
| --- | --- | --- |
| Product and package metadata | `0.2.0-rc.1` | Private workspace pre-release identity |
| Project phase | Phase 2 | Current implementation and planning boundary |
| Schema version | `proofrail.evidence-bundle.phase1.v1` | Shape and interpretation of a canonical document |
| Kernel engine version | `0.1.0-phase1` | Runtime engine identity emitted by the accepted kernel |
| Configuration or contract version | `1.0.0` | Version declared inside a specific supplied authority document |
| Machine Task Contract ID | `PRODUCT-RELEASE-002` | Repository engineering task identity, not a product version |

Changing package metadata must not silently rewrite schema, engine, configuration, contract, golden-byte, or task identifiers.

## Compatibility Rules

- A breaking public schema or CLI contract change requires an explicit compatibility decision and, once a stable public release exists, a major version change.
- A backward-compatible optional public field or capability requires at least a minor version change.
- A behavior-preserving fix normally requires a patch version change.
- Canonical JSON or golden-byte changes require an explicit release note and the authority applicable to the affected schema or protocol.
- Project phase transitions are documentation and governance events; phase names do not belong in package versions.
- Pre-1.0 status does not waive migration notes or compatibility review for consumers.

## Release Boundary

The current version is repository metadata only. Publication requires a separately authorized release process that defines artifacts, registry or binary targets, tags, provenance, compatibility evidence, and release authority.
