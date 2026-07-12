import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

const MAX_DOCUMENT_BYTES = 256 * 1024;
const SHA256_PATTERN = /^[0-9A-F]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const REQUIRED_FACT_KEYS = Object.freeze([
  "checks.allReportedSuccessful",
  "checks.minimumCountSatisfied",
  "collection.changedFilesComplete",
  "scope.changedPathsWithinDeclaredWriteScope",
  "target.baseSha",
  "target.headSha",
  "target.isDraft",
  "target.pullRequestNumber",
  "target.repository",
  "target.state",
]);
const VALIDATED_CONFIGURATIONS = new WeakSet();

export class TrustedConfigurationError extends Error {
  constructor(code) {
    super(`TRUSTED_CONFIG_${code}`);
    this.name = "TrustedConfigurationError";
    this.code = code;
  }
}

export async function loadTrustedReleaseConfiguration({
  trustedConfigurationPath,
  repositoryRoot,
}) {
  if (typeof trustedConfigurationPath !== "string" || trustedConfigurationPath === ""
      || typeof repositoryRoot !== "string" || repositoryRoot === "") {
    fail("INVALID_ARGUMENT");
  }

  const root = await resolveRoot(repositoryRoot);
  const configurationDocument = await readDocument(root, trustedConfigurationPath);
  const trustedConfiguration = parseStrictJson(configurationDocument.text);
  validateTrustedConfiguration(trustedConfiguration);

  const policyDocument = await readDocument(root, trustedConfiguration.policy.path);
  const evidenceContractDocument = await readDocument(root, trustedConfiguration.evidenceContract.path);
  assertDistinctDocuments([
    configurationDocument,
    policyDocument,
    evidenceContractDocument,
  ]);

  if (digest(policyDocument.bytes) !== trustedConfiguration.policy.sha256
      || digest(evidenceContractDocument.bytes) !== trustedConfiguration.evidenceContract.sha256) {
    fail("HASH_MISMATCH");
  }

  const policy = parseStrictJson(policyDocument.text);
  const evidenceContract = parseStrictJson(evidenceContractDocument.text);
  validatePolicy(policy);
  validateEvidenceContract(evidenceContract);
  validateReferences(trustedConfiguration, policy, evidenceContract);

  const result = deepFreeze({
    trustedConfiguration,
    policy,
    evidenceContract,
    identities: {
      trustedConfigurationSha256: digest(configurationDocument.bytes),
      policySha256: digest(policyDocument.bytes),
      evidenceContractSha256: digest(evidenceContractDocument.bytes),
    },
  });
  VALIDATED_CONFIGURATIONS.add(result);
  return result;
}

export function assertValidatedReleaseConfiguration(value) {
  if (!value || typeof value !== "object" || !VALIDATED_CONFIGURATIONS.has(value)) {
    fail("UNVALIDATED_CONFIGURATION");
  }
  return value;
}

export function parseStrictJson(source) {
  if (typeof source !== "string") fail("MALFORMED_JSON");
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    fail("MALFORMED_JSON");
  }
  try {
    assertNoDuplicateObjectKeys(source);
  } catch (error) {
    if (error instanceof TrustedConfigurationError) throw error;
    fail("MALFORMED_JSON");
  }
  return value;
}

async function resolveRoot(repositoryRoot) {
  const resolved = path.resolve(repositoryRoot);
  let canonical;
  try {
    canonical = await realpath(resolved);
  } catch {
    fail("ROOT_INVALID");
  }
  if (!samePath(resolved, canonical)) fail("ROOT_ALIAS");
  return canonical;
}

async function readDocument(root, selectedPath) {
  if (!isSafeSelectedPath(selectedPath)) fail("PATH_INVALID");
  const resolved = path.isAbsolute(selectedPath)
    ? path.resolve(selectedPath)
    : path.resolve(root, selectedPath);
  if (!isWithin(root, resolved)) fail("PATH_INVALID");

  let details;
  try {
    details = await lstat(resolved, { bigint: true });
  } catch {
    fail("READ_FAILED");
  }
  if (!details.isFile() || details.isSymbolicLink()) fail("NOT_REGULAR");

  let canonical;
  try {
    canonical = await realpath(resolved);
  } catch {
    fail("READ_FAILED");
  }
  if (!samePath(resolved, canonical) || !isWithin(root, canonical)) fail("FILE_ALIAS");

  let handle;
  try {
    handle = await open(canonical, "r");
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile()) fail("NOT_REGULAR");
    if ((details.dev !== 0n || details.ino !== 0n)
        && (details.dev !== opened.dev || details.ino !== opened.ino)) fail("FILE_ALIAS");
    if (opened.size > BigInt(MAX_DOCUMENT_BYTES)) fail("TOO_LARGE");
    const buffer = Buffer.allocUnsafe(MAX_DOCUMENT_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > MAX_DOCUMENT_BYTES) fail("TOO_LARGE");
    const bytes = Buffer.from(buffer.subarray(0, length));
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
      fail("INVALID_UTF8");
    }
    return {
      bytes,
      text,
      realPath: canonical,
      dev: opened.dev,
      ino: opened.ino,
    };
  } catch (error) {
    if (error instanceof TrustedConfigurationError) throw error;
    fail("READ_FAILED");
  } finally {
    await handle?.close().catch(() => {});
  }
}

function validateTrustedConfiguration(value) {
  exactObject(value, [
    "schemaVersion", "id", "version", "authorizationEventId", "issuerActorId",
    "releaseDeciderActorId", "independentReviewerActorId", "target", "observer",
    "claim", "declaredWriteScope", "policy", "evidenceContract", "executionBoundary",
    "kernel", "output",
  ]);
  constant(value.schemaVersion, "proofrail.trusted-configuration.v1");
  strings(value, ["id", "version", "authorizationEventId", "issuerActorId", "releaseDeciderActorId", "independentReviewerActorId"]);
  if (value.independentReviewerActorId === value.issuerActorId
      || value.independentReviewerActorId === value.releaseDeciderActorId) fail("SCHEMA_INVALID");

  exactObject(value.target, ["kind", "repository", "pullRequestNumber", "baseRefName", "baseSha", "headSha", "targetScopeId"]);
  constant(value.target.kind, "GITHUB_PULL_REQUEST");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.target.repository)
      || !Number.isSafeInteger(value.target.pullRequestNumber) || value.target.pullRequestNumber < 1
      || !COMMIT_PATTERN.test(value.target.baseSha) || !COMMIT_PATTERN.test(value.target.headSha)) fail("SCHEMA_INVALID");
  strings(value.target, ["baseRefName", "targetScopeId"]);

  exactObject(value.observer, ["id", "version", "sourceInputId"]);
  strings(value.observer, ["id", "version", "sourceInputId"]);
  exactObject(value.claim, ["id", "targetScopeId", "statement"]);
  strings(value.claim, ["id", "targetScopeId", "statement"]);
  if (value.claim.targetScopeId !== value.target.targetScopeId) fail("REFERENCE_MISMATCH");

  stringArray(value.declaredWriteScope, true);
  if (value.declaredWriteScope.some((entry) => !isSafeRepositoryPattern(entry))) fail("SCHEMA_INVALID");
  artifactReference(value.policy);
  artifactReference(value.evidenceContract);
  if (value.policy.path !== "config/policies/proofrail-ai-pr-github-ci-v1.json"
      || value.evidenceContract.path !== "config/evidence-contracts/proofrail-ai-pr-github-ci-v1.json") fail("REFERENCE_MISMATCH");

  exactObject(value.executionBoundary, ["githubRead", "githubWrite", "networkPolicy", "credentialPolicy", "targetCheckout", "targetRepositoryContentRead", "targetCommandExecution", "verificationCommandExecution", "modelExecution"]);
  constant(value.executionBoundary.githubRead, true);
  constant(value.executionBoundary.githubWrite, false);
  constant(value.executionBoundary.networkPolicy, "GITHUB_READ_ONLY_VIA_INSTALLED_GH");
  constant(value.executionBoundary.credentialPolicy, "USE_EXISTING_GH_AUTHENTICATION_WITHOUT_INSPECTION_OR_PERSISTENCE");
  for (const key of ["targetCheckout", "targetRepositoryContentRead", "targetCommandExecution", "verificationCommandExecution", "modelExecution"]) constant(value.executionBoundary[key], false);

  exactObject(value.kernel, ["inputSchemaVersion", "bundleSchemaVersion", "engineVersion", "maximumInvocationCount"]);
  constant(value.kernel.inputSchemaVersion, "proofrail.kernel.input.phase1.v1");
  constant(value.kernel.bundleSchemaVersion, "proofrail.evidence-bundle.phase1.v1");
  constant(value.kernel.engineVersion, "0.1.0-phase1");
  constant(value.kernel.maximumInvocationCount, 1);
  exactObject(value.output, ["kind", "format", "publicationBoundary"]);
  constant(value.output.kind, "FINALIZED_EVIDENCE_BUNDLE");
  constant(value.output.format, "CANONICAL_JSON_LF");
  constant(value.output.publicationBoundary, "EXISTING_STAGED_OUTPUT");
}

function validatePolicy(value) {
  exactObject(value, ["schemaVersion", "id", "version", "authorizationEventId", "targetScopeId", "evidenceContract", "requiredCheckPolicy", "rules"]);
  constant(value.schemaVersion, "proofrail.policy.v1");
  strings(value, ["id", "version", "authorizationEventId", "targetScopeId"]);
  exactObject(value.evidenceContract, ["id", "version"]);
  strings(value.evidenceContract, ["id", "version"]);
  exactObject(value.requiredCheckPolicy, ["minimumReportedChecks", "requireAllReportedChecksSuccessful", "acceptedCheckRunConclusions", "acceptedStatusContextStates"]);
  if (!Number.isSafeInteger(value.requiredCheckPolicy.minimumReportedChecks)
      || value.requiredCheckPolicy.minimumReportedChecks < 1) fail("SCHEMA_INVALID");
  constant(value.requiredCheckPolicy.requireAllReportedChecksSuccessful, true);
  enumArray(value.requiredCheckPolicy.acceptedCheckRunConclusions, ["NEUTRAL", "SKIPPED", "SUCCESS"]);
  enumArray(value.requiredCheckPolicy.acceptedStatusContextStates, ["SUCCESS"]);
  if (!Array.isArray(value.rules)) fail("SCHEMA_INVALID");
  const ruleIds = new Set();
  for (const rule of value.rules) {
    exactObject(rule, ["id", "predicate", "effect", "authority"]);
    nonempty(rule.id);
    if (ruleIds.has(rule.id)) fail("DUPLICATE_IDENTITY");
    ruleIds.add(rule.id);
    exactObject(rule.predicate, ["kind", "evidenceRequirementId"]);
    if (!["EVIDENCE_ABSENT", "EVIDENCE_PRESENT"].includes(rule.predicate.kind)) fail("SCHEMA_INVALID");
    nonempty(rule.predicate.evidenceRequirementId);
    exactObject(rule.effect, ["kind", "reasonCode"]);
    constant(rule.effect.kind, "DENY");
    nonempty(rule.effect.reasonCode);
    exactObject(rule.authority, ["source", "policyId", "policyVersion"]);
    constant(rule.authority.source, "POLICY");
    constant(rule.authority.policyId, value.id);
    constant(rule.authority.policyVersion, value.version);
  }
}

function validateEvidenceContract(value) {
  exactObject(value, ["schemaVersion", "id", "version", "authorizationEventId", "targetScopeId", "selectionProvenance", "requirements"]);
  constant(value.schemaVersion, "proofrail.evidence-contract.v1");
  strings(value, ["id", "version", "authorizationEventId", "targetScopeId"]);
  exactObject(value.selectionProvenance, ["source", "configurationId", "configurationVersion"]);
  constant(value.selectionProvenance.source, "TRUSTED_CONFIGURATION");
  strings(value.selectionProvenance, ["configurationId", "configurationVersion"]);
  if (!Array.isArray(value.requirements) || value.requirements.length === 0) fail("SCHEMA_INVALID");
  const ids = new Set();
  const factKeys = [];
  for (const requirement of value.requirements) {
    exactObject(requirement, ["id", "targetScopeId", "requiredObserver", "factKey", "expectedValue"]);
    strings(requirement, ["id", "targetScopeId", "factKey"]);
    if (ids.has(requirement.id)) fail("DUPLICATE_IDENTITY");
    ids.add(requirement.id);
    exactObject(requirement.requiredObserver, ["id", "version"]);
    strings(requirement.requiredObserver, ["id", "version"]);
    if (!isJsonPrimitive(requirement.expectedValue)) fail("SCHEMA_INVALID");
    factKeys.push(requirement.factKey);
  }
  if (!sameSortedValues([...factKeys].sort(), [...REQUIRED_FACT_KEYS].sort())) fail("SCHEMA_INVALID");
}

function validateReferences(configuration, policy, evidenceContract) {
  const event = configuration.authorizationEventId;
  if (policy.authorizationEventId !== event || evidenceContract.authorizationEventId !== event
      || configuration.policy.id !== policy.id || configuration.policy.version !== policy.version
      || configuration.evidenceContract.id !== evidenceContract.id
      || configuration.evidenceContract.version !== evidenceContract.version
      || policy.evidenceContract.id !== evidenceContract.id
      || policy.evidenceContract.version !== evidenceContract.version
      || policy.targetScopeId !== configuration.target.targetScopeId
      || evidenceContract.targetScopeId !== configuration.target.targetScopeId
      || evidenceContract.selectionProvenance.configurationId !== configuration.id
      || evidenceContract.selectionProvenance.configurationVersion !== configuration.version) fail("REFERENCE_MISMATCH");

  const requirementIds = new Set(evidenceContract.requirements.map(({ id }) => id));
  for (const requirement of evidenceContract.requirements) {
    if (requirement.targetScopeId !== configuration.target.targetScopeId
        || requirement.requiredObserver.id !== configuration.observer.id
        || requirement.requiredObserver.version !== configuration.observer.version) fail("REFERENCE_MISMATCH");
  }
  if (policy.rules.some(({ predicate }) => !requirementIds.has(predicate.evidenceRequirementId))) fail("REFERENCE_MISMATCH");

  const expectedByFact = new Map(evidenceContract.requirements.map(({ factKey, expectedValue }) => [factKey, expectedValue]));
  if (expectedByFact.get("target.repository") !== configuration.target.repository
      || expectedByFact.get("target.pullRequestNumber") !== configuration.target.pullRequestNumber
      || expectedByFact.get("target.baseSha") !== configuration.target.baseSha
      || expectedByFact.get("target.headSha") !== configuration.target.headSha
      || expectedByFact.get("target.state") !== "MERGED"
      || expectedByFact.get("target.isDraft") !== false) fail("REFERENCE_MISMATCH");
  const expectedSource = `github:${configuration.target.repository}#${configuration.target.pullRequestNumber}@${configuration.target.headSha}`;
  if (configuration.observer.sourceInputId !== expectedSource) fail("REFERENCE_MISMATCH");
}

function artifactReference(value) {
  exactObject(value, ["id", "version", "path", "sha256"]);
  strings(value, ["id", "version", "path", "sha256"]);
  if (!SHA256_PATTERN.test(value.sha256) || !isSafeRepositoryPattern(value.path) || path.isAbsolute(value.path)) fail("SCHEMA_INVALID");
}

function exactObject(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("SCHEMA_INVALID");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (!sameSortedValues(actual, expected)) fail("SCHEMA_INVALID");
}

function strings(value, keys) {
  for (const key of keys) nonempty(value[key]);
}

function nonempty(value) {
  if (typeof value !== "string" || value.trim() === "") fail("SCHEMA_INVALID");
}

function constant(value, expected) {
  if (!Object.is(value, expected)) fail("SCHEMA_INVALID");
}

function stringArray(value, requireValues) {
  if (!Array.isArray(value) || (requireValues && value.length === 0)
      || value.some((entry) => typeof entry !== "string" || entry === "")
      || new Set(value).size !== value.length) fail("SCHEMA_INVALID");
}

function enumArray(value, allowed) {
  stringArray(value, true);
  if (value.some((entry) => !allowed.includes(entry))) fail("SCHEMA_INVALID");
}

function assertDistinctDocuments(documents) {
  for (let left = 0; left < documents.length; left += 1) {
    for (let right = left + 1; right < documents.length; right += 1) {
      const a = documents[left];
      const b = documents[right];
      if (samePath(a.realPath, b.realPath)
          || ((a.dev !== 0n || a.ino !== 0n) && a.dev === b.dev && a.ino === b.ino)) fail("FILE_ALIAS");
    }
  }
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function isSafeSelectedPath(value) {
  return typeof value === "string" && value !== "" && value.length <= 4096
    && !/[\u0000-\u001f\u007f]/.test(value) && !value.includes("\\");
}

function isSafeRepositoryPattern(value) {
  if (!isSafeSelectedPath(value) || value !== value.trim()) return false;
  const prefix = value.endsWith("/**") ? value.slice(0, -3) : value;
  return prefix !== "" && !prefix.includes("*")
    && prefix.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function samePath(left, right) {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

function isJsonPrimitive(value) {
  return value === null || typeof value === "string" || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value));
}

function sameSortedValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertNoDuplicateObjectKeys(source) {
  let cursor = 0;
  const skip = () => { while (/\s/.test(source[cursor] ?? "")) cursor += 1; };
  const stringEnd = () => {
    let escaped = false;
    for (cursor += 1; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") { cursor += 1; return; }
    }
  };
  const value = () => {
    skip();
    if (source[cursor] === "{") {
      cursor += 1;
      skip();
      const keys = new Set();
      while (source[cursor] !== "}") {
        const start = cursor;
        stringEnd();
        const key = JSON.parse(source.slice(start, cursor));
        if (keys.has(key)) fail("DUPLICATE_KEY");
        keys.add(key);
        skip();
        cursor += 1;
        value();
        skip();
        if (source[cursor] === ",") { cursor += 1; skip(); }
        else break;
      }
      cursor += 1;
      return;
    }
    if (source[cursor] === "[") {
      cursor += 1;
      skip();
      while (source[cursor] !== "]") {
        value();
        skip();
        if (source[cursor] === ",") { cursor += 1; skip(); }
        else break;
      }
      cursor += 1;
      return;
    }
    if (source[cursor] === "\"") { stringEnd(); return; }
    while (cursor < source.length && !/[\s,}\]]/.test(source[cursor])) cursor += 1;
  };
  value();
  skip();
  if (cursor !== source.length) fail("MALFORMED_JSON");
}

function fail(code) {
  throw new TrustedConfigurationError(code);
}
