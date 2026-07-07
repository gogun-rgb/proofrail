# Known Debt

## Authority

This document records known debt and open risks. It is not a product roadmap.

## Debt Items

### DEBT-001: Product Runtime Reason-Code Registry Not Yet Created

Observation: Stable reason codes are required by product direction. FND-MECH-001 creates a `HARN_` Foundation engineering harness registry, but no Proofrail product runtime reason-code registry exists.

Risk: Future implementation may invent inconsistent reason-code namespaces.

Current control: `governance/harness-reason-codes.json` separates harness findings from future product reason codes and the validator rejects unregistered harness findings.

Disposition: OPEN.

### DEBT-002: Architecture Rules Are Not Mechanically Enforced

Observation: Dependency rules are documented, but no package-boundary checker exists in Phase 0.

Risk: Future packages could violate architecture boundaries before checks exist.

Current control: Dependency rules are explicit and `governance/architecture-check-preparation.json` records prepared-not-enforced future check classes without redefining dependency authority.

Disposition: OPEN.

### DEBT-003: Clean Agent Test Protocol Not Yet Executable

Observation: The Clean Agent Test protocol and machine-readable specification exist, but the test has not been run or independently graded.

Risk: Agent legibility remains independently reviewable rather than mechanically exercised.

Current control: [../engineering/clean-agent-test.md](../engineering/clean-agent-test.md) defines the protocol and `governance/clean-agent-test.json` records `protocol_defined_not_executed`.

Disposition: OPEN.

### DEBT-004: Fixture Corpus Not Yet Executable

Observation: Fixture and adversarial fixture strategy is documented, but no executable fixture corpus or fixture runner exists in Phase 0.

Risk: Future implementation cannot yet mechanically exercise adversarial repository content, protocol malformed inputs, adapter capability cases, or verification receipt boundaries.

Current control: `docs/engineering/fixture-strategy.md` defines taxonomy, identity, provenance, oracles, ordering, versioning, mutation rules, and adversarial classes for future authorized fixture work.

Disposition: OPEN.

### DEBT-005: Governance Tests Are Not Product Fixtures

Observation: FND-MECH-001 adds synthetic governance validator tests, but these are not Proofrail product fixtures and do not exercise repository inspection, adapter behavior, verification execution, policy evaluation, Evidence satisfaction, Verdict reduction, or Evidence Bundle finalization.

Risk: Future work may overread governance test coverage as product reliability coverage.

Current control: Foundation mechanization documentation and the Foundation Gate separate governance tests from future executable product fixtures.

Disposition: OPEN.
