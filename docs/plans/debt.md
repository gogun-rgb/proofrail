# Known Debt

## Authority

This document records known debt and open risks. It is not a product roadmap, a Policy, a release decision, or an authoritative Proofrail Verdict.

## Classification Vocabulary

Statuses are `OPEN`, `PLANNED`, `IN_PROGRESS`, `MITIGATED`, `CLOSED`, and `ACCEPTED_RISK`.

Release classifications are:

- `BLOCKS_PUBLIC_RELEASE`: must be resolved or explicitly accepted before publishing general-use packages or distributions
- `BLOCKS_TRUSTED_RELEASE`: must be resolved or explicitly accepted before a future trusted release decision in the affected scope
- `DOES_NOT_BLOCK_RELEASE`: controlled debt that does not block the current bounded release scope
- `RESEARCH_ONLY`: evidence or automation work that is not a current release gate

An `OPEN` status does not automatically make an item release-blocking. The release classification and affected scope control that decision.

## Summary

| ID | Severity | Release classification | Owner | Target milestone | Status |
| --- | --- | --- | --- | --- | --- |
| DEBT-001 | High | `BLOCKS_PUBLIC_RELEASE` | Proofrail maintainers | Before first public package release | OPEN |
| DEBT-002 | Medium | `DOES_NOT_BLOCK_RELEASE` | Proofrail maintainers | Before next package-surface expansion | OPEN |
| DEBT-003 | Low | `RESEARCH_ONLY` | Repository engineering | Clean Agent Test automation slice | OPEN |
| DEBT-004 | High | `BLOCKS_PUBLIC_RELEASE` | Proofrail maintainers | Before first public package release | OPEN |
| DEBT-005 | Medium | `DOES_NOT_BLOCK_RELEASE` | Repository engineering | Executable fixture corpus slice | OPEN |

## Debt Items

### DEBT-001: Product Runtime Reason-Code Registry Not Yet Created

Status: OPEN.

Severity: High.

Product impact: Public CLI or integration consumers cannot yet rely on one documented, stable product reason-code namespace.

Release classification: `BLOCKS_PUBLIC_RELEASE`.

Owner: Proofrail maintainers.

Target milestone: Before first public package release.

Dependencies: An authorized product-runtime reason-code contract and error-reference surface.

Observation: Stable reason codes are required by product direction. FND-MECH-001 creates a `HARN_` Foundation engineering harness registry, but no Proofrail product runtime reason-code registry exists.

Risk: Future implementation may invent inconsistent reason-code namespaces.

Current control: `governance/harness-reason-codes.json` separates harness findings from future product reason codes and the validator rejects unregistered harness findings.

Exit criteria:

- A product reason-code registry and schema are authorized and committed.
- Every emitted product reason code is registered and documented.
- Unknown and malformed reason codes fail closed in focused tests.

Verification: Focused registry tests, error-reference checks, and `pnpm verify` pass on the retained implementation.

### DEBT-002: Architecture Rules Are Only Partially Mechanically Enforced

Status: OPEN.

Severity: Medium.

Product impact: The current six-package boundary is guarded, but future loading mechanisms or package classes could escape the narrow mechanical checks.

Release classification: `DOES_NOT_BLOCK_RELEASE` for the current bounded six-package scope.

Owner: Proofrail maintainers.

Target milestone: Before next package-surface expansion.

Dependencies: Any Machine Task Contract that adds a package, workspace edge, or production loading mechanism.

Observation: `ARCH-BOUND-001`, extended by `PRODUCT-RELEASE-001`, provides a bounded repository engineering checker that freezes the exact current six-package classification, workspace dependency declarations and edges, Node import allowlist, relative package containment, and recognized static production-source loads. It does not implement the complete semantics of the authoritative dependency rules.

Risk: Generated or subprocess-loaded code, `eval`, `new Function`, aliased `require`, computed-property `require` invocation, aliased `createRequire`, transitive dependencies, broader delivery-definition ownership, inference isolation, and future package classes can still violate architecture intent outside the checker's narrow observable boundary.

Current control: `pnpm architecture:check` and `pnpm test:architecture` run inside `pnpm verify`; future packages, workspace edges, or runtime import surfaces fail closed until an explicit Machine Task Contract and checker update records them. `governance/architecture-check-preparation.json` records the bounded partial state without redefining dependency authority.

Exit criteria:

- The checker covers every production loading form authorized for the expanded package surface.
- Synthetic negative cases demonstrate that each newly in-scope forbidden edge fails closed.
- Documentation states any remaining unenforced architecture semantics.

Verification: `pnpm architecture:check`, `pnpm test:architecture`, and `pnpm verify` pass with the expanded scope tests.

### DEBT-003: Clean Agent Test Protocol Not Yet Executable

Status: OPEN.

Severity: Low.

Product impact: Repository instructions are reviewable but have not been exercised as a reproducible clean-agent onboarding test.

Release classification: `RESEARCH_ONLY`.

Owner: Repository engineering.

Target milestone: Clean Agent Test automation slice.

Dependencies: A clean checkout harness and recorded grading procedure.

Observation: The Clean Agent Test protocol and machine-readable specification exist, but the test has not been run or independently graded.

Risk: Agent legibility remains independently reviewable rather than mechanically exercised.

Current control: [../engineering/clean-agent-test.md](../engineering/clean-agent-test.md) defines the protocol and `governance/clean-agent-test.json` records `protocol_defined_not_executed`.

Exit criteria:

- The protocol runs from a clean checkout without relying on conversation history.
- The run records its exact repository SHA, inputs, outputs, and grading evidence.
- A repeat run produces the same pass/fail interpretation under unchanged inputs.

Verification: The executable clean-agent test and its evidence record pass the repository's focused governance checks.

### DEBT-004: Fixture Corpus Not Yet Executable

Status: OPEN.

Severity: High.

Product impact: General-use releases cannot demonstrate systematic adversarial coverage for product input, Evidence, adapter, and Verification Receipt boundaries.

Release classification: `BLOCKS_PUBLIC_RELEASE`.

Owner: Proofrail maintainers.

Target milestone: Before first public package release.

Dependencies: An authorized fixture runner and product surfaces whose behavior can be exercised.

Observation: Fixture and adversarial fixture strategy is documented, but no general positive, negative, and adversarial product fixture corpus or corpus runner satisfies that strategy yet. The bounded offline release fixture verifier at `examples/release/verify-fixture.mjs` exercises one exact release-candidate fixture; it is not the broader corpus.

Risk: Future implementation cannot yet mechanically exercise adversarial repository content, protocol malformed inputs, adapter capability cases, or Verification Receipt boundaries.

Current control: `docs/engineering/fixture-strategy.md` defines taxonomy, identity, provenance, oracles, ordering, versioning, mutation rules, and adversarial classes for future authorized fixture work.

Exit criteria:

- A deterministic fixture runner executes checked-in positive and negative product fixtures.
- Implemented trust boundaries have adversarial cases with explicit oracles.
- Malformed, ambiguous, and unsupported inputs fail closed without weakened assertions or skips.

Verification: Focused fixture-runner tests and `pnpm verify` pass, and fixture identities and expected outputs are committed.

### DEBT-005: Governance Tests Are Not Product Fixtures

Status: OPEN.

Severity: Medium.

Product impact: Readers may overestimate product coverage when governance harness tests are reported without a separate product-fixture inventory.

Release classification: `DOES_NOT_BLOCK_RELEASE` for the current bounded scope; DEBT-004 separately blocks a general public release.

Owner: Repository engineering.

Target milestone: Executable fixture corpus slice.

Dependencies: DEBT-004.

Observation: FND-MECH-001 adds synthetic governance validator tests, but these are not Proofrail product fixtures and do not exercise repository inspection, adapter behavior, verification execution, policy evaluation, Evidence satisfaction, Verdict reduction, or Evidence Bundle finalization.

Risk: Future work may overread governance test coverage as product reliability coverage.

Current control: Foundation mechanization documentation and the Foundation Gate separate governance tests from the bounded offline release fixture and from any future general product fixture corpus.

Exit criteria:

- Product fixture suites are listed separately from governance harness tests.
- Coverage claims name the exact implemented product surfaces exercised by each suite.
- User-facing documentation does not present governance test counts as product reliability evidence.

Verification: Documentation regression checks and the executable product fixture inventory pass without conflating governance and product tests.
