# Validation Evidence

## Authority

This document records Builder validation methods and bounded evidence for independent review. It is not proof that no defect exists and it is not independent acceptance.

All convergence commands in this record were run from repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

## Convergence Preflight

Command:

```powershell
git rev-parse --show-toplevel
```

Purpose: Confirm the repository root before branch creation or edits.

Exit status: 0.

Bounded result:

```text
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail
```

Command:

```powershell
git remote -v
```

Purpose: Confirm the remote origin.

Exit status: 0.

Bounded result:

```text
origin	https://github.com/gogun-rgb/proofrail.git (fetch)
origin	https://github.com/gogun-rgb/proofrail.git (push)
```

Command:

```powershell
git status --short
```

Purpose: Confirm the preflight worktree was clean before convergence edits.

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git rev-parse HEAD
```

Purpose: Confirm the required starting commit.

Exit status: 0.

Bounded result:

```text
155908893a027e434925b93e9b0e91661975a433
```

## Branch Creation

Command:

```powershell
git switch -c convergence/phase-0-governor-review-1
```

Purpose: Create the required convergence branch from the preflight commit.

Exit status: 0 after explicit user authorization and escalated Git metadata access.

Bounded result:

```text
Switched to a new branch 'convergence/phase-0-governor-review-1'
```

## Required-Document and Governance Validation

Command:

```powershell
node scripts/validate-foundation.mjs
```

Purpose: Validate required document existence, governance configuration shape, canonical terminology headings, local Markdown links, Machine Task Contract schema fields and independent-review constants, active next task, and repository identity hygiene.

Exit status: 0.

Bounded result:

```text
Proofrail foundation validation passed.
```

## Evidence Input Closure Search

Command:

```powershell
rg -n 'other allowed deterministic input[s]|allowed deterministic input[s]|additional deterministic input[s]|other deterministic input[s]|other authorized input[s]|other accepted input[s]' AGENTS.md README.md CONTRIBUTING.md docs governance
```

Purpose: Search for open Evidence satisfaction input language, including the external-governor phrase and nearby variants.

Exit status: 1.

Bounded result: no matches.

Interpretation: Exit status 1 is the expected ripgrep status for no matches. No open deterministic-input escape language was found in the searched corpus.

## Machine Task Contract Authority Search

Command:

```powershell
rg -n "Machine Task Contract|Machine Task Contracts|task contract|Task Contract|task-contract" AGENTS.md README.md CONTRIBUTING.md docs governance
```

Purpose: Search all Machine Task Contract references and classify whether any product or architecture reference grants product runtime authority.

Exit status: 0.

Candidate conflict locations reviewed:

```text
docs\architecture\execution-boundary.md:15
docs\constitution\terminology.md:59
docs\constitution\trust-model.md:15
docs\engineering\machine-task-contract.md:93
docs\protocols\policy-schema.md:51
docs\architecture\domain-map.md:90
docs\constitution\product-constitution.md:65
docs\quality\quality-bar.md:21
```

Interpretation: Current candidate hits are explicit prohibitions, Trusted Configuration or deterministic Policy selection statements, or repository engineering governance references. The pre-remediation product-authority references were changed in `docs/architecture/execution-boundary.md` and `docs/constitution/terminology.md`.

## Verdict Reduction Ambiguity Search

Command:

```powershell
rg -n 'REVISION_REQUIRED or|REJECTED or|BLOCKED or|ADMISSIBLE or| or `REJECTED`| or `BLOCKED`|or `REVISION_REQUIRED`' docs\product\verdict-semantics.md
```

Purpose: Search Verdict semantics for ambiguous multi-verdict mappings that lack explicit pre-classification semantics.

Exit status: 1.

Bounded result: no matches.

Interpretation: Verdict semantics now uses explicit raw-condition classification rules and a separate deterministic reduction rule.

## Fixture Strategy Presence

Command:

```powershell
rg -n 'docs/engineering/fixture-strategy.md|Fixture Strategy|Adversarial Fixture Classes|fixture strategy exists|adversarial fixture strategy exists|fixture strategy presence' AGENTS.md README.md CONTRIBUTING.md docs governance
```

Purpose: Verify the fixture strategy is present in foundation governance required documents and relevant routing or gate references.

Exit status: 0.

Bounded result summary:

```text
AGENTS.md:27 fixture strategy authority reference
governance\foundation.config.json:34 required document entry
docs\engineering\fixture-strategy.md:1 Fixture Strategy
docs\engineering\fixture-strategy.md:99 Adversarial Fixture Classes
docs\quality\foundation-gate.md:39 adversarial fixture strategy reference
docs\plans\active\foundation-gate-mechanization.md:20 fixture strategy validation item
docs\plans\debt.md:45 documented control for future fixture work
```

Interpretation: The required Phase 0 fixture strategy exists and is referenced by governance, routing, Foundation Gate, active plan, reliability, and known debt. The document states that no executable fixture corpus exists in Phase 0.

## Machine Task Contract Schema Constants

Command:

```powershell
rg -n '"expectation"|"reviewerMustNotRelyOnBuilderClaim"|reviewProperties\.expectation\?\.const|reviewProperties\.reviewerMustNotRelyOnBuilderClaim\?\.const' governance\machine-task-contract.schema.json scripts\validate-foundation.mjs docs\engineering\machine-task-contract.md
```

Purpose: Inspect the schema, validator, and documentation for independent-review constants.

Exit status: 0.

Bounded result:

```text
governance\machine-task-contract.schema.json:69:        "expectation": { "const": "independent_review_required" },
governance\machine-task-contract.schema.json:70:        "reviewerMustNotRelyOnBuilderClaim": { "const": true }
scripts\validate-foundation.mjs:92:  if (reviewProperties.expectation?.const !== "independent_review_required") {
scripts\validate-foundation.mjs:95:  if (reviewProperties.reviewerMustNotRelyOnBuilderClaim?.const !== true) {
docs\engineering\machine-task-contract.md:99:The Phase 0 schema MUST enforce `review.expectation` as exactly `independent_review_required` and `review.reviewerMustNotRelyOnBuilderClaim` as exactly `true`.
```

Interpretation: The schema and validator now enforce exact values instead of only field presence.

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
rg -n -i --glob '!docs/engineering/validation-evidence.md' "Evidence Constraint|Requirement Spec|Evidence Rule|Requirement Specification|evidence constraint|requirement spec|evidence rule" AGENTS.md README.md CONTRIBUTING.md SECURITY.md docs governance
```

Purpose: Search for likely conflicting synonyms around Evidence Requirement while excluding this evidence log.

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
rg -n -i --glob '!docs/engineering/validation-evidence.md' "\b(PASS|FAIL|FAILED|APPROVED|APPROVE|SAFE|ACCEPTED|DENIED|DENY|BLOCKED|ADMISSIBLE|REVISION_REQUIRED|REJECTED)\b|probably safe|mostly correct|likely acceptable|high confidence|AI approved" AGENTS.md README.md CONTRIBUTING.md SECURITY.md docs governance package.json .github
```

Purpose: Search for non-canonical or risky verdict-like vocabulary.

Exit status: 0.

Bounded result summary: Canonical verdict values appear in AGENTS.md, product constitution, verdict semantics, governance config, and review provenance. Other hits are explanatory prose such as accepted authority boundaries, architecture alternatives being rejected, policy denial conditions, and prohibited phrases in non-goals. No extra authoritative Proofrail Verdict value was found.

## Inference Authority Search

Command:

```powershell
rg -n -i --glob '!docs/engineering/validation-evidence.md' "AI|LLM|model|inference|confidence|satisfy requirements|satisfy an Evidence Requirement|create Evidence|assign.*Verdict|produce.*Verdict|bypass Policy|override receipts|fabricate" AGENTS.md README.md CONTRIBUTING.md SECURITY.md docs governance
```

Purpose: Search for language that could grant inference, model output, or confidence authority in the verdict path.

Exit status: 0.

Bounded result summary: Hits are prohibitions, boundary descriptions, product identity text, or review provenance. The inference boundary forbids inference from creating Evidence, altering Observations, satisfying Evidence Requirements, fabricating receipts, producing authoritative Verdicts, bypassing Policy, or modifying finalized bundles.

## Bundle Immutability and Reproducibility Search

Command:

```powershell
rg -n -i --glob '!docs/engineering/validation-evidence.md' "immutable|mutate|supersede|superseding|DETERMINISTIC EVALUATION|ENVIRONMENTAL REPRODUCIBILITY|bit-for-bit" AGENTS.md README.md CONTRIBUTING.md SECURITY.md docs governance
```

Purpose: Confirm Evidence Bundle immutability and the deterministic-evaluation versus environmental-reproducibility distinction remain visible.

Exit status: 0.

Bounded result summary: Bundle format, verdict semantics, data flow, trust model, terminology, fixture strategy, and reliability state that finalized Evidence Bundles are immutable in concept and later bundles may supersede earlier bundles. Bundle format explicitly distinguishes DETERMINISTIC EVALUATION from ENVIRONMENTAL REPRODUCIBILITY and forbids bit-for-bit reproducibility overclaims unless meaningful environment inputs are modeled.

## Architecture Vocabulary Consistency

Command:

```powershell
rg -n -i "kernel|contracts|delivery|orchestration|adapter|inference|model provider|network service|GitHub-specific|MCP-specific" docs\architecture docs\protocols docs\quality AGENTS.md
```

Purpose: Inspect consistency of documented architecture vocabulary and dependency boundaries.

Exit status: 0.

Bounded result summary: Domain map and dependency rules use the same conceptual direction. Dependency rules forbid kernel imports from delivery frameworks, model providers, network services, GitHub-specific code, MCP-specific code, orchestration, language parsers, and target build tools. Adapter, execution, and inference docs preserve the same boundaries and no product package implementation is introduced.

## Identity Hygiene Search

Command:

```powershell
rg -n "C[o]deAtlas|c[o]deatlas|files-mentioned-by-the-user-c[o]deatlas" .
```

Purpose: Search the complete worktree for prohibited inherited identity text while avoiding storing the literal prohibited tokens in this evidence file.

Exit status: 1.

Bounded result: no matches.

Interpretation: Exit status 1 is the expected ripgrep status for no matches.

## Diff Whitespace Validation

Command:

```powershell
git diff --check
```

Purpose: Check the working diff for whitespace errors before commit.

Exit status: 0.

Bounded result summary: Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

## Worktree Status Before Commit

Command:

```powershell
git status --short
```

Purpose: Record the changed file set before staging and commit.

Exit status: 0.

Bounded result summary:

```text
modified: AGENTS.md
modified: CONTRIBUTING.md
modified: README.md
modified: docs/architecture/data-flow.md
modified: docs/architecture/domain-map.md
modified: docs/architecture/execution-boundary.md
modified: docs/constitution/product-constitution.md
modified: docs/constitution/terminology.md
modified: docs/constitution/trust-model.md
modified: docs/engineering/donor-archaeology.md
modified: docs/engineering/machine-task-contract.md
modified: docs/engineering/validation-evidence.md
modified: docs/plans/active/foundation-gate-mechanization.md
modified: docs/plans/debt.md
modified: docs/product/verdict-semantics.md
modified: docs/protocols/evidence-schema.md
modified: docs/protocols/policy-schema.md
modified: docs/quality/foundation-gate.md
modified: docs/quality/quality-bar.md
modified: docs/quality/reliability.md
modified: docs/reviews/phase-0-builder-self-review.md
modified: governance/foundation.config.json
modified: governance/machine-task-contract.schema.json
modified: scripts/validate-foundation.mjs
untracked: docs/engineering/fixture-strategy.md
untracked: docs/reviews/phase-0-convergence-builder-review.md
```
