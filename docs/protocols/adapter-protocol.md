# Adapter Protocol Foundation

## Authority

This document is authoritative for Phase 0 adapter protocol direction.

## Current Phase

No adapter protocol runtime, adapter implementation, or language-specific package is implemented in Phase 0.

## Capability Negotiation

Adapters must expose explicit capabilities. Capability support MUST represent more than naive booleans.

Canonical capability states:

| State | Meaning |
| --- | --- |
| `supported` | The adapter intentionally supports the capability for the declared target scope with documented limits. |
| `partial` | The adapter intentionally covers only a subset of the capability, and the missing subset is known and documented. |
| `unsupported` | The adapter does not provide the capability for the declared target scope. |
| `degraded` | The adapter would normally provide stronger support, but current environment, parser, version, dependency, or runtime conditions reduce capability for this evaluation. |

Semantic difference:

- `partial` describes designed capability coverage.
- `degraded` describes a temporary or contextual reduction from expected capability.

## Adapter Identity

An adapter must be able to expose:

- adapter identity
- adapter version
- target language or language family
- capability states
- limitations
- deterministic reason codes where appropriate
- environment or parser constraints where relevant

## Capability Examples

Potential future capabilities include:

- file discovery
- import extraction
- symbol extraction
- call relationship extraction
- test discovery
- semantic change observation
- framework hints

This list is design direction, not implemented behavior.

## Kernel Boundary

The kernel must not contain language-specific special cases. If a future adapter discovers a protocol gap, the adapter task must report the gap rather than modifying core protocol semantics outside scope.

## Language Compatibility Direction

Deep capability goals: TypeScript, JavaScript, Python.

Structural capability goals: Go, Rust, Java, C#, Kotlin.

Generic graceful fallback goals: C, C++, Ruby, PHP, Swift, Dart, Shell, Lua, Elixir, Scala, and unknown text-based languages.

Proofrail MUST NOT claim equivalent semantic capability across languages.