import { fail } from "./errors.js";

export function normalizeSnapshot(value, { requireReviewEligibility = false } = {}) {
  exactObject(value, ["repository", "number", "title", "state", "isDraft", "baseRefName", "baseOid", "headRefName", "headOid", "changedFiles", "files", "commits", "checks", "reviews"]);
  if (typeof value.repository !== "string" || !Number.isSafeInteger(value.number) || value.number < 1
      || typeof value.title !== "string" || value.title.length === 0 || value.title.length > 500
      || !["OPEN", "CLOSED", "MERGED"].includes(value.state)
      || typeof value.isDraft !== "boolean"
      || typeof value.baseRefName !== "string" || value.baseRefName === ""
      || !/^[0-9a-f]{40}$/i.test(value.baseOid)
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
    exactObject(review, requireReviewEligibility
      ? ["authorLogin", "authorCanPushToRepository", "state", "submittedAt", "commitOid"]
      : ["authorLogin", "state", "submittedAt", "commitOid"]);
    if ((review.authorLogin !== null && !safeText(review.authorLogin, 100))
        || !safeText(review.state, 64)
        || (review.submittedAt !== null && !safeText(review.submittedAt, 64))
        || (review.commitOid !== null && !/^[0-9a-f]{40}$/i.test(review.commitOid))
        || (requireReviewEligibility && typeof review.authorCanPushToRepository !== "boolean")) fail("SNAPSHOT_INVALID");
  }

  return deepFreeze({
    repository: value.repository,
    number: value.number,
    title: value.title,
    state: value.state,
    isDraft: value.isDraft,
    baseRefName: value.baseRefName,
    baseOid: value.baseOid.toLowerCase(),
    headRefName: value.headRefName,
    headOid: value.headOid.toLowerCase(),
    changedFiles: value.changedFiles,
    files,
    commits,
    checks,
    reviews: value.reviews.map((review) => requireReviewEligibility
      ? { ...review, authorCanPushToRepository: review.authorCanPushToRepository }
      : { ...review }),
  });
}

export function isSuccessfulCheck(policy, check) {
  if (check.kind === "status-context") {
    return policy.requiredCheckPolicy.acceptedStatusContextStates.includes(check.status);
  }
  return check.status === "COMPLETED"
    && check.conclusion !== null
    && policy.requiredCheckPolicy.acceptedCheckRunConclusions.includes(check.conclusion);
}

export function matchesScope(pattern, changedPath) {
  if (pattern === changedPath) return true;
  if (!pattern.endsWith("/**")) return false;
  const prefix = pattern.slice(0, -3);
  return changedPath === prefix || changedPath.startsWith(`${prefix}/`);
}

export function exactObject(value, keys) {
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

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
