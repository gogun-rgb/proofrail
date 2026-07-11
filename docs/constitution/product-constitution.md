# Product Constitution

## Authority

This document is authoritative for Proofrail product identity, constitutional precedence, and current phase scope.

If this document conflicts with another repository document, this document has precedence unless the conflict is explicitly documented here. If two constitutional documents irreconcilably conflict, the agent MUST stop and report `BLOCKED`.

## Product Identity

Proofrail is an evidence control plane for autonomous software changes.

Primary product statement:

> AI can write the code. Proofrail determines whether the change is admissible.

Core product principle:

> Claim is not evidence. Verify it.

Primary clients are autonomous software agents and CI/CD systems. Human operators are secondary clients who need readable, low-cognitive-load operational understanding.

Proofrail is machine-native first.

## Non-Negotiable Product Boundaries

Proofrail is not an AI code reviewer, chat application, code quality scoring tool, AI confidence system, or LLM-based approval engine.

Proofrail MUST NOT use LLM judgment in the authoritative verdict path. AI inference MAY exist only inside the isolated Inference Zone defined by [../architecture/inference-boundary.md](../architecture/inference-boundary.md).

Authoritative verdicts MUST be deterministic and traceable to observations, evidence requirements, verification receipts, policies, and rules.

The authoritative verdict vocabulary is:

- `ADMISSIBLE`
- `REVISION_REQUIRED`
- `REJECTED`
- `BLOCKED`

No additional authoritative verdict state may be added without documenting a constitutional conflict and stopping for external review.

## Current Phase Invariant

Phase 0 is closed for the exact Foundation baseline `7865ea299f98b3fd0158d1486272f73468b345ac` after external independent Foundation Gate PASS. That PASS is a repository engineering review decision, not a Proofrail product Verdict.

Phase 1 Deterministic Kernel Vertical Slice is closed for the exact accepted source baseline `0616091da1a572a2ea3e457ed84dab8e32259f59` after independent Phase 1 Gate PASS. The accepted Gate path is PR #12 / `PHASE1-GATE-002`, reviewed at head `b3724a8d7fdd71c0f8c68f9b98cfa45984a812a3` and merged as `6895a00ec0570fb90a53ebd12998197e526f9c4b`. Phase 1 closure records merged through PR #13 as `9b45aafe9ff42b47f7024baf1b4edc3f5db0bdc4`.

The Phase 1 Gate PASS is a repository engineering decision. It is not a Proofrail product Verdict, not product readiness, not a trusted release, and not authorization to implement Phase 2.

PR #11 / `PHASE1-GATE-001` remains blocked and closed historical context because of an MTC authority-procedure defect. It MUST NOT be reused as accepted evidence.

The closed Phase 1 slice covers only the synthetic-input deterministic vertical slice through:

```text
Claim
  -> Evidence Contract
  -> Evidence Requirement
  -> Observation
  -> Evidence satisfaction
  -> Rule
  -> Verdict reduction
  -> Evidence Bundle
```

Phase 1 inputs were synthetic in-memory domain inputs supplied directly to the kernel boundary. The Phase 1 closure means the repository engineering Gate accepted the bounded deterministic kernel vertical-slice baseline; it does not establish external trust, repository inspection, verification execution, or delivery behavior.

Phase 1 preserved the existing authoritative data-flow direction and canonical terminology. It did not change Verdict semantics, Evidence authority classes, or Trust semantics.

Phase 1 production package scope was limited to the minimum layers required by the vertical slice: `packages/contracts` and `packages/kernel`.

The current product focus is Phase 2 AI PR Evidence Gate. Its implemented local slices separate claims, observed evidence, missing evidence, scope, and review needs; `PRODUCT-RELEASE-001` additionally binds separately supplied Trusted Configuration, Policy, and Evidence Contract bytes to one exact read-only GitHub snapshot and unchanged-kernel evaluation. This remains bounded product runtime, not product readiness, trusted release status, external acceptance, or a release decision.

Proofrail still does not authorize or contain repository inspection, execution of target repository code, verification execution, language adapters, Python path traversal detection, CLI, API, MCP, web, GitHub integration, SARIF export, model provider integration, Inference Zone implementation, LLM judgment, probabilistic confidence in the authoritative path, complete Evidence Bundle protocol completion, or complete product Verdict runtime behavior.

Any future implementation after this focus narrowing requires a later valid Machine Task Contract and independent review. `PRODUCT-FOCUS-001` is not product readiness, not a trusted release, and not a Proofrail product Verdict.

## Documentation Authority Index

| Topic | Authoritative location | Notes |
| --- | --- | --- |
| Product identity | This document | Other documents may quote or summarize only. |
| Core beliefs | [core-beliefs.md](core-beliefs.md) | Philosophical basis, not protocol syntax. |
| Non-goals | [non-goals.md](non-goals.md) | Authoritative exclusions and overclaim controls. |
| Canonical terminology | [terminology.md](terminology.md) | New normative terms must be added there first. |
| Trust semantics | [trust-model.md](trust-model.md) | Authority classes and trust boundaries. |
| Verdict semantics | [../product/verdict-semantics.md](../product/verdict-semantics.md) | Deterministic outcome semantics and transitions. |
| Dependency rules | [../architecture/dependency-rules.md](../architecture/dependency-rules.md) | Allowed and forbidden dependency directions. |
| Inference authority | [../architecture/inference-boundary.md](../architecture/inference-boundary.md) | Isolated inference boundary. |
| Execution authority | [../architecture/execution-boundary.md](../architecture/execution-boundary.md) | Verification environment and execution controls. |
| Protocol direction | [../protocols/evidence-schema.md](../protocols/evidence-schema.md), [../protocols/adapter-protocol.md](../protocols/adapter-protocol.md), [../protocols/policy-schema.md](../protocols/policy-schema.md), [../protocols/bundle-format.md](../protocols/bundle-format.md) | Design foundation only in Phase 0. |
| Quality gates | [../quality/foundation-gate.md](../quality/foundation-gate.md) | Review criteria and future Clean Agent Test. |
| Machine Task Contracts | [../engineering/machine-task-contract.md](../engineering/machine-task-contract.md) | Bounded repository engineering task format; not product runtime authority. |
| Fixture strategy | [../engineering/fixture-strategy.md](../engineering/fixture-strategy.md) | Phase 0 harness fixture strategy; no fixtures are implemented. |
| Donor Archaeology | [../engineering/donor-archaeology.md](../engineering/donor-archaeology.md) | Process only in Phase 0. |

AGENTS.md is an operational map. It is not more authoritative than the documents it links to.

## Normative Vocabulary

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` are normative when used in authoritative documents.

Documents MUST distinguish current invariant, future requirement, design direction, and open risk.

Aspirational product direction MUST NOT be presented as current implemented behavior.
