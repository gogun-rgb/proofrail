import { readFile, writeFile } from "node:fs/promises";
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

await Promise.all([
  writeFile(
    new URL("expected-kernel-input.json", import.meta.url),
    `${canonicalJson(assembleReleaseKernelInput(loaded, snapshot))}\n`,
    "utf8",
  ),
  writeFile(
    new URL("expected-evidence-bundle.json", import.meta.url),
    `${canonicalJson(evaluateReleaseCandidate(loaded, snapshot))}\n`,
    "utf8",
  ),
]);
