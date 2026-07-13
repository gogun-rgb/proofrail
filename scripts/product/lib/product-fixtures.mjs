import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

import Ajv2020 from "ajv/dist/2020.js";
import * as contracts from "../../../packages/contracts/src/index.js";
import { buildEvidencePacket, canonicalJson as productCanonicalJson } from "../../../packages/evidence-gate/src/index.js";
import {
  mapGitHubPullRequestToEvidenceInput,
  normalizeDeclaredWriteScope,
  normalizeGitHubSnapshot,
} from "../../../packages/evidence-gate/src/github.js";
import { parseGitHubArguments } from "../../../packages/evidence-gate/src/github-cli.mjs";
import { parseReleaseArguments } from "../../../packages/evidence-gate/src/release-cli.mjs";
import { evaluateKernel } from "../../../packages/kernel/src/index.js";
import {
  evaluateReleaseCandidate,
  loadReleaseConfiguration,
} from "../../../packages/release-orchestrator/src/index.js";
import {
  loadTrustedReleaseConfiguration,
  parseStrictJson,
} from "../../../packages/trusted-config/src/index.js";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DEFAULT_FIXTURES_ROOT = path.join(MODULE_ROOT, "fixtures", "product");
const MANIFEST_SCHEMA = path.join(MODULE_ROOT, "schemas", "product", "fixture-manifest.schema.json");
const MAX_CORPUS_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DIAGNOSTIC_LENGTH = 240;
const SYNTHETIC_NOTICE = "UNTRUSTED SYNTHETIC TEST DATA; instruction-shaped content is inert.";
const PACKAGE_DIRECTORIES = Object.freeze([
  "contracts",
  "evidence-gate",
  "kernel",
  "release-orchestrator",
  "static-evaluator",
  "trusted-config",
]);
const FIXTURE_CLASSES = Object.freeze(["adversarial", "malformed", "negative", "positive"]);
const FIXTURE_CLASS_EXCEPTIONS = Object.freeze({
  "contracts.constants.v1": "positive",
  "kernel.forbidden-authority.v1": "adversarial",
  "kernel.malformed-input.v1": "malformed",
  "kernel.unknown-field.v1": "negative",
  "release-orchestrator.offline-golden.v1": "positive",
  "static-evaluator.invalid-utf8.v1": "malformed",
  "static-evaluator.oversize.v1": "adversarial",
  "trusted-config.hash-mismatch.v1": "negative",
});
const FIXTURE_CLASS_SUFFIX = /(?:^|[.-])(adversarial|malformed|negative|positive)\.v[1-9][0-9]*$/;
const CLASS_COVERAGE_EXCEPTIONS = Object.freeze({
  "contracts.constants": Object.freeze({
    expected: Object.freeze(["positive"]),
    reason: "No-input constant export; negative, malformed, and adversarial fixture classes are inapplicable.",
  }),
});
const OPERATION_SURFACES = Object.freeze({
  "contracts.constants": ["@proofrail/contracts#export:."],
  "evidence-gate.github-arguments": ["@proofrail/evidence-gate#bin:evidence-gate-github"],
  "evidence-gate.github-normalize": ["@proofrail/evidence-gate#export:./github"],
  "evidence-gate.packet": ["@proofrail/evidence-gate#export:."],
  "evidence-gate.static-cli": ["@proofrail/evidence-gate#bin:evidence-gate"],
  "kernel.evaluate": ["@proofrail/kernel#export:."],
  "release-orchestrator.offline": ["@proofrail/release-orchestrator#export:."],
  "release.arguments": [
    "@proofrail/evidence-gate#bin:proofrail-release",
    "@proofrail/evidence-gate#export:./release",
  ],
  "static-evaluator.cli": ["@proofrail/static-evaluator#bin:static-evaluate"],
  "trusted-config.load": ["@proofrail/trusted-config#export:."],
  "trusted-config.strict-json": ["@proofrail/trusted-config#export:."],
});
const OPERATION_BOUNDARIES = Object.freeze({
  "contracts.constants": Object.freeze(["contract-constants"]),
  "evidence-gate.github-arguments": Object.freeze(["github-cli-arguments"]),
  "evidence-gate.github-normalize": Object.freeze(["github-readonly-normalization"]),
  "evidence-gate.packet": Object.freeze(["static-evidence-packet"]),
  "evidence-gate.static-cli": Object.freeze(["static-cli-input", "static-cli-output"]),
  "kernel.evaluate": Object.freeze(["deterministic-kernel-boundary"]),
  "release-orchestrator.offline": Object.freeze(["offline-release-orchestration"]),
  "release.arguments": Object.freeze(["release-cli-arguments"]),
  "static-evaluator.cli": Object.freeze(["static-evaluator-cli", "static-evaluator-cli-output"]),
  "trusted-config.load": Object.freeze(["trusted-configuration-loader"]),
  "trusted-config.strict-json": Object.freeze(["strict-json-parser"]),
});
const SAFE_CLI_ARGUMENTS = Object.freeze({
  "evidence-gate.static-cli": Object.freeze([
    Object.freeze(["--input", "{input}"]),
    Object.freeze(["--input", "{input}", "--output", "{output}"]),
  ]),
  "static-evaluator.cli": Object.freeze([
    Object.freeze(["--input", "{input}"]),
    Object.freeze(["--input", "{input}", "--output", "{output}"]),
  ]),
});
const CLI_ENVIRONMENT = Object.freeze({ NO_COLOR: "1" });

export class ProductFixtureError extends Error {
  constructor(code, detail) {
    const bounded = String(detail ?? "").replace(/[\r\n\t]+/g, " ").slice(0, MAX_DIAGNOSTIC_LENGTH);
    super(bounded === "" ? code : `${code}: ${bounded}`);
    this.name = "ProductFixtureError";
    this.code = code;
  }
}

export async function loadProductFixtureCorpus(options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot ?? MODULE_ROOT);
  const fixturesRoot = path.resolve(options.fixturesRoot ?? DEFAULT_FIXTURES_ROOT);
  const corpusFiles = await scanCorpus(fixturesRoot);
  const suite = await readJsonFile(path.join(fixturesRoot, "suite.json"), "suite");
  validateSuite(suite, fixturesRoot);
  const schema = await readJsonFile(MANIFEST_SCHEMA, "fixture manifest schema");
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validateManifest = ajv.compile(schema);
  const manifests = [];
  const referencedFiles = new Set(["suite.json", "coverage-map.json"]);

  for (const manifestPath of suite.manifests) {
    referencedFiles.add(manifestPath);
    const manifest = await readJsonFile(resolveWithin(fixturesRoot, manifestPath), manifestPath);
    if (!validateManifest(manifest)) {
      const errors = [...(validateManifest.errors ?? [])]
        .map(({ instancePath, keyword }) => `${instancePath || "/"}:${keyword}`)
        .sort(compare)
        .slice(0, 4)
        .join(",");
      fail("MANIFEST_SCHEMA_INVALID", `${manifestPath} ${errors}`);
    }
    validateManifestOrdering(manifest, manifestPath);
    const expectedClass = fixtureClassFromId(manifest.id);
    if (manifest.class !== expectedClass) fail("FIXTURE_CLASS_MISMATCH", manifest.id);
    const driver = manifest.inputs.find(({ origin, path: inputPath }) =>
      origin === "fixture" && inputPath === manifest.driverInput);
    if (!driver) fail("DRIVER_INPUT_UNDECLARED", manifest.id);
    for (const input of manifest.inputs) {
      const base = input.origin === "fixture" ? fixturesRoot : repositoryRoot;
      const absolute = resolveWithin(base, input.path);
      await assertRegularBounded(absolute, `${manifest.id}:${input.path}`);
      const bytes = await readFile(absolute);
      if (sha256(bytes) !== input.sha256) fail("INPUT_DIGEST_MISMATCH", `${manifest.id}:${input.path}`);
      if (input.origin === "fixture") referencedFiles.add(input.path);
    }
    const oraclePath = resolveWithin(fixturesRoot, manifest.oracle.path);
    referencedFiles.add(manifest.oracle.path);
    const oracleBytes = await readFile(oraclePath);
    if (sha256(oracleBytes) !== manifest.oracle.sha256) fail("ORACLE_DIGEST_MISMATCH", manifest.id);
    const oracle = parseJsonBytes(oracleBytes, `${manifest.id}:oracle`);
    if (!oracleBytes.equals(Buffer.from(`${canonicalJson(oracle)}\n`, "utf8"))) {
      fail("ORACLE_NOT_CANONICAL_JSON_LF", manifest.id);
    }
    manifests.push(Object.freeze({ ...manifest, oracleValue: oracle }));
  }

  assertSortedUnique(manifests.map(({ id }) => id), "FIXTURE_IDENTITIES_UNSORTED_OR_DUPLICATE");
  const unreferenced = corpusFiles.filter((file) => !referencedFiles.has(file));
  if (unreferenced.length > 0) fail("UNREFERENCED_CORPUS_FILE", unreferenced[0]);

  const coverage = await readJsonFile(path.join(fixturesRoot, "coverage-map.json"), "coverage map");
  const derivedSurfaces = await derivePackageSurfaces(repositoryRoot);
  validateCoverage(coverage, manifests, derivedSurfaces);
  return Object.freeze({ repositoryRoot, fixturesRoot, manifests, coverage, derivedSurfaces });
}

export async function runProductFixtures(options = {}) {
  const corpus = await loadProductFixtureCorpus(options);
  const results = [];
  for (const manifest of corpus.manifests) {
    const actual = await executeProductFixture(manifest, corpus);
    if (canonicalJson(actual) !== canonicalJson(manifest.oracleValue)) {
      fail("FIXTURE_ORACLE_MISMATCH", manifest.id);
    }
    results.push(Object.freeze({ id: manifest.id, status: "PASS" }));
  }
  return Object.freeze(results);
}

export async function renderProductFixtureInventory(options = {}) {
  const corpus = await loadProductFixtureCorpus(options);
  const fixturesById = new Map(corpus.manifests.map((manifest) => [manifest.id, manifest]));
  const rows = corpus.manifests.map((manifest) => {
    const surfaces = manifest.surfaces.map(surfaceId).join("<br>");
    const limitations = manifest.limitations.length === 0 ? "None recorded." : manifest.limitations.join(" ");
    return `| \`${manifest.id}\` | ${manifest.class} | \`${manifest.operation}\` | ${surfaces} | ${escapeTable(limitations)} |`;
  });
  const coverageRows = corpus.coverage.surfaces.map((surface) => {
    const classes = coverageClasses(surface, fixturesById).join(", ");
    const exception = CLASS_COVERAGE_EXCEPTIONS[surface.operation];
    const applicability = exception ? `${classes}; ${exception.reason}` : classes;
    return `| \`${surface.id}\` | \`${surface.operation}\` | \`${surface.boundary}\` | ${surface.fixtureIds.map((id) => `\`${id}\``).join("<br>")} | ${applicability} |`;
  });
  return [
    "# Product Fixture Inventory",
    "",
    "This file is generated from `fixtures/product`. Product fixtures are distinct from repository governance tests.",
    "Fixture scenarios are synthetic and untrusted; instruction-shaped content remains inert.",
    "Inputs marked `origin: repository` are digest-bound references to committed bytes and do not become fixture authority.",
    "",
    "## Fixtures",
    "",
    "| Fixture | Class | Operation | Implemented surface | Known limitations |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Export and CLI coverage",
    "",
    "The coverage map is derived from the current six package manifests and validation fails on drift.",
    "",
    "| Surface | Operation | Boundary | Fixture ids | Class coverage and applicability |",
    "| --- | --- | --- | --- | --- |",
    ...coverageRows,
    "",
    "## Explicitly not covered",
    "",
    "Target checkout, target repository inspection, target command or verification execution, Verification Receipts, adapters, SARIF, GitHub writes, API, MCP, web, product-runtime model providers, and Inference Zone behavior are unimplemented and not covered.",
    "Passing fixtures are repository engineering evidence only; they do not establish product readiness, trusted release status, or an authoritative Proofrail Verdict.",
    "",
  ].join("\n");
}

export async function executeProductFixture(manifest, corpus) {
  const driverPath = resolveWithin(corpus.fixturesRoot, manifest.driverInput);
  const driver = await readJsonFile(driverPath, `${manifest.id}:driver`);
  return captureOutcome(async () => {
    switch (manifest.operation) {
      case "contracts.constants":
        return {
          bundleSchemaVersion: contracts.PHASE1_BUNDLE_SCHEMA_VERSION,
          engineVersion: contracts.PHASE1_KERNEL_ENGINE_VERSION,
          evidenceSatisfactionKind: contracts.EVIDENCE_SATISFACTION_KIND,
          inputSchemaVersion: contracts.PHASE1_KERNEL_INPUT_SCHEMA_VERSION,
          ruleAuthoritySources: contracts.RULE_AUTHORITY_PROVENANCE_SOURCES,
          ruleEffect: contracts.RULE_EFFECT_DENY,
          rulePredicates: contracts.RULE_PREDICATES,
          selectionSources: contracts.EVIDENCE_CONTRACT_SELECTION_PROVENANCE_SOURCES,
          verdicts: contracts.VERDICTS,
        };
      case "kernel.evaluate": {
        const input = await loadStructuredInput(driver, manifest, corpus);
        const bundle = evaluateKernel(input);
        return bundleProjection(bundle);
      }
      case "trusted-config.strict-json":
        return { value: parseStrictJson(driver.source) };
      case "trusted-config.load":
        return runTrustedConfigurationFixture(driver, manifest, corpus);
      case "release-orchestrator.offline":
        return runOfflineReleaseFixture(driver, manifest, corpus);
      case "evidence-gate.packet": {
        const packetInput = await loadStructuredInput(driver, manifest, corpus);
        const packet = buildEvidencePacket(packetInput);
        return {
          boundaries: packet.boundaries,
          inputDigest: packet.inputDigest,
          missingEvidenceIds: packet.missingEvidence.map(({ id }) => id),
          packetSha256: sha256(canonicalJson(packet)),
          reviewNeeds: packet.reviewNeeds,
        };
      }
      case "evidence-gate.github-normalize": {
        const snapshot = normalizeGitHubSnapshot(driver.snapshot);
        const scope = normalizeDeclaredWriteScope(driver.declaredWriteScope);
        const mapped = mapGitHubPullRequestToEvidenceInput(snapshot, scope);
        return {
          changedPaths: snapshot.files.map(({ path: changedPath }) => changedPath),
          mappedSha256: sha256(canonicalJson(mapped)),
          normalizedTitle: snapshot.title,
          reviewNeeds: mapped.reviewNeeds,
          scope,
        };
      }
      case "evidence-gate.github-arguments":
        return parseGitHubArguments(driver.arguments);
      case "release.arguments":
        return parseReleaseArguments(driver.arguments);
      case "evidence-gate.static-cli":
        return runCliFixture("packages/evidence-gate/src/cli.mjs", driver, manifest, corpus);
      case "static-evaluator.cli":
        return runCliFixture("packages/static-evaluator/src/cli.mjs", driver, manifest, corpus);
      default:
        fail("UNKNOWN_FIXTURE_OPERATION", manifest.operation);
    }
  });
}

async function runTrustedConfigurationFixture(driver, manifest, corpus) {
  const temporaryRoot = await stageDocuments(driver, manifest, corpus);
  try {
    const loaded = await loadTrustedReleaseConfiguration({
      repositoryRoot: temporaryRoot,
      trustedConfigurationPath: driver.trustedConfigurationPath,
    });
    return {
      frozen: Object.isFrozen(loaded) && Object.isFrozen(loaded.evidenceContract.requirements),
      identities: loaded.identities,
    };
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

async function runOfflineReleaseFixture(driver, manifest, corpus) {
  const temporaryRoot = await stageDocuments(driver, manifest, corpus);
  try {
    const loaded = await loadReleaseConfiguration({
      repositoryRoot: temporaryRoot,
      trustedConfigurationPath: driver.trustedConfigurationPath,
    });
    const snapshot = await readRepositoryJsonFile(resolveWithin(corpus.repositoryRoot, driver.snapshotPath), "release snapshot");
    const bundle = evaluateReleaseCandidate(loaded, snapshot);
    const rendered = `${productCanonicalJson(bundle)}\n`;
    const golden = await readFile(resolveWithin(corpus.repositoryRoot, driver.goldenPath));
    return {
      ...bundleProjection(bundle),
      goldenEqual: golden.equals(Buffer.from(rendered, "utf8")),
      goldenSha256: sha256(golden),
    };
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

async function stageDocuments(driver, manifest, corpus) {
  if (!Array.isArray(driver.documents) || driver.documents.length === 0) fail("DRIVER_INVALID", manifest.id);
  const declared = new Set(manifest.inputs.filter(({ origin }) => origin === "repository").map(({ path: inputPath }) => inputPath));
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "proofrail-product-fixture-"));
  try {
    for (const documentPath of driver.documents) {
      if (!declared.has(documentPath)) fail("DRIVER_INPUT_UNDECLARED", `${manifest.id}:${documentPath}`);
      const source = resolveWithin(corpus.repositoryRoot, documentPath);
      const destination = resolveWithin(temporaryRoot, documentPath);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
    if (driver.mutation !== null && driver.mutation !== undefined) {
      if (!declared.has(driver.mutation.path)) fail("DRIVER_INVALID", manifest.id);
      const target = resolveWithin(temporaryRoot, driver.mutation.path);
      if (driver.mutation.kind === "append-space") {
        const bytes = await readFile(target);
        await writeFile(target, Buffer.concat([bytes, Buffer.from(" ", "utf8")]));
      } else if (driver.mutation.kind === "replace-with-malformed-json") {
        await writeFile(target, "{\n", "utf8");
      } else {
        fail("DRIVER_INVALID", manifest.id);
      }
    }
    return temporaryRoot;
  } catch (error) {
    await rm(temporaryRoot, { force: true, recursive: true });
    throw error;
  }
}

async function loadStructuredInput(driver, manifest, corpus) {
  if (typeof driver.sourcePath !== "string") return driver;
  const declared = manifest.inputs.some(({ origin, path: inputPath }) =>
    origin === "repository" && inputPath === driver.sourcePath);
  if (!declared) fail("DRIVER_INPUT_UNDECLARED", `${manifest.id}:${driver.sourcePath}`);
  const value = structuredClone(await readRepositoryJsonFile(resolveWithin(corpus.repositoryRoot, driver.sourcePath), driver.sourcePath));
  if (driver.mutation?.kind === "add-root-field") {
    value[driver.mutation.name] = driver.mutation.value;
  } else if (driver.mutation?.kind === "add-claim-field") {
    value.claims[0][driver.mutation.name] = driver.mutation.value;
  } else if (driver.mutation !== null && driver.mutation !== undefined) {
    fail("DRIVER_INVALID", manifest.id);
  }
  return value;
}

async function runCliFixture(scriptPath, driver, manifest, corpus) {
  validateCliFixtureArguments(manifest.operation, driver.arguments, manifest.id);
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-product-cli-"));
  try {
    const inputPath = path.join(directory, "input.bin");
    const outputPath = path.join(directory, "output.bin");
    await writeFile(inputPath, await materializePayload(driver.payload, manifest, corpus));
    const args = driver.arguments.map((argument) => {
      if (argument === "{input}") return inputPath;
      if (argument === "{output}") return outputPath;
      return argument;
    });
    const result = spawnSync(process.execPath, [resolveWithin(corpus.repositoryRoot, scriptPath), ...args], {
      cwd: corpus.repositoryRoot,
      encoding: "buffer",
      env: CLI_ENVIRONMENT,
      maxBuffer: 2 * 1024 * 1024,
      shell: false,
      timeout: 15_000,
      windowsHide: true,
    });
    if (result.error) throw result.error;
    const outcome = {
      exitCode: result.status,
      stderr: streamSummary(result.stderr),
      stdout: streamSummary(result.stdout),
    };
    if (driver.arguments.includes("{output}")) outcome.output = await stagedOutputSummary(outputPath);
    return outcome;
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

async function stagedOutputSummary(outputPath) {
  let details;
  try {
    details = await lstat(outputPath);
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false };
    throw error;
  }
  if (!details.isFile() || details.isSymbolicLink()) fail("CLI_OUTPUT_NOT_REGULAR", "staged output");
  if (details.size > MAX_CORPUS_FILE_BYTES) fail("CLI_OUTPUT_TOO_LARGE", "staged output");
  return { exists: true, ...streamSummary(await readFile(outputPath)) };
}

async function materializePayload(payload, manifest, corpus) {
  if (payload.kind === "repository-file") {
    const declared = manifest.inputs.some(({ origin, path: inputPath }) => origin === "repository" && inputPath === payload.path);
    if (!declared) fail("DRIVER_INPUT_UNDECLARED", `${manifest.id}:${payload.path}`);
    return readFile(resolveWithin(corpus.repositoryRoot, payload.path));
  }
  if (payload.kind === "json") return Buffer.from(`${JSON.stringify(payload.value)}\n`, "utf8");
  if (payload.kind === "hex") return Buffer.from(payload.value, "hex");
  if (payload.kind === "repeat-byte"
      && Number.isInteger(payload.byte) && payload.byte >= 0 && payload.byte <= 255
      && Number.isInteger(payload.count) && payload.count >= 0 && payload.count <= 1_048_577) {
    return Buffer.alloc(payload.count, payload.byte);
  }
  fail("DRIVER_INVALID", "unsupported CLI payload");
}

function streamSummary(value) {
  const bytes = Buffer.from(value ?? Buffer.alloc(0));
  return {
    bytes: bytes.length,
    endsWithLf: bytes.length > 0 && bytes.at(-1) === 10,
    sha256: sha256(bytes),
    text: bytes.length <= 512 ? bytes.toString("utf8") : null,
  };
}

async function captureOutcome(action) {
  try {
    return { result: await action() };
  } catch (error) {
    if (error instanceof ProductFixtureError) throw error;
    const diagnostic = { message: String(error?.message ?? "unexpected failure").slice(0, MAX_DIAGNOSTIC_LENGTH), name: String(error?.name ?? "Error") };
    for (const key of ["code", "issueCategory", "path", "stage"]) {
      if (typeof error?.[key] === "string") diagnostic[key] = error[key];
    }
    return { error: diagnostic };
  }
}

function bundleProjection(bundle) {
  return {
    bundleSha256: sha256(canonicalJson(bundle)),
    reasonCodes: bundle.reasonCodes,
    schemaVersion: bundle.schemaVersion,
    verdict: bundle.verdict,
    verificationReceiptCount: bundle.verificationReceipts.length,
  };
}

async function derivePackageSurfaces(repositoryRoot) {
  const surfaces = [];
  for (const directory of PACKAGE_DIRECTORIES) {
    const manifest = await readRepositoryJsonFile(path.join(repositoryRoot, "packages", directory, "package.json"), `${directory} package manifest`);
    if (manifest.exports !== undefined) {
      if (typeof manifest.exports === "string") {
        surfaces.push(`${manifest.name}#export:.`);
      } else {
        for (const exportName of Object.keys(manifest.exports)) surfaces.push(`${manifest.name}#export:${exportName}`);
      }
    }
    if (typeof manifest.bin === "string") {
      surfaces.push(`${manifest.name}#bin:${manifest.name.split("/").at(-1)}`);
    } else if (manifest.bin && typeof manifest.bin === "object") {
      for (const binName of Object.keys(manifest.bin)) surfaces.push(`${manifest.name}#bin:${binName}`);
    }
  }
  return Object.freeze(surfaces.sort(compare));
}

function validateCoverage(coverage, manifests, derivedSurfaces) {
  assertExactKeys(coverage, ["schemaVersion", "surfaces"], "COVERAGE_MAP_INVALID");
  if (coverage.schemaVersion !== "proofrail.product-fixture-coverage.v1" || !Array.isArray(coverage.surfaces)) {
    fail("COVERAGE_MAP_INVALID", "shape");
  }
  const recordKeys = coverage.surfaces.map(({ id, operation, boundary }) => `${id}\u0000${operation}\u0000${boundary}`);
  assertSortedUnique(recordKeys, "COVERAGE_SURFACES_UNSORTED_OR_DUPLICATE");
  const ids = [...new Set(coverage.surfaces.map(({ id }) => id))].sort(compare);
  if (canonicalJson(ids) !== canonicalJson(derivedSurfaces)) fail("COVERAGE_SURFACE_DRIFT", "package exports or bins are unmapped");
  const expectedRecordKeys = Object.entries(OPERATION_SURFACES)
    .flatMap(([operation, surfaces]) => surfaces.flatMap((id) =>
      OPERATION_BOUNDARIES[operation].map((boundary) => `${id}\u0000${operation}\u0000${boundary}`)))
    .sort(compare);
  if (canonicalJson(recordKeys) !== canonicalJson(expectedRecordKeys)) {
    fail("COVERAGE_OPERATION_DRIFT", "implemented operations, surfaces, or boundaries are unmapped");
  }
  const fixtures = new Map(manifests.map((manifest) => [manifest.id, manifest]));
  const mappedPairs = new Set();
  for (const record of coverage.surfaces) {
    assertExactKeys(record, ["id", "operation", "boundary", "fixtureIds"], "COVERAGE_MAP_INVALID");
    if (typeof record.operation !== "string" || !OPERATION_BOUNDARIES[record.operation]?.includes(record.boundary)
        || !OPERATION_SURFACES[record.operation]?.includes(record.id)
        || !Array.isArray(record.fixtureIds) || record.fixtureIds.length === 0) {
      fail("COVERAGE_MAP_INVALID", record.id);
    }
    assertSortedUnique(record.fixtureIds, "COVERAGE_FIXTURES_UNSORTED_OR_DUPLICATE");
    const observedClasses = coverageClasses(record, fixtures);
    const expectedClasses = CLASS_COVERAGE_EXCEPTIONS[record.operation]?.expected ?? FIXTURE_CLASSES;
    if (canonicalJson(observedClasses) !== canonicalJson(expectedClasses)) {
      fail("COVERAGE_CLASS_INCOMPLETE", record.id);
    }
    for (const fixtureId of record.fixtureIds) {
      const manifest = fixtures.get(fixtureId);
      if (!manifest) fail("COVERAGE_UNKNOWN_FIXTURE", fixtureId);
      if (manifest.operation !== record.operation) {
        fail("COVERAGE_OPERATION_MISMATCH", `${record.id}:${fixtureId}`);
      }
      const declarations = manifest.surfaces.filter((surface) => surfaceId(surface) === record.id);
      if (declarations.length !== 1 || declarations[0].boundary !== record.boundary) {
        fail("COVERAGE_BOUNDARY_MISMATCH", `${record.id}:${fixtureId}`);
      }
      mappedPairs.add(`${fixtureId}\u0000${record.operation}\u0000${record.id}\u0000${record.boundary}`);
    }
  }
  for (const manifest of manifests) {
    for (const surface of manifest.surfaces) {
      if (!mappedPairs.has(`${manifest.id}\u0000${manifest.operation}\u0000${surfaceId(surface)}\u0000${surface.boundary}`)) {
        fail("FIXTURE_SURFACE_UNMAPPED", `${manifest.id}:${surfaceId(surface)}`);
      }
    }
  }
}

function fixtureClassFromId(fixtureId) {
  if (Object.hasOwn(FIXTURE_CLASS_EXCEPTIONS, fixtureId)) return FIXTURE_CLASS_EXCEPTIONS[fixtureId];
  const match = FIXTURE_CLASS_SUFFIX.exec(fixtureId);
  if (!match) fail("FIXTURE_CLASS_UNBOUND", fixtureId);
  return match[1];
}

function coverageClasses(record, fixtures) {
  return [...new Set(record.fixtureIds.map((fixtureId) => fixtures.get(fixtureId)?.class))]
    .filter((fixtureClass) => typeof fixtureClass === "string")
    .sort(compare);
}

function validateSuite(suite, fixturesRoot) {
  assertExactKeys(suite, ["schemaVersion", "manifests"], "SUITE_INVALID");
  if (suite.schemaVersion !== "proofrail.product-fixture-suite.v1" || !Array.isArray(suite.manifests) || suite.manifests.length === 0) {
    fail("SUITE_INVALID", "shape");
  }
  assertSortedUnique(suite.manifests, "SUITE_MANIFESTS_UNSORTED_OR_DUPLICATE");
  for (const manifestPath of suite.manifests) resolveWithin(fixturesRoot, manifestPath);
}

function validateManifestOrdering(manifest, manifestPath) {
  if (manifest.provenance.notice !== SYNTHETIC_NOTICE) fail("MANIFEST_PROVENANCE_INVALID", manifest.id);
  assertSortedUnique(manifest.inputs.map(({ origin, path: inputPath }) => `${origin}:${inputPath}`), "MANIFEST_INPUTS_UNSORTED_OR_DUPLICATE");
  assertSortedUnique(manifest.surfaces.map(surfaceId), "MANIFEST_SURFACES_UNSORTED_OR_DUPLICATE");
  assertSortedUnique(manifest.limitations, "MANIFEST_LIMITATIONS_UNSORTED_OR_DUPLICATE");
  const boundaries = [...new Set(manifest.surfaces.map(({ boundary }) => boundary))];
  const expectedPairs = boundaries.length === 1 && OPERATION_BOUNDARIES[manifest.operation]?.includes(boundaries[0])
    ? OPERATION_SURFACES[manifest.operation].map((id) => `${id}\u0000${boundaries[0]}`)
    : [];
  if (canonicalJson(manifest.surfaces.map((surface) => `${surfaceId(surface)}\u0000${surface.boundary}`))
      !== canonicalJson(expectedPairs)) {
    fail("MANIFEST_OPERATION_SURFACE_MISMATCH", manifest.id);
  }
  if (!manifestPath.endsWith("/manifest.json")) fail("MANIFEST_PATH_INVALID", manifestPath);
}

function validateCliFixtureArguments(operation, args, fixtureId) {
  const allowed = SAFE_CLI_ARGUMENTS[operation];
  if (!allowed?.some((expected) => canonicalJson(args) === canonicalJson(expected))) {
    fail("CLI_FIXTURE_ARGUMENTS_UNSAFE", fixtureId);
  }
}

async function scanCorpus(fixturesRoot) {
  const files = [];
  async function visit(directory, prefix) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compare(left.name, right.name));
    for (const entry of entries) {
      if (entry.name.startsWith(".")) fail("HIDDEN_CORPUS_ENTRY", prefix === "" ? entry.name : `${prefix}/${entry.name}`);
      const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const absolute = path.join(directory, entry.name);
      const details = await lstat(absolute);
      if (details.isSymbolicLink()) fail("SYMLINK_CORPUS_ENTRY", relative);
      if (details.isDirectory()) await visit(absolute, relative);
      else if (details.isFile()) {
        if (details.size > MAX_CORPUS_FILE_BYTES) fail("CORPUS_FILE_TOO_LARGE", relative);
        files.push(relative.replaceAll("\\", "/"));
      } else fail("NON_REGULAR_CORPUS_ENTRY", relative);
    }
  }
  await visit(fixturesRoot, "");
  return files.sort(compare);
}

async function readJsonFile(file, label) {
  await assertRegularBounded(file, label);
  return parseJsonBytes(await readFile(file), label);
}

async function readRepositoryJsonFile(file, label) {
  await assertRegularBounded(file, label);
  return parseJsonBytes(await readFile(file), label, false);
}

function parseJsonBytes(bytes, label, exactLf = true) {
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("JSON_INVALID_UTF8", label);
  }
  if (exactLf && (source.includes("\r") || !source.endsWith("\n") || source.endsWith("\n\n"))) fail("JSON_NOT_EXACT_LF", label);
  try {
    return parseStrictJson(source);
  } catch {
    fail("JSON_MALFORMED_OR_DUPLICATE", label);
  }
}

async function assertRegularBounded(file, label) {
  let details;
  try {
    details = await lstat(file);
  } catch {
    fail("FILE_UNAVAILABLE", label);
  }
  if (!details.isFile() || details.isSymbolicLink()) fail("FILE_NOT_REGULAR", label);
  if (details.size > MAX_CORPUS_FILE_BYTES) fail("FILE_TOO_LARGE", label);
}

function resolveWithin(root, selectedPath) {
  if (typeof selectedPath !== "string" || selectedPath === "" || selectedPath.includes("\\") || path.isAbsolute(selectedPath)
      || selectedPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail("PATH_INVALID", selectedPath);
  }
  const resolved = path.resolve(root, ...selectedPath.split("/"));
  const relative = path.relative(root, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail("PATH_INVALID", selectedPath);
  return resolved;
}

function assertExactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, "object required");
  const actual = Object.keys(value).sort(compare);
  const sortedExpected = [...expected].sort(compare);
  if (canonicalJson(actual) !== canonicalJson(sortedExpected)) fail(code, `keys ${actual.join(",")}`);
}

function assertSortedUnique(values, code) {
  if (values.some((value) => typeof value !== "string")
      || new Set(values).size !== values.length
      || values.some((value, index) => index > 0 && compare(values[index - 1], value) >= 0)) {
    fail(code, values.join(","));
  }
}

function surfaceId(surface) {
  return `${surface.package}#${surface.entrypoint}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort(compare).map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function escapeTable(value) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function fail(code, detail) {
  throw new ProductFixtureError(code, detail);
}
