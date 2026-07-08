import { stableStringify } from "./json-utils.mjs";

export const BOOTSTRAP_UNKNOWN_REASON_CODE = "HARN_EMITTED_REASON_CODE_UNKNOWN";

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function createFinding(code, path, message, remediation) {
  return {
    code,
    path,
    message,
    remediation,
  };
}

export class FindingCollector {
  constructor() {
    this.findings = [];
  }

  add(code, path, message, remediation) {
    this.findings.push(createFinding(code, path, message, remediation));
  }

  addFinding(finding) {
    this.findings.push(createFinding(finding.code, finding.path, finding.message, finding.remediation));
  }

  addMany(findings) {
    for (const finding of findings) this.addFinding(finding);
  }

  list() {
    return sortFindings(this.findings);
  }
}

export function sortFindings(findings) {
  return [...findings].sort((left, right) => {
    return (
      compareStrings(left.code, right.code) ||
      compareStrings(left.path, right.path) ||
      compareStrings(left.message, right.message) ||
      compareStrings(left.remediation, right.remediation)
    );
  });
}

export function resultFromFindings(findings) {
  const sorted = sortFindings(findings);
  return {
    schemaVersion: "1",
    status: sorted.length === 0 ? "VALID" : "INVALID",
    findings: sorted,
  };
}

export function renderHuman(result) {
  if (result.status === "VALID") {
    return "Mechanical Foundation governance checks passed; this is not independent Foundation Gate acceptance.\n";
  }

  const lines = ["Proofrail foundation validation failed:"];
  for (const finding of result.findings) {
    lines.push(`- ${finding.code} ${finding.path}: ${finding.message} Remediation: ${finding.remediation}`);
  }
  return `${lines.join("\n")}\n`;
}

export function renderJson(result) {
  return stableStringify(result);
}

export function normalizeRegisteredFindings(findings, registryState) {
  if (!registryState?.usable) {
    return sortFindings([
      createFinding(
        BOOTSTRAP_UNKNOWN_REASON_CODE,
        registryState?.registryPath ?? "governance/harness-reason-codes.json",
        "Harness reason-code registry is unavailable or unusable, so final finding normalization cannot safely trust emitted codes.",
        "Restore a usable Foundation harness reason-code registry containing exactly one HARN_EMITTED_REASON_CODE_UNKNOWN entry.",
      ),
    ]);
  }

  const registeredCodes = registryState.registeredCodes;
  const unknownCodes = [...new Set(findings.map((finding) => finding.code).filter((code) => !registeredCodes.has(code)))].sort();
  const registeredFindings = findings.filter((finding) => registeredCodes.has(finding.code));
  const unknownDiagnostics = unknownCodes.map((code) =>
    createFinding(
      BOOTSTRAP_UNKNOWN_REASON_CODE,
      registryState.registryPath,
      `Validator emitted unregistered finding code ${code}.`,
      "Register the HARN_ code or correct the validator to emit an existing registered code.",
    ),
  );

  return sortFindings([...registeredFindings, ...unknownDiagnostics]);
}
