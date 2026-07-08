# Autonomous Execution Defaults Builder Review

## Review Boundary

This is Builder review for `OPS-AUTO-001`.

It is not independent acceptance, not a trusted release decision, and not a Proofrail product Verdict. Builder self-review remains provisional.

## Findings

| ID | Severity | Disposition | Finding |
| --- | --- | --- | --- |
| OPS-AUTO-BR-001 | HIGH | FIXED | Autonomous execution guidance could be misread as bypassing Authority-Change Preflight. The new AGENTS.md and Machine Task Contract guidance state that autonomy applies after valid contract authority and preflight authorization. |
| OPS-AUTO-BR-002 | HIGH | FIXED | A task contract could be treated as a step-by-step script instead of a trust, scope, acceptance, verification, and review boundary. The new guidance explicitly rejects that interpretation. |
| OPS-AUTO-BR-003 | HIGH | FIXED | Human approval could remain implied for ordinary reversible implementation choices already inside granted authority. The new guidance says agents should act autonomously for those choices. |
| OPS-AUTO-BR-004 | MEDIUM | FIXED | Autonomous remediation could be confused with acceptance, release, independent review, or product Verdict authority. The new guidance separates agent action, approved repository change, trusted release, independent review, and product Verdict authority. |
| OPS-AUTO-BR-005 | MEDIUM | FIXED | Higher-risk work could be routed to humans by default instead of increasing evidence and review depth. The new guidance says higher risk should normally raise evidence requirements and independent review depth before reducing autonomy. |
| OPS-AUTO-BR-006 | MEDIUM | FIXED | Human escalation boundaries could be too broad. The new guidance reserves escalation for product-direction ambiguity, irreversible external actions, material cost or resource commitment, security exceptions, authority conflicts, or repeated autonomous-loop deadlock. |
| OPS-AUTO-BR-007 | LOW | OPEN | Independent review must still inspect the exact pull request head. Builder review, local checks, and Builder claim do not replace independent acceptance. |

## Required Review Questions

Authority-Change Preflight remains materially intact: the pre-existing preflight questions, stop-before-edit rule, verification-not-authority rule, and self-grant prohibition remain in place.

Machine Task Contracts remain repository engineering artifacts: the updated Machine Task Contract guidance preserves that contracts are not Proofrail product runtime authority.

Self-granted authority remains prohibited: no guidance permits an agent to invent or widen a contract to make an edit possible.

Independent review remains required: the new autonomy language does not convert Builder action, Builder review, or passing checks into independent acceptance.

Product runtime authority separation remains intact: no changed text authorizes target repository execution, Evidence Contract selection, Policy selection, Evidence Requirement satisfaction, Evidence creation, verification execution, or Verdict authority.

Ordinary reversible choices are autonomous inside granted authority: agents may choose work order, writable files within scope, implementation strategy, test design, verification sequencing, diagnosis, retry, rollback of task-local reversible changes, and remediation without human approval.

Human escalation remains available for true boundary issues: product-direction ambiguity, irreversible external actions, material cost or resource commitment, security exceptions, authority conflicts, and repeated autonomous-loop deadlock remain escalation triggers.

No product or runtime semantics changed: the edits are limited to repository engineering governance guidance, review, and validation evidence.

## Remaining Review Risk

This review is a Builder self-check. Independent review remains required and must not rely on Builder claim, local verification alone, or this review as acceptance evidence.
