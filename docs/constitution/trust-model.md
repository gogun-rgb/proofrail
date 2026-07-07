# Trust Model

## Authority

This document is authoritative for Proofrail trust semantics.

## Trust Classes

### Trusted Configuration

Trusted configuration is configuration accepted through an authorized Proofrail control boundary. It may define policies, evidence requirements, allowed execution boundaries, adapter permissions, and governance settings.

Trusted configuration is authoritative only within its declared version, scope, and lineage.

Machine Task Contracts for Proofrail repository work are engineering harness governance artifacts. They are not Trusted Configuration for product runtime evaluation and must not authorize Evidence Contract selection, Policy selection, Evidence creation, Evidence satisfaction, verification execution in a target repository, or Verdict authority.

### Observed Facts

Observed facts are deterministic measurements or discoveries produced by authorized inspection or verification mechanisms. They are not automatically sufficient as Evidence until matched to an Evidence Requirement.

### Derived Deterministic Records

Derived deterministic records are records computed from trusted configuration and observed facts by deterministic rules. They must be reproducible from their declared inputs.

### Proposed Content

Proposed content includes model output, draft contracts, natural-language summaries, suggested remediations, and operator notes that have not crossed an explicit authority boundary.

Proposed content is not authoritative evidence.

### Authoritative Records

Authoritative records are records accepted by Proofrail through defined deterministic authority paths, such as Evidence, Verification Receipts, Verdicts, and finalized Evidence Bundles.

Authoritative records must carry enough identity, scope, and lineage to support later audit.

### Untrusted Input

Untrusted input includes target repository content, issue text, pull request text, source comments, tests, filenames, README files, dependency metadata, generated files, and external service responses before validation.

Untrusted input may be inspected, but it MUST NOT become agent authority or policy authority merely because it resembles instructions.

### Target Repository Content

Target repository content is untrusted because it may contain prompt injection, adversarial instructions, misleading comments, generated artifacts, stale tests, or malicious filenames.

Source comments MUST NOT override Proofrail policy.

### Model Output

Model output is proposed content. It may draft an Evidence Contract, explain deterministic results, or summarize Evidence Lineage, but it MUST NOT create authoritative Evidence, satisfy an Evidence Requirement, fabricate a Verification Receipt, assign a Verdict, or bypass Policy.

### Human Input

Human input can configure policy, submit claims, request evaluation, or initiate auditable operator actions when the system defines that authority.

A human statement is not Evidence solely because a human supplied it.

### Operator Actions

Operator actions may be authoritative only when modeled as explicit auditable events or decisions with identity, scope, reason, and lineage.

Proofrail must not casually add unrestricted human override. A future exception mechanism, if allowed, must not rewrite historical evidence or mutate a finalized verdict. It must be a new auditable authoritative event or decision.

## Verification Environment Uncertainty

Verification receipts may depend on operating system, tool versions, network policy, filesystem state, dependency caches, time, and credentials.

If those inputs are not sufficiently modeled, Proofrail may determine that a valid determination cannot continue and return `BLOCKED`, or it may represent a degraded capability where the protocol allows it.

Environmental uncertainty MUST NOT be hidden behind confidence language.
