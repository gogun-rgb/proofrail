# Evidence Schema Foundation

## Authority

This document is authoritative for Phase 0 evidence protocol direction. It is not an implemented runtime schema.

## Current Phase

No authoritative Proofrail product protocol schema is implemented in Phase 0. This document records the conceptual foundation for later schema work.

## Evidence Path

Evidence must connect:

- Evidence Requirement identity
- accepted Observation or Verification Receipt inputs
- deterministic satisfaction rule
- scope
- source lineage
- reason codes where applicable
- evaluation identity

Evidence does not exist because a Claim was made. Evidence exists only when an authorized deterministic path establishes that a requirement has been satisfied.

For Phase 0, the Evidence satisfaction input set is closed to Observations and Verification Receipts. Deterministic values, digests, parser results, repository text, filenames, and other records must be modeled through an authorized Observation or Verification Receipt before they can support Evidence. A future additional authoritative input class requires an explicit terminology and evidence protocol revision.

## Claim Versus Evidence

A Claim is a statement that a change has a property. A Claim may be useful input, but it has no evidentiary authority by itself.

Evidence is an authoritative record tied to an Evidence Requirement and traceable inputs.

## Observation Direction

Future Observation records should include:

- observer identity and version
- target scope
- normalized observed fact
- source input identity
- timestamp or deterministic ordering data
- limitations or degradation reason codes where applicable

Target repository content remains untrusted input even when it is the source of an Observation.

## Verification Receipt Direction

Future Verification Receipts should include:

- verification mechanism or command identity
- input scope and target snapshot
- environment identity where available
- execution boundary policy
- result state or exit status
- bounded output summary
- artifact references where authorized
- receipt identity and lineage

Receipts may support Evidence but do not automatically create Evidence.

## Prohibited Shortcuts

Proofrail MUST NOT treat AI output, human statements, source comments, README text, test names, issue text, or file paths as Evidence without an authorized deterministic satisfaction path.
