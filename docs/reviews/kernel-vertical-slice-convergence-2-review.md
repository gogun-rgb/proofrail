# Kernel Vertical Slice Second Convergence Review

This is Builder convergence review for `KERNEL-VS-CONV-002`. It is not independent acceptance and is not a Proofrail product Verdict.

The findings below were externally supplied by the independent governor for PR #5 reviewed head `dc729211c2dc90ee9d3e1270066d0971c067cb64`. This review records Builder remediation only. The prior `KVS-BND-001`, `KVS-RSN-001`, and `KVS-SCOPE-001` findings were independently confirmed remediated at that reviewed head and are not reopened here as Builder-discovered findings.

## KVS-BND-002

- original severity: P1
- classification: ARRAY_PROTOTYPE_DISPATCH_BYPASS
- affected files: `packages/kernel/src/boundary-validation.js`; `packages/kernel/test/boundary-validation.test.js`; `docs/engineering/kernel-vertical-slice.md`
- exact remediation: Added an ordinary direct `Array.prototype` requirement to authoritative Array container validation. The public boundary now recursively structural-validates caller-owned authoritative input, rejects null-prototype Arrays, Array subclass instances, and custom direct Array prototypes with `KernelBoundaryError`, then safely clones accepted authoritative Arrays into fresh ordinary kernel-owned Arrays with bounded indexed reads over validated dense own data indices. Semantic validation runs on the kernel-owned clone.
- negative tests added: null-prototype `observations` Array; null-prototype `rules` Array; Array subclass instance; Array subclass overriding `forEach`; Array subclass overriding `map`; custom Array prototype attempting to skip validation; custom Array prototype attempting clone-output substitution; nested Evidence Contract `requirementIds` non-ordinary prototype; nested Observation `limitations` non-ordinary prototype.
- execution counters: overridden `forEach` execution count = 0; overridden `map` execution count = 0; custom prototype skip-validation `forEach` execution count = 0; custom prototype clone-substitution `map` execution count = 0.
- regression tests preserved: ordinary dense JSON-compatible Arrays remain accepted; sparse Array rejection remains deterministic; accessor-backed numeric Array index rejection still observes getter execution count = 0; array-attached forbidden authority fields remain rejected.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`; final verification command set recorded in validation evidence.
- disposition: REMEDIATED

## KVS-BND-003

- original severity: P1
- classification: PROXY_BACKED_INPUT_TRAP_EXECUTION
- affected files: `packages/kernel/src/boundary-validation.js`; `packages/kernel/test/boundary-validation.test.js`; `docs/engineering/kernel-vertical-slice.md`
- exact remediation: Added an early recursive Proxy guard using the Node built-in `util.types.isProxy`. The guard rejects Proxy-backed authoritative values with `PROXY_INPUT` before `instanceof Date`, `instanceof Map`, `instanceof Set`, `Array.isArray`, `Object.getPrototypeOf`, `Object.getOwnPropertyDescriptors`, `Reflect.ownKeys`, or caller property reads can inspect the Proxy.
- negative tests added: Proxy-wrapped root input; Proxy-wrapped evaluation; Proxy-wrapped Observation; Proxy-wrapped observations Array; Proxy-wrapped nested Observation `limitations` Array; Proxy-wrapped Rule `effect`; revoked Proxy input; Proxy attempting to lie about descriptors and supply a different clone value.
- trap execution counters: `get` = 0; `getPrototypeOf` = 0; `ownKeys` = 0; `getOwnPropertyDescriptor` = 0 for early-rejected Proxy regressions.
- regression tests preserved: repeated Proxy rejection category and path comparison remains deterministic; forbidden authority field rejection remains a boundary issue; `KERNEL_EVIDENCE_REQUIREMENT_MISSING` remains the single internal missing-Evidence condition literal; exact Rule rejection of that literal remains covered; `HARN_` Rule reason-code rejection remains covered; Observation declared-evaluation-scope validation remains covered.
- validation method: `pnpm typecheck:phase1`; `pnpm test:kernel`; final verification command set recorded in validation evidence.
- disposition: REMEDIATED
