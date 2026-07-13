# Product Fixture Inventory

This file is generated from `fixtures/product`. Product fixtures are distinct from repository governance tests.
Fixture scenarios are synthetic and untrusted; instruction-shaped content remains inert.
Inputs marked `origin: repository` are digest-bound references to committed bytes and do not become fixture authority.

## Fixtures

| Fixture | Class | Operation | Implemented surface | Known limitations |
| --- | --- | --- | --- | --- |
| `contracts.constants.v1` | positive | `contracts.constants` | @proofrail/contracts#export:. | Covers current exported constants, not future protocol versions. |
| `evidence-gate.cli-adversarial.v1` | adversarial | `evidence-gate.static-cli` | @proofrail/evidence-gate#bin:evidence-gate | Exercises inert instruction-shaped and synthetic secret-shaped content through the static CLI; no output file is written. |
| `evidence-gate.cli-malformed.v1` | malformed | `evidence-gate.static-cli` | @proofrail/evidence-gate#bin:evidence-gate | Exercises malformed JSON rejection through the static CLI. |
| `evidence-gate.cli-negative.v1` | negative | `evidence-gate.static-cli` | @proofrail/evidence-gate#bin:evidence-gate | Exercises deterministic rejection of a structurally valid packet input with an undeclared evidence reference. |
| `evidence-gate.cli-positive.v1` | positive | `evidence-gate.static-cli` | @proofrail/evidence-gate#bin:evidence-gate | Exercises the static JSON CLI without output-file alias behavior. |
| `evidence-gate.github-arguments-adversarial.v1` | adversarial | `evidence-gate.github-arguments` | @proofrail/evidence-gate#bin:evidence-gate-github | Exercises fail-closed GraphQL integer-bound enforcement without invoking GitHub. |
| `evidence-gate.github-arguments-malformed.v1` | malformed | `evidence-gate.github-arguments` | @proofrail/evidence-gate#bin:evidence-gate-github | Exercises missing argument-value rejection without invoking GitHub. |
| `evidence-gate.github-arguments-negative.v1` | negative | `evidence-gate.github-arguments` | @proofrail/evidence-gate#bin:evidence-gate-github | Does not call gh or access the network. |
| `evidence-gate.github-arguments-positive.v1` | positive | `evidence-gate.github-arguments` | @proofrail/evidence-gate#bin:evidence-gate-github | Exercises argument parsing only; GitHub collection and file access are not invoked. |
| `evidence-gate.github-normalize-adversarial.v1` | adversarial | `evidence-gate.github-normalize` | @proofrail/evidence-gate#export:./github | Exercises normalization and mapping only; GitHub collection is not invoked. |
| `evidence-gate.github-normalize-malformed.v1` | malformed | `evidence-gate.github-normalize` | @proofrail/evidence-gate#export:./github | Exercises malformed snapshot rejection before mapping; GitHub collection is not invoked. |
| `evidence-gate.github-normalize-negative.v1` | negative | `evidence-gate.github-normalize` | @proofrail/evidence-gate#export:./github | Exercises deterministic rejection of an unsafe declared write-scope pattern. |
| `evidence-gate.github-normalize-positive.v1` | positive | `evidence-gate.github-normalize` | @proofrail/evidence-gate#export:./github | Exercises normalized snapshot mapping only; GitHub collection is not invoked. |
| `evidence-gate.packet-adversarial.v1` | adversarial | `evidence-gate.packet` | @proofrail/evidence-gate#export:. | Static input can preserve untrusted prose; it never produces a product Verdict. |
| `evidence-gate.packet-malformed.v1` | malformed | `evidence-gate.packet` | @proofrail/evidence-gate#export:. | Exercises malformed packet rejection for a missing pullRequest object. |
| `evidence-gate.packet-negative.v1` | negative | `evidence-gate.packet` | @proofrail/evidence-gate#export:. | Exercises deterministic rejection of a semantically undeclared evidence reference. |
| `evidence-gate.packet-positive.v1` | positive | `evidence-gate.packet` | @proofrail/evidence-gate#export:. | Covers the bounded static packet surface, not Evidence or Verdict authority. |
| `evidence-gate.release-arguments-adversarial.v1` | adversarial | `release.arguments` | @proofrail/evidence-gate#bin:proofrail-release<br>@proofrail/evidence-gate#export:./release | Exercises duplicate-option rejection before configuration or network access. |
| `evidence-gate.release-arguments-malformed.v1` | malformed | `release.arguments` | @proofrail/evidence-gate#bin:proofrail-release<br>@proofrail/evidence-gate#export:./release | Exercises missing argument-value rejection before configuration or network access. |
| `evidence-gate.release-arguments-negative.v1` | negative | `release.arguments` | @proofrail/evidence-gate#bin:proofrail-release<br>@proofrail/evidence-gate#export:./release | Exercises deterministic rejection when the required trusted configuration path is absent. |
| `evidence-gate.release-arguments-positive.v1` | positive | `release.arguments` | @proofrail/evidence-gate#bin:proofrail-release<br>@proofrail/evidence-gate#export:./release | Parses arguments only; collection, output, and release delivery are not invoked. |
| `kernel.forbidden-authority.v1` | adversarial | `kernel.evaluate` | @proofrail/kernel#export:. | Covers the explicit forbidden modelConfidence authority field. |
| `kernel.malformed-input.v1` | malformed | `kernel.evaluate` | @proofrail/kernel#export:. | Exercises fail-closed rejection of a missing kernel schema version and required records. |
| `kernel.positive.v1` | positive | `kernel.evaluate` | @proofrail/kernel#export:. | Covers the current Phase 1 synthetic-input kernel slice. |
| `kernel.unknown-field.v1` | negative | `kernel.evaluate` | @proofrail/kernel#export:. | Covers one representative unknown root field rejection. |
| `release-orchestrator.offline-golden.v1` | positive | `release-orchestrator.offline` | @proofrail/release-orchestrator#export:. | Uses the current committed offline release authority and golden; no live collection occurs. |
| `release-orchestrator.snapshot-adversarial.v1` | adversarial | `release-orchestrator.offline` | @proofrail/release-orchestrator#export:. | Exercises fail-closed rejection of a valid snapshot selected for a different target; no live collection occurs. |
| `release-orchestrator.snapshot-malformed.v1` | malformed | `release-orchestrator.offline` | @proofrail/release-orchestrator#export:. | Uses its driver record as an inert malformed snapshot and performs no live collection. |
| `release-orchestrator.snapshot-negative.v1` | negative | `release-orchestrator.offline` | @proofrail/release-orchestrator#export:. | Uses a committed synthetic exact-target snapshot with a failed check; no live collection occurs. |
| `static-evaluator.invalid-utf8.v1` | malformed | `static-evaluator.cli` | @proofrail/static-evaluator#bin:static-evaluate | Materializes two invalid UTF-8 bytes in a temporary file. |
| `static-evaluator.negative.v1` | negative | `static-evaluator.cli` | @proofrail/static-evaluator#bin:static-evaluate | Exercises a valid kernel input whose observation contradicts the required value and produces a deterministic non-admissible bundle. |
| `static-evaluator.oversize.v1` | adversarial | `static-evaluator.cli` | @proofrail/static-evaluator#bin:static-evaluate | Materializes exactly 1 MiB plus one byte in a temporary file. |
| `static-evaluator.positive.v1` | positive | `static-evaluator.cli` | @proofrail/static-evaluator#bin:static-evaluate | Exercises stdout delivery only; output-file behavior remains in package tests. |
| `trusted-config.hash-mismatch.v1` | negative | `trusted-config.load` | @proofrail/trusted-config#export:. | Mutates only a temporary copy of the digest-bound Policy. |
| `trusted-config.loader-positive.v1` | positive | `trusted-config.load` | @proofrail/trusted-config#export:. | Loads temporary copies of the current exact release configuration documents. |
| `trusted-config.path-traversal-adversarial.v1` | adversarial | `trusted-config.load` | @proofrail/trusted-config#export:. | Exercises fail-closed trusted configuration path traversal rejection against a temporary staged root. |
| `trusted-config.strict-json-malformed.v1` | malformed | `trusted-config.strict-json` | @proofrail/trusted-config#export:. | Covers duplicate-key rejection through the public strict JSON parser. |
| `trusted-config.strict-json-positive.v1` | positive | `trusted-config.strict-json` | @proofrail/trusted-config#export:. | Covers strict JSON parsing independently of full configuration schema validation. |

## Export and CLI coverage

The coverage map is derived from the current six package manifests and validation fails on drift.

| Surface | Boundary | Fixture ids | Class coverage and applicability |
| --- | --- | --- | --- |
| `@proofrail/contracts#export:.` | `contract-constants` | `contracts.constants.v1` | positive; No-input constant export; negative, malformed, and adversarial fixture classes are inapplicable. |
| `@proofrail/evidence-gate#bin:evidence-gate` | `static-cli-input` | `evidence-gate.cli-adversarial.v1`<br>`evidence-gate.cli-malformed.v1`<br>`evidence-gate.cli-negative.v1`<br>`evidence-gate.cli-positive.v1` | adversarial, malformed, negative, positive |
| `@proofrail/evidence-gate#bin:evidence-gate-github` | `github-cli-arguments` | `evidence-gate.github-arguments-adversarial.v1`<br>`evidence-gate.github-arguments-malformed.v1`<br>`evidence-gate.github-arguments-negative.v1`<br>`evidence-gate.github-arguments-positive.v1` | adversarial, malformed, negative, positive |
| `@proofrail/evidence-gate#bin:proofrail-release` | `release-cli-arguments` | `evidence-gate.release-arguments-adversarial.v1`<br>`evidence-gate.release-arguments-malformed.v1`<br>`evidence-gate.release-arguments-negative.v1`<br>`evidence-gate.release-arguments-positive.v1` | adversarial, malformed, negative, positive |
| `@proofrail/evidence-gate#export:.` | `static-evidence-packet` | `evidence-gate.packet-adversarial.v1`<br>`evidence-gate.packet-malformed.v1`<br>`evidence-gate.packet-negative.v1`<br>`evidence-gate.packet-positive.v1` | adversarial, malformed, negative, positive |
| `@proofrail/evidence-gate#export:./github` | `github-readonly-normalization` | `evidence-gate.github-normalize-adversarial.v1`<br>`evidence-gate.github-normalize-malformed.v1`<br>`evidence-gate.github-normalize-negative.v1`<br>`evidence-gate.github-normalize-positive.v1` | adversarial, malformed, negative, positive |
| `@proofrail/evidence-gate#export:./release` | `release-cli-arguments` | `evidence-gate.release-arguments-adversarial.v1`<br>`evidence-gate.release-arguments-malformed.v1`<br>`evidence-gate.release-arguments-negative.v1`<br>`evidence-gate.release-arguments-positive.v1` | adversarial, malformed, negative, positive |
| `@proofrail/kernel#export:.` | `deterministic-kernel-boundary` | `kernel.forbidden-authority.v1`<br>`kernel.malformed-input.v1`<br>`kernel.positive.v1`<br>`kernel.unknown-field.v1` | adversarial, malformed, negative, positive |
| `@proofrail/release-orchestrator#export:.` | `offline-release-orchestration` | `release-orchestrator.offline-golden.v1`<br>`release-orchestrator.snapshot-adversarial.v1`<br>`release-orchestrator.snapshot-malformed.v1`<br>`release-orchestrator.snapshot-negative.v1` | adversarial, malformed, negative, positive |
| `@proofrail/static-evaluator#bin:static-evaluate` | `static-evaluator-cli` | `static-evaluator.invalid-utf8.v1`<br>`static-evaluator.negative.v1`<br>`static-evaluator.oversize.v1`<br>`static-evaluator.positive.v1` | adversarial, malformed, negative, positive |
| `@proofrail/trusted-config#export:.` | `trusted-configuration-loader` | `trusted-config.hash-mismatch.v1`<br>`trusted-config.loader-positive.v1`<br>`trusted-config.path-traversal-adversarial.v1`<br>`trusted-config.strict-json-malformed.v1`<br>`trusted-config.strict-json-positive.v1` | adversarial, malformed, negative, positive |

## Explicitly not covered

Target checkout, target repository inspection, target command or verification execution, Verification Receipts, adapters, SARIF, GitHub writes, API, MCP, web, product-runtime model providers, and Inference Zone behavior are unimplemented and not covered.
Passing fixtures are repository engineering evidence only; they do not establish product readiness, trusted release status, or an authoritative Proofrail Verdict.
