import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import {
  assertValidatedReleaseConfiguration,
  loadTrustedReleaseConfiguration,
  parseStrictJson,
  TrustedConfigurationError,
} from "../../packages/trusted-config/src/index.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CONFIG_PATH = "config/trusted/proofrail-release-v0.1.json";
const POLICY_PATH = "config/policies/proofrail-ai-pr-github-ci-v1.json";
const EVIDENCE_PATH = "config/evidence-contracts/proofrail-ai-pr-github-ci-v1.json";

test("the supplied product documents satisfy their machine-readable schemas", async () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const cases = [
    ["schemas/product/trusted-configuration.schema.json", CONFIG_PATH],
    ["schemas/product/policy.schema.json", POLICY_PATH],
    ["schemas/product/evidence-contract.schema.json", EVIDENCE_PATH],
  ];
  for (const [schemaPath, documentPath] of cases) {
    const schema = JSON.parse(await readFile(path.join(ROOT, schemaPath), "utf8"));
    const document = JSON.parse(await readFile(path.join(ROOT, documentPath), "utf8"));
    assert.equal(ajv.compile(schema)(document), true, `${documentPath} must satisfy ${schemaPath}`);
  }
});

test("loads exact supplied bytes and returns a deeply frozen validated configuration", async () => {
  const loaded = await loadTrustedReleaseConfiguration({
    trustedConfigurationPath: CONFIG_PATH,
    repositoryRoot: ROOT,
  });
  assert.equal(loaded.identities.trustedConfigurationSha256, "3C4C074BB54F2330D52378DB1249BC39D55A3F7858A1890DC821FC136BF60118");
  assert.equal(loaded.identities.policySha256, "88CDCC070F194676EACE26FFAA56CD9F1984C0BE3F5B0F13ECBD19926891A7EE");
  assert.equal(loaded.identities.evidenceContractSha256, "FC89E3383F80A02EB01C6DDAFCD92D8C6AFC2101043C8268749C691D11AF8E45");
  assert.equal(assertValidatedReleaseConfiguration(loaded), loaded);
  assert(Object.isFrozen(loaded));
  assert(Object.isFrozen(loaded.trustedConfiguration.target));
  assert(Object.isFrozen(loaded.evidenceContract.requirements));
});

test("does not accept caller-constructed data as validated configuration", () => {
  assert.throws(
    () => assertValidatedReleaseConfiguration({}),
    (error) => fixedError(error, "UNVALIDATED_CONFIGURATION"),
  );
});

test("rejects malformed JSON and duplicate keys at any depth without disclosure", () => {
  assert.throws(() => parseStrictJson("{"), (error) => fixedError(error, "MALFORMED_JSON"));
  assert.throws(
    () => parseStrictJson('{"outer":{"secret":"do-not-echo","secret":"again"}}'),
    (error) => fixedError(error, "DUPLICATE_KEY") && !error.message.includes("do-not-echo"),
  );
});

test("rejects unknown fields in trusted configuration", async (t) => {
  const fixture = await createFixture(t);
  await mutateJson(fixture, CONFIG_PATH, (value) => ({ ...value, unexpected: true }));
  await assertLoadFails(fixture, "SCHEMA_INVALID");
});

test("rejects policy hash drift before parsing policy authority", async (t) => {
  const fixture = await createFixture(t);
  await writeFile(path.join(fixture, POLICY_PATH), "{}\n");
  await assertLoadFails(fixture, "HASH_MISMATCH");
});

test("rejects policy version and evidence selection drift", async (t) => {
  const fixture = await createFixture(t);
  await mutateArtifact(fixture, POLICY_PATH, (value) => ({ ...value, version: "2.0.0" }));
  await assertLoadFails(fixture, "REFERENCE_MISMATCH");

  const second = await createFixture(t);
  await mutateArtifact(second, EVIDENCE_PATH, (value) => ({
    ...value,
    selectionProvenance: { ...value.selectionProvenance, configurationVersion: "9.9.9" },
  }));
  await assertLoadFails(second, "REFERENCE_MISMATCH");
});

test("rejects stale configured base or head identity against the selected Evidence Contract", async (t) => {
  for (const key of ["baseSha", "headSha"]) {
    const fixture = await createFixture(t);
    await mutateJson(fixture, CONFIG_PATH, (value) => ({
      ...value,
      target: { ...value.target, [key]: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    }));
    await assertLoadFails(fixture, "REFERENCE_MISMATCH");
  }
});

test("rejects unknown nested fields and duplicate stable identities", async (t) => {
  const fixture = await createFixture(t);
  await mutateArtifact(fixture, EVIDENCE_PATH, (value) => ({
    ...value,
    requirements: value.requirements.map((requirement, index) => index === 0
      ? { ...requirement, hiddenAuthority: true }
      : requirement),
  }));
  await assertLoadFails(fixture, "SCHEMA_INVALID");

  const second = await createFixture(t);
  await mutateArtifact(second, EVIDENCE_PATH, (value) => ({
    ...value,
    requirements: value.requirements.map((requirement, index) => index === 1
      ? { ...requirement, id: value.requirements[0].id }
      : requirement),
  }));
  await assertLoadFails(second, "DUPLICATE_IDENTITY");
});

test("rejects duplicate nested policy keys after matching the exact changed bytes", async (t) => {
  const fixture = await createFixture(t);
  const policyFile = path.join(fixture, POLICY_PATH);
  const source = await readFile(policyFile, "utf8");
  const changed = source.replace(
    '  "evidenceContract": {',
    '  "targetScopeId": "scope.github-pr.gogun-rgb-proofrail.27",\n  "evidenceContract": {',
  );
  await writeFile(policyFile, changed);
  await setArtifactHash(fixture, "policy", digest(Buffer.from(changed)));
  await assertLoadFails(fixture, "DUPLICATE_KEY");
});

test("rejects oversized and invalid UTF-8 authority documents", async (t) => {
  const fixture = await createFixture(t);
  const oversized = Buffer.alloc(256 * 1024 + 1, 0x20);
  await writeFile(path.join(fixture, POLICY_PATH), oversized);
  await setArtifactHash(fixture, "policy", digest(oversized));
  await assertLoadFails(fixture, "TOO_LARGE");

  const second = await createFixture(t);
  const invalid = Buffer.from([0xff, 0xfe, 0xfd]);
  await writeFile(path.join(second, POLICY_PATH), invalid);
  await setArtifactHash(second, "policy", digest(invalid));
  await assertLoadFails(second, "INVALID_UTF8");
});

test("rejects unsafe configured paths before reading outside the repository", async (t) => {
  const fixture = await createFixture(t);
  await mutateJson(fixture, CONFIG_PATH, (value) => ({
    ...value,
    policy: { ...value.policy, path: "../outside.json" },
  }));
  await assertLoadFails(fixture, "SCHEMA_INVALID");
});

test("rejects hardlink aliases between selected authority documents", async (t) => {
  const fixture = await createFixture(t);
  const evidenceFile = path.join(fixture, EVIDENCE_PATH);
  await rm(evidenceFile);
  await link(path.join(fixture, POLICY_PATH), evidenceFile);
  const policyBytes = await readFile(path.join(fixture, POLICY_PATH));
  await setArtifactHash(fixture, "evidenceContract", digest(policyBytes));
  await assertLoadFails(fixture, "FILE_ALIAS");
});

test("rejects symbolic-link authority documents without following them", async (t) => {
  const fixture = await createFixture(t);
  const target = path.join(fixture, "outside-policy.json");
  await copyFile(path.join(fixture, POLICY_PATH), target);
  await rm(path.join(fixture, POLICY_PATH));
  try {
    await symlink(target, path.join(fixture, POLICY_PATH), "file");
  } catch (error) {
    if (process.platform === "win32" && ["EACCES", "EPERM"].includes(error?.code)) {
      t.skip(`symbolic-link construction unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assertLoadFails(fixture, "NOT_REGULAR");
});

async function createFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "proofrail-trusted-config-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const relativePath of [CONFIG_PATH, POLICY_PATH, EVIDENCE_PATH]) {
    await mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
    await copyFile(path.join(ROOT, relativePath), path.join(root, relativePath));
  }
  return root;
}

async function mutateArtifact(root, relativePath, update) {
  await mutateJson(root, relativePath, update);
  const key = relativePath === POLICY_PATH ? "policy" : "evidenceContract";
  await setArtifactHash(root, key, digest(await readFile(path.join(root, relativePath))));
}

async function mutateJson(root, relativePath, update) {
  const file = path.join(root, relativePath);
  const value = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, `${JSON.stringify(update(value), null, 2)}\n`);
}

async function setArtifactHash(root, key, sha256) {
  await mutateJson(root, CONFIG_PATH, (value) => ({
    ...value,
    [key]: { ...value[key], sha256 },
  }));
}

async function assertLoadFails(root, code) {
  await assert.rejects(
    loadTrustedReleaseConfiguration({ trustedConfigurationPath: CONFIG_PATH, repositoryRoot: root }),
    (error) => fixedError(error, code),
  );
}

function fixedError(error, code) {
  return error instanceof TrustedConfigurationError
    && error.code === code
    && error.message === `TRUSTED_CONFIG_${code}`;
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}
