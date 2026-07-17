import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { isAlias, parseAllDocuments, visit } from "yaml";

const MAX_DOCUMENT_BYTES = 256 * 1024;
const MAX_MARKET_SCOPE_PATTERNS = 256;
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
const VALIDATED_MARKET_CONFIGURATIONS = new WeakSet();
const MARKET_AUTHORITY_SHA256 = "7A76DCA50F3F76167EA92F5AF68D64ACFCE8539C03EAE20262876F5D6423A683";
const MARKET_POLICY_SHA256 = "C4AFB49EE70B3701837DF8ACC65427A180CF0453ABA773265B9DFC159E11CC1F";
const MARKET_EVIDENCE_SHA256 = "C195378ECDDDAE3FDE703EFC6A9A9C052A09683F68CF3490D2730A71F1B84C61";
const MARKET_EVENT = "operator-event:product-market-001-runtime-authority-v1";
const MARKET_PRESETS = Object.freeze(["ai-pr-strict", "dependency-update", "docs-only", "typescript-basic"]);
const MARKET_ALLOWED_ENVIRONMENT_NAMES = Object.freeze(["CI", "HOME", "LANG", "PATH", "RUNNER_ARCH", "RUNNER_OS", "SHELL", "TEMP", "TMP", "TMPDIR"]);
const MARKET_DENIED_ENVIRONMENT_NAMES = Object.freeze(["ACTIONS_ID_TOKEN_REQUEST_TOKEN", "ACTIONS_RUNTIME_TOKEN", "GH_TOKEN", "GITHUB_TOKEN", "NODE_AUTH_TOKEN", "NODE_OPTIONS", "NPM_CONFIG_USERCONFIG", "PNPM_HOME", "YARN_NPM_AUTH_TOKEN"]);
const MARKET_PRESET_EXPECTATIONS = Object.freeze({
  "typescript-basic": {
    scope: { allowed: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx", "package.json", "pnpm-lock.yaml", "tsconfig.json"], denied: [".github/**", "**/*.pem", "**/*.key"] },
    verification: { timeoutMinutes: 30, maximumOutputBytes: 1048576, commands: [{ name: "frozen-install", run: "pnpm install --frozen-lockfile", timeoutMinutes: 10 }, { name: "typecheck", run: "pnpm typecheck", timeoutMinutes: 10 }, { name: "test", run: "pnpm test", timeoutMinutes: 10 }] },
    reviews: { minimumApprovals: 1, requireExactHeadApproval: true, blockChangesRequested: true },
    reportedChecks: { requireSuccess: true, minimumCount: 1 },
    output: { uploadEvidenceBundle: true, includeCommandPreview: true, strict: true },
    telemetry: { enabled: true },
  },
  "ai-pr-strict": {
    scope: { allowed: ["src/**", "packages/**", "tests/**", "package.json", "pnpm-lock.yaml", "tsconfig.json"], denied: [".github/**", "config/trusted/**", "config/policies/**", "config/evidence-contracts/**", "**/*.pem", "**/*.key"] },
    verification: { timeoutMinutes: 60, maximumOutputBytes: 1048576, commands: [{ name: "frozen-install", run: "pnpm install --frozen-lockfile", timeoutMinutes: 10 }, { name: "lint", run: "pnpm lint", timeoutMinutes: 10 }, { name: "typecheck", run: "pnpm typecheck", timeoutMinutes: 10 }, { name: "test", run: "pnpm test", timeoutMinutes: 20 }, { name: "build", run: "pnpm build", timeoutMinutes: 10 }] },
    reviews: { minimumApprovals: 2, requireExactHeadApproval: true, blockChangesRequested: true },
    reportedChecks: { requireSuccess: true, minimumCount: 1 },
    output: { uploadEvidenceBundle: true, includeCommandPreview: true, strict: true },
    telemetry: { enabled: true },
  },
  "docs-only": {
    scope: { allowed: ["docs/**", "README.md", "CHANGELOG.md", "**/*.md"], denied: ["src/**", "packages/**", ".github/**", "config/**", "**/*.pem", "**/*.key"] },
    verification: { timeoutMinutes: 10, maximumOutputBytes: 262144, commands: [{ name: "diff-check", run: "git diff --check", timeoutMinutes: 10 }] },
    reviews: { minimumApprovals: 1, requireExactHeadApproval: true, blockChangesRequested: true },
    reportedChecks: { requireSuccess: true, minimumCount: 1 },
    output: { uploadEvidenceBundle: true, includeCommandPreview: true, strict: true },
    telemetry: { enabled: true },
  },
  "dependency-update": {
    scope: { allowed: ["package.json", "pnpm-lock.yaml", "npm-shrinkwrap.json", "package-lock.json", "yarn.lock"], denied: ["src/**", "packages/**", ".github/**", "config/**", "**/*.pem", "**/*.key"] },
    verification: { timeoutMinutes: 40, maximumOutputBytes: 1048576, commands: [{ name: "frozen-install", run: "pnpm install --frozen-lockfile", timeoutMinutes: 20 }, { name: "test", run: "pnpm test", timeoutMinutes: 20 }] },
    reviews: { minimumApprovals: 1, requireExactHeadApproval: true, blockChangesRequested: true },
    reportedChecks: { requireSuccess: true, minimumCount: 1 },
    output: { uploadEvidenceBundle: true, includeCommandPreview: true, strict: true },
    telemetry: { enabled: true },
  },
});

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

export async function loadTrustedMarketConfiguration({ trustedConfigurationPath, repositoryRoot }) {
  if (typeof trustedConfigurationPath !== "string" || trustedConfigurationPath === "" || typeof repositoryRoot !== "string" || repositoryRoot === "") fail("INVALID_ARGUMENT");
  const root = await resolveRoot(repositoryRoot);
  const configurationDocument = await readDocument(root, trustedConfigurationPath);
  if (digest(configurationDocument.bytes) !== MARKET_AUTHORITY_SHA256) fail("HASH_MISMATCH");
  const trustedConfiguration = parseStrictJson(configurationDocument.text);
  validateMarketAuthority(trustedConfiguration);
  const policyDocument = await readDocument(root, trustedConfiguration.policy.path);
  const evidenceContractDocument = await readDocument(root, trustedConfiguration.evidenceContract.path);
  assertDistinctDocuments([configurationDocument, policyDocument, evidenceContractDocument]);
  if (digest(policyDocument.bytes) !== MARKET_POLICY_SHA256 || digest(evidenceContractDocument.bytes) !== MARKET_EVIDENCE_SHA256 || trustedConfiguration.policy.sha256 !== MARKET_POLICY_SHA256 || trustedConfiguration.evidenceContract.sha256 !== MARKET_EVIDENCE_SHA256) fail("HASH_MISMATCH");
  const policy = parseStrictJson(policyDocument.text);
  const evidenceContract = parseStrictJson(evidenceContractDocument.text);
  validateMarketReferences(trustedConfiguration, policy, evidenceContract);
  const result = deepFreeze({ trustedConfiguration, policy, evidenceContract, identities: { trustedConfigurationSha256: digest(configurationDocument.bytes), policySha256: digest(policyDocument.bytes), evidenceContractSha256: digest(evidenceContractDocument.bytes) } });
  VALIDATED_MARKET_CONFIGURATIONS.add(result);
  return result;
}

export function assertValidatedMarketConfiguration(value) {
  if (!value || typeof value !== "object" || !VALIDATED_MARKET_CONFIGURATIONS.has(value)) fail("UNVALIDATED_CONFIGURATION");
  return value;
}

function assertExactMarketPreset(value, preset) {
  const expected = MARKET_PRESET_EXPECTATIONS[preset];
  if (!expected || !sameStructuredValue(value, { version: 1, preset, ...expected })) fail("SCHEMA_INVALID");
}

function mergeMarketConfiguration(preset, base, authority) {
  const boundary = authority.trustedConfiguration.executionBoundary;
  const result = structuredClone(preset);
  if (base.scope !== undefined) result.scope = mergeScope(preset.scope, base.scope);
  if (base.verification !== undefined) result.verification = mergeVerification(preset.verification, base.verification, boundary);
  if (base.reviews !== undefined) result.reviews = mergeReviews(preset.reviews, base.reviews);
  if (base.reportedChecks !== undefined) result.reportedChecks = mergeReportedChecks(preset.reportedChecks, base.reportedChecks);
  if (base.output !== undefined) result.output = mergeOutput(preset.output, base.output);
  if (base.telemetry !== undefined) result.telemetry = mergeTelemetry(preset.telemetry, base.telemetry);
  return result;
}

function mergeScope(preset, candidate) {
  const allowed = candidate.allowed === undefined
    ? [...preset.allowed]
    : intersectPatterns(preset.allowed, candidate.allowed);
  const denied = candidate.denied === undefined
    ? [...preset.denied]
    : unionPatterns(preset.denied, candidate.denied);
  if (candidate.allowed !== undefined && allowed.length !== candidate.allowed.length) fail("CONFLICTING_CONFIGURATION");
  if (candidate.denied !== undefined && preset.denied.some((pattern) => !candidate.denied.includes(pattern))) fail("CONFLICTING_CONFIGURATION");
  if (allowed.some((pattern) => denied.includes(pattern))) fail("CONFLICTING_CONFIGURATION");
  return { allowed, denied };
}

function mergeVerification(preset, candidate, boundary) {
  const timeoutMinutes = candidate.timeoutMinutes === undefined
    ? preset.timeoutMinutes
    : stricterNumber(preset.timeoutMinutes, candidate.timeoutMinutes, Math.floor(boundary.maximumTotalTimeoutSeconds / 60));
  const maximumOutputBytes = candidate.maximumOutputBytes === undefined
    ? preset.maximumOutputBytes
    : stricterNumber(preset.maximumOutputBytes, candidate.maximumOutputBytes, boundary.maximumOutputBytesPerStream);
  const commands = candidate.commands === undefined
    ? structuredClone(preset.commands)
    : mergeCommands(preset.commands, candidate.commands, boundary.maximumCommandCount, boundary.maximumCommandTimeoutSeconds);
  if (timeoutMinutes * 60 > boundary.maximumTotalTimeoutSeconds || maximumOutputBytes > boundary.maximumOutputBytesPerStream) fail("AUTHORITY_LIMIT_EXCEEDED");
  if (commands.length > boundary.maximumCommandCount) fail("AUTHORITY_LIMIT_EXCEEDED");
  return { timeoutMinutes, maximumOutputBytes, commands };
}

function mergeCommands(preset, candidate, maximumCommandCount, maximumCommandTimeoutSeconds) {
  if (candidate.length > Math.min(preset.length, maximumCommandCount)) fail("AUTHORITY_LIMIT_EXCEEDED");
  const commands = [];
  let selectedIndex = -1;
  for (let index = 0; index < candidate.length; index += 1) {
    const requested = candidate[index];
    const nextIndex = preset.findIndex((command, candidateIndex) => candidateIndex > selectedIndex
      && command.name === requested.name && command.run === requested.run);
    if (nextIndex < 0) fail("CONFLICTING_CONFIGURATION");
    const selected = preset[nextIndex];
    const timeoutMinutes = requested.timeoutMinutes === undefined
      ? selected.timeoutMinutes
      : stricterNumber(selected.timeoutMinutes, requested.timeoutMinutes, Math.floor(maximumCommandTimeoutSeconds / 60));
    commands.push({ name: selected.name, run: selected.run, timeoutMinutes });
    selectedIndex = nextIndex;
  }
  return commands;
}

function mergeReviews(preset, candidate) {
  if (candidate.minimumApprovals !== undefined && candidate.minimumApprovals < preset.minimumApprovals) fail("CONFLICTING_CONFIGURATION");
  if (candidate.requireExactHeadApproval === false && preset.requireExactHeadApproval) fail("CONFLICTING_CONFIGURATION");
  if (candidate.blockChangesRequested === false && preset.blockChangesRequested) fail("CONFLICTING_CONFIGURATION");
  return {
    minimumApprovals: Math.max(preset.minimumApprovals, candidate.minimumApprovals ?? preset.minimumApprovals),
    requireExactHeadApproval: preset.requireExactHeadApproval || candidate.requireExactHeadApproval === true,
    blockChangesRequested: preset.blockChangesRequested || candidate.blockChangesRequested === true,
  };
}

function mergeReportedChecks(preset, candidate) {
  if (candidate.requireSuccess === false && preset.requireSuccess) fail("CONFLICTING_CONFIGURATION");
  if (candidate.minimumCount !== undefined && candidate.minimumCount < preset.minimumCount) fail("CONFLICTING_CONFIGURATION");
  return {
    requireSuccess: preset.requireSuccess || candidate.requireSuccess === true,
    minimumCount: Math.max(preset.minimumCount, candidate.minimumCount ?? preset.minimumCount),
  };
}

function mergeOutput(preset, candidate) {
  if (candidate.uploadEvidenceBundle === false && preset.uploadEvidenceBundle) fail("CONFLICTING_CONFIGURATION");
  if (candidate.includeCommandPreview === false && preset.includeCommandPreview) fail("CONFLICTING_CONFIGURATION");
  if (candidate.strict === false && preset.strict) fail("CONFLICTING_CONFIGURATION");
  return {
    uploadEvidenceBundle: preset.uploadEvidenceBundle || candidate.uploadEvidenceBundle === true,
    includeCommandPreview: preset.includeCommandPreview || candidate.includeCommandPreview === true,
    strict: preset.strict || candidate.strict === true,
  };
}

function mergeTelemetry(preset, candidate) {
  if (candidate.enabled === true && !preset.enabled) fail("CONFLICTING_CONFIGURATION");
  return { enabled: candidate.enabled !== false && preset.enabled };
}

function stricterNumber(preset, candidate, authorityMaximum) {
  if (candidate > preset || candidate > authorityMaximum) fail("AUTHORITY_LIMIT_EXCEEDED");
  return Math.min(preset, candidate, authorityMaximum);
}

function intersectPatterns(preset, candidate) {
  const candidateSet = new Set(candidate);
  return preset.filter((pattern) => candidateSet.has(pattern));
}

function unionPatterns(preset, candidate) {
  const extra = candidate.filter((pattern) => !preset.includes(pattern)).sort();
  return [...preset, ...extra];
}

function sameStructuredValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => sameStructuredValue(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return sameSortedValues(leftKeys, rightKeys)
    && leftKeys.every((key) => sameStructuredValue(left[key], right[key]));
}

export async function parseMarketConfiguration({ source, presetsDirectory, repositoryRoot, validatedAuthority }) {
  const authority = assertValidatedMarketConfiguration(validatedAuthority);
  if (typeof source !== "string" || typeof presetsDirectory !== "string" || presetsDirectory === "" || typeof repositoryRoot !== "string" || repositoryRoot === "") fail("INVALID_ARGUMENT");
  if (Buffer.byteLength(source, "utf8") > MAX_DOCUMENT_BYTES) fail("TOO_LARGE");
  let documents;
  try { documents = parseAllDocuments(source, { schema: "core", strict: true, uniqueKeys: true, maxAliasCount: 0 }); } catch { fail("MALFORMED_YAML"); }
  if (documents.length !== 1 || !documents[0] || documents[0].errors.length !== 0) fail("MALFORMED_YAML");
  let unsafe = false;
  visit(documents[0], (_key, node) => { if (isAlias(node) || node?.tag) unsafe = true; });
  if (unsafe) fail("UNSAFE_YAML");
  let base;
  try { base = documents[0].toJS({ maxAliasCount: 0 }); } catch { fail("MALFORMED_YAML"); }
  validateBaseMarketConfiguration(base, authority.trustedConfiguration.marketConfig.allowedPresets);
  const root = await resolveRoot(repositoryRoot);
  const presetRoot = await resolveRoot(presetsDirectory);
  if (!isWithin(root, presetRoot)) fail("PATH_INVALID");
  const selected = path.join(presetRoot, `${base.preset}.json`);
  const relative = path.relative(root, selected).split(path.sep).join("/");
  const presetDocument = await readDocument(root, relative);
  const preset = parseStrictJson(presetDocument.text);
  validateResolvedMarketConfiguration(preset, authority, base.preset);
  assertExactMarketPreset(preset, base.preset);
  const marketConfiguration = mergeMarketConfiguration(preset, base, authority);
  validateResolvedMarketConfiguration(marketConfiguration, authority, base.preset);
  return deepFreeze({ marketConfiguration, identity: { marketConfigSha256: digest(Buffer.from(source, "utf8")) } });
}

function validateMarketAuthority(value) {
  exactObject(value, ["schemaVersion", "id", "version", "authorizationEventId", "issuerActorId", "targetSelector", "observer", "marketConfig", "policy", "evidenceContract", "executionBoundary", "kernel", "output"]);
  constant(value.schemaVersion, "proofrail.trusted-configuration.v2");
  constant(value.id, "config.proofrail-market-prototype");
  constant(value.version, "1.0.0");
  constant(value.authorizationEventId, MARKET_EVENT);
  constant(value.issuerActorId, "github:gogun-rgb");
  exactObject(value.targetSelector, ["kind", "repository", "pullRequest", "baseConfiguration", "requireExactBaseSha", "requireExactHeadSha", "requirePostVerificationHeadMatch"]);
  constant(value.targetSelector.kind, "GITHUB_PULL_REQUEST_EVENT");
  constant(value.targetSelector.repository, "CURRENT_CALLER_REPOSITORY");
  constant(value.targetSelector.pullRequest, "CURRENT_EVENT");
  exactObject(value.targetSelector.baseConfiguration, ["source", "path"]);
  constant(value.targetSelector.baseConfiguration.source, "GIT_OBJECT_AT_EXACT_BASE_SHA");
  constant(value.targetSelector.baseConfiguration.path, ".proofrail/config.yml");
  constant(value.targetSelector.requireExactBaseSha, true);
  constant(value.targetSelector.requireExactHeadSha, true);
  constant(value.targetSelector.requirePostVerificationHeadMatch, true);
  exactObject(value.observer, ["id", "version"]);
  strings(value.observer, ["id", "version"]);
  exactObject(value.marketConfig, ["schemaVersion", "source", "path", "allowedPresets"]);
  constant(value.marketConfig.schemaVersion, "proofrail.market-config.v1");
  constant(value.marketConfig.source, "TARGET_BASE_CONFIGURATION");
  constant(value.marketConfig.path, ".proofrail/config.yml");
  stringArray(value.marketConfig.allowedPresets, true);
  if (!sameSortedValues([...value.marketConfig.allowedPresets].sort(), [...MARKET_PRESETS])) fail("SCHEMA_INVALID");
  exactObject(value.policy, ["id", "version", "path", "sha256"]);
  exactObject(value.evidenceContract, ["id", "version", "path", "sha256"]);
  constant(value.policy.path, "config/policies/proofrail-ai-pr-verification-v1.json");
  constant(value.evidenceContract.path, "config/evidence-contracts/proofrail-ai-pr-verification-v1.json");
  if (!SHA256_PATTERN.test(value.policy.sha256) || !SHA256_PATTERN.test(value.evidenceContract.sha256)) fail("SCHEMA_INVALID");
  exactObject(value.executionBoundary, ["id", "githubRead", "githubWrite", "networkPolicy", "credentialPolicy", "forkSecretPolicy", "checkoutCredentialPolicy", "targetCheckout", "targetRepositoryContentRead", "targetCommandExecution", "verificationCommandExecution", "modelExecution", "shellPolicy", "maximumCommandCount", "maximumCommandTimeoutSeconds", "maximumTotalTimeoutSeconds", "maximumOutputBytesPerStream", "maximumPreviewBytesPerStream", "terminateProcessTree", "allowedEnvironmentNames", "deniedEnvironmentNames", "filesystemPolicy"]);
  constant(value.executionBoundary.id, "execution.github-actions-market-v1");
  constant(value.executionBoundary.githubRead, true);
  constant(value.executionBoundary.githubWrite, false);
  constant(value.executionBoundary.networkPolicy, "CONTROL_PLANE_GITHUB_ONLY_TARGET_COMMANDS_RUNNER_NETWORK_NO_CREDENTIALS");
  constant(value.executionBoundary.credentialPolicy, "NO_CONTROL_PLANE_CREDENTIALS_IN_TARGET_ENVIRONMENT");
  constant(value.executionBoundary.forkSecretPolicy, "NO_SECRETS");
  constant(value.executionBoundary.checkoutCredentialPolicy, "PERSIST_CREDENTIALS_FALSE");
  constant(value.executionBoundary.targetCheckout, true);
  constant(value.executionBoundary.targetRepositoryContentRead, true);
  constant(value.executionBoundary.targetCommandExecution, true);
  constant(value.executionBoundary.verificationCommandExecution, true);
  constant(value.executionBoundary.modelExecution, false);
  constant(value.executionBoundary.shellPolicy, "BASE_CONFIGURATION_BASH");
  constant(value.executionBoundary.maximumCommandCount, 12);
  constant(value.executionBoundary.maximumCommandTimeoutSeconds, 1800);
  constant(value.executionBoundary.maximumTotalTimeoutSeconds, 3600);
  constant(value.executionBoundary.maximumOutputBytesPerStream, 1048576);
  constant(value.executionBoundary.maximumPreviewBytesPerStream, 8192);
  constant(value.executionBoundary.terminateProcessTree, true);
  stringArray(value.executionBoundary.allowedEnvironmentNames, true);
  stringArray(value.executionBoundary.deniedEnvironmentNames, true);
  if (!sameSortedValues([...value.executionBoundary.allowedEnvironmentNames].sort(), [...MARKET_ALLOWED_ENVIRONMENT_NAMES].sort())
      || !sameSortedValues([...value.executionBoundary.deniedEnvironmentNames].sort(), [...MARKET_DENIED_ENVIRONMENT_NAMES].sort())) fail("SCHEMA_INVALID");
  constant(value.executionBoundary.filesystemPolicy, "CHECKOUT_AND_RUNNER_TEMP_ONLY");
  exactObject(value.kernel, ["inputSchemaVersion", "bundleSchemaVersion", "engineVersion", "maximumInvocationCount"]);
  constant(value.kernel.inputSchemaVersion, "proofrail.kernel.input.v2");
  constant(value.kernel.bundleSchemaVersion, "proofrail.evidence-bundle.v2");
  constant(value.kernel.engineVersion, "0.3.0-market-prototype");
  constant(value.kernel.maximumInvocationCount, 1);
  exactObject(value.output, ["kind", "format", "publicationBoundary", "strict"]);
  constant(value.output.kind, "FINALIZED_EVIDENCE_BUNDLE");
  constant(value.output.format, "CANONICAL_JSON_LF");
  constant(value.output.publicationBoundary, "GITHUB_ACTIONS_ARTIFACT_AND_STEP_SUMMARY");
  constant(value.output.strict, true);
}

function validateMarketReferences(configuration, policy, evidenceContract) {
  if (policy.schemaVersion !== "proofrail.policy.v2" || evidenceContract.schemaVersion !== "proofrail.evidence-contract.v2" || policy.authorizationEventId !== MARKET_EVENT || evidenceContract.authorizationEventId !== MARKET_EVENT || policy.id !== configuration.policy.id || policy.version !== configuration.policy.version || evidenceContract.id !== configuration.evidenceContract.id || evidenceContract.version !== configuration.evidenceContract.version || policy.evidenceContract.id !== evidenceContract.id || policy.evidenceContract.version !== evidenceContract.version || policy.targetScopeSelector !== "CURRENT_GITHUB_PULL_REQUEST" || evidenceContract.targetScopeSelector !== "CURRENT_GITHUB_PULL_REQUEST" || evidenceContract.selectionProvenance.source !== "TRUSTED_CONFIGURATION" || evidenceContract.selectionProvenance.configurationId !== configuration.id || evidenceContract.selectionProvenance.configurationVersion !== configuration.version) fail("REFERENCE_MISMATCH");
  if (!Array.isArray(policy.rules) || !Array.isArray(evidenceContract.requirements) || !Array.isArray(evidenceContract.requirementTemplates)) fail("SCHEMA_INVALID");
  if (new Set(policy.rules.map(({ id }) => id)).size !== policy.rules.length || new Set(evidenceContract.requirements.map(({ id }) => id)).size !== evidenceContract.requirements.length) fail("DUPLICATE_IDENTITY");
}

function validateBaseMarketConfiguration(value, allowedPresets) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("SCHEMA_INVALID");
  const allowed = ["version", "preset", "scope", "verification", "reviews", "reportedChecks", "output", "telemetry"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail("SCHEMA_INVALID");
  constant(value.version, 1);
  if (!allowedPresets.includes(value.preset)) fail("SCHEMA_INVALID");
  validateConfigurationSections(value, true);
}

function validateResolvedMarketConfiguration(value, authority, preset) {
  exactObject(value, ["version", "preset", "scope", "verification", "reviews", "reportedChecks", "output", "telemetry"]);
  constant(value.version, 1);
  constant(value.preset, preset);
  validateConfigurationSections(value, false);
  const boundary = authority.trustedConfiguration.executionBoundary;
  if (value.verification.commands.length > boundary.maximumCommandCount || value.verification.maximumOutputBytes > boundary.maximumOutputBytesPerStream || value.verification.timeoutMinutes * 60 > boundary.maximumTotalTimeoutSeconds || value.verification.commands.some((command) => (command.timeoutMinutes ?? value.verification.timeoutMinutes) * 60 > boundary.maximumCommandTimeoutSeconds) || value.verification.commands.reduce((seconds, command) => seconds + (command.timeoutMinutes ?? value.verification.timeoutMinutes) * 60, 0) > boundary.maximumTotalTimeoutSeconds) fail("AUTHORITY_LIMIT_EXCEEDED");
}

function validateConfigurationSections(value, partial) {
  if (value.scope !== undefined) validateScope(value.scope, partial);
  if (value.verification !== undefined) validateVerification(value.verification, partial);
  if (value.reviews !== undefined) validateShape(value.reviews, ["minimumApprovals", "requireExactHeadApproval", "blockChangesRequested"], partial);
  if (value.reportedChecks !== undefined) validateShape(value.reportedChecks, ["requireSuccess", "minimumCount"], partial);
  if (value.output !== undefined) validateShape(value.output, ["uploadEvidenceBundle", "includeCommandPreview", "strict"], partial);
  if (value.telemetry !== undefined) validateShape(value.telemetry, ["enabled"], partial);
}

function validateScope(value, partial) {
  validateShape(value, ["allowed", "denied"], partial);
  for (const key of Object.keys(value)) {
    stringArray(value[key], true);
    if (value[key].length > MAX_MARKET_SCOPE_PATTERNS) fail("SCHEMA_INVALID");
    if (value[key].some((entry) => !safeGlob(entry))) fail("SCHEMA_INVALID");
  }
  if (value.allowed && value.denied && value.allowed.some((entry) => value.denied.includes(entry))) fail("CONFLICTING_CONFIGURATION");
}

function validateVerification(value, partial) {
  validateShape(value, ["timeoutMinutes", "maximumOutputBytes", "commands"], partial);
  if ("timeoutMinutes" in value && (!Number.isSafeInteger(value.timeoutMinutes) || value.timeoutMinutes < 1 || value.timeoutMinutes > 60)) fail("SCHEMA_INVALID");
  if ("maximumOutputBytes" in value && (!Number.isSafeInteger(value.maximumOutputBytes) || value.maximumOutputBytes < 1024)) fail("SCHEMA_INVALID");
  if ("commands" in value) {
    if (!Array.isArray(value.commands) || value.commands.length === 0) fail("SCHEMA_INVALID");
    const names = new Set();
    for (const command of value.commands) {
      if (!command || typeof command !== "object" || Array.isArray(command) || Object.keys(command).some((key) => !["name", "run", "timeoutMinutes"].includes(key)) || !/^[a-z][a-z0-9-]{0,63}$/.test(command.name) || names.has(command.name) || typeof command.run !== "string" || command.run.trim() === "" || command.run !== command.run.trim() || command.run.length > 2048 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(command.run) || (command.timeoutMinutes !== undefined && (!Number.isSafeInteger(command.timeoutMinutes) || command.timeoutMinutes < 1 || command.timeoutMinutes > 30))) fail("SCHEMA_INVALID");
      names.add(command.name);
    }
  }
}

function validateShape(value, keys, partial) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0 || Object.keys(value).some((key) => !keys.includes(key)) || (!partial && keys.some((key) => !(key in value)))) fail("SCHEMA_INVALID");
}

function safeGlob(value) {
  if (typeof value !== "string" || value === "" || value !== value.trim() || value.length > 512 || /[\\\u0000-\u001f\u007f]/.test(value) || value.startsWith("/") || value.startsWith("!") || /^[A-Za-z]:/.test(value)) return false;
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".." && !segment.includes("***") && /^[A-Za-z0-9._*?@+-]+$/.test(segment));
}

function fail(code) {
  throw new TrustedConfigurationError(code);
}
