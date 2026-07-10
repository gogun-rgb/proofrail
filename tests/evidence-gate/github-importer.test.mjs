import assert from "node:assert/strict";
import { copyFileSync, chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { delimiter } from "node:path";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildEvidencePacket, canonicalJson } from "../../packages/evidence-gate/src/index.js";
import {
  collectGitHubPullRequest,
  mapGitHubPullRequestToEvidenceInput,
  normalizeGitHubSnapshot
} from "../../packages/evidence-gate/src/github.js";
import { parseGitHubArguments } from "../../packages/evidence-gate/src/github-cli.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GITHUB_CLI = path.join(ROOT, "packages/evidence-gate/src/github-cli.mjs");
const STATIC_CLI = path.join(ROOT, "packages/evidence-gate/src/cli.mjs");
const FIXTURE_PATH = path.join(ROOT, "examples/evidence-gate/github/sanitized-pr-snapshot.json");
const STATIC_INPUT = path.join(ROOT, "examples/evidence-gate/input.json");
const STATIC_EXPECTED = path.join(ROOT, "examples/evidence-gate/expected-output.json");
const METADATA_QUERY = `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){number title state isDraft changedFiles baseRefName headRefName headRefOid}}}`;
const FILES_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){files(first:100,after:$cursor){nodes{path additions deletions}pageInfo{hasNextPage endCursor}}}}}`;
const COMMITS_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){commits(first:100,after:$cursor){nodes{commit{oid}}pageInfo{hasNextPage endCursor}}}}}`;
const REVIEWS_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviews(first:100,after:$cursor){nodes{state submittedAt author{login}commit{oid}}pageInfo{hasNextPage endCursor}}}}}`;
const CHECKS_QUERY = `query($owner:String!,$name:String!,$expression:String!,$cursor:String){repository(owner:$owner,name:$name){object(expression:$expression){... on Commit{oid statusCheckRollup{contexts(first:100,after:$cursor){nodes{__typename ... on CheckRun{name status conclusion}... on StatusContext{context state}}pageInfo{hasNextPage endCursor}}}}}}}`;
const ALL_QUERIES = [METADATA_QUERY, FILES_QUERY, COMMITS_QUERY, REVIEWS_QUERY, CHECKS_QUERY];

function fixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

function packetFor(snapshot) {
  return buildEvidencePacket(mapGitHubPullRequestToEvidenceInput(snapshot));
}

function missingIds(packet) {
  return packet.missingEvidence.map((item) => item.id).sort();
}

function withTempDirectory(run) {
  const directory = mkdtempSync(path.join(tmpdir(), "proofrail-github-importer-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function parseGraphqlArgs(args) {
  assert.deepEqual(args.slice(0, 3), ["api", "graphql", "-f"]);
  assert.match(args[3], /^query=/);
  const variables = {};
  for (let index = 4; index < args.length; index += 2) {
    const flag = args[index];
    const assignment = args[index + 1];
    assert.ok(flag === "-f" || flag === "-F");
    const separator = assignment.indexOf("=");
    const name = assignment.slice(0, separator);
    const value = assignment.slice(separator + 1);
    variables[name] = flag === "-F" ? Number(value) : value;
  }
  return { query: args[3].slice("query=".length), variables };
}

function connectionPage(values, cursor, prefix, map) {
  const offset = cursor === undefined ? 0 : cursor === `${prefix}-2` ? 1 : -1;
  assert.notEqual(offset, -1, `unexpected ${prefix} cursor: ${cursor}`);
  const hasNextPage = offset === 0 && values.length > 1;
  return {
    nodes: (offset === 0 ? values.slice(0, 1) : values.slice(1)).map(map),
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? `${prefix}-2` : null
    }
  };
}

function graphqlEnvelope(query, variables, snapshot) {
  if (query === METADATA_QUERY) {
    return { data: { repository: { pullRequest: {
      number: snapshot.number,
      title: snapshot.title,
      state: snapshot.state,
      isDraft: snapshot.isDraft,
      changedFiles: snapshot.changedFiles,
      baseRefName: snapshot.baseRefName,
      headRefName: snapshot.headRefName,
      headRefOid: snapshot.headOid
    } } } };
  }
  if (query === FILES_QUERY) {
    return { data: { repository: { pullRequest: { files: connectionPage(
      snapshot.files,
      variables.cursor,
      "files",
      (file) => file
    ) } } } };
  }
  if (query === COMMITS_QUERY) {
    return { data: { repository: { pullRequest: { commits: connectionPage(
      snapshot.commits,
      variables.cursor,
      "commits",
      (commit) => ({ commit })
    ) } } } };
  }
  if (query === REVIEWS_QUERY) {
    return { data: { repository: { pullRequest: { reviews: connectionPage(
      snapshot.reviews,
      variables.cursor,
      "reviews",
      (review) => ({
        state: review.state,
        submittedAt: review.submittedAt,
        author: review.authorLogin === null ? null : { login: review.authorLogin },
        commit: review.commitOid === null ? null : { oid: review.commitOid }
      })
    ) } } } };
  }
  if (query === CHECKS_QUERY) {
    return { data: { repository: { object: {
      oid: snapshot.headOid,
      statusCheckRollup: { contexts: connectionPage(
        snapshot.checks,
        variables.cursor,
        "checks",
        (check) => check.kind === "check-run"
          ? {
              __typename: "CheckRun",
              name: check.name,
              status: check.status,
              conclusion: check.conclusion
            }
          : {
              __typename: "StatusContext",
              context: check.name,
              state: check.status
            }
      ) }
    } } } };
  }
  throw new Error("unexpected query");
}

function createGraphqlRunGh(snapshot, calls = []) {
  return async (args) => {
    calls.push(args);
    const { query, variables } = parseGraphqlArgs(args);
    return JSON.stringify(graphqlEnvelope(query, variables, snapshot));
  };
}

function runGitHubCliWithFakeGh({ args, mode = "success", payload = fixture(), writeOutput = false } = {}) {
  return withTempDirectory((directory) => {
    const ghName = process.platform === "win32" ? "gh.exe" : "gh";
    const ghPath = path.join(directory, ghName);
    const markerPath = path.join(directory, "argv.jsonl");
    const outputPath = path.join(directory, "packet.json");
    copyFileSync(process.execPath, ghPath);
    if (process.platform !== "win32") chmodSync(ghPath, 0o755);
    writeFileSync(path.join(directory, "api"), [
      'const fs = require("node:fs");',
      'const raw = process.argv.slice(2);',
      'fs.appendFileSync(process.env.FAKE_GH_MARKER, JSON.stringify(raw) + "\\n");',
      'if (process.env.FAKE_GH_MODE === "failure") {',
      '  process.stderr.write(process.env.FAKE_GH_STDERR);',
      '  process.exit(1);',
      '}',
      'if (process.env.FAKE_GH_MODE === "malformed") { process.stdout.write("{not-json"); process.exit(0); }',
      'if (process.env.FAKE_GH_MODE === "shape") { process.stdout.write(JSON.stringify({data:{repository:{pullRequest:{title:"secret=SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE"}}}})); process.exit(0); }',
      'const fields = {};',
      'for (let index = 1; index < raw.length; index += 2) {',
      '  const assignment = raw[index + 1];',
      '  const separator = assignment.indexOf("=");',
      '  fields[assignment.slice(0, separator)] = assignment.slice(separator + 1);',
      '}',
      'const query = fields.query;',
      'const snapshot = JSON.parse(process.env.FAKE_GH_PAYLOAD);',
      'function page(values, prefix, map) {',
      '  const second = fields.cursor === prefix + "-2";',
      '  const nodes = (second ? values.slice(1) : values.slice(0, 1)).map(map);',
      '  const hasNextPage = !second && values.length > 1;',
      '  return {nodes,pageInfo:{hasNextPage,endCursor:hasNextPage ? prefix + "-2" : null}};',
      '}',
      'let result;',
      'if (query.includes("pullRequest(number:$number){number title")) {',
      '  result={data:{repository:{pullRequest:{number:snapshot.number,title:snapshot.title,state:snapshot.state,isDraft:snapshot.isDraft,changedFiles:snapshot.changedFiles,baseRefName:snapshot.baseRefName,headRefName:snapshot.headRefName,headRefOid:snapshot.headOid}}}};',
      '} else if (query.includes("files(first:100")) {',
      '  result={data:{repository:{pullRequest:{files:page(snapshot.files,"files",value=>value)}}}};',
      '} else if (query.includes("commits(first:100")) {',
      '  result={data:{repository:{pullRequest:{commits:page(snapshot.commits,"commits",value=>({commit:value}))}}}};',
      '} else if (query.includes("reviews(first:100")) {',
      '  result={data:{repository:{pullRequest:{reviews:page(snapshot.reviews,"reviews",value=>({state:value.state,submittedAt:value.submittedAt,author:value.authorLogin===null?null:{login:value.authorLogin},commit:value.commitOid===null?null:{oid:value.commitOid}}))}}}};',
      '} else if (query.includes("contexts(first:100")) {',
      '  result={data:{repository:{object:{oid:snapshot.headOid,statusCheckRollup:{contexts:page(snapshot.checks,"checks",value=>value.kind==="check-run"?{__typename:"CheckRun",name:value.name,status:value.status,conclusion:value.conclusion}:{__typename:"StatusContext",context:value.name,state:value.status})}}}}};',
      '} else { throw new Error("unexpected GraphQL operation"); }',
      'process.stdout.write(JSON.stringify(result));'
    ].join("\n"), "utf8");

    const cliArgs = args ?? [
      "--repo", payload.repository,
      "--pr", String(payload.number),
      ...(writeOutput ? ["--output", outputPath] : [])
    ];
    const result = spawnSync(process.execPath, [GITHUB_CLI, ...cliArgs], {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}${delimiter}${process.env.PATH ?? ""}`,
        FAKE_GH_MARKER: markerPath,
        FAKE_GH_MODE: mode,
        FAKE_GH_PAYLOAD: JSON.stringify(payload),
        FAKE_GH_STDERR: "gh auth failure: SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE"
      }
    });
    const captured = existsSync(markerPath)
      ? readFileSync(markerPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line))
      : null;
    return {
      ...result,
      ghArgs: captured,
      fileOutput: existsSync(outputPath) ? readFileSync(outputPath, "utf8") : null
    };
  });
}

function assertSanitizedFixture(value) {
  const forbiddenKeys = new Set([
    "body", "bodyText", "patch", "log", "logs", "content", "contents",
    "message", "commitMessage", "authorEmail", "detailsUrl", "url", "token", "secret"
  ]);
  function visit(entry) {
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (entry && typeof entry === "object") {
      for (const [key, nested] of Object.entries(entry)) {
        assert.equal(forbiddenKeys.has(key), false, `forbidden fixture key: ${key}`);
        visit(nested);
      }
    }
  }
  visit(value);
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /(?:gh[opsu]_|github_pat_|Bearer\s+|api[_-]?key|password)/i);
}

test("sanitized fixture contains only the collector allowlist", () => {
  const snapshot = fixture();
  assertSanitizedFixture(snapshot);
  assert.deepEqual(Object.keys(snapshot).sort(), [
    "baseRefName", "changedFiles", "checks", "commits", "files",
    "headOid", "headRefName", "isDraft", "number", "repository", "reviews", "state", "title"
  ]);
  assert.deepEqual(Object.keys(snapshot.files[0]).sort(), ["additions", "deletions", "path"]);
  assert.deepEqual(Object.keys(snapshot.commits[0]), ["oid"]);
  assert.deepEqual(Object.keys(snapshot.checks[0]).sort(), ["conclusion", "kind", "name", "status"]);
  assert.deepEqual(Object.keys(snapshot.reviews[0]).sort(), ["authorLogin", "commitOid", "state", "submittedAt"]);
});

test("collector uses exact minimized queries and completes every connection page", async () => {
  const input = fixture();
  input.reviews = [
    {
      authorLogin: "fixture-reviewer",
      state: "APPROVED",
      submittedAt: "2026-01-01T00:00:00Z",
      commitOid: input.headOid
    },
    {
      authorLogin: "fixture-reviewer",
      state: "CHANGES_REQUESTED",
      submittedAt: "2026-01-02T00:00:00Z",
      commitOid: input.headOid
    }
  ];
  const calls = [];
  const snapshot = await collectGitHubPullRequest({
    repository: input.repository,
    pullRequestNumber: input.number,
    runGh: createGraphqlRunGh(input, calls)
  });

  assert.equal(calls.length, 9);
  const parsed = calls.map(parseGraphqlArgs);
  assert.deepEqual([...new Set(parsed.map((call) => call.query))], ALL_QUERIES);
  assert.deepEqual(calls[0], [
    "api", "graphql", "-f", `query=${METADATA_QUERY}`,
    "-f", "name=proofrail-fixture", "-F", "number=17", "-f", "owner=example"
  ]);
  for (const [query, cursor] of [
    [FILES_QUERY, "files-2"],
    [COMMITS_QUERY, "commits-2"],
    [REVIEWS_QUERY, "reviews-2"],
    [CHECKS_QUERY, "checks-2"]
  ]) {
    const pages = parsed.filter((call) => call.query === query);
    assert.equal(pages.length, 2);
    assert.equal(pages[0].variables.cursor, undefined);
    assert.equal(pages[1].variables.cursor, cursor);
  }
  const checkCalls = parsed.filter((call) => call.query === CHECKS_QUERY);
  assert.ok(checkCalls.every((call) => call.variables.expression === input.headOid));

  for (const query of ALL_QUERIES) {
    assert.doesNotMatch(query, /\b(?:body|bodyText|message|email|detailsUrl|log|logs|patch)\b/);
  }
  assert.doesNotMatch(COMMITS_QUERY, /\bauthor\b/);
  assert.deepEqual(
    ALL_QUERIES.filter((query) => query.includes("author{")),
    [REVIEWS_QUERY]
  );
  assert.match(REVIEWS_QUERY, /author\{login\}/);

  assert.equal(snapshot.files.length, 2);
  assert.equal(snapshot.commits.length, 2);
  assert.equal(snapshot.reviews.length, 2);
  assert.deepEqual(snapshot.checks, [
    { kind: "check-run", name: "unit-tests", status: "COMPLETED", conclusion: "SUCCESS" },
    { kind: "status-context", name: "lint", status: "FAILURE", conclusion: null }
  ]);

  const packet = packetFor(snapshot);
  assert.ok(missingIds(packet).includes("github-reported-checks-successful"));
  assert.ok(missingIds(packet).includes("github-exact-head-approval-reported"));
  assert.ok(missingIds(packet).includes("independent-review-confirmed"));
  assert.ok(packet.reviewNeeds.includes("Review non-success reported check: lint (FAILURE)."));
  assert.ok(packet.reviewNeeds.includes("No approval was reported for the collected exact pull request head."));
});

test("checks are bound to the exact collected head and null rollup means no checks", async (t) => {
  await t.test("different check object head is rejected", async () => {
    const input = fixture();
    const base = createGraphqlRunGh(input);
    await assert.rejects(
      collectGitHubPullRequest({
        repository: input.repository,
        pullRequestNumber: input.number,
        runGh: async (args) => {
          const { query } = parseGraphqlArgs(args);
          const result = JSON.parse(await base(args));
          if (query === CHECKS_QUERY) {
            result.data.repository.object.oid = "1111111111111111111111111111111111111111";
          }
          return JSON.stringify(result);
        }
      }),
      /GitHub collection returned invalid checks/
    );
  });

  await t.test("missing status rollup normalizes to an empty check set", async () => {
    const input = fixture();
    const base = createGraphqlRunGh(input);
    const snapshot = await collectGitHubPullRequest({
      repository: input.repository,
      pullRequestNumber: input.number,
      runGh: async (args) => {
        const { query } = parseGraphqlArgs(args);
        const result = JSON.parse(await base(args));
        if (query === CHECKS_QUERY) {
          result.data.repository.object.statusCheckRollup = null;
        }
        return JSON.stringify(result);
      }
    });
    assert.deepEqual(snapshot.checks, []);
    const packet = packetFor(snapshot);
    assert.ok(missingIds(packet).includes("github-reported-checks-successful"));
    assert.ok(packet.reviewNeeds.includes("No checks were reported for the collected pull request head."));
  });
});

test("pagination rejects missing and repeated cursors", async (t) => {
  for (const [name, firstCursor, nextCursor] of [
    ["missing cursor", null, null],
    ["repeated cursor", "repeat-cursor", "repeat-cursor"]
  ]) {
    await t.test(name, async () => {
      const input = fixture();
      const base = createGraphqlRunGh(input);
      await assert.rejects(
        collectGitHubPullRequest({
          repository: input.repository,
          pullRequestNumber: input.number,
          runGh: async (args) => {
            const { query, variables } = parseGraphqlArgs(args);
            if (query !== FILES_QUERY) return base(args);
            return JSON.stringify({
              data: {
                repository: {
                  pullRequest: {
                    files: {
                      nodes: [],
                      pageInfo: {
                        hasNextPage: true,
                        endCursor: variables.cursor === undefined ? firstCursor : nextCursor
                      }
                    }
                  }
                }
              }
            });
          }
        }),
        /GitHub collection returned invalid changed files/
      );
    });
  }
});

test("pagination rejects missing and non-boolean hasNextPage values", async (t) => {
  for (const value of [undefined, null, "false", 0]) {
    await t.test(String(value), async () => {
      const input = fixture();
      const base = createGraphqlRunGh(input);
      await assert.rejects(
        collectGitHubPullRequest({
          repository: input.repository,
          pullRequestNumber: input.number,
          runGh: async (args) => {
            const { query } = parseGraphqlArgs(args);
            if (query !== FILES_QUERY) return base(args);
            return JSON.stringify({
              data: {
                repository: {
                  pullRequest: {
                    files: {
                      nodes: [],
                      pageInfo: {
                        hasNextPage: value,
                        endCursor: null
                      }
                    }
                  }
                }
              }
            });
          }
        }),
        /GitHub collection returned invalid changed files/
      );
    });
  }
});

test("GraphQL error envelopes are rejected without exposing service text", async () => {
  const canary = "SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE";
  await assert.rejects(
    collectGitHubPullRequest({
      repository: fixture().repository,
      pullRequestNumber: fixture().number,
      runGh: async () => JSON.stringify({ errors: [{ message: canary }] })
    }),
    (error) => {
      assert.equal(error.message, "GitHub collection returned invalid pull request metadata");
      assert.doesNotMatch(error.message, new RegExp(canary));
      return true;
    }
  );
});


test("repository and PR validation happens before gh and rejects shell-shaped input", async () => {
  let calls = 0;
  const runGh = async () => {
    calls += 1;
    return JSON.stringify(fixture());
  };
  await assert.rejects(
    collectGitHubPullRequest({ repository: "example/repo;touch-owned", pullRequestNumber: 17, runGh }),
    /repository must use owner\/name format/
  );
  await assert.rejects(
    collectGitHubPullRequest({ repository: "example/repo", pullRequestNumber: "0", runGh }),
    /pull request number must be a positive integer/
  );
  assert.equal(calls, 0);
});

test("mapper keeps the PR title as a Claim and scope explicit and conservative", () => {
  const snapshot = fixture();
  const input = mapGitHubPullRequestToEvidenceInput(snapshot);
  const packet = buildEvidencePacket(input);
  const claim = packet.claims.find((item) => item.id === "github-pr-title-claim");

  assert.equal(claim.text, snapshot.title);
  assert.equal(claim.source, "github-pr-title");
  assert.equal(packet.observedEvidence.some((item) => item.summary === snapshot.title), false);
  assert.deepEqual(input.scope.declaredWriteScope, []);
  assert.deepEqual(packet.scope.changedPaths, ["packages/evidence-gate/src/github.js", "README.md"]);
  assert.deepEqual(packet.scope.outsideDeclaredScope, packet.scope.changedPaths);
  assert.ok(packet.reviewNeeds.includes("No declared write scope was supplied; review every changed path."));
});

test("failed and missing checks remain missing evidence", () => {
  const failedPacket = packetFor(fixture());
  assert.ok(missingIds(failedPacket).includes("github-reported-checks-successful"));
  assert.ok(failedPacket.reviewNeeds.includes("Review non-success reported check: lint (FAILURE)."));

  const withoutChecks = fixture();
  withoutChecks.checks = [];
  const missingPacket = packetFor(withoutChecks);
  assert.ok(missingIds(missingPacket).includes("github-reported-checks-successful"));
  assert.ok(missingPacket.reviewNeeds.includes("No checks were reported for the collected pull request head."));
});

test("exact-head GitHub approval is reported but never self-certifies independent review", () => {
  const packet = packetFor(fixture());
  assert.ok(packet.observedEvidence.some((item) => item.id === "github-exact-head-approval-reported"));
  assert.equal(missingIds(packet).includes("github-exact-head-approval-reported"), false);
  assert.ok(missingIds(packet).includes("independent-review-confirmed"));
  assert.ok(packet.reviewNeeds.includes("Confirm reviewer independence and authority outside GitHub approval metadata."));
});

test("absence of an exact-head approval remains explicit", () => {
  const snapshot = fixture();
  snapshot.reviews = snapshot.reviews.map((review) => ({
    ...review,
    commitOid: review.commitOid === null ? null : "1111111111111111111111111111111111111111"
  }));
  const packet = packetFor(snapshot);
  assert.ok(missingIds(packet).includes("github-exact-head-approval-reported"));
  assert.ok(missingIds(packet).includes("independent-review-confirmed"));
  assert.ok(packet.reviewNeeds.includes("No approval was reported for the collected exact pull request head."));
});

test("reordered collector data produces byte-identical packet JSON", () => {
  const first = fixture();
  const reordered = fixture();
  reordered.files.reverse();
  reordered.commits.reverse();
  reordered.checks.reverse();
  reordered.reviews.reverse();
  assert.equal(canonicalJson(packetFor(first)), canonicalJson(packetFor(reordered)));
});

test("collector safely collapses missing gh, auth, and nonzero failures", async (t) => {
  for (const [name, raw] of [
    ["missing gh", "ENOENT: gh was not found"],
    ["unauthenticated gh", "authentication required: SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE"],
    ["nonzero gh", "exit 1: raw service failure"]
  ]) {
    await t.test(name, async () => {
      await assert.rejects(
        collectGitHubPullRequest({
          repository: fixture().repository,
          pullRequestNumber: fixture().number,
          runGh: async () => { throw new Error(raw); }
        }),
        (error) => {
          assert.equal(error.message, "GitHub collection failed while reading pull request metadata");
          assert.doesNotMatch(error.message, /SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE|authentication required|raw service failure/);
          return true;
        }
      );
    });
  }
});

test("malformed output and shape drift fail readably without disclosing values", async () => {
  await assert.rejects(
    collectGitHubPullRequest({
      repository: fixture().repository,
      pullRequestNumber: fixture().number,
      runGh: async () => "{not-json"
    }),
    /GitHub collection returned invalid pull request metadata/
  );

  await assert.rejects(
    collectGitHubPullRequest({
      repository: fixture().repository,
      pullRequestNumber: fixture().number,
      runGh: async () => JSON.stringify({
        data: {
          repository: {
            pullRequest: {
              title: "token=SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE"
            }
          }
        }
      })
    }),
    (error) => {
      assert.match(error.message, /pull request metadata head must be a commit identifier/);
      assert.doesNotMatch(error.message, /SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE/);
      return true;
    }
  );
});

test("secret-shaped projected text is redacted before packet output", async () => {
  const secret = "SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE";
  const projected = fixture();
  projected.title = `Claim token=${secret}`;
  const snapshot = await collectGitHubPullRequest({
    repository: projected.repository,
    pullRequestNumber: projected.number,
    runGh: createGraphqlRunGh(projected)
  });
  const serialized = canonicalJson(packetFor(snapshot));
  assert.doesNotMatch(serialized, new RegExp(secret));
  assert.match(serialized, /token=\[REDACTED\]/);
});

test("GitHub CLI argument parsing is strict", () => {
  assert.deepEqual(
    parseGitHubArguments(["--repo", "example/repo", "--pr", "17", "--output", "packet.json"]),
    { repository: "example/repo", pullRequestNumber: 17, output: "packet.json" }
  );
  assert.throws(() => parseGitHubArguments(["--pr", "17"]), /--repo <owner\/name> is required/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr", "0"]), /--pr must be a positive integer/);
  assert.throws(() => parseGitHubArguments(["--repo", "example\/repo;owned", "--pr", "17"]), /--repo must use owner\/name format/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr", "17", "--pr", "18"]), /--pr may be supplied only once/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr"]), /--pr requires a value/);
  assert.throws(() => parseGitHubArguments(["--wat"]), /expected --repo/);
});

test("GitHub CLI writes canonical packet JSON to stdout", () => {
  const result = runGitHubCliWithFakeGh();
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /[^\n]\n$/);
  assert.doesNotMatch(result.stdout, /\n\n$/);
  assert.equal(result.fileOutput, null);
  assert.equal(result.ghArgs.length, 9);
  assert.deepEqual(
    result.ghArgs[0].slice(0, 3),
    ["graphql", "-f", `query=${METADATA_QUERY}`]
  );
  const packet = JSON.parse(result.stdout);
  assert.equal(packet.pullRequest.id, "example/proofrail-fixture#17");
  assert.ok(missingIds(packet).includes("independent-review-confirmed"));
});

test("GitHub CLI output file is byte-identical to stdout mode", () => {
  const stdoutResult = runGitHubCliWithFakeGh();
  const fileResult = runGitHubCliWithFakeGh({ writeOutput: true });
  assert.equal(fileResult.status, 0);
  assert.equal(fileResult.stdout, "");
  assert.equal(fileResult.stderr, "");
  assert.equal(fileResult.fileOutput, stdoutResult.stdout);
});

test("GitHub CLI rejects invalid repo and PR before invoking gh", () => {
  const repoResult = runGitHubCliWithFakeGh({ args: ["--repo", "example/repo;owned", "--pr", "17"] });
  assert.notEqual(repoResult.status, 0);
  assert.match(repoResult.stderr, /evidence-gate-github: --repo must use owner\/name format/);
  assert.equal(repoResult.ghArgs, null);

  const prResult = runGitHubCliWithFakeGh({ args: ["--repo", "example/repo", "--pr", "-1"] });
  assert.notEqual(prResult.status, 0);
  assert.match(prResult.stderr, /evidence-gate-github: --pr must be a positive integer/);
  assert.equal(prResult.ghArgs, null);
});

test("GitHub CLI reports missing gh without raw platform details", () => {
  withTempDirectory((directory) => {
    const result = spawnSync(process.execPath, [
      GITHUB_CLI, "--repo", fixture().repository, "--pr", String(fixture().number)
    ], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, PATH: directory }
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "evidence-gate-github: GitHub collection failed while reading pull request metadata\n");
  });
});

test("GitHub CLI hides raw auth and nonzero stderr", () => {
  const result = runGitHubCliWithFakeGh({ mode: "failure" });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "evidence-gate-github: GitHub collection failed while reading pull request metadata\n");
  assert.doesNotMatch(result.stderr, /SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE/);
});

test("GitHub CLI reports malformed output and shape drift without raw input", () => {
  const malformed = runGitHubCliWithFakeGh({ mode: "malformed" });
  assert.notEqual(malformed.status, 0);
  assert.equal(malformed.stderr, "evidence-gate-github: GitHub collection returned invalid pull request metadata\n");

  const shape = runGitHubCliWithFakeGh({ mode: "shape" });
  assert.notEqual(shape.status, 0);
  assert.match(shape.stderr, /evidence-gate-github: pull request metadata head must be a commit identifier/);
  assert.doesNotMatch(shape.stderr, /SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE/);
});

test("v0.1 static-input CLI remains byte compatible across checkout line endings", () => {
  const result = spawnSync(process.execPath, [STATIC_CLI, "--input", STATIC_INPUT], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const expected = readFileSync(STATIC_EXPECTED, "utf8").replace(/\r\n/g, "\n");
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, expected);
});
