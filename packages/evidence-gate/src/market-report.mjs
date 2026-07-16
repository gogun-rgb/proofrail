import { boundedUtf8, DEFAULT_MAX_PREVIEW_BYTES, redactText, isPlainRecord } from "./market-common.mjs";

const NONE = "(none)";
const MAX_SUMMARY_BYTES = 8192;
const ACTIONS = Object.freeze({
  PRF_STALE_TARGET: "Re-collect the pull request and verify the exact head before rerunning.",
  VERIFICATION_COMMAND_FAILED: "Fix the failing configured command, then request a new evaluation.",
  EXECUTION_IMPOSSIBLE: "Resolve the execution boundary or prerequisite failure, then rerun.",
  REQUIRED_EVIDENCE_MISSING: "Collect the missing authorized Evidence and request a new evaluation.",
  REPORTED_CHECK_FAILED: "Resolve the reported check failure on the exact head, then rerun.",
  SCOPE_PATH_DENIED: "Change only paths permitted by the base configuration, then rerun.",
  ARTIFACT_PUBLICATION_FAILED: "Repair the caller-controlled artifact destination and rerun locally.",
});

/** @param {unknown} bundle */
export function renderActionableSummary(bundle) {
  if (!isPlainRecord(bundle)) return boundedSummary("# Proofrail BLOCKED\n\nInvalid Evidence Bundle.\n");
  const verdict = field(bundle.verdict);
  const target = isPlainRecord(bundle.target) ? bundle.target : {};
  const reasons = asStrings(bundle.reasonCodes);
  const receipts = Array.isArray(bundle.verificationReceipts) ? bundle.verificationReceipts : [];
  const lines = [
    `# Proofrail ${verdict}`,
    "",
    `Verified repository: \`${field(target.repository)}\``,
    `Pull request: \`${field(target.pullRequestNumber)}\``,
    `Base SHA: \`${field(target.baseSha)}\``,
    `Verified head: \`${field(target.headSha)}\``,
    "",
    "## Verdict and reasons",
    "",
    `Verdict: **${verdict}**`,
    `Reason codes: ${renderList(reasons)}`,
    "",
    "## Next actions",
    "",
    ...renderActions(reasons),
    "",
    "## Verification Receipts",
    "",
    ...renderReceipts(receipts),
    "",
    "## Scope and review signals",
    "",
    `Changed paths: ${renderNestedList(bundle.scope, "changedPaths")}`,
    `Outside declared scope: ${renderNestedList(bundle.scope, "outsideDeclaredScope")}`,
    `Review needs: ${renderValueList(bundle.reviewNeeds)}`,
    `Reported checks: ${renderValueList(bundle.reportedChecks)}`,
    "",
    "This result applies only to the exact target, authority lineage, observations, and receipts in the attached Evidence Bundle.",
    "It is not a guarantee of correctness, security, deployment safety, trusted release status, or external acceptance.",
    "",
  ];
  return boundedSummary(lines.join("\n"));
}
function renderActions(reasons) {
  if (reasons.length === 0) return ["- No remediation is required for this evaluation."];
  return reasons.map((reason) => `- \`${field(reason)}\`: ${field(ACTIONS[reason] ?? "Review the retained Evidence Lineage and rerun after remediation.")}`);
}

function renderReceipts(receipts) {
  if (receipts.length === 0) return ["- No verification commands started."];
  return receipts.map((receipt) => {
    const command = isPlainRecord(receipt?.command) ? receipt.command : {};
    const result = isPlainRecord(receipt?.result) ? receipt.result : {};
    return `- \`${field(command.name)}\`: **${field(result.status)}**${result.timedOut === true ? " (timed out)" : ""}`;
  });
}

function renderNestedList(value, key) {
  return isPlainRecord(value) ? renderValueList(value[key]) : NONE;
}

function renderValueList(value) {
  const items = Array.isArray(value) ? value : [];
  return items.length === 0 ? NONE : items.map((item) => field(item)).join(", ");
}

function renderList(values) {
  return values.length === 0 ? NONE : values.map((item) => `\`${field(item)}\``).join(", ");
}

function asStrings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").map((item) => String(item)) : [];
}

function field(value) {
  if (value === null || value === undefined || value === "") return NONE;
  const redacted = redactText(String(value), DEFAULT_MAX_PREVIEW_BYTES).text;
  return redacted.replace(/[\r\n`]/g, " ").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");
}

function boundedSummary(value) {
  const suffix = "\n";
  const body = boundedUtf8(value, MAX_SUMMARY_BYTES - Buffer.byteLength(suffix, "utf8"));
  return body.endsWith(suffix) ? body : `${body}${suffix}`;
}
