import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  checkPackageBoundaries,
  formatArchitectureFinding,
} from "../../scripts/architecture/lib/package-boundaries.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const ARCHITECTURE_CLI = path.join(
  REPOSITORY_ROOT,
  "scripts",
  "architecture",
  "check-package-boundaries.mjs",
);
const PACKAGE_MANIFESTS = Object.freeze({
  contracts: Object.freeze({
    name: "@proofrail/contracts",
    version: "0.0.0-test",
    private: true,
    type: "module",
    exports: Object.freeze({
      ".": Object.freeze({
        types: "./src/index.d.ts",
        default: "./src/index.js",
      }),
    }),
  }),
  "evidence-gate": Object.freeze({
    name: "@proofrail/evidence-gate",
    version: "0.0.0-test",
    private: true,
    type: "module",
    bin: Object.freeze({
      "evidence-gate": "./src/cli.mjs",
      "evidence-gate-github": "./src/github-cli.mjs",
      "proofrail-release": "./src/release-cli.mjs",
    }),
    exports: Object.freeze({
      ".": Object.freeze({ default: "./src/index.js" }),
      "./github": Object.freeze({ default: "./src/github.js" }),
      "./release": Object.freeze({ default: "./src/release-cli.mjs" }),
    }),
    dependencies: Object.freeze({
      "@proofrail/release-orchestrator": "workspace:*",
      "@proofrail/trusted-config": "workspace:*",
      "@proofrail/verification-runner": "workspace:*",
    }),
  }),
  kernel: Object.freeze({
    name: "@proofrail/kernel",
    version: "0.0.0-test",
    private: true,
    type: "module",
    exports: Object.freeze({
      ".": Object.freeze({ default: "./src/index.js" }),
    }),
    dependencies: Object.freeze({ "@proofrail/contracts": "workspace:*" }),
  }),
  "release-orchestrator": Object.freeze({
    name: "@proofrail/release-orchestrator",
    version: "0.0.0-test",
    private: true,
    type: "module",
    exports: Object.freeze({
      ".": Object.freeze({ default: "./src/index.js" }),
    }),
    dependencies: Object.freeze({
      "@proofrail/kernel": "workspace:*",
      "@proofrail/trusted-config": "workspace:*",
    }),
  }),
  "static-evaluator": Object.freeze({
    name: "@proofrail/static-evaluator",
    version: "0.0.0-test",
    private: true,
    type: "module",
    bin: Object.freeze({
      "static-evaluate": "./src/cli.mjs",
    }),
    dependencies: Object.freeze({ "@proofrail/kernel": "workspace:*" }),
  }),
  "trusted-config": Object.freeze({
    name: "@proofrail/trusted-config",
    version: "0.0.0-test",
    private: true,
    type: "module",
    exports: Object.freeze({
      ".": Object.freeze({ default: "./src/index.js" }),
    }),
    dependencies: Object.freeze({ yaml: "^2.8.1" }),
  }),
  "verification-runner": Object.freeze({
    name: "@proofrail/verification-runner",
    version: "0.0.0-test",
    private: true,
    type: "module",
    exports: Object.freeze({
      ".": Object.freeze({
        types: "./src/index.d.ts",
        default: "./src/index.js",
      }),
    }),
  }),
});

test("the current repository satisfies the frozen package boundary", async () => {
  assert.deepEqual(await checkPackageBoundaries(REPOSITORY_ROOT), []);
});

test("freezes exact manifest loading and production entry-point fields", async (t) => {
  const root = await createFixture(t);
  assert.deepEqual(await checkPackageBoundaries(root), []);

  await updateManifest(root, "contracts", (manifest) => ({
    ...manifest,
    main: "./src/alternate.js",
  }));
  await updateManifest(root, "evidence-gate", (manifest) => ({
    ...manifest,
    bin: { ...manifest.bin, "proofrail-release": "./src/alternate.mjs" },
  }));
  await updateManifest(root, "kernel", (manifest) => ({
    ...manifest,
    exports: { ...manifest.exports, "./alternate": "./src/alternate.js" },
  }));

  const findings = (await checkPackageBoundaries(root)).filter(
    ({ id }) => id === "ARCHCHK_MANIFEST_ENTRYPOINT_DRIFT",
  );
  assert.deepEqual(
    findings.map(({ path: findingPath, target }) => [findingPath, target]),
    [
      ["packages/contracts/package.json", "main"],
      ["packages/evidence-gate/package.json", "bin"],
      ["packages/kernel/package.json", "exports"],
    ],
  );
});


test("the no-argument CLI succeeds and unsupported arguments fail with stable ARCHCHK output", () => {
  const success = spawnSync(process.execPath, [ARCHITECTURE_CLI], {
    cwd: tmpdir(),
    encoding: "utf8",
  });
  assert.equal(success.status, 0);
  assert.equal(success.stdout, "");
  assert.equal(success.stderr, "");

  const first = spawnSync(process.execPath, [ARCHITECTURE_CLI, "--root"], {
    cwd: tmpdir(),
    encoding: "utf8",
  });
  const second = spawnSync(process.execPath, [ARCHITECTURE_CLI, "--root"], {
    cwd: tmpdir(),
    encoding: "utf8",
  });
  assert.equal(first.status, 1);
  assert.equal(first.stdout, "");
  assert.equal(first.stderr, second.stderr);
  assert.deepEqual(JSON.parse(first.stderr), {
    id: "ARCHCHK_ARGUMENT_UNSUPPORTED",
    path: "scripts/architecture/check-package-boundaries.mjs",
    line: 1,
    column: 1,
    target: "<argument>",
  });
});

test("recognizes every contracted TypeScript AST import form including attached JSDoc", async (t) => {
  const root = await createFixture(t);

  await writeSource(
    root,
    "kernel",
    "static.js",
    [
      'import "@proofrail/contracts";',
      'import { VERDICTS } from "@proofrail/contracts/subpath";',
      'export { VERDICTS as values } from "@proofrail/contracts";',
      'export * from "@proofrail/contracts/subpath";',
    ].join("\n"),
  );
  await writeSource(
    root,
    "kernel",
    "loads.js",
    [
      'void import("@proofrail/contracts");',
      'const contracts = require("@proofrail/contracts/subpath");',
      'require.resolve("@proofrail/contracts");',
      "void contracts;",
    ].join("\n"),
  );
  await writeSource(
    root,
    "kernel",
    "types.ts",
    [
      'import type { Evidence } from "@proofrail/contracts";',
      'import Contracts = require("@proofrail/contracts/subpath");',
      'export type Imported = import("@proofrail/contracts").Evidence;',
      "export type Pair = [Evidence, typeof Contracts];",
    ].join("\n"),
  );
  await writeSource(
    root,
    "kernel",
    "jsdoc.js",
    [
      '/** @typedef {import("@proofrail/contracts").Evidence} Evidence */',
      '/** @returns {import("@proofrail/contracts/subpath").Evidence} */',
      "export function evidence() { return {}; }",
      '/** @type {import("@proofrail/contracts").Evidence} */',
      "export const typed = null;",
      '/** @import { Evidence as ImportedEvidence } from "@proofrail/contracts" */',
      "export const imported = null;",
    ].join("\n"),
  );

  assert.deepEqual(await checkPackageBoundaries(root), []);
});

test("inspects exactly the contracted lowercase source extensions and declaration variants", async (t) => {
  const root = await createFixture(t);
  const inspected = [
    "one.js",
    "two.mjs",
    "three.cjs",
    "four.jsx",
    "five.ts",
    "six.mts",
    "seven.cts",
    "eight.tsx",
    "nine.d.ts",
    "ten.d.mts",
    "eleven.d.cts",
  ];
  for (const fileName of inspected) {
    await writeSource(root, "kernel", fileName, 'import "node:util";');
  }
  for (const fileName of ["upper.JS", "fake.mjsx", "fake.cjsx", "fake.mtsx", "fake.ctsx"]) {
    await writeSource(root, "kernel", fileName, 'import "unapproved-decoy";');
  }

  assert.deepEqual(await checkPackageBoundaries(root), []);
});

test("rejects forward, same-layer, and frozen-unlisted direction-valid workspace edges", async (t) => {
  const root = await createFixture(t);
  await writeSource(root, "contracts", "forward.js", 'import "@proofrail/kernel";');
  await writeSource(
    root,
    "evidence-gate",
    "frozen-unlisted.js",
    'import "@proofrail/contracts/subpath";',
  );
  await writeSource(
    root,
    "evidence-gate",
    "same-layer.js",
    'import "@proofrail/static-evaluator/subpath";',
  );
  await writeSource(
    root,
    "static-evaluator",
    "frozen-unlisted.js",
    'import "@proofrail/contracts";',
  );

  const findings = await checkPackageBoundaries(root);
  assert.equal(findings.filter(({ id }) => id === "ARCHCHK_EDGE_FORBIDDEN").length, 4);
  assert.deepEqual(
    findings.filter(({ id }) => id === "ARCHCHK_EDGE_FORBIDDEN").map(({ target }) => target),
    [
      "@proofrail/kernel",
      "@proofrail/contracts/subpath",
      "@proofrail/static-evaluator/subpath",
      "@proofrail/contracts",
    ],
  );
});

test("reports a forbidden TypeScript import-equals edge exactly once", async (t) => {
  const root = await createFixture(t);
  await writeSource(
    root,
    "contracts",
    "import-equals.ts",
    'import Kernel = require("@proofrail/kernel");\nvoid Kernel;',
  );

  const findings = await checkPackageBoundaries(root);
  assert.equal(findings.filter(({ id }) => id === "ARCHCHK_EDGE_FORBIDDEN").length, 1);
});

test("rejects an otherwise allowed workspace import when its runtime declaration is absent", async (t) => {
  const root = await createFixture(t);
  await updateManifest(root, "kernel", ({ dependencies, ...manifest }) => manifest);
  await writeSource(root, "kernel", "undeclared.js", 'import "@proofrail/contracts/subpath";');

  const findings = await checkPackageBoundaries(root);
  assert(findings.some(({ id }) => id === "ARCHCHK_MANIFEST_DEPENDENCY_DRIFT"));
  assert(findings.some(({ id }) => id === "ARCHCHK_IMPORT_UNDECLARED"));
});

test("rejects relative imports escaping the package while allowing unresolved paths inside it", async (t) => {
  const root = await createFixture(t);
  await writeSource(root, "kernel", "nested/inside.js", 'import "../../package.json";');
  await writeSource(root, "kernel", "escape.js", 'import "../../outside.js";');
  await writeSource(
    root,
    "kernel",
    "portable.js",
    [
      'import ".\\\\local.js";',
      'import "..\\\\package.json";',
      'import "..\\\\..\\\\outside-windows.js";',
      'import "../..\\\\outside-mixed.js";',
    ].join("\n"),
  );

  const findings = await checkPackageBoundaries(root);
  assert.deepEqual(
    findings.filter(({ id }) => id === "ARCHCHK_RELATIVE_ESCAPE").map(({ target }) => target),
    ["../../outside.js", "..\\..\\outside-windows.js", "../..\\outside-mixed.js"],
  );
  assert.equal(findings.filter(({ id }) => id === "ARCHCHK_IMPORT_UNAPPROVED").length, 0);
});

test("rejects an immediate package that is not in the frozen classification", async (t) => {
  const root = await createFixture(t);
  await writePackage(root, "unknown", {
    name: "@proofrail/unknown",
    version: "0.0.0-test",
    private: true,
    type: "module",
  });

  const findings = await checkPackageBoundaries(root);
  assert.equal(findings.filter(({ id }) => id === "ARCHCHK_PACKAGE_UNCLASSIFIED").length, 1);
});

test("binds every frozen package name to its exact directory", async (t) => {
  const root = await createFixture(t);
  await updateManifest(root, "contracts", (manifest) => ({
    ...manifest,
    name: "@proofrail/kernel",
  }));

  const findings = await checkPackageBoundaries(root);
  assert.deepEqual(
    findings
      .filter(({ id }) => id === "ARCHCHK_PACKAGE_PATH_MISMATCH")
      .map(({ path: findingPath, target }) => [findingPath, target]),
    [["packages/contracts/package.json", "@proofrail/contracts"]],
  );
  assert(findings.some(({ id, target }) => id === "ARCHCHK_PACKAGE_DUPLICATE" && target === "@proofrail/kernel"));
  assert(findings.some(({ id, target }) => id === "ARCHCHK_PACKAGE_MISSING" && target === "@proofrail/contracts"));
});

test("rejects a full manifest-name swap without satisfying either expected package", async (t) => {
  const root = await createFixture(t);
  await updateManifest(root, "contracts", (manifest) => ({
    ...manifest,
    name: "@proofrail/kernel",
    dependencies: { "@proofrail/contracts": "workspace:*" },
  }));
  await updateManifest(root, "kernel", ({ dependencies, ...manifest }) => ({
    ...manifest,
    name: "@proofrail/contracts",
  }));

  const findings = await checkPackageBoundaries(root);
  assert.deepEqual(
    findings
      .filter(({ id }) => id === "ARCHCHK_PACKAGE_PATH_MISMATCH")
      .map(({ path: findingPath, target }) => [findingPath, target]),
    [
      ["packages/contracts/package.json", "@proofrail/contracts"],
      ["packages/kernel/package.json", "@proofrail/kernel"],
    ],
  );
  assert.deepEqual(
    findings.filter(({ id }) => id === "ARCHCHK_PACKAGE_MISSING").map(({ target }) => target),
    ["@proofrail/contracts", "@proofrail/kernel"],
  );
});

test("reports duplicate known names deterministically while retaining the correctly bound package", async (t) => {
  const root = await createFixture(t);
  await writePackage(root, "kernel-copy", structuredClone(PACKAGE_MANIFESTS.kernel));

  const findings = await checkPackageBoundaries(root);
  assert(findings.some(({ id, target }) => id === "ARCHCHK_PACKAGE_DUPLICATE" && target === "@proofrail/kernel"));
  assert(findings.some(({ id }) => id === "ARCHCHK_PACKAGE_PATH_MISMATCH"));
  assert(!findings.some(({ id, target }) => id === "ARCHCHK_PACKAGE_MISSING" && target === "@proofrail/kernel"));
});

test("reports a missing expected package deterministically", async (t) => {
  const root = await createFixture(t);
  await rm(path.join(root, "packages", "contracts"), { recursive: true });

  const findings = await checkPackageBoundaries(root);
  assert.deepEqual(
    findings.filter(({ id }) => id === "ARCHCHK_PACKAGE_MISSING").map(({ target }) => target),
    ["@proofrail/contracts"],
  );
});

test("enforces the exact Node import surface and rejects all external bare imports", async (t) => {
  const root = await createFixture(t);
  await writeSource(
    root,
    "evidence-gate",
    "allowed.js",
    [
      'import "node:child_process";',
      'import "node:crypto";',
      'import "node:fs/promises";',
      'import "node:path";',
      'import "node:url";',
      'import "node:util";',
    ].join("\n"),
  );
  await writeSource(
    root,
    "kernel",
    "rejected.js",
    [
      'import "node:fs";',
      'import "lodash";',
      'import "@proofrail/contracts-extra";',
      'import "yaml";',
    ].join("\n"),
  );

  const rejected = (await checkPackageBoundaries(root)).filter(
    ({ id }) => id === "ARCHCHK_IMPORT_UNAPPROVED",
  );
  assert.deepEqual(
    rejected.map(({ target }) => target),
    ["node:fs", "lodash", "@proofrail/contracts-extra", "yaml"],
  );
});

test("freezes the release authority, orchestration, and delivery edges", async (t) => {
  const root = await createFixture(t);
  await writeSource(root, "trusted-config", "allowed.js", [
    'import "node:crypto";',
    'import "node:fs/promises";',
    'import "node:path";',
    'import "node:util";',
  ].join("\n"));
  await writeSource(root, "release-orchestrator", "allowed.js", [
    'import "@proofrail/kernel";',
    'import "@proofrail/trusted-config";',
  ].join("\n"));
  await writeSource(root, "evidence-gate", "allowed-release.js", [
    'import "@proofrail/release-orchestrator";',
    'import "@proofrail/trusted-config";',
    'import "@proofrail/verification-runner";',
  ].join("\n"));
  assert.deepEqual(await checkPackageBoundaries(root), []);

  await writeSource(root, "evidence-gate", "forbidden-direct.js", [
    'import "@proofrail/kernel";',
    'import "@proofrail/static-evaluator";',
  ].join("\n"));
  await writeSource(root, "release-orchestrator", "forbidden-delivery.js", 'import "@proofrail/evidence-gate";');
  await writeSource(root, "release-orchestrator", "forbidden-node.js", 'import "node:path";');
  const findings = await checkPackageBoundaries(root);
  assert.equal(findings.filter(({ id }) => id === "ARCHCHK_EDGE_FORBIDDEN").length, 3);
  assert(findings.some(({ id, target }) => id === "ARCHCHK_IMPORT_UNAPPROVED" && target === "node:path"));
});

test("redacts URL, absolute, and package-import-map targets without host-path disclosure", async (t) => {
  const root = await createFixture(t);
  const canary = "ARCHITECTURE_HOST_PATH_CANARY";
  const actualRootTarget = `${root.split("\\").join("/")}/${canary}`;
  const specifiers = [
    actualRootTarget,
    `/private/${canary}`,
    `Z:\\private\\${canary}`,
    `\\\\server\\share\\${canary}`,
    `\\rooted\\${canary}`,
    `https://example.invalid/${canary}`,
    `#${canary}`,
  ];
  await writeSource(
    root,
    "kernel",
    "special.js",
    specifiers.map((specifier) => `import ${JSON.stringify(specifier)};`).join("\n"),
  );

  const findings = (await checkPackageBoundaries(root)).filter(
    ({ id }) => id === "ARCHCHK_IMPORT_UNAPPROVED",
  );
  assert.deepEqual(
    findings.map(({ target }) => target),
    [
      "<absolute>",
      "<absolute>",
      "<absolute>",
      "<absolute>",
      "<absolute>",
      "<url>",
      "<package-import>",
    ],
  );
  const rendered = JSON.stringify(findings);
  assert(!rendered.includes(root));
  assert(!rendered.includes(canary));
  assert(!rendered.includes("server"));
});

test("fails closed on computed dynamic import, require, and require.resolve targets", async (t) => {
  const root = await createFixture(t);
  await writeSource(
    root,
    "kernel",
    "computed.js",
    [
      'const target = "node:util";',
      "void import(target);",
      "require(target);",
      "require.resolve(`${target}`);",
    ].join("\n"),
  );

  const findings = await checkPackageBoundaries(root);
  assert.equal(findings.filter(({ id }) => id === "ARCHCHK_IMPORT_UNINSPECTABLE").length, 3);
});

test("fails closed on each newly guarded dynamic or disguised loader bypass", async (t) => {
  const cases = [
    ["eval", 'eval(\'require("@proofrail/contracts")\');', "eval"],
    ["new-Function", 'new Function(\'return import("@proofrail/contracts")\');', "Function"],
    [
      "callable-Function",
      'Function(\'return require("@proofrail/contracts")\')();',
      "Function",
    ],
    [
      "aliased-Function",
      'const F = Function; F(\'return require("@proofrail/contracts")\')();',
      "Function",
    ],
    [
      "extended-Function",
      'class Loader extends Function {} new Loader(\'return require("@proofrail/contracts")\')();',
      "Function",
    ],
    [
      "direct-global-Function",
      'globalThis.Function(\'return require("@proofrail/contracts")\')();',
      "globalThis.Function",
    ],
    [
      "computed-global-Function",
      'globalThis["Function"](\'return require("@proofrail/contracts")\')();',
      "globalThis.Function",
    ],
    [
      "parenthesized-direct-global-Function",
      '(globalThis).Function(\'return require("@proofrail/contracts")\')();',
      "globalThis.Function",
    ],
    [
      "parenthesized-computed-global-Function",
      '(globalThis)["Function"](\'return require("@proofrail/contracts")\')();',
      "globalThis.Function",
    ],
    [
      "direct-getBuiltinModule",
      'process.getBuiltinModule("node:fs");',
      "process.getBuiltinModule",
    ],
    [
      "computed-getBuiltinModule",
      'process["getBuiltinModule"]("node:fs");',
      "process.getBuiltinModule",
    ],
    [
      "parenthesized-direct-getBuiltinModule",
      '(process).getBuiltinModule("node:fs");',
      "process.getBuiltinModule",
    ],
    [
      "parenthesized-computed-getBuiltinModule",
      '(process)["getBuiltinModule"]("node:fs");',
      "process.getBuiltinModule",
    ],
    [
      "escaped-global-require",
      'globalThis["\\x72equire"]("@proofrail/contracts");',
      "globalThis.require",
    ],
    [
      "computed-global-require",
      'globalThis["requ" + "ire"]("@proofrail/contracts");',
      "globalThis.require",
    ],
    [
      "parenthesized-global-require",
      '(globalThis)["require"]("@proofrail/contracts");',
      "globalThis.require",
    ],
    [
      "parenthesized-computed-global-require",
      '(globalThis)["requ" + "ire"]("@proofrail/contracts");',
      "globalThis.require",
    ],
    [
      "aliased-require",
      'const load = require; load("@proofrail/contracts");',
      "require-reference",
    ],
    [
      "computed-require",
      'require["resolve"]("@proofrail/contracts");',
      "require-computed-property",
    ],
    ["aliased-createRequire", "const makeLoader = createRequire; void makeLoader;", "createRequire"],
    ["subprocess-loaded-code", 'fork("./worker.js");', "subprocess-loader"],
  ];

  for (const [label, source, expectedTarget] of cases) {
    await t.test(label, async (subtest) => {
      const root = await createFixture(subtest);
      await writeSource(root, "kernel", `${label}.js`, source);
      const findings = (await checkPackageBoundaries(root)).filter(
        ({ id }) => id === "ARCHCHK_LOADER_BYPASS",
      );
      assert.deepEqual(findings.map(({ target }) => target), [expectedTarget]);
    });
  }
});

test("limits the gh subprocess exception to the exact GitHub adapter import and path", async (t) => {
  const allowedRoot = await createFixture(t);
  await writeSource(
    allowedRoot,
    "evidence-gate",
    "github.js",
    [
      'import { execFile } from "node:child_process";',
      'execFile("gh", ["api", "/repos/example/example"]);',
    ].join("\n"),
  );
  assert.equal(
    (await checkPackageBoundaries(allowedRoot)).filter(
      ({ id }) => id === "ARCHCHK_LOADER_BYPASS",
    ).length,
    0,
  );

  const wrongPathRoot = await createFixture(t);
  await writeSource(
    wrongPathRoot,
    "evidence-gate",
    "other.js",
    [
      'import { execFile } from "node:child_process";',
      'execFile("gh", ["api", "/repos/example/example"]);',
    ].join("\n"),
  );
  assert(
    (await checkPackageBoundaries(wrongPathRoot)).some(
      ({ id, target }) => id === "ARCHCHK_LOADER_BYPASS" && target === "subprocess-loader",
    ),
  );

  const missingImportRoot = await createFixture(t);
  await writeSource(
    missingImportRoot,
    "evidence-gate",
    "github.js",
    'execFile("gh", ["api", "/repos/example/example"]);',
  );
  assert.deepEqual(
    (await checkPackageBoundaries(missingImportRoot))
      .filter(({ id }) => id === "ARCHCHK_LOADER_BYPASS")
      .map(({ target }) => target),
    ["subprocess-loader"],
  );

  const workflowRoot = await createFixture(t);
  await writeSource(
    workflowRoot,
    "evidence-gate",
    "workflow-event.js",
    [
      'import { execFile } from "node:child_process";',
      'execFile("gh", ["api", "/repos/example/example"]);',
    ].join("\n"),
  );
  await writeSource(
    workflowRoot,
    "evidence-gate",
    "workflow-event-gh.js",
    [
      'import { execFile } from "node:child_process";',
      'execFile("gh", ["api", "/repos/example/example"]);',
    ].join("\n"),
  );
  assert.deepEqual(await checkPackageBoundaries(workflowRoot), []);

  const runnerRoot = await createFixture(t);
  await writeSource(
    runnerRoot,
    "verification-runner",
    "lifecycle.js",
    [
      'import { spawn } from "node:child_process";',
      'spawn("taskkill.exe", ["/PID", "1"]);',
    ].join("\n"),
  );
  assert.deepEqual(await checkPackageBoundaries(runnerRoot), []);
});

test("rejects unbound subprocess calls in copied authorized files with an exact loader finding", async (t) => {
  const cases = [
    [
      "github unbound spawn",
      "evidence-gate",
      "github.js",
      'spawn("evil", []);',
    ],
    [
      "runner unbound execFile",
      "verification-runner",
      "lifecycle.js",
      'execFile("gh", []);',
    ],
  ];

  for (const [label, packageDirectory, sourceFile, injectedSource] of cases) {
    await t.test(label, async (subtest) => {
      const root = await createCopiedRepository(subtest);
      const targetPath = path.join(
        root,
        "packages",
        packageDirectory,
        "src",
        sourceFile,
      );
      const original = await readFile(targetPath, "utf8");
      const source = `${original}${original.endsWith("\n") ? "" : "\n"}${injectedSource}\n`;
      await writeFile(targetPath, source);
      const line = source.slice(0, source.lastIndexOf(injectedSource)).split(/\r?\n/).length;

      assert.deepEqual(
        (await checkPackageBoundaries(root)).filter(
          ({ id, path: findingPath }) => id === "ARCHCHK_LOADER_BYPASS"
            && findingPath === `packages/${packageDirectory}/src/${sourceFile}`,
        ),
        [{
          id: "ARCHCHK_LOADER_BYPASS",
          path: `packages/${packageDirectory}/src/${sourceFile}`,
          line,
          column: 1,
          target: "subprocess-loader",
        }],
      );
    });
  }
});


test("does not treat comments or ordinary strings as module loads", async (t) => {
  const root = await createFixture(t);
  await writeSource(
    root,
    "contracts",
    "text.js",
    [
      'const text = "import \\\"@proofrail/kernel\\\"";',
      'const functionText = "Function(\'return require()\')()";',
      'const aliasText = "const F = Function; F(\'return require()\')()";',
      'const heritageText = "class Loader extends Function {}";',
      'const builtinText = "process.getBuiltinModule(\'node:fs\')";',
      'const receiverText = "(process).getBuiltinModule(\'node:fs\')";',
      '// require("@proofrail/kernel");',
      '// globalThis["require"]("@proofrail/kernel");',
      '// globalThis.Function("return require()")();',
      '// (globalThis).Function("return require()")();',
      '/* (globalThis)["require"]("@proofrail/kernel"); */',
      '/* globalThis["Function"]("return require()")(); */',
      '/* export * from "@proofrail/kernel"; */',
      "export { text };",
    ].join("\n"),
  );

  assert.deepEqual(await checkPackageBoundaries(root), []);
});

test("excludes package tests, docs, examples, fixtures, and generated paths", async (t) => {
  const root = await createFixture(t);
  for (const relativePath of [
    "test/rejected.js",
    "docs/rejected.js",
    "examples/rejected.js",
    "fixtures/rejected.js",
    "generated/rejected.js",
  ]) {
    await writePackageFile(root, "contracts", relativePath, 'import "@proofrail/kernel";');
  }
  for (const directory of [
    "build",
    "docs",
    "examples",
    "fixtures",
    "generated",
    "node_modules",
    "target",
    "test",
    "tests",
  ]) {
    await writeSource(root, "contracts", `${directory}/rejected.js`, 'import "@proofrail/kernel";');
  }

  assert.deepEqual(await checkPackageBoundaries(root), []);
});

test("reports TypeScript parse failures without source excerpts", async (t) => {
  const root = await createFixture(t);
  await writeSource(root, "kernel", "broken.ts", "export const = DO_NOT_ECHO;");

  const findings = await checkPackageBoundaries(root);
  assert(findings.some(({ id }) => id === "ARCHCHK_SOURCE_PARSE_FAILED"));
  assert(!JSON.stringify(findings).includes("DO_NOT_ECHO"));
});

test("rejects malformed, non-object, missing-name, and non-string-name manifests", async (t) => {
  const cases = [
    ["malformed", "{", "ARCHCHK_MANIFEST_INVALID"],
    ["non-object", "[]", "ARCHCHK_PACKAGE_UNCLASSIFIED"],
    ["null", "null", "ARCHCHK_PACKAGE_UNCLASSIFIED"],
    ["missing-name", "{}", "ARCHCHK_PACKAGE_UNCLASSIFIED"],
    ["non-string-name", '{"name":7}', "ARCHCHK_PACKAGE_UNCLASSIFIED"],
  ];

  for (const [label, contents, expectedId] of cases) {
    await t.test(label, async (subtest) => {
      const root = await createFixture(subtest);
      await writeFile(packageManifestPath(root, "contracts"), contents);
      const findings = await checkPackageBoundaries(root);
      assert(findings.some(({ id }) => id === expectedId));
      assert(findings.some(({ id, target }) => id === "ARCHCHK_PACKAGE_MISSING" && target === "@proofrail/contracts"));
    });
  }
});

test("rejects a package-root symbolic link without following it", async (t) => {
  const root = await createFixture(t);
  const target = path.join(root, "packages", "contracts");
  const link = path.join(root, "packages", "linked-package");
  if (!(await createTestSymlink(t, target, link, "junction"))) {
    return;
  }

  const findings = await checkPackageBoundaries(root);
  assert(findings.some(({ id, path: findingPath }) => id === "ARCHCHK_PACKAGE_SYMLINK" && findingPath === "packages/linked-package"));
  assert(!findings.some(({ id }) => id === "ARCHCHK_EDGE_FORBIDDEN"));
});

test("rejects a package.json symbolic link without following it", async (t) => {
  const root = await createFixture(t);
  const target = path.join(root, "outside-package.json");
  const link = packageManifestPath(root, "contracts");
  await writeFile(target, `${JSON.stringify(PACKAGE_MANIFESTS.contracts)}\n`);
  await rm(link);
  if (!(await createTestSymlink(t, target, link, "file"))) {
    return;
  }

  const findings = await checkPackageBoundaries(root);
  assert(findings.some(({ id, path: findingPath }) => id === "ARCHCHK_MANIFEST_UNINSPECTABLE" && findingPath === "packages/contracts/package.json"));
  assert(!findings.some(({ id }) => id === "ARCHCHK_EDGE_FORBIDDEN"));
});

test("rejects a src-root symbolic link without following it", async (t) => {
  const root = await createFixture(t);
  const target = path.join(root, "outside-src");
  const link = path.join(root, "packages", "contracts", "src");
  await mkdir(target);
  await writeFile(path.join(target, "index.js"), 'import "@proofrail/kernel";\n');
  await rm(link, { recursive: true });
  if (!(await createTestSymlink(t, target, link, "junction"))) {
    return;
  }

  const findings = await checkPackageBoundaries(root);
  assert(findings.some(({ id, path: findingPath }) => id === "ARCHCHK_SOURCE_SYMLINK" && findingPath === "packages/contracts/src"));
  assert(!findings.some(({ id }) => id === "ARCHCHK_EDGE_FORBIDDEN"));
});

test("rejects a nested source-directory symbolic link without following it", async (t) => {
  const root = await createFixture(t);
  const target = path.join(root, "outside-nested-src");
  const link = path.join(root, "packages", "contracts", "src", "linked-directory");
  await mkdir(target);
  await writeFile(path.join(target, "index.js"), 'import "@proofrail/kernel";\n');
  if (!(await createTestSymlink(t, target, link, "junction"))) {
    return;
  }

  const findings = await checkPackageBoundaries(root);
  assert(findings.some(({ id, path: findingPath }) => id === "ARCHCHK_SOURCE_SYMLINK" && findingPath === "packages/contracts/src/linked-directory"));
  assert(!findings.some(({ id }) => id === "ARCHCHK_EDGE_FORBIDDEN"));
});

test("rejects a source-file symbolic link without following it", async (t) => {
  const root = await createFixture(t);
  const outside = path.join(root, "outside.js");
  const link = path.join(root, "packages", "contracts", "src", "linked.js");
  await writeFile(outside, 'import "@proofrail/kernel";');

  if (!(await createTestSymlink(t, outside, link, "file"))) {
    return;
  }

  const findings = await checkPackageBoundaries(root);
  assert.deepEqual(
    findings.filter(({ id }) => id === "ARCHCHK_SOURCE_SYMLINK").map(({ path }) => path),
    ["packages/contracts/src/linked.js"],
  );
});

test("freezes every runtime manifest dependency section while ignoring devDependencies", async (t) => {
  const root = await createFixture(t);
  await updateManifest(root, "contracts", (manifest) => ({
    ...manifest,
    devDependencies: { "ignored-development-only": "1.0.0" },
  }));
  assert.deepEqual(await checkPackageBoundaries(root), []);

  const cases = [
    ["dependencies", { "external-runtime": "1.0.0" }],
    ["dependencies", []],
    ["optionalDependencies", { "@proofrail/contracts": "workspace:*" }],
    ["optionalDependencies", null],
    ["peerDependencies", { "@proofrail/contracts": "workspace:*" }],
    ["peerDependencies", "not-an-object"],
    ["bundleDependencies", ["@proofrail/contracts"]],
    ["bundleDependencies", [7]],
    ["bundleDependencies", true],
    ["bundledDependencies", ["@proofrail/contracts"]],
    ["bundledDependencies", [7]],
    ["bundledDependencies", {}],
  ];
  for (const [section, value] of cases) {
    await updateManifest(root, "contracts", (manifest) => ({ ...manifest, [section]: value }));
    const findings = await checkPackageBoundaries(root);
    assert(
      findings.some(
        ({ id, target }) =>
          id === "ARCHCHK_MANIFEST_DEPENDENCY_DRIFT" && target.startsWith(section),
      ),
      `expected dependency drift for ${section}`,
    );
    await updateManifest(root, "contracts", (manifest) => {
      const copy = { ...manifest };
      delete copy[section];
      return copy;
    });
  }

  await updateManifest(root, "kernel", (manifest) => ({
    ...manifest,
    dependencies: { "@proofrail/contracts": 7 },
  }));
  assert(
    (await checkPackageBoundaries(root)).some(
      ({ id, target }) =>
        id === "ARCHCHK_MANIFEST_DEPENDENCY_DRIFT" &&
        target === "dependencies:@proofrail/contracts",
    ),
  );
});

test("redacts unsafe manifest targets while retaining ordinary dependency names", async (t) => {
  const root = await createFixture(t);
  const canary = "MANIFEST_TARGET_CANARY";
  const absoluteTargets = [
    path.join(root, canary),
    `C:\\Users\\secret\\${canary}`,
    `/private/${canary}`,
  ];
  const categorizedTargets = [
    ...absoluteTargets,
    `https://secret.invalid/${canary}`,
    `#${canary}`,
  ];
  await updateManifest(root, "contracts", (manifest) => ({
    ...manifest,
    dependencies: Object.fromEntries([
      ...categorizedTargets.map((target) => [target, "1.0.0"]),
      ["ordinary-runtime", "1.0.0"],
    ]),
    bundleDependencies: [...categorizedTargets, "ordinary-bundle"],
  }));

  const findings = (await checkPackageBoundaries(root)).filter(
    ({ id }) => id === "ARCHCHK_MANIFEST_DEPENDENCY_DRIFT",
  );
  assert.deepEqual(
    findings.map(({ target }) => target),
    [
      "bundleDependencies:<absolute>",
      "bundleDependencies:<absolute>",
      "bundleDependencies:<absolute>",
      "bundleDependencies:<package-import>",
      "bundleDependencies:<url>",
      "bundleDependencies:ordinary-bundle",
      "dependencies:<absolute>",
      "dependencies:<absolute>",
      "dependencies:<absolute>",
      "dependencies:<package-import>",
      "dependencies:<url>",
      "dependencies:ordinary-runtime",
    ],
  );
  const rendered = findings.map(formatArchitectureFinding).join("\n");
  assert(!rendered.includes(root));
  assert(!rendered.includes(canary));
  assert(!rendered.includes("Users"));
  assert(!rendered.includes("private"));
  assert(!rendered.includes("secret.invalid"));
});

test("emits byte-identical sorted POSIX diagnostics without host paths or source text", async (t) => {
  const root = await createFixture(t);
  await writeSource(
    root,
    "contracts",
    "z.js",
    [
      'const DO_NOT_ECHO = "canary";',
      "void import(DO_NOT_ECHO);",
      'import "@proofrail/kernel";',
    ].join("\n"),
  );
  await writeSource(root, "contracts", "a.js", 'import "node:fs";');

  const first = await checkPackageBoundaries(root);
  const second = await checkPackageBoundaries(root);
  const firstBytes = `${first.map(formatArchitectureFinding).join("\n")}\n`;
  const secondBytes = `${second.map(formatArchitectureFinding).join("\n")}\n`;

  assert.equal(firstBytes, secondBytes);
  assert(!firstBytes.includes(root));
  assert(!firstBytes.includes("DO_NOT_ECHO"));
  assert(first.every(({ path: findingPath }) => !path.isAbsolute(findingPath)));
  assert(first.every(({ path: findingPath }) => !findingPath.includes("\\")));
  assert.deepEqual(
    first,
    [...first].sort(compareFindings),
  );
});

test("rejects a workspace cycle with a stable cycle diagnostic", async (t) => {
  const root = await createFixture(t);
  await writeSource(root, "contracts", "cycle.js", 'import "@proofrail/kernel";');
  await writeSource(root, "kernel", "cycle.js", 'import "@proofrail/contracts";');

  const findings = (await checkPackageBoundaries(root)).filter(
    ({ id }) => id === "ARCHCHK_WORKSPACE_CYCLE",
  );
  assert.deepEqual(
    findings.map(({ target }) => target),
    ["@proofrail/contracts -> @proofrail/kernel -> @proofrail/contracts"],
  );
});

test("rejects direct coupling between the two shared authority owners", async (t) => {
  const root = await createFixture(t);
  await writeSource(
    root,
    "evidence-gate",
    "authority-coupling.js",
    [
      'import "@proofrail/contracts";',
      'import "@proofrail/trusted-config";',
    ].join("\n"),
  );

  const findings = (await checkPackageBoundaries(root)).filter(
    ({ id }) => id === "ARCHCHK_SHARED_AUTHORITY_COUPLING",
  );
  assert.deepEqual(
    findings.map(({ target }) => target),
    ["@proofrail/evidence-gate: @proofrail/contracts + @proofrail/trusted-config"],
  );
});

test("rejects a missing file behind an exact production entrypoint", async (t) => {
  const root = await createFixture(t);
  await rm(
    path.join(root, "packages", "evidence-gate", "src", "cli.mjs"),
  );

  const findings = (await checkPackageBoundaries(root)).filter(
    ({ id }) => id === "ARCHCHK_ENTRYPOINT_MISSING",
  );
  assert.deepEqual(
    findings.map(({ target }) => target),
    ["./src/cli.mjs"],
  );
});

async function createFixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), "proofrail-architecture-"));
  t.after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  for (const [directory, manifest] of Object.entries(PACKAGE_MANIFESTS)) {
    await writePackage(root, directory, structuredClone(manifest));
  }
  return root;
}

async function createCopiedRepository(t) {
  const root = await mkdtemp(path.join(tmpdir(), "proofrail-architecture-copy-"));
  t.after(async () => {
    await rm(root, { force: true, recursive: true });
  });
  await cp(
    path.join(REPOSITORY_ROOT, "packages"),
    path.join(root, "packages"),
    {
      recursive: true,
      filter: (source) => !source.split(path.sep).includes("node_modules"),
    },
  );
  return root;
}

async function writePackage(root, directory, manifest) {
  await mkdir(path.join(root, "packages", directory, "src"), { recursive: true });
  await writeFile(
    path.join(root, "packages", directory, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeSource(root, directory, "index.js", "export {};\n");
  await writeManifestEntryPoints(root, directory, manifest);
}

async function writeManifestEntryPoints(root, directory, manifest) {
  const targets = new Set();
  const collect = (value) => {
    if (typeof value === "string") {
      if (value.startsWith("./")) {
        targets.add(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        collect(item);
      }
      return;
    }
    if (value && typeof value === "object") {
      for (const nested of Object.values(value)) {
        collect(nested);
      }
    }
  };
  collect(manifest.bin);
  collect(manifest.exports);
  for (const target of targets) {
    const file = path.join(root, "packages", directory, target);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "export {};\n");
  }
}

async function writeSource(root, packageDirectory, relativePath, source) {
  const file = path.join(root, "packages", packageDirectory, "src", relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${source}\n`);
}

async function writePackageFile(root, packageDirectory, relativePath, source) {
  const file = path.join(root, "packages", packageDirectory, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${source}\n`);
}

async function updateManifest(root, packageDirectory, update) {
  const file = packageManifestPath(root, packageDirectory);
  const manifest = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, `${JSON.stringify(update(manifest), null, 2)}\n`);
}

async function createTestSymlink(t, target, link, type) {
  try {
    await symlink(target, link, type);
    return true;
  } catch (error) {
    if (
      process.platform === "win32" &&
      ["EACCES", "ENOTSUP", "EPERM"].includes(error?.code)
    ) {
      t.skip(`symbolic-link construction unavailable: ${error.code}`);
      return false;
    }
    throw error;
  }
}

function packageManifestPath(root, packageDirectory) {
  return path.join(root, "packages", packageDirectory, "package.json");
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareFindings(left, right) {
  return (
    compareStrings(left.path, right.path) ||
    left.line - right.line ||
    left.column - right.column ||
    compareStrings(left.id, right.id) ||
    compareStrings(left.target, right.target)
  );
}
