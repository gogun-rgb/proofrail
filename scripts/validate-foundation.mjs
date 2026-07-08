import process from "node:process";

import { renderHuman, renderJson } from "./governance/lib/findings.mjs";
import { validateFoundation } from "./governance/lib/validator.mjs";

const args = process.argv.slice(2);
const formatIndex = args.indexOf("--format");
const format = formatIndex === -1 ? "human" : args[formatIndex + 1];

if (formatIndex !== -1 && format !== "json") {
  process.stderr.write("Usage: node scripts/validate-foundation.mjs [--format json]\n");
  process.exit(1);
}

const result = validateFoundation({ root: process.cwd() });

if (format === "json") {
  process.stdout.write(renderJson(result));
} else if (result.status === "VALID") {
  process.stdout.write(renderHuman(result));
} else {
  process.stderr.write(renderHuman(result));
}

process.exit(result.status === "VALID" ? 0 : 1);
