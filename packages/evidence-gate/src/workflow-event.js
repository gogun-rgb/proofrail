import {
  collectGitHubPullRequest,
  normalizeGitHubSnapshot,
} from "./github.js";
import {
  CURRENT_HEAD_QUERY,
  IDENTITY_QUERY,
  queryGraphql,
} from "./workflow-event-gh.js";
import {
  COLLECTOR_ID,
  freezeDeep,
  hasExactKeys,
  isCommitSha,
  isSafeRepositoryPath,
  isPlainObject,
  normalizeCollectionOptions,
  normalizeHeadOptions,
  normalizeRepository,
  normalizeSha,
  normalizeSource,
  readClockTimestamp,
  WORKFLOW_EVENT_SCHEMA_VERSION,
  WorkflowEventError,
} from "./workflow-event-utils.js";

export { WorkflowEventError } from "./workflow-event-utils.js";

export async function collectWorkflowEvent(options) {
  const normalized = normalizeCollectionOptions(options);
  const collectedAt = readClockTimestamp(normalized.clock);
  const identity = await queryRepositoryIdentity(normalized);
  assertIdentityMatches(identity, normalized);

  let snapshot;
  try {
    snapshot = await collectGitHubPullRequest({
      repository: normalized.repository,
      pullRequestNumber: normalized.pullRequestNumber,
      runGh: normalized.runGh,
    });
  } catch {
    throw new WorkflowEventError("COLLECTION", "INITIAL_SNAPSHOT_FAILED");
  }

  try {
    assertSnapshotMatches(snapshot, normalized, identity);
  } catch {
    throw new WorkflowEventError("IDENTITY", "INITIAL_SNAPSHOT_MISMATCH");
  }

  return freezeDeep({
    schemaVersion: WORKFLOW_EVENT_SCHEMA_VERSION,
    origin: "live",
    snapshot,
    source: {
      collector: COLLECTOR_ID,
      repository: normalized.repository,
      pullRequestNumber: normalized.pullRequestNumber,
      baseRepository: identity.baseRepository,
      headRepository: identity.headRepository,
      baseSha: normalized.baseSha,
      headSha: normalized.headSha,
      collectedAt,
    },
  });
}

export async function readCurrentPullRequestHead(options) {
  const normalized = normalizeHeadOptions(options);
  const observedAt = readClockTimestamp(normalized.clock);
  let result;
  try {
    result = await queryGraphql(
      normalized.runGh,
      CURRENT_HEAD_QUERY,
      normalized.repository,
      normalized.pullRequestNumber,
      "CURRENT_HEAD",
    );
  } catch {
    throw new WorkflowEventError("COLLECTION", "CURRENT_HEAD_FAILED");
  }

  const pullRequest = result?.data?.repository?.pullRequest;
  if (!isPlainObject(pullRequest)
      || !hasExactKeys(pullRequest, ["headRefOid"])
      || !isCommitSha(pullRequest.headRefOid)) {
    throw new WorkflowEventError("COLLECTION", "CURRENT_HEAD_INVALID");
  }
  return Object.freeze({
    repository: normalized.repository,
    pullRequestNumber: normalized.pullRequestNumber,
    headSha: pullRequest.headRefOid.toLowerCase(),
    observedAt,
    source: "github-api",
  });
}

export function normalizeWorkflowEvent(value) {
  if (!isPlainObject(value)
      || !hasExactKeys(value, ["schemaVersion", "origin", "snapshot", "source"])) {
    throw new WorkflowEventError("INPUT", "EVENT_ENVELOPE_INVALID");
  }
  if (value.schemaVersion !== WORKFLOW_EVENT_SCHEMA_VERSION || value.origin !== "live") {
    throw new WorkflowEventError("INPUT", "EVENT_ENVELOPE_INVALID");
  }

  let snapshot;
  try {
    assertSnapshotShape(value.snapshot);
    snapshot = normalizeGitHubSnapshot(value.snapshot);
  } catch {
    throw new WorkflowEventError("INPUT", "SNAPSHOT_INVALID");
  }
  if (snapshot.changedFiles !== snapshot.files.length
      || !snapshot.commits.some(({ oid }) => oid === snapshot.headOid)
      || snapshot.files.some(({ path }) => !isSafeRepositoryPath(path))) {
    throw new WorkflowEventError("INPUT", "SNAPSHOT_INVALID");
  }

  const source = normalizeSource(value.source, snapshot);
  return freezeDeep({
    schemaVersion: WORKFLOW_EVENT_SCHEMA_VERSION,
    origin: "live",
    snapshot,
    source,
  });
}

function assertSnapshotShape(value) {
  const fields = [
    "repository", "number", "title", "state", "isDraft", "baseRefName",
    "baseOid", "headRefName", "headOid", "changedFiles", "files", "commits",
    "checks", "reviews",
  ];
  if (!isPlainObject(value) || !hasExactKeys(value, fields)) throw new Error("snapshot fields");
  const expected = {
    files: ["path", "additions", "deletions"],
    commits: ["oid"],
    checks: ["kind", "name", "status", "conclusion"],
    reviews: ["authorLogin", "state", "submittedAt", "commitOid"],
  };
  for (const [field, keys] of Object.entries(expected)) {
    if (!Array.isArray(value[field])
        || value[field].some((entry) => !isPlainObject(entry) || !hasExactKeys(entry, keys))) {
      throw new Error(`${field} fields`);
    }
  }
}

export function workflowEventByteLength(value) {
  const source = JSON.stringify(value);
  return Buffer.byteLength(source, "utf8");
}

async function queryRepositoryIdentity({ repository, pullRequestNumber, runGh }) {
  let result;
  try {
    result = await queryGraphql(
      runGh,
      IDENTITY_QUERY,
      repository,
      pullRequestNumber,
      "IDENTITY",
    );
  } catch {
    throw new WorkflowEventError("COLLECTION", "IDENTITY_QUERY_FAILED");
  }

  const pullRequest = result?.data?.repository?.pullRequest;
  const baseRepository = pullRequest?.baseRepository?.nameWithOwner;
  const headRepository = pullRequest?.headRepository?.nameWithOwner;
  if (!isPlainObject(pullRequest)
      || !hasExactKeys(pullRequest, ["baseRepository", "headRepository", "baseRefOid", "headRefOid"])
      || !isPlainObject(pullRequest.baseRepository)
      || !isPlainObject(pullRequest.headRepository)) {
    throw new WorkflowEventError("COLLECTION", "IDENTITY_INVALID");
  }
  try {
    return Object.freeze({
      baseRepository: normalizeRepository(baseRepository, "IDENTITY_INVALID"),
      headRepository: normalizeRepository(headRepository, "IDENTITY_INVALID"),
      baseSha: normalizeSha(pullRequest.baseRefOid, "IDENTITY_INVALID"),
      headSha: normalizeSha(pullRequest.headRefOid, "IDENTITY_INVALID"),
    });
  } catch {
    throw new WorkflowEventError("COLLECTION", "IDENTITY_INVALID");
  }
}

function assertIdentityMatches(identity, { repository, baseSha, headSha, expectedHeadRepository }) {
  if (identity.baseRepository !== repository
      || identity.baseSha !== baseSha
      || identity.headSha !== headSha
      || (expectedHeadRepository !== null && identity.headRepository !== expectedHeadRepository)) {
    throw new WorkflowEventError("IDENTITY", "TARGET_IDENTITY_MISMATCH");
  }
}

function assertSnapshotMatches(snapshot, expected, identity) {
  if (!snapshot
      || snapshot.repository !== expected.repository
      || snapshot.number !== expected.pullRequestNumber
      || snapshot.baseOid !== expected.baseSha
      || snapshot.headOid !== expected.headSha
      || snapshot.baseOid !== identity.baseSha
      || snapshot.headOid !== identity.headSha
      || snapshot.changedFiles !== snapshot.files.length
      || !snapshot.commits.some(({ oid }) => oid === expected.headSha)
      || snapshot.files.some(({ path }) => !isSafeRepositoryPath(path))) {
    throw new Error("snapshot identity mismatch");
  }
}
