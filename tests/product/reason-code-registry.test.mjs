import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { renderReasonCodeReference } from "../../scripts/product/reason-code-reference.mjs";
import {
  collectProductSourceCodes,
  inspectSourceText,
  validateReasonCodeRepository,
  validateRegistryData,
} from "../../scripts/product/validate-reason-codes.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const schema = JSON.parse(await readFile(
  new URL("../../schemas/product/reason-code-registry.schema.json", import.meta.url),
  "utf8",
));
const registry = JSON.parse(await readFile(
  new URL("../../config/reason-codes/product-reason-codes.json", import.meta.url),
  "utf8",
));
const reference = await readFile(
  new URL("../../docs/reference/reason-codes.md", import.meta.url),
  "utf8",
);
const scan = await collectProductSourceCodes(ROOT);

function clone(value) {
  return structuredClone(value);
}

function findingIds(findings) {
  return findings.map((finding) => finding.id);
}

function validate(candidate, options = {}) {
  return validateRegistryData({
    schema: options.schema ?? schema,
    registry: candidate,
    emissions: options.emissions ?? scan.emissions,
    reference: options.reference ?? renderReasonCodeReference(candidate),
  });
}

test("committed repository product reason-code contract is valid", async () => {
  assert.deepEqual(await validateReasonCodeRepository(ROOT), []);
});

test("registry is the exact sorted set of 45 currently emitted product-owned codes", () => {
  const emittedIds = [...new Set(scan.emissions.map((emission) => emission.id))].sort();
  assert.equal(emittedIds.length, 45);
  assert.deepEqual(registry.codes.map((entry) => entry.id), emittedIds);
  assert.deepEqual(scan.findings, []);
});

test("committed reference is exact deterministic LF output", () => {
  const first = renderReasonCodeReference(registry);
  const second = renderReasonCodeReference(clone(registry));
  assert.equal(first, second);
  assert.equal(first, reference);
  assert.equal(first.endsWith("\n"), true);
  assert.equal(first.endsWith("\n\n"), false);
  assert.equal(first.includes("\r"), false);
});

test("malformed registry data fails schema validation", () => {
  const candidate = clone(registry);
  delete candidate.namespace;
  assert.ok(findingIds(validate(candidate)).includes("RCHECK_REGISTRY_SCHEMA_INVALID"));
});

test("an invalid registry schema fails closed", () => {
  const candidateSchema = clone(schema);
  candidateSchema.type = "not-a-json-schema-type";
  assert.deepEqual(findingIds(validate(registry, { schema: candidateSchema })), [
    "RCHECK_SCHEMA_INVALID",
  ]);
});

test("unknown registry schema keywords fail closed under strict compilation", () => {
  const candidateSchema = clone(schema);
  candidateSchema.properties.namespace.unrecognizedKeyword = true;
  assert.deepEqual(findingIds(validate(registry, { schema: candidateSchema })), [
    "RCHECK_SCHEMA_INVALID",
  ]);
});

test("duplicate and unsorted code ids are rejected deterministically", () => {
  const candidate = clone(registry);
  candidate.codes.splice(1, 0, clone(candidate.codes[0]));
  const ids = findingIds(validate(candidate));
  assert.ok(ids.includes("RCHECK_REGISTRY_DUPLICATE_ID"));
  assert.ok(ids.includes("RCHECK_REGISTRY_ORDER_INVALID"));
});

test("HARN contamination is rejected by schema and separation checks", () => {
  const candidate = clone(registry);
  candidate.codes[0].id = "HARN_NOT_PRODUCT";
  const ids = findingIds(validate(candidate));
  assert.ok(ids.includes("RCHECK_REGISTRY_SCHEMA_INVALID"));
  assert.ok(ids.includes("RCHECK_HARN_CODE_FORBIDDEN"));
});

test("alias-shaped registry fields are rejected", () => {
  const candidate = clone(registry);
  candidate.codes[0].aliases = ["OLD_CODE"];
  assert.ok(findingIds(validate(candidate)).includes("RCHECK_REGISTRY_SCHEMA_INVALID"));
});

test("an emitted code missing from the registry fails closed", () => {
  const candidate = clone(registry);
  candidate.codes = candidate.codes.filter(({ id }) => id !== "TARGET_MISMATCH");
  const findings = validate(candidate);
  assert.ok(findingIds(findings).includes("RCHECK_EMITTED_CODE_UNREGISTERED"));
  assert.equal(findings.some((finding) => finding.target === "TARGET_MISMATCH"), true);
});

test("an active registry code not emitted by source fails closed", () => {
  const candidate = clone(registry);
  const extra = clone(candidate.codes.at(-1));
  extra.id = "ZZZ_NOT_EMITTED";
  candidate.codes.push(extra);
  const findings = validate(candidate);
  assert.ok(findingIds(findings).includes("RCHECK_ACTIVE_CODE_NOT_EMITTED"));
});

test("surface drift between source and registry is rejected", () => {
  const candidate = clone(registry);
  candidate.codes.find(({ id }) => id === "TARGET_MISMATCH").surfaces = ["kernel"];
  assert.ok(findingIds(validate(candidate)).includes("RCHECK_SURFACE_MISMATCH"));
});

test("supported dynamic emission is rejected without exposing source text", () => {
  const inspected = inspectSourceText({
    source: "export function synthetic(code) { fail(code); }\n",
    sourcePath: "packages/kernel/src/synthetic.js",
    surface: "kernel",
  });
  assert.deepEqual(findingIds(inspected.findings), ["RCHECK_EMITTER_UNINSPECTABLE"]);
  assert.deepEqual(inspected.emissions, []);
  assert.equal(JSON.stringify(inspected.findings).includes("synthetic(code)"), false);
});

test("supported direct error constructors collect literal codes", () => {
  const inspected = inspectSourceText({
    source: [
      'new TrustedConfigurationError("TRUSTED_DIRECT");',
      'new ReleaseOrchestratorError("ORCHESTRATOR_DIRECT");',
      'new FileIoError("FILE_DIRECT");',
    ].join("\n"),
    sourcePath: "packages/evidence-gate/src/direct-errors.js",
    surface: "evidence-gate",
  });
  assert.deepEqual(inspected.findings, []);
  assert.deepEqual(inspected.emissions.map(({ id }) => id), [
    "TRUSTED_DIRECT",
    "ORCHESTRATOR_DIRECT",
    "FILE_DIRECT",
  ]);
});

test("dynamic direct error construction is rejected outside an exact wrapper", () => {
  const inspected = inspectSourceText({
    source: "export function synthetic(code) { throw new TrustedConfigurationError(code); }\n",
    sourcePath: "packages/trusted-config/src/dynamic-error.js",
    surface: "trusted-config",
  });
  assert.deepEqual(findingIds(inspected.findings), ["RCHECK_EMITTER_UNINSPECTABLE"]);
  assert.deepEqual(inspected.emissions, []);
});

test("only an exact known constructor assignment may forward this.code dynamically", () => {
  const inspected = inspectSourceText({
    source: [
      "class FileIoError extends Error {",
      "  constructor(code) { this.code = code; }",
      "  replace(code) { this.code = code; }",
      "}",
    ].join("\n"),
    sourcePath: "packages/evidence-gate/src/error-method.js",
    surface: "evidence-gate",
  });
  assert.deepEqual(findingIds(inspected.findings), ["RCHECK_EMITTER_UNINSPECTABLE"]);
  assert.deepEqual(inspected.emissions, []);
});

test("emitter aliases and value escapes fail closed", () => {
  const inspected = inspectSourceText({
    source: [
      "const alias = fail;",
      'alias("ALIASED_FAIL");',
      "const boundary = throwBoundaryError;",
      "const fileError = FileIoError;",
    ].join("\n"),
    sourcePath: "packages/kernel/src/emitter-alias.js",
    surface: "kernel",
  });
  assert.deepEqual(findingIds(inspected.findings), [
    "RCHECK_EMITTER_UNINSPECTABLE",
    "RCHECK_EMITTER_UNINSPECTABLE",
    "RCHECK_EMITTER_UNINSPECTABLE",
  ]);
  assert.deepEqual(inspected.emissions, []);
});

test("invalid and HARN literal emitters fail closed", () => {
  const lower = inspectSourceText({
    source: "fail(\"not_a_code\");\n",
    sourcePath: "packages/kernel/src/lower.js",
    surface: "kernel",
  });
  const harness = inspectSourceText({
    source: "fail(\"HARN_NOT_PRODUCT\");\n",
    sourcePath: "packages/kernel/src/harness.js",
    surface: "kernel",
  });
  assert.deepEqual(findingIds(lower.findings), ["RCHECK_EMITTER_CODE_INVALID"]);
  assert.deepEqual(findingIds(harness.findings), ["RCHECK_EMITTER_CODE_INVALID"]);
});

test("deprecated code must reference an existing replacement", () => {
  const candidate = clone(registry);
  candidate.codes[0].status = "DEPRECATED";
  candidate.codes[0].replacement = "MISSING_REPLACEMENT";
  assert.ok(findingIds(validate(candidate)).includes(
    "RCHECK_DEPRECATION_REPLACEMENT_INVALID",
  ));
});

test("deprecated replacement cycles are rejected", () => {
  const candidate = clone(registry);
  const first = candidate.codes[0];
  const second = candidate.codes[1];
  first.status = "DEPRECATED";
  first.replacement = second.id;
  second.status = "DEPRECATED";
  second.replacement = first.id;
  assert.ok(findingIds(validate(candidate)).includes("RCHECK_DEPRECATION_CYCLE"));
});

test("a deprecated code may point to an active replacement without aliasing", () => {
  const candidate = clone(registry);
  candidate.codes[0].status = "DEPRECATED";
  candidate.codes[0].replacement = candidate.codes[1].id;
  const deprecationFindings = validate(candidate).filter((finding) =>
    finding.id.startsWith("RCHECK_DEPRECATION_")
  );
  assert.deepEqual(deprecationFindings, []);
});

test("reference drift is rejected", () => {
  const findings = validate(registry, { reference: reference + "drift\n" });
  assert.deepEqual(findingIds(findings), ["RCHECK_REFERENCE_DRIFT"]);
});

test("negative diagnostics are byte-deterministic across repeated runs", () => {
  const candidate = clone(registry);
  candidate.codes.splice(1, 0, clone(candidate.codes[0]));
  const first = JSON.stringify(validate(candidate));
  const second = JSON.stringify(validate(clone(candidate)));
  assert.equal(first, second);
});
