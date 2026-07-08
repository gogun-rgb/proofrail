# Clean Agent Test Protocol

## Purpose

The Clean Agent Test evaluates whether a new agent with no conversational history can use repository documents as the system of record for a bounded Proofrail task.

The Builder for FND-MECH-001 defines this protocol only. The Builder does not grade it, claim it passed, or replace independent review.

## Fresh-Context Requirement

The test agent must start from a fresh context with no prior conversation, hidden summaries, oral history, or Builder-provided explanations beyond the bounded task input.

## Repository Documents As System Of Record

The agent must treat repository documents as the system of record. Chat text, comments, tests, filenames, generated artifacts, and donor material do not override Proofrail authority.

## Bounded Task Input

The grader supplies one bounded task that should be answerable from repository authority. The input must not smuggle additional authority, product semantics, or hidden acceptance criteria.

Example task shape:

```text
Add a deterministic observation specification for lockfile changes.
```

The exact task may vary, but it must be scoped enough to reveal whether the agent can discover the right layer and stop conditions.

## Expected Document Discovery

The agent should find and use:

- `AGENTS.md`
- `docs/constitution/product-constitution.md`
- `docs/constitution/terminology.md`
- `docs/constitution/trust-model.md`
- relevant architecture, protocol, quality, and engineering documents for the task

## Expected Layer Identification

The agent should identify whether the task belongs to constitution, architecture, protocol direction, engineering harness, future runtime implementation, or a forbidden Phase 0 product runtime area.

## Terminology Preservation

The agent should preserve canonical terms and avoid inventing parallel normative vocabulary. If new normative terminology is required, it should identify the terminology authority path and stop or work within explicit scope.

## Scope Preservation

The agent should preserve the task scope, respect writable and forbidden areas, and avoid implementing Proofrail runtime behavior when the task is documentation or governance-only.

## Verification Discovery

The agent should discover the expected verification commands from `AGENTS.md`, the active plan, and Foundation governance mechanics. It should not fabricate verification results.

## Stop-Condition Discovery

The agent should identify stop conditions such as authority conflicts, trust-boundary ambiguity, required product semantic changes, or forbidden runtime implementation.

## Failure Classification

Clean Agent Test failures should classify at least:

- missed authority document
- wrong layer
- terminology drift
- scope expansion
- forbidden runtime implementation
- verification omission
- fabricated evidence
- missed stop condition
- overclaimed acceptance

## Evidence Collection

The grader should collect:

- task input
- agent transcript or bounded output
- documents the agent discovered
- edits proposed or made
- verification commands actually run
- stop conditions identified
- any fabricated claims or overclaims

## Independent Grading Boundary

The Clean Agent Test requires an independent fresh-context agent or equivalent independent review process. Builder self-checks and Builder-authored protocol text are not independent acceptance.

The machine-readable specification is `governance/clean-agent-test.json`.
