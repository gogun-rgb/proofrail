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

Raw conditions must first be deterministically classified into candidate Verdict states before reduction. Classification must use applicable Evidence Requirements, Observations, Verification Receipts, Adapter Capability records, Policies, Rules, execution boundaries, and lineage. Natural-language explanation, model confidence, or Builder assertion must not classify a condition.

| Raw condition | Classification rule | Candidate Verdict |
| --- | --- | --- |
| Missing Evidence Requirement | An applicable Evidence Requirement lacks acceptable Evidence from Observations or Verification Receipts. If a missing prerequisite prevents any valid evaluation from continuing, classify that prerequisite as execution impossible instead. | `REVISION_REQUIRED` |
| Contradictory Evidence | Evidence or its lineage conflicts for the declared scope. Classify as `REJECTED` only when an applicable deterministic Policy or Rule declares a denial for that contradiction. Otherwise, classify a remediable submission contradiction as `REVISION_REQUIRED`. | See classification rule. |
| Verification failure | Verification executed under an authorized boundary and produced a failing Verification Receipt with usable identity, scope, and lineage. | `REVISION_REQUIRED` |
| Execution impossible | A boundary, prerequisite, environment, or system condition prevents valid verification or evaluation from continuing. | `BLOCKED` |
| Policy denial | An applicable deterministic Policy or Rule declares a denial for the evaluated scope. | `REJECTED` |
| Unsupported required Adapter Capability | A required Adapter Capability is unavailable. If an authorized alternate evaluation path exists, classify as `REVISION_REQUIRED`; if no valid evaluation can continue, classify as `BLOCKED`. | See classification rule. |
| Degraded Adapter Capability | A capability is reduced by environment, parser, version, dependency, or runtime conditions. If an authorized alternate evaluation path exists, classify as `REVISION_REQUIRED`; if no valid evaluation can continue, classify as `BLOCKED`. | See classification rule. |
| Malformed input | Required input is structurally invalid or cannot be interpreted for the declared scope. If correction within the same authority model is possible, classify as `REVISION_REQUIRED`; if an authority or boundary conflict prevents valid interpretation, classify as `BLOCKED`. | See classification rule. |

## Verdict Reduction

After all raw conditions are classified, the authoritative Verdict is the highest-precedence candidate state under this normalized precedence:

```text
BLOCKED > REJECTED > REVISION_REQUIRED > ADMISSIBLE
```

`ADMISSIBLE` is the candidate state only when all applicable Evidence Requirements and Policies are satisfied and no higher-precedence condition is classified.

Reduction preserves every applicable reason code and Evidence Lineage record. Lower-precedence conditions do not disappear merely because a higher-precedence Verdict wins. The finalized Evidence Bundle must carry the winning Verdict plus the retained condition reasons and lineage needed to reproduce the reduction.

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
