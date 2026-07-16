import { runGhCommand } from "./workflow-event-gh.js";

const GRAPHQL_INT_MAX = 2_147_483_647;
const GRAPHQL_INT_MAX_DIGITS = String(GRAPHQL_INT_MAX).length;

export const WORKFLOW_EVENT_SCHEMA_VERSION = "proofrail.workflow-event.v1";
export const COLLECTOR_ID = "github-pr-bounded-collector.v1";

export class WorkflowEventError extends Error {
  constructor(stage, reason) {
    super("PROOFRAIL_WORKFLOW_EVENT_FAILED");
    this.name = "WorkflowEventError";
    this.code = "PROOFRAIL_WORKFLOW_EVENT_FAILED";
    this.stage = stage;
    this.reason = reason;
  }
}
function hasOnlyKeys(value, allowed) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

export function normalizeCollectionOptions(options) {
  if (!isPlainObject(options)) throw new WorkflowEventError("INPUT", "COLLECTION_OPTIONS_INVALID");
  if (!hasOnlyKeys(options, ["repository", "pullRequestNumber", "baseSha", "headSha", "headRepository", "runGh", "clock"])) {
    throw new WorkflowEventError("INPUT", "COLLECTION_OPTIONS_INVALID");
  }
  const repository = normalizeRepository(options.repository, "REPOSITORY_INVALID");
  const pullRequestNumber = normalizePullRequestNumber(options.pullRequestNumber);
  const baseSha = normalizeExactSha(options.baseSha, "BASE_SHA_INVALID");
  const headSha = normalizeExactSha(options.headSha, "HEAD_SHA_INVALID");
  const runGh = options.runGh ?? runGhCommand;
  if (typeof runGh !== "function") throw new WorkflowEventError("INPUT", "RUNNER_INVALID");
  const expectedHeadRepository = options.headRepository === undefined
    ? null
    : normalizeRepository(options.headRepository, "HEAD_REPOSITORY_INVALID");
  return Object.freeze({
    repository,
    pullRequestNumber,
    baseSha,
    headSha,
    expectedHeadRepository,
    runGh,
    clock: options.clock ?? { now: () => new Date() },
  });
}

export function normalizeHeadOptions(options) {
  if (!isPlainObject(options)) throw new WorkflowEventError("INPUT", "HEAD_OPTIONS_INVALID");
  if (!hasOnlyKeys(options, ["repository", "pullRequestNumber", "runGh", "clock"])) {
    throw new WorkflowEventError("INPUT", "HEAD_OPTIONS_INVALID");
  }
  const repository = normalizeRepository(options.repository, "REPOSITORY_INVALID");
  const pullRequestNumber = normalizePullRequestNumber(options.pullRequestNumber);
  const runGh = options.runGh ?? runGhCommand;
  if (typeof runGh !== "function") throw new WorkflowEventError("INPUT", "RUNNER_INVALID");
  return Object.freeze({
    repository,
    pullRequestNumber,
    runGh,
    clock: options.clock ?? { now: () => new Date() },
  });
}

export function normalizeSource(value, snapshot) {
  const expected = [
    "collector", "repository", "pullRequestNumber", "baseRepository",
    "headRepository", "baseSha", "headSha", "collectedAt",
  ];
  if (!isPlainObject(value) || !hasExactKeys(value, expected)) {
    throw new WorkflowEventError("INPUT", "EVENT_SOURCE_INVALID");
  }
  if (value.collector !== COLLECTOR_ID
      || value.repository !== snapshot.repository
      || value.pullRequestNumber !== snapshot.number
      || value.baseSha !== snapshot.baseOid
      || value.headSha !== snapshot.headOid) {
    throw new WorkflowEventError("INPUT", "EVENT_SOURCE_INVALID");
  }
  const baseRepository = normalizeRepository(value.baseRepository, "EVENT_SOURCE_INVALID");
  const headRepository = normalizeRepository(value.headRepository, "EVENT_SOURCE_INVALID");
  const collectedAt = normalizeTimestamp(value.collectedAt, "EVENT_SOURCE_INVALID");
  if (baseRepository !== snapshot.repository) throw new WorkflowEventError("INPUT", "EVENT_SOURCE_INVALID");
  return {
    collector: COLLECTOR_ID,
    repository: snapshot.repository,
    pullRequestNumber: snapshot.number,
    baseRepository,
    headRepository,
    baseSha: snapshot.baseOid,
    headSha: snapshot.headOid,
    collectedAt,
  };
}

export function readClockTimestamp(clock) {
  if (!isPlainObject(clock) || typeof clock.now !== "function") throw new WorkflowEventError("INPUT", "CLOCK_INVALID");
  let value;
  try { value = clock.now(); } catch { throw new WorkflowEventError("INPUT", "CLOCK_INVALID"); }
  return normalizeTimestamp(value, "CLOCK_INVALID");
}

export function normalizeTimestamp(value, reason) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new WorkflowEventError("INPUT", reason);
  return date.toISOString();
}

export function normalizeRepository(value, reason) {
  if (typeof value !== "string"
      || !/^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})\/[A-Za-z0-9_.-]{1,100}$/.test(value)) {
    throw new WorkflowEventError("INPUT", reason);
  }
  return value;
}

export function normalizePullRequestNumber(value) {
  const normalized = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(normalized)
      || normalized <= 0
      || normalized > GRAPHQL_INT_MAX
      || (typeof value === "string" && value.length > GRAPHQL_INT_MAX_DIGITS)) {
    throw new WorkflowEventError("INPUT", "PULL_REQUEST_INVALID");
  }
  return normalized;
}

export function normalizeExactSha(value, reason) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/i.test(value)) throw new WorkflowEventError("INPUT", reason);
  return value.toLowerCase();
}

export function normalizeSha(value, reason) {
  if (!isCommitSha(value)) throw new WorkflowEventError("INPUT", reason);
  return value.toLowerCase();
}

export function isCommitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40,64}$/i.test(value);
}

export function isSafeRepositoryPath(value) {
  return typeof value === "string"
    && value.length > 0
    && !value.startsWith("/")
    && !value.startsWith("\\")
    && !/^[A-Za-z]:/.test(value)
    && !value.includes("\\")
    && !value.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function hasExactKeys(value, expected) {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

export function freezeDeep(value) {
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) freezeDeep(nested);
    return Object.freeze(value);
  }
  return value;
}
