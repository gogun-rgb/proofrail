#!/usr/bin/env node

import { runProductFixtures } from "./lib/product-fixtures.mjs";

try {
  if (process.argv.length > 2) {
    throw Object.assign(new Error("arguments are not supported"), {
      code: "PRODUCT_FIXTURE_ARGUMENT_UNSUPPORTED",
    });
  }
  const results = await runProductFixtures();
  process.stdout.write(`${JSON.stringify({ fixtures: results, status: "PASS" })}\n`);
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "PRODUCT_FIXTURE_UNEXPECTED";
  const message = String(error?.message ?? "unexpected failure").replace(/[\r\n\t]+/g, " ").slice(0, 240);
  process.stderr.write(`product-fixtures: ${code}: ${message}\n`);
  process.exitCode = 1;
}
