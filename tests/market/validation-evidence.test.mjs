import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../../", import.meta.url);
const EVIDENCE_ROOT = new URL(
  "../../fixtures/market-prototype/validation-evidence/product-market-001/",
  import.meta.url,
);

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

test("retained market validation evidence resolves exact repository commits", async () => {
  const [fullVerification, validationSummary, cleanup, visualQa, validationDocument] =
    await Promise.all([
      readJson("full-verification.json"),
      readJson("validation-summary.json"),
      readJson("cleanup-receipt.json"),
      readJson("browser-visual-qa.json"),
      readFile(new URL("../../docs/engineering/validation-evidence.md", import.meta.url), "utf8"),
    ]);

  const sourceCandidateSha = fullVerification.sourceCandidateSha;
  assert.equal(validationSummary.sourceCandidateSha, sourceCandidateSha);
  assert.equal(cleanup.sourceCandidateSha, sourceCandidateSha);
  assertRetainedCommit(sourceCandidateSha, "sourceCandidateSha");
  assert.match(validationDocument, new RegExp(`source candidate is \`${sourceCandidateSha}\``));

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
});
