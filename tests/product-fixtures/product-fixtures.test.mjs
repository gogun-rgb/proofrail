import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadProductFixtureCorpus,
  renderProductFixtureInventory,
  runProductFixtures,
} from "../../scripts/product/lib/product-fixtures.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURES = path.join(ROOT, "fixtures", "product");
const MANIFEST_SCHEMA = path.join(ROOT, "schemas", "product", "fixture-manifest.schema.json");

async function copiedCorpus(t) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "proofrail-product-fixtures-test-"));
  const fixturesRoot = path.join(temporaryRoot, "fixtures", "product");
  await cp(FIXTURES, fixturesRoot, { recursive: true });
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  return fixturesRoot;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value)}\n`, "utf8");
}

function rejectsWith(code) {
  return (error) => error?.code === code;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

test("all manifest schema references resolve to the one committed schema", async () => {
  const suite = await readJson(path.join(FIXTURES, "suite.json"));
  for (const relativeManifest of suite.manifests) {
    const manifestPath = path.join(FIXTURES, relativeManifest);
    const manifest = await readJson(manifestPath);
    const resolved = path.resolve(path.dirname(manifestPath), manifest.$schema);
    await access(resolved);
    assert.equal(resolved, MANIFEST_SCHEMA);
  }
});

test("the committed corpus runs exactly 41 fixtures in stable PASS order", async () => {
  const results = await runProductFixtures();
  assert.equal(results.length, 41);
  assert.deepEqual(
    results.map(({ id }) => id),
    [...results.map(({ id }) => id)].sort(),
  );
  assert.deepEqual(new Set(results.map(({ status }) => status)), new Set(["PASS"]));
});

test("an operation cannot claim an unrelated implemented surface", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const manifestPath = path.join(
    fixturesRoot,
    "cases",
    "contracts.constants.v1",
    "manifest.json",
  );
  const manifest = await readJson(manifestPath);
  manifest.operation = "kernel.evaluate";
  await writeJson(manifestPath, manifest);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("MANIFEST_OPERATION_SURFACE_MISMATCH"),
  );
});

test("every input-bearing surface retains all four fixture classes", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const manifestPath = path.join(
    fixturesRoot,
    "cases",
    "static-evaluator.negative.v1",
    "manifest.json",
  );
  const manifest = await readJson(manifestPath);
  manifest.class = "positive";
  await writeJson(manifestPath, manifest);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("COVERAGE_CLASS_INCOMPLETE"),
  );
});

test("class coverage cannot be borrowed across operations on one export", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const manifestPath = path.join(
    fixturesRoot,
    "cases",
    "trusted-config.strict-json-adversarial.v1",
    "manifest.json",
  );
  const manifest = await readJson(manifestPath);
  manifest.class = "positive";
  await writeJson(manifestPath, manifest);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("COVERAGE_CLASS_INCOMPLETE"),
  );
});

test("CLI fixture arguments cannot write an outside sentinel", async (t) => {
  for (const outputKind of ["absolute", "relative"]) {
    await t.test(outputKind, async (t) => {
      const fixturesRoot = await copiedCorpus(t);
      const sentinelPath = path.resolve(fixturesRoot, "..", "..", `${outputKind}-sentinel.json`);
      const sentinel = Buffer.from(`sentinel:${outputKind}\n`, "utf8");
      await writeFile(sentinelPath, sentinel);

      const inputPath = path.join(
        fixturesRoot,
        "cases",
        "evidence-gate.cli-positive.v1",
        "input.json",
      );
      const manifestPath = path.join(
        fixturesRoot,
        "cases",
        "evidence-gate.cli-positive.v1",
        "manifest.json",
      );
      const input = await readJson(inputPath);
      input.arguments.push(
        "--output",
        outputKind === "absolute" ? sentinelPath : path.relative(ROOT, sentinelPath),
      );
      const inputBytes = Buffer.from(`${JSON.stringify(input)}\n`, "utf8");
      await writeFile(inputPath, inputBytes);
      const manifest = await readJson(manifestPath);
      const declaredInput = manifest.inputs.find(({ path: declaredPath }) =>
        declaredPath === "cases/evidence-gate.cli-positive.v1/input.json");
      declaredInput.sha256 = sha256(inputBytes);
      await writeJson(manifestPath, manifest);

      await assert.rejects(
        runProductFixtures({ repositoryRoot: ROOT, fixturesRoot }),
        rejectsWith("CLI_FIXTURE_ARGUMENTS_UNSAFE"),
      );
      assert.deepEqual(await readFile(sentinelPath), sentinel);
    });
  }
});

test("duplicate JSON keys fail closed before corpus execution", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const suitePath = path.join(fixturesRoot, "suite.json");
  const source = await readFile(suitePath, "utf8");
  await writeFile(
    suitePath,
    source.replace(
      '"schemaVersion":',
      '"schemaVersion":"duplicate-must-fail","schemaVersion":',
    ),
    "utf8",
  );

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("JSON_MALFORMED_OR_DUPLICATE"),
  );
});

test("unsorted suite identities fail closed", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const suitePath = path.join(fixturesRoot, "suite.json");
  const suite = await readJson(suitePath);
  suite.manifests.reverse();
  await writeJson(suitePath, suite);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("SUITE_MANIFESTS_UNSORTED_OR_DUPLICATE"),
  );
});

test("input digest drift fails closed", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const inputPath = path.join(
    fixturesRoot,
    "cases",
    "contracts.constants.v1",
    "input.json",
  );
  await writeFile(inputPath, '{"operation":"changed"}\n', "utf8");

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("INPUT_DIGEST_MISMATCH"),
  );
});

test("oracle digest drift fails closed", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const oraclePath = path.join(
    fixturesRoot,
    "cases",
    "contracts.constants.v1",
    "oracle.json",
  );
  await writeFile(oraclePath, '{"changed":true}\n', "utf8");

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("ORACLE_DIGEST_MISMATCH"),
  );
});

test("the committed inventory is exact deterministic LF output", async () => {
  const expected = await readFile(
    path.join(ROOT, "docs", "reference", "product-fixtures.md"),
    "utf8",
  );
  const first = await renderProductFixtureInventory();
  const second = await renderProductFixtureInventory();
  assert.equal(first, second);
  assert.equal(first, expected);
  assert.equal(first.includes("\r"), false);
  assert.equal(first.endsWith("\n"), true);
  assert.equal(first.endsWith("\n\n"), false);
});
