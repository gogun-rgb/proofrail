import assert from "node:assert/strict";
import test from "node:test";

import {
  collectWorkflowEvent,
  readCurrentPullRequestHead,
} from "../../packages/evidence-gate/src/workflow-event-cli.mjs";

const REPOSITORY = "proofrail/demo";
const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);
const CURRENT_HEAD_SHA = "3".repeat(40);

const SNAPSHOT = Object.freeze({
  repository: REPOSITORY,
  number: 8,
  title: "Document the prototype",
  state: "OPEN",
  isDraft: false,
  baseRefName: "main",
  baseOid: BASE_SHA,
  headRefName: "docs/prototype",
  headOid: HEAD_SHA,
  changedFiles: 2,
  files: [
    { path: "docs/a.md", additions: 1, deletions: 0 },
    { path: "docs/b.md", additions: 2, deletions: 1 },
  ],
  commits: [{ oid: HEAD_SHA }],
  checks: [{ kind: "check-run", name: "ci", status: "COMPLETED", conclusion: "SUCCESS" }],
  reviews: [],
});

function parseGraphql(args) {
  assert.deepEqual(args.slice(0, 3), ["api", "graphql", "-f"]);
  const query = args[3].slice("query=".length);
  const variables = {};
  for (let index = 4; index < args.length; index += 2) {
    const [key, value] = args[index + 1].split("=", 2);
    variables[key] = args[index] === "-F" ? Number(value) : value;
  }
  return { query, variables };
}

function page(values, cursor, prefix, map) {
  const offset = cursor === undefined ? 0 : cursor === `${prefix}-next` ? 1 : -1;
  assert.notEqual(offset, -1, `unexpected ${prefix} cursor`);
  const pageValues = offset === 0 ? values.slice(0, 1) : values.slice(1);
  return {
    nodes: pageValues.map(map),
    pageInfo: {
      hasNextPage: offset === 0 && values.length > 1,
      endCursor: offset === 0 && values.length > 1 ? `${prefix}-next` : null,
    },
  };
}

function fakeGh(snapshot, calls, { currentHead = CURRENT_HEAD_SHA } = {}) {
  return async (args) => {
    calls.push(args);
    const { query, variables } = parseGraphql(args);
    if (query.includes("baseRepository{nameWithOwner}")) {
      return JSON.stringify({
        data: { repository: { pullRequest: {
          baseRepository: { nameWithOwner: REPOSITORY },
          headRepository: { nameWithOwner: REPOSITORY },
          baseRefOid: BASE_SHA,
          headRefOid: HEAD_SHA,
        } } },
      });
    }
    if (query.startsWith("query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid}}")) {
      return JSON.stringify({ data: { repository: { pullRequest: { headRefOid: currentHead } } } });
    }
    if (query.includes("number title")) {
      return JSON.stringify({ data: { repository: { pullRequest: {
        number: snapshot.number,
        title: snapshot.title,
        state: snapshot.state,
        isDraft: snapshot.isDraft,
        changedFiles: snapshot.changedFiles,
        baseRefName: snapshot.baseRefName,
        baseRefOid: snapshot.baseOid,
        headRefName: snapshot.headRefName,
        headRefOid: snapshot.headOid,
      } } } });
    }
    if (query.includes("files(first:100")) {
      return JSON.stringify({ data: { repository: { pullRequest: {
        headRefOid: snapshot.headOid,
        files: page(snapshot.files, variables.cursor, "files", (value) => value),
      } } } });
    }
    if (query.includes("commits(first:100")) {
      return JSON.stringify({ data: { repository: { pullRequest: {
        headRefOid: snapshot.headOid,
        commits: page(snapshot.commits, variables.cursor, "commits", (value) => ({ commit: value })),
      } } } });
    }
    if (query.includes("reviews(first:100")) {
      return JSON.stringify({ data: { repository: { pullRequest: {
        headRefOid: snapshot.headOid,
        reviews: page(snapshot.reviews, variables.cursor, "reviews", (value) => ({
          state: value.state,
          submittedAt: value.submittedAt,
          author: value.authorLogin === null ? null : { login: value.authorLogin },
          commit: value.commitOid === null ? null : { oid: value.commitOid },
        })),
      } } } });
    }
    if (query.includes("contexts(first:100")) {
      return JSON.stringify({ data: { repository: { object: {
        oid: snapshot.headOid,
        statusCheckRollup: { contexts: page(snapshot.checks, variables.cursor, "checks", (value) => ({
          __typename: "CheckRun",
          name: value.name,
          status: value.status,
          conclusion: value.conclusion,
        })) },
      } } } });
    }
    throw new Error("unexpected GraphQL query");
  };
}

test("collects a bounded paginated snapshot and re-reads head", async () => {
  const calls = [];
  const event = await collectWorkflowEvent({
    repository: REPOSITORY,
    pullRequestNumber: 8,
    baseSha: BASE_SHA,
    headSha: HEAD_SHA,
    runGh: fakeGh(SNAPSHOT, calls),
    clock: { now: () => new Date("2026-07-15T00:00:00.000Z") },
  });

  assert.equal(event.origin, "live");
  assert.equal(event.snapshot.headOid, HEAD_SHA);
  assert.equal(event.source.baseRepository, REPOSITORY);
  assert.equal(event.source.headRepository, REPOSITORY);
  assert.equal(calls.length, 7);
  assert.equal(event.source.collectedAt, "2026-07-15T00:00:00.000Z");

  const current = await readCurrentPullRequestHead({
    repository: REPOSITORY,
    pullRequestNumber: 8,
    runGh: fakeGh(SNAPSHOT, calls),
    clock: { now: () => new Date("2026-07-15T00:00:00.000Z") },
  });
  assert.deepEqual(current, {
    repository: REPOSITORY,
    pullRequestNumber: 8,
    headSha: CURRENT_HEAD_SHA,
    observedAt: "2026-07-15T00:00:00.000Z",
    source: "github-api",
  });
  assert.equal(calls.length, 8);
});

test("rejects a head identity mismatch without exposing gh output", async () => {
  const calls = [];
  await assert.rejects(
    collectWorkflowEvent({
      repository: REPOSITORY,
      pullRequestNumber: 8,
      baseSha: BASE_SHA,
      headSha: "4".repeat(40),
      runGh: fakeGh(SNAPSHOT, calls),
    }),
    (error) => error?.code === "PROOFRAIL_WORKFLOW_EVENT_FAILED" && error.stage === "IDENTITY",
  );
});

test("rejects a malformed current-head response", async () => {
  await assert.rejects(
    readCurrentPullRequestHead({
      repository: REPOSITORY,
      pullRequestNumber: 8,
      runGh: async () => JSON.stringify({ data: { repository: { pullRequest: {} } } }),
    }),
    (error) => error?.code === "PROOFRAIL_WORKFLOW_EVENT_FAILED" && error.stage === "COLLECTION",
  );
});
