import { execFile } from "node:child_process";

const TIMEOUT_MS = 30_000;
const MAX_BUFFER = 4 * 1024 * 1024;
const MAX_PAGES = 100;

const METADATA_QUERY = `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){number title state isDraft changedFiles baseRefName headRefName headRefOid}}}`;
const FILES_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid files(first:100,after:$cursor){nodes{path additions deletions}pageInfo{hasNextPage endCursor}}}}}`;
const COMMITS_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid commits(first:100,after:$cursor){nodes{commit{oid}}pageInfo{hasNextPage endCursor}}}}}`;
const REVIEWS_QUERY = `query($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){headRefOid reviews(first:100,after:$cursor){nodes{state submittedAt author{login}commit{oid}}pageInfo{hasNextPage endCursor}}}}}`;
const CHECKS_QUERY = `query($owner:String!,$name:String!,$expression:String!,$cursor:String){repository(owner:$owner,name:$name){object(expression:$expression){... on Commit{oid statusCheckRollup{contexts(first:100,after:$cursor){nodes{__typename ... on CheckRun{name status conclusion}... on StatusContext{context state}}pageInfo{hasNextPage endCursor}}}}}}}`;

export async function collectGitHubPullRequest({
  repository,
  pullRequestNumber,
  runGh = runGhCommand
}) {
  const normalizedRepository = normalizeRepository(repository);
  const number = positiveInteger(pullRequestNumber, "pull request number");
  const [owner, name] = normalizedRepository.split("/");
  const common = { owner, name, number };
  const metadataResult = await queryGraphql(
    runGh,
    METADATA_QUERY,
    common,
    "pull request metadata"
  );
  const metadata = requirePullRequest(metadataResult, "pull request metadata");
  const headOid = commitOid(metadata.headRefOid, "pull request metadata head");

  const files = await collectConnection({
    runGh,
    query: FILES_QUERY,
    variables: common,
    stage: "changed files",
    select: (result) => requireHeadConnection(result, "changed files", headOid, "files"),
    map: (node) => ({
      path: node?.path,
      additions: node?.additions,
      deletions: node?.deletions
    })
  });
  if (!Number.isSafeInteger(metadata.changedFiles)
      || metadata.changedFiles < 0
      || metadata.changedFiles !== files.length) {
    throw new Error("GitHub collection returned invalid changed files");
  }
  const commits = await collectConnection({
    runGh,
    query: COMMITS_QUERY,
    variables: common,
    stage: "commits",
    select: (result) => requireHeadConnection(result, "commits", headOid, "commits"),
    map: (node) => ({ oid: node?.commit?.oid })
  });
  const reviews = await collectConnection({
    runGh,
    query: REVIEWS_QUERY,
    variables: common,
    stage: "reviews",
    select: (result) => requireHeadConnection(result, "reviews", headOid, "reviews"),
    map: (node) => ({
      authorLogin: node?.author?.login ?? null,
      state: node?.state,
      submittedAt: node?.submittedAt,
      commitOid: node?.commit?.oid ?? null
    })
  });
  const checks = await collectConnection({
    runGh,
    query: CHECKS_QUERY,
    variables: { owner, name, expression: headOid },
    stage: "checks",
    select: (result) => requireCheckConnection(result, headOid),
    map: mapCheckNode
  });

  return normalizeSnapshot({
    repository: normalizedRepository,
    number: metadata.number,
    title: metadata.title,
    state: metadata.state,
    isDraft: metadata.isDraft,
    baseRefName: metadata.baseRefName,
    headRefName: metadata.headRefName,
    headOid,
    changedFiles: metadata.changedFiles,
    files,
    commits,
    checks,
    reviews
  });
}

export function mapGitHubPullRequestToEvidenceInput(value, declaredWriteScope = []) {
  const snapshot = normalizeSnapshot(value);
  const normalizedDeclaredWriteScope = normalizeDeclaredWriteScope(declaredWriteScope);
  const observedEvidence = [
    {
      id: "github-pr-snapshot",
      kind: "pull-request-snapshot",
      summary: [
        `GitHub pull request ${snapshot.repository}#${snapshot.number} at head ${snapshot.headOid}`,
        `is ${snapshot.state}${snapshot.isDraft ? " and draft" : ""};`,
        `${snapshot.files.length} collected paths and ${snapshot.commits.length} collected commits.`
      ].join(" "),
      source: `https://github.com/${snapshot.repository}/pull/${snapshot.number}`,
      satisfies: ["github-exact-head-collected"]
    }
  ];
  const reviewNeeds = new Set([
    "Confirm reviewer independence and authority outside GitHub approval metadata."
  ]);

  snapshot.files.forEach((file, index) => {
    observedEvidence.push({
      id: numberedId("github-path", index),
      kind: "changed-path",
      summary: `${file.path} (+${file.additions}/-${file.deletions})`,
      source: "local-gh",
      satisfies: []
    });
  });

  snapshot.commits.forEach((commit, index) => {
    observedEvidence.push({
      id: numberedId("github-commit", index),
      kind: "commit-identity",
      summary: `Collected commit ${commit.oid}.`,
      source: "local-gh",
      satisfies: []
    });
  });

  snapshot.checks.forEach((check, index) => {
    observedEvidence.push({
      id: numberedId("github-check", index),
      kind: "reported-check",
      summary: `${check.kind} ${check.name}: ${check.status}${check.conclusion ? `/${check.conclusion}` : ""}`,
      source: "local-gh",
      satisfies: []
    });
  });

  const checksSuccessful = snapshot.checks.length > 0
    && snapshot.checks.every(isSuccessfulCheck);
  if (checksSuccessful) {
    observedEvidence.push({
      id: "github-reported-checks-successful",
      kind: "reported-check-summary",
      summary: `All ${snapshot.checks.length} reported head checks have an accepted successful terminal state.`,
      source: "local-gh",
      satisfies: ["github-reported-checks-successful"]
    });
  } else if (snapshot.checks.length === 0) {
    reviewNeeds.add("No checks were reported for the collected pull request head.");
  } else {
    for (const check of snapshot.checks.filter((item) => !isSuccessfulCheck(item))) {
      reviewNeeds.add(
        `Review non-success reported check: ${check.name} (${check.status}${check.conclusion ? `/${check.conclusion}` : ""}).`
      );
    }
  }

  snapshot.reviews.forEach((review, index) => {
    const headRelationship = review.commitOid === null
      ? "head unknown"
      : review.commitOid === snapshot.headOid
        ? "exact head"
        : "different head";
    observedEvidence.push({
      id: numberedId("github-review", index),
      kind: "reported-review",
      summary: `${review.state} review by ${review.authorLogin} at ${review.submittedAt ?? "(not submitted)"} (${headRelationship}).`,
      source: "local-gh",
      satisfies: []
    });
  });

  const exactHeadApproval = latestReviews(snapshot.reviews).some(
    (review) => review.state === "APPROVED" && review.commitOid === snapshot.headOid
  );
  if (exactHeadApproval) {
    observedEvidence.push({
      id: "github-exact-head-approval-reported",
      kind: "reported-review-summary",
      summary: "GitHub reports an approval attached to the collected exact head.",
      source: "local-gh",
      satisfies: ["github-exact-head-approval-reported"]
    });
  } else {
    reviewNeeds.add("No approval was reported for the collected exact pull request head.");
  }

  if (snapshot.changedFiles !== snapshot.files.length) {
    reviewNeeds.add(
      `GitHub reported ${snapshot.changedFiles} changed files but the collector received ${snapshot.files.length}; review collection completeness.`
    );
  }
  if (normalizedDeclaredWriteScope.length === 0 && snapshot.files.length > 0) {
    reviewNeeds.add("No declared write scope was supplied; review every changed path.");
  }
  if (snapshot.isDraft) {
    reviewNeeds.add("Pull request is still marked draft.");
  }
  if (snapshot.state !== "OPEN") {
    reviewNeeds.add(`Review pull request state: ${snapshot.state}.`);
  }

  const summaryIds = observedEvidence
    .filter((item) => [
      "github-pr-snapshot",
      "github-reported-checks-successful",
      "github-exact-head-approval-reported"
    ].includes(item.id))
    .map((item) => item.id);

  return {
    pullRequest: {
      id: `${snapshot.repository}#${snapshot.number}`,
      title: snapshot.title,
      sourceRef: `${snapshot.headRefName}@${snapshot.headOid}`
    },
    claims: [
      {
        id: "github-pr-title-claim",
        text: snapshot.title,
        source: "github-pr-title",
        observedEvidenceIds: summaryIds,
        requiredEvidenceIds: [
          "github-exact-head-collected",
          "github-reported-checks-successful",
          "github-exact-head-approval-reported",
          "independent-review-confirmed"
        ]
      }
    ],
    observedEvidence,
    requiredEvidence: [
      {
        id: "github-exact-head-collected",
        description: "The pull request snapshot identifies an exact head commit."
      },
      {
        id: "github-reported-checks-successful",
        description: "At least one head check is reported and every reported head check has an accepted successful terminal state."
      },
      {
        id: "github-exact-head-approval-reported",
        description: "GitHub reports an approval attached to the exact collected head."
      },
      {
        id: "independent-review-confirmed",
        description: "Reviewer independence and authority are confirmed outside Builder and GitHub metadata claims."
      }
    ],
    scope: {
      declaredWriteScope: normalizedDeclaredWriteScope,
      changedPaths: snapshot.files.map((file) => file.path)
    },
    reviewNeeds: [...reviewNeeds]
  };
}

export function normalizeGitHubSnapshot(value) {
  return normalizeSnapshot(value);
}

export function normalizeDeclaredWriteScope(value) {
  if (!Array.isArray(value)
      || value.length > 100
      || value.some((pattern) => !isSafePathPattern(pattern))) {
    throw new TypeError("declaredWriteScope must be an array of safe path patterns");
  }

  const uniquePatterns = new Set(value);
  if (uniquePatterns.size !== value.length) {
    throw new TypeError("declaredWriteScope must not contain duplicate path patterns");
  }

  return [...uniquePatterns].sort(compare);
}

async function queryGraphql(runGh, query, variables, stage) {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [name, value] of Object.entries(variables).sort(([left], [right]) => compare(left, right))) {
    if (value === undefined || value === null) {
      continue;
    }
    args.push(typeof value === "number" ? "-F" : "-f", `${name}=${value}`);
  }

  let source;
  try {
    source = await runGh(args);
  } catch {
    throw new Error(`GitHub collection failed while reading ${stage}`);
  }

  let result;
  try {
    result = JSON.parse(source);
  } catch {
    throw new Error(`GitHub collection returned invalid ${stage}`);
  }
  if (!isObject(result) || (Array.isArray(result.errors) && result.errors.length > 0)) {
    throw new Error(`GitHub collection returned invalid ${stage}`);
  }
  return result;
}

async function collectConnection({ runGh, query, variables, stage, select, map }) {
  const values = [];
  const seenCursors = new Set();
  let cursor;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await queryGraphql(runGh, query, { ...variables, cursor }, stage);
    const connection = select(result);
    if (!isObject(connection)
        || !Array.isArray(connection.nodes)
        || !isObject(connection.pageInfo)
        || typeof connection.pageInfo.hasNextPage !== "boolean") {
      throw new Error(`GitHub collection returned invalid ${stage}`);
    }
    if (connection.nodes.some((node) => !isObject(node))) {
      throw new Error(`GitHub collection returned invalid ${stage}`);
    }
    values.push(...connection.nodes.map(map));
    if (connection.pageInfo.hasNextPage !== true) {
      return values;
    }
    const nextCursor = connection.pageInfo.endCursor;
    if (typeof nextCursor !== "string"
        || nextCursor === ""
        || seenCursors.has(nextCursor)) {
      throw new Error(`GitHub collection returned invalid ${stage}`);
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw new Error(`GitHub collection exceeded the ${stage} pagination limit`);
}

function requirePullRequest(result, stage) {
  const pullRequest = result?.data?.repository?.pullRequest;
  if (!isObject(pullRequest)) {
    throw new Error(`GitHub collection returned invalid ${stage}`);
  }
  return pullRequest;
}

function requireHeadConnection(result, stage, expectedHeadOid, field) {
  const pullRequest = requirePullRequest(result, stage);
  if (pullRequest.headRefOid !== expectedHeadOid) {
    throw new Error(`GitHub collection returned invalid ${stage}`);
  }
  return pullRequest[field];
}

function requireCheckConnection(result, expectedHeadOid) {
  const commit = result?.data?.repository?.object;
  if (!isObject(commit)
      || typeof commit.oid !== "string"
      || commit.oid.toLowerCase() !== expectedHeadOid.toLowerCase()) {
    throw new Error("GitHub collection returned invalid checks");
  }
  if (commit.statusCheckRollup === null || commit.statusCheckRollup === undefined) {
    return {
      nodes: [],
      pageInfo: { hasNextPage: false, endCursor: null }
    };
  }
  return commit.statusCheckRollup.contexts;
}

function mapCheckNode(node) {
  if (node?.__typename === "CheckRun") {
    return {
      kind: "check-run",
      name: node.name,
      status: node.status,
      conclusion: node.conclusion ?? null
    };
  }
  if (node?.__typename === "StatusContext") {
    return {
      kind: "status-context",
      name: node.context,
      status: node.state,
      conclusion: null
    };
  }
  throw new Error("GitHub collection returned invalid checks");
}

async function runGhCommand(args) {
  return new Promise((resolve, reject) => {
    execFile("gh", args, {
      encoding: "utf8",
      maxBuffer: MAX_BUFFER,
      timeout: TIMEOUT_MS,
      windowsHide: true,
      shell: false
    }, (error, stdout) => {
      if (error) {
        reject(new Error("GitHub command failed"));
        return;
      }
      resolve(stdout);
    });
  });
}

function normalizeSnapshot(value) {
  if (!isObject(value)) {
    throw new TypeError("snapshot must be an object");
  }
  return Object.freeze({
    repository: normalizeRepository(value.repository),
    number: positiveInteger(value.number, "snapshot.number"),
    title: safeText(value.title, "snapshot.title", 500),
    state: enumValue(value.state, "snapshot.state", ["OPEN", "CLOSED", "MERGED"]),
    isDraft: booleanValue(value.isDraft, "snapshot.isDraft"),
    baseRefName: safeText(value.baseRefName, "snapshot.baseRefName", 255),
    headRefName: safeText(value.headRefName, "snapshot.headRefName", 255),
    headOid: commitOid(value.headOid, "snapshot.headOid"),
    changedFiles: nonNegativeInteger(value.changedFiles, "snapshot.changedFiles"),
    files: normalizeFiles(value.files),
    commits: normalizeCommits(value.commits),
    checks: normalizeChecks(value.checks),
    reviews: normalizeReviews(value.reviews)
  });
}

function normalizeFiles(value) {
  return requiredArray(value, "snapshot.files").map((file, index) => {
    if (!isObject(file)) {
      throw new TypeError(`snapshot.files[${index}] must be an object`);
    }
    return Object.freeze({
      path: safeText(file.path, `snapshot.files[${index}].path`, 4096),
      additions: nonNegativeInteger(file.additions, `snapshot.files[${index}].additions`),
      deletions: nonNegativeInteger(file.deletions, `snapshot.files[${index}].deletions`)
    });
  }).sort((left, right) => compare(left.path, right.path)
    || left.additions - right.additions
    || left.deletions - right.deletions);
}

function normalizeCommits(value) {
  return requiredArray(value, "snapshot.commits").map((commit, index) => {
    if (!isObject(commit)) {
      throw new TypeError(`snapshot.commits[${index}] must be an object`);
    }
    return Object.freeze({
      oid: commitOid(commit.oid, `snapshot.commits[${index}].oid`)
    });
  }).sort((left, right) => compare(left.oid, right.oid));
}

function normalizeChecks(value) {
  return requiredArray(value, "snapshot.checks").map((check, index) => {
    if (!isObject(check)) {
      throw new TypeError(`snapshot.checks[${index}] must be an object`);
    }
    const kind = enumValue(
      check.kind,
      `snapshot.checks[${index}].kind`,
      ["CHECK-RUN", "STATUS-CONTEXT"]
    ).toLowerCase();
    return Object.freeze({
      kind,
      name: safeText(check.name, `snapshot.checks[${index}].name`, 255),
      status: safeText(check.status, `snapshot.checks[${index}].status`, 64).toUpperCase(),
      conclusion: check.conclusion == null
        ? null
        : safeText(check.conclusion, `snapshot.checks[${index}].conclusion`, 64).toUpperCase()
    });
  }).sort((left, right) => compare(left.kind, right.kind)
    || compare(left.name, right.name)
    || compare(left.status, right.status)
    || compare(left.conclusion ?? "", right.conclusion ?? ""));
}

function normalizeReviews(value) {
  return requiredArray(value, "snapshot.reviews").map((review, index) => {
    if (!isObject(review)) {
      throw new TypeError(`snapshot.reviews[${index}] must be an object`);
    }
    return Object.freeze({
      authorLogin: optionalIdentity(
        review.authorLogin,
        "(unknown-reviewer)",
        `snapshot.reviews[${index}].authorLogin`
      ),
      state: safeText(review.state, `snapshot.reviews[${index}].state`, 64).toUpperCase(),
      submittedAt: optionalIsoTimestamp(review.submittedAt, `snapshot.reviews[${index}].submittedAt`),
      commitOid: review.commitOid == null
        ? null
        : commitOid(review.commitOid, `snapshot.reviews[${index}].commitOid`)
    });
  }).sort((left, right) => compare(left.authorLogin, right.authorLogin)
    || compare(left.submittedAt ?? "", right.submittedAt ?? "")
    || compare(left.state, right.state)
    || compare(left.commitOid ?? "", right.commitOid ?? ""));
}

function latestReviews(reviews) {
  const latest = new Map();
  for (const review of reviews) {
    const key = review.authorLogin.toLowerCase();
    const previous = latest.get(key);
    if (!previous || compare(previous.submittedAt ?? "", review.submittedAt ?? "") <= 0) {
      latest.set(key, review);
    }
  }
  return [...latest.values()];
}

function isSuccessfulCheck(check) {
  if (check.kind === "status-context") {
    return check.status === "SUCCESS";
  }
  return check.status === "COMPLETED"
    && ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(check.conclusion);
}

function normalizeRepository(value) {
  if (typeof value !== "string"
      || !/^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,99})\/[A-Za-z0-9_.-]{1,100}$/.test(value)) {
    throw new TypeError("repository must use owner/name format");
  }
  return value;
}

function isSafePathPattern(value) {
  if (typeof value !== "string"
      || value.length === 0
      || value.length > 4096
      || value !== value.trim()
      || /[\\\\\u0000-\u001f\u007f]/.test(value)) {
    return false;
  }

  const prefix = value.endsWith("/**") ? value.slice(0, -3) : value;
  if (prefix === "" || prefix.includes("*")) {
    return false;
  }

  return prefix.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function optionalIdentity(value, fallback, name) {
  return value == null ? fallback : safeText(value, name, 100);
}

function safeText(value, name, maxLength) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  let normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  normalized = normalized
    .replace(/(?:gh[oprsu]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, "[REDACTED]")
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\/-]{16,}/gi, "$1[REDACTED]")
    .replace(/\b((?:(?:[A-Za-z0-9]+)[_-])*(?:api[_-]?key|token|secret|password)\s*[=:]\s*)\S+/gi, "$1[REDACTED]");
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 3)}...`;
}

function enumValue(value, name, allowed) {
  const normalized = safeText(value, name, 64).toUpperCase();
  if (!allowed.includes(normalized)) {
    throw new TypeError(`${name} has an unsupported value`);
  }
  return normalized;
}

function booleanValue(value, name) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${name} must be a boolean`);
  }
  return value;
}

function commitOid(value, name) {
  if (typeof value !== "string" || !/^[0-9a-f]{40,64}$/i.test(value)) {
    throw new TypeError(`${name} must be a commit identifier`);
  }
  return value.toLowerCase();
}

function isoTimestamp(value, name) {
  const normalized = safeText(value, name, 64);
  if (Number.isNaN(Date.parse(normalized))) {
    throw new TypeError(`${name} must be an ISO timestamp`);
  }
  return new Date(normalized).toISOString();
}

function optionalIsoTimestamp(value, name) {
  return value == null ? null : isoTimestamp(value, name);
}

function positiveInteger(value, name) {
  const normalized = typeof value === "string" && /^\d+$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }
  return normalized;
}

function nonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer`);
  }
  return value;
}

function requiredArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
  return value;
}

function numberedId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compare(left, right) {
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
