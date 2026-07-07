export function validateReasonCodeRegistry(registry, registryPath, collector) {
  const registered = new Set();
  const seen = new Set();

  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      registryPath,
      "Harness reason-code registry must be a JSON object.",
      "Restore the registry object with schemaVersion, prefix, separation, and codes.",
    );
    return registered;
  }

  if (registry.prefix !== "HARN_") {
    collector.add(
      "HARN_REASON_CODE_PREFIX_INVALID",
      registryPath,
      "Harness reason-code registry prefix must be HARN_.",
      "Keep Foundation engineering harness reason codes in the HARN_ namespace.",
    );
  }

  if (!Array.isArray(registry.codes)) {
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      registryPath,
      "Harness reason-code registry codes must be an array.",
      "Provide an array of code entries.",
    );
    return registered;
  }

  registry.codes.forEach((entry, index) => {
    const entryPath = `${registryPath}#codes[${index}]`;
    const code = entry?.code;

    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      typeof code !== "string" ||
      typeof entry.summary !== "string" ||
      typeof entry.remediation !== "string" ||
      code.length === 0 ||
      entry.summary.length === 0 ||
      entry.remediation.length === 0
    ) {
      collector.add(
        "HARN_REASON_CODE_MALFORMED",
        entryPath,
        "Harness reason-code registry entry must include code, summary, and remediation strings.",
        "Provide complete string fields for each harness reason-code registry entry.",
      );
      return;
    }

    if (!code.startsWith("HARN_")) {
      collector.add(
        "HARN_REASON_CODE_PREFIX_INVALID",
        entryPath,
        `Harness reason code ${code} does not use the HARN_ prefix.`,
        "Use the HARN_ prefix for Foundation engineering harness findings.",
      );
      return;
    }

    if (seen.has(code)) {
      collector.add(
        "HARN_REASON_CODE_DUPLICATE",
        entryPath,
        `Harness reason code ${code} is duplicated.`,
        "Keep each HARN_ reason code unique in the registry.",
      );
    }

    seen.add(code);
    registered.add(code);
  });

  return registered;
}
