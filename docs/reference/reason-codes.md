# Product Reason Codes

This file is deterministic output from `config/reason-codes/product-reason-codes.json`.
Edit the registry and regenerate this reference together; `pnpm product:reason-codes` rejects byte drift.

## Scope and authority

The registry covers Proofrail-owned machine-readable codes emitted by the six current production packages. It includes the kernel-owned missing-Evidence Verdict reason, kernel boundary issue categories, component Error code values, and the public release-delivery code.

Policy-authored Rule denial codes remain Policy-owned and are not members of this global registry. Their authority and validation continue to come from the selected Policy and kernel boundary. Foundation `HARN_` diagnostics remain in the separate governance registry. Natural-language-only legacy CLI errors and release delivery `stage` values are not machine-readable product code identities.

## Registry policy

- Schema version: `proofrail.reason-code-registry.v1`
- Namespace: `PROOFRAIL_OWNED_PRODUCT_CODES`
- Alias policy: `FORBIDDEN`
- Policy Rule-code boundary: `POLICY_OWNED_EXCLUDED`
- Code identities are stable. Active codes have no replacement.
- A deprecated code remains reserved and must name an existing replacement. Replacement chains must terminate at an active code and must not cycle.

## Codes

| Code | Kind | Category | Surfaces | Visibility | Severity | Retryable | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ACCESSOR_FIELD` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `CYCLIC_INPUT` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `DUPLICATE_IDENTITY` | BOUNDARY_ISSUE | INPUT | kernel, trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `DUPLICATE_KEY` | COMPONENT_ERROR | INPUT | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `FILE_ALIAS` | COMPONENT_ERROR | FILESYSTEM | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `FORBIDDEN_AUTHORITY_FIELD` | BOUNDARY_ISSUE | AUTHORITY | kernel | PUBLIC | ERROR | no | ACTIVE |
| `HASH_MISMATCH` | COMPONENT_ERROR | INTEGRITY | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_ARGUMENT` | COMPONENT_ERROR | INPUT | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_ARRAY` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_EVIDENCE_CONTRACT_SELECTION_PROVENANCE` | BOUNDARY_ISSUE | AUTHORITY | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_JSON_PRIMITIVE` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_LITERAL` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_REASON_CODE` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_REFERENCE` | BOUNDARY_ISSUE | AUTHORITY | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_RULE_AUTHORITY_PROVENANCE` | BOUNDARY_ISSUE | AUTHORITY | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_RULE_PREDICATE` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_STABLE_IDENTITY` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_STRING` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `INVALID_UTF8` | COMPONENT_ERROR | INPUT | evidence-gate, trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `KERNEL_EVIDENCE_REQUIREMENT_MISSING` | VERDICT_REASON | EVIDENCE | kernel | PUBLIC | ERROR | no | ACTIVE |
| `MALFORMED_JSON` | COMPONENT_ERROR | INPUT | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `MISSING_FIELD` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `NON_ENUMERABLE_FIELD` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `NON_JSON_VALUE` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `NON_PLAIN_OBJECT` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `NOT_REGULAR` | COMPONENT_ERROR | FILESYSTEM | evidence-gate, trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `PATH_INVALID` | COMPONENT_ERROR | FILESYSTEM | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `PROOFRAIL_RELEASE_DELIVERY_FAILED` | DELIVERY_ERROR | DELIVERY | evidence-gate | PUBLIC | ERROR | yes | ACTIVE |
| `PROXY_INPUT` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `READ_FAILED` | COMPONENT_ERROR | FILESYSTEM | evidence-gate, trusted-config | PUBLIC | ERROR | yes | ACTIVE |
| `REFERENCE_MISMATCH` | COMPONENT_ERROR | AUTHORITY | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `RESERVED_KERNEL_REASON_CODE` | BOUNDARY_ISSUE | AUTHORITY | kernel | PUBLIC | ERROR | no | ACTIVE |
| `RESERVED_REASON_CODE_NAMESPACE` | BOUNDARY_ISSUE | AUTHORITY | kernel | PUBLIC | ERROR | no | ACTIVE |
| `ROOT_ALIAS` | COMPONENT_ERROR | FILESYSTEM | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `ROOT_INVALID` | COMPONENT_ERROR | FILESYSTEM | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `SAME_FILE` | COMPONENT_ERROR | FILESYSTEM | evidence-gate | INTERNAL | ERROR | no | ACTIVE |
| `SCHEMA_INVALID` | COMPONENT_ERROR | INPUT | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `SNAPSHOT_INVALID` | COMPONENT_ERROR | INPUT | release-orchestrator | PUBLIC | ERROR | no | ACTIVE |
| `SYMBOL_KEY` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `TARGET_MISMATCH` | COMPONENT_ERROR | TARGET | release-orchestrator | PUBLIC | ERROR | no | ACTIVE |
| `TARGET_SCOPE_MISMATCH` | BOUNDARY_ISSUE | TARGET | kernel | PUBLIC | ERROR | no | ACTIVE |
| `TOO_LARGE` | COMPONENT_ERROR | INPUT | evidence-gate, trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `UNEXPECTED_FIELD` | BOUNDARY_ISSUE | INPUT | kernel | PUBLIC | ERROR | no | ACTIVE |
| `UNVALIDATED_CONFIGURATION` | COMPONENT_ERROR | AUTHORITY | trusted-config | PUBLIC | ERROR | no | ACTIVE |
| `WRITE_FAILED` | COMPONENT_ERROR | DELIVERY | evidence-gate | INTERNAL | ERROR | yes | ACTIVE |

## Details

### `ACCESSOR_FIELD`

- Description: An authoritative object exposes a getter or setter instead of a plain data field.
- Remediation: Replace accessor-backed fields with ordinary enumerable data properties before evaluation.
- Replacement: (none)

### `CYCLIC_INPUT`

- Description: Authoritative kernel input contains a cyclic object or array reference.
- Remediation: Serialize the input as an acyclic JSON-compatible value graph.
- Replacement: (none)

### `DUPLICATE_IDENTITY`

- Description: Two authoritative records declare the same stable identity in one validation scope.
- Remediation: Assign unique stable identities and update every affected reference consistently.
- Replacement: (none)

### `DUPLICATE_KEY`

- Description: A strict JSON authority document contains the same object key more than once.
- Remediation: Remove the duplicate key and supply one unambiguous value.
- Replacement: (none)

### `FILE_ALIAS`

- Description: Two selected authority paths resolve to the same underlying file or a selected file changes identity during validation.
- Remediation: Supply distinct regular files under the trusted root and retry from a stable filesystem state.
- Replacement: (none)

### `FORBIDDEN_AUTHORITY_FIELD`

- Description: Kernel input contains a field that could introduce an unauthorized authority source.
- Remediation: Remove the forbidden field and use only the accepted deterministic authority path.
- Replacement: (none)

### `HASH_MISMATCH`

- Description: An authority document does not match the SHA-256 bound by Trusted Configuration.
- Remediation: Restore the exact authorized bytes or issue a new trusted configuration with the correct digest.
- Replacement: (none)

### `INVALID_ARGUMENT`

- Description: The trusted-configuration loader received a missing or invalid invocation argument.
- Remediation: Provide non-empty trusted configuration and repository-root paths.
- Replacement: (none)

### `INVALID_ARRAY`

- Description: An authoritative array is malformed, sparse, extended, or does not use the ordinary Array prototype.
- Remediation: Use a dense ordinary array containing only accepted JSON-compatible values.
- Replacement: (none)

### `INVALID_EVIDENCE_CONTRACT_SELECTION_PROVENANCE`

- Description: Evidence Contract selection provenance is outside the accepted trusted configuration or deterministic Policy paths.
- Remediation: Supply selection provenance from an authorized Trusted Configuration or deterministic Policy selection.
- Replacement: (none)

### `INVALID_JSON_PRIMITIVE`

- Description: A field requiring a JSON primitive received an object, array, undefined value, or unsupported number.
- Remediation: Use null, a boolean, a string, or a finite JSON number as required.
- Replacement: (none)

### `INVALID_LITERAL`

- Description: An authoritative field does not equal the exact protocol literal required at that path.
- Remediation: Replace the value with the documented exact literal for the selected schema version.
- Replacement: (none)

### `INVALID_REASON_CODE`

- Description: A Policy-owned Rule denial code is not a stable uppercase machine token.
- Remediation: Use a non-empty code matching the accepted uppercase token format.
- Replacement: (none)

### `INVALID_REFERENCE`

- Description: An authoritative record references a missing or inconsistent related identity.
- Remediation: Repair the referenced identity and its bidirectional membership without fabricating Evidence.
- Replacement: (none)

### `INVALID_RULE_AUTHORITY_PROVENANCE`

- Description: A Rule declares authority outside Trusted Configuration or Policy provenance.
- Remediation: Bind the Rule to an authorized Trusted Configuration or versioned Policy.
- Replacement: (none)

### `INVALID_RULE_PREDICATE`

- Description: A Rule predicate is outside the deterministic predicate set supported by the current kernel.
- Remediation: Use an accepted predicate or select a separately authorized kernel version.
- Replacement: (none)

### `INVALID_STABLE_IDENTITY`

- Description: An identity is empty or contains characters outside the stable identity alphabet.
- Remediation: Provide a non-empty identity using only letters, digits, period, underscore, or hyphen.
- Replacement: (none)

### `INVALID_STRING`

- Description: A required authoritative string is missing or empty.
- Remediation: Provide a non-empty string with the meaning required at the reported path.
- Replacement: (none)

### `INVALID_UTF8`

- Description: A selected product input file is not valid UTF-8.
- Remediation: Re-encode the complete file as valid UTF-8 without changing its authorized meaning.
- Replacement: (none)

### `KERNEL_EVIDENCE_REQUIREMENT_MISSING`

- Description: An applicable Evidence Requirement has no acceptable Evidence from the supplied authorized inputs.
- Remediation: Provide an authorized matching Observation or Verification Receipt and run a new evaluation.
- Replacement: (none)

### `MALFORMED_JSON`

- Description: A strict authority document is not valid unambiguous JSON.
- Remediation: Correct the JSON syntax and remove duplicate or trailing content before reauthorization.
- Replacement: (none)

### `MISSING_FIELD`

- Description: An authoritative kernel record omits a required field.
- Remediation: Add the required field with a valid value from the authorized source.
- Replacement: (none)

### `NON_ENUMERABLE_FIELD`

- Description: An authoritative object or array contains a hidden non-enumerable field.
- Remediation: Rebuild the input from ordinary enumerable JSON data properties.
- Replacement: (none)

### `NON_JSON_VALUE`

- Description: Authoritative input contains a value that JSON cannot represent deterministically.
- Remediation: Replace the value with an accepted JSON-compatible value.
- Replacement: (none)

### `NON_PLAIN_OBJECT`

- Description: An authoritative record uses a class instance or non-plain object prototype.
- Remediation: Convert the record to an ordinary plain object before evaluation.
- Replacement: (none)

### `NOT_REGULAR`

- Description: A selected input path is not a regular file.
- Remediation: Select a regular non-symbolic file within the allowed root.
- Replacement: (none)

### `PATH_INVALID`

- Description: A selected authority path is absolute, escapes the trusted root, or violates the accepted repository-path form.
- Remediation: Use a safe relative repository path contained by the trusted root.
- Replacement: (none)

### `PROOFRAIL_RELEASE_DELIVERY_FAILED`

- Description: The bounded release delivery workflow failed at the separately reported stage.
- Remediation: Inspect the machine-readable stage, correct that boundary condition, and retry without changing authority.
- Replacement: (none)

### `PROXY_INPUT`

- Description: Kernel input contains a Proxy-backed value whose behavior cannot be inspected deterministically.
- Remediation: Materialize the value as an ordinary plain object or array before evaluation.
- Replacement: (none)

### `READ_FAILED`

- Description: A required local file could not be opened, inspected, or read completely.
- Remediation: Restore stable read access to the selected regular file and retry.
- Replacement: (none)

### `REFERENCE_MISMATCH`

- Description: Trusted Configuration, Policy, Evidence Contract, observer, or target references do not agree.
- Remediation: Supply a mutually consistent authorized document set with exact identities and versions.
- Replacement: (none)

### `RESERVED_KERNEL_REASON_CODE`

- Description: A Policy-owned Rule attempts to emit a reason code reserved for kernel-owned classification.
- Remediation: Choose a distinct Policy-owned stable reason code.
- Replacement: (none)

### `RESERVED_REASON_CODE_NAMESPACE`

- Description: A product Rule attempts to use the Foundation HARN_ governance namespace.
- Remediation: Use a Policy-owned product code that does not begin with HARN_.
- Replacement: (none)

### `ROOT_ALIAS`

- Description: The supplied repository root resolves through an alias rather than its canonical path.
- Remediation: Invoke the loader with the canonical repository-root path.
- Replacement: (none)

### `ROOT_INVALID`

- Description: The supplied repository root is missing, unreadable, symbolic, or not a directory.
- Remediation: Provide an accessible canonical directory as the trusted repository root.
- Replacement: (none)

### `SAME_FILE`

- Description: An output path aliases an input or another protected file.
- Remediation: Choose a distinct output file that does not share filesystem identity with protected inputs.
- Replacement: (none)

### `SCHEMA_INVALID`

- Description: Trusted Configuration, Policy, or Evidence Contract content violates its accepted closed shape.
- Remediation: Correct the authority document to the supported schema and reestablish its exact digest binding.
- Replacement: (none)

### `SNAPSHOT_INVALID`

- Description: The supplied GitHub pull-request snapshot is malformed, ambiguous, incomplete, or internally duplicated.
- Remediation: Collect a fresh bounded snapshot that satisfies the exact closed snapshot contract.
- Replacement: (none)

### `SYMBOL_KEY`

- Description: Authoritative input contains a symbol-keyed property that JSON cannot represent.
- Remediation: Remove symbol keys and use only ordinary string-keyed JSON fields.
- Replacement: (none)

### `TARGET_MISMATCH`

- Description: The observed repository, pull request, base, or head identity differs from Trusted Configuration.
- Remediation: Collect the exact configured target or issue new Trusted Configuration for the intended target.
- Replacement: (none)

### `TARGET_SCOPE_MISMATCH`

- Description: Claims, Evidence Contracts, Evidence Requirements, or Observations do not share the declared evaluation scope.
- Remediation: Align all authoritative records to the exact selected target scope.
- Replacement: (none)

### `TOO_LARGE`

- Description: A bounded product input exceeds the maximum accepted byte length.
- Remediation: Reduce the input within the documented limit without truncating authority-bearing content.
- Replacement: (none)

### `UNEXPECTED_FIELD`

- Description: An authoritative record contains a field outside its closed protocol shape.
- Remediation: Remove the unknown field or use a separately authorized schema version that defines it.
- Replacement: (none)

### `UNVALIDATED_CONFIGURATION`

- Description: A caller attempted to use a configuration object that did not pass the trusted loader boundary.
- Remediation: Load and validate the exact authority documents through the trusted configuration loader.
- Replacement: (none)

### `WRITE_FAILED`

- Description: A staged local output could not be created, finalized, or cleaned up safely.
- Remediation: Restore stable write and rename access to the output directory, inspect any reported orphan, and retry.
- Replacement: (none)
