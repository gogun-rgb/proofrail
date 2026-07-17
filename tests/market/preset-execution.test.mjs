import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadTrustedMarketConfiguration, parseMarketConfiguration } from "../../packages/trusted-config/src/index.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FIXTURE = path.join(ROOT, "fixtures/market-prototype/preset-execution");
const MARKET_CONFIG = "config/trusted/proofrail-market-prototype-v1.json";
const PRESETS = path.join(ROOT, "config/presets");
const BASELINE_FILES = Object.freeze([
  "package.json",
  "pnpm-lock.yaml",
  "local-dependency/index.js",
  "local-dependency/package.json",
  "scripts/typecheck-local-dependency.mjs",
  "scripts/verify-local-dependency.mjs",
]);
const CREDENTIAL_ENVIRONMENT_NAMES = Object.freeze(["ACTIONS_ID_TOKEN_REQUEST_TOKEN", "ACTIONS_RUNTIME_TOKEN", "GH_TOKEN", "GITHUB_TOKEN", "NODE_AUTH_TOKEN", "NPM_CONFIG_USERCONFIG", "PNPM_HOME", "YARN_NPM_AUTH_TOKEN"]);
const COREPACK_SCRIPT = path.join(path.dirname(process.execPath), "node_modules", "corepack", "dist", "corepack.js");
const TYPESCRIPT_BASIC_COMMANDS = Object.freeze([
  { name: "frozen-install", run: "pnpm install --frozen-lockfile", timeoutMinutes: 10 },
  { name: "typecheck", run: "pnpm typecheck", timeoutMinutes: 10 },
  { name: "test", run: "pnpm test", timeoutMinutes: 10 },
]);

class PnpmCommandError extends Error {
  constructor(result) {
    super(`pnpm command failed with exit code ${result.exitCode}`);
    this.name = "PnpmCommandError";
    this.result = result;
  }
}

async function baselineHashes(directory) {
  return Object.fromEntries(await Promise.all(BASELINE_FILES.map(async (relative) => {
    const content = await readFile(path.join(directory, ...relative.split("/")));
    return [relative, createHash("sha256").update(content).digest("hex").toUpperCase()];
  })));
}

function credentialFreeEnvironment() {
  const environment = { ...process.env, CI: "true", NPM_CONFIG_AUDIT: "false", NPM_CONFIG_FUND: "false", NPM_CONFIG_OFFLINE: "true" };
  for (const name of CREDENTIAL_ENVIRONMENT_NAMES) delete environment[name];
  return environment;
}

async function runPnpm(arguments_, directory) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [COREPACK_SCRIPT, "pnpm", ...arguments_], {
      cwd: directory,
      env: credentialFreeEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
  if (result.exitCode !== 0) throw new PnpmCommandError(result);
  return result;
}

function argumentsFromResolvedCommand(command) {
  assert.match(command.run, /^pnpm(?: [A-Za-z0-9.@_:/=-]+)+$/);
  return command.run.split(" ").slice(1);
}

test("typescript preset commands install a local frozen dependency without changing baseline files", async (t) => {
  // Given: an authority-resolved preset and fresh checkout containing a local file dependency.
  const authority = await loadTrustedMarketConfiguration({ trustedConfigurationPath: MARKET_CONFIG, repositoryRoot: ROOT });
  const parsed = await parseMarketConfiguration({ source: "version: 1\npreset: typescript-basic\n", presetsDirectory: PRESETS, repositoryRoot: ROOT, validatedAuthority: authority });
  const directory = await mkdtemp(path.join(tmpdir(), "proofrail-preset-execution-"));
  const checkout = path.join(directory, "checkout");
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(FIXTURE, checkout, { recursive: true });
  const before = await baselineHashes(checkout);

  // When: every resolved preset command executes in a credential-free offline environment.
  assert.deepEqual(parsed.marketConfiguration.verification.commands, TYPESCRIPT_BASIC_COMMANDS);
  for (const command of parsed.marketConfiguration.verification.commands) await runPnpm(argumentsFromResolvedCommand(command), checkout);

  // Then: the frozen install created the dependency and no checked-in input changed.
  await access(path.join(checkout, "node_modules", "preset-local-dependency", "package.json"));
  assert.deepEqual(await baselineHashes(checkout), before);
});
