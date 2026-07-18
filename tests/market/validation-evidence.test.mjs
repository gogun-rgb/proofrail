import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../../", import.meta.url);
const EVIDENCE_REPOSITORY_PATH =
  "fixtures/market-prototype/validation-evidence/product-market-001";
const EVIDENCE_ROOT = new URL(
  `../../${EVIDENCE_REPOSITORY_PATH}/`,
  import.meta.url,
);
const VALIDATION_TAIL_PATHS = new Set([
  "docs/engineering/validation-evidence.md",
  `${EVIDENCE_REPOSITORY_PATH}/cleanup-receipt.json`,
  `${EVIDENCE_REPOSITORY_PATH}/full-verification.json`,
  `${EVIDENCE_REPOSITORY_PATH}/validation-summary.json`,
  "tests/market/validation-evidence.test.mjs",
]);

async function readJson(name) {
  return JSON.parse(await readFile(new URL(name, EVIDENCE_ROOT), "utf8"));
}

function assertRetainedCommit(sha, label) {
  assert.match(sha, /^[0-9a-f]{40}$/, `${label} must be a lowercase full commit SHA`);
  execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: ROOT });
  const ancestry = spawnSync("git", ["merge-base", "--is-ancestor", sha, "HEAD"], {
    cwd: ROOT,
    stdio: "ignore",
  });
  assert.equal(ancestry.status, 0, `${label} must be an ancestor of HEAD`);
}

function retainedBlobSha256(repositoryPath) {
  const bytes = execFileSync("git", ["show", `HEAD:${repositoryPath}`], { cwd: ROOT });
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

test("retained market validation evidence resolves exact repository commits", async () => {
  const [
    fullVerification,
    validationSummary,
    cleanup,
    visualQa,
    liveRun,
    validationDocument,
  ] = await Promise.all([
    readJson("full-verification.json"),
    readJson("validation-summary.json"),
    readJson("cleanup-receipt.json"),
    readJson("browser-visual-qa.json"),
    readJson("live-run-29560665469/run-metadata.json"),
    readFile(new URL("../../docs/engineering/validation-evidence.md", import.meta.url), "utf8"),
  ]);

  const sourceCandidateSha = fullVerification.sourceCandidateSha;
  assert.equal(validationSummary.sourceCandidateSha, sourceCandidateSha);
  assert.equal(cleanup.sourceCandidateSha, sourceCandidateSha);
  assertRetainedCommit(sourceCandidateSha, "sourceCandidateSha");
  assert.match(validationDocument, new RegExp(`source candidate is \`${sourceCandidateSha}\``));
  const tailPaths = execFileSync(
    "git",
    ["diff", "--name-only", `${sourceCandidateSha}..HEAD`],
    { cwd: ROOT, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  assert.deepEqual(
    tailPaths.filter((repositoryPath) => !VALIDATION_TAIL_PATHS.has(repositoryPath)),
    [],
    "post-candidate changes must be limited to retained validation evidence and its integrity test",
  );

  assertRetainedCommit(visualQa.sourceCandidateSha, "visual sourceCandidateSha");
  assertRetainedCommit(
    visualQa.siteContentUnchangedThroughSha,
    "siteContentUnchangedThroughSha",
  );
  const siteDiff = spawnSync(
    "git",
    [
      "diff",
      "--quiet",
      `${visualQa.sourceCandidateSha}..${visualQa.siteContentUnchangedThroughSha}`,
      "--",
      "site",
    ],
    { cwd: ROOT, stdio: "ignore" },
  );
  assert.equal(
    siteDiff.status,
    0,
    "site must remain unchanged through the SHA claimed by visual evidence",
  );

  for (const [name, digest] of Object.entries(liveRun.artifactDigests)) {
    assert.equal(
      retainedBlobSha256(
        `${EVIDENCE_REPOSITORY_PATH}/live-run-29560665469/${name}`,
      ),
      digest,
      `live artifact ${name} must match its retained Git-blob digest`,
    );
  }
  for (const screenshot of visualQa.screenshots) {
    assert.equal(
      retainedBlobSha256(`${EVIDENCE_REPOSITORY_PATH}/${screenshot.path}`),
      `sha256:${screenshot.sha256}`,
      `visual artifact ${screenshot.path} must match its retained Git-blob digest`,
    );
  }
});
