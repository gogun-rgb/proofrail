import {
  canonicalJson,
  canonicalizeJson,
  clockIso,
  DEFAULT_MAX_BUNDLE_BYTES,
  DEFAULT_MAX_PREVIEW_BYTES,
  deepFreeze,
  isPlainRecord,
  normalizeDigest,
  redactJson,
  redactText,
  sha256Bytes,
  sha256Text,
  streamBytes,
  boundedUtf8,
  compareStrings,
} from "./market-common.mjs";

const VERDICTS = Object.freeze(["ADMISSIBLE", "REVISION_REQUIRED", "REJECTED", "BLOCKED"]);
const MARKET_POLICY_CONDITIONS = new Set(["STALE_TARGET", "EXECUTION_IMPOSSIBLE", "SCOPE_PATH_DENIED", "UNTRUSTED_POLICY_CHANGE", "VERIFICATION_COMMAND_FAILED", "EXACT_HEAD_APPROVAL_MISSING", "MINIMUM_APPROVALS_MISSING", "CHANGES_REQUESTED_PRESENT", "REPORTED_CHECK_FAILED", "REQUIRED_EVIDENCE_MISSING"]);
const RECEIPT_RAW_KEYS = /^(?:stdout|stderr|rawstdout|rawstderr|stdoutraw|stderrraw)$/i;
const TIMING_KEYS = new Set(["startedAt", "endedAt", "durationMs"]);
const TOP_LEVEL_FIELDS = Object.freeze([
  "schemaVersion", "kernelEngineVersion", "evaluationId", "target", "authority", "claims",
  "evidenceContract", "evidenceRequirements", "observations", "verificationReceipts", "evidence",
  "evidenceLineage", "rules", "policyConditions", "facts", "scope", "reviews", "reportedChecks",
  "reviewNeeds", "verdict", "reasonCodes", "verdictReduction", "summary",
]);
const KERNEL_FIELDS = Object.freeze([
  "schemaVersion", "kernelEngineVersion", "evaluationId", "target", "authority", "claims",
  "evidenceContract", "evidenceRequirements", "observations", "verificationReceipts", "evidence",
  "evidenceLineage", "rules", "policyConditions", "verdict", "reasonCodes", "verdictReduction",
]);
const KERNEL_RUNTIME_FIELDS = Object.freeze(["componentDigests", "artifactDigest"]);
const PROJECTION_FIELDS = Object.freeze(["facts", "scope", "reviews", "reportedChecks", "reviewNeeds", "summary"]);
const MAX_SUMMARY_BYTES = 8192;

export class EvidenceBundleError extends Error {
  /** @param {string} code @param {string} [message] */
  constructor(code, message = code) {
    super(message);
    this.name = "EvidenceBundleError";
    this.code = code;
  }
}
/** @param {unknown} input @param {{ clock?: { now: () => Date } }} [options] */
export function createCanonicalEvidenceBundle(input, options = {}) {
  try {
    const source = normalizeSource(input);
    const finalizedAt = clockIso((options.clock ?? { now: () => new Date() }).now(), "clock.now");
    const receipts = source.verificationReceipts.map(normalizeReceipt).sort(compareReceipts);
    const base = {
      ...source,
      verificationReceipts: receipts,
      componentDigests: componentDigests({ ...source, verificationReceipts: receipts }),
      finalizedAt,
    };
    const artifactDigest = sha256Text(canonicalJson(base));
    return deepFreeze({ ...base, artifactDigest });
  } catch (error) {
    if (error instanceof EvidenceBundleError) throw error;
    throw new EvidenceBundleError("INPUT_INVALID");
  }
}

/** @param {unknown} input @param {{ maxBytes?: number, clock?: { now: () => Date }, projection?: unknown }} [options] */
export function buildEvidenceArtifact(input, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BUNDLE_BYTES;
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) throw new EvidenceBundleError("ARTIFACT_LIMIT_INVALID");
  const finalizedInput = options.projection === undefined
    ? input
    : finalizeKernelBundle(input, options.projection);
  const bundle = createCanonicalEvidenceBundle(finalizedInput, options);
  const text = canonicalEvidenceBundleText(bundle);
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > maxBytes) throw new EvidenceBundleError("ARTIFACT_TOO_LARGE");
  return deepFreeze({ bundle, text, bytes, artifactDigest: bundle.artifactDigest });
}

/**
 * Finalization is deliberately a one-way projection: delivery fields may enrich a kernel
 * bundle but cannot supply or replace kernel Verdict authority.
 * @param {unknown} kernelBundle
 * @param {unknown} projection
 */
function finalizeKernelBundle(kernelBundle, projection) {
  if (!isPlainRecord(kernelBundle)
    || Object.keys(kernelBundle).some((key) => !KERNEL_FIELDS.includes(key) && !KERNEL_RUNTIME_FIELDS.includes(key))
    || !Object.hasOwn(kernelBundle, "componentDigests")
    || !Object.hasOwn(kernelBundle, "artifactDigest")) {
    throw new EvidenceBundleError("INPUT_INVALID");
  }
  const { componentDigests: _kernelComponentDigests, artifactDigest: _kernelArtifactDigest, ...kernel } = kernelBundle;
  return { ...kernel, ...normalizeProjection(projection, true) };
}

/** @param {unknown} bundle */
export function canonicalEvidenceBundleText(bundle) {
  try {
    return `${canonicalJson(bundle)}\n`;
  } catch {
    throw new EvidenceBundleError("BUNDLE_INVALID");
  }
}

/** @param {unknown} bundle */
export function projectInvariantBundle(bundle) {
  try {
    const value = canonicalizeJson(bundle);
    if (!isPlainRecord(value)) throw new TypeError("bundle");
    const projection = removeRuntimeFields(value);
    return deepFreeze(projection);
  } catch {
    throw new EvidenceBundleError("BUNDLE_INVALID");
  }
}

function normalizeSource(input) {
  if (!isPlainRecord(input)) throw new EvidenceBundleError("INPUT_INVALID");
  const source = {};
  for (const field of TOP_LEVEL_FIELDS) {
    if (!Object.hasOwn(input, field)) continue;
    if (field === "verificationReceipts") source[field] = normalizeArray(input[field], field, (value) => value);
    else if (field === "claims" || field === "evidenceRequirements" || field === "observations" || field === "evidence" || field === "evidenceLineage" || field === "rules") source[field] = normalizeRecords(input[field], field);
    else if (field === "reasonCodes" || field === "policyConditions") source[field] = normalizeStrings(input[field], field);
    else source[field] = redactJson(input[field]).value;
  }
  requireString(source.schemaVersion, "schemaVersion");
  requireString(source.kernelEngineVersion, "kernelEngineVersion");
  requireString(source.evaluationId, "evaluationId");
  if (!isPlainRecord(source.target) || !isPlainRecord(source.authority)) throw new EvidenceBundleError("INPUT_INVALID");
  if (!VERDICTS.includes(source.verdict)) throw new EvidenceBundleError("INPUT_INVALID");
  source.claims = sortById(source.claims ?? []);
  source.evidenceRequirements = sortById(source.evidenceRequirements ?? []);
  source.observations = sortByOrdering(source.observations ?? []);
  source.evidence = sortById(source.evidence ?? []);
  source.evidenceLineage = sortById(source.evidenceLineage ?? []);
  source.rules = sortById(source.rules ?? []);
  source.reasonCodes = [...(source.reasonCodes ?? [])].sort(compareStrings);
  source.policyConditions = [...(source.policyConditions ?? [])].sort(compareStrings);
  source.verificationReceipts = source.verificationReceipts ?? [];
  if (Object.hasOwn(source, "facts")) source.facts = normalizeFacts(source.facts);
  if (Object.hasOwn(source, "scope")) source.scope = normalizeScope(source.scope);
  if (Object.hasOwn(source, "reviews")) source.reviews = normalizeReviews(source.reviews);
  if (Object.hasOwn(source, "reportedChecks")) source.reportedChecks = normalizeReportedChecks(source.reportedChecks);
  if (Object.hasOwn(source, "reviewNeeds")) source.reviewNeeds = normalizeStrings(source.reviewNeeds, "reviewNeeds").sort(compareStrings);
  if (Object.hasOwn(source, "summary")) source.summary = normalizeSummary(source.summary);
  return source;
}

function normalizeProjection(value, requireAllFields) {
  if (!isPlainRecord(value)) throw new EvidenceBundleError("INPUT_INVALID");
  const keys = Object.keys(value).sort(compareStrings);
  const expected = [...PROJECTION_FIELDS].sort(compareStrings);
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new EvidenceBundleError("INPUT_INVALID");
  }
  const projection = {
    facts: normalizeFacts(value.facts),
    scope: normalizeScope(value.scope),
    reviews: normalizeReviews(value.reviews),
    reportedChecks: normalizeReportedChecks(value.reportedChecks),
    reviewNeeds: normalizeStrings(value.reviewNeeds, "reviewNeeds").sort(compareStrings),
    summary: normalizeSummary(value.summary),
  };
  if (requireAllFields && Object.keys(projection).length !== PROJECTION_FIELDS.length) throw new EvidenceBundleError("INPUT_INVALID");
  return projection;
}

function normalizeFacts(value) {
  if (!isPlainRecord(value)) throw new EvidenceBundleError("INPUT_INVALID");
  const output = Object.create(null);
  for (const key of Object.keys(value).sort(compareStrings)) {
    if (!nonEmptyString(key) || !jsonPrimitive(value[key])) throw new EvidenceBundleError("INPUT_INVALID");
    Object.defineProperty(output, key, { value: redactJson(value[key]).value, enumerable: true, configurable: true, writable: true });
  }
  return output;
}

function normalizeScope(value) {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["allowedPatterns", "deniedPatterns", "changedPaths", "outsideDeclaredScope"])) {
    throw new EvidenceBundleError("INPUT_INVALID");
  }
  return {
    allowedPatterns: normalizeStrings(value.allowedPatterns, "scope.allowedPatterns").sort(compareStrings),
    deniedPatterns: normalizeStrings(value.deniedPatterns, "scope.deniedPatterns").sort(compareStrings),
    changedPaths: normalizeStrings(value.changedPaths, "scope.changedPaths").sort(compareStrings),
    outsideDeclaredScope: normalizeStrings(value.outsideDeclaredScope, "scope.outsideDeclaredScope").sort(compareStrings),
  };
}

function normalizeReviews(value) {
  return normalizeArray(value, "reviews", (review) => {
    if (!isPlainRecord(review) || !hasExactKeys(review, ["authorLogin", "state", "submittedAt", "commitOid", "authorCanPushToRepository"])
      || (review.authorLogin !== null && !nonEmptyString(review.authorLogin))
      || !nonEmptyString(review.state)
      || (review.submittedAt !== null && !nonEmptyString(review.submittedAt))
      || (review.commitOid !== null && !nonEmptyString(review.commitOid))
      || typeof review.authorCanPushToRepository !== "boolean") {
      throw new EvidenceBundleError("INPUT_INVALID");
    }
    return redactJson(review).value;
  }).sort((left, right) => compareStrings(left.authorLogin ?? "", right.authorLogin ?? "")
    || compareStrings(left.submittedAt ?? "", right.submittedAt ?? "")
    || compareStrings(left.state, right.state)
    || compareStrings(left.commitOid ?? "", right.commitOid ?? ""));
}

function normalizeReportedChecks(value) {
  return normalizeArray(value, "reportedChecks", (check) => {
    if (!isPlainRecord(check) || !hasExactKeys(check, ["kind", "name", "status", "conclusion"])
      || !nonEmptyString(check.kind) || !nonEmptyString(check.name) || !nonEmptyString(check.status)
      || (check.conclusion !== null && !nonEmptyString(check.conclusion))) {
      throw new EvidenceBundleError("INPUT_INVALID");
    }
    return redactJson(check).value;
  }).sort((left, right) => compareStrings(left.kind, right.kind) || compareStrings(left.name, right.name));
}

function normalizeSummary(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\r") || !value.endsWith("\n") || Buffer.byteLength(value, "utf8") > MAX_SUMMARY_BYTES) {
    throw new EvidenceBundleError("INPUT_INVALID");
  }
  const redacted = redactText(value, MAX_SUMMARY_BYTES);
  if (redacted.matchCount > 0 || redacted.text !== value) throw new EvidenceBundleError("INPUT_INVALID");
  return value;
}

function normalizeReceipt(value) {
  if (!isPlainRecord(value) || !isPlainRecord(value.result)) throw new EvidenceBundleError("INPUT_INVALID");
  const result = value.result;
  const stdout = rawStream(result, "stdout");
  const stderr = rawStream(result, "stderr");
  const output = Object.create(null);
  let matchCount = 0;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "result") continue;
    if (RECEIPT_RAW_KEYS.test(key)) continue;
    const redacted = redactJson(entry);
    Object.defineProperty(output, key, { value: redacted.value, enumerable: true, configurable: true, writable: true });
    matchCount += redacted.matchCount;
  }
  const normalizedResult = Object.create(null);
  for (const [key, entry] of Object.entries(result)) {
    if (RECEIPT_RAW_KEYS.test(key)) continue;
    if (key === "stdoutDigest" || key === "stderrDigest" || key === "stdoutBytes" || key === "stderrBytes" || key === "stdoutPreview" || key === "stderrPreview" || key === "stdoutTruncated" || key === "stderrTruncated" || key === "timedOut") continue;
    const redacted = redactJson(entry);
    Object.defineProperty(normalizedResult, key, { value: redacted.value, enumerable: true, configurable: true, writable: true });
    matchCount += redacted.matchCount;
  }
  const stdoutData = outputStream({ raw: stdout, digest: result.stdoutDigest, bytes: result.stdoutBytes, preview: result.stdoutPreview }, "stdout");
  const stderrData = outputStream({ raw: stderr, digest: result.stderrDigest, bytes: result.stderrBytes, preview: result.stderrPreview }, "stderr");
  matchCount += stdoutData.matchCount + stderrData.matchCount;
  normalizedResult.stdoutDigest = stdoutData.digest;
  normalizedResult.stderrDigest = stderrData.digest;
  normalizedResult.stdoutBytes = stdoutData.bytes;
  normalizedResult.stderrBytes = stderrData.bytes;
  normalizedResult.stdoutPreview = stdoutData.preview;
  normalizedResult.stderrPreview = stderrData.preview;
  normalizedResult.stdoutTruncated = Boolean(result.stdoutTruncated);
  normalizedResult.stderrTruncated = Boolean(result.stderrTruncated);
  normalizedResult.timedOut = Boolean(result.timedOut);
  output.result = normalizedResult;
  const suppliedRedaction = isPlainRecord(value.redaction) ? value.redaction : {};
  output.redaction = { applied: matchCount > 0 || suppliedRedaction.applied === true, matchCount };
  return output;
}

function rawStream(result, field) {
  const candidates = Object.keys(result).filter((key) => key.toLowerCase() === field || key.toLowerCase() === `raw${field}` || key.toLowerCase() === `${field}raw`);
  if (candidates.length > 1) throw new EvidenceBundleError("INPUT_INVALID");
  const key = candidates[0];
  return key === undefined ? null : streamBytes(result[key], `result.${key}`);
}

function outputStream(stream, field) {
  const { raw, digest, bytes, preview } = stream;
  const streamDigest = raw === null ? normalizeDigest(digest, `result.${field}Digest`) : sha256Bytes(raw);
  const streamBytesCount = raw === null ? boundedCount(bytes, `result.${field}Bytes`) : raw.byteLength;
  const previewSource = preview === undefined ? raw === null ? "" : raw.toString("utf8") : String(preview);
  const redacted = redactText(previewSource, DEFAULT_MAX_PREVIEW_BYTES);
  return { digest: streamDigest, bytes: streamBytesCount, preview: redacted.text, matchCount: redacted.matchCount };
}

function componentDigests(source) {
  const digest = (value) => sha256Text(canonicalJson(value));
  const stableReceipts = source.verificationReceipts.map((receipt) => removeTiming(receipt));
  return {
    target: digest(source.target),
    authority: digest(source.authority),
    claims: digest(source.claims),
    evidenceContract: digest(source.evidenceContract),
    evidenceRequirements: digest(source.evidenceRequirements),
    observations: digest(source.observations),
    verificationReceipts: digest(stableReceipts),
    evidence: digest(source.evidence),
    evidenceLineage: digest(source.evidenceLineage),
    rules: digest(source.rules),
    policyConditions: digest(source.policyConditions),
    facts: digest(source.facts ?? {}),
    scope: digest(source.scope ?? {}),
    reviews: digest(source.reviews ?? []),
    reportedChecks: digest(source.reportedChecks ?? []),
    reviewNeeds: digest(source.reviewNeeds ?? []),
    summary: digest(source.summary ?? ""),
    verdict: digest(source.verdict),
    reasonCodes: digest(source.reasonCodes),
    verdictReduction: digest(source.verdictReduction),
  };
}

function normalizeRecords(value, field) {
  return normalizeArray(value, field, (entry) => {
    validateRecord(entry, field);
    const redacted = redactJson(entry);
    return redacted.value;
  });
}

function validateRecord(value, field) {
  if (!isPlainRecord(value) || !nonEmptyString(value.id)) throw new EvidenceBundleError("INPUT_INVALID");
  if (field === "claims") {
    if (!nonEmptyString(value.targetScopeId) || !nonEmptyString(value.statement)) throw new EvidenceBundleError("INPUT_INVALID");
    return;
  }
  if (field === "evidenceRequirements") {
    if (!producer(value.requiredProducer) || !nonEmptyString(value.inputKind)) throw new EvidenceBundleError("INPUT_INVALID");
    if (value.inputKind === "OBSERVATION") {
      if (!nonEmptyString(value.factKey) || !observationExpectation(value.expectation)) throw new EvidenceBundleError("INPUT_INVALID");
    } else if (value.inputKind === "VERIFICATION_RECEIPT") {
      if (!nonEmptyString(value.commandName) || value.expectedReceiptStatus !== "PASS") throw new EvidenceBundleError("INPUT_INVALID");
    } else throw new EvidenceBundleError("INPUT_INVALID");
    return;
  }
  if (field === "observations") {
    if (!producer(value.producer) || !nonEmptyString(value.targetScopeId) || !nonEmptyString(value.factKey) || !jsonPrimitive(value.factValue) || !nonEmptyString(value.sourceInputId) || !nonEmptyString(value.orderingKey) || !stringArray(value.limitations)) throw new EvidenceBundleError("INPUT_INVALID");
    return;
  }
  if (field === "evidence") {
    if (!nonEmptyString(value.requirementId) || !nonEmptyString(value.targetScopeId) || !isPlainRecord(value.satisfaction) || !["OBSERVATION", "VERIFICATION_RECEIPT"].includes(value.satisfaction.kind) || !stringArray(value.acceptedObservationIds) || !stringArray(value.acceptedReceiptIds) || !stringArray(value.lineageIds)) throw new EvidenceBundleError("INPUT_INVALID");
    return;
  }
  if (field === "evidenceLineage") {
    if (!nonEmptyString(value.kind) || !isPlainRecord(value.references) || !["OBSERVATION_ACCEPTED", "VERIFICATION_RECEIPT_ACCEPTED", "EVIDENCE_PRODUCED", "POLICY_RULE_EVALUATED", "VERDICT_REDUCED"].includes(value.kind)) throw new EvidenceBundleError("INPUT_INVALID");
    return;
  }
  if (field === "rules" && (!MARKET_POLICY_CONDITIONS.has(value.condition) || !VERDICTS.includes(value.verdict) || value.verdict === "ADMISSIBLE" || !nonEmptyString(value.reasonCode))) throw new EvidenceBundleError("INPUT_INVALID");
}

function nonEmptyString(value) { return typeof value === "string" && value.length > 0; }
function hasExactKeys(value, keys) {
  const actual = Object.keys(value).sort(compareStrings);
  const expected = [...keys].sort(compareStrings);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
function producer(value) { return isPlainRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.version); }
function stringArray(value) { return Array.isArray(value) && value.every(nonEmptyString); }
function jsonPrimitive(value) { return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)); }
function observationExpectation(value) {
  if (!isPlainRecord(value) || !nonEmptyString(value.kind)) return false;
  if (value.kind === "CONSTANT_EQUALS") return jsonPrimitive(value.value);
  return value.kind === "TARGET_BINDING_EQUALS" && ["repository", "pullRequestNumber", "baseSha", "headSha"].includes(value.targetField);
}

function normalizeArray(value, field, transform) {
  if (!Array.isArray(value)) throw new EvidenceBundleError("INPUT_INVALID");
  if (value.length > 10000) throw new EvidenceBundleError("INPUT_TOO_LARGE");
  return value.map(transform);
}

function normalizeStrings(value, field) {
  return normalizeArray(value ?? [], field, (entry) => {
    if (typeof entry !== "string" || entry.length === 0) throw new EvidenceBundleError("INPUT_INVALID");
    return boundedUtf8(redactText(entry).text, DEFAULT_MAX_PREVIEW_BYTES);
  });
}

function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) throw new EvidenceBundleError("INPUT_INVALID");
  return value;
}

function boundedCount(value, field) {
  if (!Number.isInteger(value) || value < 0) throw new EvidenceBundleError("INPUT_INVALID");
  return value;
}

function sortById(values) { return [...values].sort((left, right) => compareStrings(String(left?.id ?? ""), String(right?.id ?? ""))); }
function sortByOrdering(values) { return [...values].sort((left, right) => compareStrings(String(left?.orderingKey ?? ""), String(right?.orderingKey ?? "")) || compareStrings(String(left?.id ?? ""), String(right?.id ?? ""))); }
function compareReceipts(left, right) { return compareStrings(String(left?.command?.orderingKey ?? ""), String(right?.command?.orderingKey ?? "")) || compareStrings(String(left?.id ?? ""), String(right?.id ?? "")); }

function removeTiming(value) {
  if (Array.isArray(value)) return value.map(removeTiming);
  if (!isPlainRecord(value)) return value;
  const result = Object.create(null);
  for (const [key, entry] of Object.entries(value)) {
    if (!TIMING_KEYS.has(key)) Object.defineProperty(result, key, { value: removeTiming(entry), enumerable: true, configurable: true, writable: true });
  }
  return result;
}

function removeRuntimeFields(value, path = "") {
  if (Array.isArray(value)) return value.map((entry) => removeRuntimeFields(entry, path));
  if (!isPlainRecord(value)) return value;
  const result = Object.create(null);
  for (const [key, entry] of Object.entries(value)) {
    if (key === "finalizedAt" || key === "artifactDigest") continue;
    const childPath = path === "" ? key : `${path}.${key}`;
    const timing = childPath === "verificationReceipts.timing" && isPlainRecord(entry) ? removeTiming(entry) : null;
    Object.defineProperty(result, key, { value: timing ?? removeRuntimeFields(entry, childPath), enumerable: true, configurable: true, writable: true });
  }
  return result;
}
