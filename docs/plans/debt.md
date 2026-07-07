# Known Debt

## Authority

This document records known debt and open risks. It is not a product roadmap.

## Debt Items

### DEBT-001: Reason-Code Registry Not Yet Created

Observation: Stable reason codes are required by product direction, but no registry exists in Phase 0.

Risk: Future implementation may invent inconsistent reason-code namespaces.

Current control: Foundation Gate Mechanization names reason-code registry validation as future work.

Disposition: OPEN.

### DEBT-002: Architecture Rules Are Not Mechanically Enforced

Observation: Dependency rules are documented, but no package-boundary checker exists in Phase 0.

Risk: Future packages could violate architecture boundaries before checks exist.

Current control: Dependency rules are explicit and the active next task calls for architecture rule encoding preparation.

Disposition: OPEN.

### DEBT-003: Clean Agent Test Protocol Not Yet Executable

Observation: The Clean Agent Test is defined conceptually but not executable.

Risk: Agent legibility remains independently reviewable rather than mechanically exercised.

Current control: Foundation Gate documents the conceptual test and separates it from Builder self-review.

Disposition: OPEN.