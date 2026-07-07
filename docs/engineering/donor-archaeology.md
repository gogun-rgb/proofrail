# Donor Archaeology

## Authority

This document is authoritative for the future Donor Archaeology process.

## Current Phase

Phase 0 defines the process only. It does not inspect, copy, or classify donor repositories.

Actual donor repository identities and URLs must be supplied by a future Machine Task Contract.

## Classification Vocabulary

### PORT

Direct code reuse is justified, licensing is compatible, security assumptions are understood, and the code fits Proofrail architecture without authority leakage.

### REIMPLEMENT

The donor behavior is valuable, but the implementation should be recreated within Proofrail architecture.

### REFERENCE

The donor is useful for conceptual learning only. No behavior or code should be transferred without a later task.

### REJECT

The capability or approach should not enter Proofrail.

## Required Separation

Each donor capability must evaluate:

- behavioral value
- architectural compatibility

Useful behavior does not imply architecture compatibility. Existing code is not automatically efficient to reuse.

## Capability Record

Future donor archaeology should collect:

- capability name
- donor source repository
- relevant paths
- behavioral purpose
- known fixtures or tests
- security assumptions
- architecture assumptions
- reuse disposition
- rationale
- migration or reimplementation risks

## Process

1. Confirm the donor source is explicitly named by a Machine Task Contract.
2. Identify the bounded capability under review.
3. Record behavioral value separately from architecture compatibility.
4. Classify as `PORT`, `REIMPLEMENT`, `REFERENCE`, or `REJECT`.
5. Record risks and required follow-up tasks.
6. Do not expand donor inspection beyond the authorized scope.