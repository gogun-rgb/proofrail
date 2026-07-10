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
const GH_FIELDS = "author,baseRefName,changedFiles,commits,files,headRefName,headRefOid,isDraft,number,reviews,state,statusCheckRollup,title";

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

function runGitHubCliWithFakeGh({ args, mode = "success", payload = fixture(), writeOutput = false } = {}) {
  return withTempDirectory((directory) => {
    const ghName = process.platform === "win32" ? "gh.exe" : "gh";
    const ghPath = path.join(directory, ghName);
    const markerPath = path.join(directory, "argv.json");
    const outputPath = path.join(directory, "packet.json");
    copyFileSync(process.execPath, ghPath);
    if (process.platform !== "win32") chmodSync(ghPath, 0o755);
    writeFileSync(path.join(directory, "pr"), [
      'const fs = require("node:fs");',
      'fs.writeFileSync(process.env.FAKE_GH_MARKER, JSON.stringify(process.argv.slice(2)));',
      'if (process.env.FAKE_GH_MODE === "failure") {',
      '  process.stderr.write(process.env.FAKE_GH_STDERR);',
      '  process.exitCode = 1;',
      '} else {',
      '  process.stdout.write(process.env.FAKE_GH_PAYLOAD);',
      '}'
    ].join("\n"), "utf8");

    const identity = typeof payload === "string" ? fixture() : payload;
    const cliArgs = args ?? [
      "--repo", identity.repository,
      "--pr", String(identity.number),
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
        FAKE_GH_PAYLOAD: typeof payload === "string" ? payload : JSON.stringify(payload),
        FAKE_GH_STDERR: "gh auth failure: SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE"
      }
    });
    return {
      ...result,
      ghArgs: existsSync(markerPath) ? JSON.parse(readFileSync(markerPath, "utf8")) : null,
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
    "authorLogin", "baseRefName", "changedFiles", "checks", "commits", "files",
    "headOid", "headRefName", "isDraft", "number", "repository", "reviews", "state", "title"
  ]);
  assert.deepEqual(Object.keys(snapshot.files[0]).sort(), ["additions", "deletions", "path"]);
  assert.deepEqual(Object.keys(snapshot.commits[0]), ["oid"]);
  assert.deepEqual(Object.keys(snapshot.checks[0]).sort(), ["conclusion", "kind", "name", "status"]);
  assert.deepEqual(Object.keys(snapshot.reviews[0]).sort(), ["authorLogin", "commitOid", "state", "submittedAt"]);
});

test("collector uses one exact argv vector and a nested allowlisted projection", async () => {
  let receivedArgs;
  const expected = fixture();
  const snapshot = await collectGitHubPullRequest({
    repository: expected.repository,
    pullRequestNumber: expected.number,
    runGh: async (args) => {
      receivedArgs = args;
      return JSON.stringify(expected);
    }
  });

  assert.deepEqual(receivedArgs.slice(0, 7), [
    "pr", "view", "17", "--repo", "example/proofrail-fixture", "--json", GH_FIELDS
  ]);
  assert.equal(receivedArgs[7], "--jq");
  assert.equal(receivedArgs.length, 9);
  assert.match(receivedArgs[8], /files:\[\(\.files \/\/ \[\]\)\[\]\|select\(\. != null\)/);
  assert.match(receivedArgs[8], /checks:\[\(\.statusCheckRollup \/\/ \[\]\)\[\]\|select\(\. != null\)/);
  assert.match(receivedArgs[8], /kind:"check-run"/);
  assert.match(receivedArgs[8], /kind:"status-context"/);
  assert.match(receivedArgs[8], /conclusion:null/);
  assert.doesNotMatch(receivedArgs[8], /\b(?:body|bodyText|patch|message|detailsUrl|authorEmail)\b/);
  assert.deepEqual(snapshot, normalizeGitHubSnapshot(expected));
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

test("CheckRun, StatusContext, and nullable union fields normalize without overclaim", async () => {
  let projection;
  const snapshot = await collectGitHubPullRequest({
    repository: fixture().repository,
    pullRequestNumber: fixture().number,
    runGh: async (args) => {
      projection = args[8];
      return JSON.stringify(fixture());
    }
  });
  assert.match(projection, /select\(\. != null\)/);
  assert.deepEqual(snapshot.checks, [
    { kind: "check-run", name: "unit-tests", status: "COMPLETED", conclusion: "SUCCESS" },
    { kind: "status-context", name: "lint", status: "FAILURE", conclusion: null }
  ]);
  assert.ok(snapshot.reviews.some((review) => review.authorLogin === "(unknown-reviewer)" && review.commitOid === null));
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
          assert.equal(error.message, "could not read pull request metadata with the local gh CLI");
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
    /local gh returned malformed pull request metadata/
  );

  const drifted = fixture();
  drifted.title = "token=SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE";
  delete drifted.files;
  await assert.rejects(
    collectGitHubPullRequest({
      repository: fixture().repository,
      pullRequestNumber: fixture().number,
      runGh: async () => JSON.stringify(drifted)
    }),
    (error) => {
      assert.match(error.message, /snapshot\.files must be an array/);
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
    runGh: async () => JSON.stringify(projected)
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
  assert.deepEqual(result.ghArgs.slice(0, 5), ["view", "17", "--repo", "example/proofrail-fixture", "--json"]);
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
    assert.equal(result.stderr, "evidence-gate-github: could not read pull request metadata with the local gh CLI\n");
  });
});

test("GitHub CLI hides raw auth and nonzero stderr", () => {
  const result = runGitHubCliWithFakeGh({ mode: "failure" });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "evidence-gate-github: could not read pull request metadata with the local gh CLI\n");
  assert.doesNotMatch(result.stderr, /SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE/);
});

test("GitHub CLI reports malformed output and shape drift without raw input", () => {
  const malformed = runGitHubCliWithFakeGh({ payload: "{not-json" });
  assert.notEqual(malformed.status, 0);
  assert.equal(malformed.stderr, "evidence-gate-github: local gh returned malformed pull request metadata\n");

  const drifted = fixture();
  drifted.title = "secret=SYNTHETIC_SECRET_CANARY_DO_NOT_DISCLOSE";
  delete drifted.reviews;
  const shape = runGitHubCliWithFakeGh({ payload: drifted });
  assert.notEqual(shape.status, 0);
  assert.match(shape.stderr, /evidence-gate-github: snapshot\.reviews must be an array/);
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
