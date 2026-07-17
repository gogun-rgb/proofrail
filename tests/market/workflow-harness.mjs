#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const requireFromTrustedConfig = createRequire(new URL("../../packages/trusted-config/package.json", import.meta.url));
const YAML = requireFromTrustedConfig("yaml");

const CHECKOUT_SHA = "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0";
const SETUP_NODE_SHA = "249970729cb0ef3589644e2896645e5dc5ba9c38";
const UPLOAD_ARTIFACT_SHA = "ea165f8d65b6e75b540449e92b4886f43607fa02";
const ACTIONS = Object.freeze({
  checkout: `actions/checkout@${CHECKOUT_SHA}`,
  setupNode: `actions/setup-node@${SETUP_NODE_SHA}`,
  uploadArtifact: `actions/upload-artifact@${UPLOAD_ARTIFACT_SHA}`,
});

const STEP_IDS = Object.freeze([
  "validate",
  "checkout-base",
  "checkout-head",
  "checkout-tool",
  "setup-node",
  "corepack",
  "install",
  "event",
  "prototype",
  "summary",
  "artifact",
  "final",
]);

const TOP_LEVEL_KEYS = Object.freeze(["name", "on", "permissions", "jobs"]);
const WORKFLOW_CALL_KEYS = Object.freeze(["inputs"]);
const INPUT_KEYS = Object.freeze(["config-path", "strict"]);
const PERMISSION_KEYS = Object.freeze(["contents", "pull-requests", "checks", "statuses"]);
const JOB_KEYS = Object.freeze(["name", "runs-on", "timeout-minutes", "steps"]);
const STEP_KEYS = Object.freeze(["name", "id", "if", "uses", "with", "env", "shell", "run"]);

const ALLOWED_EXPRESSIONS = new Set([
  "github.event_name",
  "github.event.pull_request.number",
  "github.event.pull_request.base.sha",
  "github.event.pull_request.base.repo.full_name",
  "github.event.pull_request.head.sha",
  "github.event.pull_request.head.repo.full_name",
  "job.workflow_repository",
  "job.workflow_sha",
  "github.token",
  "inputs.config-path",
  "inputs.strict",
  "runner.temp",
  "steps.prototype.outcome",
  "steps.artifact.outcome",
]);

const RUN_TEMPLATES = Object.freeze({
  validate: String.raw`if [[ "$EVENT_NAME" != "pull_request" || ! "$PR_NUMBER" =~ ^[1-9][0-9]*$ ]]; then
  echo "Proofrail: pull request event is required." >&2
  exit 1
fi
[[ "$BASE_SHA" =~ ^[0-9a-fA-F]{40}$ ]] || {
  echo "Proofrail: invalid base SHA." >&2
  exit 1
}
[[ "$HEAD_SHA" =~ ^[0-9a-fA-F]{40}$ ]] || {
  echo "Proofrail: invalid head SHA." >&2
  exit 1
}
if [[ "$CONFIG_PATH" != ".proofrail/config.yml" ]]; then
  echo "Proofrail: unsafe config path." >&2
  exit 1
fi`,
  corepack: "corepack enable",
  install: String.raw`cd proofrail-tool
corepack install
pnpm install --frozen-lockfile`,
  event: String.raw`node proofrail-tool/packages/evidence-gate/src/workflow-event-cli.mjs \
  --github-repo "$GITHUB_REPOSITORY" \
  --pull-request "$PR_NUMBER" \
  --base-sha "$BASE_SHA" \
  --head-sha "$HEAD_SHA" \
  --output "$RUNNER_TEMP/proofrail-event.json"`,
  prototype: String.raw`node proofrail-tool/packages/evidence-gate/src/prototype-cli.mjs \
  --event "$RUNNER_TEMP/proofrail-event.json" \
  --repo proofrail-target \
  --config "proofrail-base/$CONFIG_PATH" \
  --output proofrail-output \
  --shell /usr/bin/bash \
  --github-repo "$GITHUB_REPOSITORY" \
  --pull-request "$PR_NUMBER" \
  --strict`,
  summary: String.raw`if [[ -f proofrail-output/summary.md ]]; then
  cat proofrail-output/summary.md >> "$GITHUB_STEP_SUMMARY"
else
  echo "## Proofrail did not produce a summary" >> "$GITHUB_STEP_SUMMARY"
fi`,
  final: String.raw`[[ "$PROTOTYPE_OUTCOME" == "success" ]] || exit 1
[[ "$ARTIFACT_OUTCOME" == "success" ]] || exit 1
if [[ "$STRICT" == "true" ]]; then
  test -f proofrail-output/evidence-bundle.json || exit 1
  verdict="$(node -e 'const fs=require("fs"); const b=JSON.parse(fs.readFileSync("proofrail-output/evidence-bundle.json","utf8")); process.stdout.write(String(b.verdict ?? ""));')"
  [[ "$verdict" == "ADMISSIBLE" ]] || exit 1
fi`,
});

const CHECKOUT_WITH = Object.freeze({
  "checkout-base": {
    repository: "${{ github.event.pull_request.base.repo.full_name }}",
    ref: "${{ github.event.pull_request.base.sha }}",
    path: "proofrail-base",
    "fetch-depth": 1,
    "persist-credentials": false,
  },
  "checkout-head": {
    repository: "${{ github.event.pull_request.head.repo.full_name }}",
    ref: "${{ github.event.pull_request.head.sha }}",
    path: "proofrail-target",
    "fetch-depth": 1,
    "persist-credentials": false,
  },
  "checkout-tool": {
    repository: "${{ job.workflow_repository }}",
    ref: "${{ job.workflow_sha }}",
    path: "proofrail-tool",
    "fetch-depth": 1,
    "persist-credentials": false,
  },
});

const FAILURE_CODES = Object.freeze({
  "missing-collector": [20, "WORKFLOW_COLLECTOR_UNAVAILABLE"],
  "invalid-input": [21, "WORKFLOW_INPUT_INVALID"],
  "unsupported-argument": [21, "WORKFLOW_INPUT_INVALID"],
  "checkout-mismatch": [22, "CHECKOUT_HEAD_MISMATCH"],
  "wrong-sha": [22, "CHECKOUT_HEAD_MISMATCH"],
  "stale-head": [23, "TARGET_HEAD_STALE"],
  "artifact-failure": [24, "ARTIFACT_PUBLICATION_FAILED"],
  "missing-artifact": [24, "ARTIFACT_PUBLICATION_FAILED"],
  "failed-prototype": [26, "PROTOTYPE_EXECUTION_FAILED"],
  timeout: [26, "PROTOTYPE_EXECUTION_FAILED"],
  "output-overflow": [26, "PROTOTYPE_EXECUTION_FAILED"],
  "live-auth-failure": [26, "CURRENT_HEAD_UNAVAILABLE"],
});

export class WorkflowHarnessError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WorkflowHarnessError";
    this.code = code;
    Object.assign(this, details);
  }
}

export function parseWorkflow(value) {
  assertPlainObject(value, "WORKFLOW_SCHEMA_INVALID");
  assertExactKeys(value, TOP_LEVEL_KEYS, "WORKFLOW_SCHEMA_INVALID");
  if (typeof value.name !== "string" || value.name !== "Proofrail") failSchema("workflow name");

  assertPlainObject(value.on, "WORKFLOW_SCHEMA_INVALID");
  assertExactKeys(value.on, ["workflow_call"], "WORKFLOW_SCHEMA_INVALID");
  assertPlainObject(value.on.workflow_call, "WORKFLOW_SCHEMA_INVALID");
  assertExactKeys(value.on.workflow_call, WORKFLOW_CALL_KEYS, "WORKFLOW_SCHEMA_INVALID");
  validateInputs(value.on.workflow_call.inputs);

  assertPlainObject(value.permissions, "WORKFLOW_SCHEMA_INVALID");
  assertExactKeys(value.permissions, PERMISSION_KEYS, "WORKFLOW_SCHEMA_INVALID");
  for (const key of PERMISSION_KEYS) if (value.permissions[key] !== "read") failSchema(`permission ${key}`);

  assertPlainObject(value.jobs, "WORKFLOW_SCHEMA_INVALID");
  assertExactKeys(value.jobs, ["proofrail"], "WORKFLOW_SCHEMA_INVALID");
  const job = value.jobs.proofrail;
  assertPlainObject(job, "WORKFLOW_SCHEMA_INVALID");
  assertExactKeys(job, JOB_KEYS, "WORKFLOW_SCHEMA_INVALID");
  if (job.name !== "Proofrail") failSchema("job name");
  if (job["runs-on"] !== "ubuntu-latest"
      || !Number.isInteger(job["timeout-minutes"])
      || job["timeout-minutes"] < 1
      || job["timeout-minutes"] > 60
      || !Array.isArray(job.steps)) {
    failSchema("job boundary");
  }
  if (job.steps.length !== STEP_IDS.length) failSchema("step count");

  const steps = job.steps.map((step, index) => validateStep(step, index));
  const ids = steps.map((step) => step.id);
  if (ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length) failSchema("step ids");
  if (ids.join("\u0000") !== STEP_IDS.join("\u0000")) failSchema("step order");
  const normalized = {
    name: value.name,
    on: { workflow_call: { inputs: structuredClone(value.on.workflow_call.inputs) } },
    permissions: structuredClone(value.permissions),
    jobs: { proofrail: { ...job, steps } },
  };
  return deepFreeze(normalized);
}

function validateInputs(inputs) {
  assertPlainObject(inputs, "WORKFLOW_SCHEMA_INVALID");
  assertExactKeys(inputs, INPUT_KEYS, "WORKFLOW_SCHEMA_INVALID");
  const expected = {
    "config-path": { type: "string", required: false, default: ".proofrail/config.yml" },
    strict: { type: "boolean", required: false, default: true },
  };
  for (const key of INPUT_KEYS) {
    const input = inputs[key];
    assertPlainObject(input, "WORKFLOW_SCHEMA_INVALID");
    assertExactKeys(input, ["type", "required", "default"], "WORKFLOW_SCHEMA_INVALID");
    if (input.type !== expected[key].type || input.required !== false || input.default !== expected[key].default) failSchema(`input ${key}`);
  }
}

function validateStep(step, index) {
  assertPlainObject(step, "WORKFLOW_SCHEMA_INVALID");
  assertKeysAllowed(step, STEP_KEYS, "WORKFLOW_SCHEMA_INVALID");
  if (typeof step.name !== "string" || typeof step.id !== "string") failSchema(`step ${index} identity`);
  for (const value of Object.values(step)) scanExpressions(value);
  for (const field of ["name", "id", "if", "uses", "shell", "run"]) {
    if (typeof step[field] === "string" && step[field].includes("${{")) failSchema(`expression placement ${field}`);
  }
  const id = step.id;
  if (id === "validate") {
    assertStepShape(step, ["name", "id", "shell", "env", "run"]);
    if (step.shell !== "bash" || !sameRun(step.run, RUN_TEMPLATES.validate)) failSchema("validate step");
    assertExactEnv(step.env, {
      EVENT_NAME: "${{ github.event_name }}",
      PR_NUMBER: "${{ github.event.pull_request.number }}",
      BASE_SHA: "${{ github.event.pull_request.base.sha }}",
      HEAD_SHA: "${{ github.event.pull_request.head.sha }}",
      CONFIG_PATH: "${{ inputs.config-path }}",
    });
  } else if (id === "checkout-base" || id === "checkout-head" || id === "checkout-tool") {
    assertStepShape(step, ["name", "id", "uses", "with"]);
    if (step.uses !== ACTIONS.checkout || !sameObject(step.with, CHECKOUT_WITH[id])) failSchema(`${id} step`);
  } else if (id === "setup-node") {
    assertStepShape(step, ["name", "id", "uses", "with"]);
    if (step.uses !== ACTIONS.setupNode || !sameObject(step.with, { "node-version": 24 })) failSchema("setup-node step");
  } else if (id === "corepack" || id === "install") {
    assertStepShape(step, ["name", "id", "shell", "run"]);
    if (step.shell !== "bash" || !sameRun(step.run, RUN_TEMPLATES[id])) failSchema(`${id} step`);
  } else if (id === "event") {
    assertStepShape(step, ["name", "id", "shell", "env", "run"]);
    if (step.shell !== "bash" || !sameRun(step.run, RUN_TEMPLATES.event)) failSchema("event step");
    assertExactEnv(step.env, {
      GH_TOKEN: "${{ github.token }}",
      PR_NUMBER: "${{ github.event.pull_request.number }}",
      BASE_SHA: "${{ github.event.pull_request.base.sha }}",
      HEAD_SHA: "${{ github.event.pull_request.head.sha }}",
    });
  } else if (id === "prototype") {
    assertStepShape(step, ["name", "id", "shell", "env", "run"]);
    if (step.shell !== "bash" || !sameRun(step.run, RUN_TEMPLATES.prototype)) failSchema("prototype step");
    assertExactEnv(step.env, {
      PR_NUMBER: "${{ github.event.pull_request.number }}",
      CONFIG_PATH: "${{ inputs.config-path }}",
      STRICT: "${{ inputs.strict }}",
    });
    if (Object.hasOwn(step.env, "GH_TOKEN") || Object.hasOwn(step.env, "GITHUB_TOKEN")) failSchema("prototype token isolation");
  } else if (id === "summary") {
    assertStepShape(step, ["name", "id", "if", "shell", "run"]);
    if (step.if !== "always()" || step.shell !== "bash" || !sameRun(step.run, RUN_TEMPLATES.summary)) failSchema("summary step");
  } else if (id === "artifact") {
    assertStepShape(step, ["name", "id", "if", "uses", "with"]);
    if (step.if !== "always()" || step.uses !== ACTIONS.uploadArtifact || !sameObject(step.with, {
      name: "proofrail-evidence",
      path: "proofrail-output/",
      "if-no-files-found": "error",
      "retention-days": 14,
    })) failSchema("artifact step");
  } else if (id === "final") {
    assertStepShape(step, ["name", "id", "if", "shell", "env", "run"]);
    if (step.if !== "always()" || step.shell !== "bash" || !sameRun(step.run, RUN_TEMPLATES.final)) failSchema("final step");
    assertExactEnv(step.env, {
      STRICT: "${{ inputs.strict }}",
      PROTOTYPE_OUTCOME: "${{ steps.prototype.outcome }}",
      ARTIFACT_OUTCOME: "${{ steps.artifact.outcome }}",
    });
  } else {
    failSchema(`unknown step ${id}`);
  }
  return structuredClone(step);
}

function assertStepShape(step, keys) {
  assertExactKeys(step, keys, "WORKFLOW_SCHEMA_INVALID");
}

function assertExactEnv(env, expected) {
  assertPlainObject(env, "WORKFLOW_SCHEMA_INVALID");
  if (!sameObject(env, expected)) failSchema("step environment");
}

function scanExpressions(value, visited = new WeakSet(), active = new WeakSet()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/\$\{\{\s*([^}]+?)\s*\}\}/g)) {
      if (!ALLOWED_EXPRESSIONS.has(match[1])) failSchema(`expression ${match[1]}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (active.has(value)) failSchema("cyclic workflow value");
  if (visited.has(value)) return;
  active.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) scanExpressions(entry, visited, active);
  } else {
    for (const entry of Object.values(value)) scanExpressions(entry, visited, active);
  }
  active.delete(value);
  visited.add(value);
}

function sameRun(actual, expected) {
  return typeof actual === "string" && actual.replace(/\r\n/g, "\n").trim() === expected.replace(/\r\n/g, "\n").trim();
}

function sameObject(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function assertExactKeys(value, expected, code) {
  const keys = Object.keys(value);
  if (keys.length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) failSchema(code);
}

function assertKeysAllowed(value, allowed, code) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) failSchema(code);
}

function assertPlainObject(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) failSchema(code);
}

function failSchema(message) {
  throw new WorkflowHarnessError("WORKFLOW_SCHEMA_INVALID", message);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export async function simulateWorkflow(workflow, options = {}) {
  const parsed = parseWorkflow(workflow);
  const requestedInputs = options.inputs;
  const inputRecord = requestedInputs && typeof requestedInputs === "object" && !Array.isArray(requestedInputs)
    && Object.getPrototypeOf(requestedInputs) === Object.prototype;
  const inputKeys = inputRecord
    ? Reflect.ownKeys(requestedInputs)
    : [];
  const inputShapeInvalid = requestedInputs !== undefined
    && (!inputRecord || inputKeys.some((key) => !["config-path", "strict"].includes(key)));
  const configInputProvided = inputRecord && Object.hasOwn(requestedInputs, "config-path");
  const strictInputProvided = inputRecord && Object.hasOwn(requestedInputs, "strict");
  const configInput = configInputProvided ? requestedInputs["config-path"] : undefined;
  const strictInput = strictInputProvided ? requestedInputs.strict : undefined;
  const configInputInvalid = configInputProvided && (configInput === undefined || configInput === null || typeof configInput !== "string");
  const strictInputInvalid = strictInputProvided && (strictInput === undefined || strictInput === null || typeof strictInput !== "boolean");
  const configConflict = configInputProvided && Object.hasOwn(options, "configPath") && options.configPath !== configInput;
  const strictConflict = strictInputProvided && Object.hasOwn(options, "strict") && options.strict !== strictInput;
  const configPath = Object.hasOwn(options, "configPath") ? options.configPath : configInputProvided ? configInput : ".proofrail/config.yml";
  const strict = Object.hasOwn(options, "strict") ? options.strict : strictInputProvided ? strictInput : true;
  const caseName = options.caseName ?? options.case ?? "success";
  const outputPath = options.output ? path.resolve(options.output) : null;
  const tokenCanary = typeof options.tokenCanary === "string" && options.tokenCanary.length > 0 ? options.tokenCanary : null;
  if (inputShapeInvalid || configInputInvalid || strictInputInvalid || configConflict || strictConflict || configPath === null || strict === null || typeof configPath !== "string" || configPath !== ".proofrail/config.yml" || typeof strict !== "boolean" || (options.consumerPathMode !== undefined && options.consumerPathMode !== "no-toolchain")) {
    return writeAndReturnFailure(parsed, options, {
      exitCode: 21,
      reason: "WORKFLOW_INPUT_INVALID",
      verdict: null,
      configPath,
      strict,
    });
  }
  const failure = FAILURE_CODES[caseName];
  if (caseName !== "success" && !failure && caseName !== "non-admissible" && caseName !== "rejected" && caseName !== "blocked" && caseName !== "revision-required") {
    return writeAndReturnFailure(parsed, options, { exitCode: 21, reason: "WORKFLOW_INPUT_INVALID", verdict: null, configPath, strict });
  }

  const event = makeEvent(caseName, options);
  const trace = [];
  const stepResults = {};
  const checkouts = [];
  let verdict = "ADMISSIBLE";
  let reasonCodes = [];
  let failureCode = null;
  let failureReason = null;
  let prototypeOutcome = "success";
  let artifactOutcome = "success";
  let tokenCanaryReceivedByCollector = false;
  const targetEnvironment = Object.freeze({
    CI: "true",
    HOME: "/home/runner",
    LANG: "C.UTF-8",
    PATH: "/usr/bin",
    RUNNER_ARCH: "X64",
    RUNNER_OS: "Linux",
    SHELL: "/bin/bash",
    TEMP: "/tmp",
    TMP: "/tmp",
    TMPDIR: "/tmp",
  });
  for (const step of parsed.jobs.proofrail.steps) {
    if (trace.includes(step.id)) throw new WorkflowHarnessError("WORKFLOW_SIMULATION_INVALID", `step ${step.id} simulated twice`);
    trace.push(step.id);
    let outcome = "success";
    if (step.id === "validate") {
      if (caseName === "invalid-input" || caseName === "unsupported-argument") {
        outcome = "failure";
        failureCode ??= 21;
        failureReason ??= "WORKFLOW_INPUT_INVALID";
        verdict = "BLOCKED";
        reasonCodes = ["WORKFLOW_INPUT_INVALID"];
      }
    } else if (step.id === "checkout-base") {
      checkouts.push({ path: "proofrail-base", repository: event.baseRepository, ref: event.baseSha, fetchDepth: 1, persistCredentials: false });
    } else if (step.id === "checkout-head") {
      checkouts.push({ path: "proofrail-target", repository: event.headRepository, ref: event.headSha, fetchDepth: 1, persistCredentials: false });
      if (caseName === "checkout-mismatch" || caseName === "wrong-sha") {
        outcome = "failure";
        failureCode ??= 22;
        failureReason ??= "CHECKOUT_HEAD_MISMATCH";
        verdict = "BLOCKED";
        reasonCodes = ["CHECKOUT_HEAD_MISMATCH"];
      }
    } else if (step.id === "checkout-tool") {
      checkouts.push({ path: "proofrail-tool", repository: event.workflowRepository, ref: event.workflowSha, fetchDepth: 1, persistCredentials: false });
    } else if (step.id === "event") {
      const collectorEnvironment = { GH_TOKEN: tokenCanary ?? "[CONTROL_TOKEN_ONLY]" };
      tokenCanaryReceivedByCollector = tokenCanary !== null && collectorEnvironment.GH_TOKEN === tokenCanary;
      if (caseName === "missing-collector") {
        outcome = "failure";
        failureCode ??= 20;
        reasonCodes = ["WORKFLOW_COLLECTOR_UNAVAILABLE"];
        verdict = "BLOCKED";
        failureReason ??= "WORKFLOW_COLLECTOR_UNAVAILABLE";
      }
    } else if (step.id === "prototype") {
      if (failureCode === null && caseName !== "missing-collector" && caseName !== "invalid-input" && caseName !== "unsupported-argument" && caseName !== "checkout-mismatch" && caseName !== "wrong-sha") {
        if (caseName === "stale-head") {
          verdict = "BLOCKED";
          reasonCodes = ["PRF_STALE_TARGET"];
          failureCode ??= 23;
          failureReason ??= "TARGET_HEAD_STALE";
        } else if (caseName === "non-admissible" || caseName === "revision-required") {
          verdict = "REVISION_REQUIRED";
          reasonCodes = ["PRF_REVIEW_REQUIREMENT_UNSATISFIED"];
          outcome = "failure";
          prototypeOutcome = "failure";
          failureCode ??= 25;
          failureReason ??= reasonCodes[0];
        } else if (caseName === "rejected") {
          verdict = "REJECTED";
          reasonCodes = ["PRF_SCOPE_PATH_DENIED"];
        } else if (caseName === "blocked") {
          verdict = "BLOCKED";
          reasonCodes = ["PRF_EXECUTION_FAILED"];
        } else if (failure) {
          outcome = "failure";
          prototypeOutcome = "failure";
          verdict = "BLOCKED";
          failureCode ??= failure[0];
          failureReason ??= failure[1];
          reasonCodes = [failure[1]];
        }
      }
      if (failureCode !== null && [20, 21, 22].includes(failureCode)) outcome = "skipped";
    } else if (step.id === "artifact") {
      if (caseName === "artifact-failure" || caseName === "missing-artifact") {
        outcome = "failure";
        artifactOutcome = "failure";
        failureCode ??= 24;
        failureReason ??= "ARTIFACT_PUBLICATION_FAILED";
        reasonCodes = ["ARTIFACT_PUBLICATION_FAILED"];
      }
    } else if (step.id === "final") {
      if (failureCode === null && verdict !== "ADMISSIBLE") {
        outcome = "failure";
        failureCode = 25;
        reasonCodes = reasonCodes.length > 0 ? reasonCodes : ["NON_ADMISSIBLE_VERDICT"];
        failureReason ??= reasonCodes[0];
      } else if (failureCode !== null) {
        outcome = "failure";
      }
    }
    stepResults[step.id] = Object.freeze({ id: step.id, outcome, simulated: true });
  }

  const effectiveExit = failureCode ?? (strict && verdict !== "ADMISSIBLE" ? 25 : 0);
  if (effectiveExit === 25 && reasonCodes.length === 0) reasonCodes = ["NON_ADMISSIBLE_VERDICT"];
  const shouldCreateBundle = failureCode === null || failureCode === 25;
  const bundle = shouldCreateBundle ? makeBundle(event, verdict, reasonCodes, targetEnvironment, caseName) : null;
  const outputs = bundle
    ? { "evidence-bundle.json": `${JSON.stringify(bundle)}\n`, "summary.md": makeSummary(bundle), "telemetry.json": `${JSON.stringify({ enabled: false, networkTransmission: false, events: [] })}\n` }
    : makeDeliveryFailureOutputs(failureReason ?? reasonCodes[0] ?? "WORKFLOW_FAILED");
  const summary = outputs["summary.md"];
  const retained = JSON.stringify({ targetEnvironment, outputs });
  const tokenCanaryInTarget = tokenCanary !== null && JSON.stringify(targetEnvironment).includes(tokenCanary);
  const tokenCanaryInArtifacts = tokenCanary !== null && retained.includes(tokenCanary);
  if (tokenCanaryInTarget || tokenCanaryInArtifacts) throw new WorkflowHarnessError("WORKFLOW_TOKEN_LEAK", "control token reached target or retained artifact");
  const result = {
    exitCode: effectiveExit,
    verdict,
    reasonCodes,
    strict,
    configPath,
    stepTrace: trace,
    stepResults,
    checkouts,
    targetEnvironment,
    collectorEnvironment: { GH_TOKEN: "[CONTROL_TOKEN_ONLY]" },
    tokenIsolation: { targetReceivedControlToken: false, tokenCanaryReceivedByCollector, tokenCanaryInTarget, tokenCanaryInArtifacts },
    failureReason,
    artifact: { name: "proofrail-evidence", path: "proofrail-output/", published: bundle !== null && effectiveExit !== 24 },
    summary,
    bundle,
    outputs,
  };
  await writeOutputs(outputPath, result);
  return result;
}

function makeEvent(caseName, options) {
  const headSha = "2".repeat(40);
  return {
    repository: "proofrail/demo",
    baseRepository: "proofrail/demo",
    headRepository: options.headRepository ?? "proofrail/demo",
    pullRequestNumber: 8,
    baseSha: "1".repeat(40),
    headSha,
    currentHeadSha: caseName === "stale-head" ? "3".repeat(40) : headSha,
    workflowSha: "4".repeat(40),
    workflowRepository: options.workflowRepository ?? "gogun-rgb/proofrail",
  };
}

function makeBundle(event, verdict, reasonCodes, targetEnvironment, caseName) {
  return {
    schemaVersion: "proofrail.evidence-bundle.v2",
    target: { repository: event.repository, pullRequestNumber: event.pullRequestNumber, baseSha: event.baseSha, headSha: event.headSha },
    verdict,
    reasonCodes,
    verificationReceipts: verdict === "ADMISSIBLE" ? [{ command: { name: "diff-check", run: "git diff --check" }, result: { status: "PASS" }, environment: { allowedEnvironmentNames: Object.keys(targetEnvironment).sort() } }] : [],
    runtime: { case: caseName, currentHeadSha: event.currentHeadSha },
    summary: { verdict, reasonCodes },
  };
}

function makeSummary(bundle) {
  const reasons = bundle.reasonCodes.length === 0 ? "None" : bundle.reasonCodes.map((code) => `\`${code}\``).join(", ");
  return `# Proofrail ${bundle.verdict}\n\nVerified head: \`${bundle.target.headSha}\`\nReason codes: ${reasons}\n`;
}

function makeDeliveryFailureOutputs(reason) {
  const stage = reason === "WORKFLOW_INPUT_INVALID" ? "INPUT" : "EXECUTION";
  return {
    "failure.json": `${JSON.stringify({ schemaVersion: "proofrail.delivery-failure.v1", code: "PROOFRAIL_PROTOTYPE_DELIVERY_FAILED", stage, reason })}\n`,
    "summary.md": `# Proofrail delivery blocked\n\nReason: \`${reason}\`\n\nNo Evidence Bundle was produced for this attempt. This failure packet is delivery evidence only; it is not a product Verdict.\n`,
    "telemetry.json": `${JSON.stringify({ schemaVersion: "proofrail.telemetry.local.v1", enabled: false, networkTransmission: false, events: [] })}\n`,
  };
}

async function writeAndReturnFailure(workflow, options, details) {
  const result = {
    exitCode: details.exitCode,
    verdict: details.verdict,
    reasonCodes: [details.reason],
    strict: details.strict,
    configPath: details.configPath,
    stepTrace: workflow.jobs.proofrail.steps.map(({ id }) => id),
    stepResults: Object.fromEntries(workflow.jobs.proofrail.steps.map(({ id }) => [id, { id, outcome: id === "final" ? "failure" : "success", simulated: true }])),
    checkouts: [],
    targetEnvironment: {},
    collectorEnvironment: { GH_TOKEN: "[CONTROL_TOKEN_ONLY]" },
    tokenIsolation: { targetReceivedControlToken: false, tokenCanaryReceivedByCollector: false, tokenCanaryInTarget: false, tokenCanaryInArtifacts: false },
    artifact: { name: "proofrail-evidence", path: "proofrail-output/", published: false },
    summary: makeDeliveryFailureOutputs(details.reason)["summary.md"],
    bundle: null,
    outputs: makeDeliveryFailureOutputs(details.reason),
  };
  await writeOutputs(options.output ? path.resolve(options.output) : null, result);
  return result;
}

async function writeOutputs(outputPath, result) {
  if (!outputPath) return;
  await mkdir(outputPath, { recursive: true });
  if (result.bundle) {
    await writeFile(path.join(outputPath, "evidence-bundle.json"), result.outputs["evidence-bundle.json"], "utf8");
    await writeFile(path.join(outputPath, "summary.md"), result.outputs["summary.md"], "utf8");
    await writeFile(path.join(outputPath, "telemetry.json"), result.outputs["telemetry.json"], "utf8");
  } else if (result.outputs["failure.json"]) {
    await writeFile(path.join(outputPath, "failure.json"), result.outputs["failure.json"], "utf8");
    await writeFile(path.join(outputPath, "summary.md"), result.outputs["summary.md"], "utf8");
    await writeFile(path.join(outputPath, "telemetry.json"), result.outputs["telemetry.json"], "utf8");
  }
}

export async function loadWorkflowFile(workflowPath) {
  const source = await readFile(workflowPath, "utf8");
  return { source, workflow: parseWorkflow(YAML.parse(source)) };
}

function parseCliArguments(args) {
  const values = {};
  const allowed = new Set(["--workflow", "--case", "--output", "--consumer-path-mode", "--strict"]);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!allowed.has(key) || typeof value !== "string" || value.startsWith("--") || Object.hasOwn(values, key)) throw new WorkflowHarnessError("WORKFLOW_INPUT_INVALID", "invalid harness arguments");
    values[key] = value;
  }
  if (typeof values["--workflow"] !== "string" || typeof values["--output"] !== "string") throw new WorkflowHarnessError("WORKFLOW_INPUT_INVALID", "workflow and output are required");
  return values;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseCliArguments(process.argv.slice(2));
    const { workflow } = await loadWorkflowFile(path.resolve(args["--workflow"]));
    if (args["--strict"] !== undefined && args["--strict"] !== "true" && args["--strict"] !== "false") {
      throw Object.assign(new WorkflowHarnessError("WORKFLOW_INPUT_INVALID", "invalid strict input"), { exitCode: 21 });
    }
    const strict = args["--strict"] === undefined ? undefined : args["--strict"] === "true";
    const simulationOptions = {
      caseName: args["--case"] ?? "success",
      output: args["--output"],
      consumerPathMode: args["--consumer-path-mode"] ?? "no-toolchain",
    };
    if (strict !== undefined) simulationOptions.strict = strict;
    const result = await simulateWorkflow(workflow, simulationOptions);
    process.stdout.write(`${result.verdict ?? "FAILED"}\n`);
    process.exitCode = result.exitCode;
  } catch (error) {
    const code = error instanceof WorkflowHarnessError ? error.code : "WORKFLOW_HARNESS_FAILED";
    process.stderr.write(`${code}\n`);
    process.exitCode = error instanceof WorkflowHarnessError && Number.isInteger(error.exitCode) ? error.exitCode : 21;
  }
}

export { ACTIONS, STEP_IDS };
