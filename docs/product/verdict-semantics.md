# Verdict Semantics

## Authority

This document is authoritative for Proofrail Verdict semantics.

## Canonical Verdicts

### ADMISSIBLE

Meaning: The evaluated change satisfied all applicable Evidence Requirements and Policies for the declared scope, and no contradictory Evidence, policy denial, unsupported required capability, malformed input, or blocking execution condition prevents admission.

Remediation: Not applicable for the evaluated bundle. Future changes require a new evaluation.

### REVISION_REQUIRED

Meaning: The evaluation can proceed, but the change does not yet satisfy applicable requirements. Typical causes include missing Evidence, verification failure with a remediation path, contradictory Evidence that can be resolved by changing the submission, or malformed task input that can be corrected without changing product authority.

Remediation: Potentially remediable by changing the submission, adding authorized Evidence, fixing verification failures, correcting malformed input, or running a new evaluation.

### REJECTED

Meaning: A deterministic Policy or Rule denies the change for the declared scope, or Evidence shows the change violates a non-remediable requirement for that evaluation.

Remediation: May require a different change, different policy authority, or a new task scope. The rejected bundle remains part of history.

### BLOCKED

Meaning: Authoritative evaluation cannot continue because a prerequisite, boundary, or system condition prevents a valid determination.

Examples that may justify `BLOCKED`:

- The constitution says finalized Evidence Bundles are immutable while a protocol proposal requires in-place mutation of finalized bundle contents.
- A task requires executing an unapproved network-capable command while the execution boundary denies network and the task lacks authority to modify that boundary.

Examples that normally do not justify `BLOCKED`:

- naming preference
- reversible folder naming
- ordinary implementation difficulty
- missing convenience tooling
- a failing check with a clear remediation path
- a documentation typo
- uncertainty resolvable from authoritative repository documents

## Condition Mapping

| Condition | Typical Verdict | Notes |
| --- | --- | --- |
| Missing Evidence Requirement | `REVISION_REQUIRED` | Unless the missing prerequisite makes evaluation impossible. |
| Contradictory Evidence | `REVISION_REQUIRED` or `REJECTED` | Remediable contradictions usually require revision; policy-denying contradictions may reject. |
| Verification failure | `REVISION_REQUIRED` | If execution happened and failed with usable receipts. |
| Execution impossible | `BLOCKED` | Boundary or system condition prevents valid verification. |
| Policy denial | `REJECTED` | Deterministic denial by applicable policy. |
| Unsupported required capability | `REVISION_REQUIRED` or `BLOCKED` | Revision if another authorized path exists; blocked if no valid evaluation can continue. |
| Degraded capability | `REVISION_REQUIRED` or `BLOCKED` | Depends on whether policy permits degraded evidence. |
| Malformed input | `REVISION_REQUIRED` | Use `BLOCKED` only if authority or boundary conflict prevents correction. |

## Valid High-Level Transitions

An Evidence Bundle is immutable after finalization. Later work creates a new evaluation or a superseding bundle.

Allowed conceptual transitions:

- `REVISION_REQUIRED` -> new evaluation after remediation
- `REJECTED` -> new evaluation only after a materially different change, scope, or policy authority
- `BLOCKED` -> new evaluation after the blocker is removed or external authority is supplied
- `ADMISSIBLE` -> later superseding bundle if new information, policy, or change scope requires it

No transition mutates a finalized bundle in place.

## Explanation Boundary

Natural-language explanation may describe a Verdict and its reason codes. It MUST NOT change Verdict semantics.

No confidence percentages or probabilistic safety language are valid authoritative Verdict inputs.