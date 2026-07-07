# Phase 0 Convergence Builder Review

## Authority

This is a Builder convergence review for externally supplied independent governor findings. It is not independent acceptance.

Independent verdict supplied for commit `155908893a027e434925b93e9b0e91661975a433`: `REVISION_REQUIRED`.

## Machine Task Contract Reference Classification

Repository-wide search terms: `Machine Task Contract`, `Machine Task Contracts`, `task contract`, `Task Contract`, and `task-contract`.

Classifications after remediation:

| Location | Classification | Result |
| --- | --- | --- |
| `AGENTS.md` Authority Map and Task Routing | engineering governance | Clarified as repository engineering task contracts and linked fixture strategy. |
| `README.md` Phase 0 Verification | engineering governance | Describes governance verifier only. |
| `CONTRIBUTING.md` Current Scope and Before Changing Files | engineering governance | Clarifies repository engineering scope and no product runtime authority. |
| `governance/foundation.config.json` required documents and schema pointer | engineering governance | Required-document and schema governance only. |
| `docs/engineering/machine-task-contract.md` | engineering governance | Explicitly forbids product runtime authority. |
| `docs/engineering/donor-archaeology.md` | engineering governance | Donor inspection remains repository engineering work authorized by task contract. |
| `docs/constitution/product-constitution.md` Documentation Authority Index | engineering governance | Clarified as bounded repository engineering task format. |
| `docs/quality/quality-bar.md` Engineering Expectations | engineering governance | Scopes future repository implementation work. |
| `docs/quality/foundation-gate.md` Harness Gate | engineering governance | Harness format and schema artifact only. |
| `docs/architecture/domain-map.md` Current Invariant | engineering governance | Clarified as later repository engineering tasks only. |
| `docs/architecture/execution-boundary.md` Future Product Verification Execution | improper product authority before remediation | Removed Machine Task Contract as product verification execution authority. |
| `docs/constitution/terminology.md` Evidence Contract authority | improper product authority before remediation | Removed task-contract-based Evidence Contract selection authority. |

## Findings

| Finding ID | Original severity | Affected authoritative documents | Remediation performed | Exact changed locations | Validation method | Disposition |
| --- | --- | --- | --- | --- | --- | --- |
| FND-DOM-001 | P1 | `docs/constitution/terminology.md`, `docs/architecture/data-flow.md`, `docs/protocols/evidence-schema.md` | Closed Evidence satisfaction inputs to Observations and Verification Receipts. Required future input classes to use explicit terminology and protocol revision. | `terminology.md` Evidence; `data-flow.md` Authoritative Path; `evidence-schema.md` Evidence Path | Search for open deterministic-input escape language and foundation validation | REMEDIATED |
| FND-ARC-001 | P1 | `docs/architecture/execution-boundary.md`, `docs/constitution/terminology.md`, `docs/constitution/trust-model.md`, `docs/engineering/machine-task-contract.md`, `docs/architecture/domain-map.md`, `CONTRIBUTING.md` | Separated Machine Task Contract from product runtime authority. Product verification execution now derives from Trusted Configuration and deterministic Policy-defined boundaries. Evidence Contract selection derives from Trusted Configuration or deterministic Policy selection. | `execution-boundary.md` Future Product Verification Execution; `terminology.md` Evidence Contract; `trust-model.md` Trusted Configuration; `machine-task-contract.md` Purpose and Rules; `domain-map.md` Current Invariant; `CONTRIBUTING.md` Before Changing Files | Repository-wide Machine Task Contract reference search and foundation validation | REMEDIATED |
| FND-HAR-001 | P1 | `docs/engineering/fixture-strategy.md`, `docs/quality/foundation-gate.md`, `docs/quality/reliability.md`, `docs/plans/active/foundation-gate-mechanization.md`, `docs/plans/debt.md`, `AGENTS.md`, `governance/foundation.config.json` | Created fixture strategy without implementing fixtures. Added fixture strategy to required documents, authority routing, Foundation Gate, reliability, active plan, and known debt. | `fixture-strategy.md` all sections; `foundation-gate.md` Harness Gate; `reliability.md` Current Phase and Future Reliability Requirements; `foundation-gate-mechanization.md` Mechanically Verifiable Gate and Future Executable Gate; `debt.md` DEBT-004; `AGENTS.md` Authority Map and Task Routing; `foundation.config.json` requiredDocuments | Required document validation and direct inspection of fixture strategy headings | REMEDIATED |
| FND-VRD-001 | P1 | `docs/product/verdict-semantics.md`, `docs/architecture/data-flow.md`, `docs/protocols/evidence-schema.md` | Defined deterministic raw-condition classification and normalized Verdict precedence `BLOCKED > REJECTED > REVISION_REQUIRED > ADMISSIBLE`. Required preservation of reason codes and Evidence Lineage. | `verdict-semantics.md` Condition Mapping and Verdict Reduction | Search for ambiguous condition mappings, verdict vocabulary inspection, and foundation validation | REMEDIATED |
| FND-GOV-001 | P2 | `governance/machine-task-contract.schema.json`, `scripts/validate-foundation.mjs`, `docs/engineering/machine-task-contract.md`, `docs/engineering/validation-evidence.md` | Hardened schema with review constants and updated validator to check constant values instead of field presence only. | `machine-task-contract.schema.json` review properties; `validate-foundation.mjs` validateSchema; `machine-task-contract.md` Rules; `validation-evidence.md` Required-Document and Governance Validation | `node scripts/validate-foundation.mjs` and direct schema/validator inspection | REMEDIATED |

## Builder Assessment

All externally supplied findings are remediated in this convergence branch according to Builder self-checks. This review is not independent acceptance.
