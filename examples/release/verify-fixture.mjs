import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  assembleReleaseKernelInput,
  evaluateReleaseCandidate,
  loadReleaseConfiguration,
} from "../../packages/release-orchestrator/src/index.js";

import { canonicalJson } from "../../packages/evidence-gate/src/index.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const loaded = await loadReleaseConfiguration({
  repositoryRoot: ROOT,
  trustedConfigurationPath: "config/trusted/proofrail-release-v0.1.json",
});
const snapshot = JSON.parse(await readFile(new URL("github-pr-27.snapshot.json", import.meta.url), "utf8"));
const expectedInput = normalizeCheckoutNewlines(await readFile(new URL("expected-kernel-input.json", import.meta.url), "utf8"));
const expectedBundle = normalizeCheckoutNewlines(await readFile(new URL("expected-evidence-bundle.json", import.meta.url), "utf8"));
const actualInput = `${canonicalJson(assembleReleaseKernelInput(loaded, snapshot))}\n`;
const actualBundle = `${canonicalJson(evaluateReleaseCandidate(loaded, snapshot))}\n`;

if (actualInput !== expectedInput || actualBundle !== expectedBundle) {
  process.stderr.write('{"code":"PROOFRAIL_RELEASE_FIXTURE_MISMATCH"}\n');
  process.exitCode = 1;
}

function normalizeCheckoutNewlines(value) {
  return value.replace(/\r\n/g, "\n");
}
