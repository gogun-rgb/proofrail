import { evaluateKernel } from "@proofrail/kernel";
import {
  assertValidatedReleaseConfiguration,
  loadTrustedReleaseConfiguration,
} from "@proofrail/trusted-config";

export class ReleaseOrchestratorError extends Error {
  constructor(code) {
    super(`RELEASE_ORCHESTRATOR_${code}`);
    this.name = "ReleaseOrchestratorError";
    this.code = code;
  }
}

export async function loadReleaseConfiguration(options) {
  return loadTrustedReleaseConfiguration(options);
}

export function assembleReleaseKernelInput(validatedConfiguration, suppliedSnapshot) {
  const validated = assertValidatedReleaseConfiguration(validatedConfiguration);
  const snapshot = normalizeSnapshot(suppliedSnapshot);
  const { trustedConfiguration, policy, evidenceContract } = validated;
  enforceTarget(trustedConfiguration, snapshot);

  const observedFacts = new Map([
    ["target.repository", snapshot.repository],
    ["target.pullRequestNumber", snapshot.number],
    ["target.headSha", snapshot.headOid],
    ["target.state", snapshot.state],
    ["target.isDraft", snapshot.isDraft],
    ["collection.changedFilesComplete", snapshot.changedFiles === snapshot.files.length],
    ["scope.changedPathsWithinDeclaredWriteScope", snapshot.files.every(({ path }) =>
      trustedConfiguration.declaredWriteScope.some((pattern) => matchesScope(pattern, path)))],
    ["checks.minimumCountSatisfied", snapshot.checks.length >= policy.requiredCheckPolicy.minimumReportedChecks],
    ["checks.allReportedSuccessful", snapshot.checks.length > 0
      && snapshot.checks.every((check) => isSuccessfulCheck(policy, check))],
  ]);

  // The accepted collector does not query a base commit SHA and PRODUCT-RELEASE-001
  // forbids expanding that query. The configured base remains cross-document target
  // authority, but it is not fabricated as a GitHub Observation.
  const observationEntries = [...observedFacts.entries()].sort(([left], [right]) => compare(left, right));
  const observations = observationEntries.map(([factKey, factValue], index) => ({
    id: `obs.github.${factKey.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}`,
    observer: {
      id: trustedConfiguration.observer.id,
      version: trustedConfiguration.observer.version,
    },
    targetScopeId: trustedConfiguration.target.targetScopeId,
    factKey,
    factValue,
    sourceInputId: stableIdentity(trustedConfiguration.observer.sourceInputId),
    orderingKey: String(index + 1).padStart(3, "0"),
    limitations: [],
  }));

  return deepFreeze({
    schemaVersion: trustedConfiguration.kernel.inputSchemaVersion,
    evaluation: {
      id: `eval.release.${trustedConfiguration.id}.${trustedConfiguration.target.headSha}`,
    },
    claims: [{ ...trustedConfiguration.claim }],
    evidenceContracts: [{
      id: evidenceContract.id,
      version: evidenceContract.version,
      targetScopeId: evidenceContract.targetScopeId,
      selectionProvenance: { ...evidenceContract.selectionProvenance },
      requirementIds: evidenceContract.requirements.map(({ id }) => id).sort(compare),
    }],
    evidenceRequirements: evidenceContract.requirements.map((requirement) => ({
      id: requirement.id,
      evidenceContractId: evidenceContract.id,
      targetScopeId: requirement.targetScopeId,
      requiredObserver: { ...requirement.requiredObserver },
      factKey: requirement.factKey,
      expectedValue: requirement.expectedValue,
    })),
    observations,
    rules: policy.rules.map((rule) => structuredClone(rule)),
  });
}

export function evaluateReleaseCandidate(validatedConfiguration, snapshot) {
  const input = assembleReleaseKernelInput(validatedConfiguration, snapshot);
  return evaluateKernel(input);
}

function enforceTarget(configuration, snapshot) {
  if (snapshot.repository !== configuration.target.repository
      || snapshot.number !== configuration.target.pullRequestNumber
      || snapshot.baseRefName !== configuration.target.baseRefName
      || snapshot.headOid !== configuration.target.headSha) {
    fail("TARGET_MISMATCH");
  }
  if (!snapshot.commits.some(({ oid }) => oid === snapshot.headOid)) fail("TARGET_MISMATCH");
}

function normalizeSnapshot(value) {
  exactObject(value, ["repository", "number", "title", "state", "isDraft", "baseRefName", "headRefName", "headOid", "changedFiles", "files", "commits", "checks", "reviews"]);
  if (typeof value.repository !== "string" || !Number.isSafeInteger(value.number) || value.number < 1
      || typeof value.title !== "string" || value.title.length === 0 || value.title.length > 500
      || !["OPEN", "CLOSED", "MERGED"].includes(value.state)
      || typeof value.isDraft !== "boolean"
      || typeof value.baseRefName !== "string" || value.baseRefName === ""
      || typeof value.headRefName !== "string" || value.headRefName === ""
      || !/^[0-9a-f]{40}$/i.test(value.headOid)
      || !Number.isSafeInteger(value.changedFiles) || value.changedFiles < 0
      || !Array.isArray(value.files) || !Array.isArray(value.commits)
      || !Array.isArray(value.checks) || !Array.isArray(value.reviews)) fail("SNAPSHOT_INVALID");

  const files = value.files.map((file) => {
    exactObject(file, ["path", "additions", "deletions"]);
    if (!safeText(file.path, 4096) || !nonNegativeInteger(file.additions) || !nonNegativeInteger(file.deletions)) fail("SNAPSHOT_INVALID");
    return { path: file.path, additions: file.additions, deletions: file.deletions };
  }).sort((left, right) => compare(left.path, right.path));
  unique(files.map(({ path }) => path));

  const commits = value.commits.map((commit) => {
    exactObject(commit, ["oid"]);
    if (!/^[0-9a-f]{40}$/i.test(commit.oid)) fail("SNAPSHOT_INVALID");
    return { oid: commit.oid.toLowerCase() };
  }).sort((left, right) => compare(left.oid, right.oid));
  unique(commits.map(({ oid }) => oid));

  const checks = value.checks.map((check) => {
    exactObject(check, ["kind", "name", "status", "conclusion"]);
    if (!["check-run", "status-context"].includes(check.kind)
        || !safeText(check.name, 255) || !safeText(check.status, 64)
        || (check.conclusion !== null && !safeText(check.conclusion, 64))) fail("SNAPSHOT_INVALID");
    return {
      kind: check.kind,
      name: check.name,
      status: check.status.toUpperCase(),
      conclusion: check.conclusion === null ? null : check.conclusion.toUpperCase(),
    };
  }).sort((left, right) => compare(left.kind, right.kind) || compare(left.name, right.name));
  unique(checks.map(({ kind, name }) => `${kind}\u0000${name}`));

  for (const review of value.reviews) {
    exactObject(review, ["authorLogin", "state", "submittedAt", "commitOid"]);
    if ((review.authorLogin !== null && !safeText(review.authorLogin, 100))
        || !safeText(review.state, 64)
        || (review.submittedAt !== null && !safeText(review.submittedAt, 64))
        || (review.commitOid !== null && !/^[0-9a-f]{40}$/i.test(review.commitOid))) fail("SNAPSHOT_INVALID");
  }

  return deepFreeze({
    repository: value.repository,
    number: value.number,
    title: value.title,
    state: value.state,
    isDraft: value.isDraft,
    baseRefName: value.baseRefName,
    headRefName: value.headRefName,
    headOid: value.headOid.toLowerCase(),
    changedFiles: value.changedFiles,
    files,
    commits,
    checks,
    reviews: value.reviews.map((review) => ({ ...review })),
  });
}

function isSuccessfulCheck(policy, check) {
  if (check.kind === "status-context") {
    return policy.requiredCheckPolicy.acceptedStatusContextStates.includes(check.status);
  }
  return check.status === "COMPLETED"
    && check.conclusion !== null
    && policy.requiredCheckPolicy.acceptedCheckRunConclusions.includes(check.conclusion);
}

function matchesScope(pattern, changedPath) {
  if (pattern === changedPath) return true;
  if (!pattern.endsWith("/**")) return false;
  const prefix = pattern.slice(0, -3);
  return changedPath === prefix || changedPath.startsWith(`${prefix}/`);
}

function exactObject(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("SNAPSHOT_INVALID");
  const actual = Object.keys(value).sort(compare);
  const expected = [...keys].sort(compare);
  if (actual.length !== expected.length || actual.some((entry, index) => entry !== expected[index])) fail("SNAPSHOT_INVALID");
}

function safeText(value, maximumLength) {
  return typeof value === "string" && value.trim() !== "" && value.length <= maximumLength
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function unique(values) {
  if (new Set(values).size !== values.length) fail("SNAPSHOT_INVALID");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stableIdentity(value) {
  return [...value].map((character) => /[A-Za-z0-9._-]/.test(character)
    ? character
    : `-${character.codePointAt(0).toString(16).toUpperCase()}-`).join("");
}

function fail(code) {
  throw new ReleaseOrchestratorError(code);
}
