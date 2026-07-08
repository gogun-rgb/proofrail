import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { BOOTSTRAP_UNKNOWN_REASON_CODE, renderJson, sortFindings } from "../../scripts/governance/lib/findings.mjs";
import { stableStringify } from "../../scripts/governance/lib/json-utils.mjs";
import { canonicalTerminologyProjection, writeExpectedProjections } from "../../scripts/governance/lib/projections.mjs";
import { validateFoundation } from "../../scripts/governance/lib/validator.mjs";

const CANONICAL_TERMS = [
  "Claim",
  "Observation",
  "Evidence",
  "Evidence Requirement",
  "Evidence Contract",
  "Verification Receipt",
  "Policy",
  "Rule",
  "Verdict",
  "Evidence Bundle",
  "Evidence Lineage",
  "Adapter Capability",
  "Inference Proposal",
];

const CANONICAL_VERDICTS = ["ADMISSIBLE", "REVISION_REQUIRED", "REJECTED", "BLOCKED"];

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function writeText(root, repoPath, content) {
  const filePath = path.join(root, ...repoPath.split("/"));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function readText(root, repoPath) {
  return fs.readFileSync(path.join(root, ...repoPath.split("/")), "utf8");
}

function writeJson(root, repoPath, value) {
  writeText(root, repoPath, stableStringify(value));
}

function readJson(root, repoPath) {
  return JSON.parse(readText(root, repoPath));
}

function readRepoJson(repoPath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ...repoPath.split("/")), "utf8"));
}

function mutateJson(root, repoPath, mutate) {
  const value = readJson(root, repoPath);
  mutate(value);
  writeJson(root, repoPath, value);
}

function codeRegistry() {
  return readRepoJson("governance/harness-reason-codes.json");
}

function codeRegistrySchema() {
  return readRepoJson("governance/harness-reason-codes.schema.json");
}

function config() {
  return {
    $schema: "./foundation.config.schema.json",
    phase: "0",
    project: "Proofrail",
    requiredDocuments: [
      "AGENTS.md",
      "README.md",
      "docs/constitution/product-constitution.md",
      "docs/constitution/terminology.md",
      "docs/product/verdict-semantics.md",
      "docs/plans/active/foundation-gate-mechanization.md",
      "governance/foundation.config.schema.json",
      "governance/harness-reason-codes.json",
      "governance/harness-reason-codes.schema.json",
      "governance/machine-task-contract.schema.json",
      "governance/tasks/SYN-001.json",
      "governance/generated/canonical-terminology.json",
      "governance/generated/canonical-verdicts.json",
      "governance/generated/documentation-authority-index.json",
    ],
    canonicalTerms: CANONICAL_TERMS,
    canonicalVerdicts: CANONICAL_VERDICTS,
    machineTaskContractSchema: "governance/machine-task-contract.schema.json",
    activeNextFoundationTask: "FOUNDATION GATE MECHANIZATION",
    harnessReasonCodeRegistry: "governance/harness-reason-codes.json",
    generatedProjections: {
      canonicalTerminology: "governance/generated/canonical-terminology.json",
      canonicalVerdicts: "governance/generated/canonical-verdicts.json",
      documentationAuthorityIndex: "governance/generated/documentation-authority-index.json",
    },
    cleanAgentTestSpecification: "governance/clean-agent-test.json",
    architectureCheckPreparation: "governance/architecture-check-preparation.json",
  };
}

function foundationConfigSchema() {
  return readRepoJson("governance/foundation.config.schema.json");
}

function machineTaskContractSchema() {
  return readRepoJson("governance/machine-task-contract.schema.json");
}

function taskContract() {
  return {
    task: { id: "SYN-001", class: "synthetic", objective: "Synthetic governance validator test task." },
    scope: { write: ["synthetic/**"], forbidden: ["runtime implementation"] },
    authority: { read: ["AGENTS.md"], mayChangeAuthority: false, mayChangeProductSemantics: false },
    acceptance: { requirements: ["Synthetic requirement."] },
    verification: { commands: ["node synthetic-validator.js"] },
    requiredArtifacts: ["synthetic artifact"],
    stopConditions: ["synthetic stop condition"],
    review: {
      expectation: "independent_review_required",
      reviewerMustNotRelyOnBuilderClaim: true,
    },
  };
}

function createSyntheticRepo(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "proofrail-governance-"));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  writeText(
    root,
    "AGENTS.md",
    `# Synthetic Agent Map

## Authority Map

- Product identity: [docs/constitution/product-constitution.md](docs/constitution/product-constitution.md)
- Canonical vocabulary: [docs/constitution/terminology.md](docs/constitution/terminology.md)
- Verdict semantics: [docs/product/verdict-semantics.md](docs/product/verdict-semantics.md)
`,
  );
  writeText(root, "README.md", "# Synthetic Proofrail\n");
  writeText(
    root,
    "docs/constitution/product-constitution.md",
    `# Product Constitution

## Documentation Authority Index

| Topic | Authoritative location | Notes |
| --- | --- | --- |
| Product identity | This document | Synthetic identity authority. |
| Canonical terminology | [terminology.md](terminology.md) | Synthetic terminology authority. |
| Verdict semantics | [../product/verdict-semantics.md](../product/verdict-semantics.md) | Synthetic Verdict authority. |
`,
  );
  writeText(
    root,
    "docs/constitution/terminology.md",
    `# Canonical Terminology

## Canonical Terms

${CANONICAL_TERMS.map((term) => `### ${term}\n\nDefinition: synthetic ${term}.`).join("\n\n")}
`,
  );
  writeText(
    root,
    "docs/product/verdict-semantics.md",
    `# Verdict Semantics

## Canonical Verdicts

${CANONICAL_VERDICTS.map((verdict) => `### ${verdict}\n\nMeaning: synthetic ${verdict}.`).join("\n\n")}
`,
  );
  writeText(root, "docs/plans/active/foundation-gate-mechanization.md", "# FOUNDATION GATE MECHANIZATION\n");
  writeJson(root, "governance/foundation.config.json", config());
  writeJson(root, "governance/foundation.config.schema.json", foundationConfigSchema());
  writeJson(root, "governance/harness-reason-codes.json", codeRegistry());
  writeJson(root, "governance/harness-reason-codes.schema.json", codeRegistrySchema());
  writeJson(root, "governance/machine-task-contract.schema.json", machineTaskContractSchema());
  writeJson(root, "governance/tasks/SYN-001.json", taskContract());
  writeExpectedProjections(root, config());

  return root;
}

function codes(result) {
  return result.findings.map((finding) => finding.code);
}

function registeredCodes(root) {
  return new Set(readJson(root, "governance/harness-reason-codes.json").codes.map((entry) => entry.code));
}

function assertFindingCodesRegistered(root, result) {
  const registered = registeredCodes(root);
  for (const code of codes(result)) {
    assert.ok(registered.has(code), `${code} is not registered`);
  }
}

function assertNoStackTraceOrHostPath(output, root) {
  assert.equal(output.includes(root), false);
  assert.equal(output.includes("Error:"), false);
  assert.equal(output.includes(" at "), false);
}

function assertUnusableRegistryFailsClosed(root) {
  const additionalFindings = [
    {
      code: "HARN_SYNTHETIC_UNKNOWN",
      path: "synthetic/path",
      message: "Synthetic unknown code.",
      remediation: "Register it.",
    },
  ];
  const first = renderJson(validateFoundation({ root, additionalFindings }));
  const second = renderJson(validateFoundation({ root, additionalFindings }));
  assert.equal(first, second);

  const parsed = JSON.parse(first);
  assert.equal(parsed.status, "INVALID");
  assert.deepEqual(codes(parsed), [BOOTSTRAP_UNKNOWN_REASON_CODE]);
  assert.equal(codes(parsed).includes("HARN_SYNTHETIC_UNKNOWN"), false);
  assertNoStackTraceOrHostPath(first, root);
}

test("sorts findings deterministically by code, path, and message", () => {
  const sorted = sortFindings([
    { code: "HARN_Z", path: "b", message: "b", remediation: "r" },
    { code: "HARN_A", path: "z", message: "b", remediation: "r" },
    { code: "HARN_A", path: "a", message: "z", remediation: "r" },
    { code: "HARN_A", path: "a", message: "a", remediation: "r" },
  ]);
  assert.deepEqual(
    sorted.map((finding) => `${finding.code}:${finding.path}:${finding.message}`),
    ["HARN_A:a:a", "HARN_A:a:z", "HARN_A:z:b", "HARN_Z:b:b"],
  );
});

test("emits deterministic JSON output without host paths", (t) => {
  const root = createSyntheticRepo(t);
  const first = renderJson(validateFoundation({ root }));
  const second = renderJson(validateFoundation({ root }));
  assert.equal(first, second);
  assert.equal(JSON.parse(first).status, "VALID");
  assert.equal(first.includes(root), false);
});

test("detects unknown emitted harness reason codes", (t) => {
  const root = createSyntheticRepo(t);
  const result = validateFoundation({
    root,
    additionalFindings: [
      {
        code: "HARN_SYNTHETIC_UNKNOWN",
        path: "synthetic/path",
        message: "Synthetic unknown code.",
        remediation: "Register it.",
      },
    ],
  });
  assert.equal(result.status, "INVALID");
  assert.ok(codes(result).includes("HARN_EMITTED_REASON_CODE_UNKNOWN"));
  assert.equal(codes(result).includes("HARN_SYNTHETIC_UNKNOWN"), false);
  assertFindingCodesRegistered(root, result);
});

test("fails closed when reserved bootstrap diagnostic is removed from registry", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/harness-reason-codes.json", (registry) => {
    registry.codes = registry.codes.filter((entry) => entry.code !== BOOTSTRAP_UNKNOWN_REASON_CODE);
  });
  assertUnusableRegistryFailsClosed(root);
});

test("fails closed when harness reason-code registry codes array is empty", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/harness-reason-codes.json", (registry) => {
    registry.codes = [];
  });
  assertUnusableRegistryFailsClosed(root);
});

test("fails closed when reserved bootstrap diagnostic is duplicated", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/harness-reason-codes.json", (registry) => {
    const bootstrapEntry = registry.codes.find((entry) => entry.code === BOOTSTRAP_UNKNOWN_REASON_CODE);
    registry.codes.push({ ...bootstrapEntry });
  });
  assertUnusableRegistryFailsClosed(root);
});

test("fails closed when harness reason-code registry top-level metadata is malformed", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/harness-reason-codes.json", (registry) => {
    delete registry.schemaVersion;
  });
  assertUnusableRegistryFailsClosed(root);
});

test("does not pass raw unknown finding through while registry is unusable", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/harness-reason-codes.json", (registry) => {
    registry.codes = [];
  });
  assertUnusableRegistryFailsClosed(root);
});

test("fails closed for duplicate harness reason codes", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/harness-reason-codes.json", (registry) => {
    registry.codes.push({ ...registry.codes[0] });
  });
  assertUnusableRegistryFailsClosed(root);
});

test("fails closed for invalid harness reason-code prefixes", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/harness-reason-codes.json", (registry) => {
    registry.codes[0].code = "SYNTHETIC_BAD_PREFIX";
  });
  assertUnusableRegistryFailsClosed(root);
});

test("detects a missing required document", (t) => {
  const root = createSyntheticRepo(t);
  fs.rmSync(path.join(root, "README.md"));
  assert.ok(codes(validateFoundation({ root })).includes("HARN_REQUIRED_DOCUMENT_MISSING"));
});

test("reports unsafe required-document config paths as registered parseable JSON", (t) => {
  const unsafePaths = ["../outside.md", "C:/outside.md", "contains\u0000null.md"];

  for (const unsafePath of unsafePaths) {
    const root = createSyntheticRepo(t);
    mutateJson(root, "governance/foundation.config.json", (foundationConfig) => {
      foundationConfig.requiredDocuments = [unsafePath];
    });

    const output = renderJson(validateFoundation({ root }));
    const parsed = JSON.parse(output);
    assert.equal(parsed.status, "INVALID");
    assert.ok(codes(parsed).includes("HARN_CONFIG_PATH_INVALID"));
    assertFindingCodesRegistered(root, parsed);
    assertNoStackTraceOrHostPath(output, root);
  }
});

test("reports unsafe repository paths for all Foundation config path fields", (t) => {
  const pathCases = [
    ["requiredDocuments[0]", (foundationConfig) => {
      foundationConfig.requiredDocuments[0] = "../outside.md";
    }],
    ["machineTaskContractSchema", (foundationConfig) => {
      foundationConfig.machineTaskContractSchema = "../outside.md";
    }],
    ["harnessReasonCodeRegistry", (foundationConfig) => {
      foundationConfig.harnessReasonCodeRegistry = "../outside.md";
    }],
    ["cleanAgentTestSpecification", (foundationConfig) => {
      foundationConfig.cleanAgentTestSpecification = "../outside.md";
    }],
    ["architectureCheckPreparation", (foundationConfig) => {
      foundationConfig.architectureCheckPreparation = "../outside.md";
    }],
    ["generatedProjections.canonicalTerminology", (foundationConfig) => {
      foundationConfig.generatedProjections.canonicalTerminology = "../outside.md";
    }],
  ];

  for (const [selector, mutate] of pathCases) {
    const root = createSyntheticRepo(t);
    mutateJson(root, "governance/foundation.config.json", mutate);
    const result = validateFoundation({ root });
    assert.equal(result.status, "INVALID");
    assert.ok(
      result.findings.some((finding) => finding.code === "HARN_CONFIG_PATH_INVALID" && finding.path === `governance/foundation.config.json#${selector}`),
      `${selector} did not produce HARN_CONFIG_PATH_INVALID`,
    );
    assertFindingCodesRegistered(root, result);
  }
});

test("detects stale generated projections", (t) => {
  const root = createSyntheticRepo(t);
  writeText(
    root,
    "docs/constitution/terminology.md",
    readText(root, "docs/constitution/terminology.md").replace("Definition: synthetic Claim.", "Definition: synthetic Claim changed."),
  );
  assert.ok(codes(validateFoundation({ root })).includes("HARN_PROJECTION_STALE"));
});

test("ignores fenced fake canonical headings while extracting canonical sets", (t) => {
  const root = createSyntheticRepo(t);
  writeText(
    root,
    "docs/constitution/terminology.md",
    readText(root, "docs/constitution/terminology.md").replace(
      "## Canonical Terms\n",
      "## Canonical Terms\n\n```text\n### Synthetic Fake Term\n```\n\n",
    ),
  );
  writeText(
    root,
    "docs/product/verdict-semantics.md",
    readText(root, "docs/product/verdict-semantics.md").replace(
      "## Canonical Verdicts\n",
      "## Canonical Verdicts\n\n```text\n### REVIEW_LATER\n```\n\n",
    ),
  );
  writeExpectedProjections(root, config());

  const terminologyProjection = readJson(root, "governance/generated/canonical-terminology.json");
  const verdictProjection = readJson(root, "governance/generated/canonical-verdicts.json");
  assert.equal(terminologyProjection.terms.some((entry) => entry.term === "Synthetic Fake Term"), false);
  assert.equal(verdictProjection.verdicts.some((entry) => entry.verdict === "REVIEW_LATER"), false);
  assert.equal(validateFoundation({ root }).status, "VALID");
});

test("detects stale projections when fenced authoritative source content changes", (t) => {
  const root = createSyntheticRepo(t);
  writeText(
    root,
    "docs/constitution/terminology.md",
    readText(root, "docs/constitution/terminology.md").replace(
      "## Canonical Terms\n",
      "## Canonical Terms\n\n```text\n### Synthetic Fake Term\nalpha\n```\n\n",
    ),
  );
  writeExpectedProjections(root, config());
  const beforeDigest = readJson(root, "governance/generated/canonical-terminology.json").sourceDigest;

  writeText(
    root,
    "docs/constitution/terminology.md",
    readText(root, "docs/constitution/terminology.md").replace("alpha", "beta"),
  );
  const expectedDigest = canonicalTerminologyProjection(root).sourceDigest;
  assert.notEqual(expectedDigest, beforeDigest);

  const staleResult = validateFoundation({ root });
  assert.equal(staleResult.status, "INVALID");
  assert.ok(codes(staleResult).includes("HARN_PROJECTION_STALE"));

  writeExpectedProjections(root, config());
  assert.equal(readJson(root, "governance/generated/canonical-terminology.json").sourceDigest, expectedDigest);
  assert.equal(validateFoundation({ root }).status, "VALID");
});

test("refuses generated projection output outside governance/generated", (t) => {
  const root = createSyntheticRepo(t);
  const before = readText(root, "docs/constitution/terminology.md");
  const badConfig = config();
  badConfig.generatedProjections.canonicalTerminology = "docs/constitution/terminology.md";
  assert.throws(() => writeExpectedProjections(root, badConfig), /Unsafe generated projection output path/);
  assert.equal(readText(root, "docs/constitution/terminology.md"), before);
});

test("refuses duplicate generated projection output paths", (t) => {
  const root = createSyntheticRepo(t);
  const badConfig = config();
  badConfig.generatedProjections.canonicalVerdicts = badConfig.generatedProjections.canonicalTerminology;
  assert.throws(() => writeExpectedProjections(root, badConfig), /unique/);
});

test("reports malformed config without dereferencing dependent fields", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/foundation.config.json", (foundationConfig) => {
    delete foundationConfig.generatedProjections;
  });
  const result = validateFoundation({ root });
  assert.equal(result.status, "INVALID");
  assert.ok(codes(result).includes("HARN_CONFIG_SCHEMA_INVALID"));
});

test("detects canonical term exact-set drift", (t) => {
  const root = createSyntheticRepo(t);
  writeText(root, "docs/constitution/terminology.md", `${readText(root, "docs/constitution/terminology.md")}\n### Synthetic Extra\n\nDefinition: extra.\n`);
  assert.ok(codes(validateFoundation({ root })).includes("HARN_CANONICAL_TERM_AUTHORITY_MISSING_CONFIG"));
});

test("detects canonical Verdict exact-set drift", (t) => {
  const root = createSyntheticRepo(t);
  writeText(root, "docs/product/verdict-semantics.md", `${readText(root, "docs/product/verdict-semantics.md")}\n### REVIEW_LATER\n\nMeaning: extra.\n`);
  assert.ok(codes(validateFoundation({ root })).includes("HARN_CANONICAL_VERDICT_AUTHORITY_MISMATCH"));
});

test("detects duplicate authority topics", (t) => {
  const root = createSyntheticRepo(t);
  writeText(
    root,
    "docs/constitution/product-constitution.md",
    `${readText(root, "docs/constitution/product-constitution.md")}| Verdict semantics | [../product/verdict-semantics.md](../product/verdict-semantics.md) | Duplicate. |\n`,
  );
  assert.ok(codes(validateFoundation({ root })).includes("HARN_AUTHORITY_TOPIC_DUPLICATE"));
});

test("detects broken local Markdown links", (t) => {
  const root = createSyntheticRepo(t);
  writeText(root, "README.md", "# Synthetic Proofrail\n\n[Missing](docs/missing.md)\n");
  assert.ok(codes(validateFoundation({ root })).includes("HARN_MARKDOWN_LINK_BROKEN"));
});

test("detects escaped local Markdown links", (t) => {
  const root = createSyntheticRepo(t);
  writeText(root, "README.md", "# Synthetic Proofrail\n\n[Outside](../outside.md)\n");
  assert.ok(codes(validateFoundation({ root })).includes("HARN_MARKDOWN_LINK_BROKEN"));
});

test("detects absolute local Markdown links", (t) => {
  const root = createSyntheticRepo(t);
  writeText(root, "README.md", "# Synthetic Proofrail\n\n[Outside](C:/outside.md)\n");
  assert.ok(codes(validateFoundation({ root })).includes("HARN_MARKDOWN_LINK_BROKEN"));
});

test("detects broken reference-style Markdown links", (t) => {
  const root = createSyntheticRepo(t);
  writeText(root, "README.md", "# Synthetic Proofrail\n\n[Missing][missing-ref]\n\n[missing-ref]: docs/missing.md\n");
  assert.ok(codes(validateFoundation({ root })).includes("HARN_MARKDOWN_LINK_BROKEN"));
});

test("detects broken HTML Markdown links", (t) => {
  const root = createSyntheticRepo(t);
  writeText(root, "README.md", "# Synthetic Proofrail\n\n<a href=\"docs/missing.md\">Missing</a>\n");
  assert.ok(codes(validateFoundation({ root })).includes("HARN_MARKDOWN_LINK_BROKEN"));
});

test("detects repository identity contamination", (t) => {
  const root = createSyntheticRepo(t);
  const contaminatedIdentity = ["Code", "Atlas"].join("");
  writeText(root, "README.md", `# Synthetic Proofrail\n\n${contaminatedIdentity}\n`);
  assert.ok(codes(validateFoundation({ root })).includes("HARN_IDENTITY_CONTAMINATION"));
});

test("detects invalid Machine Task Contract review expectation", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/tasks/SYN-001.json", (task) => {
    task.review.expectation = "builder_claim_only";
  });
  assert.ok(codes(validateFoundation({ root })).includes("HARN_MTC_REVIEW_EXPECTATION_INVALID"));
});

test("detects invalid Machine Task Contract reviewerMustNotRelyOnBuilderClaim", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/tasks/SYN-001.json", (task) => {
    task.review.reviewerMustNotRelyOnBuilderClaim = false;
  });
  assert.ok(codes(validateFoundation({ root })).includes("HARN_MTC_REVIEWER_CLAIM_INVALID"));
});

test("requires Machine Task Contract authority mayChangeAuthority", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/tasks/SYN-001.json", (task) => {
    delete task.authority.mayChangeAuthority;
  });
  const result = validateFoundation({ root });
  assert.equal(result.status, "INVALID");
  assert.ok(codes(result).includes("HARN_MTC_INSTANCE_INVALID"));
});

test("requires Machine Task Contract authority mayChangeProductSemantics", (t) => {
  const root = createSyntheticRepo(t);
  mutateJson(root, "governance/tasks/SYN-001.json", (task) => {
    delete task.authority.mayChangeProductSemantics;
  });
  const result = validateFoundation({ root });
  assert.equal(result.status, "INVALID");
  assert.ok(codes(result).includes("HARN_MTC_INSTANCE_INVALID"));
});

test("accepts Machine Task Contract authority with both explicit booleans", (t) => {
  const root = createSyntheticRepo(t);
  assert.equal(validateFoundation({ root }).status, "VALID");
});
