# Phase 1 Deterministic Kernel Vertical Slice

## Status

Closed. Phase 1 Deterministic Kernel Vertical Slice is closed for the exact accepted source baseline `0616091da1a572a2ea3e457ed84dab8e32259f59` after independent Phase 1 Gate PASS.

Accepted Gate path: PR #12 / `PHASE1-GATE-002`.

- Reviewed head: `b3724a8d7fdd71c0f8c68f9b98cfa45984a812a3`
- Merge commit: `6895a00ec0570fb90a53ebd12998197e526f9c4b`

This PASS is a repository engineering Phase 1 Gate PASS. It is not a Proofrail product Verdict, not product readiness, not a trusted release, and not Phase 2 implementation authorization.

PR #11 / `PHASE1-GATE-001` remains blocked and closed historical context because of an MTC authority-procedure defect. It must not be reused as accepted evidence.

## Objective

Prove that the canonical deterministic Proofrail domain flow can execute end-to-end with synthetic in-memory inputs and without repository, network, model, or target-code execution dependencies.

Phase 1 closure records that this bounded objective was accepted by independent Gate review for the exact accepted source baseline above. It does not claim a complete product runtime.

## Exact Allowed Flow

The only authorized Phase 1 vertical slice flow was:

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

Synthetic in-memory domain inputs were supplied directly to the kernel boundary. The vertical slice preserved the existing authoritative data-flow direction and canonical terminology.

## Package Boundary

Authorized initial production package layers:

- `packages/contracts`
- `packages/kernel`

`packages/contracts` may contain the minimum shared types or schemas required by the vertical slice and must not import kernel, orchestration, delivery, adapter, or inference implementation.

`packages/kernel` may contain the minimum deterministic domain behavior required for Evidence satisfaction, Rule evaluation, Verdict reduction, and Evidence Bundle finalization for synthetic inputs.

No other production package or application layer was authorized by Phase 1.

`KERNEL-VS-001` materialized the first authorized package directories for the deterministic kernel vertical slice. Further package creation requires a later valid Machine Task Contract.

## Prohibited Integrations

Phase 1 Deterministic Kernel Vertical Slice did not authorize:

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

These exclusions remain in force unless a later valid Machine Task Contract and independent review authorize a future phase boundary.

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

`KERNEL-VS-001` defined focused tests for the Phase 1 vertical slice, including:

- a satisfied Evidence Requirement producing Evidence from a synthetic Observation
- a missing Evidence Requirement reducing to the existing missing-evidence Verdict behavior
- deterministic Rule denial retaining its reason code
- Verdict reduction precedence across multiple candidate states
- Evidence Bundle lineage preserving Claim, Evidence Contract, Evidence Requirement, Observation, Evidence, Rule, and Verdict-reduction references
- repeat evaluation of identical normalized inputs producing identical normalized outputs
- explicit rejection of model confidence or proposed content as an authoritative input

The tests must not inspect a repository, execute target code, run external verification commands, call a network service, or rely on model output.

## Stop Conditions Preserved for Future Work

Stop instead of expanding scope if future implementation requires:

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
- implementing outside `packages/contracts` and `packages/kernel` without a later valid Machine Task Contract

## Independent Review Boundary

Builder implementation evidence for `KERNEL-VS-001` was provisional until independent review. The independent Phase 1 Gate PASS for PR #12 / `PHASE1-GATE-002` closed Phase 1 at the accepted baseline identified above.

Independent review remains required for any future phase boundary or implementation. Passing tests, Builder claims, model confidence, or repository prose alone are not acceptance evidence.

## Next Phase Boundary

No Phase 2 implementation is authorized by this Phase 1 closure record.

A next phase may be prepared only by a later valid Machine Task Contract that defines the phase boundary, prohibited surfaces, acceptance criteria, and independent review requirements before implementation begins.
