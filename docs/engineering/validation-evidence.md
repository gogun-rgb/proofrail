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
