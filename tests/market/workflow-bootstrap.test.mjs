import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const requireFromTrustedConfig = createRequire(new URL("../../packages/trusted-config/package.json", import.meta.url));
const YAML = requireFromTrustedConfig("yaml");
const WORKFLOW_PATH = new URL("../../.github/workflows/proofrail.yml", import.meta.url);

test("selects the pinned pnpm version when the caller workspace has no manifest", async () => {
  // Given a reusable workflow launched from a consumer workspace.
  const source = await readFile(WORKFLOW_PATH, "utf8");

  // When the workflow's install step is parsed.
  const workflow = YAML.parse(source);
  const install = workflow.jobs.proofrail.steps.find((step) => step.id === "install");

  // Then Corepack selects the source repository's reviewed pnpm version explicitly.
  assert.equal(install.run, "corepack pnpm@11.7.0 --dir proofrail-tool install --frozen-lockfile");
});
