# Product Constitution

## Authority

This document is authoritative for Proofrail product identity, constitutional precedence, and Phase 0 scope.

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

Phase 0 establishes repository knowledge, governance boundaries, architecture direction, protocol foundations, and engineering harness strategy.

Phase 0 MUST NOT implement the product kernel, repository inspection, verification execution, policy evaluation, adapters, CLI, API, server, MCP server, web application, GitHub integration, or production package placeholders pretending those systems exist.

Executable code is forbidden by default except for Phase 0 governance tooling explicitly allowed by this task.

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
