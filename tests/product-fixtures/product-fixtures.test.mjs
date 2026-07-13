import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  executeProductFixture,
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

async function createDirectoryLink(t, target, link) {
  try {
    await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    if (!["EACCES", "EINVAL", "ENOTSUP", "EPERM"].includes(error?.code)) throw error;
    t.skip(`directory links are unavailable: ${error.code}`);
    return false;
  }
}

async function copiedRepository(t, fixturesRoot) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "proofrail-repository-link-test-"));
  const repositoryRoot = path.join(temporaryRoot, "repository");
  await mkdir(repositoryRoot, { recursive: true });
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const suite = await readJson(path.join(fixturesRoot, "suite.json"));
  for (const manifestPath of suite.manifests) {
    const manifest = await readJson(path.join(fixturesRoot, manifestPath));
    for (const input of manifest.inputs.filter(({ origin }) => origin === "repository")) {
      const destination = path.join(repositoryRoot, ...input.path.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(ROOT, ...input.path.split("/")), destination);
    }
  }
  for (const packageName of [
    "contracts",
    "evidence-gate",
    "kernel",
    "release-orchestrator",
    "static-evaluator",
    "trusted-config",
  ]) {
    const destination = path.join(repositoryRoot, "packages", packageName, "package.json");
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(ROOT, "packages", packageName, "package.json"), destination);
  }
  return repositoryRoot;
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

test("the committed corpus runs exactly 49 fixtures in stable PASS order", async () => {
  const results = await runProductFixtures();
  assert.equal(results.length, 49);
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
  const coveragePath = path.join(fixturesRoot, "coverage-map.json");
  const coverage = await readJson(coveragePath);
  const boundary = coverage.surfaces.find(({ boundary: name }) => name === "static-evaluator-cli");
  boundary.fixtureIds = boundary.fixtureIds.filter((id) => id !== "static-evaluator.negative.v1");
  await writeJson(coveragePath, coverage);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("COVERAGE_CLASS_INCOMPLETE"),
  );
});

test("class coverage cannot be borrowed across operations on one export", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const coveragePath = path.join(fixturesRoot, "coverage-map.json");
  const coverage = await readJson(coveragePath);
  const boundary = coverage.surfaces.find(({ boundary: name }) => name === "strict-json-parser");
  boundary.fixtureIds = boundary.fixtureIds.filter((id) =>
    id !== "trusted-config.strict-json-adversarial.v1");
  await writeJson(coveragePath, coverage);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("COVERAGE_CLASS_INCOMPLETE"),
  );
});

test("paired class-label swaps within one operation fail closed", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const adversarialPath = path.join(
    fixturesRoot,
    "cases",
    "evidence-gate.cli-adversarial.v1",
    "manifest.json",
  );
  const malformedPath = path.join(
    fixturesRoot,
    "cases",
    "evidence-gate.cli-malformed.v1",
    "manifest.json",
  );
  const adversarial = await readJson(adversarialPath);
  const malformed = await readJson(malformedPath);
  [adversarial.class, malformed.class] = [malformed.class, adversarial.class];
  await writeJson(adversarialPath, adversarial);
  await writeJson(malformedPath, malformed);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("FIXTURE_CLASS_MISMATCH"),
  );
});

test("unknown fixture identities fail closed", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const manifestPath = path.join(
    fixturesRoot,
    "cases",
    "contracts.constants.v1",
    "manifest.json",
  );
  const manifest = await readJson(manifestPath);
  manifest.id = "contracts.unbound.v1";
  await writeJson(manifestPath, manifest);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("FIXTURE_ID_UNREGISTERED"),
  );
});

test("coordinated fixture id, class, path, and coverage relabeling fails closed", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const relabels = [
    {
      fixtureClass: "malformed",
      from: "evidence-gate.cli-adversarial.v1",
      to: "evidence-gate.cli-relabeled-malformed.v1",
    },
    {
      fixtureClass: "adversarial",
      from: "evidence-gate.cli-malformed.v1",
      to: "evidence-gate.cli-relabeled-adversarial.v1",
    },
  ];

  for (const { fixtureClass, from, to } of relabels) {
    const destination = path.join(fixturesRoot, "cases", to);
    await rename(path.join(fixturesRoot, "cases", from), destination);
    const manifestPath = path.join(destination, "manifest.json");
    const manifest = await readJson(manifestPath);
    manifest.id = to;
    manifest.class = fixtureClass;
    manifest.driverInput = manifest.driverInput.replace(from, to);
    manifest.inputs = manifest.inputs.map((input) => ({
      ...input,
      path: input.path.replace(from, to),
    }));
    manifest.oracle.path = manifest.oracle.path.replace(from, to);
    await writeJson(manifestPath, manifest);
  }

  const suitePath = path.join(fixturesRoot, "suite.json");
  const suite = await readJson(suitePath);
  suite.manifests = suite.manifests
    .map((manifestPath) => {
      const relabel = relabels.find(({ from }) => manifestPath.includes(from));
      return relabel ? manifestPath.replace(relabel.from, relabel.to) : manifestPath;
    })
    .sort();
  await writeJson(suitePath, suite);

  const coveragePath = path.join(fixturesRoot, "coverage-map.json");
  const coverage = await readJson(coveragePath);
  for (const record of coverage.surfaces) {
    record.fixtureIds = record.fixtureIds
      .map((fixtureId) => relabels.find(({ from }) => from === fixtureId)?.to ?? fixtureId)
      .sort();
  }
  await writeJson(coveragePath, coverage);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("FIXTURE_ID_UNREGISTERED"),
  );
});

test("registered fixture identities are bound to their exact manifest paths", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const adversarialPath = path.join(
    fixturesRoot,
    "cases",
    "evidence-gate.cli-adversarial.v1",
    "manifest.json",
  );
  const malformedPath = path.join(
    fixturesRoot,
    "cases",
    "evidence-gate.cli-malformed.v1",
    "manifest.json",
  );
  const adversarial = await readJson(adversarialPath);
  const malformed = await readJson(malformedPath);
  [adversarial.id, malformed.id] = [malformed.id, adversarial.id];
  [adversarial.class, malformed.class] = [malformed.class, adversarial.class];
  await writeJson(adversarialPath, adversarial);
  await writeJson(malformedPath, malformed);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("MANIFEST_ID_PATH_MISMATCH"),
  );
});

test("the fixture registry cannot contain an identity absent from the corpus", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const fixtureId = "evidence-gate.cli-positive.v1";
  const suitePath = path.join(fixturesRoot, "suite.json");
  const suite = await readJson(suitePath);
  suite.manifests = suite.manifests.filter((manifestPath) => !manifestPath.includes(fixtureId));
  await writeJson(suitePath, suite);
  await rm(path.join(fixturesRoot, "cases", fixtureId), { recursive: true });

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot: ROOT, fixturesRoot }),
    rejectsWith("FIXTURE_REGISTRY_DRIFT"),
  );
});

test("repository inputs cannot escape through an ancestor link", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const repositoryRoot = await copiedRepository(t, fixturesRoot);
  const outsideRoot = path.join(path.dirname(repositoryRoot), "outside");
  await mkdir(outsideRoot, { recursive: true });

  const outsideBytes = await readFile(path.join(ROOT, "examples", "static-evaluator", "input.json"));
  await writeFile(path.join(outsideRoot, "input.json"), outsideBytes);
  if (!await createDirectoryLink(t, outsideRoot, path.join(repositoryRoot, "linked"))) return;

  const manifestPath = path.join(
    fixturesRoot,
    "cases",
    "static-evaluator.positive.v1",
    "manifest.json",
  );
  const manifest = await readJson(manifestPath);
  const repositoryInput = manifest.inputs.find(({ origin }) => origin === "repository");
  repositoryInput.path = "linked/input.json";
  repositoryInput.sha256 = sha256(outsideBytes);
  await writeJson(manifestPath, manifest);

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot, fixturesRoot }),
    rejectsWith("REPOSITORY_INPUT_ESCAPE"),
  );
});

test("package manifest reads cannot escape through an ancestor link", async (t) => {
  const fixturesRoot = await copiedCorpus(t);
  const repositoryRoot = await copiedRepository(t, fixturesRoot);
  const outsidePackage = path.join(path.dirname(repositoryRoot), "outside-package");
  await mkdir(outsidePackage, { recursive: true });
  await copyFile(
    path.join(ROOT, "packages", "contracts", "package.json"),
    path.join(outsidePackage, "package.json"),
  );
  await rm(path.join(repositoryRoot, "packages", "contracts"), { recursive: true });
  if (!await createDirectoryLink(
    t,
    outsidePackage,
    path.join(repositoryRoot, "packages", "contracts"),
  )) return;

  await assert.rejects(
    loadProductFixtureCorpus({ repositoryRoot, fixturesRoot }),
    rejectsWith("REPOSITORY_INPUT_ESCAPE"),
  );
});

test("fixture CLI scripts cannot execute through an ancestor link", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "proofrail-cli-link-test-"));
  const repositoryRoot = path.join(temporaryRoot, "repository");
  const fixturesRoot = path.join(temporaryRoot, "fixtures");
  const outsideSource = path.join(temporaryRoot, "outside-source");
  const sentinelPath = path.join(temporaryRoot, "sentinel.txt");
  const sentinel = Buffer.from("unchanged\n", "utf8");
  await mkdir(path.join(repositoryRoot, "packages", "evidence-gate"), { recursive: true });
  await mkdir(fixturesRoot, { recursive: true });
  await mkdir(outsideSource, { recursive: true });
  await writeFile(sentinelPath, sentinel);
  await writeFile(
    path.join(outsideSource, "cli.mjs"),
    `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(sentinelPath)}, "executed\\n");\n`,
    "utf8",
  );
  await writeJson(path.join(fixturesRoot, "driver.json"), {
    arguments: ["--input", "{input}"],
    payload: { kind: "json", value: {} },
  });
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  if (!await createDirectoryLink(
    t,
    outsideSource,
    path.join(repositoryRoot, "packages", "evidence-gate", "src"),
  )) return;

  const error = await executeProductFixture({
    driverInput: "driver.json",
    id: "synthetic.cli-positive.v1",
    inputs: [],
    operation: "evidence-gate.static-cli",
  }, {
    fixturesRoot,
    repositoryRoot,
  }).then(() => null, (caught) => caught);

  assert.deepEqual(await readFile(sentinelPath), sentinel);
  assert.equal(error?.code, "REPOSITORY_INPUT_ESCAPE");
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

test("ambient Node execution options do not reach spawned fixture CLIs", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "proofrail-product-env-test-"));
  const hookPath = path.join(temporaryRoot, "ambient-hook.cjs");
  const sentinelPath = path.join(temporaryRoot, "ambient-hook-ran.txt");
  await writeFile(
    hookPath,
    `require("node:fs").writeFileSync(${JSON.stringify(sentinelPath)}, "ambient hook ran\\n");\n`,
    "utf8",
  );
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const previousNodeOptions = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = `--require ${JSON.stringify(hookPath)}`;
  try {
    const results = await runProductFixtures();
    assert.equal(results.length, 49);
    await assert.rejects(access(sentinelPath), ({ code }) => code === "ENOENT");
  } finally {
    if (previousNodeOptions === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = previousNodeOptions;
  }
});

test("the runner controls staged CLI output and observes it separately from stdout", async (t) => {
  const fixturesRoot = await mkdtemp(path.join(os.tmpdir(), "proofrail-product-output-test-"));
  t.after(() => rm(fixturesRoot, { force: true, recursive: true }));
  await writeJson(path.join(fixturesRoot, "driver.json"), {
    arguments: ["--input", "{input}", "--output", "{output}"],
    payload: { kind: "repository-file", path: "examples/evidence-gate/input.json" },
  });
  const outcome = await executeProductFixture({
    driverInput: "driver.json",
    id: "synthetic.output-positive.v1",
    inputs: [{ origin: "repository", path: "examples/evidence-gate/input.json" }],
    operation: "evidence-gate.static-cli",
  }, {
    fixturesRoot,
    repositoryRoot: ROOT,
  });

  assert.equal(outcome.result.exitCode, 0);
  assert.deepEqual(outcome.result.stdout, {
    bytes: 0,
    endsWithLf: false,
    sha256: "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    text: "",
  });
  assert.equal(outcome.result.output.exists, true);
  assert.equal(outcome.result.output.endsWithLf, true);
  assert.equal(outcome.result.output.bytes > 0, true);
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
