import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CURRENT_VERSION = "0.2.0-rc.1";
const CURRENT_DESCRIPTION = "Deterministic evidence gating for AI-authored pull requests.";
const PACKAGE_MANIFESTS = [
  "packages/contracts/package.json",
  "packages/evidence-gate/package.json",
  "packages/kernel/package.json",
  "packages/release-orchestrator/package.json",
  "packages/static-evaluator/package.json",
  "packages/trusted-config/package.json",
];

function readText(repoPath) {
  return fs.readFileSync(path.join(ROOT, ...repoPath.split("/")), "utf8");
}

function readJson(repoPath) {
  return JSON.parse(readText(repoPath));
}

test("current package metadata uses one private Phase 2 pre-release version", () => {
  const rootManifest = readJson("package.json");
  assert.equal(rootManifest.version, CURRENT_VERSION);
  assert.equal(rootManifest.description, CURRENT_DESCRIPTION);
  assert.equal(rootManifest.private, true);
  assert.equal(rootManifest.engines?.node, ">=24 <25");

  for (const manifestPath of PACKAGE_MANIFESTS) {
    const manifest = readJson(manifestPath);
    assert.equal(manifest.version, CURRENT_VERSION, `${manifestPath} version drifted`);
    assert.equal(manifest.private, true, `${manifestPath} must remain private`);
  }
});

test("current-facing documents describe Phase 2 instead of stale Phase 0 state", () => {
  const documents = new Map([
    ["AGENTS.md", readText("AGENTS.md")],
    ["README.md", readText("README.md")],
    ["SECURITY.md", readText("SECURITY.md")],
    ["CONTRIBUTING.md", readText("CONTRIBUTING.md")],
  ]);

  for (const [repoPath, content] of documents) {
    assert.match(content, /\bPhase 2\b/, `${repoPath} must identify the current phase`);
  }

  assert.doesNotMatch(
    documents.get("SECURITY.md"),
    /Phase 0 does not implement runtime repository inspection/,
  );
  assert.doesNotMatch(
    documents.get("CONTRIBUTING.md"),
    /Proofrail is currently in Phase 0|Phase 0 contributions may/,
  );
});

test("contributor review guidance matches the evidence-based self-review model", () => {
  const contributing = readText("CONTRIBUTING.md");
  assert.match(contributing, /default repository engineering review is evidence-based self-review/i);
  assert.match(contributing, /fresh second pass/i);
  assert.match(contributing, /weakened tests, validation bypasses, and hidden scope expansion/i);
  assert.doesNotMatch(
    contributing,
    /Independent review is required for foundation acceptance decisions/,
  );
});

test("README makes receipt-free ADMISSIBLE limits visible", () => {
  const readme = readText("README.md");
  assert.match(readme, /"verdict": "ADMISSIBLE"/);
  assert.match(readme, /"verificationReceipts": \[\]/);
  assert.match(readme, /Zero Verification Receipts/);
  assert.match(readme, /does not by itself mean the code was independently executed/);
});

test("CI uses Node 24 actions and receives automated action updates", () => {
  const workflow = readText(".github/workflows/foundation-governance.yml");
  assert.match(workflow, /uses: actions\/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7\.0\.0/);
  assert.match(workflow, /uses: actions\/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6\.4\.0/);
  assert.match(workflow, /node-version: 24/);
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node)@v4/);

  const dependabot = readText(".github/dependabot.yml");
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.match(dependabot, /interval: weekly/);
});

test("every known debt records release-readiness metadata", () => {
  const debt = readText("docs/plans/debt.md");
  const sections = debt.split(/^### /m).slice(1);
  assert.equal(sections.length, 5);

  const publicReleaseBlockers = [];
  for (const section of sections) {
    const id = section.match(/^(DEBT-\d{3}):/)?.[1];
    assert.ok(id, "debt section must start with a stable ID");
    assert.match(section, /^Status: (?:OPEN|PLANNED|IN_PROGRESS|MITIGATED|CLOSED|ACCEPTED_RISK)\.$/m);
    assert.match(section, /^Severity: (?:Low|Medium|High|Critical)\.$/m);
    assert.match(section, /^Product impact: .+$/m);
    assert.match(
      section,
      /^Release classification: `(BLOCKS_PUBLIC_RELEASE|BLOCKS_TRUSTED_RELEASE|DOES_NOT_BLOCK_RELEASE|RESEARCH_ONLY)`/m,
    );
    assert.match(section, /^Owner: .+$/m);
    assert.match(section, /^Target milestone: .+$/m);
    assert.match(section, /^Dependencies: .+$/m);
    assert.match(section, /^Exit criteria:$/m);
    assert.match(section, /^Verification: .+$/m);

    if (/^Release classification: `BLOCKS_PUBLIC_RELEASE`/m.test(section)) {
      publicReleaseBlockers.push(id);
    }
  }

  assert.deepEqual(publicReleaseBlockers, ["DEBT-001", "DEBT-004"]);
});
