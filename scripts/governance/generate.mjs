import process from "node:process";

import { FindingCollector } from "./lib/findings.mjs";
import { readJsonFile } from "./lib/json-utils.mjs";
import { writeExpectedProjections } from "./lib/projections.mjs";

const root = process.cwd();
const collector = new FindingCollector();
const config = readJsonFile(root, "governance/foundation.config.json", collector);

if (!config) {
  for (const finding of collector.list()) {
    process.stderr.write(`${finding.code} ${finding.path}: ${finding.message}\n`);
  }
  process.exit(1);
}

try {
  writeExpectedProjections(root, config);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}

process.stdout.write("Generated Foundation governance projections.\n");
