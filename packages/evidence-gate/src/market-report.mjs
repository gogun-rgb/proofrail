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
const DELIVERY_ACTIONS = Object.freeze({
  BLOCKED_EXECUTION_BOUNDARY: "Provide the authority-approved GITHUB_HOSTED_LINUX_SANDBOX_V1 isolation attestation, then rerun. Proofrail will not fabricate one.",
  CHECKOUT_HEAD_MISMATCH: "Rerun against a checkout whose HEAD exactly matches the pull-request event.",
  BASE_HEAD_MISMATCH: "Rerun against the exact base checkout named by the pull-request event.",
  PRF_STALE_TARGET: "Start a new run for the changed pull-request head.",
  PRF_STALE_BASE: "Start a new run against the unchanged base checkout.",
  CONFIG_PATH_UNAUTHORIZED: "Keep .proofrail/config.yml on the base branch and use the documented caller input.",
  OUTPUT_WRITE_FAILED: "Choose a writable caller-controlled artifact destination and rerun.",
  CURRENT_HEAD_INVALID: "Re-collect the pull-request event and rerun with a valid GitHub head observation.",
  CURRENT_HEAD_UNAVAILABLE: "Restore read-only GitHub metadata collection and rerun.",
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

/** @param {{ code?: unknown, stage?: unknown, reason?: unknown }} failure */
export function renderDeliveryFailureSummary(failure) {
  const stage = field(failure?.stage);
  const reason = field(failure?.reason);
  const action = field(DELIVERY_ACTIONS[failure?.reason] ?? "Review the retained failure packet and rerun after resolving the reported boundary.");
  const tick = String.fromCharCode(96);
  return boundedSummary([
    "# Proofrail delivery blocked",
    "",
    "## Failure",
    "",
    "Code: **" + field(failure?.code) + "**",
    "Stage: **" + stage + "**",
    "Reason: " + tick + reason + tick,
    "",
    "## Next actions",
    "",
    "- " + action,
    "",
    "No Evidence Bundle was produced for this attempt. This failure packet is delivery evidence only; it is not a product Verdict, trusted release decision, deployment authorization, or external acceptance.",
    "",
  ].join("\n"));
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
