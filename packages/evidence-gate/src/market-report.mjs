import { boundedUtf8, DEFAULT_MAX_PREVIEW_BYTES, redactText, isPlainRecord } from "./market-common.mjs";

const NONE = "(none)";
const MAX_SUMMARY_BYTES = 8192;
const ACTIONS = Object.freeze({
  PRF_STALE_TARGET: "Re-collect the pull request and verify the exact head before rerunning.",
  PRF_EXECUTION_IMPOSSIBLE: "Resolve the execution boundary or prerequisite failure, then rerun.",
  PRF_SCOPE_PATH_NOT_ALLOWED: "Change only paths permitted by the base configuration, then rerun.",
  PRF_UNTRUSTED_POLICY_CHANGE: "Use the unchanged base-branch configuration and request a new evaluation.",
  PRF_VERIFICATION_COMMAND_FAILED: "Fix the failing configured command, then request a new evaluation.",
  PRF_EXACT_HEAD_APPROVAL_MISSING: "Obtain an approval bound to the exact pull-request head, then rerun.",
  PRF_MINIMUM_APPROVALS_MISSING: "Obtain the required number of exact-head approvals, then rerun.",
  PRF_CHANGES_REQUESTED_PRESENT: "Resolve the requested changes and obtain a new exact-head approval.",
  PRF_REPORTED_CHECK_FAILED: "Resolve the reported check failure on the exact head, then rerun.",
  PRF_REQUIRED_EVIDENCE_MISSING: "Collect the missing authorized Evidence and request a new evaluation.",
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
  const unsatisfiedRequirements = findUnsatisfiedRequirements(bundle);
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
    `Unsatisfied evidence requirements: ${renderList(unsatisfiedRequirements)}`,
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
    `Allowed patterns: ${renderNestedList(bundle.scope, "allowedPatterns")}`,
    `Denied patterns: ${renderNestedList(bundle.scope, "deniedPatterns")}`,
    `Changed paths: ${renderNestedList(bundle.scope, "changedPaths")}`,
    `Outside declared scope: ${renderNestedList(bundle.scope, "outsideDeclaredScope")}`,
    `Review needs: ${renderValueList(bundle.reviewNeeds)}`,
    "",
    "## Review history",
    "",
    ...renderReviews(bundle.reviews),
    "",
    "## Reported checks",
    "",
    ...renderReportedChecks(bundle.reportedChecks),
    "",
    "## Evidence Bundle",
    "",
    "Artifact: `evidence-bundle.json`",
    "",
    "This result applies only to the exact target, authority lineage, observations, and receipts in the attached Evidence Bundle.",
    "It is not a guarantee of correctness, security, deployment safety, trusted release status, or external acceptance.",
    "",
  ];
  return boundedSummary(lines.join("\n"));
}

function findUnsatisfiedRequirements(bundle) {
  const requirements = Array.isArray(bundle.evidenceRequirements) ? bundle.evidenceRequirements : [];
  const satisfied = new Set(
    (Array.isArray(bundle.evidence) ? bundle.evidence : [])
      .filter((evidence) => isPlainRecord(evidence) && typeof evidence.requirementId === "string")
      .map((evidence) => evidence.requirementId),
  );
  return requirements
    .filter((requirement) => isPlainRecord(requirement) && typeof requirement.id === "string" && !satisfied.has(requirement.id))
    .map((requirement) => requirement.id)
    .sort();
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

function renderReviews(value) {
  const reviews = Array.isArray(value) ? value : [];
  if (reviews.length === 0) return ["- No reviews were collected."];
  return reviews.map((review) => {
    const current = isPlainRecord(review) ? review : {};
    const identity = field(current.authorLogin);
    const state = field(current.state);
    const head = field(current.commitOid);
    const eligible = current.authorCanPushToRepository === true ? "eligible" : "ineligible";
    return `- \`${identity}\`: **${state}**; commit \`${head}\`; ${eligible} reviewer.`;
  });
}

function renderReportedChecks(value) {
  const checks = Array.isArray(value) ? value : [];
  if (checks.length === 0) return ["- No reported checks were collected."];
  return checks.map((check) => {
    const current = isPlainRecord(check) ? check : {};
    return `- \`${field(current.name)}\` (${field(current.kind)}): **${field(current.status)}** / ${field(current.conclusion)}`;
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
