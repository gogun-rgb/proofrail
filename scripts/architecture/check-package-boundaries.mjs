#!/usr/bin/env node

import { fileURLToPath, pathToFileURL } from "node:url";

import {
  checkPackageBoundaries,
  formatArchitectureFinding,
} from "./lib/package-boundaries.mjs";

export async function main(args = process.argv.slice(2)) {
  if (args.length > 0) {
    process.stderr.write(
      `${JSON.stringify({
        id: "ARCHCHK_ARGUMENT_UNSUPPORTED",
        path: "scripts/architecture/check-package-boundaries.mjs",
        line: 1,
        column: 1,
        target: "<argument>",
      })}\n`,
    );
    return 1;
  }

  const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
  const findings = await checkPackageBoundaries(repositoryRoot);
  if (findings.length > 0) {
    process.stderr.write(`${findings.map(formatArchitectureFinding).join("\n")}\n`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
