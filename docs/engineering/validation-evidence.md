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
