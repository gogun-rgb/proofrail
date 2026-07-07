# Validation Evidence

## Authority

This document records Builder validation methods and bounded evidence for independent review. It is not proof that no defect exists and it is not independent acceptance.

All commands in this record were run from clean repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

## Required-Document and Governance Validation

Command:

```powershell
node scripts/validate-foundation.mjs
```

Purpose: Validate required document existence, governance configuration shape, canonical terminology headings, local Markdown links, Machine Task Contract schema fields, active next task, and repository identity hygiene.

Exit status: 0.

Bounded result:

```text
Proofrail foundation validation passed.
```

## Canonical Terminology Validation

Command:

```powershell
rg -n "^### (Claim|Observation|Evidence|Evidence Requirement|Evidence Contract|Verification Receipt|Policy|Rule|Verdict|Evidence Bundle|Evidence Lineage|Adapter Capability|Inference Proposal)$" docs\constitution\terminology.md
```

Purpose: Confirm every canonical term has an authoritative heading in the terminology document.

Exit status: 0.

Bounded result:

```text
11:### Claim
21:### Observation
31:### Evidence
41:### Evidence Requirement
51:### Evidence Contract
61:### Verification Receipt
71:### Policy
81:### Rule
91:### Verdict
101:### Evidence Bundle
111:### Evidence Lineage
121:### Adapter Capability
131:### Inference Proposal
```

## Terminology Drift Search

Command:

```powershell
rg -n -i "Evidence Constraint|Requirement Spec|Evidence Rule|Requirement Specification|evidence constraint|requirement spec|evidence rule" AGENTS.md README.md CONTRIBUTING.md SECURITY.md docs governance
```

Purpose: Search for likely conflicting synonyms around Evidence Requirement.

Exit status: 0.

Bounded result:

```text
docs\constitution\terminology.md:49:Warnings: Do not use "Evidence Constraint", "Requirement Spec", or "Evidence Rule" as interchangeable synonyms.
docs\constitution\terminology.md:146:- Evidence Constraint
docs\constitution\terminology.md:147:- Requirement Spec
docs\constitution\terminology.md:148:- Evidence Rule
```

Interpretation: These are explicit warnings in the terminology authority, not competing normative terms.

## Verdict Vocabulary Search

Command:

```powershell
rg -n -i "\b(PASS|FAIL|FAILED|APPROVED|APPROVE|SAFE|ACCEPTED|DENIED|DENY|BLOCKED|ADMISSIBLE|REVISION_REQUIRED|REJECTED)\b|probably safe|mostly correct|likely acceptable|high confidence|AI approved" AGENTS.md README.md CONTRIBUTING.md SECURITY.md docs governance package.json .github
```

Purpose: Search for non-canonical or risky verdict-like vocabulary.

Exit status: 0.

Bounded result summary: Canonical verdict values appear in AGENTS.md, product constitution, verdict semantics, and governance config. Other hits are explanatory prose such as accepted authority boundaries, architecture alternatives being rejected, policy denial conditions, and prohibited phrases in non-goals. No extra authoritative Proofrail Verdict value was found.

## Inference Authority Search

Command:

```powershell
rg -n -i "AI|LLM|model|inference|confidence|satisfy requirements|satisfy an Evidence Requirement|create Evidence|assign.*Verdict|produce.*Verdict|bypass Policy|override receipts|fabricate" AGENTS.md README.md CONTRIBUTING.md SECURITY.md docs governance
```

Purpose: Search for language that could grant inference, model output, or confidence authority in the verdict path.

Exit status: 0.

Bounded result summary: Hits are prohibitions or boundary descriptions. The inference boundary forbids inference from creating Evidence, altering Observations, satisfying Evidence Requirements, fabricating receipts, producing authoritative Verdicts, bypassing Policy, or modifying finalized bundles.

## Documentation Link and Reference Validation

Command:

```powershell
node scripts/validate-foundation.mjs
```

Purpose: Validate local Markdown links and anchors.

Exit status: 0.

Bounded result: The validator passed. AGENTS.md length was separately checked.

Command:

```powershell
(Get-Content -LiteralPath 'AGENTS.md').Count
```

Purpose: Confirm AGENTS.md remains a short operational map.

Exit status: 0.

Bounded result:

```text
52
```

## Architecture Vocabulary Consistency

Command:

```powershell
rg -n -i "kernel|contracts|delivery|orchestration|adapter|inference|model provider|network service|GitHub-specific|MCP-specific" docs\architecture docs\protocols docs\quality AGENTS.md
```

Purpose: Inspect consistency of documented architecture vocabulary and dependency boundaries.

Exit status: 0.

Bounded result summary: Domain map and dependency rules use the same conceptual direction. Dependency rules forbid kernel imports from delivery frameworks, model providers, network services, GitHub-specific code, MCP-specific code, orchestration, language parsers, and target build tools. Adapter and inference docs preserve the same boundaries.

## Bundle Immutability and Reproducibility Search

Command:

```powershell
rg -n -i "immutable|mutate|supersede|superseding|DETERMINISTIC EVALUATION|ENVIRONMENTAL REPRODUCIBILITY|bit-for-bit" AGENTS.md README.md CONTRIBUTING.md SECURITY.md docs governance
```

Purpose: Confirm Evidence Bundle immutability and the deterministic-evaluation versus environmental-reproducibility distinction remain visible.

Exit status: 0.

Bounded result summary: Bundle format, verdict semantics, data flow, trust model, and terminology state that finalized Evidence Bundles are immutable in concept and later bundles may supersede earlier bundles. Bundle format explicitly distinguishes DETERMINISTIC EVALUATION from ENVIRONMENTAL REPRODUCIBILITY and forbids bit-for-bit reproducibility overclaims unless meaningful environment inputs are modeled.

## Identity Hygiene Search

Command:

```powershell
rg -n "C[o]deAtlas|c[o]deatlas|files-mentioned-by-the-user-c[o]deatlas" .
```

Purpose: Search the complete clean worktree for prohibited inherited identity text while avoiding storing the literal prohibited tokens in this evidence file.

Exit status: 1.

Bounded result: no matches.

Interpretation: Exit status 1 is the expected ripgrep status for no matches.