import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

const SCHEMA_PATH = "governance/clean-agent-run.schema.json";
const RUN_DIRECTORY = "governance/clean-agent-runs";
const MAX_SCHEMA_BYTES = 256 * 1024;
const MAX_RUN_BYTES = 512 * 1024;

export const MAX_CLEAN_AGENT_FINDINGS = 100;

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function makeCollector() {
  const findings = [];
  let truncated = false;

  return {
    add(id, findingPath, instancePath, detail) {
      if (findings.length < MAX_CLEAN_AGENT_FINDINGS - 1) {
        findings.push({ id, path: findingPath, instancePath, detail });
      } else {
        truncated = true;
      }
    },
    finish(runCount) {
      if (truncated) {
        findings.push({
          id: "CLEAN_AGENT_FINDINGS_TRUNCATED",
          path: RUN_DIRECTORY,
          instancePath: "/",
          detail: `Diagnostics were truncated at ${MAX_CLEAN_AGENT_FINDINGS} findings.`,
        });
      }
      findings.sort((left, right) => (
        compareText(left.path, right.path)
        || compareText(left.instancePath, right.instancePath)
        || compareText(left.id, right.id)
        || compareText(left.detail, right.detail)
      ));
      return {
        status: findings.length === 0 ? "VALID" : "INVALID",
        runCount,
        findings,
      };
    },
  };
}

function schemaInstancePath(error) {
  const base = error.instancePath || "/";
  if (error.keyword === "required" && error.params?.missingProperty) {
    return `${base === "/" ? "" : base}/${error.params.missingProperty}`;
  }
  return base;
}

function schemaFindingId(error) {
  if (error.instancePath === "/grading/reliedOnBuilderClaim") {
    return "CLEAN_AGENT_BUILDER_CLAIM_GRADING_INVALID";
  }
  if (
    error.instancePath.startsWith("/freshContext/")
    || error.instancePath === "/grading/graderFreshContext"
  ) {
    return "CLEAN_AGENT_FRESH_CONTEXT_INVALID";
  }
  return "CLEAN_AGENT_RUN_SCHEMA_INVALID";
}

function compileSchema(schema, collector) {
  try {
    return new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  } catch {
    collector.add(
      "CLEAN_AGENT_SCHEMA_INVALID",
      SCHEMA_PATH,
      "/",
      "The Clean Agent run-record schema could not be compiled in strict mode.",
    );
    return undefined;
  }
}

function addSchemaFindings(errors, runPath, collector) {
  const ordered = [...(errors ?? [])].sort((left, right) => (
    compareText(schemaInstancePath(left), schemaInstancePath(right))
    || compareText(left.keyword ?? "", right.keyword ?? "")
    || compareText(left.message ?? "", right.message ?? "")
  ));

  for (const error of ordered) {
    const instancePath = schemaInstancePath(error);
    collector.add(
      schemaFindingId(error),
      runPath,
      instancePath,
      `Run-record schema validation failed at ${instancePath}: ${error.message ?? "invalid value"}.`,
    );
  }
}

function strictBase64Bytes(value) {
  if (typeof value !== "string") return undefined;
  try {
    const bytes = Buffer.from(value, "base64");
    return bytes.toString("base64") === value ? bytes : undefined;
  } catch {
    return undefined;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validateEncodedBytes(encoded, runPath, instancePath, collector) {
  const bytes = strictBase64Bytes(encoded.bytes);
  if (!bytes) {
    collector.add(
      "CLEAN_AGENT_BYTES_INVALID",
      runPath,
      `${instancePath}/bytes`,
      "Encoded bytes must use canonical base64.",
    );
    return;
  }
  if (bytes.length !== encoded.byteLength) {
    collector.add(
      "CLEAN_AGENT_BYTE_LENGTH_MISMATCH",
      runPath,
      `${instancePath}/byteLength`,
      "The declared byte length does not match the decoded bytes.",
    );
  }
  if (sha256(bytes) !== encoded.sha256) {
    collector.add(
      "CLEAN_AGENT_DIGEST_MISMATCH",
      runPath,
      `${instancePath}/sha256`,
      "The declared SHA-256 does not match the decoded bytes.",
    );
  }
}

function validateSortedUnique(items, keyOf, runPath, instancePath, collector) {
  let previous;
  for (let index = 0; index < items.length; index += 1) {
    const key = keyOf(items[index]);
    if (previous !== undefined && compareText(previous, key) >= 0) {
      collector.add(
        "CLEAN_AGENT_ORDER_INVALID",
        runPath,
        `${instancePath}/${index}`,
        "Entries must be unique and sorted by stable bytewise key.",
      );
      return;
    }
    previous = key;
  }
}

function validatePreflight(record, runPath, collector) {
  const targets = record.authorityPreflight.targets;
  const targetsByPath = new Map(targets.map((target) => [target.path, target]));
  validateSortedUnique(targets, (target) => target.path, runPath, "/authorityPreflight/targets", collector);

  const discoveredAuthorityPaths = new Set(record.authorityPathsDiscovered);
  let requiresStop = false;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const targetPath = `/authorityPreflight/targets/${index}`;

    if (target.authorityBearing && !discoveredAuthorityPaths.has(target.path)) {
      collector.add(
        "CLEAN_AGENT_AUTHORITY_DISCOVERY_MISMATCH",
        runPath,
        `${targetPath}/path`,
        "An authority-bearing preflight target must appear in authorityPathsDiscovered.",
      );
    }

    if (target.decision === "NOT_AUTHORITY_BEARING" && target.authorityBearing) {
      collector.add(
        "CLEAN_AGENT_PREFLIGHT_DECISION_INVALID",
        runPath,
        `${targetPath}/decision`,
        "NOT_AUTHORITY_BEARING is inconsistent with authorityBearing=true.",
      );
    }

    if (target.decision === "EDIT_AUTHORIZED") {
      const authorized = (
        target.authorityBearing
        && target.taskContractId !== null
        && target.scopeWriteAuthorized
        && !target.readOnlyAuthority
        && !target.forbidden
        && target.mayChangeAuthority
        && target.objectiveCoversChange
      );
      if (!authorized) {
        collector.add(
          "CLEAN_AGENT_PREFLIGHT_DECISION_INVALID",
          runPath,
          `${targetPath}/decision`,
          "EDIT_AUTHORIZED requires an applicable contract and every authority-change preflight check to pass.",
        );
      }
    }

    if (target.decision === "STOP_REQUIRED") {
      requiresStop = true;
      const hasStopBasis = (
        target.taskContractId === null
        || !target.scopeWriteAuthorized
        || target.readOnlyAuthority
        || target.forbidden
        || !target.mayChangeAuthority
        || !target.objectiveCoversChange
      );
      if (!target.authorityBearing || !hasStopBasis) {
        collector.add(
          "CLEAN_AGENT_PREFLIGHT_DECISION_INVALID",
          runPath,
          `${targetPath}/decision`,
          "STOP_REQUIRED must identify an authority-bearing target and a failed preflight condition.",
        );
      }
    }
  }

  if (requiresStop && !record.stopBehavior.stopped) {
    collector.add(
      "CLEAN_AGENT_STOP_BEHAVIOR_INVALID",
      runPath,
      "/stopBehavior/stopped",
      "A STOP_REQUIRED preflight decision must result in stopped=true.",
    );
  }
  if (record.stopBehavior.stopped !== (record.stopBehavior.reasons.length > 0)) {
    collector.add(
      "CLEAN_AGENT_STOP_BEHAVIOR_INVALID",
      runPath,
      "/stopBehavior/reasons",
      "Stopped runs require at least one reason; non-stopped runs require an empty reason list.",
    );
  }
  if (requiresStop && record.edits.some((edit) => edit.performed)) {
    collector.add(
      "CLEAN_AGENT_UNAUTHORIZED_EDIT_INVALID",
      runPath,
      "/edits",
      "A run with a STOP_REQUIRED authority preflight must not perform an edit.",
    );
  }
  for (let index = 0; index < record.edits.length; index += 1) {
    const edit = record.edits[index];
    if (edit.performed && !targetsByPath.has(edit.path)) {
      collector.add(
        "CLEAN_AGENT_EDIT_PREFLIGHT_MISSING",
        runPath,
        `/edits/${index}/path`,
        "Every performed edit must have a matching authority preflight target.",
      );
    }
  }
}

function validateVerificationClaims(record, runPath, collector) {
  const commands = new Set();
  for (let index = 0; index < record.verificationClaims.length; index += 1) {
    const claim = record.verificationClaims[index];
    const claimPath = `/verificationClaims/${index}`;
    if (claim.sequence !== index + 1) {
      collector.add(
        "CLEAN_AGENT_VERIFICATION_SEQUENCE_INVALID",
        runPath,
        `${claimPath}/sequence`,
        "Verification sequence values must be consecutive from one.",
      );
    }
    if (commands.has(claim.command)) {
      collector.add(
        "CLEAN_AGENT_VERIFICATION_DUPLICATE",
        runPath,
        `${claimPath}/command`,
        "Verification commands must not be duplicated.",
      );
    }
    commands.add(claim.command);

    const runEvidenceComplete = (
      claim.status === "RUN"
      && Number.isInteger(claim.exitCode)
      && claim.outputSha256 !== null
    );
    const notRunEvidenceComplete = (
      claim.status === "NOT_RUN"
      && claim.exitCode === null
      && claim.outputSha256 === null
    );
    if (!runEvidenceComplete && !notRunEvidenceComplete) {
      collector.add(
        "CLEAN_AGENT_VERIFICATION_CLAIM_INVALID",
        runPath,
        claimPath,
        "RUN claims require exitCode and outputSha256; NOT_RUN claims require both values to be null.",
      );
    }
  }
}

function validateGrading(record, runPath, collector) {
  const criteria = record.grading.criteria;
  validateSortedUnique(criteria, (criterion) => criterion.id, runPath, "/grading/criteria", collector);
  for (let index = 0; index < criteria.length; index += 1) {
    validateSortedUnique(
      criteria[index].evidence,
      (evidence) => evidence,
      runPath,
      `/grading/criteria/${index}/evidence`,
      collector,
    );
  }

  const expectedInterpretation = criteria.some((criterion) => criterion.result === "FAIL") ? "FAIL" : "PASS";
  if (record.grading.interpretation !== expectedInterpretation) {
    collector.add(
      "CLEAN_AGENT_GRADING_INTERPRETATION_INVALID",
      runPath,
      "/grading/interpretation",
      "The interpretation must be FAIL when any criterion fails and PASS only when every criterion passes.",
    );
  }
}

function validateRunSemantics(entry, collector) {
  const { data: record, path: runPath } = entry;
  validateEncodedBytes(record.taskInput, runPath, "/taskInput", collector);
  validateEncodedBytes(record.boundedOutput, runPath, "/boundedOutput", collector);

  if (record.freshContext.worktreeHeadSha !== record.candidateSha) {
    collector.add(
      "CLEAN_AGENT_WORKTREE_HEAD_MISMATCH",
      runPath,
      "/freshContext/worktreeHeadSha",
      "The clean worktree HEAD must equal candidateSha.",
    );
  }

  validateSortedUnique(record.documentsDiscovered, (value) => value, runPath, "/documentsDiscovered", collector);
  validateSortedUnique(
    record.authorityPathsDiscovered,
    (value) => value,
    runPath,
    "/authorityPathsDiscovered",
    collector,
  );

  const discoveredDocuments = new Set(record.documentsDiscovered);
  for (let index = 0; index < record.authorityPathsDiscovered.length; index += 1) {
    if (!discoveredDocuments.has(record.authorityPathsDiscovered[index])) {
      collector.add(
        "CLEAN_AGENT_AUTHORITY_DISCOVERY_MISMATCH",
        runPath,
        `/authorityPathsDiscovered/${index}`,
        "Every authority path must also appear in documentsDiscovered.",
      );
    }
  }

  validateSortedUnique(
    record.edits,
    (edit) => `${edit.path}\0${edit.action}\0${String(edit.performed)}`,
    runPath,
    "/edits",
    collector,
  );
  validateSortedUnique(record.stopBehavior.reasons, (value) => value, runPath, "/stopBehavior/reasons", collector);
  validateSortedUnique(record.limitations, (value) => value, runPath, "/limitations", collector);

  validatePreflight(record, runPath, collector);
  validateVerificationClaims(record, runPath, collector);
  validateGrading(record, runPath, collector);
}

function sameTaskInput(left, right) {
  return (
    left.encoding === right.encoding
    && left.bytes === right.bytes
    && left.byteLength === right.byteLength
    && left.sha256 === right.sha256
  );
}

function validateRunPair(entries, collector) {
  if (entries.length !== 2) return;
  const ordered = [...entries].sort((left, right) => left.data.runOrdinal - right.data.runOrdinal);
  const [first, second] = ordered;

  if (first.data.runOrdinal !== 1 || second.data.runOrdinal !== 2) {
    collector.add(
      "CLEAN_AGENT_RUN_ORDINAL_INVALID",
      RUN_DIRECTORY,
      "/",
      "Exactly one runOrdinal=1 and one runOrdinal=2 are required.",
    );
  }
  if (first.data.runId === second.data.runId) {
    collector.add(
      "CLEAN_AGENT_RUN_ID_DUPLICATE",
      RUN_DIRECTORY,
      "/",
      "The two run records must use different runId values.",
    );
  }
  if (first.data.candidateSha !== second.data.candidateSha) {
    collector.add(
      "CLEAN_AGENT_CANDIDATE_MISMATCH",
      RUN_DIRECTORY,
      "/",
      "Both runs must use the same exact candidate SHA.",
    );
  }
  if (!sameTaskInput(first.data.taskInput, second.data.taskInput)) {
    collector.add(
      "CLEAN_AGENT_TASK_INPUT_MISMATCH",
      RUN_DIRECTORY,
      "/",
      "Both runs must use the same exact task-input bytes and digest.",
    );
  }
  if (first.data.grading.interpretation !== second.data.grading.interpretation) {
    collector.add(
      "CLEAN_AGENT_INTERPRETATION_MISMATCH",
      RUN_DIRECTORY,
      "/",
      "Both fresh-context runs must produce the same PASS or FAIL interpretation.",
    );
  }

  const firstCriteria = first.data.grading.criteria.map((criterion) => criterion.id);
  const secondCriteria = second.data.grading.criteria.map((criterion) => criterion.id);
  if (JSON.stringify(firstCriteria) !== JSON.stringify(secondCriteria)) {
    collector.add(
      "CLEAN_AGENT_GRADING_CRITERIA_MISMATCH",
      RUN_DIRECTORY,
      "/",
      "Both runs must be graded against the same ordered criterion identities.",
    );
  }
}

function validateCandidateBinding(entries, repositoryRoot, collector) {
  if (
    entries.length !== 2
    || entries.some((entry) => entry.data.candidateSha !== entries[0].data.candidateSha)
  ) {
    return;
  }
  const candidateSha = entries[0].data.candidateSha;
  const options = {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  };
  const commit = spawnSync(
    "git",
    ["-C", repositoryRoot, "cat-file", "-e", `${candidateSha}^{commit}`],
    options,
  );
  if (commit.status !== 0) {
    collector.add(
      "CLEAN_AGENT_CANDIDATE_COMMIT_INVALID",
      RUN_DIRECTORY,
      "/candidateSha",
      "The shared candidate SHA must identify an existing commit in this repository.",
    );
    return;
  }
  const ancestor = spawnSync(
    "git",
    ["-C", repositoryRoot, "merge-base", "--is-ancestor", candidateSha, "HEAD"],
    options,
  );
  if (ancestor.status !== 0) {
    collector.add(
      "CLEAN_AGENT_CANDIDATE_ANCESTRY_INVALID",
      RUN_DIRECTORY,
      "/candidateSha",
      "The shared candidate commit must be an ancestor of the retained evidence HEAD.",
    );
  }
}

function validateEntries({ schema, entries, collector }) {
  const validate = compileSchema(schema, collector);
  if (!validate) return [];

  const validEntries = [];
  for (const entry of entries) {
    if (!validate(entry.data)) {
      addSchemaFindings(validate.errors, entry.path, collector);
      continue;
    }

    const expectedName = `${entry.data.runId}.json`;
    if (path.posix.basename(entry.path) !== expectedName) {
      collector.add(
        "CLEAN_AGENT_RUN_FILENAME_INVALID",
        entry.path,
        "/runId",
        "The run-record filename must equal runId plus .json.",
      );
    }
    validateRunSemantics(entry, collector);
    validEntries.push(entry);
  }
  return validEntries;
}

export function validateCleanAgentRunSet({ schema, runs }) {
  const collector = makeCollector();
  if (runs.length !== 2) {
    collector.add(
      "CLEAN_AGENT_RUN_COUNT_INVALID",
      RUN_DIRECTORY,
      "/",
      "Exactly two Clean Agent run records are required.",
    );
  }
  const entries = validateEntries({ schema, entries: runs, collector });
  validateRunPair(entries, collector);
  return collector.finish(runs.length);
}

function readBoundedJson(root, repoPath, maximumBytes, collector, readFailureId) {
  const absolutePath = path.join(root, ...repoPath.split("/"));
  let details;
  try {
    details = fs.lstatSync(absolutePath);
  } catch {
    collector.add(readFailureId, repoPath, "/", "The required JSON file is missing or unreadable.");
    return undefined;
  }
  if (!details.isFile() || details.isSymbolicLink() || details.size > maximumBytes) {
    collector.add(
      readFailureId,
      repoPath,
      "/",
      "The required JSON path must be a bounded regular file and must not be a symbolic link.",
    );
    return undefined;
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(absolutePath));
  } catch {
    collector.add(readFailureId, repoPath, "/", "The required JSON file must contain valid UTF-8.");
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    collector.add(readFailureId, repoPath, "/", "The required JSON file contains malformed JSON.");
    return undefined;
  }
}

export function validateCleanAgentRunDirectory(repositoryRoot = DEFAULT_ROOT) {
  const root = path.resolve(repositoryRoot);
  const collector = makeCollector();
  const schema = readBoundedJson(
    root,
    SCHEMA_PATH,
    MAX_SCHEMA_BYTES,
    collector,
    "CLEAN_AGENT_SCHEMA_READ_FAILED",
  );

  const directoryPath = path.join(root, ...RUN_DIRECTORY.split("/"));
  let directoryEntries = [];
  try {
    const details = fs.lstatSync(directoryPath);
    if (!details.isDirectory() || details.isSymbolicLink()) throw new Error("invalid directory");
    directoryEntries = fs.readdirSync(directoryPath, { withFileTypes: true }).sort((left, right) => (
      compareText(left.name, right.name)
    ));
  } catch {
    collector.add(
      "CLEAN_AGENT_RUN_DIRECTORY_INVALID",
      RUN_DIRECTORY,
      "/",
      "The Clean Agent run-record directory is missing, unreadable, or not an ordinary directory.",
    );
    return collector.finish(0);
  }

  const jsonEntries = [];
  for (const entry of directoryEntries) {
    const repoPath = `${RUN_DIRECTORY}/${entry.name}`;
    if (!entry.isFile() || entry.isSymbolicLink?.() || !entry.name.endsWith(".json")) {
      collector.add(
        "CLEAN_AGENT_RUN_ENTRY_INVALID",
        repoPath,
        "/",
        "The run-record directory may contain only ordinary .json files.",
      );
      continue;
    }
    const data = readBoundedJson(root, repoPath, MAX_RUN_BYTES, collector, "CLEAN_AGENT_RUN_READ_FAILED");
    if (data !== undefined) jsonEntries.push({ path: repoPath, data });
  }

  if (jsonEntries.length !== 2) {
    collector.add(
      "CLEAN_AGENT_RUN_COUNT_INVALID",
      RUN_DIRECTORY,
      "/",
      "Exactly two readable Clean Agent .json run records are required.",
    );
  }

  if (schema !== undefined) {
    const validEntries = validateEntries({ schema, entries: jsonEntries, collector });
    validateRunPair(validEntries, collector);
    validateCandidateBinding(validEntries, root, collector);
  }
  return collector.finish(jsonEntries.length);
}

export function renderCleanAgentValidation(result) {
  return `${JSON.stringify(result)}\n`;
}

export function main(args = process.argv.slice(2)) {
  if (args.length > 0) {
    const result = {
      status: "INVALID",
      runCount: 0,
      findings: [{
        id: "CLEAN_AGENT_ARGUMENT_UNSUPPORTED",
        path: "scripts/governance/validate-clean-agent-runs.mjs",
        instancePath: "/",
        detail: "This validator accepts no command-line arguments.",
      }],
    };
    process.stdout.write(renderCleanAgentValidation(result));
    return 1;
  }

  const result = validateCleanAgentRunDirectory();
  process.stdout.write(renderCleanAgentValidation(result));
  return result.status === "VALID" ? 0 : 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
