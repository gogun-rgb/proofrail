import { createHash } from "node:crypto";

const PACKET_VERSION = "ai-pr-evidence-gate.v0";

export function buildEvidencePacket(input) {
  const normalized = normalizeInput(input);
  const observedByRequirement = mapObservedRequirements(normalized.observedEvidence);
  const missingEvidence = buildMissingEvidence(normalized, observedByRequirement);
  const missingByRequirement = new Map(missingEvidence.map((item) => [item.id, item]));
  const observedIds = new Set(normalized.observedEvidence.map((item) => item.id));

  const claims = normalized.claims.map((claim) => freezeDeep({
    id: claim.id,
    text: claim.text,
    source: claim.source,
    observedEvidenceIds: claim.observedEvidenceIds.filter((id) => observedIds.has(id)).sort(compareText),
    missingEvidenceIds: claim.requiredEvidenceIds.filter((id) => missingByRequirement.has(id)).sort(compareText)
  })).sort(compareByIdThenText);

  const scope = buildScope(normalized.scope);
  const reviewNeeds = buildReviewNeeds({
    claims,
    missingEvidence,
    scope,
    explicitReviewNeeds: normalized.reviewNeeds
  });

  const publicInput = {
    pullRequest: normalized.pullRequest,
    claims: normalized.claims,
    observedEvidence: normalized.observedEvidence,
    requiredEvidence: normalized.requiredEvidence,
    scope: normalized.scope,
    reviewNeeds: normalized.reviewNeeds
  };

  return freezeDeep({
    packetVersion: PACKET_VERSION,
    inputDigest: sha256(canonicalJson(publicInput)),
    pullRequest: normalized.pullRequest,
    claims,
    observedEvidence: normalized.observedEvidence,
    missingEvidence,
    scope,
    reviewNeeds,
    boundaries: {
      staticInputOnly: true,
      productVerdict: null,
      productReadiness: false,
      trustedRelease: false
    }
  });
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    const result = {};
    for (const [key, entryValue] of Object.entries(value).sort(([left], [right]) => compareText(left, right))) {
      result[key] = canonicalize(entryValue);
    }
    return result;
  }

  return value;
}

function normalizeInput(input) {
  assertPlainObject(input, "input");
  const record = input;
  const pullRequest = normalizePullRequest(record.pullRequest);
  const claims = normalizeClaims(record.claims);
  const observedEvidence = normalizeObservedEvidence(record.observedEvidence);
  const requiredEvidence = normalizeRequiredEvidence(record.requiredEvidence);
  const scope = normalizeScope(record.scope);
  const reviewNeeds = normalizeStringArray(record.reviewNeeds, "reviewNeeds");

  validateIdentityIntegrity({ claims, observedEvidence, requiredEvidence });

  return freezeDeep({
    pullRequest,
    claims,
    observedEvidence,
    requiredEvidence,
    scope,
    reviewNeeds
  });
}

function validateIdentityIntegrity({ claims, observedEvidence, requiredEvidence }) {
  identitySet(claims, "claims");
  const observedEvidenceIds = identitySet(observedEvidence, "observedEvidence");
  const requiredEvidenceIds = identitySet(requiredEvidence, "requiredEvidence");

  for (const claim of claims) {
    assertDeclaredReferences(
      claim.observedEvidenceIds,
      observedEvidenceIds,
      "claims.observedEvidenceIds"
    );
    assertDeclaredReferences(
      claim.requiredEvidenceIds,
      requiredEvidenceIds,
      "claims.requiredEvidenceIds"
    );
  }

  for (const evidence of observedEvidence) {
    assertDeclaredReferences(
      evidence.satisfies,
      requiredEvidenceIds,
      "observedEvidence.satisfies"
    );
  }
}

function identitySet(items, name) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new TypeError(`${name} must use unique ids`);
    }
    ids.add(item.id);
  }
  return ids;
}

function assertDeclaredReferences(references, declaredIds, name) {
  for (const reference of references) {
    if (!declaredIds.has(reference)) {
      throw new TypeError(`${name} must reference declared ids`);
    }
  }
}

function normalizePullRequest(value) {
  assertPlainObject(value, "pullRequest");
  return freezeDeep({
    id: normalizeString(value.id, "pullRequest.id"),
    title: normalizeString(value.title, "pullRequest.title"),
    sourceRef: optionalString(value.sourceRef, "pullRequest.sourceRef")
  });
}

function normalizeClaims(value) {
  return normalizeArray(value, "claims").map((item, index) => {
    assertPlainObject(item, `claims[${index}]`);
    return freezeDeep({
      id: normalizeString(item.id, `claims[${index}].id`),
      text: normalizeString(item.text, `claims[${index}].text`),
      source: optionalString(item.source, `claims[${index}].source`),
      observedEvidenceIds: normalizeStringArray(item.observedEvidenceIds, `claims[${index}].observedEvidenceIds`),
      requiredEvidenceIds: normalizeStringArray(item.requiredEvidenceIds, `claims[${index}].requiredEvidenceIds`)
    });
  }).sort(compareByIdThenText);
}

function normalizeObservedEvidence(value) {
  return normalizeArray(value, "observedEvidence").map((item, index) => {
    assertPlainObject(item, `observedEvidence[${index}]`);
    return freezeDeep({
      id: normalizeString(item.id, `observedEvidence[${index}].id`),
      kind: normalizeString(item.kind, `observedEvidence[${index}].kind`),
      summary: normalizeString(item.summary, `observedEvidence[${index}].summary`),
      source: optionalString(item.source, `observedEvidence[${index}].source`),
      satisfies: normalizeStringArray(item.satisfies, `observedEvidence[${index}].satisfies`)
    });
  }).sort(compareByIdThenText);
}

function normalizeRequiredEvidence(value) {
  return normalizeArray(value, "requiredEvidence").map((item, index) => {
    assertPlainObject(item, `requiredEvidence[${index}]`);
    return freezeDeep({
      id: normalizeString(item.id, `requiredEvidence[${index}].id`),
      description: normalizeString(item.description, `requiredEvidence[${index}].description`)
    });
  }).sort(compareByIdThenDescription);
}

function normalizeScope(value) {
  assertPlainObject(value, "scope");
  return freezeDeep({
    declaredWriteScope: normalizeStringArray(value.declaredWriteScope, "scope.declaredWriteScope"),
    changedPaths: normalizeStringArray(value.changedPaths, "scope.changedPaths")
  });
}

function mapObservedRequirements(observedEvidence) {
  const result = new Map();
  for (const evidence of observedEvidence) {
    for (const requirementId of evidence.satisfies) {
      const current = result.get(requirementId) ?? [];
      current.push(evidence.id);
      result.set(requirementId, current.sort(compareText));
    }
  }
  return result;
}

function buildMissingEvidence(input, observedByRequirement) {
  return input.requiredEvidence
    .filter((requirement) => !observedByRequirement.has(requirement.id))
    .map((requirement) => freezeDeep({
      id: requirement.id,
      description: requirement.description,
      neededForClaimIds: input.claims
        .filter((claim) => claim.requiredEvidenceIds.includes(requirement.id))
        .map((claim) => claim.id)
        .sort(compareText)
    }))
    .sort(compareByIdThenDescription);
}

function buildScope(scope) {
  const declaredWriteScope = [...scope.declaredWriteScope].sort(compareText);
  const changedPaths = [...scope.changedPaths].sort(compareText);
  const outsideDeclaredScope = changedPaths.filter((path) => !declaredWriteScope.some((pattern) => pathMatches(pattern, path)));
  return freezeDeep({ declaredWriteScope, changedPaths, outsideDeclaredScope });
}

function buildReviewNeeds({ claims, missingEvidence, scope, explicitReviewNeeds }) {
  const needs = new Set(explicitReviewNeeds);
  for (const missing of missingEvidence) {
    needs.add(`Review missing evidence requirement: ${missing.id}`);
  }
  for (const claim of claims) {
    if (claim.missingEvidenceIds.length > 0) {
      needs.add(`Do not accept claim without missing evidence: ${claim.id}`);
    }
  }
  for (const path of scope.outsideDeclaredScope) {
    needs.add(`Review path outside declared scope: ${path}`);
  }
  return [...needs].sort(compareText);
}

function pathMatches(pattern, path) {
  if (pattern === path) {
    return true;
  }
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return false;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertPlainObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

function normalizeArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
  return value;
}

function normalizeStringArray(value, name) {
  return normalizeArray(value ?? [], name).map((item, index) => normalizeString(item, `${name}[${index}]`)).sort(compareText);
}

function normalizeString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function optionalString(value, name) {
  if (value === undefined || value === null) {
    return null;
  }
  return normalizeString(value, name);
}

function freezeDeep(value) {
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      freezeDeep(entry);
    }
    return Object.freeze(value);
  }
  return value;
}

function compareText(left, right) {
  const foldedLeft = foldAsciiCase(left);
  const foldedRight = foldAsciiCase(right);
  return foldedLeft < foldedRight
    ? -1
    : foldedLeft > foldedRight
      ? 1
      : left < right
        ? -1
        : left > right
          ? 1
          : 0;
}

function foldAsciiCase(value) {
  return value.replace(/[A-Z]/g, (character) => character.toLowerCase());
}

function compareByIdThenText(left, right) {
  return compareText(left.id, right.id) || compareText(left.text ?? "", right.text ?? "");
}

function compareByIdThenDescription(left, right) {
  return compareText(left.id, right.id) || compareText(left.description ?? "", right.description ?? "");
}
