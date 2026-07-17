import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ACTIONS,
  STEP_IDS,
  WorkflowHarnessError,
  parseWorkflow,
  simulateWorkflow,
} from "./workflow-harness.mjs";

const requireFromTrustedConfig = createRequire(new URL("../../packages/trusted-config/package.json", import.meta.url));
const YAML = requireFromTrustedConfig("yaml");
const WORKFLOW_PATH = new URL("../../.github/workflows/proofrail.yml", import.meta.url);
const DEMO_WORKFLOW_PATH = new URL("../../examples/market-prototype/demo/.github/workflows/proofrail.yml", import.meta.url);
const REVIEWED_WORKFLOW_SHA = "332969ce635a0a818072a6c45ecaf8288c76f0f0";

async function load() {
  const source = await readFile(WORKFLOW_PATH, "utf8");
  return { source, workflow: parseWorkflow(YAML.parse(source)) };
}

test("reviewed workflow pin resolves to the exact retained workflow source", async () => {
  const source = await readFile(WORKFLOW_PATH, "utf8");
  const pinnedSource = execFileSync(
    "git",
    ["show", `${REVIEWED_WORKFLOW_SHA}:.github/workflows/proofrail.yml`],
    {
      cwd: new URL("../../", import.meta.url),
      encoding: "utf8",
    },
  );
  assert.equal(pinnedSource, source.replaceAll("\r\n", "\n"));
});

test("sole-source workflow parses and simulates every step exactly once", async () => {
  const { source, workflow } = await load();
  assert.match(source, /name: Proofrail/);
  const result = await simulateWorkflow(workflow, { caseName: "success", consumerPathMode: "no-toolchain" });
  assert.equal(result.exitCode, 0);
  assert.equal(result.verdict, "ADMISSIBLE");
  assert.deepEqual(result.stepTrace, STEP_IDS);
  assert.deepEqual(Object.keys(result.stepResults), STEP_IDS);
  assert.equal(result.targetEnvironment.GH_TOKEN, undefined);
  assert.equal(result.tokenIsolation.targetReceivedControlToken, false);
  assert.equal(result.tokenIsolation.tokenCanaryInArtifacts, false);
});

test("demo consumer workflow is pinned and read-only", async () => {
  const source = await readFile(DEMO_WORKFLOW_PATH, "utf8");
  assert.match(source, new RegExp(`uses: gogun-rgb\\/proofrail\\/\\.github\\/workflows\\/proofrail\\.yml@${REVIEWED_WORKFLOW_SHA}`));
  assert.match(source, /config-path: \.proofrail\/config\.yml/);
  assert.doesNotMatch(source, /checks:\s*write|contents:\s*write|pull-requests:\s*write/);
});

test("closed workflow schema and input defaults are exact", async () => {
  const { workflow } = await load();
  assert.deepEqual(workflow.on, {
    workflow_call: {
      inputs: {
        "config-path": { type: "string", required: false, default: ".proofrail/config.yml" },
        strict: { type: "boolean", required: false, default: true },
      },
    },
  });
  assert.deepEqual(workflow.permissions, { contents: "read", "pull-requests": "read", checks: "read", statuses: "read" });
  assert.deepEqual(Object.keys(workflow.jobs), ["proofrail"]);
  assert.deepEqual(Object.keys(workflow.jobs.proofrail), ["name", "runs-on", "timeout-minutes", "steps"]);
  assert.equal(workflow.jobs.proofrail.name, "Proofrail");
  assert.equal(workflow.jobs.proofrail["runs-on"], "ubuntu-latest");
  assert.ok(workflow.jobs.proofrail["timeout-minutes"] <= 60);
  assert.deepEqual(workflow.jobs.proofrail.steps.map(({ id }) => id), STEP_IDS);
  assert(workflow.jobs.proofrail.steps.every((step) => !Object.hasOwn(step, "continue-on-error")));
});

test("exact pinned actions and checkout boundaries are enforced", async () => {
  const { workflow } = await load();
  const steps = workflow.jobs.proofrail.steps;
  const checkouts = steps.filter((step) => step.id.startsWith("checkout-"));
  assert.deepEqual(checkouts.map((step) => step.uses), [ACTIONS.checkout, ACTIONS.checkout, ACTIONS.checkout]);
  assert.deepEqual(checkouts.map((step) => step.with.path), ["proofrail-base", "proofrail-target", "proofrail-tool"]);
  assert.deepEqual(checkouts.map((step) => step.with["fetch-depth"]), [1, 1, 1]);
  assert.deepEqual(checkouts.map((step) => step.with["persist-credentials"]), [false, false, false]);
  assert.equal(checkouts[0].with.repository, "${{ github.event.pull_request.base.repo.full_name }}");
  assert.equal(checkouts[1].with.repository, "${{ github.event.pull_request.head.repo.full_name }}");
  assert.equal(checkouts[2].with.repository, "${{ job.workflow_repository }}");
  assert.deepEqual(checkouts.map((step) => step.with.ref), [
    "${{ github.event.pull_request.base.sha }}",
    "${{ github.event.pull_request.head.sha }}",
    "${{ job.workflow_sha }}",
  ]);
  assert.equal(steps.find((step) => step.id === "setup-node").uses, ACTIONS.setupNode);
  assert.equal(steps.find((step) => step.id === "artifact").uses, ACTIONS.uploadArtifact);
});

test("workflow never performs an implicit dependency install in the untrusted target checkout", async () => {
  const { workflow } = await load();
  const installCommands = workflow.jobs.proofrail.steps.filter((step) => /\bpnpm\s+(?:install|i)\b/.test(step.run ?? ""));

  assert.deepEqual(installCommands.map((step) => step.id), ["install"]);
  assert.match(installCommands[0].run, /cd proofrail-tool/);
  assert.doesNotMatch(installCommands[0].run, /proofrail-target/);
});

test("token is available only to collection and never to target verification", async () => {
  const { workflow } = await load();
  const event = workflow.jobs.proofrail.steps.find((step) => step.id === "event");
  const prototype = workflow.jobs.proofrail.steps.find((step) => step.id === "prototype");
  assert.deepEqual(event.env, {
    GH_TOKEN: "${{ github.token }}",
    PR_NUMBER: "${{ github.event.pull_request.number }}",
    BASE_SHA: "${{ github.event.pull_request.base.sha }}",
    HEAD_SHA: "${{ github.event.pull_request.head.sha }}",
  });
  assert.equal(prototype.env.GH_TOKEN, undefined);
  assert.equal(prototype.env.GITHUB_TOKEN, undefined);
  assert.match(prototype.run, /--strict\s*$/);
  const result = await simulateWorkflow(workflow, { caseName: "success", consumerPathMode: "no-toolchain", tokenCanary: "ghp_TEST_CANARY" });
  assert.equal(result.targetEnvironment.GH_TOKEN, undefined);
  assert.equal(result.tokenIsolation.tokenCanaryInTarget, false);
  assert.equal(result.tokenIsolation.tokenCanaryInArtifacts, false);
  assert.doesNotMatch(JSON.stringify(result.outputs), /ghp_TEST_CANARY/);
});

test("fork pull requests retain read-only collection without fork secrets", async () => {
  const { workflow } = await load();
  const result = await simulateWorkflow(workflow, {
    caseName: "success",
    headRepository: "untrusted/fork",
    tokenCanary: "ghp_FORK_SECRET_CANARY",
    consumerPathMode: "no-toolchain",
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.checkouts.find((checkout) => checkout.path === "proofrail-target").repository, "untrusted/fork");
  assert.equal(result.tokenIsolation.targetReceivedControlToken, false);
  assert.doesNotMatch(JSON.stringify(result), /ghp_FORK_SECRET_CANARY/);
});

test("workflow publishes fixed summary and artifact, and strict mode is ADMISSIBLE-only", async () => {
  const { workflow } = await load();
  const summary = workflow.jobs.proofrail.steps.find((step) => step.id === "summary");
  const artifact = workflow.jobs.proofrail.steps.find((step) => step.id === "artifact");
  const final = workflow.jobs.proofrail.steps.find((step) => step.id === "final");
  assert.equal(summary.if, "always()");
  assert.match(summary.run, /GITHUB_STEP_SUMMARY/);
  assert.equal(artifact.if, "always()");
  assert.deepEqual(artifact.with, { name: "proofrail-evidence", path: "proofrail-output/", "if-no-files-found": "error", "retention-days": 14 });
  assert.equal(final.if, "always()");
  assert.match(final.run, /ADMISSIBLE/);
  const admissible = await simulateWorkflow(workflow, { caseName: "success" });
  assert.equal(admissible.exitCode, 0);
  const nonAdmissible = await simulateWorkflow(workflow, { caseName: "non-admissible" });
  assert.equal(nonAdmissible.verdict, "REVISION_REQUIRED");
  assert.equal(nonAdmissible.exitCode, 25);
  const preview = await simulateWorkflow(workflow, { caseName: "non-admissible", strict: false });
  assert.equal(preview.verdict, "REVISION_REQUIRED");
  assert.equal(preview.exitCode, 25);
  assert.equal(preview.stepResults.prototype.outcome, "failure");
  const collectorFailure = await simulateWorkflow(workflow, { caseName: "missing-collector", strict: false });
  assert.equal(collectorFailure.exitCode, 20);
  assert.equal(collectorFailure.artifact.published, false);
  const artifactFailure = await simulateWorkflow(workflow, { caseName: "artifact-failure", strict: false });
  assert.equal(artifactFailure.exitCode, 24);
  assert.equal(artifactFailure.artifact.published, false);
});

test("exact failure oracle table is deterministic and sanitized", async () => {
  const { workflow } = await load();
  const cases = [
    ["missing-collector", 20, "WORKFLOW_COLLECTOR_UNAVAILABLE"],
    ["invalid-input", 21, "WORKFLOW_INPUT_INVALID"],
    ["checkout-mismatch", 22, "CHECKOUT_HEAD_MISMATCH"],
    ["stale-head", 23, "PRF_STALE_TARGET"],
    ["artifact-failure", 24, "ARTIFACT_PUBLICATION_FAILED"],
    ["non-admissible", 25, "PRF_REVIEW_REQUIREMENT_UNSATISFIED"],
  ];
  for (const [caseName, exitCode, reason] of cases) {
    const result = await simulateWorkflow(workflow, { caseName });
    assert.equal(result.exitCode, exitCode, caseName);
    assert.equal(result.reasonCodes[0], reason, caseName);
    assert.doesNotMatch(JSON.stringify(result), /ghp_|github_token|GITHUB_TOKEN/i, caseName);
  }
});

test("schema rejects unknown keys, mutable refs, unsupported actions, expressions, and reordered steps", async () => {
  const { workflow } = await load();
  const mutations = [
    (value) => ({ ...value, extra: true }),
    (value) => ({ ...value, permissions: { ...value.permissions, actions: "read" } }),
    (value) => ({ ...value, on: { ...value.on, workflow_call: { ...value.on.workflow_call, inputs: { ...value.on.workflow_call.inputs, bogus: { type: "string", required: false, default: "x" } } } } }),
    (value) => ({ ...value, jobs: { ...value.jobs, proofrail: { ...value.jobs.proofrail, steps: value.jobs.proofrail.steps.map((step) => step.id === "checkout-head" ? { ...step, uses: "actions/checkout@v4" } : step) } } }),
    (value) => ({ ...value, jobs: { ...value.jobs, proofrail: { ...value.jobs.proofrail, steps: value.jobs.proofrail.steps.map((step) => step.id === "prototype" ? { ...step, run: `${step.run}\necho $` + "{{ secrets.BAD }}" } : step) } } }),
    (value) => ({ ...value, jobs: { ...value.jobs, proofrail: { ...value.jobs.proofrail, steps: value.jobs.proofrail.steps.map((step) => step.id === "event" ? { ...step, name: `${step.name} $` + "{{ github.token }}" } : step) } } }),
    (value) => ({ ...value, jobs: { ...value.jobs, proofrail: { ...value.jobs.proofrail, steps: [...value.jobs.proofrail.steps].reverse() } } }),
  ];
  for (const mutate of mutations) {
    assert.throws(() => parseWorkflow(mutate(structuredClone(workflow))), WorkflowHarnessError);
  }
});

test("local action harness writes artifacts without consumer Node, pnpm, or gh", async () => {
  const { workflow } = await load();
  const output = await mkdtemp(path.join(os.tmpdir(), "proofrail-t8-"));
  try {
    const result = await simulateWorkflow(workflow, { caseName: "success", consumerPathMode: "no-toolchain", output });
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(await readFile(path.join(output, "evidence-bundle.json"), "utf8")).verdict, "ADMISSIBLE");
    assert.match(await readFile(path.join(output, "summary.md"), "utf8"), /# Proofrail ADMISSIBLE/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("local action harness retains only the delivery-failure trio when no bundle exists", async () => {
  const { workflow } = await load();
  const output = await mkdtemp(path.join(os.tmpdir(), "proofrail-delivery-failure-"));
  try {
    const result = await simulateWorkflow(workflow, { caseName: "missing-collector", output });
    assert.equal(result.bundle, null);
    assert.equal(await readFile(path.join(output, "evidence-bundle.json"), "utf8").then(() => true).catch(() => false), false);
    assert.deepEqual(JSON.parse(await readFile(path.join(output, "failure.json"), "utf8")).verdict, undefined);
    assert.doesNotMatch(await readFile(path.join(output, "summary.md"), "utf8"), /Verdict:\s*\*\*|ADMISSIBLE|REVISION_REQUIRED|REJECTED|BLOCKED/);
    assert.deepEqual(JSON.parse(await readFile(path.join(output, "telemetry.json"), "utf8")).events, []);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("workflow parser does not coerce input types", async () => {
  const { workflow } = await load();
  const invalid = structuredClone(workflow);
  invalid.on.workflow_call.inputs.strict.default = "true";
  assert.throws(() => parseWorkflow(invalid), WorkflowHarnessError);
  const result = await simulateWorkflow(workflow, { strict: "true" });
  assert.equal(result.exitCode, 21);
  assert.equal(result.reasonCodes[0], "WORKFLOW_INPUT_INVALID");
});

test("workflow input config path is fixed to the safe base path", async () => {
  const { workflow } = await load();
  const result = await simulateWorkflow(workflow, { configPath: "../head/.proofrail/config.yml" });
  assert.equal(result.exitCode, 21);
  assert.equal(result.reasonCodes[0], "WORKFLOW_INPUT_INVALID");
  const nested = await simulateWorkflow(workflow, { configPath: "docs/.proofrail/config.yml" });
  assert.equal(nested.exitCode, 21);
  assert.equal(nested.reasonCodes[0], "WORKFLOW_INPUT_INVALID");
  assert.throws(() => parseWorkflow(YAML.parse("name: Proofrail\non: {}\npermissions: {}\njobs: {}\n")), WorkflowHarnessError);
});

test("workflow validation rejects every config path except the exact base path", async () => {
  const { workflow } = await load();
  const validation = workflow.jobs.proofrail.steps.find((step) => step.id === "validate");
  assert.match(validation.run, /CONFIG_PATH.*\.proofrail\/config\.yml/);
  assert.match(validation.run, /unsafe config path/);
});

test("token canary is observed by collector then proven absent from target and artifacts", async () => {
  const { workflow } = await load();
  const canary = "ghp_T8_CORRECTION_CANARY";
  const result = await simulateWorkflow(workflow, { caseName: "success", tokenCanary: canary, consumerPathMode: "no-toolchain" });
  assert.equal(result.tokenIsolation.tokenCanaryReceivedByCollector, true);
  assert.equal(result.tokenIsolation.tokenCanaryInTarget, false);
  assert.equal(result.tokenIsolation.tokenCanaryInArtifacts, false);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(canary));
});

test("runtime input objects reject unknown, null, and undefined values", async () => {
  const { workflow } = await load();
  for (const inputs of [{ bogus: true }, { strict: null }, { "config-path": undefined }]) {
    const result = await simulateWorkflow(workflow, { inputs });
    assert.equal(result.exitCode, 21);
    assert.equal(result.reasonCodes[0], "WORKFLOW_INPUT_INVALID");
  }
});

test("runtime own inputs cannot be hidden by option-level defaults", async () => {
  const { workflow } = await load();
  const cases = [
    { inputs: { "config-path": undefined }, options: { configPath: ".proofrail/config.yml" } },
    { inputs: { strict: undefined }, options: { strict: true } },
    { inputs: { "config-path": null }, options: { configPath: ".proofrail/config.yml" } },
    { inputs: { strict: null }, options: { strict: true } },
    { inputs: { bogus: true }, options: { configPath: ".proofrail/config.yml", strict: true } },
  ];
  for (const { inputs, options } of cases) {
    const result = await simulateWorkflow(workflow, { ...options, inputs });
    assert.equal(result.exitCode, 21);
    assert.equal(result.reasonCodes[0], "WORKFLOW_INPUT_INVALID");
  }
});

test("workflow parser rejects cyclic YAML aliases without recursion crashes", async () => {
  const { workflow } = await load();
  const cycles = [
    (value) => {
      const event = value.jobs.proofrail.steps.find((step) => step.id === "event");
      event.env.self = event.env;
    },
    (value) => {
      const checkout = value.jobs.proofrail.steps.find((step) => step.id === "checkout-head");
      checkout.with.self = checkout.with;
    },
  ];
  for (const makeCycle of cycles) {
    const cyclic = structuredClone(workflow);
    makeCycle(cyclic);
    assert.throws(
      () => parseWorkflow(cyclic),
      (error) => error instanceof WorkflowHarnessError && error.code === "WORKFLOW_SCHEMA_INVALID",
    );
  }
});

test("workflow parser rejects cyclic YAML aliases without recursion crashes", async () => {
  const { workflow } = await load();
  const cycles = [
    (value) => {
      const event = value.jobs.proofrail.steps.find((step) => step.id === "event");
      event.env.self = event.env;
    },
    (value) => {
      const checkout = value.jobs.proofrail.steps.find((step) => step.id === "checkout-head");
      checkout.with.self = checkout.with;
    },
  ];
  for (const makeCycle of cycles) {
    const cyclic = structuredClone(workflow);
    makeCycle(cyclic);
    assert.throws(
      () => parseWorkflow(cyclic),
      (error) => error instanceof WorkflowHarnessError && error.code === "WORKFLOW_SCHEMA_INVALID",
    );
  }
});

test("strict CLI input is boolean-only and bounded failure cases remain nonzero", async () => {
  const { workflow } = await load();
  const timeout = await simulateWorkflow(workflow, { caseName: "timeout", strict: false });
  const overflow = await simulateWorkflow(workflow, { caseName: "output-overflow", strict: false });
  const liveAuth = await simulateWorkflow(workflow, { caseName: "live-auth-failure", strict: false });
  assert.deepEqual([timeout.exitCode, overflow.exitCode, liveAuth.exitCode], [26, 26, 26]);
  assert.deepEqual([timeout.reasonCodes[0], overflow.reasonCodes[0], liveAuth.reasonCodes[0]], ["PROTOTYPE_EXECUTION_FAILED", "PROTOTYPE_EXECUTION_FAILED", "CURRENT_HEAD_UNAVAILABLE"]);
});
