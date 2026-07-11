import assert from "node:assert/strict";
import {
  copyFileSync,
  chmodSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { delimiter } from "node:path";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildEvidencePacket, canonicalJson } from "../../packages/evidence-gate/src/index.js";
import * as githubModule from "../../packages/evidence-gate/src/github.js";
import { parseGitHubArguments } from "../../packages/evidence-gate/src/github-cli.mjs";
import { renderHumanReport } from "../../packages/evidence-gate/src/report.js";

const {
  collectGitHubPullRequest,
  mapGitHubPullRequestToEvidenceInput,
  normalizeGitHubSnapshot
} = githubModule;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GITHUB_CLI = path.join(ROOT, "packages/evidence-gate/src/github-cli.mjs");
const STATIC_CLI = path.join(ROOT, "packages/evidence-gate/src/cli.mjs");
const FIXTURE_PATH = path.join(ROOT, "examples/evidence-gate/github/sanitized-pr-snapshot.json");
const DECLARED_SCOPE_FIXTURE_PATH = path.join(ROOT, "examples/evidence-gate/github/declared-scope.json");
const STATIC_INPUT = path.join(ROOT, "examples/evidence-gate/input.json");
const STATIC_EXPECTED = path.join(ROOT, "examples/evidence-gate/expected-output.json");
const MAX_SCOPE_FILE_BYTES = 64 * 1024;
const MAX_GRAPHQL_INT = 2_147_483_647;
const METADATA_QUERY = `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){number title state isDraft changedFiles baseRefName headRefName headRefOid}}}`;
const FILES_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid files(first:100,after:$cursor){nodes{path additions deletions}pageInfo{hasNextPage endCursor}}}}}`;
const COMMITS_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid commits(first:100,after:$cursor){nodes{commit{oid}}pageInfo{hasNextPage endCursor}}}}}`;
const REVIEWS_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid reviews(first:100,after:$cursor){nodes{state submittedAt author{login}commit{oid}}pageInfo{hasNextPage endCursor}}}}}`;
const CHECKS_QUERY = `query($owner:String!,$name:String!,$expression:String!,$cursor:String){repository(owner:$owner,name:$name){object(expression:$expression){... on Commit{oid statusCheckRollup{contexts(first:100,after:$cursor){nodes{__typename ... on CheckRun{name status conclusion}... on StatusContext{context state}}pageInfo{hasNextPage endCursor}}}}}}}`;
const ALL_QUERIES = [METADATA_QUERY, FILES_QUERY, COMMITS_QUERY, REVIEWS_QUERY, CHECKS_QUERY];

function fixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
}

function declaredScopeFixture() {
  return JSON.parse(readFileSync(DECLARED_SCOPE_FIXTURE_PATH, "utf8"));
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

function paddedDeclaredScope(size) {
  const source = Buffer.from(JSON.stringify({
    declaredWriteScope: ["packages/evidence-gate/**"]
  }));
  assert.ok(source.length <= size);
  return Buffer.concat([source, Buffer.alloc(size - source.length, 0x20)]);
}

function createFileSymlinkOrSkip(t, target, link) {
  try {
    symlinkSync(target, link, "file");
    return true;
  } catch (error) {
    if (error && ["EACCES", "EPERM", "ENOSYS", "EOPNOTSUPP"].includes(error.code)) {
      t.skip("symbolic-link creation denied by OS: " + error.code);
      return false;
    }
    throw error;
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
    return { data: { repository: { pullRequest: { headRefOid: snapshot.headOid, files: connectionPage(
      snapshot.files,
      variables.cursor,
      "files",
      (file) => file
    ) } } } };
  }
  if (query === COMMITS_QUERY) {
    return { data: { repository: { pullRequest: { headRefOid: snapshot.headOid, commits: connectionPage(
      snapshot.commits,
      variables.cursor,
      "commits",
      (commit) => ({ commit })
    ) } } } };
  }
  if (query === REVIEWS_QUERY) {
    return { data: { repository: { pullRequest: { headRefOid: snapshot.headOid, reviews: connectionPage(
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

function connectionFromEnvelope(result, query) {
  if (query === FILES_QUERY) return result.data.repository.pullRequest.files;
  if (query === COMMITS_QUERY) return result.data.repository.pullRequest.commits;
  if (query === REVIEWS_QUERY) return result.data.repository.pullRequest.reviews;
  if (query === CHECKS_QUERY) return result.data.repository.object.statusCheckRollup.contexts;
  throw new Error("unexpected connection query");
}

function indexedConnectionNode(query, index, snapshot) {
  const suffix = String(index + 1).padStart(5, "0");
  if (query === FILES_QUERY) {
    return { path: `bounded/path-${suffix}.js`, additions: index, deletions: 0 };
  }
  if (query === COMMITS_QUERY) {
    return { commit: { oid: (index + 1).toString(16).padStart(40, "0") } };
  }
  if (query === REVIEWS_QUERY) {
    return {
      state: "APPROVED",
      submittedAt: "2026-01-01T00:00:00Z",
      author: { login: `reviewer-${suffix}` },
      commit: { oid: snapshot.headOid }
    };
  }
  if (query === CHECKS_QUERY) {
    return {
      __typename: "CheckRun",
      name: `check-${suffix}`,
      status: "COMPLETED",
      conclusion: "SUCCESS"
    };
  }
  throw new Error("unexpected connection query");
}

function connectionEnvelope(query, snapshot, nodes, pageInfo) {
  if (query === FILES_QUERY) {
    return { data: { repository: { pullRequest: {
      headRefOid: snapshot.headOid,
      files: { nodes, pageInfo }
    } } } };
  }
  if (query === COMMITS_QUERY) {
    return { data: { repository: { pullRequest: {
      headRefOid: snapshot.headOid,
      commits: { nodes, pageInfo }
    } } } };
  }
  if (query === REVIEWS_QUERY) {
    return { data: { repository: { pullRequest: {
      headRefOid: snapshot.headOid,
      reviews: { nodes, pageInfo }
    } } } };
  }
  if (query === CHECKS_QUERY) {
    return { data: { repository: { object: {
      oid: snapshot.headOid,
      statusCheckRollup: { contexts: { nodes, pageInfo } }
    } } } };
  }
  throw new Error("unexpected connection query");
}

function createGraphqlRunGh(snapshot, calls = []) {
  return async (args) => {
    calls.push(args);
    const { query, variables } = parseGraphqlArgs(args);
    return JSON.stringify(graphqlEnvelope(query, variables, snapshot));
  };
}

function runGitHubCliWithFakeGh({
  args,
  mode = "success",
  payload = fixture(),
  writeOutput = false,
  format,
  scopeFile,
  preparePaths
} = {}) {
  return withTempDirectory((directory) => {
    const ghName = process.platform === "win32" ? "gh.exe" : "gh";
    const ghPath = path.join(directory, ghName);
    const markerPath = path.join(directory, "argv.jsonl");
    const outputPath = path.join(directory, "packet.json");
    const scopeFilePath = path.join(directory, "declared-scope.json");
    copyFileSync(process.execPath, ghPath);
    if (process.platform !== "win32") chmodSync(ghPath, 0o755);
    if (scopeFile !== undefined) {
      writeFileSync(
        scopeFilePath,
        Buffer.isBuffer(scopeFile)
          ? scopeFile
          : typeof scopeFile === "string" ? scopeFile : JSON.stringify(scopeFile)
      );
    }
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
      '  result={data:{repository:{pullRequest:{headRefOid:snapshot.headOid,files:page(snapshot.files,"files",value=>value)}}}};',
      '} else if (query.includes("commits(first:100")) {',
      '  result={data:{repository:{pullRequest:{headRefOid:snapshot.headOid,commits:page(snapshot.commits,"commits",value=>({commit:value}))}}}};',
      '} else if (query.includes("reviews(first:100")) {',
      '  result={data:{repository:{pullRequest:{headRefOid:snapshot.headOid,reviews:page(snapshot.reviews,"reviews",value=>({state:value.state,submittedAt:value.submittedAt,author:value.authorLogin===null?null:{login:value.authorLogin},commit:value.commitOid===null?null:{oid:value.commitOid}}))}}}};',
      '} else if (query.includes("contexts(first:100")) {',
      '  result={data:{repository:{object:{oid:snapshot.headOid,statusCheckRollup:{contexts:page(snapshot.checks,"checks",value=>value.kind==="check-run"?{__typename:"CheckRun",name:value.name,status:value.status,conclusion:value.conclusion}:{__typename:"StatusContext",context:value.name,state:value.status})}}}}};',
      '} else { throw new Error("unexpected GraphQL operation"); }',
      'process.stdout.write(JSON.stringify(result));'
    ].join("\n"), "utf8");

    const prepared = preparePaths?.({ directory, outputPath, scopeFilePath }) ?? {};
    if (prepared.skip === true) return { skipped: true };
    const effectiveOutputPath = prepared.outputPath ?? outputPath;
    const effectiveScopeFilePath = prepared.scopeFilePath ?? scopeFilePath;
    const tracked = prepared.tracked ?? [];
    const trackedBefore = tracked.map((file) => readFileSync(file));
    const cliArgs = args ?? [
      "--repo", payload.repository,
      "--pr", String(payload.number),
      ...(format ? ["--format", format] : []),
      ...(scopeFile !== undefined ? ["--scope-file", effectiveScopeFilePath] : []),
      ...(writeOutput ? ["--output", effectiveOutputPath] : [])
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
      fileOutput: existsSync(effectiveOutputPath)
        ? readFileSync(effectiveOutputPath, "utf8")
        : null,
      trackedBefore,
      trackedAfter: tracked.map((file) => readFileSync(file))
    };
  });
}

function assertScopeAliasRejected(t, preparePaths) {
  const result = runGitHubCliWithFakeGh({
    scopeFile: declaredScopeFixture(),
    writeOutput: true,
    preparePaths: (paths) => preparePaths(t, paths)
  });
  if (result.skipped === true) return;
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.ghArgs, null);
  assert.equal(
    result.stderr,
    "evidence-gate-github: declared scope and output files must be different\n"
  );
  assert.deepEqual(result.trackedAfter, result.trackedBefore);
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

test("GitHub module public exports remain the four established functions", () => {
  assert.deepEqual(Object.keys(githubModule).sort(), [
    "collectGitHubPullRequest",
    "mapGitHubPullRequestToEvidenceInput",
    "normalizeDeclaredWriteScope",
    "normalizeGitHubSnapshot"
  ]);
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

test("collector enforces the GitHub GraphQL Int pull-request range before gh", async (t) => {
  await t.test("maximum and short zero-padded GraphQL Int values are accepted", async () => {
    const input = fixture();
    input.number = MAX_GRAPHQL_INT;
    const calls = [];
    const snapshot = await collectGitHubPullRequest({
      repository: input.repository,
      pullRequestNumber: MAX_GRAPHQL_INT,
      runGh: createGraphqlRunGh(input, calls)
    });
    assert.equal(snapshot.number, MAX_GRAPHQL_INT);
    assert.equal(parseGraphqlArgs(calls[0]).variables.number, MAX_GRAPHQL_INT);

    const zeroPaddedInput = fixture();
    zeroPaddedInput.number = 1;
    const zeroPaddedCalls = [];
    const zeroPaddedSnapshot = await collectGitHubPullRequest({
      repository: zeroPaddedInput.repository,
      pullRequestNumber: "0000000001",
      runGh: createGraphqlRunGh(zeroPaddedInput, zeroPaddedCalls)
    });
    assert.equal(zeroPaddedSnapshot.number, 1);
    assert.equal(parseGraphqlArgs(zeroPaddedCalls[0]).variables.number, 1);
  });

  for (const [name, value] of [
    ["rejects numeric maximum plus one", MAX_GRAPHQL_INT + 1],
    ["rejects decimal maximum plus one", String(MAX_GRAPHQL_INT + 1)],
    ["rejects huge decimal", "9".repeat(1_000)],
    ["rejects overlong zero-padded decimal", `${"0".repeat(1_000)}1`]
  ]) {
    await t.test(name, async () => {
      let calls = 0;
      await assert.rejects(
        collectGitHubPullRequest({
          repository: fixture().repository,
          pullRequestNumber: value,
          runGh: async () => {
            calls += 1;
            return "{}";
          }
        }),
        /pull request number must be a positive integer/
      );
      assert.equal(calls, 0);
    });
  }
});

test("collector validates metadata identity and changed-file bounds before pagination", async (t) => {
  await t.test("pull-request number must match the request", async () => {
    const input = fixture();
    const calls = [];
    const base = createGraphqlRunGh(input, calls);
    await assert.rejects(
      collectGitHubPullRequest({
        repository: input.repository,
        pullRequestNumber: input.number,
        runGh: async (args) => {
          const result = JSON.parse(await base(args));
          result.data.repository.pullRequest.number = input.number + 1;
          return JSON.stringify(result);
        }
      }),
      (error) => {
        assert.equal(error.message, "GitHub collection returned invalid pull request metadata");
        assert.doesNotMatch(error.message, new RegExp(String(input.number + 1)));
        return true;
      }
    );
    assert.equal(calls.length, 1);
  });

  for (const [name, value, message] of [
    ["negative", -1, "GitHub collection returned invalid changed files"],
    ["fractional", 1.5, "GitHub collection returned invalid changed files"],
    ["non-integer type", "2", "GitHub collection returned invalid changed files"],
    ["above node limit", 10_001, "GitHub collection exceeded the changed files node limit"]
  ]) {
    await t.test(name, async () => {
      const input = fixture();
      input.changedFiles = value;
      const calls = [];
      await assert.rejects(
        collectGitHubPullRequest({
          repository: input.repository,
          pullRequestNumber: input.number,
          runGh: createGraphqlRunGh(input, calls)
        }),
        (error) => {
          assert.equal(error.message, message);
          assert.doesNotMatch(error.message, /10001|SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE/);
          return true;
        }
      );
      assert.equal(calls.length, 1);
      assert.equal(parseGraphqlArgs(calls[0]).query, METADATA_QUERY);
    });
  }
});

test("pending reviews without submitted timestamps remain explicit metadata", async () => {
  const input = fixture();
  input.reviews = [{
    authorLogin: "pending-reviewer",
    state: "PENDING",
    submittedAt: null,
    commitOid: null
  }, {
    authorLogin: "pending-reviewer",
    state: "APPROVED",
    submittedAt: "2026-01-03T00:00:00Z",
    commitOid: input.headOid
  }];
  const snapshot = await collectGitHubPullRequest({
    repository: input.repository,
    pullRequestNumber: input.number,
    runGh: createGraphqlRunGh(input)
  });
  assert.equal(snapshot.reviews[0].submittedAt, null);
  const packet = packetFor(snapshot);
  assert.ok(packet.observedEvidence.some((item) => /not submitted/.test(item.summary)));
});

test("every files, commits, and reviews page remains bound to the collected head", async (t) => {
  for (const [queryUnderTest, stage] of [
    [FILES_QUERY, "changed files"],
    [COMMITS_QUERY, "commits"],
    [REVIEWS_QUERY, "reviews"]
  ]) {
    for (const changedPage of [1, 2]) {
      await t.test(`${stage} page ${changedPage}`, async () => {
        const input = fixture();
        const base = createGraphqlRunGh(input);
        let page = 0;
        await assert.rejects(
          collectGitHubPullRequest({
            repository: input.repository,
            pullRequestNumber: input.number,
            runGh: async (args) => {
              const { query } = parseGraphqlArgs(args);
              const result = JSON.parse(await base(args));
              if (query === queryUnderTest) {
                page += 1;
                if (page === changedPage) {
                  result.data.repository.pullRequest.headRefOid =
                    "1111111111111111111111111111111111111111";
                }
              }
              return JSON.stringify(result);
            }
          }),
          new RegExp(`GitHub collection returned invalid ${stage}`)
        );
      });
    }
  }
});

test("null and non-object connection nodes fail closed", async (t) => {
  function selectedConnection(result, query) {
    if (query === FILES_QUERY) return result.data.repository.pullRequest.files;
    if (query === COMMITS_QUERY) return result.data.repository.pullRequest.commits;
    if (query === REVIEWS_QUERY) return result.data.repository.pullRequest.reviews;
    if (query === CHECKS_QUERY) return result.data.repository.object.statusCheckRollup.contexts;
    throw new Error("unexpected connection query");
  }

  for (const [queryUnderTest, stage] of [
    [FILES_QUERY, "changed files"],
    [COMMITS_QUERY, "commits"],
    [REVIEWS_QUERY, "reviews"],
    [CHECKS_QUERY, "checks"]
  ]) {
    for (const badNode of [null, 42]) {
      await t.test(`${stage} ${badNode === null ? "null" : "scalar"}`, async () => {
        const input = fixture();
        const base = createGraphqlRunGh(input);
        await assert.rejects(
          collectGitHubPullRequest({
            repository: input.repository,
            pullRequestNumber: input.number,
            runGh: async (args) => {
              const { query } = parseGraphqlArgs(args);
              const result = JSON.parse(await base(args));
              if (query === queryUnderTest) {
                selectedConnection(result, query).nodes = [badNode];
              }
              return JSON.stringify(result);
            }
          }),
          new RegExp(`GitHub collection returned invalid ${stage}`)
        );
      });
    }
  }
});

test("connection pages accept 100 nodes and reject 101 nodes", async (t) => {
  for (const [queryUnderTest, stage, snapshotField] of [
    [FILES_QUERY, "changed files", "files"],
    [COMMITS_QUERY, "commits", "commits"],
    [REVIEWS_QUERY, "reviews", "reviews"],
    [CHECKS_QUERY, "checks", "checks"]
  ]) {
    for (const nodeCount of [100, 101]) {
      await t.test(`${stage} ${nodeCount}`, async () => {
        const input = fixture();
        if (queryUnderTest === FILES_QUERY) input.changedFiles = nodeCount;
        const base = createGraphqlRunGh(input);
        const operation = collectGitHubPullRequest({
          repository: input.repository,
          pullRequestNumber: input.number,
          runGh: async (args) => {
            const { query } = parseGraphqlArgs(args);
            if (query !== queryUnderTest) return base(args);
            const nodes = Array.from(
              { length: nodeCount },
              (_unused, index) => indexedConnectionNode(query, index, input)
            );
            return JSON.stringify(connectionEnvelope(query, input, nodes, {
              hasNextPage: false,
              endCursor: null
            }));
          }
        });

        if (nodeCount === 100) {
          const snapshot = await operation;
          assert.equal(snapshot[snapshotField].length, 100);
        } else {
          await assert.rejects(
            operation,
            (error) => {
              assert.equal(error.message, `GitHub collection returned invalid ${stage}`);
              return true;
            }
          );
        }
      });
    }
  }
});

test("all four connections allow 100 terminal pages of 100 nodes within 401 calls", async () => {
  const input = fixture();
  input.changedFiles = 10_000;
  const calls = [];
  const pageCounts = new Map();
  const prefixes = new Map([
    [FILES_QUERY, "files"],
    [COMMITS_QUERY, "commits"],
    [REVIEWS_QUERY, "reviews"],
    [CHECKS_QUERY, "checks"]
  ]);

  const snapshot = await collectGitHubPullRequest({
    repository: input.repository,
    pullRequestNumber: input.number,
    runGh: async (args) => {
      calls.push(args);
      const { query, variables } = parseGraphqlArgs(args);
      if (query === METADATA_QUERY) {
        return JSON.stringify(graphqlEnvelope(query, variables, input));
      }
      const page = pageCounts.get(query) ?? 0;
      const prefix = prefixes.get(query);
      assert.ok(prefix);
      assert.equal(variables.cursor, page === 0 ? undefined : `${prefix}-${page}`);
      pageCounts.set(query, page + 1);
      const nodes = Array.from(
        { length: 100 },
        (_unused, index) => indexedConnectionNode(query, page * 100 + index, input)
      );
      return JSON.stringify(connectionEnvelope(query, input, nodes, {
        hasNextPage: page < 99,
        endCursor: page < 99 ? `${prefix}-${page + 1}` : null
      }));
    }
  });

  assert.equal(calls.length, 401);
  assert.equal(calls.filter((args) => parseGraphqlArgs(args).query === METADATA_QUERY).length, 1);
  for (const query of [FILES_QUERY, COMMITS_QUERY, REVIEWS_QUERY, CHECKS_QUERY]) {
    assert.equal(calls.filter((args) => parseGraphqlArgs(args).query === query).length, 100);
  }
  assert.equal(snapshot.files.length, 10_000);
  assert.equal(snapshot.commits.length, 10_000);
  assert.equal(snapshot.reviews.length, 10_000);
  assert.equal(snapshot.checks.length, 10_000);
});

test("continuation after the 100th page fails without a 101st connection call", async () => {
  const input = fixture();
  input.changedFiles = 10_000;
  const calls = [];
  let filePage = 0;

  await assert.rejects(
    collectGitHubPullRequest({
      repository: input.repository,
      pullRequestNumber: input.number,
      runGh: async (args) => {
        calls.push(args);
        const { query, variables } = parseGraphqlArgs(args);
        if (query === METADATA_QUERY) {
          return JSON.stringify(graphqlEnvelope(query, variables, input));
        }
        assert.equal(query, FILES_QUERY);
        assert.equal(variables.cursor, filePage === 0 ? undefined : `files-overflow-${filePage}`);
        const nodes = Array.from(
          { length: 100 },
          (_unused, index) => indexedConnectionNode(query, filePage * 100 + index, input)
        );
        filePage += 1;
        return JSON.stringify(connectionEnvelope(query, input, nodes, {
          hasNextPage: true,
          endCursor: `files-overflow-${filePage}`
        }));
      }
    }),
    (error) => {
      assert.equal(error.message, "GitHub collection exceeded the changed files pagination limit");
      return true;
    }
  );

  assert.equal(filePage, 100);
  assert.equal(calls.length, 101);
  assert.equal(calls.filter((args) => parseGraphqlArgs(args).query === FILES_QUERY).length, 100);
  assert.equal(calls.some((args) => parseGraphqlArgs(args).query === COMMITS_QUERY), false);
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
    ["missing cursor", undefined, undefined],
    ["null cursor", null, null],
    ["empty cursor", "", ""],
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
                    headRefOid: input.headOid,
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

test("pagination rejects a non-adjacent cursor cycle", async () => {
  const input = fixture();
  input.changedFiles = 0;
  const returnedCursors = ["cursor-a", "cursor-b", "cursor-a"];
  const expectedInputs = [undefined, "cursor-a", "cursor-b"];
  const calls = [];
  let filePage = 0;

  await assert.rejects(
    collectGitHubPullRequest({
      repository: input.repository,
      pullRequestNumber: input.number,
      runGh: async (args) => {
        calls.push(args);
        const { query, variables } = parseGraphqlArgs(args);
        if (query === METADATA_QUERY) {
          return JSON.stringify(graphqlEnvelope(query, variables, input));
        }
        assert.equal(query, FILES_QUERY);
        assert.equal(variables.cursor, expectedInputs[filePage]);
        const endCursor = returnedCursors[filePage];
        filePage += 1;
        return JSON.stringify(connectionEnvelope(query, input, [], {
          hasNextPage: true,
          endCursor
        }));
      }
    }),
    (error) => {
      assert.equal(error.message, "GitHub collection returned invalid changed files");
      return true;
    }
  );

  assert.equal(filePage, 3);
  assert.equal(calls.length, 4);
});

test("cursor histories are independent across connections", async () => {
  const input = fixture();
  const prefixes = new Map([
    [FILES_QUERY, "files"],
    [COMMITS_QUERY, "commits"],
    [REVIEWS_QUERY, "reviews"],
    [CHECKS_QUERY, "checks"]
  ]);
  const base = createGraphqlRunGh(input);

  const snapshot = await collectGitHubPullRequest({
    repository: input.repository,
    pullRequestNumber: input.number,
    runGh: async (args) => {
      const { query, variables } = parseGraphqlArgs(args);
      const prefix = prefixes.get(query);
      if (!prefix) return base(args);
      const adjusted = variables.cursor === "shared-cursor"
        ? { ...variables, cursor: `${prefix}-2` }
        : variables;
      const result = graphqlEnvelope(query, adjusted, input);
      const connection = connectionFromEnvelope(result, query);
      if (connection.pageInfo.hasNextPage) {
        connection.pageInfo.endCursor = "shared-cursor";
      }
      return JSON.stringify(result);
    }
  });

  assert.equal(snapshot.files.length, input.files.length);
  assert.equal(snapshot.commits.length, input.commits.length);
  assert.equal(snapshot.reviews.length, input.reviews.length);
  assert.equal(snapshot.checks.length, input.checks.length);
});

test("terminal connection pages preserve existing endCursor tolerance", async () => {
  const input = fixture();
  const base = createGraphqlRunGh(input);
  const snapshot = await collectGitHubPullRequest({
    repository: input.repository,
    pullRequestNumber: input.number,
    runGh: async (args) => {
      const { query } = parseGraphqlArgs(args);
      if (query !== FILES_QUERY) return base(args);
      return JSON.stringify(connectionEnvelope(query, input, input.files, {
        hasNextPage: false,
        endCursor: { legacy: "ignored-on-terminal-page" }
      }));
    }
  });
  assert.equal(snapshot.files.length, input.files.length);
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
                    headRefOid: input.headOid,
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

test("changed-file collection fails closed when metadata count is not collected", async () => {
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
                headRefOid: input.headOid,
                files: {
                  nodes: input.files.slice(0, 1),
                  pageInfo: {
                    hasNextPage: false,
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

test("empty GraphQL errors arrays preserve successful collection", async () => {
  const input = fixture();
  const expected = await collectGitHubPullRequest({
    repository: input.repository,
    pullRequestNumber: input.number,
    runGh: createGraphqlRunGh(input)
  });
  const base = createGraphqlRunGh(input);
  const actual = await collectGitHubPullRequest({
    repository: input.repository,
    pullRequestNumber: input.number,
    runGh: async (args) => {
      const result = JSON.parse(await base(args));
      result.errors = [];
      return JSON.stringify(result);
    }
  });
  assert.deepEqual(actual, expected);
});

test("malformed GraphQL errors members fail at the active stage without disclosure", async (t) => {
  const canary = "SYNTHETIC_GRAPHQL_ERROR_CANARY_DO_NOT_DISCLOSE";
  const invalidValues = [
    ["null", null],
    ["object", { message: canary }],
    ["string", canary],
    ["number", 1],
    ["boolean", true],
    ["nonempty array", [{ message: canary }]]
  ];
  const stages = [
    [METADATA_QUERY, "pull request metadata"],
    [FILES_QUERY, "changed files"],
    [COMMITS_QUERY, "commits"],
    [REVIEWS_QUERY, "reviews"],
    [CHECKS_QUERY, "checks"]
  ];

  for (let stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
    const [queryUnderTest, stage] = stages[stageIndex];
    for (const [variant, errors] of invalidValues) {
      await t.test(`${stage} ${variant}`, async () => {
        const input = fixture();
        input.files = input.files.slice(0, 1);
        input.changedFiles = input.files.length;
        input.commits = input.commits.slice(0, 1);
        input.reviews = input.reviews.slice(0, 1);
        input.checks = input.checks.slice(0, 1);
        const base = createGraphqlRunGh(input);
        const calls = [];

        await assert.rejects(
          collectGitHubPullRequest({
            repository: input.repository,
            pullRequestNumber: input.number,
            runGh: async (args) => {
              calls.push(args);
              const { query } = parseGraphqlArgs(args);
              if (query === queryUnderTest) return JSON.stringify({ errors });
              return base(args);
            }
          }),
          (error) => {
            assert.equal(error.message, `GitHub collection returned invalid ${stage}`);
            assert.doesNotMatch(error.message, new RegExp(canary));
            return true;
          }
        );

        assert.equal(calls.length, stageIndex + 1);
        assert.equal(parseGraphqlArgs(calls.at(-1)).query, queryUnderTest);
      });
    }
  }
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

test("changed-file paths must remain unique after existing normalization", async (t) => {
  const fileNode = (filePath) => ({ path: filePath, additions: 1, deletions: 0 });
  const truncationPrefix = "x".repeat(4_093);
  const duplicateCases = [
    ["same page", [[fileNode("SYNTHETIC_DUPLICATE_PATH_CANARY"), fileNode("SYNTHETIC_DUPLICATE_PATH_CANARY")]]],
    ["cross page", [[fileNode("SYNTHETIC_CROSS_PAGE_PATH_CANARY")], [fileNode("SYNTHETIC_CROSS_PAGE_PATH_CANARY")]]],
    ["control replacement collision", [[fileNode("src/a\u0000b.js"), fileNode("src/a b.js")]]],
    ["truncation collision across pages", [
      [fileNode(`${truncationPrefix}AAAA`)],
      [fileNode(`${truncationPrefix}BBBB`)]
    ]]
  ];

  async function collectFilePages(pages) {
    const input = fixture();
    input.changedFiles = pages.reduce((count, page) => count + page.length, 0);
    const base = createGraphqlRunGh(input);
    let page = 0;
    return collectGitHubPullRequest({
      repository: input.repository,
      pullRequestNumber: input.number,
      runGh: async (args) => {
        const { query, variables } = parseGraphqlArgs(args);
        if (query !== FILES_QUERY) return base(args);
        assert.equal(variables.cursor, page === 0 ? undefined : `file-page-${page}`);
        const nodes = pages[page];
        const hasNextPage = page < pages.length - 1;
        page += 1;
        return JSON.stringify(connectionEnvelope(query, input, nodes, {
          hasNextPage,
          endCursor: hasNextPage ? `file-page-${page}` : null
        }));
      }
    });
  }

  for (const [name, pages] of duplicateCases) {
    await t.test(name, async () => {
      await assert.rejects(
        collectFilePages(pages),
        (error) => {
          assert.equal(error.message, "snapshot.files must use unique paths");
          assert.doesNotMatch(error.message, /SYNTHETIC_|src\/a|AAAA|BBBB/);
          return true;
        }
      );
    });
  }

  await t.test("case-distinct Git paths remain valid", async () => {
    const snapshot = await collectFilePages([[fileNode("src/A.js"), fileNode("src/a.js")]]);
    assert.deepEqual(new Set(snapshot.files.map((file) => file.path)), new Set([
      "src/A.js",
      "src/a.js"
    ]));
  });
});

test("commit identifiers must be unique after lowercase normalization", async () => {
  const input = fixture();
  const oid = "abcdef0123456789abcdef0123456789abcdef01";
  input.commits = [{ oid }, { oid: oid.toUpperCase() }];
  await assert.rejects(
    collectGitHubPullRequest({
      repository: input.repository,
      pullRequestNumber: input.number,
      runGh: createGraphqlRunGh(input)
    }),
    (error) => {
      assert.equal(error.message, "snapshot.commits must use unique commit identifiers");
      assert.doesNotMatch(error.message, new RegExp(oid, "i"));
      return true;
    }
  );
});

test("reviews and checks retain duplicate metadata without invented identities", async () => {
  const input = fixture();
  input.reviews = [input.reviews[0], input.reviews[0]];
  input.checks = [input.checks[0], input.checks[0]];
  const snapshot = await collectGitHubPullRequest({
    repository: input.repository,
    pullRequestNumber: input.number,
    runGh: createGraphqlRunGh(input)
  });
  assert.equal(snapshot.reviews.length, 2);
  assert.deepEqual(snapshot.reviews[0], snapshot.reviews[1]);
  assert.equal(snapshot.checks.length, 2);
  assert.deepEqual(snapshot.checks[0], snapshot.checks[1]);
});

test("GitHub snapshot normalization uses deterministic ordering with baseline ASCII compatibility", () => {
  const snapshot = fixture();
  const paths = ["b.js", "A.js", "a.js", "é.js", "e\u0301.js", "!.js"];
  snapshot.changedFiles = paths.length;
  snapshot.files = paths.map((filePath) => ({
    path: filePath,
    additions: 1,
    deletions: 0
  })).reverse();

  const normalized = normalizeGitHubSnapshot(snapshot);

  assert.deepEqual(normalized.files.map((file) => file.path), [
    "!.js",
    "a.js",
    "A.js",
    "b.js",
    "e\u0301.js",
    "é.js"
  ]);
});

test("GitHub snapshot normalization matches baseline printable ASCII pairs and representative paths", () => {
  const printableAsciiOrder = [
    " ", "_", "-", ",", ";", ":", "!", "?", ".", "'", "\"",
    "(", ")", "[", "]", "{", "}", "@", "*", "/", "\\", "&",
    "#", "%", "`", "^", "+", "<", "=", ">", "|", "~", "$",
    ..."0123456789",
    ...[..."abcdefghijklmnopqrstuvwxyz"].flatMap((letter) => [letter, letter.toUpperCase()])
  ];
  const pathForCharacter = (character) => `prefix${character}suffix`;
  const normalizePaths = (paths) => {
    const snapshot = fixture();
    snapshot.changedFiles = paths.length;
    snapshot.files = [...paths].reverse().map((path) => ({
      path,
      additions: 1,
      deletions: 0
    }));
    return normalizeGitHubSnapshot(snapshot).files.map((file) => file.path);
  };

  assert.equal(printableAsciiOrder.length, 95);
  assert.equal(new Set(printableAsciiOrder).size, 95);
  for (let leftIndex = 0; leftIndex < printableAsciiOrder.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < printableAsciiOrder.length; rightIndex += 1) {
      const expected = [
        pathForCharacter(printableAsciiOrder[leftIndex]),
        pathForCharacter(printableAsciiOrder[rightIndex])
      ];
      assert.deepEqual(normalizePaths(expected), expected);
    }
  }

  const representativePaths = [
    "a", "A", "a_", "A_", "a-", "A-", "a.js", "A.js", "a0",
    "A0", "aa", "aA", "Aa", "AA", "docs/x", "README.md", "z", "Z"
  ];
  assert.deepEqual(normalizePaths(representativePaths), representativePaths);
});

test("GraphQL Int validation does not narrow the established snapshot normalizer", () => {
  const snapshot = fixture();
  snapshot.number = MAX_GRAPHQL_INT + 1;
  assert.equal(normalizeGitHubSnapshot(snapshot).number, MAX_GRAPHQL_INT + 1);
  assert.equal(
    mapGitHubPullRequestToEvidenceInput(snapshot).pullRequest.id,
    `${snapshot.repository}#${MAX_GRAPHQL_INT + 1}`
  );
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

  {
    const input = fixture();
    const base = createGraphqlRunGh(input);
    await assert.rejects(
      collectGitHubPullRequest({
        repository: input.repository,
        pullRequestNumber: input.number,
        runGh: async (args) => {
          const { query } = parseGraphqlArgs(args);
          const result = JSON.parse(await base(args));
          if (query === METADATA_QUERY) {
            result.data.repository.pullRequest.isDraft = "false";
          }
          return JSON.stringify(result);
        }
      }),
      /snapshot\.isDraft must be a boolean/
    );
  }
});

test("secret-shaped projected text is redacted before packet output", async () => {
  const secret = "SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE";
  const refreshToken = `ghr_${"A".repeat(30)}`;
  const projected = fixture();
  projected.title = `Claim token=${secret} refresh=${refreshToken}`;
  const snapshot = await collectGitHubPullRequest({
    repository: projected.repository,
    pullRequestNumber: projected.number,
    runGh: createGraphqlRunGh(projected)
  });
  const serialized = canonicalJson(packetFor(snapshot));
  assert.doesNotMatch(serialized, new RegExp(secret));
  assert.doesNotMatch(serialized, new RegExp(refreshToken));
  assert.match(serialized, /token=\[REDACTED\]/);
});

test("prefixed assignments and embedded GitHub tokens are redacted", () => {
  const assignmentSecret = "SYNTHETIC_ASSIGNMENT_SECRET_CANARY_DO_NOT_DISCLOSE";
  const tokens = [
    "ghp_" + "A".repeat(30),
    "gho_" + "B".repeat(30),
    "ghu_" + "C".repeat(30),
    "ghs_" + "D".repeat(30),
    "ghr_" + "E".repeat(30),
    "github_pat_" + "F".repeat(30)
  ];
  const snapshot = fixture();
  snapshot.title = [
    "CI_GITHUB_TOKEN=" + assignmentSecret,
    "OPENAI_API_KEY:" + assignmentSecret,
    ...tokens.map((token) => "prefix_" + token)
  ].join(" ");

  const normalized = normalizeGitHubSnapshot(snapshot);
  const serialized = JSON.stringify(normalized);

  assert.doesNotMatch(serialized, new RegExp(assignmentSecret));
  for (const token of tokens) {
    assert.doesNotMatch(serialized, new RegExp(token));
  }
  assert.match(normalized.title, /CI_GITHUB_TOKEN=\[REDACTED\]/);
  assert.match(normalized.title, /OPENAI_API_KEY:\[REDACTED\]/);
});

test("non-secret assignment and token lookalikes remain unchanged", () => {
  const title = [
    "CI_GITHUB_TOKENIZED=value",
    "OPENAI_API_KEYS:value",
    "prefix_ghp_short",
    "tokenization=visible"
  ].join(" ");
  const snapshot = fixture();
  snapshot.title = title;

  assert.equal(normalizeGitHubSnapshot(snapshot).title, title);
});

test("GitHub CLI argument parsing is strict", () => {
  assert.deepEqual(
    parseGitHubArguments(["--repo", "example/repo", "--pr", "17", "--output", "packet.json"]),
    {
      repository: "example/repo",
      pullRequestNumber: 17,
      output: "packet.json",
      format: "json",
      scopeFile: undefined
    }
  );
  assert.equal(
    parseGitHubArguments(["--repo", "example/repo", "--pr", "17", "--format", "human"]).format,
    "human"
  );
  assert.equal(
    parseGitHubArguments([
      "--repo", "example/repo", "--pr", String(MAX_GRAPHQL_INT)
    ]).pullRequestNumber,
    MAX_GRAPHQL_INT
  );
  assert.equal(
    parseGitHubArguments([
      "--repo", "example/repo", "--pr", "17", "--scope-file", "declared-scope.json"
    ]).scopeFile,
    "declared-scope.json"
  );
  assert.throws(() => parseGitHubArguments(["--pr", "17"]), /--repo <owner\/name> is required/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr", "0"]), /--pr must be a positive integer/);
  assert.throws(() => parseGitHubArguments([
    "--repo", "example/repo", "--pr", String(MAX_GRAPHQL_INT + 1)
  ]), /--pr must be a positive integer/);
  assert.throws(() => parseGitHubArguments([
    "--repo", "example/repo", "--pr", "9".repeat(1_000)
  ]), /--pr must be a positive integer/);
  assert.throws(() => parseGitHubArguments(["--repo", "example\/repo;owned", "--pr", "17"]), /--repo must use owner\/name format/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr", "17", "--pr", "18"]), /--pr may be supplied only once/);
  assert.throws(() => parseGitHubArguments([
    "--repo", "example/repo", "--pr", "17",
    "--scope-file", "one.json", "--scope-file", "two.json"
  ]), /--scope-file may be supplied only once/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr"]), /--pr requires a value/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr", "17", "--scope-file"]), /--scope-file requires a value/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr", "17", "--format", "yaml"]), /--format must be json or human/);
  assert.throws(() => parseGitHubArguments(["--repo", "example/repo", "--pr", "17", "--format", "json", "--format", "human"]), /--format may be supplied only once/);
  assert.throws(() => parseGitHubArguments(["--wat"]), /expected --repo/);
});

test("declared scope fixture is a bounded local scope object", () => {
  assert.deepEqual(declaredScopeFixture(), {
    declaredWriteScope: ["packages/evidence-gate/**"]
  });
});

test("GitHub CLI maps a declared scope only to deterministic packet scope", () => {
  const scope = declaredScopeFixture();
  const unscopedPacket = packetFor(fixture());
  const scopedPacket = buildEvidencePacket(
    mapGitHubPullRequestToEvidenceInput(fixture(), scope.declaredWriteScope)
  );

  assert.deepEqual(scopedPacket.scope, {
    declaredWriteScope: ["packages/evidence-gate/**"],
    changedPaths: ["packages/evidence-gate/src/github.js", "README.md"],
    outsideDeclaredScope: ["README.md"]
  });
  assert.ok(scopedPacket.reviewNeeds.includes("Review path outside declared scope: README.md"));
  assert.equal(
    scopedPacket.reviewNeeds.includes("No declared write scope was supplied; review every changed path."),
    false
  );
  assert.deepEqual(scopedPacket.claims, unscopedPacket.claims);
  assert.deepEqual(scopedPacket.missingEvidence, unscopedPacket.missingEvidence);
  assert.deepEqual(scopedPacket.boundaries, unscopedPacket.boundaries);
});

test("GitHub CLI keeps omitted scope output byte-compatible", () => {
  const json = runGitHubCliWithFakeGh();
  const human = runGitHubCliWithFakeGh({ format: "human" });
  const expectedPacket = packetFor(fixture());

  assert.equal(json.status, 0);
  assert.equal(json.stdout, `${canonicalJson(expectedPacket)}\n`);
  assert.equal(human.status, 0);
  assert.equal(human.stdout, renderHumanReport(expectedPacket));
});

test("GitHub CLI accepts the declared scope fixture in JSON and human stdout and files", () => {
  const scope = declaredScopeFixture();
  const jsonStdout = runGitHubCliWithFakeGh({ scopeFile: scope });
  const jsonFile = runGitHubCliWithFakeGh({ scopeFile: scope, writeOutput: true });
  const humanStdout = runGitHubCliWithFakeGh({ scopeFile: scope, format: "human" });
  const humanFile = runGitHubCliWithFakeGh({ scopeFile: scope, format: "human", writeOutput: true });

  assert.equal(jsonStdout.status, 0);
  assert.equal(jsonStdout.stderr, "");
  assert.equal(jsonStdout.ghArgs.length, 9);
  const packet = JSON.parse(jsonStdout.stdout);
  assert.deepEqual(packet.scope, {
    declaredWriteScope: ["packages/evidence-gate/**"],
    changedPaths: ["packages/evidence-gate/src/github.js", "README.md"],
    outsideDeclaredScope: ["README.md"]
  });
  assert.ok(packet.reviewNeeds.includes("Review path outside declared scope: README.md"));

  assert.equal(jsonFile.status, 0);
  assert.equal(jsonFile.stdout, "");
  assert.equal(jsonFile.fileOutput, jsonStdout.stdout);

  assert.equal(humanStdout.status, 0);
  assert.equal(humanStdout.stderr, "");
  assert.match(humanStdout.stdout, /^Proofrail AI PR Evidence Report\n/);
  assert.match(humanStdout.stdout, /- Declared write scope: packages\/evidence-gate\/\*\*/);
  assert.match(humanStdout.stdout, /- Outside declared scope: README\.md/);

  assert.equal(humanFile.status, 0);
  assert.equal(humanFile.stdout, "");
  assert.equal(humanFile.fileOutput, humanStdout.stdout);
});

test("GitHub CLI canonicalizes declared scope pattern order", () => {
  const first = runGitHubCliWithFakeGh({
    scopeFile: { declaredWriteScope: ["README.md", "packages/evidence-gate/**"] }
  });
  const reordered = runGitHubCliWithFakeGh({
    scopeFile: { declaredWriteScope: ["packages/evidence-gate/**", "README.md"] }
  });

  assert.equal(first.status, 0);
  assert.equal(reordered.status, 0);
  assert.equal(first.stdout, reordered.stdout);
});

test("GitHub CLI rejects declared scope input before invoking gh without disclosure", async (t) => {
  const secret = "SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE";
  const cases = [
    [
      "malformed JSON",
      { scopeFile: `{"declaredWriteScope":["${secret}"` },
      "declared scope file contains malformed JSON"
    ],
    [
      "unknown key",
      { scopeFile: { declaredWriteScope: ["README.md"], unexpected: secret } },
      "declared scope file must contain only declaredWriteScope"
    ],
    [
      "duplicate scope file",
      {
        args: [
          "--repo", "example/proofrail-fixture", "--pr", "17",
          "--scope-file", "first.json", "--scope-file", "second.json"
        ]
      },
      "--scope-file may be supplied only once"
    ],
    [
      "unsafe pattern",
      { scopeFile: { declaredWriteScope: [`../${secret}`] } },
      "declared scope file declaredWriteScope must be an array of safe path patterns"
    ],
    [
      "non-string pattern",
      { scopeFile: { declaredWriteScope: ["README.md", 17] } },
      "declared scope file declaredWriteScope must be an array of safe path patterns"
    ],
    [
      "empty pattern",
      { scopeFile: { declaredWriteScope: [""] } },
      "declared scope file declaredWriteScope must be an array of safe path patterns"
    ],
    [
      "empty scope array",
      { scopeFile: { declaredWriteScope: [] } },
      "declared scope file declaredWriteScope must be an array of safe path patterns"
    ],
    [
      "unreadable file",
      {
        args: [
          "--repo", "example/proofrail-fixture", "--pr", "17",
          "--scope-file", `missing-${secret}.json`
        ]
      },
      "could not read the declared scope file"
    ]
  ];

  for (const [name, options, message] of cases) {
    await t.test(name, () => {
      const result = runGitHubCliWithFakeGh(options);
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.ghArgs, null);
      assert.equal(result.stderr, `evidence-gate-github: ${message}\n`);
      assert.doesNotMatch(result.stderr, new RegExp(secret));
    });
  }
});

test("GitHub CLI enforces bounded regular-file fatal UTF-8 declared scope", async (t) => {
  await t.test("accepts exactly 64 KiB of valid JSON bytes", () => {
    const result = runGitHubCliWithFakeGh({
      scopeFile: paddedDeclaredScope(MAX_SCOPE_FILE_BYTES)
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.ghArgs.length, 9);
  });

  await t.test("rejects one byte over 64 KiB before gh", () => {
    const result = runGitHubCliWithFakeGh({
      scopeFile: paddedDeclaredScope(MAX_SCOPE_FILE_BYTES + 1)
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.ghArgs, null);
    assert.equal(
      result.stderr,
      "evidence-gate-github: declared scope file exceeds 64 KiB\n"
    );
  });

  await t.test("rejects a directory before gh", () => {
    const result = runGitHubCliWithFakeGh({
      scopeFile: declaredScopeFixture(),
      preparePaths: ({ directory }) => ({ scopeFilePath: directory })
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.ghArgs, null);
    assert.equal(
      result.stderr,
      "evidence-gate-github: declared scope file must be a regular file\n"
    );
  });

  await t.test("rejects malformed UTF-8 before gh", () => {
    const result = runGitHubCliWithFakeGh({
      scopeFile: Buffer.from([0x7b, 0x22, 0xc3, 0x28, 0x22, 0x7d])
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.ghArgs, null);
    assert.equal(
      result.stderr,
      "evidence-gate-github: declared scope file is not valid UTF-8\n"
    );
  });

  await t.test("preserves a UTF-8 BOM for existing malformed-JSON behavior", () => {
    const result = runGitHubCliWithFakeGh({
      scopeFile: Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]),
        Buffer.from(JSON.stringify(declaredScopeFixture()))
      ])
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.ghArgs, null);
    assert.equal(
      result.stderr,
      "evidence-gate-github: declared scope file contains malformed JSON\n"
    );
  });
});

test("GitHub CLI preserves scope failure categories with an existing distinct output", () => {
  const originalOutput = Buffer.from("PRESERVE_EXISTING_OUTPUT");
  function runCase(scopeFile, selectScopePath) {
    return runGitHubCliWithFakeGh({
      scopeFile,
      writeOutput: true,
      preparePaths: (paths) => {
        writeFileSync(paths.outputPath, originalOutput);
        return {
          scopeFilePath: selectScopePath?.(paths) ?? paths.scopeFilePath,
          tracked: [paths.outputPath]
        };
      }
    });
  }

  const cases = [
    [
      runCase(declaredScopeFixture(), ({ directory }) => path.join(directory, "missing.json")),
      "could not read the declared scope file"
    ],
    [
      runCase(declaredScopeFixture(), ({ directory }) => directory),
      "declared scope file must be a regular file"
    ],
    [
      runCase(paddedDeclaredScope(MAX_SCOPE_FILE_BYTES + 1)),
      "declared scope file exceeds 64 KiB"
    ],
    [
      runCase(Buffer.from([0xc3, 0x28])),
      "declared scope file is not valid UTF-8"
    ]
  ];

  for (const [result, message] of cases) {
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(result.ghArgs, null);
    assert.equal(result.stderr, "evidence-gate-github: " + message + "\n");
    assert.deepEqual(result.trackedAfter, result.trackedBefore);
  }
});

test("GitHub CLI rejects stable declared-scope/output aliases before gh without mutation", async (t) => {
  await t.test("same spelling", (subtest) => {
    assertScopeAliasRejected(subtest, (_current, { scopeFilePath }) => ({
      outputPath: scopeFilePath,
      tracked: [scopeFilePath]
    }));
  });

  await t.test("dot spelling", (subtest) => {
    assertScopeAliasRejected(subtest, (_current, { directory, scopeFilePath }) => ({
      outputPath: directory + path.sep + "." + path.sep + "declared-scope.json",
      tracked: [scopeFilePath]
    }));
  });

  await t.test("relative and absolute spelling", (subtest) => {
    assertScopeAliasRejected(subtest, (_current, { scopeFilePath }) => ({
      scopeFilePath: "declared-scope.json",
      outputPath: scopeFilePath,
      tracked: [scopeFilePath]
    }));
  });

  await t.test("parent spelling", (subtest) => {
    assertScopeAliasRejected(subtest, (_current, { directory, scopeFilePath }) => {
      const child = path.join(directory, "child");
      mkdirSync(child);
      return {
        outputPath: child + path.sep + ".." + path.sep + "declared-scope.json",
        tracked: [scopeFilePath]
      };
    });
  });

  await t.test("hardlink", (subtest) => {
    assertScopeAliasRejected(subtest, (_current, { outputPath, scopeFilePath }) => {
      linkSync(scopeFilePath, outputPath);
      return { tracked: [scopeFilePath, outputPath] };
    });
  });

  await t.test("output symbolic link targets declared scope", (subtest) => {
    assertScopeAliasRejected(subtest, (current, { outputPath, scopeFilePath }) => {
      if (!createFileSymlinkOrSkip(current, scopeFilePath, outputPath)) {
        return { skip: true };
      }
      return { tracked: [scopeFilePath, outputPath] };
    });
  });

  await t.test("declared-scope symbolic link targets output", (subtest) => {
    assertScopeAliasRejected(subtest, (current, { outputPath, scopeFilePath }) => {
      writeFileSync(outputPath, readFileSync(scopeFilePath));
      rmSync(scopeFilePath);
      if (!createFileSymlinkOrSkip(current, outputPath, scopeFilePath)) {
        return { skip: true };
      }
      return { tracked: [scopeFilePath, outputPath] };
    });
  });

  if (process.platform === "win32") {
    await t.test("case-resolved spelling", (subtest) => {
      assertScopeAliasRejected(subtest, (_current, { scopeFilePath }) => ({
        outputPath: scopeFilePath.toUpperCase(),
        tracked: [scopeFilePath]
      }));
    });
  }
});

test("GitHub CLI accepts a bounded regular-file scope symlink with distinct output", (t) => {
  const result = runGitHubCliWithFakeGh({
    scopeFile: declaredScopeFixture(),
    writeOutput: true,
    preparePaths: ({ directory, scopeFilePath }) => {
      const target = path.join(directory, "scope-target.json");
      writeFileSync(target, readFileSync(scopeFilePath));
      rmSync(scopeFilePath);
      if (!createFileSymlinkOrSkip(t, target, scopeFilePath)) {
        return { skip: true };
      }
      return { tracked: [target] };
    }
  });
  if (result.skipped === true) return;
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, "");
  assert.equal(result.ghArgs.length, 9);
  assert.deepEqual(result.trackedAfter, result.trackedBefore);
  assert.ok(result.fileOutput.endsWith("\n"));
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

test("GitHub CLI human format uses the same collection and supports file output", () => {
  const stdoutResult = runGitHubCliWithFakeGh({ format: "human" });
  assert.equal(stdoutResult.status, 0);
  assert.equal(stdoutResult.stderr, "");
  assert.match(stdoutResult.stdout, /^Proofrail AI PR Evidence Report\n/);
  assert.equal(stdoutResult.ghArgs.length, 9);

  const fileResult = runGitHubCliWithFakeGh({ format: "human", writeOutput: true });
  assert.equal(fileResult.status, 0);
  assert.equal(fileResult.stdout, "");
  assert.equal(fileResult.fileOutput, stdoutResult.stdout);
});

test("GitHub CLI accepts the maximum GraphQL Int pull-request number", () => {
  const payload = fixture();
  payload.number = MAX_GRAPHQL_INT;
  const result = runGitHubCliWithFakeGh({ payload });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.ok(result.ghArgs[0].includes(`number=${MAX_GRAPHQL_INT}`));
  assert.equal(JSON.parse(result.stdout).pullRequest.id, `${payload.repository}#${MAX_GRAPHQL_INT}`);
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

  for (const value of [String(MAX_GRAPHQL_INT + 1), "9".repeat(1_000)]) {
    const boundedPrResult = runGitHubCliWithFakeGh({
      args: ["--repo", "example/repo", "--pr", value]
    });
    assert.notEqual(boundedPrResult.status, 0);
    assert.equal(
      boundedPrResult.stderr,
      "evidence-gate-github: --pr must be a positive integer\n"
    );
    assert.equal(boundedPrResult.ghArgs, null);
  }

  const formatResult = runGitHubCliWithFakeGh({
    args: ["--repo", "example/repo", "--pr", "17", "--format", "yaml"]
  });
  assert.notEqual(formatResult.status, 0);
  assert.match(formatResult.stderr, /evidence-gate-github: --format must be json or human/);
  assert.equal(formatResult.ghArgs, null);
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
