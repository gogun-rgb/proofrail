# Phase 1 Deterministic Kernel Vertical Slice

## Status

Active Phase 1 plan. `KERNEL-VS-001` Builder implementation exists on the task branch. The independent governor returned `REVISION_REQUIRED` for reviewed head `5d05fe7e89f576860912afb35a102b2cc9f529ac`, independently confirmed the prior `KVS-BND-001`, `KVS-RSN-001`, `KVS-SCOPE-001`, `KVS-BND-002`, and `KVS-BND-003` remediations at that reviewed head, and supplied `KVS-BND-004` for a third convergence pass. `KERNEL-VS-CONV-003` Builder convergence remediation is pending independent review.

This status does not close Phase 1, claim Phase 1 PASS, claim product readiness, or claim independent acceptance.

## Objective

Prove that the canonical deterministic Proofrail domain flow can execute end-to-end with synthetic in-memory inputs and without repository, network, model, or target-code execution dependencies.

## Exact Allowed Flow

The only authorized Phase 1 vertical slice flow is:

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

Synthetic in-memory domain inputs must be supplied directly to the kernel boundary. The vertical slice must preserve the existing authoritative data-flow direction and canonical terminology.

## Package Boundary

Authorized initial production package layers:

- `packages/contracts`
- `packages/kernel`

`packages/contracts` may contain the minimum shared types or schemas required by the vertical slice and must not import kernel, orchestration, delivery, adapter, or inference implementation.

`packages/kernel` may contain the minimum deterministic domain behavior required for Evidence satisfaction, Rule evaluation, Verdict reduction, and Evidence Bundle finalization for synthetic inputs.

No other production package or application layer is authorized by this transition task.

`KERNEL-VS-001` materializes the first authorized package directories for the deterministic kernel vertical slice. Further package creation requires a later valid Machine Task Contract.

## Prohibited Integrations

Phase 1 Deterministic Kernel Vertical Slice does not authorize:

- repository inspection
- execution of target repository code
- verification execution
- language adapters
- Python path traversal detection
- CLI
- API
- MCP
- web
- GitHub integration
- SARIF export
- model provider integration
- Inference Zone implementation
- LLM judgment in the authoritative path
- probabilistic confidence in the authoritative path
- network dependencies
- target repository package-manager or build-tool dependencies

## Deterministic Invariants

- Canonical terminology remains unchanged unless a later authorized task changes terminology through the terminology authority path.
- Verdict semantics and Verdict reduction remain unchanged.
- Evidence authority classes and Trust semantics remain unchanged.
- Evidence satisfaction inputs for this slice are synthetic Observations supplied at the kernel boundary.
- A Claim has no evidentiary authority by itself.
- Evidence must satisfy an Evidence Requirement through deterministic evaluation of authorized inputs.
- Rule outputs must be stable and traceable to declared inputs.
- Verdict reduction must be deterministic and preserve reason and lineage information needed to reproduce the outcome.
- Evidence Bundle finalization must preserve the conceptual immutability boundary.
- No LLM output, model confidence, repository prose, source comments, tests, filenames, or donor instructions may become authoritative Evidence.

## Expected Tests

`KERNEL-VS-001` should define focused tests for:

- a satisfied Evidence Requirement producing Evidence from a synthetic Observation
- a missing Evidence Requirement reducing to the existing missing-evidence Verdict behavior
- a deterministic Rule denial retaining its reason code
- Verdict reduction precedence across multiple candidate states
- Evidence Bundle lineage preserving Claim, Evidence Contract, Evidence Requirement, Observation, Evidence, Rule, and Verdict-reduction references
- repeat evaluation of identical normalized inputs producing identical normalized outputs
- explicit rejection of model confidence or proposed content as an authoritative input

The tests must not inspect a repository, execute target code, run external verification commands, call a network service, or rely on model output.

## Stop Conditions

Stop instead of expanding scope if implementation requires:

- canonical terminology changes
- Verdict semantic changes
- Evidence authority class changes
- Trust semantic changes
- repository inspection
- target-code execution
- verification execution
- adapter capability modeling or language adapter implementation
- Python path traversal detection
- CLI, API, MCP, web, GitHub, SARIF, model provider, or Inference Zone work
- new external dependencies not authorized by the implementing Machine Task Contract
- treating a Machine Task Contract as product runtime Trusted Configuration
- treating Builder claim, test names, source comments, repository prose, or model output as Evidence
- weakening Authority-Change Preflight
- implementing outside `packages/contracts` and `packages/kernel`

## Independent Review Boundary

Builder implementation evidence for `KERNEL-VS-001` will be provisional. Independent review must not rely on Builder claim, model confidence, or passing tests alone as acceptance evidence.

The reviewer should confirm that the vertical slice preserves canonical terms, Verdict reduction semantics, Trust semantics, Evidence authority classes, data-flow direction, dependency direction, and prohibited integration boundaries.

## Next Implementation Task

First implementation task identity: `KERNEL-VS-001`.

`KERNEL-VS-001` Builder implementation exists on the task branch. `KERNEL-VS-CONV-003` convergence remediation is pending independent review and does not claim Phase 1 completion or independent acceptance.
