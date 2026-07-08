import { BOOTSTRAP_UNKNOWN_REASON_CODE } from "./findings.mjs";
import { validateJsonAgainstSchema } from "./schema-validation.mjs";

const SUPPORTED_REGISTRY_SCHEMA_VERSION = "1";

function registryState(registryPath, registeredCodes, usable) {
  return {
    registeredCodes,
    registryPath,
    usable,
  };
}

export function validateReasonCodeRegistry({ registry, registryPath, registrySchema, collector }) {
  const registered = new Set();
  const seen = new Set();
  let usable = true;

  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      registryPath,
      "Harness reason-code registry must be a JSON object.",
      "Restore the registry object with schemaVersion, prefix, separation, and codes.",
    );
    return registryState(registryPath, registered, false);
  }

  if (!registrySchema) {
    usable = false;
  } else if (
    !validateJsonAgainstSchema({
      schema: registrySchema,
      data: registry,
      dataPath: registryPath,
      collector,
      code: "HARN_REASON_CODE_MALFORMED",
    })
  ) {
    usable = false;
  }

  if (registry.schemaVersion !== SUPPORTED_REGISTRY_SCHEMA_VERSION) {
    usable = false;
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      `${registryPath}#schemaVersion`,
      `Harness reason-code registry schemaVersion must be ${SUPPORTED_REGISTRY_SCHEMA_VERSION}.`,
      "Restore the supported Foundation harness reason-code registry schemaVersion.",
    );
  }

  if (typeof registry.namespace !== "string" || registry.namespace.length === 0) {
    usable = false;
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      `${registryPath}#namespace`,
      "Harness reason-code registry namespace must be a non-empty string.",
      "Restore the registry namespace metadata.",
    );
  }

  if (typeof registry.separation !== "string" || registry.separation.length === 0) {
    usable = false;
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      `${registryPath}#separation`,
      "Harness reason-code registry separation metadata must be a non-empty string.",
      "Restore the registry separation metadata.",
    );
  }

  if (registry.prefix !== "HARN_") {
    usable = false;
    collector.add(
      "HARN_REASON_CODE_PREFIX_INVALID",
      registryPath,
      "Harness reason-code registry prefix must be HARN_.",
      "Keep Foundation engineering harness reason codes in the HARN_ namespace.",
    );
  }

  if (!Array.isArray(registry.codes)) {
    usable = false;
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      registryPath,
      "Harness reason-code registry codes must be an array.",
      "Provide an array of code entries.",
    );
    return registryState(registryPath, registered, false);
  }

  if (registry.codes.length === 0) {
    usable = false;
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      registryPath,
      "Harness reason-code registry codes must not be empty.",
      "Provide committed HARN_ code entries including HARN_EMITTED_REASON_CODE_UNKNOWN.",
    );
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
      usable = false;
      collector.add(
        "HARN_REASON_CODE_MALFORMED",
        entryPath,
        "Harness reason-code registry entry must include code, summary, and remediation strings.",
        "Provide complete string fields for each harness reason-code registry entry.",
      );
      return;
    }

    if (!code.startsWith("HARN_")) {
      usable = false;
      collector.add(
        "HARN_REASON_CODE_PREFIX_INVALID",
        entryPath,
        `Harness reason code ${code} does not use the HARN_ prefix.`,
        "Use the HARN_ prefix for Foundation engineering harness findings.",
      );
      return;
    }

    if (seen.has(code)) {
      usable = false;
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

  const bootstrapCount = registry.codes.filter((entry) => entry?.code === BOOTSTRAP_UNKNOWN_REASON_CODE).length;
  if (bootstrapCount !== 1) {
    usable = false;
    collector.add(
      "HARN_REASON_CODE_MALFORMED",
      registryPath,
      "Harness reason-code registry must contain exactly one HARN_EMITTED_REASON_CODE_UNKNOWN entry.",
      "Restore exactly one reserved bootstrap normalization diagnostic entry.",
    );
  }

  return registryState(registryPath, registered, usable);
}
