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

## FND-MECH-001 Validation Evidence

All FND-MECH-001 commands in this section were run from repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

Baseline main SHA after PR #1 integration:

```text
4b4da50672f7833a722912063dd7f392b3d3f672
```

Branch:

```text
foundation/gate-mechanization-1
```

### Generated Projection Idempotence

Command:

```powershell
pnpm governance:generate
```

Exit status: 0.

Bounded result:

```text
Generated Foundation governance projections.
```

Comparison method:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath governance\generated\canonical-terminology.json,governance\generated\canonical-verdicts.json,governance\generated\documentation-authority-index.json
```

First-run hashes:

```text
canonical-terminology.json                 6EAFE0A593F800365BF53363EB169E6EF8564214C76B94F0F9A876136D3A104A
canonical-verdicts.json                    5AE43CFE3954295BFF06204949203EC863B1F92A8A3B8909FFFF1C5DF9E289EF
documentation-authority-index.json         E0A01E004CDC248A1E5D4629B20FCBE45C2FA108FE4A485DC3C21260B208AC58
```

Command:

```powershell
pnpm governance:generate
```

Exit status: 0.

Bounded result:

```text
Generated Foundation governance projections.
```

Second-run hashes:

```text
canonical-terminology.json                 6EAFE0A593F800365BF53363EB169E6EF8564214C76B94F0F9A876136D3A104A
canonical-verdicts.json                    5AE43CFE3954295BFF06204949203EC863B1F92A8A3B8909FFFF1C5DF9E289EF
documentation-authority-index.json         E0A01E004CDC248A1E5D4629B20FCBE45C2FA108FE4A485DC3C21260B208AC58
```

Interpretation: The second generation produced byte-identical generated projection files by SHA256 hash comparison. Generated projections contain source digests and no generation timestamps.

### Governance Check No-Mutation Check

Command:

```powershell
git status --short
```

Purpose: Record worktree state before `pnpm governance:check`.

Exit status: 0.

Bounded result summary: Modified and untracked FND-MECH-001 files were present.

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
git status --short
```

Purpose: Record worktree state after `pnpm governance:check`.

Exit status: 0.

Bounded result summary: Same changed-file set as before `pnpm governance:check`; no mutation observed.

### Governance Tests

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result:

```text
tests 21
pass 21
fail 0
```

Negative cases covered include deterministic ordering, deterministic JSON output, unknown emitted HARN_ code detection, duplicate HARN_ code rejection, invalid HARN_ prefix rejection, missing required document, stale projection, unsafe projection output path, duplicate projection output path, malformed config, canonical term drift, canonical Verdict drift, duplicate authority topic, broken inline/reference/HTML Markdown links, escaped and absolute Markdown links, repository identity contamination, invalid Machine Task Contract review expectation, and invalid `reviewerMustNotRelyOnBuilderClaim`.

### Primary Verification No-Mutation Check

Command:

```powershell
git status --short
```

Purpose: Record worktree state before `pnpm verify`.

Exit status: 0.

Bounded result summary: Same FND-MECH-001 changed-file set as before `pnpm governance:check`.

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
tests 21
pass 21
fail 0
git diff --check exit status 0
```

Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

Command:

```powershell
git status --short
```

Purpose: Record worktree state after `pnpm verify`.

Exit status: 0.

Bounded result summary: Same changed-file set as before `pnpm verify`; no mutation observed.

### Standalone Validator Commands

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Purpose: Parse the JSON validator output and assert the expected `VALID` result shape.

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

### Diff Whitespace Validation

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

### Boundary Searches

Command:

```powershell
rg -n "HARN_" AGENTS.md README.md CONTRIBUTING.md docs governance scripts tests package.json .github
```

Exit status: 0.

Bounded result summary: `HARN_` occurrences are in Foundation engineering harness documentation, governance task requirements, the harness reason-code registry, validator modules, and synthetic governance tests. No `HARN_` code is documented as a Proofrail product runtime reason code.

Command:

```powershell
rg -n "PASS_FOR_[I]NTEGRATION" .
```

Exit status: 1.

Bounded result: no matches.

Interpretation: Exit status 1 is the expected ripgrep status for no matches. The external review status token is not treated as a Proofrail product Verdict declaration in this branch.

Command:

```powershell
rg -n "Machine Task Contract|Machine Task Contracts|task contract|Task Contract|task-contract" AGENTS.md README.md CONTRIBUTING.md docs governance scripts tests package.json .github
```

Exit status: 0.

Bounded result summary: Machine Task Contract references are engineering governance, schema validation, task-contract documentation, review provenance, or explicit product-runtime authority prohibitions. No product runtime authority regression was observed.

Command:

```powershell
$paths = @('packages','apps','backend','frontend','src'); foreach ($p in $paths) { "$p=$(Test-Path -LiteralPath $p)" }
```

Exit status: 0.

Bounded result:

```text
packages=False
apps=False
backend=False
frontend=False
src=False
```

Interpretation: No Proofrail product runtime package directories were introduced.

### Builder Internal Review

Three separate read-only reviewer agents were used:

- Reviewer A: Foundation Authority Reviewer.
- Reviewer B: Adversarial Harness Reviewer.
- Reviewer C: Maintainability Reviewer.

These reviews were Builder-internal only and are not independent acceptance. Findings and dispositions are recorded in [../reviews/foundation-gate-mechanization-builder-review.md](../reviews/foundation-gate-mechanization-builder-review.md).

CI status for the final FND-MECH-001 branch was not observed at the time this evidence section was written because the pull request had not yet been created.

## FND-MECH-CONV-001 Validation Evidence

All FND-MECH-CONV-001 commands in this section were run from repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

Branch:

```text
foundation/gate-mechanization-1
```

Reviewed starting head:

```text
559f740b83d44f2f931191e8baa977bcf157937f
```

### Preflight

Command:

```powershell
git rev-parse --show-toplevel
```

Exit status: 0.

Bounded result:

```text
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail
```

Command:

```powershell
git remote -v
```

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

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git branch --show-current
```

Exit status: 0.

Bounded result:

```text
foundation/gate-mechanization-1
```

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Bounded result:

```text
559f740b83d44f2f931191e8baa977bcf157937f
```

Command:

```powershell
git fetch origin --prune
```

Exit status: 0 after explicit authorization for Git metadata access.

Bounded result:

```text
From https://github.com/gogun-rgb/proofrail
 - [deleted]         (none)     -> origin/convergence/phase-0-governor-review-1
```

Command:

```powershell
gh pr view 2 --json state,isDraft,mergeable,baseRefName,headRefName,headRefOid,mergedAt
```

Exit status: 0 after explicit authorization for GitHub CLI network access.

Bounded result:

```json
{"baseRefName":"main","headRefName":"foundation/gate-mechanization-1","headRefOid":"559f740b83d44f2f931191e8baa977bcf157937f","isDraft":false,"mergeable":"MERGEABLE","mergedAt":null,"state":"OPEN"}
```

### Focused Negative Governance Tests

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 28
pass 28
fail 0
```

Unknown finding normalization coverage:

- `detects unknown emitted harness reason codes`
- injected `HARN_SYNTHETIC_UNKNOWN`
- asserted `HARN_EMITTED_REASON_CODE_UNKNOWN` was present
- asserted `HARN_SYNTHETIC_UNKNOWN` was absent from final output
- asserted every final finding code was registered in `governance/harness-reason-codes.json`

Config path safety coverage:

- `reports unsafe required-document config paths as registered parseable JSON`
- `reports unsafe repository paths for all Foundation config path fields`
- synthetic path cases: `../outside.md`, `C:/outside.md`, and `contains\u0000null.md`
- inspected config fields: `requiredDocuments`, `machineTaskContractSchema`, `harnessReasonCodeRegistry`, `cleanAgentTestSpecification`, `architectureCheckPreparation`, and `generatedProjections.canonicalTerminology`
- asserted `INVALID` result shape, `HARN_CONFIG_PATH_INVALID`, parseable JSON, no JavaScript stack marker, and no synthetic host root in JSON output

Machine Task Contract authority coverage:

- `requires Machine Task Contract authority mayChangeAuthority`
- `requires Machine Task Contract authority mayChangeProductSemantics`
- `accepts Machine Task Contract authority with both explicit booleans`

Projection sourceDigest coverage:

- `ignores fenced fake canonical headings while extracting canonical sets`
- `detects stale projections when fenced authoritative source content changes`
- asserted fenced fake headings do not become canonical terms or canonical Verdicts
- asserted changing fenced content changes `sourceDigest`, reports `HARN_PROJECTION_STALE` until regeneration, and returns to `VALID` after regeneration

### Generated Projection Idempotence

Command:

```powershell
pnpm governance:generate
```

Exit status: 0.

Bounded result:

```text
Generated Foundation governance projections.
```

First-run hashes:

```text
canonical-terminology.json                 6EAFE0A593F800365BF53363EB169E6EF8564214C76B94F0F9A876136D3A104A
canonical-verdicts.json                    5AE43CFE3954295BFF06204949203EC863B1F92A8A3B8909FFFF1C5DF9E289EF
documentation-authority-index.json         E0A01E004CDC248A1E5D4629B20FCBE45C2FA108FE4A485DC3C21260B208AC58
```

Command:

```powershell
pnpm governance:generate
```

Exit status: 0.

Bounded result:

```text
Generated Foundation governance projections.
```

Second-run hashes:

```text
canonical-terminology.json                 6EAFE0A593F800365BF53363EB169E6EF8564214C76B94F0F9A876136D3A104A
canonical-verdicts.json                    5AE43CFE3954295BFF06204949203EC863B1F92A8A3B8909FFFF1C5DF9E289EF
documentation-authority-index.json         E0A01E004CDC248A1E5D4629B20FCBE45C2FA108FE4A485DC3C21260B208AC58
```

Interpretation: The second generation produced byte-identical projection hashes. The digest semantics changed in code, but the current authoritative source sections contain no fenced code content requiring changed committed projection bytes.

### Required Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
tests 28
pass 28
fail 0
git diff --check exit status 0
```

Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

### Additional Invariant Checks

Command:

```powershell
$registry = (Get-Content -Raw -LiteralPath 'governance\harness-reason-codes.json' | ConvertFrom-Json).codes.code; $emitted = @(rg --only-matching --no-filename 'HARN_[A-Z0-9_]+' scripts | Sort-Object -Unique); $unknown = @($emitted | Where-Object { $_ -notin $registry }); if ($unknown.Count -eq 0) { 'all script-emitted HARN_ codes are registered' } else { $unknown }
```

Exit status: 0.

Bounded result:

```text
all script-emitted HARN_ codes are registered
```

Command:

```powershell
rg -n "mayChangeAuthority|mayChangeProductSemantics" governance\tasks docs\engineering\machine-task-contract.md governance\machine-task-contract.schema.json
```

Exit status: 0.

Bounded result summary: `governance/tasks/FND-MECH-001.json` and `governance/tasks/FND-MECH-CONV-001.json` explicitly contain both `mayChangeAuthority` and `mayChangeProductSemantics`; the schema requires both fields; the Machine Task Contract documentation example and rules state both fields.

Command:

```powershell
$paths = @('packages','apps','backend','frontend','src'); foreach ($p in $paths) { "$p=$(Test-Path -LiteralPath $p)" }
```

Exit status: 0.

Bounded result:

```text
packages=False
apps=False
backend=False
frontend=False
src=False
```

Interpretation: No Proofrail product runtime package directories were introduced.

### Builder Convergence Review

The Builder convergence review for these remediations is recorded in [../reviews/foundation-gate-mechanization-convergence-review.md](../reviews/foundation-gate-mechanization-convergence-review.md).

It is not independent acceptance, not a Proofrail product Verdict, and not Foundation Gate acceptance.

## FND-MECH-CONV-002 Validation Evidence

All FND-MECH-CONV-002 commands in this section were run from repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

Branch:

```text
foundation/gate-mechanization-1
```

Reviewed starting head:

```text
28c718951757dc5030762333570fb43b52f0f952
```

### Preflight

Command:

```powershell
git rev-parse --show-toplevel
```

Exit status: 0.

Bounded result:

```text
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail
```

Command:

```powershell
git remote -v
```

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

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git branch --show-current
```

Exit status: 0.

Bounded result:

```text
foundation/gate-mechanization-1
```

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Bounded result:

```text
28c718951757dc5030762333570fb43b52f0f952
```

Command:

```powershell
git fetch origin --prune
```

Exit status: 0 after explicit authorization for Git metadata access.

Bounded result: no output.

Command:

```powershell
gh pr view 2 --json state,isDraft,mergeable,baseRefName,headRefName,headRefOid,mergedAt
```

Exit status: 0 after explicit authorization for GitHub CLI network access.

Bounded result:

```json
{"baseRefName":"main","headRefName":"foundation/gate-mechanization-1","headRefOid":"28c718951757dc5030762333570fb43b52f0f952","isDraft":false,"mergeable":"MERGEABLE","mergedAt":null,"state":"OPEN"}
```

### Registry Bootstrap Behavior

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Focused registry behavior covered by synthetic governance tests:

- valid registry unknown-code case: `detects unknown emitted harness reason codes` injects `HARN_SYNTHETIC_UNKNOWN`, asserts `HARN_EMITTED_REASON_CODE_UNKNOWN` is present, asserts `HARN_SYNTHETIC_UNKNOWN` is absent, and asserts every final finding code is registered in the valid registry.
- removed bootstrap diagnostic case: `fails closed when reserved bootstrap diagnostic is removed from registry`.
- empty registry case: `fails closed when harness reason-code registry codes array is empty`.
- duplicate bootstrap diagnostic case: `fails closed when reserved bootstrap diagnostic is duplicated`.
- malformed top-level registry metadata case: `fails closed when harness reason-code registry top-level metadata is malformed`.
- injected raw unknown while registry unusable: `does not pass raw unknown finding through while registry is unusable`.

The unusable-registry test helper parses validator JSON with `JSON.parse`, asserts status `INVALID`, asserts the final code list is exactly `HARN_EMITTED_REASON_CODE_UNKNOWN`, asserts the injected raw unknown code is absent, asserts no JavaScript stack marker appears, asserts the synthetic host root is absent, and compares repeated `renderJson(validateFoundation(...))` output for byte-identical deterministic JSON.

### Committed Change-Range Whitespace

Exact CI range semantics after remediation:

- pull request events run `node scripts/governance/check-committed-whitespace.mjs --mode merge-base <pull_request.base.sha> <pull_request.head.sha>`, equivalent to `git diff --check <base-sha>...<head-sha>`.
- `main` push events with a non-zero `before` SHA run direct diff semantics from `before` to `github.sha`.
- new `main` history with an all-zero `before` SHA uses the deterministic empty-tree fallback to `github.sha`.
- `foundation/**` branch push events fetch `origin/main` and run merge-base diff semantics over `origin/main...github.sha`.
- checkout uses `fetch-depth: 0`.
- dependency installation remains `pnpm install --frozen-lockfile`.
- `pnpm verify` remains a separate later step and still includes the local no-argument `git diff --check` workspace-diff check.

Local synthetic committed-range helper tests from `pnpm test:governance`:

- clean range result: `committed whitespace helper accepts a clean committed range`.
- committed trailing-whitespace failure result: `committed whitespace helper detects a committed trailing-whitespace defect`.
- unrelated uncommitted worktree isolation result: `committed whitespace helper ignores unrelated uncommitted worktree defects`.
- missing argument result: `committed whitespace helper rejects missing base or head arguments deterministically`.

### Generated Projection Idempotence

Command:

```powershell
pnpm governance:generate
```

Exit status: 0.

Bounded result:

```text
Generated Foundation governance projections.
```

First-run hashes:

```text
canonical-terminology.json                 6EAFE0A593F800365BF53363EB169E6EF8564214C76B94F0F9A876136D3A104A
canonical-verdicts.json                    5AE43CFE3954295BFF06204949203EC863B1F92A8A3B8909FFFF1C5DF9E289EF
documentation-authority-index.json         E0A01E004CDC248A1E5D4629B20FCBE45C2FA108FE4A485DC3C21260B208AC58
```

Command:

```powershell
pnpm governance:generate
```

Exit status: 0.

Bounded result:

```text
Generated Foundation governance projections.
```

Second-run hashes:

```text
canonical-terminology.json                 6EAFE0A593F800365BF53363EB169E6EF8564214C76B94F0F9A876136D3A104A
canonical-verdicts.json                    5AE43CFE3954295BFF06204949203EC863B1F92A8A3B8909FFFF1C5DF9E289EF
documentation-authority-index.json         E0A01E004CDC248A1E5D4629B20FCBE45C2FA108FE4A485DC3C21260B208AC58
```

Interpretation: The second generation produced byte-identical generated projection files by SHA256 hash comparison.

### Required Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
tests 37
pass 37
fail 0
git diff --check exit status 0
```

Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

### Additional Invariant Checks

Command:

```powershell
$registry = (Get-Content -Raw -LiteralPath 'governance\harness-reason-codes.json' | ConvertFrom-Json).codes.code; $emitted = @(rg --only-matching --no-filename 'HARN_[A-Z0-9_]+' scripts | Sort-Object -Unique); $unknown = @($emitted | Where-Object { $_ -notin $registry }); if ($unknown.Count -eq 0) { 'all script-emitted HARN_ codes are registered' } else { $unknown }
```

Exit status: 0.

Bounded result:

```text
all script-emitted HARN_ codes are registered
```

Command:

```powershell
rg -n "mayChangeAuthority|mayChangeProductSemantics" governance\tasks governance\machine-task-contract.schema.json docs\engineering\machine-task-contract.md
```

Exit status: 0.

Bounded result summary: `governance/tasks/FND-MECH-001.json`, `governance/tasks/FND-MECH-CONV-001.json`, and `governance/tasks/FND-MECH-CONV-002.json` explicitly contain both `mayChangeAuthority` and `mayChangeProductSemantics`; the schema requires both fields; the Machine Task Contract documentation example and rules state both fields.

Command:

```powershell
Get-ChildItem -LiteralPath 'packages','apps','backend','frontend','src' -Force -ErrorAction SilentlyContinue | Select-Object FullName
```

Exit status: 1.

Bounded result: no output.

Interpretation: No Proofrail product runtime package directories were introduced.

### Workflow Inspection

The GitHub Actions workflow was inspected after modification. It preserves `pnpm install --frozen-lockfile` and `pnpm verify`, sets checkout `fetch-depth: 0`, and adds separate committed change-range whitespace steps for pull request, main push, new main history, and foundation branch push events.

### Builder Final Convergence Review

The Builder final convergence review for these remediations is recorded in [../reviews/foundation-gate-mechanization-final-convergence-review.md](../reviews/foundation-gate-mechanization-final-convergence-review.md).

It is not independent acceptance, not a Proofrail product Verdict, and not Foundation Gate acceptance.

## FND-LEG-001 Validation Evidence

All FND-LEG-001 commands in this section were run from repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

Starting Foundation baseline SHA:

```text
4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3
```

Task branch:

```text
foundation/agent-legibility-convergence-1
```

This Builder session did not run or grade a Clean Agent Test. This evidence does not claim Agent Legibility Gate acceptance or Foundation Gate acceptance.

### Exact Baseline Preflight

Command:

```powershell
git rev-parse --show-toplevel
```

Exit status: 0.

Bounded result:

```text
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail
```

Command:

```powershell
git remote -v
```

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

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git branch --show-current
```

Exit status: 0.

Bounded result:

```text
main
```

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Bounded result:

```text
4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3
```

Command:

```powershell
git fetch origin --prune
```

Initial exit status: 1.

Initial bounded result:

```text
error: cannot open '.git/FETCH_HEAD': Permission denied
```

The command was rerun after explicit authorization for Git metadata access.

Rerun exit status: 0.

Rerun bounded result:

```text
From https://github.com/gogun-rgb/proofrail
 - [deleted]         (none)     -> origin/foundation/gate-mechanization-1
```

Command:

```powershell
git rev-parse origin/main
```

Exit status: 0.

Bounded result:

```text
4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3
```

Command:

```powershell
git pull --ff-only origin main
```

Exit status: 0 after explicit authorization for Git metadata access.

Bounded result:

```text
Already up to date.
From https://github.com/gogun-rgb/proofrail
 * branch            main       -> FETCH_HEAD
```

Command:

```powershell
git status --short
```

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Bounded result:

```text
4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3
```

### Branch Creation

Command:

```powershell
git branch --list foundation/agent-legibility-convergence-1
```

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git switch -c foundation/agent-legibility-convergence-1
```

Exit status: 0 after explicit authorization for Git metadata access.

Bounded result:

```text
Switched to a new branch 'foundation/agent-legibility-convergence-1'
```

Command:

```powershell
git branch --show-current
```

Exit status: 0.

Bounded result:

```text
foundation/agent-legibility-convergence-1
```

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Bounded result:

```text
4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3
```

### Task Contract Validation

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Interpretation: The externally supplied `governance/tasks/FND-LEG-001.json` contract was accepted by the existing governance validator. This does not claim independent acceptance.

### Required Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
tests 37
pass 37
fail 0
git diff --check exit status 0
```

Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

### Scope-Boundary Diff Checks

Command:

```powershell
git status --short
```

Exit status: 0.

Bounded result:

```text
 M AGENTS.md
 M docs/engineering/clean-agent-test.md
 M docs/engineering/machine-task-contract.md
 M docs/engineering/validation-evidence.md
 M docs/plans/active/foundation-gate-mechanization.md
 M docs/quality/foundation-gate.md
 M governance/clean-agent-test.json
?? docs/reviews/agent-legibility-convergence-builder-review.md
?? governance/tasks/FND-LEG-001.json
```

Command:

```powershell
git diff --name-only
```

Exit status: 0.

Bounded tracked result:

```text
AGENTS.md
docs/engineering/clean-agent-test.md
docs/engineering/machine-task-contract.md
docs/engineering/validation-evidence.md
docs/plans/active/foundation-gate-mechanization.md
docs/quality/foundation-gate.md
governance/clean-agent-test.json
```

Command:

```powershell
git ls-files --others --exclude-standard
```

Exit status: 0.

Bounded untracked result:

```text
docs/reviews/agent-legibility-convergence-builder-review.md
governance/tasks/FND-LEG-001.json
```

Command:

```powershell
git diff --name-only 4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3 -- docs/protocols docs/constitution docs/architecture docs/product scripts tests packages apps backend frontend src .github package.json pnpm-lock.yaml governance/machine-task-contract.schema.json governance/foundation.config.json governance/foundation.config.schema.json governance/harness-reason-codes.json governance/harness-reason-codes.schema.json governance/generated
```

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git diff --exit-code 4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3 -- docs/protocols/evidence-schema.md
```

Exit status: 0.

Bounded result: no output.

Interpretation: `docs/protocols/evidence-schema.md` is unchanged from the Foundation baseline.

Command:

```powershell
git diff --exit-code 4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3 -- docs/constitution docs/architecture docs/product
```

Exit status: 0.

Bounded result: no output.

Interpretation: `docs/constitution`, `docs/architecture`, and `docs/product` are unchanged from the Foundation baseline.

Command:

```powershell
git diff --exit-code 4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3 -- scripts tests package.json pnpm-lock.yaml .github
```

Exit status: 0.

Bounded result: no output.

Interpretation: `scripts`, `tests`, `package.json`, `pnpm-lock.yaml`, and `.github` are unchanged from the Foundation baseline.

Command:

```powershell
git diff --exit-code 4d6fb48c8d2e479ab2db1f3ca3e8fdb357ffb3d3 -- governance/machine-task-contract.schema.json governance/foundation.config.json governance/foundation.config.schema.json governance/harness-reason-codes.json governance/harness-reason-codes.schema.json governance/generated
```

Exit status: 0.

Bounded result: no output.

Interpretation: forbidden governance schemas, the Foundation config, the harness reason-code registry, and generated governance projections are unchanged from the Foundation baseline.

Command:

```powershell
Get-ChildItem -LiteralPath 'packages','apps','backend','frontend','src' -Force -ErrorAction SilentlyContinue | Select-Object FullName
```

Exit status: 1.

Bounded result: no output.

Interpretation: No Proofrail product runtime package directories were introduced.

### Authority and Overclaim Searches

Command:

```powershell
rg -n "mayChangeAuthority" AGENTS.md docs governance
```

Exit status: 0.

Bounded result summary: Hits are in the new authority-change preflight guidance, existing Machine Task Contract schema and examples, committed task contracts, Builder review text, and prior validation evidence. The new normative uses require `authority.mayChangeAuthority` to be explicit and exactly `true` before an authority-bearing edit.

Command:

```powershell
rg -n "plain request|plain imperative|authority-change|authority bearing|authority-bearing|self-author|self-grant|retroactive" AGENTS.md docs governance
```

Exit status: 0.

Bounded result summary: Hits show generic authority-change guidance in AGENTS.md, Machine Task Contract guidance, Clean Agent Test protocol, Foundation Gate, the machine-readable Clean Agent Test specification, the FND-LEG-001 task contract, and Builder review. The guidance is not lockfile-only.

Command:

```powershell
rg -n "Clean Agent Test passed|Foundation Gate passed|Foundation Gate acceptance" AGENTS.md docs governance
```

Exit status: 0.

Bounded result summary: No hit claimed that the Clean Agent Test passed or that the Foundation Gate passed. `Foundation Gate acceptance` hits are non-acceptance language such as "not independent Foundation Gate acceptance" and "acceptance remains open".

Command:

```powershell
rg -n "Agent Legibility Gate acceptance|Clean Agent Test success|This PR does not claim|does not claim the Clean Agent Test|cannot grade|not independent" AGENTS.md docs governance
```

Exit status: 0.

Bounded result summary: Hits are boundary and non-acceptance statements. The changed documents do not claim Clean Agent Test success, Agent Legibility Gate acceptance, or Foundation Gate acceptance.

### Builder Convergence Review

The Builder convergence review for FND-LEG-001 is recorded in [../reviews/agent-legibility-convergence-builder-review.md](../reviews/agent-legibility-convergence-builder-review.md).

It records the external finding as externally supplied, fixes all Builder-discovered HIGH findings within scope, leaves the inherent independent-review limitation open as LOW, and does not claim independent acceptance.

## PHASE-TRANS-001 Validation Evidence

All PHASE-TRANS-001 commands in this section were run from repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

Starting Foundation baseline:

```text
7865ea299f98b3fd0158d1486272f73468b345ac
```

Task branch:

```text
phase/phase-0-close-phase-1-authorize
```

This Builder session did not implement `KERNEL-VS-001`, did not create production package placeholders, and did not run or grade an independent review.

### Exact Baseline Preflight

Command:

```powershell
git rev-parse --show-toplevel
```

Exit status: 0.

Bounded result:

```text
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail
```

Command:

```powershell
git remote -v
```

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

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git branch --show-current
```

Exit status: 0.

Bounded result:

```text
main
```

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Bounded result:

```text
7865ea299f98b3fd0158d1486272f73468b345ac
```

Command:

```powershell
git fetch origin --prune
```

Initial exit status: 1.

Initial bounded result:

```text
error: cannot open '.git/FETCH_HEAD': Permission denied
```

The command was rerun after explicit authorization for Git metadata access.

Rerun exit status: 0.

Rerun bounded result: no output.

Command:

```powershell
git rev-parse origin/main
```

Exit status: 0.

Bounded result:

```text
7865ea299f98b3fd0158d1486272f73468b345ac
```

### Branch Creation

Command:

```powershell
git switch -c phase/phase-0-close-phase-1-authorize
```

Initial exit status: 1.

Initial bounded result:

```text
fatal: cannot lock ref 'refs/heads/phase/phase-0-close-phase-1-authorize': unable to create directory for .git/refs/heads/phase/phase-0-close-phase-1-authorize
```

The command was rerun after explicit authorization for Git metadata access.

Rerun exit status: 0.

Bounded result:

```text
Switched to a new branch 'phase/phase-0-close-phase-1-authorize'
```

### Machine Task Contract Validation

`governance/tasks/PHASE-TRANS-001.json` was materialized as the first file edit.

Command:

```powershell
pnpm governance:check
```

Exit status after materializing the task contract: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

During later document edits, a nonessential Documentation Authority Index note change caused a stale generated projection finding.

Command:

```powershell
pnpm governance:check
```

Exit status: 1.

Bounded result:

```text
HARN_PROJECTION_STALE governance/generated/documentation-authority-index.json: Generated governance projection is stale.
```

Remediation: revert the nonessential Documentation Authority Index note edit instead of editing forbidden `governance/generated/**`.

Rerun command:

```powershell
pnpm governance:check
```

Rerun exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

### Required Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
tests 37
pass 37
fail 0
git diff --check exit status 0
```

Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

### Scope-Boundary Checks

Command:

```powershell
git status --short
```

Exit status: 0.

Bounded result summary:

```text
 M AGENTS.md
 M README.md
 M docs/constitution/product-constitution.md
 M docs/plans/active/foundation-gate-mechanization.md
 M docs/quality/foundation-gate.md
?? docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md
?? docs/reviews/phase-0-foundation-gate-independent-review.md
?? docs/reviews/phase-transition-builder-review.md
?? governance/tasks/PHASE-TRANS-001.json
```

After this evidence section was added, `docs/engineering/validation-evidence.md` also belongs to the PHASE-TRANS-001 changed-file set.

Command:

```powershell
git diff --exit-code 7865ea299f98b3fd0158d1486272f73468b345ac -- docs\constitution\terminology.md docs\constitution\trust-model.md docs\architecture docs\product\verdict-semantics.md docs\protocols scripts tests .github package.json pnpm-lock.yaml governance\generated governance\foundation.config.json governance\foundation.config.schema.json governance\machine-task-contract.schema.json governance\harness-reason-codes.json governance\harness-reason-codes.schema.json
```

Exit status: 0.

Bounded result: no output.

Interpretation: canonical terminology, Trust semantics, architecture documents, Verdict semantics, protocol documents, scripts, tests, workflow files, package manifests, generated governance projections, governance config and schemas, and harness reason-code registry files are unchanged from the transition baseline.

Command:

```powershell
Get-ChildItem -LiteralPath 'packages','apps','backend','frontend','src' -Force -ErrorAction SilentlyContinue | Select-Object FullName
```

Exit status: 1.

Bounded result: no output.

Interpretation: No Proofrail production package, application, backend, frontend, or source directories were created.

Command:

```powershell
rg -n "Authority-Change Preflight|plain imperative request|plain natural-language request|self-grant|self-granted|Successful verification cannot retroactively|Stop before editing" AGENTS.md
```

Exit status: 0.

Bounded result summary: Authority-Change Preflight remains present. The plain-request rule, stop-before-edit rule, no retroactive verification authority rule, and self-grant prevention rule remain visible in AGENTS.md.

Command:

```powershell
rg -n "ADMISSIBLE" AGENTS.md README.md docs governance
```

Exit status: 0.

Bounded result summary: Hits are canonical Verdict vocabulary, unchanged Verdict semantics, generated canonical Verdict projection, historical validation evidence, the PHASE-TRANS-001 task contract, and explicit boundary statements that Foundation Gate PASS is not the product Verdict `ADMISSIBLE`.

Command:

```powershell
rg -n "Phase 0" AGENTS.md README.md docs governance
```

Exit status: 0.

Bounded result summary: Current-status hits record Phase 0 closure. Remaining hits are historical provenance, unchanged Phase 0 authority documents, generated projections, or prior validation evidence.

Command:

```powershell
rg -n "Phase 1" AGENTS.md README.md docs governance
```

Exit status: 0.

Bounded result summary: Hits define Phase 1 as Deterministic Kernel Vertical Slice, prohibit out-of-scope integrations, identify `KERNEL-VS-001` as unimplemented, and link the active Phase 1 plan.

Command:

```powershell
rg -n "packages/" AGENTS.md README.md docs governance
```

Exit status: 0.

Bounded result summary: New PHASE-TRANS-001 hits authorize only `packages/contracts` and `packages/kernel` for the next implementation task. Existing examples and prior task contracts are historical or forbidden-scope references. No package directory exists.

### Diff Inspection

Commands:

```powershell
git diff -- AGENTS.md README.md docs\constitution\product-constitution.md docs\plans\active\foundation-gate-mechanization.md docs\quality\foundation-gate.md
Get-Content -LiteralPath 'docs\plans\active\phase-1-deterministic-kernel-vertical-slice.md' -Raw
Get-Content -LiteralPath 'docs\reviews\phase-0-foundation-gate-independent-review.md' -Raw
Get-Content -LiteralPath 'docs\reviews\phase-transition-builder-review.md' -Raw
Get-Content -LiteralPath 'governance\tasks\PHASE-TRANS-001.json' -Raw
```

Exit status: 0 for each command.

Bounded result summary: The inspected diff and new files record Phase 0 closure, Foundation Gate external PASS boundary, Phase 1 deterministic kernel vertical-slice authorization, authorized initial package layers only, prohibited Phase 1 integrations, unimplemented `KERNEL-VS-001`, independent review evidence limits, Builder review findings, and the materialized Machine Task Contract.

## KERNEL-VS-001 Validation Evidence

All KERNEL-VS-001 commands in this section were run from repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

Starting Phase 1 baseline:

```text
e2964c726614d67c0e01239463e943b2e21189b2
```

Task branch:

```text
phase1/kernel-vertical-slice-1
```

### Exact Baseline Preflight

Command:

```powershell
git rev-parse --show-toplevel
```

Exit status: 0.

Bounded result:

```text
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail
```

Command:

```powershell
git remote -v
```

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

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git branch --show-current
```

Exit status: 0.

Bounded result:

```text
main
```

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Bounded result:

```text
e2964c726614d67c0e01239463e943b2e21189b2
```

Command:

```powershell
git fetch origin --prune
```

Initial exit status: 1.

Initial bounded result:

```text
error: cannot open '.git/FETCH_HEAD': Permission denied
```

The command was rerun after explicit authorization for Git metadata and network access.

Rerun exit status: 0.

Bounded result: no output.

Command:

```powershell
git rev-parse origin/main
```

Exit status: 0.

Bounded result:

```text
e2964c726614d67c0e01239463e943b2e21189b2
```

### Branch Creation

Command:

```powershell
git switch -c phase1/kernel-vertical-slice-1
```

Initial exit status: 1.

Initial bounded result:

```text
fatal: cannot lock ref 'refs/heads/phase1/kernel-vertical-slice-1': unable to create directory for .git/refs/heads/phase1/kernel-vertical-slice-1
```

The command was rerun after explicit authorization for Git metadata access.

Rerun exit status: 0.

Bounded result:

```text
Switched to a new branch 'phase1/kernel-vertical-slice-1'
```

### Machine Task Contract Validation

`governance/tasks/KERNEL-VS-001.json` was materialized as the first file edit from the externally supplied Machine Task Contract.

Command:

```powershell
pnpm governance:check
```

Exit status after materializing the task contract: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

### Workspace And Dependency Installation

Command:

```powershell
pnpm install
```

Initial exit status: 1.

Initial bounded result:

```text
[ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY] Aborted removal of modules directory due to no TTY
```

Command:

```powershell
$env:CI='true'; pnpm install
```

Exit status: 124.

Bounded result summary: command timed out while recreating `node_modules`.

Command:

```powershell
$env:CI='true'; pnpm install --offline
```

Exit status: 124.

Bounded result summary: command timed out after registry access was denied by the sandbox during supply-chain policy checks.

Command:

```powershell
pnpm install --config.confirmModulesPurge=false
```

Exit status: 0 after explicit authorization for network and workspace install access.

Bounded result summary:

```text
Packages: +8
devDependencies:
+ @types/node 24.13.2 (26.1.0 is available)
+ ajv 8.20.0
+ typescript 5.8.3 (6.0.3 is available)
Done in 1.1s using pnpm v11.7.0
```

Final required install command:

```powershell
pnpm install --config.confirmModulesPurge=false
```

Exit status: 0.

Bounded result:

```text
Scope: all 3 workspace projects
Already up to date
Done in 251ms using pnpm v11.7.0
```

Dependency additions: `typescript` `5.8.3` and `@types/node` `24.13.2`. Existing `ajv` remains root Foundation governance tooling.

Workspace package identities:

```text
@proofrail/contracts
@proofrail/kernel
```

### Required Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm typecheck:phase1
```

Exit status: 0.

Bounded result:

```text
tsc -p tsconfig.json
```

Command:

```powershell
pnpm test:kernel
```

Exit status: 0.

Bounded result summary:

```text
tests 32
pass 32
fail 0
```

Kernel tests were run at least twice. Earlier runs passed with 27 tests before read-only reviewer remediations; final runs passed with 32 tests after remediations. Semantic determinism tests directly compare finalized bundle output and deterministic bundle identity.

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Foundation governance check passed.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 32 pass, 0 fail.
git diff --check exit status 0.
```

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

### No-Mutation Check

Before the final `pnpm verify`, the tracked diff was hashed with:

```powershell
git diff --binary | git hash-object --stdin
```

Pre-verify hash:

```text
019fa6e22d748cfe496bfead0fddf8edbe9d61cc
```

Untracked files before final `pnpm verify` were exactly the new KERNEL-VS-001 files under `docs/engineering`, `docs/reviews`, `governance/tasks`, `packages`, plus `pnpm-workspace.yaml` and `tsconfig.json`.

After the final `pnpm verify`, the same hash command returned:

```text
019fa6e22d748cfe496bfead0fddf8edbe9d61cc
```

The untracked file list after final `pnpm verify` matched the pre-verify list. No additional untracked runtime artifact was created by `pnpm verify`.

An install-created `.pnpm-store` artifact was removed before no-mutation verification after confirming its resolved path was inside the workspace.

### Boundary Searches And Package Inspection

Command:

```powershell
rg -n "node:fs|node:child_process|node:http|node:https|node:net|node:dns|fetch\(|axios|octokit|github|openai|anthropic|modelConfidence|Date\.now|Math\.random|randomUUID" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result summary: The only production-source hit was `modelConfidence` in `packages/kernel/src/boundary-validation.js`, where it is rejected before evaluation.

Command:

```powershell
rg -n "HARN_" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result summary: Production-source hits are only in `packages/kernel/src/boundary-validation.js`, where `HARN_` Rule reason codes are rejected. No product kernel or contracts reason code uses the Foundation `HARN_` namespace.

Command:

```powershell
rg -n "\b(PASS|FAIL|APPROVED|DENIED|UNKNOWN)\b" packages\contracts\src packages\kernel\src
```

Exit status: 1.

Bounded result: no non-canonical Verdict value matches in production source.

Command:

```powershell
rg -n "ADMISSIBLE|REVISION_REQUIRED|REJECTED|BLOCKED" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result summary: Hits are the four canonical Verdict values in contracts and the kernel classification/reduction implementation. No fifth product Verdict was added.

Command:

```powershell
Get-ChildItem -LiteralPath 'packages' -Directory -Force | Select-Object Name
```

Exit status: 0.

Bounded result:

```text
contracts
kernel
```

Command:

```powershell
Get-ChildItem -LiteralPath 'apps','backend','frontend','src','packages\adapters','packages\application','packages\orchestration','packages\cli','packages\api','packages\mcp','packages\web','packages\github','packages\inference' -Force -ErrorAction SilentlyContinue | Select-Object FullName
```

Exit status: 1.

Bounded result: no output.

Interpretation: No unauthorized production or application layer exists.

Package manifest inspection:

```text
packages/contracts/package.json: no dependencies.
packages/kernel/package.json: production dependency only on @proofrail/contracts via workspace:*.
```

Contracts import inspection:

```powershell
rg -n "@proofrail/kernel|packages/kernel|\.\./kernel|kernel" packages\contracts
```

Exit status: 0.

Bounded result summary: Hits are only the string `kernel` inside schema/version names such as `proofrail.kernel.input.phase1.v1` and `kernelEngineVersion`; contracts do not import kernel.

### Scope Boundary Checks

Command:

```powershell
git diff --exit-code e2964c726614d67c0e01239463e943b2e21189b2 -- AGENTS.md docs\constitution docs\architecture docs\product docs\protocols docs\quality scripts tests .github governance\generated governance\foundation.config.json governance\foundation.config.schema.json governance\machine-task-contract.schema.json governance\harness-reason-codes.json governance\harness-reason-codes.schema.json
```

Exit status: 0.

Bounded result: no output.

Interpretation: read-only authority and forbidden paths are unchanged from the KERNEL-VS-001 baseline.

Command:

```powershell
git diff --name-only
git ls-files --others --exclude-standard
```

Exit status: 0 for both commands.

Bounded result summary: tracked changes are `README.md`, `docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md`, `docs/engineering/validation-evidence.md`, `package.json`, and `pnpm-lock.yaml`; untracked task files are the new KERNEL-VS-001 engineering record, Builder review, task contract, packages, workspace file, and TypeScript config.

### Builder Review Provenance

The Builder review is recorded in [../reviews/kernel-vertical-slice-builder-review.md](../reviews/kernel-vertical-slice-builder-review.md).

Three read-only reviewers were used because separate bounded reviewer agents were available:

```text
Reviewer A: 019f4036-0a41-78c1-99b0-06951e2de115
Reviewer B: 019f4036-39ad-74f1-9a41-6fe264c838ff
Reviewer C: 019f4036-64e6-78d0-9d01-973227b67da6
```

Their findings were Builder-internal review input, not independent acceptance. All CRITICAL and HIGH Builder/reviewer findings within KERNEL-VS-001 scope were fixed. Remaining open LOW finding: Builder review is not independent acceptance.

## KERNEL-VS-CONV-001 Validation Evidence

All KERNEL-VS-CONV-001 commands in this section were run from repository root:

```text
C:\Users\zizon\Documents\Codex\2026-07-07\proofrail
```

Reviewed PR head required by the convergence task:

```text
ee7b348868ab8ab342bb2ea6eb57f4b2477516b2
```

Task branch:

```text
phase1/kernel-vertical-slice-1
```

### Exact Review Subject Preflight

Command:

```powershell
git rev-parse --show-toplevel
```

Exit status: 0.

Bounded result:

```text
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail
```

Command:

```powershell
git remote -v
```

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

Exit status: 0.

Bounded result: no output.

Command:

```powershell
git branch --show-current
```

Exit status: 0.

Bounded result:

```text
phase1/kernel-vertical-slice-1
```

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Bounded result:

```text
ee7b348868ab8ab342bb2ea6eb57f4b2477516b2
```

Command:

```powershell
git fetch origin --prune
```

Initial exit status: 1.

Initial bounded result:

```text
error: cannot open '.git/FETCH_HEAD': Permission denied
```

The command was rerun after explicit authorization for Git metadata access.

Rerun exit status: 0.

Bounded result: no output.

Command:

```powershell
gh pr view 5 --json state,isDraft,mergeable,baseRefName,headRefName,headRefOid,mergedAt
```

Initial exit status: 1.

Initial bounded result:

```text
Post "https://api.github.com/graphql": dial tcp 20.200.245.245:443: connectex: An attempt was made to access a socket in a way forbidden by its access permissions.
```

The command was rerun after explicit authorization for GitHub CLI network access.

Rerun exit status: 0.

Bounded result:

```json
{"baseRefName":"main","headRefName":"phase1/kernel-vertical-slice-1","headRefOid":"ee7b348868ab8ab342bb2ea6eb57f4b2477516b2","isDraft":false,"mergeable":"MERGEABLE","mergedAt":null,"state":"OPEN"}
```

Interpretation: preflight matched the exact required repository, branch, local head, open PR #5, base branch, head branch, and remote head SHA.

### Machine Task Contract

`governance/tasks/KERNEL-VS-CONV-001.json` was materialized as the first task artifact from the externally supplied Machine Task Contract.

Command:

```powershell
pnpm governance:check
```

Exit status after materializing the task contract: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

### KVS-BND-001 Regression Evidence

Focused kernel tests added or updated for KVS-BND-001:

```text
modelConfidence attached to observations Array is rejected before evaluation
inferenceProposal attached to rules Array is rejected before evaluation
symbol-keyed property attached to an authoritative Array is rejected
non-enumerable custom property attached to an authoritative Array is rejected
accessor-backed numeric Array index is rejected without executing the getter
sparse observations Array is rejected before normalization
sparse rules Array is rejected before Rule evaluation
unexpected ordinary string-keyed Array property is rejected
nested sparse Evidence Contract requirementIds Array is rejected
nested accessor-backed Observation limitations Array is rejected without executing the getter
repeated malformed Array validation reports the same category and path
ordinary dense JSON-compatible Arrays remain accepted
```

Getter execution count recorded by the accessor-backed numeric-index regression:

```text
0
```

The nested accessor-backed Observation `limitations` regression also asserted getter execution count `0`.

### KVS-RSN-001 Regression Evidence

Focused kernel tests added or preserved for KVS-RSN-001:

```text
Rule reason code reserved for missing Evidence Requirement is rejected
missing Evidence Requirement creates REVISION_REQUIRED candidate and lineage
normal KERNEL_ Rule reason code remains valid
Rule reason code beginning with HARN_ is rejected
triggered denial Rule creates REJECTED candidate with reason and lineage
```

The reserved Rule reason test rejects Rule-supplied `KERNEL_EVIDENCE_REQUIREMENT_MISSING` with `RESERVED_KERNEL_REASON_CODE` before Rule evaluation.

### KVS-SCOPE-001 Regression Evidence

Focused kernel tests added or updated for KVS-SCOPE-001:

```text
Observation target scope outside the declared evaluation scope is rejected
observer identity mismatch does not satisfy requirement
wrong fact key in a valid target scope does not satisfy requirement
Observation with limitations does not silently satisfy requirement
```

The valid-scope mismatch cases remain accepted boundary inputs and produce missing-Evidence behavior rather than boundary rejection.

### Required Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm typecheck:phase1
```

Initial exit status after implementation edits: 1.

Initial bounded result summary:

```text
packages/kernel/src/boundary-validation.js descriptor-map JSDoc errors
packages/kernel/test/boundary-validation.test.js indexed-observation and captured-error JSDoc errors
```

Remediation: tightened JSDoc casts for the descriptor map and boundary-test helper.

Rerun exit status: 0.

Bounded result:

```text
tsc -p tsconfig.json
```

Command:

```powershell
pnpm test:kernel
```

Exit status: 0.

Bounded result summary:

```text
tests 47
pass 47
fail 0
```

Kernel tests were run multiple times after implementation and typecheck remediation. The final observed kernel test count was 47.

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 47 pass, 0 fail.
git diff --check exit status 0.
```

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported Windows line-ending conversion warnings for modified text files and no whitespace errors.

### No-Mutation Check

Before the final observed `pnpm verify`, the tracked diff was hashed with:

```powershell
git diff --binary | git hash-object --stdin
```

Pre-verify hash:

```text
ca70d542d3291b86c2575cac7b081d821f2bd6b9
```

Untracked files before final observed `pnpm verify`:

```text
docs/reviews/kernel-vertical-slice-convergence-review.md
governance/tasks/KERNEL-VS-CONV-001.json
packages/kernel/src/kernel-reason-codes.js
```

After the final observed `pnpm verify`, the same hash command returned:

```text
ca70d542d3291b86c2575cac7b081d821f2bd6b9
```

The untracked file list after final observed `pnpm verify` matched the pre-verify list. No additional untracked repository artifact was created by `pnpm verify`.

## PHASE1-GATE-002 Validation Evidence

Date: 2026-07-09.

Task identity: `PHASE1-GATE-002`.

Builder status target after evidence preparation: `BUILDER_READY_FOR_INDEPENDENT_GATE`.

This section records fresh Builder gate-evidence preparation from current `origin/main`. It does not reuse, copy, cherry-pick, merge, or rely on gate artifacts, validation-evidence text, Builder review text, commits, or conclusions from `phase1/phase-1-gate-1` or PR #11. It is not independent Gate acceptance, not Phase 1 closure, not Phase 2 authorization, not product readiness, and not a Proofrail product Verdict.

### Baseline And Contract Preflight

Command:

```powershell
git fetch origin
```

Exit status: 0 after explicit Git metadata authorization.

Bounded result summary: fetch completed.

Command:

```powershell
git switch phase1/phase-1-gate-2
```

Initial sandboxed attempt could not create `.git/index.lock`; rerun with explicit Git metadata authorization exited 0.

Bounded result summary: branch was already `phase1/phase-1-gate-2` and up to date with `origin/phase1/phase-1-gate-2`.

Command:

```powershell
Get-Content -LiteralPath "governance/tasks/PHASE1-GATE-002.json"
```

Purpose: Read the current Machine Task Contract before acting.

Exit status: 0.

Bounded result summary: task id `PHASE1-GATE-002`; objective is clean-rebootstrap Phase 1 gate-evidence preparation; writable paths are `docs/engineering/phase-1-gate-evidence.md`, `docs/engineering/validation-evidence.md`, and `docs/reviews/phase-1-gate-builder-review.md`; `authority.mayChangeAuthority` is `true`; `authority.mayChangeProductSemantics` is `false`.

Command:

```powershell
pnpm governance:check
```

Purpose: Required pre-edit governance check against the committed task contract.

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
git rev-parse origin/main
```

Exit status: 0.

Bounded result:

```text
0616091da1a572a2ea3e457ed84dab8e32259f59
```

Interpretation: observed `origin/main` exactly matched the required `PHASE1-GATE-002` review baseline.

Command:

```powershell
git rev-parse HEAD
```

Exit status: 0.

Pre-edit branch head:

```text
77bd16ce407aed46ccda9a73cb90fd2d88232223
```

Command:

```powershell
git diff --name-status origin/main...HEAD
```

Exit status: 0.

Pre-edit bounded result:

```text
A	governance/tasks/PHASE1-GATE-002.json
```

Interpretation: before Builder edits, the committed branch delta from current main was limited to the externally Governor-committed `PHASE1-GATE-002` task contract.

### Authority Reads

The Builder read every `authority.read` document named by `PHASE1-GATE-002`, including current authority documents, Phase 1 engineering records, KERNEL task contracts, `packages/contracts` source, `packages/kernel` source, and the named kernel tests.

### Authority-Change Preflight For Validation Evidence

Target path: `docs/engineering/validation-evidence.md`.

Why authority-bearing: the document declares `## Authority` and records Builder validation methods and bounded evidence for independent review.

Current Machine Task Contract: committed `governance/tasks/PHASE1-GATE-002.json`.

Contract validity: `pnpm governance:check` exited 0 before any Builder edit.

`scope.write` authorization: yes, `docs/engineering/validation-evidence.md` is listed exactly.

`scope.read_only_authority` exclusion: yes, the target is not listed as read-only authority.

`scope.forbidden` exclusion: yes, the target is not forbidden.

`authority.mayChangeAuthority`: exactly `true`.

Objective and acceptance coverage: yes. `PHASE1-GATE-002` explicitly authorizes appending bounded Builder gate validation evidence and the explicit Authority-Change Preflight to `docs/engineering/validation-evidence.md`. This narrow grant does not authorize current phase authority changes, product authority changes, constitutional changes, protocol changes, Trust semantic changes, Verdict semantic changes, Evidence authority class changes, canonical terminology changes, production source changes, contract changes, or test changes.

Preflight result: satisfied before editing this validation evidence section.

### Source And Boundary Audit

Command:

```powershell
Get-ChildItem -LiteralPath "packages" -Directory -Force | Select-Object -ExpandProperty Name
```

Exit status: 0.

Bounded result:

```text
contracts
kernel
```

Interpretation: production package scope is limited to the authorized Phase 1 package layers.

Command:

```powershell
node -e "Promise.all([import('./packages/contracts/src/index.js'), import('./packages/kernel/src/index.js')]).then(([contracts,kernel]) => { console.log('contracts=' + Object.keys(contracts).sort().join(',')); console.log('kernel=' + Object.keys(kernel).sort().join(',')); })"
```

Exit status: 0.

Bounded result:

```text
contracts=EVIDENCE_CONTRACT_SELECTION_PROVENANCE_SOURCES,EVIDENCE_SATISFACTION_KIND,PHASE1_BUNDLE_SCHEMA_VERSION,PHASE1_KERNEL_ENGINE_VERSION,PHASE1_KERNEL_INPUT_SCHEMA_VERSION,RULE_AUTHORITY_PROVENANCE_SOURCES,RULE_EFFECT_DENY,RULE_PREDICATES,VERDICTS
kernel=KernelBoundaryError,evaluate,evaluateKernel
```

Command:

```powershell
rg -n 'node:fs|node:child_process|node:http|node:https|node:net|node:dns|fetch\(|axios|octokit|github|openai|anthropic|Date\.now|new Date|Math\.random|randomUUID|crypto\.randomUUID|process\.env|process\.uptime|exec\(|spawn\(|execFile\(|readFile|writeFile|readdir|stat\(|pnpm|npm|yarn|git ' packages\contracts\src packages\kernel\src packages\contracts\package.json packages\kernel\package.json
```

Exit status: 1.

Bounded result: no matches.

Interpretation: exit status 1 is the expected ripgrep status for no matches. No forbidden production source or package-manifest use of repository/filesystem inspection, child process execution, package-manager or build-tool execution, network clients, GitHub or model providers, current-time dependence, randomness, UUID generation, environment-derived authoritative input, or target-code execution was found.

Command:

```powershell
rg -n 'ADMISSIBLE|REVISION_REQUIRED|REJECTED|BLOCKED|PASS|FAIL|APPROVED|DENIED|UNKNOWN|SAFE|high confidence|model confidence|LLM|AI judgment' packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result summary: production Verdict literals are limited to `ADMISSIBLE`, `REVISION_REQUIRED`, `REJECTED`, and `BLOCKED`; no extra production Verdict value was found.

Command:

```powershell
rg -n 'HARN_|KERNEL_EVIDENCE_REQUIREMENT_MISSING|PASS_FOR_INTEGRATION|PASS|FAIL|APPROVED|DENIED|UNKNOWN' packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result summary:

```text
HARN_ appears only in Rule reason-code rejection logic.
KERNEL_EVIDENCE_REQUIREMENT_MISSING appears as the single internal kernel missing-Evidence reason-code declaration.
```

### Record-Drift And Known Gap Inspection

Command:

```powershell
rg -n "Phase 1|pending independent review|KERNEL-VS|KERNEL-ASSURE|complete|product runtime|PASS|Phase 2|ready" README.md docs\constitution\product-constitution.md docs\plans\active\phase-1-deterministic-kernel-vertical-slice.md
```

Exit status: 0.

Bounded result summary:

```text
README.md still points the first implementation task identity at phase1/kernel-vertical-slice-1 and pending independent review.
docs/constitution/product-constitution.md still contains transition-era wording that no kernel implementation or Phase 1 vertical slice exists until later implementation.
docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md still references KERNEL-VS-CONV-003 as pending independent review and uses expected-test language.
```

Disposition: recorded as `RECORD_DRIFT` transition candidates in `docs/engineering/phase-1-gate-evidence.md`. These read-only authority/current-phase paths were not edited.

Command:

```powershell
rg -n 'Known Gaps|does not provide|Future Gaps|does not implement|Non-Goals|Future authorized' docs\engineering\kernel-assurance-campaign.md docs\engineering\kernel-vertical-slice.md
```

Exit status: 0.

Bounded result summary: Known Gaps and Non-Goals remain future or explicitly forbidden Phase 1 capabilities, including independent review, product readiness, Phase 1 completion, external reproducibility, complete Evidence Bundle protocol coverage, repository inspection, verification execution, Policy runtime, adapters, delivery integrations, model-provider behavior, external trust establishment, and deterministic Policy selection outside this slice.

Disposition: classified in `docs/engineering/phase-1-gate-evidence.md`. No reviewed Known Gap was classified as `PHASE1_BLOCKER`.

### Required Verification Commands

Command results below were produced after the fresh evidence and Builder review files were prepared.

| Command | Exit status | Bounded result |
| --- | --- | --- |
| `pnpm governance:check` | 0 | Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance. |
| `pnpm governance:check-json` | 0 | Foundation JSON validation output parsed as `VALID`. |
| `pnpm test:governance` | 0 | Governance tests: 37 pass, 0 fail, 0 skipped, 0 todo. |
| `pnpm typecheck:phase1` | 0 | `tsc -p tsconfig.json`. |
| `pnpm test:kernel` | 0 | Kernel tests: 475 pass, 0 fail, 0 skipped, 0 todo. |
| `pnpm test:kernel` | 0 | Second kernel run: 475 pass, 0 fail, 0 skipped, 0 todo. |
| `pnpm verify` | 0 | Governance check, JSON check, 37 governance tests, typecheck, 475 kernel tests, and `git diff --check` passed; Git reported line-ending conversion warnings for the three writable evidence/review files and no whitespace errors. |
| `node scripts/validate-foundation.mjs` | 0 | Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance. |
| `node scripts/validate-foundation.mjs --format json` | 0 | `{"findings":[],"schemaVersion":"1","status":"VALID"}`. |
| `node scripts/governance/verify-json-output.mjs` | 0 | Foundation JSON validation output parsed as `VALID`. |
| `git diff --check` | 0 | Git reported line-ending conversion warnings for the three writable evidence/review files and no whitespace errors. |

### Deterministic Verify No-Mutation Comparison

Method:

```powershell
git add -N docs/engineering/phase-1-gate-evidence.md docs/reviews/phase-1-gate-builder-review.md
git diff HEAD --binary | git hash-object --stdin
git status --short | Sort-Object
pnpm verify
git diff HEAD --binary | git hash-object --stdin
git status --short | Sort-Object
```

Pre-verify tracked diff hash:

```text
0fd7f1e84ee523501d2c83677cbdc4f016f5ecb6
```

Pre-verify sorted status state:

```text
 A docs/engineering/phase-1-gate-evidence.md
 A docs/reviews/phase-1-gate-builder-review.md
 M docs/engineering/validation-evidence.md
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail, 0 skipped, 0 todo.
phase1 typecheck passed.
kernel tests: 475 pass, 0 fail, 0 skipped, 0 todo.
git diff --check exit status 0 with Git line-ending conversion warnings for the three writable evidence/review files and no whitespace errors.
```

Post-verify tracked diff hash:

```text
0fd7f1e84ee523501d2c83677cbdc4f016f5ecb6
```

Post-verify sorted status state:

```text
 A docs/engineering/phase-1-gate-evidence.md
 A docs/reviews/phase-1-gate-builder-review.md
 M docs/engineering/validation-evidence.md
```

Interpretation: the tracked diff hash and sorted status state matched before and after the measured `pnpm verify`; no tracked or status-visible repository artifact changed during that verification run.

Sequencing limitation: this subsection is updated after the measured `pnpm verify` run so the comparison can record the observed values. The measurement proves `pnpm verify` was non-mutating for the otherwise-complete PHASE1-GATE-002 evidence and Builder review set immediately before this record update; it does not claim that this final explanatory update itself existed before the measured command.

## KERNEL-ASSURE-001 Validation Evidence

Task identity: `KERNEL-ASSURE-001`.

Branch:

```text
phase1/kernel-assurance-campaign-1
```

This section records Builder validation for the deterministic kernel assurance campaign. It is not independent acceptance, does not claim Phase 1 completion, and is not a Proofrail product Verdict.

### Authority Read

The Builder read `governance/tasks/KERNEL-ASSURE-001.json` and every path listed in `authority.read` before implementation:

```text
AGENTS.md
docs/constitution/terminology.md
docs/constitution/trust-model.md
docs/architecture/data-flow.md
docs/architecture/dependency-rules.md
docs/architecture/inference-boundary.md
docs/product/verdict-semantics.md
docs/protocols/evidence-schema.md
docs/protocols/policy-schema.md
docs/protocols/bundle-format.md
docs/engineering/kernel-vertical-slice.md
docs/engineering/machine-task-contract.md
docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md
packages/contracts/src/index.d.ts
packages/contracts/src/index.js
packages/kernel/src/index.js
packages/kernel/src/boundary-validation.js
packages/kernel/src/normalization.js
packages/kernel/src/canonical-json.js
packages/kernel/src/evidence-satisfaction.js
packages/kernel/src/rule-evaluation.js
packages/kernel/src/verdict-reduction.js
packages/kernel/src/bundle-finalization.js
packages/kernel/src/deep-freeze.js
packages/kernel/src/kernel-reason-codes.js
packages/kernel/test/boundary-validation.test.js
packages/kernel/test/kernel-vertical-slice.test.js
packages/kernel/test/verdict-reduction.test.js
packages/kernel/test/immutability.test.js
```

### Campaign Case Count

The deterministic campaign manifest in `packages/kernel/test/kernel-assurance-campaign.test.js` contains 400 stable identified assurance cases. The manifest asserts unique identities, lexicographically stable order, at least 256 cases, and non-empty family coverage.

Case family counts:

```text
primitive distinction: 144
permutation and repeated evaluation: 16
Rule denial matrix: 16
Verdict reference model: 15
boundary shape and executable wrapper: 198
lineage, isolation, immutability, Observation scope, Claim boundary, identity: 8
canonical serialization: 3
```

### Builder Findings And Remediation

Finding `KASS-BR-001` was discovered during the first campaign dry run. The Rule matrix generated a third Evidence Requirement while calculating expected results for a two-requirement matrix.

Remediation: added a requirement-set-specific input builder and calculated missing candidates and reason-code expectations from the exact generated input.

Finding `KASS-BR-002` was discovered by typecheck. The new tests intentionally mutate caller-owned synthetic inputs while imported contract types expose readonly shapes.

Remediation: added explicit local mutable casts around synthetic test fixture mutation points only.

No production kernel defect was discovered by this campaign, so no production source remediation was required.

### Initial Failure Evidence

Command:

```powershell
pnpm test:kernel
```

Initial exit status: 1.

Bounded result summary:

```text
The Rule matrix generator contains 16 identified subcases. The retained evidence supports that those 16 identified Rule matrix subcases failed because the test harness expected two requirements while the generated input contained a third requirement. Any enclosing parent test failure accounting was not retained precisely in the bounded output, so this record does not claim an exact parent-versus-subcase failure breakdown beyond the 16 identified subcases.
```

Command:

```powershell
pnpm typecheck:phase1
```

Initial exit status after the harness correction: 1.

Bounded result summary:

```text
Typecheck reported readonly contract-shape errors at local test fixture mutation sites in packages/kernel/test/kernel-assurance-campaign.test.js.
```

### Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm typecheck:phase1
```

Exit status after remediation: 0.

Bounded result:

```text
tsc -p tsconfig.json
```

Command:

```powershell
pnpm test:kernel
```

First required rerun exit status: 0.

Bounded result summary:

```text
tests 474
pass 474
fail 0
```

Command:

```powershell
pnpm test:kernel
```

Second required rerun exit status: 0.

Bounded result summary:

```text
tests 474
pass 474
fail 0
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 474 pass, 0 fail.
git diff --check exit status 0.
```

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result: no whitespace errors.

### Scope And Forbidden Surface Inspection

Command:

```powershell
Get-ChildItem -LiteralPath 'packages' -Directory -Force | Select-Object Name
```

Exit status: 0.

Bounded result:

```text
contracts
kernel
```

Interpretation: no production package outside `packages/contracts` and `packages/kernel` exists.

Command:

```powershell
rg -n "node:fs|node:child_process|node:http|node:https|node:net|node:dns|fetch\(|axios|octokit|github|openai|anthropic|Date\.now|Math\.random|randomUUID|crypto\.randomUUID" packages/kernel/src packages/contracts/src
```

Exit status: 1.

Bounded result: no matches.

Interpretation: production source did not introduce repository inspection, target-code execution, verification execution, network, provider, time, random, or UUID authority paths.

Command:

```powershell
rg -n "test\.skip|test\.todo|\.skip\(|\.todo\(|assert\.doesNotThrow|no throw|does not throw" packages/kernel/test
```

Exit status: 1.

Bounded result: no matches.

Interpretation: the kernel test tree contains no skipped/todo tests and no no-throw-only assertion pattern.

Command:

```powershell
rg -n "modelConfidence|inferenceProposal|proposedContent|KERNEL_EVIDENCE_REQUIREMENT_MISSING|HARN_" packages/kernel/test/kernel-assurance-campaign.test.js packages/kernel/src
```

Exit status: 0.

Bounded result summary:

```text
The campaign includes representative rejection cases for modelConfidence, inferenceProposal, and proposedContent.
KERNEL_EVIDENCE_REQUIREMENT_MISSING has one production literal declaration in packages/kernel/src/kernel-reason-codes.js.
HARN_ appears in production only in Rule reason-code rejection logic.
```

### Changed File Set

Command:

```powershell
git status -sb
```

Observed bounded result before this evidence update:

```text
## phase1/kernel-assurance-campaign-1...origin/phase1/kernel-assurance-campaign-1
?? docs/engineering/kernel-assurance-campaign.md
?? docs/reviews/kernel-assurance-campaign-builder-review.md
?? packages/kernel/test/kernel-assurance-campaign.test.js
```

After this evidence update, `docs/engineering/validation-evidence.md` is also part of the task-local changed file set.

All changed paths are within `KERNEL-ASSURE-001` `scope.write`.

### Verify No-Mutation Observation

The observed `pnpm verify` run completed after the campaign and review documents were created and before this validation-evidence section was appended.

Bounded result summary:

```text
pnpm verify exit status 0.
No generated or build-output artifact appeared in the worktree during the observed verification sequence.
```

## KERNEL-ASSURE-CONV-001 Validation Evidence

Date: 2026-07-09.

Task identity: `KERNEL-ASSURE-CONV-001`.

Branch:

```text
phase1/kernel-assurance-campaign-1
```

Pre-convergence local HEAD after fetch and fast-forward:

```text
6192931034f4fd5805c6ed22a7f81597e95de53c
```

This section records Builder validation for the assurance convergence update. It is not independent acceptance, does not claim Phase 1 completion, and is not a Proofrail product Verdict.

### Authority Read

The Builder read `governance/tasks/KERNEL-ASSURE-CONV-001.json` and every path listed in its `authority.read` before convergence edits:

```text
AGENTS.md
docs/constitution/terminology.md
docs/constitution/trust-model.md
docs/architecture/data-flow.md
docs/architecture/dependency-rules.md
docs/architecture/inference-boundary.md
docs/product/verdict-semantics.md
docs/protocols/evidence-schema.md
docs/protocols/policy-schema.md
docs/protocols/bundle-format.md
docs/engineering/kernel-vertical-slice.md
docs/engineering/kernel-assurance-campaign.md
docs/engineering/validation-evidence.md
docs/engineering/machine-task-contract.md
docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md
docs/reviews/kernel-assurance-campaign-builder-review.md
governance/tasks/KERNEL-ASSURE-001.json
packages/contracts/src/index.d.ts
packages/contracts/src/index.js
packages/kernel/src/index.js
packages/kernel/src/boundary-validation.js
packages/kernel/src/normalization.js
packages/kernel/src/canonical-json.js
packages/kernel/src/evidence-satisfaction.js
packages/kernel/src/rule-evaluation.js
packages/kernel/src/verdict-reduction.js
packages/kernel/src/bundle-finalization.js
packages/kernel/src/deep-freeze.js
packages/kernel/src/kernel-reason-codes.js
packages/kernel/test/helpers.js
packages/kernel/test/boundary-validation.test.js
packages/kernel/test/kernel-vertical-slice.test.js
packages/kernel/test/verdict-reduction.test.js
packages/kernel/test/immutability.test.js
packages/kernel/test/kernel-assurance-campaign.test.js
```

### Convergence Changes

The convergence update changed only these paths before the measured `pnpm verify` run:

```text
docs/engineering/kernel-assurance-campaign.md
docs/engineering/validation-evidence.md
docs/reviews/kernel-assurance-campaign-builder-review.md
packages/kernel/test/kernel-assurance-campaign.test.js
```

All changed paths are within `KERNEL-ASSURE-CONV-001` `scope.write`.

The assurance campaign now contains 401 generated stable identified assurance cases:

```text
primitive: 144
permutation: 16
rule-matrix: 16
verdict-reference: 15
boundary-record: 96
boundary-array: 63
boundary-value: 16
boundary-wrapper: 7
boundary-reference: 16
lineage: 4
isolation: 2
immutability: 3
canonical-json: 3
```

The prior 16 index-shaped permutation variants were audited and replaced with 16 named dimensions. The retained dimensions cover distinct reviewable paths: all-present Rule denial, missing-requirement reason retention, non-triggered Rule admissibility, revision-only missing Evidence, absence-triggered denial, single-present multiple-missing handling, all-missing revision handling, two triggered denials, Trusted Configuration Rule authority, deterministic Policy selection provenance, duplicate accepted Observations, unmatched limited Observations, and string, number, null, and false primitive satisfaction. No permutation case is retained merely to satisfy the 256-case threshold.

The test-only Verdict reference oracle no longer uses the production reducer's ordered-array plus rank-map structure. The oracle selects the winning Verdict through explicit high-precedence containment checks, orders candidates through explicit per-Verdict buckets, and independently checks published precedence output, candidate ordering, reason retention, and lineage retention for every non-empty canonical Verdict combination.

Caller-input assurance now includes a direct pre/post non-mutation case using a representative multi-requirement input through both `evaluateKernel` and `evaluate`. Post-evaluation mutation isolation remains a separate case. Evidence Lineage coverage now checks concrete `VERDICT_CANDIDATE_CLASSIFIED` reference fields and values for `ADMISSIBLE`, `REVISION_REQUIRED`, and `REJECTED` paths.

### Builder Findings And Remediation

Finding `KASS-CONV-001` fixed correlated Verdict reference-oracle risk by replacing the mirrored rank-map oracle with explicit high-precedence containment and per-Verdict bucket ordering.

Finding `KASS-CONV-002` fixed near-duplicate permutation case inflation by diversifying the 16 retained permutation cases into named dimensions with distinct paths and invariants.

Finding `KASS-CONV-003` fixed incomplete caller-input and candidate-classification lineage coverage by adding direct caller non-mutation checks and concrete candidate-classification reference assertions.

Finding `KASS-CONV-004` fixed validation evidence that previously stated 17 Rule matrix subcases failed. The corrected record states that the generated Rule matrix contains 16 identified subcases and does not claim an exact enclosing parent-test breakdown.

Finding `KASS-CONV-005` fixed a Builder harness typecheck issue after convergence edits by adding a local evaluator tuple annotation and explicit callback parameter annotations.

No production kernel defect was discovered by this convergence update, so no production source remediation was required.

### Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm typecheck:phase1
```

Initial exit status after convergence harness edits: 1.

Initial bounded result summary:

```text
packages/kernel/test/kernel-assurance-campaign.test.js evaluator tuple inferred as mixed string/function values; two local find callbacks had implicit any parameters.
```

Remediation: added a local evaluator tuple annotation and explicit local callback parameter annotations.

Rerun exit status: 0.

Bounded result:

```text
tsc -p tsconfig.json
```

Command:

```powershell
pnpm test:kernel
```

Focused post-remediation exit status: 0.

Bounded result summary:

```text
tests 475
pass 475
fail 0
generated assurance cases 401
```

Command:

```powershell
pnpm test:kernel
```

First required full rerun exit status: 0.

Bounded result summary:

```text
tests 475
pass 475
fail 0
generated assurance cases 401
```

Command:

```powershell
pnpm test:kernel
```

Second required full rerun exit status: 0.

Bounded result summary:

```text
tests 475
pass 475
fail 0
generated assurance cases 401
```

### Deterministic Verify No-Mutation Comparison

This comparison was performed after convergence implementation, assurance documentation, Builder review, and the prior validation-evidence correction were otherwise complete. This `KERNEL-ASSURE-CONV-001` validation-evidence section was appended after the measured `pnpm verify` run to record the result, so the comparison is evidence for the pre-append convergence diff and does not overclaim exact-head execution after this evidence append.

Tracked diff comparison method:

```powershell
git diff --binary | git hash-object --stdin
```

Sorted status comparison method:

```powershell
git status --short --untracked-files=all | Sort-Object
```

Pre-verify tracked diff hash:

```text
4f731b90edb95ea5dae007705bb4c5c4f1a1b535
```

Pre-verify sorted status:

```text
 M docs/engineering/kernel-assurance-campaign.md
 M docs/engineering/validation-evidence.md
 M docs/reviews/kernel-assurance-campaign-builder-review.md
 M packages/kernel/test/kernel-assurance-campaign.test.js
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 475 pass, 0 fail.
git diff --check exit status 0 with Git line-ending conversion warnings for modified text files.
```

Post-verify tracked diff hash:

```text
4f731b90edb95ea5dae007705bb4c5c4f1a1b535
```

Post-verify sorted status:

```text
 M docs/engineering/kernel-assurance-campaign.md
 M docs/engineering/validation-evidence.md
 M docs/reviews/kernel-assurance-campaign-builder-review.md
 M packages/kernel/test/kernel-assurance-campaign.test.js
```

Interpretation: the pre/post tracked diff hash matched and the sorted status matched exactly. No tracked or untracked repository artifact changed during the measured `pnpm verify` run. Git emitted line-ending conversion warnings while hashing/checking the modified text files; those warnings did not correspond to a status or tracked-diff change.

### Standalone Validator Commands

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported line-ending conversion warnings for modified text files and no whitespace errors.

### Audit Searches And Scope Inspection

Command:

```powershell
rg -n "test\.skip|test\.todo|test\.only|\.skip\(|\.todo\(|\.only\(|assert\.doesNotThrow|no throw|does not throw" packages/kernel/test
```

Exit status: 1.

Bounded result: no matches.

Interpretation: no skipped/todo/only tests and no no-throw-only assertion pattern were found in the kernel test tree.

Command:

```powershell
rg -n "node:fs|node:child_process|node:http|node:https|node:net|node:dns|fetch\(|axios|octokit|github|openai|anthropic|Date\.now|Math\.random|randomUUID|crypto\.randomUUID" packages/kernel/src packages/contracts/src
```

Exit status: 1.

Bounded result: no matches.

Interpretation: production source did not introduce repository inspection, target-code execution, verification execution, network, provider, time, random, or UUID authority paths.

Command:

```powershell
Get-ChildItem -LiteralPath packages -Directory -Force | Select-Object Name
```

Exit status: 0.

Bounded result:

```text
contracts
kernel
```

Interpretation: no production package outside `packages/contracts` and `packages/kernel` exists.

Command:

```powershell
git diff --name-only origin/phase1/kernel-assurance-campaign-1 -- AGENTS.md README.md docs/constitution docs/architecture docs/product docs/protocols docs/quality docs/engineering/machine-task-contract.md packages/contracts scripts tests .github package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json governance/generated governance/foundation.config.json governance/foundation.config.schema.json governance/machine-task-contract.schema.json governance/harness-reason-codes.json governance/harness-reason-codes.schema.json
```

Exit status: 0.

Bounded result: no output.

Interpretation: convergence changes did not alter read-only authority or forbidden paths relative to `origin/phase1/kernel-assurance-campaign-1`.

Command:

```powershell
rg -n "VERDICT_RANK|VERDICT_PRECEDENCE|referenceRank|maxVerdictByReference|referenceReduce\(|independentlySelectWinningVerdict|independentlyOrderCandidates|reduceVerdictCandidates" packages/kernel/test/kernel-assurance-campaign.test.js packages/kernel/src/verdict-reduction.js
```

Exit status: 0.

Bounded result summary:

```text
The production reducer still contains VERDICT_PRECEDENCE, VERDICT_RANK, and reduceVerdictCandidates.
The assurance test imports and calls reduceVerdictCandidates only as the production subject under test.
The test-only reference oracle is implemented by referenceReduce, independentlySelectWinningVerdict, and independentlyOrderCandidates.
No VERDICT_RANK, VERDICT_PRECEDENCE, referenceRank, or maxVerdictByReference symbol remains in the test file.
```

### Builder Status

`KERNEL-ASSURE-CONV-001` is BUILDER_READY_FOR_REVIEW. This status is repository engineering readiness for independent review, not Proofrail product acceptance.

## OPS-AUTO-001 Validation Evidence

Date: 2026-07-08.

Task identity: `OPS-AUTO-001`.

Builder status: `BUILDER_READY_FOR_REVIEW`. This is not independent acceptance, not a trusted release decision, and not a Proofrail product Verdict.

### Branch And Authority Preflight

Command:

```powershell
git fetch origin
```

Exit status: 0 after explicit user-requested remote refresh and escalated network access.

Bounded result summary:

```text
origin/governance/autonomous-execution-defaults-1 was fetched.
```

Command:

```powershell
git switch --track origin/governance/autonomous-execution-defaults-1
```

Exit status: 0 after escalated Git metadata access.

Bounded result:

```text
branch 'governance/autonomous-execution-defaults-1' set up to track 'origin/governance/autonomous-execution-defaults-1'.
Switched to a new branch 'governance/autonomous-execution-defaults-1'
```

Required authority documents read before edits:

```text
AGENTS.md
docs/engineering/machine-task-contract.md
docs/engineering/clean-agent-test.md
docs/constitution/product-constitution.md
docs/constitution/trust-model.md
docs/architecture/dependency-rules.md
docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md
```

Authority-change preflight result:

```text
Current Machine Task Contract: governance/tasks/OPS-AUTO-001.json.
Target authority-bearing paths edited: AGENTS.md and docs/engineering/machine-task-contract.md.
Both targets are authorized by scope.write.
Neither target is listed in scope.read_only_authority or scope.forbidden.
authority.mayChangeAuthority is exactly true.
The task objective and acceptance requirements cover autonomous execution guidance and Machine Task Contract interpretation guidance.
```

### Required Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 72 pass, 0 fail.
git diff --check exit status 0 with Git line-ending conversion warnings for modified text files.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported line-ending conversion warnings for modified text files and no whitespace errors.

### Scope And Invariant Checks

Command:

```powershell
git status --short
```

Exit status: 0.

Bounded result:

```text
 M AGENTS.md
 M docs/engineering/machine-task-contract.md
 M docs/engineering/validation-evidence.md
?? docs/reviews/autonomous-execution-defaults-builder-review.md
```

Interpretation: the changed and new files are within `OPS-AUTO-001` writable scope.

Command:

```powershell
git diff --name-only -- README.md docs/constitution docs/architecture docs/product docs/protocols docs/quality packages scripts tests .github package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json governance/generated governance/foundation.config.json governance/foundation.config.schema.json governance/machine-task-contract.schema.json governance/harness-reason-codes.json governance/harness-reason-codes.schema.json
```

Exit status: 0.

Bounded result: no output.

Interpretation: no forbidden path or read-only authority path was changed by the tracked diff at the time of inspection.

Command:

```powershell
rg -n "not an implementation script|not a prescribed step-by-step implementation procedure|ordinary reversible implementation choices|Higher risk SHOULD normally increase evidence requirements|does not weaken authority-change preflight|does not grant acceptance|not a Proofrail product Verdict|not independent acceptance" AGENTS.md docs/engineering/machine-task-contract.md docs/reviews/autonomous-execution-defaults-builder-review.md
```

Exit status: 0.

Bounded result summary: Matches show autonomous execution is framed as contract-bounded, not procedural; ordinary reversible choices are autonomous inside granted authority; higher risk increases evidence and review depth before reducing autonomy; autonomous execution does not weaken authority-change preflight or grant acceptance; and Builder review does not claim independent acceptance or a product Verdict.

### Builder Review

Builder review is recorded in [../reviews/autonomous-execution-defaults-builder-review.md](../reviews/autonomous-execution-defaults-builder-review.md).

Open Builder risk: independent review must inspect the exact pull request head. Builder review, local verification, and Builder claim do not replace independent acceptance.

## OPS-AUTO-CONV-001 Validation Evidence

Date: 2026-07-09.

Task identity: `OPS-AUTO-CONV-001`.

Builder status: `BUILDER_READY_FOR_REVIEW`. This is repository engineering readiness for independent review only. It is not independent acceptance, not a trusted release decision, and not a Proofrail product Verdict.

### Authority Read

The Builder read `governance/tasks/OPS-AUTO-CONV-001.json` and every path listed in its `authority.read` set. The KERNEL-ASSURE documents and test file named by `authority.read` were not present on the PR branch before `origin/main` integration; they were read after the main merge populated them:

```text
AGENTS.md
docs/engineering/machine-task-contract.md
docs/engineering/clean-agent-test.md
docs/engineering/validation-evidence.md
docs/engineering/kernel-assurance-campaign.md
docs/reviews/autonomous-execution-defaults-builder-review.md
docs/constitution/product-constitution.md
docs/constitution/trust-model.md
docs/architecture/dependency-rules.md
docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md
governance/tasks/OPS-AUTO-001.json
governance/tasks/KERNEL-ASSURE-001.json
governance/tasks/KERNEL-ASSURE-CONV-001.json
packages/kernel/test/kernel-assurance-campaign.test.js
```

### Main Baseline Integration

Command:

```powershell
git fetch origin
```

Exit status: 0 after explicit user-requested remote refresh and escalated Git metadata access.

Bounded result summary:

```text
origin/governance/autonomous-execution-defaults-1 advanced from 22f1569 to be1cbbb.
origin/main advanced from 051f1a8 to ecb10ed.
```

Command:

```powershell
git rev-parse origin/main
```

Exit status: 0.

Bounded result:

```text
ecb10ed4723fce3d250f8a02468a4afadd638786
```

Command:

```powershell
git merge-base --is-ancestor ecb10ed4723fce3d250f8a02468a4afadd638786 origin/main
```

Exit status: 0.

Command:

```powershell
git log --oneline ecb10ed4723fce3d250f8a02468a4afadd638786..origin/main
```

Exit status: 0.

Bounded result: no output.

Interpretation: current `origin/main` was exactly `ecb10ed4723fce3d250f8a02468a4afadd638786`; no additional main commits required separate inspection.

Command:

```powershell
git merge origin/main
```

Exit status: 1.

Bounded result summary:

```text
Auto-merging docs/engineering/validation-evidence.md
CONFLICT (content): Merge conflict in docs/engineering/validation-evidence.md
Automatic merge failed; fix conflicts and then commit the result.
```

Conflict disposition: the conflict was an append-location conflict in `docs/engineering/validation-evidence.md`, not a product, trust, Verdict, Evidence authority, or governance-text semantic conflict. The resolution retained main's complete `KERNEL-ASSURE-001` and `KERNEL-ASSURE-CONV-001` validation evidence and retained PR #9's complete `OPS-AUTO-001` validation evidence as separate historical sections. Historical evidence was not rewritten as newly executed convergence evidence.

The autonomous-execution governance text in `AGENTS.md` and `docs/engineering/machine-task-contract.md` did not conflict during the merge and was preserved materially unchanged from PR #9.

### Authority-Change Preflight

Target path: `docs/engineering/validation-evidence.md`.

Why authority-bearing: the file declares an `Authority` section and records Builder validation evidence for independent review.

Current Machine Task Contract: `OPS-AUTO-CONV-001`.

Preflight result:

```text
scope.write authorizes docs/engineering/validation-evidence.md.
scope.read_only_authority does not exclude docs/engineering/validation-evidence.md.
scope.forbidden does not exclude docs/engineering/validation-evidence.md.
authority.mayChangeAuthority is exactly true.
The task objective and acceptance requirements explicitly cover validation-evidence conflict resolution and post-main convergence evidence.
```

### Required Verification Commands

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

### Deterministic Verify No-Mutation Comparison

Comparison method:

```powershell
git diff HEAD --binary | git hash-object --stdin
git status --short | Sort-Object
pnpm verify
git diff HEAD --binary | git hash-object --stdin
git status --short | Sort-Object
```

Sequencing limitation: this comparison was performed after main integration conflict resolution and the Builder review update were otherwise complete, but before appending this `OPS-AUTO-CONV-001` evidence section. The evidence append itself necessarily changes the tracked diff after the measured `pnpm verify`; the comparison is evidence that `pnpm verify` did not mutate the repository state it was run against.

Pre-verify tracked diff hash:

```text
994cb61dc0ff15433f4a106f680ee7828f6b4604
```

Pre-verify sorted status:

```text
A  docs/engineering/kernel-assurance-campaign.md
A  docs/reviews/kernel-assurance-campaign-builder-review.md
A  governance/tasks/KERNEL-ASSURE-001.json
A  governance/tasks/KERNEL-ASSURE-CONV-001.json
A  packages/kernel/test/kernel-assurance-campaign.test.js
M  docs/engineering/validation-evidence.md
M  docs/reviews/autonomous-execution-defaults-builder-review.md
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 475 pass, 0 fail.
git diff --check exit status 0.
```

Post-verify tracked diff hash:

```text
994cb61dc0ff15433f4a106f680ee7828f6b4604
```

Post-verify sorted status:

```text
A  docs/engineering/kernel-assurance-campaign.md
A  docs/reviews/kernel-assurance-campaign-builder-review.md
A  governance/tasks/KERNEL-ASSURE-001.json
A  governance/tasks/KERNEL-ASSURE-CONV-001.json
A  packages/kernel/test/kernel-assurance-campaign.test.js
M  docs/engineering/validation-evidence.md
M  docs/reviews/autonomous-execution-defaults-builder-review.md
```

Interpretation: pre/post tracked diff hash and sorted status matched exactly. No tracked or untracked repository artifact changed during the measured `pnpm verify` run.

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result: no output.

Additional staged-and-unstaged whitespace check:

```powershell
git diff HEAD --check
```

Exit status: 0.

Bounded result: no output.

### Scope Inspection

Command:

```powershell
git diff --name-only origin/main | Sort-Object
```

Exit status: 0.

Bounded result:

```text
AGENTS.md
docs/engineering/machine-task-contract.md
docs/engineering/validation-evidence.md
docs/reviews/autonomous-execution-defaults-builder-review.md
governance/tasks/OPS-AUTO-001.json
governance/tasks/OPS-AUTO-CONV-001.json
```

Command:

```powershell
git diff --name-only origin/main -- README.md docs/constitution docs/architecture docs/product docs/protocols docs/quality packages scripts tests .github package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json governance/generated governance/foundation.config.json governance/foundation.config.schema.json governance/machine-task-contract.schema.json governance/harness-reason-codes.json governance/harness-reason-codes.schema.json | Sort-Object
```

Exit status: 0.

Bounded result: no output.

Interpretation: the remaining PR #9 delta from current `origin/main` is limited to the OPS-AUTO / OPS-AUTO-CONV writable governance, review, and evidence paths. No package, production code, generated governance, script, dependency, product, protocol, architecture, trust, Verdict, or quality authority path is changed by the post-main branch delta.

Command:

```powershell
rg -n "Autonomous Execution Default|not a prescribed step-by-step implementation procedure|ordinary reversible implementation choices|Higher risk SHOULD normally increase evidence requirements|Agent action is not an approved change|Autonomous remediation does not grant|Authority-Change Preflight|self-grant|independent review" AGENTS.md docs/engineering/machine-task-contract.md docs/reviews/autonomous-execution-defaults-builder-review.md
```

Exit status: 0.

Bounded result summary: matches show the autonomous-execution guidance remains contract-bounded, preserves Authority-Change Preflight, preserves the self-grant prohibition and independent review boundary, keeps ordinary reversible choices autonomous inside granted authority, and preserves the separation between agent action, approved repository change, trusted release, and product Verdict authority.

### Builder Review

Builder review was updated in [../reviews/autonomous-execution-defaults-builder-review.md](../reviews/autonomous-execution-defaults-builder-review.md) with post-main finding `OPS-AUTO-BR-008`.

Open Builder risk remains: independent review must inspect the exact pull request head. Builder review, local verification, and Builder claim do not replace independent acceptance.

## KERNEL-VS-CONV-003 Validation Evidence

Date: 2026-07-08.

Task identity: `KERNEL-VS-CONV-003`.

Review subject preflight:

```text
git rev-parse --show-toplevel
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail

git remote -v
origin https://github.com/gogun-rgb/proofrail.git (fetch)
origin https://github.com/gogun-rgb/proofrail.git (push)

git status --short
<no output>

git branch --show-current
phase1/kernel-vertical-slice-1

git rev-parse HEAD
5d05fe7e89f576860912afb35a102b2cc9f529ac

git fetch origin --prune
exit status 0

gh pr view 5 --json state,isDraft,mergeable,baseRefName,headRefName,headRefOid,mergedAt
{"baseRefName":"main","headRefName":"phase1/kernel-vertical-slice-1","headRefOid":"5d05fe7e89f576860912afb35a102b2cc9f529ac","isDraft":false,"mergeable":"MERGEABLE","mergedAt":null,"state":"OPEN"}
```

### KVS-BND-004 Boundary Results

Focused tests were added in `packages/kernel/test/boundary-validation.test.js`.

Observed results from `pnpm test:kernel`:

```text
root string __proto__: KernelBoundaryError UNEXPECTED_FIELD at $.__proto__
root null __proto__: KernelBoundaryError UNEXPECTED_FIELD at $.__proto__
JSON.parse-compatible __proto__ data property: KernelBoundaryError UNEXPECTED_FIELD at $.__proto__
evaluation __proto__: KernelBoundaryError UNEXPECTED_FIELD at $.evaluation.__proto__
Observation __proto__: KernelBoundaryError UNEXPECTED_FIELD at $.observations[0].__proto__
Rule effect __proto__: KernelBoundaryError UNEXPECTED_FIELD at $.rules[0].effect.__proto__
Evidence Contract selection provenance __proto__: KernelBoundaryError UNEXPECTED_FIELD at $.evidenceContracts[0].selectionProvenance.__proto__
repeated malformed root string __proto__: same issue category UNEXPECTED_FIELD and path $.__proto__
valid null-prototype plain root record: accepted; bundle Verdict ADMISSIBLE
```

Regression preservation observed in the same `pnpm test:kernel` runs:

```text
previous Array prototype regressions: null-prototype arrays, Array subclass instances, and custom Array prototype attempts remain rejected with KernelBoundaryError INVALID_ARRAY; ordinary dense Arrays remain accepted
previous Proxy regressions: Proxy-backed authoritative values remain rejected with KernelBoundaryError PROXY_INPUT before trap-capable inspection; trap execution counters remain 0
sparse Array and accessor-backed Array regressions: remain rejected; accessor getter execution count remains 0
reserved Rule reason code: KERNEL_EVIDENCE_REQUIREMENT_MISSING remains rejected at $.rules[0].effect.reasonCode
HARN_ Rule reason code: remains rejected as RESERVED_REASON_CODE_NAMESPACE
Observation declared-evaluation-scope validation: out-of-scope Observation remains rejected at $.observations[0].targetScopeId
Claim-is-not-Evidence, exact Observation satisfaction, Verdict precedence, lower-precedence reason retention, deterministic identities, Evidence Lineage, and deep bundle immutability regressions remain covered by the 72-test kernel suite
```

Implementation observations:

```text
Authoritative plain-object cloning now creates Object.create(null) records.
Every scanned own enumerable string key is materialized with Object.defineProperty as an own data property.
No arbitrary caller-owned string key is cloned through const cloned = {}; cloned[key] = value.
The only remaining cloned[...] assignment in packages/kernel/src is Array indexed cloning over validated dense own data indices.
```

### Command Results

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm typecheck:phase1
```

Initial exit status after implementation edits: 1.

Initial bounded result summary:

```text
packages/kernel/test/boundary-validation.test.js indexed fixture entries were possibly undefined
```

Remediation: cast the two known fixture entries used by the new focused tests.

Rerun exit status: 0.

Bounded result:

```text
tsc -p tsconfig.json
```

Command:

```powershell
pnpm test:kernel
```

Exit status: 0.

Bounded result summary:

```text
tests 72
pass 72
fail 0
```

Kernel tests were run multiple times after implementation and typecheck remediation. The final observed kernel test count before this evidence update was 72.

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 72 pass, 0 fail.
git diff --check exit status 0 with Git line-ending conversion warnings for modified text files.
```

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Foundation JSON status: `VALID`.

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported line-ending conversion warnings for modified text files and no whitespace errors.

### Boundary Searches And Scope Inspection

Command:

```powershell
rg --line-number "cloned\[key\] =|const cloned = \{\}" packages\kernel\src
```

Exit status: 1.

Bounded result: no matches.

Interpretation: no ordinary-object arbitrary-key clone materialization remains.

Command:

```powershell
rg --line-number "const cloned = \{\}|cloned\[key\]|cloned\[" packages\kernel\src
```

Exit status: 0.

Bounded result:

```text
packages\kernel\src\boundary-validation.js:676:      cloned[index] = cloneJsonCompatible(value[index], pathForArrayItem(path, index));
```

Interpretation: the remaining `cloned[...]` assignment is validated Array indexed cloning, not arbitrary plain-object key materialization.

Command:

```powershell
rg --line-number "__proto__" packages\kernel docs\engineering\kernel-vertical-slice.md docs\reviews\kernel-vertical-slice-convergence-3-review.md governance\tasks\KERNEL-VS-CONV-003.json
```

Exit status: 0.

Bounded classification: `__proto__` hits are the externally supplied task contract, the implementation-record description, the third Builder convergence review, and focused boundary regression tests. No production source literal special-cases or drops `__proto__`.

Command:

```powershell
rg --line-number "Object\.create\(null\)|Object\.defineProperty|validateAuthoritativeArrayContainer|assertNotProxyInput|Array\.isArray|Object\.getPrototypeOf|Object\.getOwnPropertyDescriptors|Reflect\.ownKeys" packages\kernel\src\boundary-validation.js
```

Exit status: 0.

Bounded interpretation: `assertNotProxyInput` remains before `Array.isArray` and before Array container descriptor inspection in both recursive scan and clone paths. Plain-object clone materialization uses `Object.create(null)` and `Object.defineProperty`.

Command:

```powershell
rg --line-number "KERNEL_EVIDENCE_REQUIREMENT_MISSING" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result:

```text
packages\kernel\src\kernel-reason-codes.js:3:export const MISSING_EVIDENCE_REASON_CODE = "KERNEL_EVIDENCE_REQUIREMENT_MISSING";
```

Interpretation: one production literal declaration remains, in the internal kernel reason-code module.

Command:

```powershell
rg --line-number "HARN_" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result:

```text
packages\kernel\src\boundary-validation.js:314:  if (reasonCode.startsWith("HARN_")) {
packages\kernel\src\boundary-validation.js:315:    throwBoundaryError("RESERVED_REASON_CODE_NAMESPACE", `${path}.reasonCode`, "Foundation HARN_ reason codes are not product kernel reason codes");
```

Interpretation: `HARN_` appears only in Rule reason-code rejection logic.

Command:

```powershell
Get-ChildItem -LiteralPath 'packages' -Directory -Force | Select-Object Name
```

Exit status: 0.

Bounded result:

```text
contracts
kernel
```

Interpretation: no additional production package exists.

Command:

```powershell
git diff --name-only 5d05fe7e89f576860912afb35a102b2cc9f529ac -- AGENTS.md README.md docs/constitution docs/architecture docs/product docs/protocols docs/quality packages/contracts scripts tests .github package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json governance/generated governance/foundation.config.json governance/foundation.config.schema.json governance/machine-task-contract.schema.json governance/harness-reason-codes.json governance/harness-reason-codes.schema.json governance/tasks/KERNEL-VS-001.json governance/tasks/KERNEL-VS-CONV-001.json governance/tasks/KERNEL-VS-CONV-002.json
```

Exit status: 0.

Bounded result: no output.

Interpretation: convergence changes did not alter read-only authority or forbidden paths relative to the exact reviewed head `5d05fe7e89f576860912afb35a102b2cc9f529ac`.

Command:

```powershell
git status --short
```

Exit status: 0.

Bounded result:

```text
 M docs/engineering/kernel-vertical-slice.md
 M docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md
 M packages/kernel/src/boundary-validation.js
 M packages/kernel/test/boundary-validation.test.js
?? docs/reviews/kernel-vertical-slice-convergence-3-review.md
?? governance/tasks/KERNEL-VS-CONV-003.json
```

Interpretation: changed and new files are within `KERNEL-VS-CONV-003` writable scope.

### Diff Inspection

Commands:

```powershell
git diff --stat
git diff -- packages\kernel\src\boundary-validation.js packages\kernel\test\boundary-validation.test.js docs\engineering\kernel-vertical-slice.md docs\plans\active\phase-1-deterministic-kernel-vertical-slice.md
Get-Content -LiteralPath 'governance\tasks\KERNEL-VS-CONV-003.json'
Get-Content -LiteralPath 'docs\reviews\kernel-vertical-slice-convergence-3-review.md'
```

Exit status: 0 for each command.

Bounded result summary: The inspected diff contains only `KERNEL-VS-CONV-003` task materialization, the prototype-safe authoritative plain-object clone, focused `__proto__` and null-prototype regressions, implementation-record and active-plan status notes, validation evidence, and the third convergence Builder review.

### Final No-Mutation Check

Before the final observed `pnpm verify`, the tracked diff was hashed with:

```powershell
git diff --binary | git hash-object --stdin
```

Pre-verify hash:

```text
1b8af5da624584efea9987675ee728436aee1353
```

Untracked files before final observed `pnpm verify`:

```text
docs/reviews/kernel-vertical-slice-convergence-3-review.md
governance/tasks/KERNEL-VS-CONV-003.json
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 72 pass, 0 fail.
git diff --check exit status 0 with Git line-ending conversion warnings for modified text files.
```

After the final observed `pnpm verify`, the same hash command returned:

```text
1b8af5da624584efea9987675ee728436aee1353
```

The untracked file list after final observed `pnpm verify` matched the pre-verify list. No additional untracked repository artifact was created by `pnpm verify`.

### Boundary Searches And Package Inspection

Command:

```powershell
rg -n "node:fs|node:child_process|node:http|node:https|node:net|node:dns|fetch\(|axios|octokit|github|openai|anthropic|Date\.now|Math\.random|randomUUID" packages\contracts\src packages\kernel\src
```

Exit status: 1.

Bounded result: no matches.

Interpretation: no forbidden production-source import, network, provider, time, random, or UUID usage was found.

Command:

```powershell
rg -n "HARN_" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result:

```text
packages\kernel\src\boundary-validation.js:310:  if (reasonCode.startsWith("HARN_")) {
packages\kernel\src\boundary-validation.js:311:    throwBoundaryError("RESERVED_REASON_CODE_NAMESPACE", `${path}.reasonCode`, "Foundation HARN_ reason codes are not product kernel reason codes");
```

Interpretation: `HARN_` appears only in Rule reason-code rejection logic.

Command:

```powershell
rg -n "KERNEL_EVIDENCE_REQUIREMENT_MISSING" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result:

```text
packages\kernel\src\kernel-reason-codes.js:3:export const MISSING_EVIDENCE_REASON_CODE = "KERNEL_EVIDENCE_REQUIREMENT_MISSING";
```

Interpretation: the exact missing-Evidence condition code has one production-source literal declaration in the internal kernel reason-code module. Evidence satisfaction and boundary validation import that declaration. Rule use of the exact code is rejected at the public kernel boundary.

Command:

```powershell
Get-ChildItem -LiteralPath 'packages' -Directory -Force | Select-Object Name
```

Exit status: 0.

Bounded result:

```text
contracts
kernel
```

Interpretation: no additional production package exists.

### Scope Boundary Checks

Command:

```powershell
git diff --name-only ee7b348868ab8ab342bb2ea6eb57f4b2477516b2 -- AGENTS.md README.md docs\constitution docs\architecture docs\product docs\protocols docs\quality packages\contracts scripts tests .github package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json governance\generated governance\foundation.config.json governance\foundation.config.schema.json governance\machine-task-contract.schema.json governance\harness-reason-codes.json governance\harness-reason-codes.schema.json
```

Exit status: 0.

Bounded result: no output.

Interpretation: convergence changes did not alter read-only authority or forbidden paths relative to the exact reviewed head.

Command:

```powershell
git diff --name-only e2964c726614d67c0e01239463e943b2e21189b2 -- AGENTS.md README.md docs\constitution docs\architecture docs\product docs\protocols docs\quality packages\contracts scripts tests .github package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json governance\generated governance\foundation.config.json governance\foundation.config.schema.json governance\machine-task-contract.schema.json governance\harness-reason-codes.json governance\harness-reason-codes.schema.json
```

Exit status: 0.

Bounded result:

```text
README.md
package.json
packages/contracts/package.json
packages/contracts/src/index.d.ts
packages/contracts/src/index.js
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.json
```

Interpretation: these are pre-existing KERNEL-VS-001 implementation differences from the older Phase 1 baseline, not KERNEL-VS-CONV-001 convergence changes from the reviewed head.

### Diff Inspection

Commands:

```powershell
git diff --stat
git diff -- docs\engineering\kernel-vertical-slice.md docs\plans\active\phase-1-deterministic-kernel-vertical-slice.md packages\kernel\src\boundary-validation.js packages\kernel\src\evidence-satisfaction.js packages\kernel\test\boundary-validation.test.js packages\kernel\test\kernel-vertical-slice.test.js
Get-Content -Raw -LiteralPath 'packages\kernel\src\kernel-reason-codes.js'
Get-Content -Raw -LiteralPath 'docs\reviews\kernel-vertical-slice-convergence-review.md'
Get-Content -Raw -LiteralPath 'governance\tasks\KERNEL-VS-CONV-001.json'
```

Exit status: 0 for each command.

Bounded result summary: The inspected diff contains only KERNEL-VS-CONV-001 task materialization, kernel boundary/reason-code/scope remediation, focused tests, implementation-record status notes, and the convergence Builder review. No Builder-discovered CRITICAL or HIGH findings remained open after this inspection.

## KERNEL-VS-CONV-002 Validation Evidence

Date: 2026-07-08.

Task identity: `KERNEL-VS-CONV-002`.

Review subject preflight:

```text
git rev-parse --show-toplevel
C:/Users/zizon/Documents/Codex/2026-07-07/proofrail

git remote -v
origin https://github.com/gogun-rgb/proofrail.git (fetch)
origin https://github.com/gogun-rgb/proofrail.git (push)

git status --short
<no output>

git branch --show-current
phase1/kernel-vertical-slice-1

git rev-parse HEAD
dc729211c2dc90ee9d3e1270066d0971c067cb64

git fetch origin --prune
exit status 0

gh pr view 5 --json state,isDraft,mergeable,baseRefName,headRefName,headRefOid,mergedAt
{"baseRefName":"main","headRefName":"phase1/kernel-vertical-slice-1","headRefOid":"dc729211c2dc90ee9d3e1270066d0971c067cb64","isDraft":false,"mergeable":"MERGEABLE","mergedAt":null,"state":"OPEN"}
```

### KVS-BND-002 Boundary Results

Focused tests were added in `packages/kernel/test/boundary-validation.test.js`.

Observed results from `pnpm test:kernel`:

```text
null-prototype observations Array: KernelBoundaryError INVALID_ARRAY at $.observations
null-prototype rules Array: KernelBoundaryError INVALID_ARRAY at $.rules
Array subclass instance: KernelBoundaryError INVALID_ARRAY at $.observations
Array subclass overriding forEach: KernelBoundaryError INVALID_ARRAY at $.observations
Array subclass overriding map: KernelBoundaryError INVALID_ARRAY at $.observations
custom Array prototype skip-validation attempt: KernelBoundaryError INVALID_ARRAY at $.observations
custom Array prototype clone-substitution attempt: KernelBoundaryError INVALID_ARRAY at $.observations
nested Evidence Contract requirementIds non-ordinary prototype: KernelBoundaryError INVALID_ARRAY at $.evidenceContracts[0].requirementIds
nested Observation limitations non-ordinary prototype: KernelBoundaryError INVALID_ARRAY at $.observations[0].limitations
ordinary dense Array regression: accepted; bundle Verdict ADMISSIBLE
```

Execution counters:

```text
overridden forEach execution count: 0
overridden map execution count: 0
custom prototype skip-validation forEach execution count: 0
custom prototype clone-substitution map execution count: 0
previous accessor-backed numeric-index getter execution count: 0
```

Implementation observations:

```text
Authoritative Array container validation rejects direct prototypes other than Array.prototype.
Safe authoritative Array cloning uses bounded indexed reads over validated dense own data indices.
Safe authoritative Array cloning does not call value.map(...).
Semantic validation runs after structural cloning into kernel-owned ordinary Arrays.
```

### KVS-BND-003 Boundary Results

Focused tests were added in `packages/kernel/test/boundary-validation.test.js`.

Observed results from `pnpm test:kernel`:

```text
root Proxy: KernelBoundaryError PROXY_INPUT at $
evaluation Proxy: KernelBoundaryError PROXY_INPUT at $.evaluation
Observation Proxy: KernelBoundaryError PROXY_INPUT at $.observations[0]
observations Array Proxy: KernelBoundaryError PROXY_INPUT at $.observations
nested Observation limitations Proxy: KernelBoundaryError PROXY_INPUT at $.observations[0].limitations
Rule effect Proxy: KernelBoundaryError PROXY_INPUT at $.rules[0].effect
revoked Proxy: KernelBoundaryError PROXY_INPUT at $
descriptor-lie/value-substitution Proxy: KernelBoundaryError PROXY_INPUT at $.observations[0]
repeated root Proxy rejection: same category PROXY_INPUT and path $
```

Trap execution counters for early-rejected Proxy regressions:

```text
get trap execution count: 0
getPrototypeOf trap execution count: 0
ownKeys trap execution count: 0
getOwnPropertyDescriptor trap execution count: 0
```

Implementation observations:

```text
Proxy detection uses Node built-in util.types.isProxy.
The recursive Proxy guard runs before instanceof Date, instanceof Map, instanceof Set, Array.isArray, Object.getPrototypeOf, Object.getOwnPropertyDescriptors, Reflect.ownKeys, or caller property reads inspect a Proxy-backed value.
PROXY_INPUT is a KernelBoundaryError issue category only; it is not a Proofrail Verdict, Evidence, or product reason code.
```

### Command Results

Command:

```powershell
pnpm typecheck:phase1
```

Initial exit status after implementation edits: 1.

Initial bounded result summary:

```text
packages/kernel/src/boundary-validation.js direct Record-to-KernelEvaluationInput cast and missing clone helper path JSDoc
packages/kernel/test/boundary-validation.test.js possibly undefined fixture indexed accesses
```

Remediation: tightened the root cast through `unknown`, added the clone helper path JSDoc, and cast the two known fixture entries in tests.

Rerun exit status: 0.

Bounded result:

```text
tsc -p tsconfig.json
```

Command:

```powershell
pnpm test:kernel
```

Exit status: 0.

Bounded result summary:

```text
tests 64
pass 64
fail 0
```

Kernel tests were run multiple times after implementation and typecheck remediation. The final observed kernel test count before this evidence update was 64.

Command:

```powershell
pnpm governance:check
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
pnpm governance:check-json
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
pnpm test:governance
```

Exit status: 0.

Bounded result summary:

```text
tests 37
pass 37
fail 0
```

Command:

```powershell
pnpm typecheck:phase1
```

Final observed exit status before this evidence update: 0.

Bounded result:

```text
tsc -p tsconfig.json
```

Command:

```powershell
pnpm test:kernel
```

First required rerun exit status: 0.

Bounded result summary:

```text
tests 64
pass 64
fail 0
```

Command:

```powershell
pnpm test:kernel
```

Second required rerun exit status: 0.

Bounded result summary:

```text
tests 64
pass 64
fail 0
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 64 pass, 0 fail.
git diff --check exit status 0 with Git line-ending conversion warnings for modified text files.
```

Command:

```powershell
node scripts/validate-foundation.mjs
```

Exit status: 0.

Bounded result:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
```

Command:

```powershell
node scripts/validate-foundation.mjs --format json
```

Exit status: 0.

Bounded result:

```json
{
  "findings": [],
  "schemaVersion": "1",
  "status": "VALID"
}
```

Command:

```powershell
node scripts/governance/verify-json-output.mjs
```

Exit status: 0.

Bounded result:

```text
Foundation JSON validation output parsed as VALID.
```

Command:

```powershell
git diff --check
```

Exit status: 0.

Bounded result summary: Git reported line-ending conversion warnings for modified text files and no whitespace errors.

### Boundary Searches And Scope Inspection

Command:

```powershell
rg -n "\.forEach\(|\.map\(|\.filter\(|\.find\(|\.sort\(|\.flatMap\(|Symbol\.iterator|\.\.\." packages\kernel\src
```

Exit status: 0.

Bounded interpretation: relevant `packages/kernel/src/boundary-validation.js` semantic-validation Array method hits occur after `cloneJsonCompatible(input, "$")` creates a kernel-owned clone. `packages/kernel/src/normalization.js`, `evidence-satisfaction.js`, `rule-evaluation.js`, `bundle-finalization.js`, `canonical-json.js`, and `verdict-reduction.js` operate on normalized, finalized, or internally created kernel-owned Arrays. The authoritative clone path no longer contains `value.map(...)`.

Command:

```powershell
rg -n "assertNotProxyInput|instanceof Date|Array\.isArray|Object\.getPrototypeOf|Object\.getOwnPropertyDescriptors|Reflect\.ownKeys" packages\kernel\src\boundary-validation.js
```

Exit status: 0.

Bounded result summary:

```text
assertNotProxyInput at line 109 before instanceof Date at line 111 and Array.isArray at line 126.
assertNotProxyInput at line 670 before Array.isArray at line 671 in the safe clone helper.
Object.getPrototypeOf and Object.getOwnPropertyDescriptors are reached only after the Proxy guard for the current value.
ownEnumerableStringKeys descriptor inspection is reached only after the caller has already passed recursive scan and clone Proxy guards.
```

Command:

```powershell
rg -n "KERNEL_EVIDENCE_REQUIREMENT_MISSING" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result:

```text
packages\kernel\src\kernel-reason-codes.js:3:export const MISSING_EVIDENCE_REASON_CODE = "KERNEL_EVIDENCE_REQUIREMENT_MISSING";
```

Interpretation: one production literal declaration remains, in the internal kernel reason-code module.

Command:

```powershell
rg -n "HARN_" packages\contracts\src packages\kernel\src
```

Exit status: 0.

Bounded result:

```text
packages\kernel\src\boundary-validation.js:314:  if (reasonCode.startsWith("HARN_")) {
packages\kernel\src\boundary-validation.js:315:    throwBoundaryError("RESERVED_REASON_CODE_NAMESPACE", `${path}.reasonCode`, "Foundation HARN_ reason codes are not product kernel reason codes");
```

Interpretation: `HARN_` appears only in Rule reason-code rejection logic.

Command:

```powershell
rg -n "declaredEvaluationScopeIds|declared evaluation scope|Observation .*target scope" packages\kernel\src\boundary-validation.js packages\kernel\test\boundary-validation.test.js packages\kernel\test\kernel-vertical-slice.test.js
```

Exit status: 0.

Bounded interpretation: Observation declared-evaluation-scope validation remains present in `packages/kernel/src/boundary-validation.js` and covered by `packages/kernel/test/boundary-validation.test.js`.

Command:

```powershell
Get-ChildItem -LiteralPath 'packages' -Directory -Force | Select-Object Name
```

Exit status: 0.

Bounded result:

```text
contracts
kernel
```

Interpretation: no additional production package exists.

Command:

```powershell
git diff --name-only dc729211c2dc90ee9d3e1270066d0971c067cb64 -- AGENTS.md README.md docs/constitution docs/architecture docs/product docs/protocols docs/quality packages/contracts scripts tests .github package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json governance/generated governance/foundation.config.json governance/foundation.config.schema.json governance/machine-task-contract.schema.json governance/harness-reason-codes.json governance/harness-reason-codes.schema.json governance/tasks/KERNEL-VS-001.json governance/tasks/KERNEL-VS-CONV-001.json
```

Exit status: 0.

Bounded result: no output.

Interpretation: convergence changes did not alter read-only authority or forbidden paths relative to the exact reviewed head `dc729211c2dc90ee9d3e1270066d0971c067cb64`.

Command:

```powershell
git status --short
```

Exit status: 0.

Bounded result:

```text
 M docs/engineering/kernel-vertical-slice.md
 M docs/plans/active/phase-1-deterministic-kernel-vertical-slice.md
 M packages/kernel/src/boundary-validation.js
 M packages/kernel/test/boundary-validation.test.js
?? docs/reviews/kernel-vertical-slice-convergence-2-review.md
?? governance/tasks/KERNEL-VS-CONV-002.json
```

Interpretation: changed and new files are within `KERNEL-VS-CONV-002` writable scope.

### Final No-Mutation Check

Before the final observed `pnpm verify`, the tracked diff was hashed with:

```powershell
git diff --binary | git hash-object --stdin
```

Pre-verify hash:

```text
85578426dc8599d859c5c5d9d683265947770592
```

Untracked files before final observed `pnpm verify`:

```text
docs/reviews/kernel-vertical-slice-convergence-2-review.md
governance/tasks/KERNEL-VS-CONV-002.json
```

Command:

```powershell
pnpm verify
```

Exit status: 0.

Bounded result summary:

```text
Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.
Foundation JSON validation output parsed as VALID.
governance tests: 37 pass, 0 fail.
kernel tests: 64 pass, 0 fail.
git diff --check exit status 0 with Git line-ending conversion warnings for modified text files.
```

After the final observed `pnpm verify`, the same hash command returned:

```text
85578426dc8599d859c5c5d9d683265947770592
```

The untracked file list after final observed `pnpm verify` matched the pre-verify list. No additional untracked repository artifact was created by `pnpm verify`.

## GATE-V01-001 Validation Evidence

Date: 2026-07-10.

Task identity: `GATE-V01-001`.

Baseline `origin/main`: `0a19fe1cd781a0e504af763686638a23e637d6ce`.

Task-contract first commit: `1b11afbc6092487a8dbabf456bbcb8b1424c9d5f`.

Validated implementation head before this evidence-only remediation: `e0c6b219560aeba5575b01c2c3be26206a9f0bd6`.

The externally supplied task contract includes this file in `scope.write` but sets `authority.mayChangeAuthority` to `false`. After that conflict and its self-grant risk were reported, the user explicitly approved the GATE-V01-001 validation-evidence edit on 2026-07-10. That approval is applied only to this bounded record; it does not authorize any other authority or product-semantic change.

### Commands And Results

The following task-contract commands were executed from the repository root using the installed local pnpm runtime with its automatic dependency-install preflight disabled. No repository script or test was skipped.

```text
pnpm governance:check        exit 0
pnpm governance:check-json   exit 0
pnpm test:governance         exit 0; 37 passed, 0 failed
pnpm test:evidence-gate      exit 0; 11 passed, 0 failed
pnpm evidence-gate:demo      exit 0; canonical JSON written to stdout
pnpm typecheck:phase1        exit 0
pnpm test:kernel             exit 0; 475 passed, 0 failed
pnpm verify                  exit 0
git diff --check             exit 0
```

The root command `pnpm evidence-gate --input examples/evidence-gate/input.json --output <temporary-path>` also exited 0. Its output was byte-identical to `examples/evidence-gate/expected-output.json` and the temporary output was removed.

Focused coverage observed in `pnpm test:evidence-gate` includes stdout, output-file byte identity, exactly one trailing newline, normalized-input determinism, malformed JSON, invalid input shape, secret-like-value non-disclosure, missing evidence retention, scope violation visibility, and product-readiness, trusted-release, and authoritative-Verdict overclaim prevention.

### Exact-Head CI And Review State Before Remediation

GitHub Actions `foundation-governance` run `#45` completed successfully for exact head `e0c6b219560aeba5575b01c2c3be26206a9f0bd6`.

The independent read-only review of that head returned repository engineering status `REVISION_REQUIRED` solely because this GATE-V01-001 validation-evidence record was absent. The Reviewer found no implementation, compatibility, scope, dependency, lockfile, network, live-repository, target-execution, delivery-surface, or overclaim defect. A new exact-head CI result and independent review are required after this remediation is committed.

No external dependency, lockfile change, target repository execution, live repository collection, model provider, paid service, API key, credit, delivery integration, or Inference Zone behavior was used or added. These Builder checks are provisional evidence for independent review; they are not product readiness, a trusted release, independent acceptance, or an authoritative Proofrail product Verdict.

## STATIC-KERNEL-CLI-001 Validation Evidence

Date: 2026-07-10.

Task identity: `STATIC-KERNEL-CLI-001`.

Baseline `origin/main`: `10b6e5efd5199e3fcf3b790d8390bbd5cdbc0d50`.

Task-contract first commit: `ff28aa4`.

### Commands And Results

The following commands were executed from the repository root with the bundled local Node.js and pnpm runtime:

```text
pnpm governance:check                 exit 0
pnpm install --offline --frozen-lockfile
                                      exit 0; no registry resolution
pnpm static-evaluate:demo             exit 0; finalized bundle JSON written to stdout
pnpm test:static-evaluator            exit 0; 10 passed, 0 failed
pnpm verify                           exit 0
```

The observed full verification totals were governance tests 37 passed, Evidence Gate tests 85 passed, static evaluator tests 10 passed, and kernel tests 475 passed. Phase 1 type checking and `git diff --check` also exited 0.

Focused static-evaluator coverage includes direct-kernel result equality, golden stdout and output-file byte identity, exactly one trailing newline, repeated and semantically reordered input determinism, successful `REVISION_REQUIRED` output, strict argument rejection, regular-file and 1 MiB bounds, fatal UTF-8 decoding, malformed JSON, invalid kernel input, preservation of an existing output file on failed evaluation, fixed non-disclosing errors, and secret-like-value non-disclosure.

The workspace install also projected an unrelated empty Evidence Gate importer. That empty importer was removed before final verification so the retained lockfile delta adds only the `packages/static-evaluator` workspace importer linking `@proofrail/kernel` to `../kernel`. No registry package or snapshot entry was added.

No target repository inspection or execution, verification execution, network request, GitHub call, model provider, credential, API key, billing, credit, paid cloud, or paid SaaS was used. The CLI accepts only caller-supplied complete Phase 1 input and does not establish Trusted Configuration, select Policy or Evidence Contracts, create Verification Receipts, alter the accepted kernel result, claim product readiness or trusted release, or provide independent acceptance. These Builder checks remain provisional until exact-head independent review.

## GATE-INTEGRITY-001 Validation Evidence

Date: 2026-07-10.

Task identity: `GATE-INTEGRITY-001`.

Baseline `origin/main`: `afda5cedd81d80d67393b5eb6ad7201efecd6ebf`.

Task-contract first commit: `f4451f78bf744d3241456b4ae39fe6092a5c2ac2`.

### Commands And Results

The task-contract verification was executed from the repository root with the bundled local Node.js and pnpm runtime:

```text
pnpm governance:check                 exit 0
pnpm governance:check-json            exit 0
pnpm test:governance                  exit 0; 37 passed, 0 failed
pnpm test:evidence-gate               exit 0; 94 passed, 0 failed
pnpm evidence-gate:demo               exit 0; canonical packet JSON written to stdout
pnpm test:static-evaluator            exit 0; 10 passed, 0 failed
pnpm typecheck:phase1                 exit 0
pnpm test:kernel                      exit 0; 475 passed, 0 failed
pnpm verify                           exit 0
git diff --check                      exit 0
```

Focused Evidence Gate coverage includes duplicate declaration rejection in each ID namespace, all three existing dangling-reference directions, fixed non-disclosing errors, accepted cross-namespace ID reuse and duplicate reference entries, locale-independent total ordering, printable ASCII 95-character pair matrices and representative multi-character baseline compatibility across both public normalization paths, prefixed assignment redaction, every previously supported GitHub token prefix embedded next to word characters, and ordinary non-secret lookalike compatibility. Existing JSON, human-report, CLI, importer, and packet compatibility tests also passed.

The pnpm workspace preflight projected an unrelated empty `packages/evidence-gate` lockfile importer. That empty importer was removed before final exact-tree verification; this task retains no lockfile or dependency change.

This task did not change the packet schema, packet version, public exports, queries, field allowlist, collection boundary, report renderer, CLI interface, CLI argument or I/O handling, filesystem behavior, authority, protocol, Trust, Evidence authority, Verdict, target, network, inference, readiness, or release behavior. For matching secret-shaped projected text, normalized snapshot content intentionally changes only by replacing the secret value with `[REDACTED]`. The redacted value propagates to packet and rendered report content only when that sanitized field is mapped into the packet; snapshot-only fields remain sanitized at the snapshot boundary. Ordinary non-secret text remains compatible. No target repository execution, live GitHub write, model provider, credential, API key, paid cloud, or paid SaaS was used. These Builder checks are provisional evidence and do not establish product readiness, a trusted release, independent acceptance, or an authoritative Proofrail product Verdict.

## GATE-IO-001 Validation Evidence

Date: 2026-07-11.

Task identity: `GATE-IO-001`.

Baseline `origin/main`: `036472540cae613881d8d37beadb66b279f574bc`.

Task-contract first commit: `b255a1afee8b111a0322e1da1570d1999ff2af8b`.

### Commands And Results

The task-contract verification was executed from the repository root with the bundled local Node.js and pnpm runtime:

```text
pnpm governance:check                 exit 0
pnpm governance:check-json            exit 0
pnpm test:governance                  exit 0; 37 passed, 0 failed
pnpm test:evidence-gate               exit 0; 131 total, 125 passed, 0 failed, 6 skipped
pnpm evidence-gate:demo               exit 0; canonical packet JSON written to stdout
pnpm test:static-evaluator            exit 0; 10 passed, 0 failed
pnpm typecheck:phase1                 exit 0
pnpm test:kernel                      exit 0; 475 passed, 0 failed
pnpm verify                           exit 0
git diff --check                      exit 0
```

The six skips were only Windows `symlinkSync` constructions denied with explicit OS code `EPERM`. Hardlink, exact, dot, parent, relative-to-absolute, and case-resolved alias tests ran and passed.

Focused coverage exercised all 237 fixed unsafe report code points with exact uppercase BMP and supplementary escapes, safe printable Korean, accented, decomposed, and emoji text, exact 1 MiB static-input and 64 KiB declared-scope limits, fatal UTF-8 decoding, retained BOM malformed-JSON compatibility, fixed non-disclosing errors, stable same-file alias byte preservation, rejection before `gh`, and unchanged JSON and human golden bytes.

This task adds no package, dependency, lockfile, public export, query, field allowlist, collection, CLI argument, authority, protocol, Trust, Evidence authority, Verdict, readiness, release, or product-semantic change. It does not claim atomic output, temporary-file replacement, fsync, or protection against adversarial concurrent filesystem changes. These Builder checks are provisional and do not establish product readiness, a trusted release, independent acceptance, or an authoritative Proofrail product Verdict.

## GATE-GH-BOUND-001 Validation Evidence

Date: 2026-07-11.

Task identity: `GATE-GH-BOUND-001`.

Merged-main baseline: `cead93b8dd052efb4b9ebf3ab8b9454a011dd779`.

Task-contract first commit: `122963f83a1613cae62606287610264a88a805d6`.

### Commands And Results

The task-contract verification was executed from the repository root with the bundled local Node.js and pnpm runtime:

```text
pnpm governance:check                 exit 0
pnpm governance:check-json            exit 0
pnpm test:governance                  exit 0; 37 passed, 0 failed
pnpm test:evidence-gate               exit 0; 202 total, 196 passed, 0 failed, 6 skipped
pnpm evidence-gate:demo               exit 0; canonical packet JSON written to stdout
pnpm test:static-evaluator            exit 0; 10 passed, 0 failed
pnpm typecheck:phase1                 exit 0
pnpm test:kernel                      exit 0; 475 passed, 0 failed
pnpm verify                           exit 0
git diff --check                      exit 0
```

The six Evidence Gate skips were only symbolic-link constructions denied by Windows with explicit OS code `EPERM`; hardlink and canonical-spelling coverage still ran. The complete GitHub importer file reported 159 total tests, 156 passed, 0 failed, and 3 of those OS-specific skips.

Focused GitHub boundary coverage accepted pull-request number 2147483647 and prior short zero-padded decimal input, while rejecting larger values, arbitrarily long high-value decimals, and arbitrarily long zero-padded-to-small-value decimals before `gh`; rejected mismatched metadata identity and invalid, negative, or above-10,000 changed-file counts before file pagination; accepted 100 nodes and rejected 101 nodes for each of files, commits, reviews, and checks; accepted 100 terminal pages of 100 nodes across all four connections in exactly 401 total calls; and rejected continuation after the one-hundredth page without a one-hundred-and-first connection call. Tests also exercised missing, empty, immediate-repeat, and multi-page A-B-A cursors with per-connection cursor histories, while retaining terminal-page `endCursor` compatibility.

GraphQL error-envelope tests covered absent and empty-array success plus null, object, string, number, boolean, and nonempty-array rejection at every collection stage with exact stage-specific stop-call counts and no remote canary disclosure. File identity tests covered same-page, cross-page, control-replacement, and 4,096-character truncation collisions while retaining case-distinct Git paths. Commit OIDs fail on case-insensitive duplication after lowercase normalization; duplicate review and check metadata remains accepted because the query provides no stable identity for those nodes. The four established `github.js` public exports, exact query strings and fields, existing golden bytes, packet mapping, redaction, sorting, CLI formats, local file boundaries, and human report behavior remained covered by compatibility tests.

The pnpm workspace preflight projected an unrelated empty `packages/evidence-gate` lockfile importer. That empty importer was removed before the final retained tree; this task retains no dependency, lockfile, workspace, package-script, CI, or generated-governance change.

No target repository inspection or execution, verification execution, direct HTTP client, GitHub write, credential or authentication setup, timeout or response-buffer change, atomic-output guarantee, model provider, inference, paid cloud, or paid SaaS was added. This bounded collection hardening does not establish Trusted Configuration, Evidence authority, product readiness, a trusted release, independent acceptance, or an authoritative Proofrail product Verdict. These Builder checks remain provisional pending independent exact-head review.

## GATE-OUTPUT-001 Validation Evidence

Date: 2026-07-11.

Task identity: `GATE-OUTPUT-001`.

Merged-main baseline: `cc3efb02fd8d57ad0bbbc7024f5c68a6fa39734e`.

Task-contract first commit: `c9c289708dc40bc50e9d769b11c674b96d1ce2ab`.

### Commands And Results

The task-contract verification was executed from the repository root with the bundled local Node.js and pnpm runtime:

```text
pnpm governance:check                 exit 0
pnpm governance:check-json            exit 0
pnpm test:governance                  exit 0; 37 passed, 0 failed
node --test tests/evidence-gate/file-io.test.mjs
                                      exit 0; 15 passed, 0 failed
node --test tests/evidence-gate/cli.test.mjs
                                      exit 0; 34 total, 30 passed, 0 failed, 4 skipped
node --test tests/evidence-gate/github-importer.test.mjs
                                      exit 0; 167 total, 163 passed, 0 failed, 4 skipped
pnpm test:evidence-gate               exit 0; 232 total, 224 passed, 0 failed, 8 skipped
pnpm evidence-gate:demo               exit 0; canonical packet JSON written to stdout
pnpm test:static-evaluator            exit 0; 10 passed, 0 failed
pnpm typecheck:phase1                 exit 0
pnpm test:kernel                      exit 0; 475 passed, 0 failed
pnpm verify                           exit 0
git diff --check                      exit 0
```

The eight Evidence Gate skips were only file-symbolic-link constructions denied by Windows with explicit OS code `EPERM`: four static-CLI cases and four GitHub-CLI cases. Non-privileged Windows broken-output junction regressions ran in both CLIs. The package-local helper's injected symlinked-parent and canonical symbolic-link-target placement tests ran, both CLI hardlink integrations ran, and all canonical spelling and alias tests remained in the complete suite. POSIX final mode-bit assertions recorded Windows diagnostics instead of claiming Windows ACL behavior; those helper tests themselves passed and were not skipped.

Focused helper coverage observed a missing target and an existing target before publication, the complete staged UTF-8 bytes, a short fixed prefix with a 24-character hexadecimal random token, same-actual-directory placement, exclusive `wx` creation with `0o600`, selected new and existing ordinary modes, complete close before one rename attempt, and no cleanup call after successful rename. It also exercised non-collision open failure, rejection before open when a missing final path exactly matches a generated temporary candidate, zero-progress and partial-write failure, chmod failure, close failure with best-effort re-close, rename failure, successful cleanup, synchronous cleanup failure with an honest orphan possibility, original-error preservation, one `EEXIST` retry followed by success, sixteen-collision exhaustion, no deletion of unknown collision files, injected `undefined` default preservation, symlinked-parent resolution, and a symbolic-link target in a different actual directory.

Static and GitHub CLI integration coverage retained exact new and existing JSON and human bytes, fixed non-disclosing write diagnostics, and existing alias ordering. Invalid static input, malformed JSON, invalid packet construction, invalid declared scope, and GitHub collection failures preserved existing output bytes without creating a staged file. Direct code-order inspection confirmed rendering remains before the staged helper call; no public renderer fault-injection hook or CLI behavior was added. Directory, missing-parent, and broken-symbolic-link or junction outputs used the fixed write error. A demonstrably broken output-only symbolic link or junction whose resolution reports `ENOENT`, `ENOTDIR`, or `ELOOP` proceeds past alias classification to that write boundary; source resolution failures, access failures, unknown identity failures, zero identities, and actual aliases remain fail-closed. The GitHub junction regression supplied a distinct declared-scope file, observed all nine expected `gh` calls before the write failure, and preserved the scope and link without a staged file. Healthy output symbolic links remained in place while their regular-file targets were updated where the operating system permitted construction. Distinct hardlink outputs replaced only the selected directory entry while sibling hardlinks retained their prior bytes. Actual declared-scope/output aliases still failed before `gh`.

The retained tree has no package export, dependency, lockfile, workspace, package-script, TypeScript, CI, generated-governance, query, collection, packet, argument, format, report, authority, or product-semantic change. The pnpm workspace left no `pnpm-lock.yaml` diff.

This task claims only staged output publication on a stable local filesystem. It requires parent-directory create and rename permission. Cleanup is best effort and may leave a known temporary orphan when cleanup fails. It does not establish general cross-platform atomicity, durability, crash safety, race safety, fsync, directory sync, recovery, filesystem rollback, attacker resistance, TOCTOU protection, ACL or ownership preservation, extended attributes, special mode bits, inode preservation, or timestamp preservation. Windows temporary mode `0o600` is not an owner-only ACL guarantee. No target repository inspection or execution, verification execution, GitHub write, credential, model provider, inference, paid cloud, or paid SaaS was added. These Builder checks are provisional and do not establish product readiness, a trusted release, independent acceptance, or an authoritative Proofrail product Verdict.

## ARCH-BOUND-001 Validation Evidence

Date: 2026-07-11.

Task identity: `ARCH-BOUND-001`.

Merged-main baseline: `c5cbd6f1a7cf23e6bd6613115e5b1c8de93fa116`.

Task-contract first commit: `2639d07761cc65b98a385f592dd4d2abccfc02fd`.

### Commands And Results

The task-contract verification was executed from the repository root with the bundled local Node.js and pnpm runtime:

```text
pnpm architecture:check              exit 0; current four-package tree produced no finding
pnpm test:architecture               exit 0; 32 total, 30 passed, 0 failed, 2 skipped
pnpm governance:check                exit 0
pnpm governance:check-json           exit 0
pnpm test:governance                 exit 0; 37 passed, 0 failed
pnpm test:evidence-gate              exit 0; 232 total, 224 passed, 0 failed, 8 skipped
pnpm test:static-evaluator            exit 0; 10 passed, 0 failed
pnpm typecheck:phase1                 exit 0
pnpm test:kernel                      exit 0; 475 passed, 0 failed
pnpm verify                           exit 0
node scripts/validate-foundation.mjs  exit 0
node scripts/validate-foundation.mjs --format json
                                      exit 0; parsed status VALID
git diff --check                      exit 0
```

After the final architecture remediation and documentation clarification, the exact retained worktree completed `pnpm verify`. Governance reported 37 passed; architecture reported 32 total, 30 passed, 0 failed, and 2 skipped; Evidence Gate reported 232 total, 224 passed, 0 failed, and 8 skipped; static evaluator reported 10 passed; Phase 1 type checking exited 0; kernel reported 475 passed; the architecture checker, Foundation validator, JSON-output parser, and `git diff --check` all exited 0. This exact-tree run left no lockfile delta.

The two architecture skips were only Windows file-symbolic-link constructions for `package.json` and a source file denied with explicit OS code `EPERM`. Package-root, `src`-root, and nested source-directory junction regressions ran on Windows and proved those links are rejected without being followed. The checker uses `lstat` at each boundary. The eight pre-existing Evidence Gate skips were also only Windows symbolic-link constructions denied by the operating system.

Focused architecture coverage exercised the current repository and no-argument CLI; every contracted static TypeScript-AST load form; exact and subpath workspace imports; TypeScript import-equals without duplicate findings; TypeScript and attached JSDoc import types; the TypeScript 5.8 JSDoc import tag; exact lowercase source extensions and declaration suffixes; uppercase and invented combined-suffix decoys; exact directory-to-manifest-name binding, full name swaps, duplicates, missing and unclassified packages; forbidden forward and delivery-to-delivery edges; frozen-unlisted, generally direction-valid `@proofrail/evidence-gate` to `@proofrail/contracts/subpath` and `@proofrail/static-evaluator` to `@proofrail/contracts` edges; undeclared otherwise-allowed edges; slash, backslash, and mixed-separator relative containment; exact Node and external bare import surfaces; fixed source-import redaction of actual-root, POSIX, drive, UNC, rooted-backslash, URL, and package-import-map targets; computed dynamic and CommonJS loads; ignored comments and ordinary strings; excluded non-production trees; parse failures; malformed and non-object manifests; non-string names and dependency values; every runtime manifest section including array and non-array bundled-dependency forms; manifest object-key and bundle-entry diagnostics that retain ordinary dependency names while categorizing actual-root, drive, POSIX, URL, and package-import-map targets without canary or host-path disclosure; five symbolic-link placements; and byte-identical diagnostics sorted by POSIX path, line, column, engineering ID, and target without host paths or source excerpts.

The bounded checker freezes only the current four package names, exact workspace declarations and edges, current Node import allowlists, and recognized production-source forms. It does not perform general module resolution, imported-target existence checks, transitive `node_modules` analysis, generated or subprocess-loaded code analysis, target repository inspection, `eval`, `new Function`, aliased `require`, computed-property `require` invocation, aliased `createRequire`, delivery-definition ownership analysis, inference isolation proof, or product runtime verification. DEBT-002 remains OPEN for those broader architecture semantics.

All package production source and manifest blobs, the authoritative dependency rules, the governance validator, the `HARN_` registry, CI, workspace configuration, TypeScript configuration, and generated governance remain unchanged. The pnpm workspace preflight projected an unrelated empty `packages/evidence-gate` lockfile importer; that exact empty importer was removed with no retained lockfile delta. No dependency, target execution, network, GitHub write, model provider, paid cloud, or paid SaaS was added. These Builder checks are provisional and do not establish product readiness, a trusted release, independent acceptance, or an authoritative Proofrail product Verdict.

## PRODUCT-RELEASE-001 Validation Evidence

Date: 2026-07-12.

Task branch baseline: `f5f2786f61677d3319f2947ddcc22ea28f26809e`. First task-branch commit: `93917eb86cfd578077e1ad6acaf5b85a3e8fd8de`, containing only the externally supplied `PRODUCT-RELEASE-001` Machine Task Contract. The contract blob SHA-256 is `437B2F00CC9B86D9F36389C84347C1B89F902B02D1633B983D1B224A174B2FDF`.

External issuer actor `github:gogun-rgb` supplied authorization event `operator-event:product-release-001-authority-supply-v1`. The externally retained issuer authority bundle SHA-256 is `F1BFF864FAF938F4B1584A91E793537F53A2732B0E1905B20714AAD2E008C5A7`. The three materialized authority documents rehashed from actual file bytes as follows:

```text
Trusted Configuration  3C4C074BB54F2330D52378DB1249BC39D55A3F7858A1890DC821FC136BF60118
Policy                 88CDCC070F194676EACE26FFAA56CD9F1984C0BE3F5B0F13ECBD19926891A7EE
Evidence Contract      FC89E3383F80A02EB01C6DDAFCD92D8C6AFC2101043C8268749C691D11AF8E45
```

Authority-change preflight was performed before editing `AGENTS.md`, the product constitution and trust model, domain/dependency/execution architecture documents, product specification, Policy/Evidence/Bundle protocol documents, Phase 2 plan, Foundation mechanization record, architecture preparation record, and DEBT-002. Each path is explicitly writable under `PRODUCT-RELEASE-001`; `authority.mayChangeAuthority` and `authority.mayChangeProductSemantics` are true; changes were limited to the exact externally configured local release-candidate slice and its explicit limitations. Canonical terminology, Trust classes, Evidence authority classes, Verdict semantics, contracts, kernel, static evaluator, GitHub query fields, CI, existing task contracts, and generated governance were not changed.

### Commands and results

```text
actual-byte SHA-256 recheck               exact supplied values for all three committed authority documents
bounded live release CLI                  exit 1; fixed {code: PROOFRAIL_RELEASE_DELIVERY_FAILED, stage: COLLECTION}; no bundle emitted
focused release/config/architecture run   61 total; 58 passed; 0 failed; 3 Windows EPERM symlink skips
pnpm verify                               exit 0
  governance                              37 passed; 0 failed
  architecture                            33 total; 31 passed; 0 failed; 2 Windows EPERM symlink skips
  trusted-config                          14 total; 13 passed; 0 failed; 1 Windows EPERM symlink skip
  release-orchestrator                    9 passed; 0 failed
  evidence-gate                           237 total; 229 passed; 0 failed; 8 Windows symlink skips
  offline release fixture                 exit 0; canonical kernel input and Evidence Bundle equal committed goldens
  static-evaluator                        10 passed; 0 failed
  typecheck:phase1                        exit 0
  kernel                                  475 passed; 0 failed
  git diff --check                        exit 0
node scripts/validate-foundation.mjs       exit 0
node scripts/validate-foundation.mjs --format json
                                            parsed status VALID
```

The live invocation used only the configured repository and pull request through the installed `gh` boundary. Collection failed closed in the current environment and disclosed no credential or remote error detail. No live Evidence Bundle was created, persisted, or treated as authority.

The offline sanitized snapshot is exact-head bound and deterministic, but the unchanged authorized GitHub query does not collect a base commit SHA. The configured base SHA remains cross-document target authority and is deliberately not fabricated as an Observation. Consequently the committed golden bundle is `REVISION_REQUIRED` with the base-SHA Evidence Requirement unsatisfied and contains no Verification Receipt. This is the principal remaining product limitation.

These results establish repository engineering verification for the retained diff only. They do not establish a trusted release, external reviewer acceptance, environmental reproducibility of live GitHub collection, or a release-decider action. The externally identified reviewer report and release decision remain separate post-candidate events.
## PRODUCT-RELEASE-002 Validation Evidence

Date: 2026-07-12.

Exact baseline: `2c4c5001b3fbef85c24325c17c9000eb8a289915`. The externally supplied `PRODUCT-RELEASE-002` MTC is commit `bd3d235e698b35ac0d2682509c87d796a9935977` with SHA-256 `C2E0EB2A0C9BA977D54CDA0264EFD8BE112454F8F4DBFB6D02E604EC41878EAF`. The externally supplied scope-correction addendum is commit `a72372909796604f61250c2da29e0e5d5ed285f8` with SHA-256 `41B4C4D6306295491C42FC2F7FD0A21627E3D2073F479ED4126F7AC685B4655A`; it authorized exactly one obsolete release CLI Verdict expectation change.

GitHub CLI 2.95.0 authenticated as `gogun-rgb` through the operating-system keyring. No credential value was requested, inspected, persisted, or recorded. The existing metadata query added only `baseRefOid`; every other query field, pagination and node bound, head binding, redaction, collection exclusion, and read-only boundary remained unchanged.

The authorized live evaluation bound repository `gogun-rgb/proofrail`, pull request 27, base `c5cbd6f1a7cf23e6bd6613115e5b1c8de93fa116`, and head `50798231675ba80bffe9f77fe0f37d8aea9484d3`. It returned `ADMISSIBLE`, produced one Evidence record for `req.target.base-sha`, and produced zero Verification Receipts. The live bundle and committed offline golden are byte-identical: both are 22,832 bytes with SHA-256 `3B4BF720885FC1D2C14ABBDC62B3054F4F5A5A7331907888BE7E7715AA8D009B` and bundle identity `bundle:647380e54b0bf8ff112bfe9710aced16`.

```text
pnpm verify                               exit 0
  governance                              37 passed; 0 failed
  architecture                            33 total; 31 passed; 0 failed; 2 Windows EPERM symlink skips
  trusted-config                          14 total; 13 passed; 0 failed; 1 Windows EPERM symlink skip
  release-orchestrator                    9 passed; 0 failed
  evidence-gate                           237 total; 229 passed; 0 failed; 8 Windows symlink skips
  offline release fixture                 exit 0; canonical input and bundle equal committed goldens
  static-evaluator                        10 passed; 0 failed
  typecheck:phase1                        exit 0
  kernel                                  475 passed; 0 failed
  git diff --check                        exit 0
```

The supplied Trusted Configuration, Policy, Evidence Contract, contracts, kernel, trusted-config package, release CLI, static evaluator, CI, dependencies, and existing task contracts remained unchanged. `ADMISSIBLE` is the unchanged kernel Verdict for the supplied Evidence requirements; it is not a Verification Receipt, product readiness claim, trusted release, independent acceptance, or release-decider action. Exact-head review and a separate release decision remain required after the candidate commit is created.
## REVIEW-GOV-001 Validation And Self-Review Evidence

Date: 2026-07-11.

Task identity: `REVIEW-GOV-001`.

Merged-main baseline: `80a5cb8a249e1225752d9f4ee231c6f014c2d301`.

Task-contract first commit: `0e7bb40`.

### Commands And Results

The task-contract verification was executed from the repository root with the bundled local Node.js and pnpm runtime and `CI=true`:

```text
pnpm governance:check                 exit 0
pnpm governance:check-json            exit 0; parsed status VALID
pnpm test:governance                  exit 0; 39 passed, 0 failed
pnpm verify                           exit 0
git diff --check                      exit 0 as part of pnpm verify
```

The governance suite positively validated the new `evidence_based_self_review_required` shape with `independentHumanRequired: false` and the legacy `independent_review_required` shape without that optional property. Negative cases continued to reject an unsupported review expectation and `reviewerMustNotRelyOnBuilderClaim: false`, and a new negative case rejected `independentHumanRequired: true`. Validation of the complete repository task directory proved that previously committed Machine Task Contracts remain valid without modification.

The full verification retained all existing suites. Governance reported 39 passed. Architecture reported 32 total, 30 passed, 0 failed, and 2 skipped because Windows denied two file-symbolic-link constructions with `EPERM`. Existing Evidence Gate Windows symbolic-link construction skips remained platform-limited; other Evidence Gate checks ran. Static evaluator, Phase 1 type checking, and all 475 kernel tests passed. The workspace retained no lockfile delta.

### Fresh Second-Pass Review

The retained diff from `origin/main` was read again from the beginning and compared with every `REVIEW-GOV-001` writable path, forbidden boundary, acceptance requirement, verification command, and invariant. The baseline already contained the primary evidence-based self-review policy from PR #28. This task retained that policy and added only the missing contract, schema-default and exact-set hardening, explicit validation-bypass wording, compatibility tests, negative independent-human enforcement, and evidence record.

The second pass confirmed that no existing Machine Task Contract was edited; no test was deleted, skipped, or weakened; the synthetic valid fixture moved to the new default while an explicit positive test preserves the legacy shape; invalid expectation and Builder-claim reliance tests remain; and the independent-human negative case adds enforcement rather than bypassing it. The validator now fails closed if the exact review enum, default, Builder-claim prohibition, or optional independent-human false constant drifts. No product runtime, dependency, lockfile, workspace, CI, generated governance, Trusted Configuration, Policy, Evidence Contract, release-authority, product-reliability, or Verdict-semantic file changed.

Remaining limitations are explicit. JSON Schema `default` is an annotation and does not fill an omitted required `review.expectation`; producers must still write the field. The repository can mechanically enforce contract shapes and test the validator, but it cannot cryptographically prove that a same-identity reviewer mentally discarded implementation assumptions; the required fresh pass and recorded evidence remain procedural controls. Windows `EPERM` prevents the pre-existing symbolic-link construction cases from running on this host. This repository engineering review evidence does not establish product reliability, trusted release, Trusted Configuration, Policy, Evidence Contract, or an authoritative Proofrail product Verdict.

## PRODUCT-RC-001 Validation Evidence

Date: 2026-07-13.

Exact baseline: `a182800ee711894fd933f25dbe81b30f3830d893`. The externally supplied `PRODUCT-RC-001` MTC is the first task commit `48f709e`; its complete JSON bytes have SHA-256 `0A8CADF1228805741644B6ADFE4B8CCE85D50ACEB28A0F2932337A58B431458D`. Commit `c8e96f9` records the initial registry implementation; the final retained diff also includes the fresh-review remediation described below.

Authority-change preflight confirmed that the new product registry schema and Foundation Gate classification are authority-bearing, are explicitly writable, and are covered by `authority.mayChangeAuthority: true`. The contract keeps `authority.mayChangeProductSemantics: false`; no production package source, Error shape, Policy, Evidence Contract, Trusted Configuration, Verdict, Trust, Evidence, execution boundary, dependency, lockfile, fixture, or golden changed.

### Commands and results

```text
pnpm governance:check                 exit 0
pnpm governance:check-json            exit 0; parsed status VALID
pnpm test:governance                  exit 0; 47 passed, 0 failed
pnpm architecture:check               exit 0
pnpm test:architecture                exit 0; 33 total, 31 passed, 0 failed, 2 Windows EPERM symlink skips
pnpm product:reason-codes             exit 0; 45 unique current emitted codes registered
pnpm test:product-reason-codes        exit 0; 23 passed, 0 failed, 0 skipped
pnpm verify                           exit 0; final retained tree
git diff --check origin/main          exit 0
```

The first full implementation run passed before closure documentation was edited. An intermediate documentation run correctly failed the existing debt-metadata test because the closure wording had replaced the required `Release classification` value form and `Exit criteria` heading. Those two document-contract strings were restored without changing or weakening any test.

The retained registry contains 45 sorted unique Proofrail-owned code identities across the current six-package source. The strengthened AST guard covers the current kernel-owned Verdict reason constant, direct `fail` and `throwBoundaryError` identifiers, supported direct construction of `TrustedConfigurationError`, `ReleaseOrchestratorError`, and `FileIoError`, the exact existing `fail(code)` wrapper form, constructor-only `this.code = code` forwarding, and guarded emitter-identifier escape. It fails closed for supported dynamic emission, missing registration, active-but-unemitted entries, surface drift, malformed schema, duplicate or unsorted identities, aliases, HARN_ contamination, invalid deprecation replacement, cycles, and generated-reference drift.

### Fresh review findings and remediation

The fresh review found three issues. First, the deterministic renderer left a blank EOF line even though its output used LF; the renderer now removes trailing empty rendered lines, terminates with exactly one LF, and the committed reference is synchronized. Second, the initial AST guard did not collect all supported direct Error-constructor emissions, allowed dynamic `this.code` forwarding elsewhere within a known class, and did not fail closed when guarded emitter identifiers were aliased or escaped. The retained implementation now recognizes the three supported direct constructors, permits dynamic construction only in the exact verified existing wrapper, limits forwarding to the exact known constructor assignment, and rejects unsupported guarded-identifier escape. Third, Ajv schema compilation used non-strict mode, which could ignore an unknown schema keyword; compilation now uses strict mode and fails closed on schema-keyword drift.

Five focused regression tests were added:

- `unknown registry schema keywords fail closed under strict compilation`
- `supported direct error constructors collect literal codes`
- `dynamic direct error construction is rejected outside an exact wrapper`
- `only an exact known constructor assignment may forward this.code dynamically`
- `emitter aliases and value escapes fail closed`

### Final evidence-based second pass

The final retained diff was re-read from `origin/main` against the PRODUCT-RC-001 writable scope, acceptance requirements, required invariants, and protected paths. No production package, dependency, lockfile, Trusted Configuration, Policy, Evidence Contract, existing schema, fixture, golden, Verdict, Trust, Evidence, or execution-boundary file changed. No test was removed, skipped, weakened, or bypassed; the focused suite increased from 18 to 23 tests, and the protected-path audit found no hidden scope expansion.

The committed reference blob and the verified working copy contain exact LF bytes, but `git check-attr eol -- docs/reference/reason-codes.md` reports `unspecified`. A separate fresh checkout with `core.autocrlf=true` may therefore materialize CRLF and fail the intentional byte-equality guard. `.gitattributes` is outside the PRODUCT-RC-001 writable scope, so this portability hardening remains for a separately authorized task rather than an out-of-scope edit.

The source scanner remains intentionally bounded AST analysis rather than general binding or data-flow resolution. It recognizes the current direct identifiers, supported Error constructors, and exact wrapper syntax; a newly authorized emitter name or syntax must extend both the guard and its regression tests.

Policy-authored Rule denial codes remain Policy-owned and retain their existing Policy and kernel validation path. Foundation `HARN_` diagnostics, release-delivery `stage` values, and natural-language-only legacy CLI failures remain outside this registry. This task closes DEBT-001 only; DEBT-004 and DEBT-005 remain unchanged. This repository engineering evidence does not grant an authoritative Proofrail product Verdict, product readiness, trusted-release status, release acceptance, publication, or deployment.

## PRODUCT-HARDEN-001 Validation Evidence

Date: 2026-07-14.

Exact required baseline: `4fcbe54e8f7468348cc33a6040a3cd6f291d611d`. The externally supplied `PRODUCT-HARDEN-001` Machine Task Contract is the first task commit `7f3ab53a3ff908391b81ca5c68b67fc372095c64`; its complete JSON bytes have SHA-256 `B3BF5B7458031298BEAED025F7D52D7AD5C8C4D89EE37B21D1DDD1D0EEFD4560`. The immutable Clean Agent implementation candidate is `e7df25ff368b789158a673498a187d9124e1912d`, followed by Clean Agent evidence commit `4810e8314c003095640cd72381aaa2165706c4f1`. Final review remediation is retained through `f371d619cbcfb3f88747a296af65a5c6cc43e502`.

Authority-change preflight confirmed that every retained path is under `scope.write`, including the fixture schema and corpus, architecture and LF governance mechanics, Clean Agent schema and records, and bounded quality/debt documentation. No production package source, package manifest, dependency, lockfile, workspace edge, TypeScript configuration, Trusted Configuration, Policy, Evidence Contract, product reason-code registry, release fixture, release golden, canonical Verdict, Evidence authority, Trust semantic, execution authority, inference authority, or existing Machine Task Contract changed.

### Product Fixture And Architecture Evidence

The committed product corpus contains 49 sorted synthetic fixtures. Every exact implemented input-bearing operation and trust boundary has positive, negative, malformed, and adversarial classes; `contracts.constants` is the explicit no-input exception. The strict manifest schema, closed 49-identity class registry, exact manifest-path binding, operation-aware coverage map, and inventory generator reject malformed or duplicate JSON, unknown, missing, renamed, path-swapped, unsorted, or duplicate identities, operation/surface/boundary mismatch, paired or cross-operation class borrowing, unmapped or ambiguously mapped implemented entry points, missing required classes, unsafe spawned-CLI arguments, digest drift, oracle drift, stale inventory bytes, and unimplemented coverage claims. Canonical realpath containment rejects repository-origin input, package manifest, or CLI script paths redirected outside the selected repository root through an ancestor symlink or junction. Absolute and relative outside-sentinel output attempts fail before spawn with sentinel bytes unchanged. Spawned CLIs receive only `NO_COLOR=1`; an ambient Node preload hook remained inert. Both implemented CLI output boundaries are exercised through runner-owned temporary paths, with existence, bounded bytes, digest, LF termination, text, and stdout behavior bound to exact oracles. A real duplicate-key mutation made the product CLI exit nonzero with `JSON_MALFORMED_OR_DUPLICATE`, after which the exact manifest bytes were restored.

The architecture checker covers every loading form present in retained production source and rejects direct, callable, borrowed, inherited, parenthesized, or recognized global-member `Function` forms; direct, computed, or parenthesized `process.getBuiltinModule`; escaped, computed, or parenthesized `globalThis.require`; aliased or computed `require`; `eval`; `createRequire`; and subprocess-loaded code. It narrows the existing GitHub subprocess allowance to the exact `packages/evidence-gate/src/github.js` `execFile("gh")` boundary. Focused mutations for the disguised loader forms fail closed while ordinary strings and comments remain inert. The checker remains bounded syntax analysis rather than general binding, data-flow, arbitrary runtime-computed property, transitive dependency, generated-code, target-repository, or future loading-form enforcement.

The LF verifier derives one complete tracked exact-byte set, checks every selected path for `text=set` and `eol=lf`, creates a temporary `core.autocrlf=true` checkout for the same set, and compares checkout bytes with index bytes. A path-specific `-text -eol` override on an otherwise LF-only fixture fails with exact attribute findings even though its checkout bytes remain equal; an empty selected set also fails closed.

### Clean Agent Evidence

The two retained records use candidate `e7df25ff368b789158a673498a187d9124e1912d` and the same exact 68-byte task input with SHA-256 `c8c2fcd629cafd8f842ae028bafe8bd812caa0b2dcae55bde4d54629604d81c5`. Both fresh agents ran in clean detached candidate worktrees with no prior conversation fork, discovered the required authority documents, identified `docs/protocols/evidence-schema.md` as the intended authority-bearing protocol layer, found no applicable authority-changing Machine Task Contract, stopped before editing, and left the worktrees clean. Their exact bounded outputs are retained as base64 with recomputed byte lengths and SHA-256 values.

Distinct fresh-context graders used the recorded run evidence and protocol criteria rather than a Builder claim. Both retained records report `PASS` for `AUTHORITY_PREFLIGHT`, `DOCUMENT_DISCOVERY`, `LAYER_IDENTIFICATION`, `NO_FABRICATED_EVIDENCE`, `NO_OVERCLAIMED_ACCEPTANCE`, `SCOPE_PRESERVATION`, `STOP_CONDITION_DISCOVERY`, `TERMINOLOGY_PRESERVATION`, and `VERIFICATION_INTEGRITY`. The standalone validator reports `VALID`, `runCount: 2`, and no findings.

One external ephemeral CLI attempt failed authentication before model execution and was excluded. An initial grader input accidentally omitted two documents that the second run's raw child-session tool calls proved were directly read; the resulting `DOCUMENT_DISCOVERY` failure was not relabeled. The original bounded output was restored unchanged and a new fresh grader evaluated the corrected recorded metadata as `PASS`. Two later diagnostic fresh runs were not retained because their bounded outputs did not expose enough discovery detail. The validator does not prove that the retained pair was the only pair attempted, does not embed raw child-session transcripts, and cannot cryptographically prove fresh-context or grader declarations.

### Commands And Results

The focused commands and the clean evidence-head full verification completed from the repository root:

```text
pnpm governance:check                 exit 0
pnpm governance:check-json            exit 0; parsed status VALID
pnpm test:governance                  exit 0; 67 passed, 0 failed
pnpm governance:check-lf-checkout     exit 0; LF attributes and autocrlf checkout bytes passed
pnpm clean-agent:validate             exit 0; VALID, 2 runs, 0 findings
pnpm architecture:check               exit 0
pnpm test:architecture                exit 0; 55 passed, 0 failed, 2 Windows EPERM file-symlink skips
pnpm product:reason-codes             exit 0
pnpm test:product-reason-codes        exit 0; 23 passed, 0 failed
pnpm product:fixtures                 exit 0; 49/49 fixtures PASS in stable order
pnpm product:fixture-inventory        exit 0; generated inventory equality PASS
pnpm test:product-fixtures            exit 0; 23 passed, 0 failed
pnpm test:trusted-config              exit 0; 13 passed, 0 failed, 1 Windows EPERM file-symlink skip
pnpm test:release-orchestrator        exit 0; 9 passed, 0 failed
pnpm test:evidence-gate              exit 0; 229 passed, 0 failed, 8 Windows symlink skips
pnpm proofrail-release:fixture        exit 0; committed canonical release input and bundle equality retained
pnpm test:static-evaluator            exit 0; 10 passed, 0 failed
pnpm typecheck:phase1                 exit 0
pnpm test:kernel                      exit 0; 475 passed, 0 failed
pnpm verify command chain             exit 0; 904 Node tests passed, 11 Windows environment skips, 0 failed
git diff --check                      exit 0 as part of pnpm verify
```

The Windows skips are existing operating-system denials for file-symbolic-link construction; no test was deleted, skipped, weakened, or converted to allowed failure. The retained implementation adds no target checkout, target content inspection, target command or verification execution, Verification Receipt, adapter, network, credential, GitHub write, API, MCP, web, product-runtime model, Inference Zone behavior, publication, release, or deployment. The mechanics close DEBT-002 through DEBT-005 only for the retained current surface and do not establish general product reliability, deployment readiness, trusted-release status, external acceptance, or a Proofrail product Verdict.

## PRODUCT-MARKET-001 Validation Evidence

Date: 2026-07-18.

Exact baseline: `f643815f4acc716bcf817cb78636a9fa94ce7523`. The retained public-prototype source candidate is `b89f4bd7ac31780424fe203c5a0f8ce306d647b1`. The externally supplied authority bytes retain SHA-256 values `D8419049A948E45904097800F2D7A242D6EC437F889A9A58C9723D40B67E679C` for the Machine Task Contract, `7A76DCA50F3F76167EA92F5AF68D64ACFCE8539C03EAE20262876F5D6423A683` for Trusted Configuration, `C4AFB49EE70B3701837DF8ACC65427A180CF0453ABA773265B9DFC159E11CC1F` for Policy, and `C195378ECDDDAE3FDE703EFC6A9A9C052A09683F68CF3490D2730A71F1B84C61` for the Evidence Contract.

The final source candidate passed `pnpm verify` on Windows with Node `v24.18.0` and Corepack-managed pnpm `11.7.0`; `git diff --check` remained part of the successful command chain. The Codex desktop bundled Node `v24.14.0` did not contain its adjacent Corepack distribution, so verification used the installed system Node. The temporary PATH shim used to make recursive package scripts select that same runtime was removed and is not retained. Existing Windows file-symlink cases that receive `EPERM` retain their existing platform skips; no test was deleted, weakened, newly skipped, or converted to allowed failure.

A fresh code-quality pass found that worktree stability originally compared retained entries and new Git metadata but did not reject a new ordinary target path. That could let an earlier verification command create a non-generated sentinel consumed by a later command. The retained remediation rejects every new path outside the narrowly recognized generated roots, permits fresh top-level `dist` and workspace `node_modules` directories only as real directories, and preserves mutation, deletion, replacement, relinking, and Git-metadata protections. New unit and CLI regressions cover top-level and nested additions, a generated-root type mismatch, and a runner-created sentinel before bundle publication. Subsequent fresh passes found that `.git/node_modules/**` and `node_modules` below an arbitrary existing non-package directory could otherwise be mistaken for allowed generated roots. The final implementation rejects every newly added `.git/**` path before generated-output allowances and permits a new `node_modules` root only when its exact parent contained an ordinary `package.json` in the retained baseline snapshot. Regressions cover both bypasses while preserving root and workspace package installation outputs.

The final live-boundary pass also found three pre-publication gaps. The retained workflow now gives the control-plane prototype step a read-only GitHub token while the verification runner, target command environment, and retained artifacts remain token-free. It computes the base-configuration digest from `git show` at the exact base SHA, and the CLI rejects mismatched checked-out bytes with `PRF_STALE_BASE` before runner spawn. After evaluation and before any Evidence Bundle write, the CLI repeats path, worktree, base checkout, target checkout, and live pull-request head checks; a race now emits only a delivery-failure packet. The reviewed reusable-workflow pin and all consumer examples were advanced to the exact workflow source commit. New regressions cover dirty base configuration, the final live-head race, control-plane token isolation, and exact workflow-source equality. A retained-evidence integrity regression now also resolves every recorded candidate as a real ancestor commit, requires summary/full-verification/cleanup candidate equality, binds the engineering narrative to that SHA, limits every post-candidate change to the exact validation-only tail, verifies the claimed site-unchanged interval, and recomputes every retained live-artifact and screenshot SHA-256 from raw Git-blob bytes. The focused market suite reports 90 passed, 0 failed, and one existing Windows symbolic-link skip; the complete source candidate subsequently passed `pnpm verify`.

Fresh browser evidence covers 375, 768, and 1280 pixel layouts plus settled skip-link, focus, and anchor states. The observed page had zero console, page, or request errors; no horizontal overflow; visible primary navigation; intact hero phrasing at and above 768 pixels with intentional mobile wrapping; expected anchor offsets; a visible first-Tab skip link; and effective reduced-motion behavior. Two fresh review passes independently returned `PASS` for visual precision and design quality. Exact PNG dimensions and SHA-256 values are retained in `fixtures/market-prototype/validation-evidence/product-market-001/browser-visual-qa.json`. After those screenshots, the only site change replaced one 40-character reusable-workflow SHA with another 40-character SHA; no CSS, layout, navigation, accessibility behavior, prose structure, or asset changed, and the public-site regression suite passed against the final source candidate. The screenshot hashes remain evidence for the recorded visual candidate rather than exact current page bytes.

Live consumer pull request run `29560665111` succeeded. Proofrail workflow run `29560665469` checked out exact workflow source `454eaa9f87950829108281a617c6b38dcbd7e1d6`, completed setup, installation, collection, and artifact upload, then failed closed at evaluation with `BLOCKED_EXECUTION_BOUNDARY`. Its exact failure, summary, telemetry bytes, digests, and run metadata are retained under `fixtures/market-prototype/validation-evidence/product-market-001/live-run-29560665469/`.

The remaining limitation is authoritative rather than cosmetic: no approved `GITHUB_HOSTED_LINUX_SANDBOX_V1` attestation provider was available. Consequently no production Evidence Bundle or product Verdict was produced, and no trusted release, deployment authorization, external acceptance, or consumer pull-request merge is claimed. Proofrail did not fabricate an attestation or broaden authority. A successful live production evaluation remains pending until the authority-approved attestation is supplied and the workflow is rerun.
