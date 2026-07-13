export function renderReasonCodeReference(registry) {
  const lines = [
    "# Product Reason Codes",
    "",
    "This file is deterministic output from `config/reason-codes/product-reason-codes.json`.",
    "Edit the registry and regenerate this reference together; `pnpm product:reason-codes` rejects byte drift.",
    "",
    "## Scope and authority",
    "",
    "The registry covers Proofrail-owned machine-readable codes emitted by the six current production packages. It includes the kernel-owned missing-Evidence Verdict reason, kernel boundary issue categories, component Error code values, and the public release-delivery code.",
    "",
    "Policy-authored Rule denial codes remain Policy-owned and are not members of this global registry. Their authority and validation continue to come from the selected Policy and kernel boundary. Foundation `HARN_` diagnostics remain in the separate governance registry. Natural-language-only legacy CLI errors and release delivery `stage` values are not machine-readable product code identities.",
    "",
    "## Registry policy",
    "",
    `- Schema version: \`${registry.schemaVersion}\``,
    `- Namespace: \`${registry.namespace}\``,
    `- Alias policy: \`${registry.aliasPolicy}\``,
    `- Policy Rule-code boundary: \`${registry.policyRuleCodeBoundary}\``,
    "- Code identities are stable. Active codes have no replacement.",
    "- A deprecated code remains reserved and must name an existing replacement. Replacement chains must terminate at an active code and must not cycle.",
    "",
    "## Codes",
    "",
    "| Code | Kind | Category | Surfaces | Visibility | Severity | Retryable | Status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...registry.codes.map((entry) =>
      `| \`${entry.id}\` | ${entry.kind} | ${entry.category} | ${entry.surfaces.join(", ")} | ${entry.visibility} | ${entry.severity} | ${entry.retryable ? "yes" : "no"} | ${entry.status} |`
    ),
    "",
    "## Details",
    "",
  ];

  for (const entry of registry.codes) {
    lines.push(
      `### \`${entry.id}\``,
      "",
      `- Description: ${entry.description}`,
      `- Remediation: ${entry.remediation}`,
      `- Replacement: ${entry.replacement ?? "(none)"}`,
      "",
    );
  }

  return `${lines.join("\n")}\n`;
}
