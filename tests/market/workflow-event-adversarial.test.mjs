import assert from "node:assert/strict";
import test from "node:test";

import {
  collectWorkflowEvent,
  normalizeWorkflowEvent,
  runWorkflowEventCli,
} from "../../packages/evidence-gate/src/workflow-event-cli.mjs";

const REPOSITORY = "proofrail/demo";
const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);
const TOKEN = `ghp_${"S".repeat(30)}`;

function snapshot(overrides = {}) {
  return {
    repository: REPOSITORY,
    number: 8,
    title: "safe title",
    state: "OPEN",
    isDraft: false,
    baseRefName: "main",
    baseOid: BASE_SHA,
    headRefName: "feature",
    headOid: HEAD_SHA,
    changedFiles: 1,
    files: [{ path: "docs/guide.md", additions: 1, deletions: 0 }],
    commits: [{ oid: HEAD_SHA }],
    checks: [],
    reviews: [],
    ...overrides,
  };
}

function fakeGh(value, { headRepository = REPOSITORY, malformed = false, repeatedCursor = false } = {}) {
  return async (args) => {
    const query = args[3];
    if (malformed) return "{not-json";
    if (query.includes("baseRepository{nameWithOwner}")) {
      return JSON.stringify({ data: { repository: { pullRequest: {
        baseRepository: { nameWithOwner: REPOSITORY },
        headRepository: { nameWithOwner: headRepository },
        baseRefOid: BASE_SHA,
        headRefOid: HEAD_SHA,
      } } } });
    }
    if (query.includes("number title")) {
      return JSON.stringify({ data: { repository: { pullRequest: {
        number: value.number,
        title: value.title,
        state: value.state,
        isDraft: value.isDraft,
        changedFiles: value.changedFiles,
        baseRefName: value.baseRefName,
        baseRefOid: value.baseOid,
        headRefName: value.headRefName,
        headRefOid: value.headOid,
      } } } });
    }
    if (query.includes("files(first:100")) {
      const cursor = args.find((entry) => entry.startsWith("cursor="));
      const pageInfo = repeatedCursor
        ? { hasNextPage: true, endCursor: "same" }
        : { hasNextPage: false, endCursor: null };
      return JSON.stringify({ data: { repository: { pullRequest: {
        headRefOid: value.headOid,
        files: { nodes: cursor ? [] : value.files, pageInfo },
      } } } });
    }
    if (query.includes("commits(first:100")) {
      return JSON.stringify({ data: { repository: { pullRequest: {
        headRefOid: value.headOid,
        commits: { nodes: value.commits.map((commit) => ({ commit })), pageInfo: { hasNextPage: false, endCursor: null } },
      } } } });
    }
    if (query.includes("reviews(first:100")) {
      return JSON.stringify({ data: { repository: { pullRequest: {
        headRefOid: value.headOid,
        reviews: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
      } } } });
    }
    if (query.includes("contexts(first:100")) {
      return JSON.stringify({ data: { repository: { object: {
        oid: value.headOid,
        statusCheckRollup: { contexts: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } },
      } } } });
    }
    throw new Error("unexpected query");
  };
}

const clock = { now: () => new Date("2026-07-15T00:00:00.000Z") };

test("rejects a fork identity mismatch before writing an event", async () => {
  await assert.rejects(
    collectWorkflowEvent({
      repository: REPOSITORY,
      pullRequestNumber: 8,
      baseSha: BASE_SHA,
      headSha: HEAD_SHA,
      headRepository: "expected/fork",
      runGh: fakeGh(snapshot(), { headRepository: "actual/fork" }),
      clock,
    }),
    (error) => error?.stage === "IDENTITY" && error?.reason === "TARGET_IDENTITY_MISMATCH",
  );
});
test("rejects traversal-shaped changed paths and repeated cursors", async () => {
  await assert.rejects(
    collectWorkflowEvent({
      repository: REPOSITORY,
      pullRequestNumber: 8,
      baseSha: BASE_SHA,
      headSha: HEAD_SHA,
      runGh: fakeGh(snapshot({ files: [{ path: "../secret", additions: 1, deletions: 0 }] })),
      clock,
    }),
    (error) => error?.stage === "IDENTITY" && error?.reason === "INITIAL_SNAPSHOT_MISMATCH",
  );
  await assert.rejects(
    collectWorkflowEvent({
      repository: REPOSITORY,
      pullRequestNumber: 8,
      baseSha: BASE_SHA,
      headSha: HEAD_SHA,
      runGh: fakeGh(snapshot(), { repeatedCursor: true }),
      clock,
    }),
    (error) => error?.stage === "COLLECTION" && error?.reason === "INITIAL_SNAPSHOT_FAILED",
  );
});

test("redacts secret-shaped metadata and rejects malformed GraphQL without disclosure", async () => {
  const output = [];
  const result = await runWorkflowEventCli([
    "--github-repo", REPOSITORY,
    "--pull-request", "8",
    "--base-sha", BASE_SHA,
    "--head-sha", HEAD_SHA,
    "--output", "event.json",
  ], {
    runGh: fakeGh(snapshot({ title: `review ${TOKEN}` })),
    clock,
    write: async (_path, text) => output.push(text),
  });
  assert.equal(output.length, 1);
  assert.equal(result.event.origin, "live");
  assert.doesNotMatch(output[0], new RegExp(TOKEN));
  assert.match(output[0], /\[REDACTED\]/);

  assert.throws(
    () => normalizeWorkflowEvent({ ...result.event, extra: "ambiguous" }),
    (error) => error?.stage === "INPUT" && error?.reason === "EVENT_ENVELOPE_INVALID",
  );
  assert.throws(
    () => normalizeWorkflowEvent({
      ...result.event,
      snapshot: { ...result.event.snapshot, files: [{ path: "../secret", additions: 1, deletions: 0 }] },
    }),
    (error) => error?.stage === "INPUT" && error?.reason === "SNAPSHOT_INVALID",
  );
  assert.throws(
    () => normalizeWorkflowEvent({
      ...result.event,
      snapshot: {
        ...result.event.snapshot,
        files: [{ path: "docs/guide.md", additions: 1, deletions: 0, extra: "ambiguous" }],
      },
    }),
    (error) => error?.stage === "INPUT" && error?.reason === "SNAPSHOT_INVALID",
  );
  await assert.rejects(
    runWorkflowEventCli([
      "--github-repo", REPOSITORY,
      "--pull-request", "8",
      "--base-sha", BASE_SHA,
      "--head-sha", HEAD_SHA,
      "--output", "event.json",
    ], { runGh: fakeGh(snapshot(), { malformed: true }), clock, write: async () => {} }),
    (error) => error?.stage === "COLLECTION" && error?.reason === "IDENTITY_QUERY_FAILED",
  );
});
